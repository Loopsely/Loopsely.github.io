/* ============================================================
   LOOPSELY - motion layer
   Loads after main.js. Pairs with assets/css/motion.css.
   Remove both files and the site degrades to static, not broken.
   ============================================================ */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover:hover) and (pointer:fine)").matches;

  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }

  /* ============================================================
     0a. Boot intro - once per session, skippable
     html.booting was set in <head>; hero animations sit paused
     until the curtain lifts, then play as it rises.
     ============================================================ */
  (function boot() {
    if (!root.classList.contains("booting")) return;
    var cfg = window.SITE || {};
    if (cfg.intro === false) { root.classList.remove("booting"); return; }

    var name = String(cfg.name || "Loopsely").toUpperCase()
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    var el = doc.createElement("div");
    el.className = "boot";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<div class="boot-in">' +
        '<p class="boot-line boot-title">' + name + '.EXE</p>' +
        '<p class="boot-line">&gt; loading assets <b>OK</b></p>' +
        '<p class="boot-line">&gt; linking channel <b>OK</b></p>' +
        '<p class="boot-line">&gt; syncing uploads <b>OK</b></p>' +
        '<div class="boot-bar"><i></i></div>' +
        '<p class="boot-line boot-start">Press start</p>' +
        '<span class="boot-skip">click / any key to skip</span>' +
      '</div>';
    doc.body.appendChild(el);

    var lines = el.querySelectorAll(".boot-line");
    var timers = [];
    requestAnimationFrame(function () { el.classList.add("go"); });
    Array.prototype.forEach.call(lines, function (ln, i) {
      timers.push(setTimeout(function () { ln.classList.add("on"); }, 90 + i * 150));
    });

    var done = false;
    function lift() {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      try { sessionStorage.setItem("booted", "1"); } catch (e) {}
      el.classList.add("lift");
      root.classList.remove("booting");          // hero letters start as the curtain rises
      setTimeout(function () { el.remove(); }, 700);
      doc.removeEventListener("keydown", lift);
    }
    timers.push(setTimeout(lift, 1250));
    el.addEventListener("click", lift);
    doc.addEventListener("keydown", lift);
  })();

  /* ============================================================
     0b. Back to top - utility, so it exists even with reduced
     motion (it just jumps instead of gliding).
     ============================================================ */
  var toTop = doc.createElement("button");
  toTop.className = "to-top";
  toTop.type = "button";
  toTop.setAttribute("aria-label", "Back to top");
  toTop.innerHTML =
    '<svg viewBox="0 0 44 44" aria-hidden="true">' +
      '<circle class="tt-track" cx="22" cy="22" r="20"/>' +
      '<circle class="tt-ring" cx="22" cy="22" r="20"/>' +
    '</svg><span class="tt-arrow" aria-hidden="true"></span>';
  doc.body.appendChild(toTop);

  var ttRing = toTop.querySelector(".tt-ring");
  var ttNative = !!(window.CSS && CSS.supports && CSS.supports("animation-timeline", "scroll()"));
  var ttTick = false;
  function ttPaint() {
    var y = window.scrollY;
    toTop.classList.toggle("show", y > 600);
    if (!ttNative || reduced) {
      var max = root.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(1, y / max) : 0;
      ttRing.style.strokeDashoffset = (125.66 * (1 - pct)).toFixed(2);
    }
    ttTick = false;
  }
  window.addEventListener("scroll", function () {
    if (!ttTick) { ttTick = true; requestAnimationFrame(ttPaint); }
  }, { passive: true });
  ttPaint();

  toTop.addEventListener("click", function (e) {
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    // Keyboard activation: put focus somewhere sensible at the top.
    if (e.detail === 0) {
      var brand = $(".brand");
      if (brand) brand.focus({ preventScroll: true });
    }
  });

  /* ============================================================
     1. Feature flag - native scroll-driven animations
     When present, CSS handles section reveals and main.js skips
     its IntersectionObserver entirely.
     ============================================================ */
  var SDA = !!(window.CSS && CSS.supports && CSS.supports("animation-timeline", "view()"));
  if (SDA && !reduced) root.classList.add("sda");

  /* ============================================================
     2. Wordmark - split into per-letter spans
     Runs before paint so there's no flash of un-split text.
     ============================================================ */
  $$(".wordmark").forEach(function (node) {
    var text = node.textContent.trim();
    if (!text || node.querySelector(".ch")) return;

    node.setAttribute("aria-label", text);
    node.textContent = "";

    text.split("").forEach(function (chr, i) {
      var span = doc.createElement("span");
      span.className = "ch";
      span.setAttribute("aria-hidden", "true");
      span.textContent = chr === " " ? " " : chr;
      span.style.setProperty("--i", i);
      node.appendChild(span);
    });
  });

  /* ============================================================
     3. Marquee ticker
     Track holds two identical halves; CSS slides it -50%, so the
     loop is seamless regardless of item count.
     ============================================================ */
  var marquee = $("[data-marquee]");
  if (marquee) {
    var S = window.SITE || {};
    var items = (S.marquee && S.marquee.length)
      ? S.marquee
      : [S.name || "Loopsely", "New videos", S.handle || "@Loopsely", "Subscribe"];

    var track = doc.createElement("div");
    track.className = "marquee-track";

    function half() {
      var frag = doc.createDocumentFragment();
      items.forEach(function (txt) {
        var el = doc.createElement("span");
        el.className = "marq-item";
        var dot = doc.createElement("i");
        dot.className = "marq-dot";
        el.appendChild(dot);
        el.appendChild(doc.createTextNode(txt));
        frag.appendChild(el);
      });
      return frag;
    }
    track.appendChild(half());
    track.appendChild(half());

    marquee.appendChild(track);
    marquee.setAttribute("aria-hidden", "true");

    // Keep px/second constant regardless of how much text is in the loop.
    // Measured after webfonts settle, otherwise the width is fallback-font
    // sized and the speed comes out wrong.
    var pace = function () {
      var width = track.scrollWidth / 2;
      if (width > 0) {
        track.style.animationDuration = Math.max(18, Math.round(width / 46)) + "s";
      }
    };
    pace();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(pace);
  }

  /* ============================================================
     4. Stagger index on JS-rendered lists
     Socials exist already (main.js appends them synchronously).
     Video cards arrive after a fetch, so watch for them.
     ============================================================ */
  function stamp(list) {
    list.forEach(function (node, i) {
      if (!node.style.getPropertyValue("--i")) node.style.setProperty("--i", i % 12);
    });
  }

  $$("[data-socials]").forEach(function (box) { stamp($$(".social", box)); });

  $$("[data-videos]").forEach(function (grid) {
    stamp($$(".vcard", grid));
    if (!("MutationObserver" in window)) return;
    new MutationObserver(function () { stamp($$(".vcard", grid)); })
      .observe(grid, { childList: true });
  });

  /* Everything past here is pure decoration - skip it entirely
     for reduced motion or touch input. */
  if (reduced) return;

  /* ============================================================
     4b. Two-way scroll animation
     Tag the content blocks with .scr. Only the outermost match is
     tagged - a panel animates as one unit, its heading doesn't
     animate again inside it.
     ============================================================ */
  var SCR_SEL = [
    ".eyebrow", "h2", ".lede", ".sec-head", ".panel", ".vcard",
    ".body-copy > p", ".filter", ".mailto", ".notice"
  ].join(",");

  var io = null;
  if (!SDA && "IntersectionObserver" in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var t = en.target;
        if (en.isIntersecting) {
          t.classList.add("in");
          t.classList.remove("above");
        } else {
          // Left through the top edge -> exit upward; bottom edge -> downward.
          t.classList.remove("in");
          t.classList.toggle("above", en.boundingClientRect.top < 0);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  }

  function tagScroll(scope) {
    $$(SCR_SEL, scope).forEach(function (n) {
      if (n.classList.contains("scr") || n.closest(".hero")) return;
      var outer = n.parentElement && n.parentElement.closest(SCR_SEL);
      if (outer && !outer.closest(".hero")) return;
      n.classList.add("scr");
      if (n.classList.contains("vcard")) {
        // column-ish stagger for the fallback path
        var idx = Array.prototype.indexOf.call(n.parentElement.children, n);
        n.style.setProperty("--d", idx % 3);
      }
      if (io) io.observe(n);
      else if (!SDA) n.classList.add("in");
    });
  }

  var mainEl = $("main");
  if (mainEl) {
    tagScroll(mainEl);
    // Cards arrive after a fetch and re-render on search.
    $$("[data-videos]").forEach(function (grid) {
      if (!("MutationObserver" in window)) return;
      new MutationObserver(function () { tagScroll(grid); }).observe(grid, { childList: true });
    });
  }

  /* ============================================================
     4c. One scroll loop for everything direction-aware
     ============================================================ */
  var lastY = window.scrollY;
  var navY = lastY;
  var velocity = 0;       // signed px per scroll event, fed to the ticker
  var navAway = false;
  var toggleBtn = $(".nav-toggle");
  var navEl = $(".nav");

  function updateNav(y) {
    var menuOpen = toggleBtn && toggleBtn.getAttribute("aria-expanded") === "true";
    var focusInNav = navEl && navEl.contains(doc.activeElement);
    var dy = y - navY;
    if (Math.abs(dy) < 8 && y > 80) return;       // ignore jitter
    var want = dy > 0 && y > 320 && !menuOpen && !focusInNav;
    if (y <= 80) want = false;
    if (want !== navAway) {
      navAway = want;
      root.classList.toggle("nav-away", want);
    }
    navY = y;
  }

  // Keyboard users tabbing into the nav always get it back.
  if (navEl) navEl.addEventListener("focusin", function () {
    navAway = false; root.classList.remove("nav-away");
  });

  var scrollTick = false;
  window.addEventListener("scroll", function () {
    var y = window.scrollY;
    velocity += y - lastY;
    lastY = y;
    if (!scrollTick) {
      scrollTick = true;
      requestAnimationFrame(function () { updateNav(window.scrollY); scrollTick = false; });
    }
  }, { passive: true });

  /* ============================================================
     4d. Ticker follows the scroll
     Scroll down -> runs left. Scroll up -> flips and runs right.
     Fast scrolling kicks the speed up and leans the letters;
     it all settles back when you stop.
     ============================================================ */
  if (marquee && track) {
    marquee.classList.add("driven");

    var BASE = 46;            // px/sec at rest - matches the CSS pace
    var MAX_BOOST = 1600;
    var halfW = track.scrollWidth / 2;
    var mx = 0, dir = -1, boost = 0, hovering = false, onScreen = true, lastT = 0, rafId = 0;

    var measure = function () { halfW = track.scrollWidth / 2 || halfW; };
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(measure);
    window.addEventListener("resize", measure);

    if (fine) {
      marquee.addEventListener("pointerenter", function () { hovering = true; });
      marquee.addEventListener("pointerleave", function () { hovering = false; });
    }

    var frame = function (t) {
      var dt = lastT ? Math.min((t - lastT) / 1000, 0.05) : 0;
      lastT = t;

      if (velocity !== 0) {
        dir = velocity > 0 ? -1 : 1;
        boost = Math.min(boost + Math.abs(velocity) * 7, MAX_BOOST);
        velocity = 0;
      }
      boost *= Math.pow(0.03, dt);                 // exponential settle, ~1s

      if (!hovering && halfW > 0) {
        mx += dir * (BASE + boost) * dt;
        if (mx <= -halfW) mx += halfW;
        if (mx > 0) mx -= halfW;
        track.style.transform = "translate3d(" + mx.toFixed(2) + "px,0,0)";
      }
      var skew = Math.max(-12, Math.min(12, -dir * boost / 90));
      marquee.style.setProperty("--skew", skew.toFixed(2) + "deg");

      rafId = onScreen ? requestAnimationFrame(frame) : 0;
    };

    // Only spin the loop while the ticker is actually visible.
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        onScreen = en[0].isIntersecting;
        if (onScreen && !rafId) { lastT = 0; rafId = requestAnimationFrame(frame); }
      }).observe(marquee);
    } else {
      rafId = requestAnimationFrame(frame);
    }
  } else {
    // No ticker on this page - don't let velocity grow unbounded.
    window.addEventListener("scroll", function () { velocity = 0; }, { passive: true });
  }

  /* ============================================================
     5. Scroll progress fallback
     Only needed where CSS scroll() isn't supported.
     ============================================================ */
  var bar = $(".progress");
  if (bar && !(window.CSS && CSS.supports && CSS.supports("animation-timeline", "scroll()"))) {
    var barTick = false;
    var paint = function () {
      var max = doc.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = "scaleX(" + Math.min(1, Math.max(0, pct)) + ")";
      barTick = false;
    };
    window.addEventListener("scroll", function () {
      if (!barTick) { barTick = true; requestAnimationFrame(paint); }
    }, { passive: true });
    paint();
  }

  /* ============================================================
     4e. Text scramble / decode
     Section labels decode every time they scroll into view;
     nav links decode on hover. Mono font, so width never jitters.
     Screen readers get the real text, never the noise.
     ============================================================ */
  var GLYPHS = "!<>-_\\/[]{}=+*^?#%&01";

  function scramble(node, text, ms) {
    if (node._scr) cancelAnimationFrame(node._scr);
    var t0 = performance.now(), n = text.length;
    (function step(now) {
      var p = Math.min(1, (now - t0) / ms), out = "";
      for (var i = 0; i < n; i++) {
        var c = text.charAt(i);
        // characters lock in left-to-right across the run
        out += (c === " " || p >= 0.25 + (i / n) * 0.75) ? c : GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);
      }
      node.textContent = out;
      node._scr = p < 1 ? requestAnimationFrame(step) : 0;
    })(t0);
  }

  var eyebrows = $$(".eyebrow").filter(function (e) { return !e.closest(".hero"); });
  eyebrows.forEach(function (e) {
    var text = e.textContent.trim();
    e.textContent = "";
    var real = doc.createElement("span");
    real.className = "sr";
    real.textContent = text;
    var vis = doc.createElement("span");
    vis.setAttribute("aria-hidden", "true");
    vis.textContent = text;
    e.appendChild(real);
    e.appendChild(vis);
    e._vis = vis; e._txt = text;
  });

  if ("IntersectionObserver" in window && eyebrows.length) {
    var eyeIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) scramble(en.target._vis, en.target._txt, 720);
      });
    }, { threshold: 0.6 });
    eyebrows.forEach(function (e) { eyeIO.observe(e); });
  }

  if (fine) {
    $$(".nav-links a:not(.nav-cta)").forEach(function (a) {
      var text = a.textContent.trim();
      a.setAttribute("aria-label", text);
      a.addEventListener("pointerenter", function () { scramble(a, text, 380); });
    });
  }

  /* ============================================================
     4f. Pixel burst on click - works for touch too
     ============================================================ */
  var BURST_COLORS = ["#9744d0", "#b47ae0", "#e2c7ff", "#ffffff"];
  doc.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest(".btn, .nav-cta, .social, .to-top");
    if (!t) return;
    var x = e.clientX, y = e.clientY;
    if (!x && !y) {                       // keyboard activation: burst from centre
      var r = t.getBoundingClientRect();
      x = r.left + r.width / 2; y = r.top + r.height / 2;
    }
    for (var i = 0; i < 14; i++) {
      var px = doc.createElement("i");
      px.className = "px";
      px.style.left = x + "px";
      px.style.top = y + "px";
      px.style.background = BURST_COLORS[i % BURST_COLORS.length];
      doc.body.appendChild(px);
      var ang = (i / 14) * Math.PI * 2 + Math.random() * 0.5;
      var dist = 34 + Math.random() * 46;
      var anim = px.animate([
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: "translate(" + (Math.cos(ang) * dist).toFixed(1) + "px," +
                     (Math.sin(ang) * dist).toFixed(1) + "px) scale(0)", opacity: 0 }
      ], { duration: 480 + Math.random() * 320, easing: "cubic-bezier(.15,.75,.3,1)" });
      // onfinish alone isn't enough: links here open a new tab, which
      // backgrounds this one and pauses the animation. Timer guarantees cleanup.
      (function (node) {
        var gone = function () { if (node.parentNode) node.remove(); };
        anim.onfinish = gone;
        setTimeout(gone, 1200);
      })(px);
    }
  });

  /* ============================================================
     4g. Wordmark glitch - on hover, plus a rare idle twitch while
     the hero is on screen
     ============================================================ */
  var mark = $(".wordmark");
  if (mark) {
    var glitch = function () {
      if (root.classList.contains("booting") || mark.classList.contains("glitch")) return;
      mark.classList.add("glitch");
    };
    mark.addEventListener("animationend", function (e) {
      if (e.animationName === "glitch") mark.classList.remove("glitch");
    });
    if (fine) mark.addEventListener("pointerenter", glitch);

    var heroOn = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { heroOn = en[0].isIntersecting; }).observe(mark);
    }
    (function idle() {
      setTimeout(function () {
        if (heroOn && !doc.hidden) glitch();
        idle();
      }, 5500 + Math.random() * 5000);
    })();
  }

  if (!fine) return;

  /* ============================================================
     6. Magnetic buttons
     Pull is capped at 7px so it reads as weight, not wobble.
     ============================================================ */
  var PULL = 7;
  $$(".btn").forEach(function (btn) {
    btn.addEventListener("pointermove", function (e) {
      var r = btn.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      btn.classList.add("magnetic");
      btn.style.setProperty("--mx", (dx * PULL).toFixed(2) + "px");
      btn.style.setProperty("--my", (dy * PULL * 0.6).toFixed(2) + "px");
    });
    btn.addEventListener("pointerleave", function () {
      btn.classList.remove("magnetic");
      btn.style.setProperty("--mx", "0px");
      btn.style.setProperty("--my", "0px");
    });
  });

  /* ============================================================
     7. Video card tilt + specular highlight
     Delegated, because cards are rendered after a fetch.
     ============================================================ */
  var TILT = 6;
  doc.addEventListener("pointermove", function (e) {
    var card = e.target.closest && e.target.closest(".vcard");
    if (!card || card.classList.contains("skel")) return;

    var r = card.getBoundingClientRect();
    var px = (e.clientX - r.left) / r.width;
    var py = (e.clientY - r.top) / r.height;

    card.classList.add("tilting");
    card.style.setProperty("--ry", ((px - 0.5) * 2 * TILT).toFixed(2) + "deg");
    card.style.setProperty("--rx", ((0.5 - py) * 2 * TILT).toFixed(2) + "deg");
    card.style.setProperty("--px", (px * 100).toFixed(1) + "%");
    card.style.setProperty("--py", (py * 100).toFixed(1) + "%");
  }, { passive: true });

  doc.addEventListener("pointerout", function (e) {
    var card = e.target.closest && e.target.closest(".vcard");
    if (!card || (e.relatedTarget && card.contains(e.relatedTarget))) return;
    card.classList.remove("tilting");
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
  }, { passive: true });

  /* ============================================================
     8. Hero glow follows the pointer
     Lerped on rAF so it trails rather than snaps.
     ============================================================ */
  var hero = $(".hero");
  var glow = $(".hero-glow");
  if (hero && glow) {
    var tx = 0, ty = 0, cx = 0, cy = 0, running = false, seeded = false;

    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      tx = e.clientX - r.left;
      ty = e.clientY - r.top;
      if (!seeded) { cx = tx; cy = ty; seeded = true; }
      if (!running) { running = true; requestAnimationFrame(loop); }
    }, { passive: true });

    hero.addEventListener("pointerleave", function () {
      var r = hero.getBoundingClientRect();
      tx = r.width / 2;
      ty = r.height * 0.12;
      if (!running) { running = true; requestAnimationFrame(loop); }
    });

    function loop() {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      glow.style.setProperty("--gx", cx.toFixed(1) + "px");
      glow.style.setProperty("--gy", cy.toFixed(1) + "px");

      if (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) {
        requestAnimationFrame(loop);
      } else {
        running = false;
      }
    }
  }
  /* ============================================================
     9. Cursor ring + grid spotlight - one pointer loop for both
     ============================================================ */
  var ring = doc.createElement("div");
  ring.className = "cursor-ring";
  ring.setAttribute("aria-hidden", "true");
  doc.body.appendChild(ring);

  var gridGlow = doc.createElement("div");
  gridGlow.className = "grid-glow";
  gridGlow.setAttribute("aria-hidden", "true");
  var gridBase = $(".grid-bg");
  if (gridBase && gridBase.parentNode) gridBase.parentNode.insertBefore(gridGlow, gridBase.nextSibling);
  else doc.body.appendChild(gridGlow);

  var HOT = "a, button, input, label, .vcard, [role='button']";
  var px_ = -100, py_ = -100, rx = -100, ry = -100, ptrLoop = 0;

  function ptrFrame() {
    rx += (px_ - rx) * 0.22;
    ry += (py_ - ry) * 0.22;
    ring.style.transform = "translate3d(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px,0)";
    gridGlow.style.setProperty("--cx", px_ + "px");
    gridGlow.style.setProperty("--cy", py_ + "px");
    ptrLoop = (Math.abs(px_ - rx) > 0.3 || Math.abs(py_ - ry) > 0.3) ? requestAnimationFrame(ptrFrame) : 0;
  }

  doc.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    if (px_ < 0) { rx = e.clientX; ry = e.clientY; }   // first move: no fly-in from the corner
    px_ = e.clientX; py_ = e.clientY;
    ring.classList.add("on");
    gridGlow.classList.add("on");
    ring.classList.toggle("hot", !!(e.target.closest && e.target.closest(HOT)));
    if (!ptrLoop) ptrLoop = requestAnimationFrame(ptrFrame);
  }, { passive: true });

  doc.addEventListener("pointerdown", function () { ring.classList.add("press"); });
  doc.addEventListener("pointerup",   function () { ring.classList.remove("press"); });
  doc.documentElement.addEventListener("pointerleave", function () {
    ring.classList.remove("on"); gridGlow.classList.remove("on");
  });

  /* ============================================================
     10. Panel spotlight
     ============================================================ */
  doc.addEventListener("pointermove", function (e) {
    var panel = e.target.closest && e.target.closest(".panel");
    if (!panel) return;
    var r = panel.getBoundingClientRect();
    panel.style.setProperty("--sx", (e.clientX - r.left).toFixed(0) + "px");
    panel.style.setProperty("--sy", (e.clientY - r.top).toFixed(0) + "px");
  }, { passive: true });

  /* ============================================================
     11. Sliding nav pill
     ============================================================ */
  var navLinks = $(".nav-links");
  if (navLinks) {
    root.classList.add("pill");
    var pill = doc.createElement("span");
    pill.className = "nav-pill";
    pill.setAttribute("aria-hidden", "true");
    navLinks.insertBefore(pill, navLinks.firstChild);

    var pillLinks = $$("a:not(.nav-cta)", navLinks);
    var current = navLinks.querySelector('a[aria-current="page"]:not(.nav-cta)');

    var moveTo = function (a) {
      if (!a || !a.offsetWidth) { pill.style.opacity = "0"; return; }
      pill.style.opacity = "1";
      pill.style.width = a.offsetWidth + "px";
      pill.style.transform = "translateX(" + a.offsetLeft + "px)";
    };
    pillLinks.forEach(function (a) {
      a.addEventListener("pointerenter", function () { moveTo(a); });
      a.addEventListener("focus", function () { moveTo(a); });
    });
    navLinks.addEventListener("pointerleave", function () { moveTo(current); });
    navLinks.addEventListener("focusout", function (e) {
      if (!navLinks.contains(e.relatedTarget)) moveTo(current);
    });

    // place it on the current page once fonts have settled widths
    var settle = function () {
      pill.style.transition = "none";
      moveTo(current);
      pill.offsetWidth;                       // commit before re-enabling transition
      pill.style.transition = "";
    };
    settle();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(settle);
    window.addEventListener("resize", settle);
  }
})();
