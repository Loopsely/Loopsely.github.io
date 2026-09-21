/**
 * Writes data/videos.json for the site.
 *
 *   YOUTUBE_API_KEY set   -> YouTube Data API v3 (official, stable)
 *   YOUTUBE_API_KEY unset -> scrape-videos.mjs (no key, unofficial)
 *
 * Either way, an empty or failed result never overwrites the existing file.
 *
 * Env:
 *   YOUTUBE_API_KEY  (optional)
 *   CHANNEL_ID       (optional) - defaults to the id below
 *   MAX_VIDEOS       (optional) - API path only, default 200
 *
 * Run locally:  node scripts/fetch-videos.mjs
 */

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { scrapeChannel } from "./scrape-videos.mjs";

const KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL = process.env.CHANNEL_ID || "UCjGkhRhs6k7LJ-dIdp3e-IA";
const MAX = Number(process.env.MAX_VIDEOS || 200);
const API = "https://www.googleapis.com/youtube/v3";
const OUT = "data/videos.json";

async function api(path, params) {
  const url = new URL(API + path);
  url.search = new URLSearchParams({ ...params, key: KEY }).toString();

  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const reason = body?.error?.errors?.[0]?.reason || "unknown";
    const message = body?.error?.message || res.statusText;
    throw new Error(`${path} failed (${res.status} ${reason}): ${message}`);
  }
  return body;
}

/** Pick the largest thumbnail YouTube actually returned. */
function bestThumb(thumbs = {}) {
  for (const k of ["maxres", "standard", "high", "medium", "default"]) {
    if (thumbs[k]?.url) return thumbs[k].url;
  }
  return "";
}

/** ISO 8601 duration -> seconds. */
function toSeconds(iso = "") {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  const [, d, h, min, s] = m.map((v) => (v ? Number(v) : 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

const chunk = (arr, n) =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

async function fromApi() {
  const channel = await api("/channels", { part: "contentDetails,snippet,statistics", id: CHANNEL });
  const item = channel.items?.[0];
  if (!item) throw new Error(`No channel found for id ${CHANNEL}. Check CHANNEL_ID.`);

  const uploads = item.contentDetails.relatedPlaylists.uploads;
  console.log(`Channel: ${item.snippet.title}  (uploads: ${uploads})`);

  const ids = [];
  let pageToken;
  do {
    const page = await api("/playlistItems", {
      part: "contentDetails",
      playlistId: uploads,
      maxResults: "50",
      ...(pageToken ? { pageToken } : {})
    });
    for (const it of page.items || []) {
      if (it.contentDetails?.videoId) ids.push(it.contentDetails.videoId);
    }
    pageToken = page.nextPageToken;
  } while (pageToken && ids.length < MAX);

  const videos = [];
  for (const group of chunk(ids.slice(0, MAX), 50)) {
    const page = await api("/videos", {
      part: "snippet,statistics,contentDetails,liveStreamingDetails",
      id: group.join(",")
    });
    for (const v of page.items || []) {
      const seconds = toSeconds(v.contentDetails?.duration);
      const live = !!v.liveStreamingDetails;
      videos.push({
        id: v.id,
        // The API has no "is this a Short" flag. Shorts are vertical and
        // at most 3 minutes; duration is the best signal available here.
        type: live ? "live" : seconds > 0 && seconds <= 180 ? "short" : "video",
        title: v.snippet.title,
        published: v.liveStreamingDetails?.actualStartTime || v.snippet.publishedAt,
        thumb: bestThumb(v.snippet.thumbnails),
        views: Number(v.statistics?.viewCount || 0),
        seconds
      });
    }
  }

  const subs = Number(item.statistics?.subscriberCount || 0);
  return {
    source: "api",
    channelTitle: item.snippet.title,
    subscribers: item.statistics?.hiddenSubscriberCount ? null : `${subs} subscribers`,
    videos
  };
}

async function fromScrape() {
  const r = await scrapeChannel(CHANNEL);
  return { source: "scrape", channelTitle: "Loopsely", subscribers: r.subscribers, videos: r.videos };
}

async function main() {
  const result = KEY ? await fromApi() : await fromScrape();
  const videos = result.videos
    .filter((v) => v.id && v.title)
    .sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));

  if (!videos.length) {
    throw new Error("Got 0 videos - keeping the existing data/videos.json untouched.");
  }

  // A sudden large drop usually means a partial fetch, not deleted videos.
  try {
    const prev = JSON.parse(await readFile(OUT, "utf8"));
    if (prev.count >= 10 && videos.length < prev.count * 0.5) {
      throw new Error(
        `Got ${videos.length} videos but the file has ${prev.count} - looks like a partial fetch. Not overwriting.`
      );
    }
  } catch (e) {
    if (e.message.includes("Not overwriting")) throw e;   // missing/invalid old file is fine
  }

  const counts = videos.reduce((acc, v) => ((acc[v.type] = (acc[v.type] || 0) + 1), acc), {});

  const out = {
    channelId: CHANNEL,
    channelTitle: result.channelTitle,
    subscribers: result.subscribers,
    source: result.source,
    updated: new Date().toISOString(),
    count: videos.length,
    counts,
    videos
  };

  await mkdir("data", { recursive: true });
  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`Wrote ${OUT}: ${videos.length} videos ${JSON.stringify(counts)} via ${result.source}.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
