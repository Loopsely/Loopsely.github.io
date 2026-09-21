/* ============================================================
   LOOPSELY - site behaviour
   Depends on config.js (window.SITE) being loaded first.
   ============================================================ */
(function () {
  "use strict";

  var S = window.SITE || {};
  var L = S.links || {};

  /* ---------- tiny helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls) { var n = document.createElement(tag); if (cls) n.className = cls; return n; }

  var ICONS = {
    youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z"/></svg>',
    x:         '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.2 2.2h3.4l-7.4 8.5L23 21.8h-6.8l-5.3-7-6.1 7H1.4l8-9.1L1 2.2h7l4.8 6.4 5.4-6.4zm-1.2 17.6h1.9L7.1 4.1H5.1l11.9 15.7z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.05 1.8.25 2.2.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.4.37 1 .42 2.2.06 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.05 1.2-.25 1.8-.42 2.2a3.7 3.7 0 0 1-.9 1.38c-.42.42-.82.68-1.38.9-.4.17-1 .37-2.2.42-1.3.06-1.7.07-4.9.07s-3.6 0-4.9-.07c-1.2-.05-1.8-.25-2.2-.42a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.17-.4-.37-1-.42-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.05-1.2.25-1.8.42-2.2.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.4-.17 1-.37 2.2-.42C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.07-1.1.05-1.7.24-2.1.4-.53.2-.9.45-1.3.85-.4.4-.65.77-.85 1.3-.16.4-.35 1-.4 2.1C2.6 9.9 2.6 10.3 2.6 12s0 2.1.07 3.3c.05 1.1.24 1.7.4 2.1.2.53.45.9.85 1.3.4.4.77.65 1.3.85.4.16 1 .35 2.1.4 1.2.07 1.6.07 4.7.07s3.5 0 4.7-.07c1.1-.05 1.7-.24 2.1-.4.53-.2.9-.45 1.3-.85.4-.4.65-.77.85-1.3.16-.4.35-1 .4-2.1.07-1.2.07-1.6.07-3.3s0-2.1-.07-3.3c-.05-1.1-.24-1.7-.4-2.1a3.5 3.5 0 0 0-.85-1.3 3.5 3.5 0 0 0-1.3-.85c-.4-.16-1-.35-2.1-.4C15.5 4 15.1 4 12 4zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8zm0 8a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2zm6.3-8.2a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 0 1 2.3 0z"/></svg>',
    discord:   '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.3 4.6A19.8 19.8 0 0 0 15.4 3l-.25.5a18.3 18.3 0 0 1 4.3 1.6c-2-1.1-4.1-1.7-6.4-1.7-2.3 0-4.5.6-6.4 1.7A18.3 18.3 0 0 1 11 3.5L10.7 3a19.8 19.8 0 0 0-5 1.6C2.2 9.5 1.3 14.2 1.7 18.9A19.9 19.9 0 0 0 7.8 22l1.3-2a13 13 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12 0l.5.4c-.6.4-1.3.7-2 1l1.3 2a19.9 19.9 0 0 0 6.1-3.1c.5-5.5-.9-10.1-5.2-14.3zM8.6 16c-1.2 0-2.2-1.1-2.2-2.5S7.4 11 8.6 11s2.2 1.1 2.2 2.5S9.8 16 8.6 16zm6.8 0c-1.2 0-2.2-1.1-2.2-2.5s1-2.5 2.2-2.5 2.2 1.1 2.2 2.5-1 2.5-2.2 2.5z"/></svg>'
  };

  /* ============================================================
     1. Fill text from config
     ============================================================ */
  $$("[data-site]").forEach(function (node) {
    var key = node.getAttribute("data-site");
    var val = key.split(".").reduce(function (o, k) { return o ? o[k] : null; }, S);
    if (val == null || val === "") return;
    // Unfilled placeholders never reach the live site - hide the slot instead.
    if (typeof val === "string" && /^\s*TODO\b/i.test(val)) { node.hidden = true; return; }
    if (node.tagName === "A") node.href = val; else node.textContent = val;
  });

  // Multi-paragraph story
  var storyBox = $("[data-story]");
  if (storyBox && Array.isArray(S.story)) {
    S.story.filter(function (p) { return !/^\s*TODO\b/i.test(p); }).forEach(function (p) {
      var n = el("p"); n.textContent = p; storyBox.appendChild(n);
    });
  }

  // Game tags
  var tagBox = $("[data-games]");
  if (tagBox) {
    if (Array.isArray(S.games) && S.games.length) {
      S.games.forEach(function (g) { var n = el("li"); n.textContent = g; tagBox.appendChild(n); });
    } else {
      var host = tagBox.closest("[data-games-section]") || tagBox;
      host.hidden = true;
    }
  }

  /* ============================================================
     2. Images - extension-agnostic.
     Give a base path like "assets/img/logo" and this finds
     logo.png / .jpg / .jpeg / .webp, whichever actually exists.
     Nothing renders until one loads, so a missing file is silent.
     ============================================================ */
  var EXTS = ["png", "jpg", "jpeg", "webp"];

  function resolveImage(base, done) {
    var i = 0;
    (function attempt() {
      if (i >= EXTS.length) return;           // none found - leave the fallback in place
      var url = base + "." + EXTS[i++];
      var probe = new Image();
      probe.onload = function () { done(url); };
      probe.onerror = attempt;
      probe.src = url;
    })();
  }

  // Nav + footer mark
  $$("[data-logo]").forEach(function (node) {
    resolveImage(node.getAttribute("data-logo"), function (url) {
      var img = el("img", node.className);
      img.src = url;
      img.alt = "";
      img.width = 26; img.height = 26;
      node.replaceWith(img);
    });
  });

  // Favicon
  resolveImage("assets/img/logo", function (url) {
    var link = $('link[rel="icon"]') || el("link");
    link.rel = "icon";
    link.href = url;
    if (!link.parentNode) document.head.appendChild(link);
  });

  // Hero backdrop
  var heroBg = $("[data-banner]");
  if (heroBg) {
    resolveImage(heroBg.getAttribute("data-banner"), function (url) {
      heroBg.style.backgroundImage = 'url("' + url + '")';
      heroBg.classList.add("on");
    });
  }

  /* ============================================================
     3. Social links - render only the ones that have a URL
     ============================================================ */
  var order = [
    { key: "youtube",   label: "YouTube" },
    { key: "discord",   label: "Discord" },
    { key: "x",         label: "X" },
    { key: "instagram", label: "Instagram" }
  ];

  $$("[data-socials]").forEach(function (box) {
    order.forEach(function (s) {
      if (!L[s.key]) return;
      var a = el("a", "social");
      a.href = L[s.key];
      a.target = "_blank";
      a.rel = "noopener";
      a.innerHTML = ICONS[s.key] + "<span>" + s.label + "</span>";
      box.appendChild(a);
    });
  });

  // Anything that needs a Discord invite hides itself when there isn't one
  if (!L.discord) $$("[data-needs-discord]").forEach(function (n) { n.hidden = true; });
  // Business section hides when there's no email
  if (!S.businessEmail) {
    $$("[data-needs-email]").forEach(function (n) { n.hidden = true; });
  } else {
    $$("[data-mailto]").forEach(function (a) {
      a.href = "mailto:" + S.businessEmail;
      a.textContent = S.businessEmail;
    });
  }

  /* ============================================================
     4. Videos
     ============================================================ */
  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    var days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days < 1) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return days + " days ago";
    if (days < 30) { var w = Math.floor(days / 7); return w + (w === 1 ? " week ago" : " weeks ago"); }
    if (days < 365) { var m = Math.floor(days / 30); return m + (m === 1 ? " month ago" : " months ago"); }
    var y = Math.floor(days / 365); return y + (y === 1 ? " year ago" : " years ago");
  }

  function fmtViews(n) {
    n = Number(n);
    if (!n || isNaN(n)) return "";
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M views";
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "K views";
    return n + " views";
  }

  // What each type is called in the UI. Long-form uploads need no label.
  var TYPE_LABEL = { live: "Stream", short: "Short", video: "" };
  var TAB_ORDER = [
    { key: "all",   label: "All",     hash: "" },
    { key: "video", label: "Videos",  hash: "videos" },
    { key: "live",  label: "Streams", hash: "streams" },
    { key: "short", label: "Shorts",  hash: "shorts" }
  ];

  /* "ACE FOR THE WIN  #valorant #gaming" -> "ACE FOR THE WIN".
     Display only - the real title is untouched on YouTube. */
  function cleanTitle(t) {
    var s = String(t || "")
      .replace(/(^|\s)#[\p{L}\p{N}_]+/gu, " ")
      .replace(/\s{2,}/g, " ")
      .replace(/[\s|\-\u2013\u2014:\u00b7]+$/, "")
      .trim();
    return s || String(t || "");
  }

  function fmtDuration(sec) {
    sec = Math.round(Number(sec) || 0);
    if (!sec) return "";
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    var ss = (s < 10 ? "0" : "") + s;
    return h ? h + ":" + (m < 10 ? "0" : "") + m + ":" + ss : m + ":" + ss;
  }

  function card(v, i) {
    var a = el("a", "vcard");
    a.href = v.type === "short"
      ? "https://www.youtube.com/shorts/" + v.id
      : "https://www.youtube.com/watch?v=" + v.id;
    a.target = "_blank";
    a.rel = "noopener";
    // Stagger index, set at creation so the entrance animation reads it
    // on its very first frame. motion.css consumes it.
    a.style.setProperty("--i", (i || 0) % 12);

    var thumb = el("div", "vthumb");
    var img = el("img");
    img.src = v.thumb;
    img.alt = "";
    img.loading = "lazy";
    img.width = 480; img.height = 270;
    img.onerror = function () { img.style.opacity = "0"; };
    var play = el("div", "vplay");
    play.appendChild(el("i"));
    thumb.appendChild(img);
    thumb.appendChild(play);

    var dur = fmtDuration(v.seconds);
    if (dur) {
      var badge = el("span", "vdur");
      badge.textContent = dur;
      thumb.appendChild(badge);
    }

    var h3 = el("h3", "vtitle");
    h3.textContent = cleanTitle(v.title);

    var meta = el("div", "vmeta");
    var label = TYPE_LABEL[v.type];
    if (label) {
      var tag = el("span", "vtype vtype-" + v.type);
      tag.textContent = label;
      meta.appendChild(tag);
    }
    meta.appendChild(document.createTextNode(
      [fmtViews(v.views), fmtDate(v.published)].filter(Boolean).join("  \u00b7  ")
    ));

    a.appendChild(thumb);
    a.appendChild(h3);
    a.appendChild(meta);
    return a;
  }

  function skeletons(grid, n) {
    grid.innerHTML = "";
    for (var i = 0; i < n; i++) {
      var s = el("div", "vcard skel");
      s.style.setProperty("--i", i % 12);
      s.appendChild(el("div", "vthumb"));
      s.appendChild(el("div", "vtitle"));
      s.appendChild(el("div", "vmeta"));
      grid.appendChild(s);
    }
  }

  function notice(grid, html) {
    grid.innerHTML = "";
    var n = el("div", "notice");
    n.innerHTML = html;
    grid.appendChild(n);
  }

  function render(grid, list, emptyMsg) {
    grid.innerHTML = "";
    if (!list.length) { notice(grid, emptyMsg || "Nothing here yet."); return; }
    list.forEach(function (v, i) { grid.appendChild(card(v, i)); });
  }

  var grids = $$("[data-videos]");
  if (grids.length) {
    grids.forEach(function (g) {
      var lim = parseInt(g.getAttribute("data-limit"), 10) || 0;
      skeletons(g, lim || 9);
    });

    fetch("data/videos.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (data) {
        var all = (data && data.videos) || [];
        if (!all.length) throw new Error("empty");

        var ofType = function (t) {
          return !t || t === "all" ? all : all.filter(function (v) { return v.type === t; });
        };

        grids.forEach(function (grid) {
          // Home shelves: fixed type + limit. A shelf with nothing in it hides.
          if (grid.hasAttribute("data-type")) {
            var list = ofType(grid.getAttribute("data-type"));
            var lim = parseInt(grid.getAttribute("data-limit"), 10) || 0;
            if (!list.length) {
              var shelf = grid.closest("section");
              if (shelf) shelf.hidden = true;
              return;
            }
            render(grid, lim ? list.slice(0, lim) : list);
            return;
          }

          // Archive: tabs + search, filter state mirrored in the URL hash
          var tabsBox = $("[data-tabs]");
          var search = $("[data-search]");
          var count = $("[data-count]");
          var current = "all";

          var fromHash = function () {
            var h = (location.hash || "").replace("#", "");
            var hit = TAB_ORDER.filter(function (t) { return t.hash && t.hash === h; })[0];
            return hit ? hit.key : "all";
          };

          var update = function () {
            var q = search ? search.value.trim().toLowerCase() : "";
            var list = ofType(current).filter(function (v) {
              return !q || cleanTitle(v.title).toLowerCase().indexOf(q) !== -1;
            });
            grid.classList.toggle("tall", current === "short");
            render(grid, list, q ? "No videos match that search." : "Nothing here yet.");
            if (count) count.textContent = list.length + (list.length === 1 ? " video" : " videos");
            if (tabsBox) {
              $$(".tab", tabsBox).forEach(function (b) {
                b.setAttribute("aria-pressed", String(b.getAttribute("data-filter") === current));
              });
            }
          };

          if (tabsBox) {
            TAB_ORDER.forEach(function (t) {
              var n = ofType(t.key).length;
              if (t.key !== "all" && !n) return;          // no empty tabs
              var b = el("button", "tab");
              b.type = "button";
              b.setAttribute("data-filter", t.key);
              b.innerHTML = "<span></span><span class=\"tab-n\"></span>";
              b.firstChild.textContent = t.label;
              b.lastChild.textContent = n;
              b.addEventListener("click", function () {
                current = t.key;
                history.replaceState(null, "", t.hash ? "#" + t.hash : location.pathname + location.search);
                update();
              });
              tabsBox.appendChild(b);
            });
            window.addEventListener("hashchange", function () { current = fromHash(); update(); });
          }

          if (search) search.addEventListener("input", update);
          current = fromHash();
          update();
        });
      })
      .catch(function () {
        grids.forEach(function (grid) {
          notice(grid,
            "No video data yet.<br>Run <code>node scripts/fetch-videos.mjs</code> or the " +
            "<em>Update videos</em> workflow to populate <code>data/videos.json</code>.<br>" +
            '<a href="' + (L.youtube || "#") + '" target="_blank" rel="noopener">Watch on YouTube \u2192</a>'
          );
        });
      });
  }

  /* ============================================================
     5. Mobile nav
     ============================================================ */
  var toggle = $(".nav-toggle");
  var links = $(".nav-links");
  if (toggle && links) {
    var mq = window.matchMedia("(max-width:760px)");
    var sync = function () {
      if (mq.matches) { links.hidden = true; toggle.setAttribute("aria-expanded", "false"); }
      else { links.hidden = false; }
    };
    sync();
    (mq.addEventListener ? mq.addEventListener.bind(mq, "change") : mq.addListener.bind(mq))(sync);

    toggle.addEventListener("click", function () {
      var open = links.hidden;
      links.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A" && mq.matches) { links.hidden = true; toggle.setAttribute("aria-expanded", "false"); }
    });
  }

})();
