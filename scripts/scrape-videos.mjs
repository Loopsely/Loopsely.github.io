/**
 * No-API-key fallback: reads the channel's public Videos / Shorts / Live
 * tabs the same way youtube.com does, then asks the player endpoint for
 * exact publish time, views and length per video.
 *
 * This is unofficial and can break when YouTube changes its page
 * structure. The Data API path in fetch-videos.mjs is the supported one;
 * this exists so the site still refreshes when no key is configured.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const HEADERS = {
  "user-agent": UA,
  "accept-language": "en-US,en;q=0.9",
  // Skips the EU consent interstitial, which otherwise replaces the page.
  cookie: "CONSENT=YES+1; SOCS=CAI"
};

const TABS = [
  { path: "videos",  type: "video" },
  { path: "shorts",  type: "short" },
  { path: "streams", type: "live"  }
];

const MAX_PAGES_PER_TAB = 20;   // 30 items a page - generous ceiling
const DETAIL_CONCURRENCY = 4;

/** Every value stored under `key`, anywhere in a nested object. */
function findAll(obj, key, out = []) {
  if (obj && typeof obj === "object") {
    if (Object.prototype.hasOwnProperty.call(obj, key)) out.push(obj[key]);
    for (const v of Object.values(obj)) findAll(v, key, out);
  }
  return out;
}

function pickLargest(thumbs = []) {
  return thumbs.reduce((best, t) => (!best || (t.width || 0) > (best.width || 0) ? t : best), null)?.url || "";
}

/** "15h ago", "Streamed 3 weeks ago", "1mo ago" -> approximate ISO date. */
function fromRelative(text = "") {
  const m = /(\d+)\s*(second|sec|s|minute|min|m|hour|h|day|d|week|w|month|mo|year|y)/i.exec(text);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const MS = {
    s: 1e3, sec: 1e3, second: 1e3,
    m: 6e4, min: 6e4, minute: 6e4,
    h: 36e5, hour: 36e5,
    d: 864e5, day: 864e5,
    w: 6048e5, week: 6048e5,
    mo: 2592e6, month: 2592e6,
    y: 31536e6, year: 31536e6
  }[unit];
  return MS ? new Date(Date.now() - n * MS).toISOString() : null;
}

/** "4.4K views" / "821" -> number */
function parseCount(text = "") {
  const m = /([\d.,]+)\s*([KMB])?/i.exec(String(text).replace(/,/g, ""));
  if (!m) return 0;
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] || "").toUpperCase()] || 1;
  return Math.round(parseFloat(m[1]) * mult);
}

/** Pull what we can from a list item; details endpoint fills the rest. */
function fromListItem(item, type) {
  if (item.lockupViewModel) {
    const l = item.lockupViewModel;
    if (l.contentType && l.contentType !== "LOCKUP_CONTENT_TYPE_VIDEO") return null;
    const md = l.metadata?.lockupMetadataViewModel || {};
    const parts = findAll(md, "metadataParts").flat().map((p) => p?.text?.content || "");
    const viewsPart = parts.find((p) => /view|^\d[\d.,]*[KMB]?$/i.test(p)) || "";
    const timePart = parts.find((p) => /ago/i.test(p)) || "";
    return {
      id: l.contentId,
      type,
      title: md.title?.content || "",
      views: parseCount(viewsPart),
      published: fromRelative(timePart),
      thumb: pickLargest(findAll(l.contentImage || {}, "sources")[0])
    };
  }
  if (item.shortsLockupViewModel) {
    const s = item.shortsLockupViewModel;
    const id = findAll(s, "videoId")[0];
    if (!id) return null;
    return {
      id,
      type,
      title: s.overlayMetadata?.primaryText?.content || "",
      views: parseCount(s.overlayMetadata?.secondaryText?.content),
      published: null,
      thumb: pickLargest(findAll(s.thumbnail || {}, "sources")[0])
    };
  }
  return null;
}

async function getText(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.text();
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { ...HEADERS, "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`POST ${url} -> ${res.status}`);
  return res.json();
}

function readPageConfig(html) {
  const initial = /var ytInitialData\s*=\s*(\{.*?\});\s*<\/script>/s.exec(html);
  if (!initial) throw new Error("ytInitialData not found - page layout changed or blocked");
  const key = /"INNERTUBE_API_KEY":"([^"]+)"/.exec(html)?.[1];
  const version = /"INNERTUBE_CLIENT_VERSION":"([^"]+)"/.exec(html)?.[1];
  const visitor = /"VISITOR_DATA":"([^"]+)"/.exec(html)?.[1];
  if (!key || !version) throw new Error("innertube config not found");
  return {
    data: JSON.parse(initial[1]),
    key,
    context: { client: { clientName: "WEB", clientVersion: version, hl: "en", gl: "US", visitorData: visitor } }
  };
}

async function scrapeTab(channelId, tab, log) {
  const html = await getText(`https://www.youtube.com/channel/${channelId}/${tab.path}`);
  const { data, key, context } = readPageConfig(html);

  // Only the grid's own "load more" token. The page carries other
  // continuation commands too (e.g. the Latest/Popular sort chips), and
  // following those just returns the first page again.
  const gridToken = (obj) =>
    findAll(obj, "continuationItemRenderer")[0]?.continuationEndpoint?.continuationCommand?.token;

  const byId = new Map();
  const collect = (obj) => {
    let added = 0;
    for (const r of findAll(obj, "richItemRenderer")) {
      const v = fromListItem(r.content || {}, tab.type);
      if (v && v.id && !byId.has(v.id)) { byId.set(v.id, v); added++; }
    }
    return added;
  };

  collect(data);
  let token = gridToken(data);
  let pages = 1;

  for (; token && pages < MAX_PAGES_PER_TAB; pages++) {
    const next = await postJSON(
      `https://www.youtube.com/youtubei/v1/browse?key=${key}&prettyPrint=false`,
      { context, continuation: token }
    );
    if (collect(next) === 0) break;          // belt and braces: never loop on repeats
    token = gridToken(next);
  }

  const videos = [...byId.values()];
  log(`  ${tab.path}: ${videos.length} (${pages} page${pages === 1 ? "" : "s"})`);

  const header = JSON.stringify(data.header || {});
  const subs = /"content":"([^"]*subscribers?)"/.exec(header)?.[1] || null;
  const total = /"content":"([^"]*\bvideos?)"/.exec(header)?.[1] || null;

  return { videos, key, context, subs, total };
}

async function hydrate(video, key, context) {
  const p = await postJSON(
    `https://www.youtube.com/youtubei/v1/player?key=${key}&prettyPrint=false`,
    { context, videoId: video.id }
  );
  const vd = p.videoDetails || {};
  const mf = p.microformat?.playerMicroformatRenderer || {};
  return {
    ...video,
    title: vd.title || video.title,
    // For streams, the moment it went live beats the upload timestamp.
    published: mf.liveBroadcastDetails?.startTimestamp || mf.publishDate || mf.uploadDate || video.published,
    views: vd.viewCount != null ? Number(vd.viewCount) : video.views,
    seconds: Number(vd.lengthSeconds || 0),
    thumb: pickLargest(vd.thumbnail?.thumbnails) || video.thumb
  };
}

/** Runs `fn` over `list` with at most `n` in flight. */
async function pool(list, n, fn) {
  const out = new Array(list.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => {
    while (i < list.length) {
      const idx = i++;
      out[idx] = await fn(list[idx], idx);
    }
  }));
  return out;
}

export async function scrapeChannel(channelId, { log = console.log } = {}) {
  log("Scraping public channel pages (no API key)...");

  const seen = new Set();
  const all = [];
  let key, context, subs = null, total = null;

  for (const tab of TABS) {
    const r = await scrapeTab(channelId, tab, log);
    key = r.key; context = r.context;
    subs = subs || r.subs; total = total || r.total;
    for (const v of r.videos) {
      if (seen.has(v.id)) continue;           // a stream can also show under Videos
      seen.add(v.id);
      all.push(v);
    }
  }

  let failed = 0;
  const hydrated = await pool(all, DETAIL_CONCURRENCY, async (v) => {
    try { return await hydrate(v, key, context); }
    catch { failed++; return { ...v, seconds: 0 }; }   // keep list data rather than drop it
  });
  if (failed) log(`  details failed for ${failed} videos - kept list data for those`);

  return { videos: hydrated, subscribers: subs, videoCountText: total };
}
