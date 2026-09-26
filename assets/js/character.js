/* ============================================================
   LOOPSELY - background character

   Modelled on docs/ref: the figure starts as a huge close-up in
   the centre with the title over it, then the "camera" pulls back
   as you scroll while the figure turns and raises its blade, and
   it settles full-body on the right.

   Three things make that work:
     - scale is part of the journey (2.4x close-up -> 1x full body)
     - a focus point, so a zoomed-in figure shows head and torso
       rather than a giant pair of boots
     - the frame index follows scroll position continuously, so
       scrolling back up rewinds the animation

   Works with no artwork: until real frames exist it draws a
   placeholder silhouette so the motion can be judged.

   Config lives in config.js under SITE.character.
   ============================================================ */
(function () {
  "use strict";

  var doc = document;
  var SITE = window.SITE || {};
  var C = SITE.character || {};

  if (C.enabled === false) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var host = doc.querySelector("[data-character]");
  if (!host) return;

  /* ---------- the journey ----------
     sel   - section this stop is anchored to
     x     - across the viewport (0 left, 0.5 centre, 1 right)
     scale - 1 is full body at the configured height; >1 zooms in
     top   - optional: keep the TOP of the figure at this fraction of
             viewport height. Only needed when zoomed in, to decide
             what stays on screen. Omit for feet-on-the-floor.
     face  - 1 looks right, -1 looks left */
  var STOPS = C.stops || [
    { sel: ".hero",      x: 0.50, scale: 2.40, top: 1.02, face: -1 },
    { sel: "#videos",    x: 0.20, scale: 1.05, face: 1 },
    { sel: "#streams",   x: 0.80, scale: 0.95, face: -1 },
    { sel: "#shorts",    x: 0.80, scale: 0.95, face: -1 },
    { sel: "#community", x: 0.72, scale: 1.00, face: -1 }
  ];

  var SCRUB = C.scrub !== false;      // frames follow scroll by default
  var IDLE = C.idleFrame || 0;

  /* ---------- build ---------- */
  var wrap = doc.createElement("div");
  wrap.className = "char";
  wrap.setAttribute("aria-hidden", "true");
  var inner = doc.createElement("div");
  inner.className = "char-in";
  var body = doc.createElement("div");
  body.className = "char-body";
  inner.appendChild(body);
  wrap.appendChild(inner);

  var frames = [];
  var frameCount = Number(C.frames || 0);

  if (frameCount > 0) {
    for (var i = 0; i < frameCount; i++) {
      var img = doc.createElement("img");
      img.className = "char-frame";
      img.src = String(C.path || "assets/img/char/frame-%02d.webp")
        .replace("%02d", i < 10 ? "0" + i : String(i))
        .replace("%d", String(i));
      img.alt = "";
      img.decoding = "async";
      if (i === IDLE) img.classList.add("on");
      body.appendChild(img);
      frames.push(img);
    }
  } else {
    body.innerHTML =
      '<svg class="char-ph" viewBox="0 0 220 420" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<g fill="currentColor">' +
          '<circle cx="104" cy="52" r="30"/>' +
          '<path d="M104 86c26 0 44 16 48 40l10 64c1 8-4 14-12 14h-2l-6 92c0 8-6 13-14 13h-8c-8 0-13-5-14-13l-6-70-6 70c-1 8-6 13-14 13h-8c-8 0-14-5-14-13l-6-92h-2c-8 0-13-6-12-14l10-64c4-24 22-40 48-40z"/>' +
          '<path d="M150 128c8-4 16 0 18 8l16 54c2 8-2 14-9 16-7 2-13-2-15-9l-16-54c-2-7 0-13 6-15z"/>' +
          '<path d="M66 132c7-3 14 1 16 8l14 48c2 7-1 13-8 15-7 2-13-1-15-8l-14-48c-2-7 0-13 7-15z"/>' +
        '</g>' +
        '<g class="blade" fill="currentColor">' +
          '<rect x="176" y="176" width="10" height="26" rx="4"/>' +
          '<rect x="162" y="168" width="38" height="8" rx="4"/>' +
          '<path d="M177 168 L185 168 L192 44 C192 38 188 34 183 34 C178 34 174 38 174 44 Z"/>' +
        '</g>' +
      "</svg>";
  }

  host.appendChild(wrap);

  if (C.opacity != null) wrap.style.setProperty("--char-opacity", C.opacity);
  if (C.height != null) wrap.style.setProperty("--char-h", (C.height * 100) + "vh");
  if (C.floor != null) wrap.style.setProperty("--char-floor", C.floor + "px");
  if (C.crossfade != null) wrap.style.setProperty("--char-fade", C.crossfade + "ms");
  if (C.smear != null) wrap.style.setProperty("--char-smear", C.smear + "px");
  if (C.float) {
    wrap.style.setProperty("--char-float", C.float + "px");
    body.classList.add("floating");
  }

  /* ---------- geometry ---------- */
  var points = [];

  function measure() {
    var max = doc.documentElement.scrollHeight - window.innerHeight;
    points = STOPS
      .map(function (s) {
        var el = doc.querySelector(s.sel);
        if (!el || el.hidden) return null;
        var box = el.getBoundingClientRect();
        var mid = box.top + window.scrollY + box.height / 2 - window.innerHeight / 2;
        return {
          p: max > 0 ? Math.min(1, Math.max(0, mid / max)) : 0,
          x: s.x, scale: s.scale, face: s.face,
          opacity: s.opacity == null ? 1 : s.opacity,
          top: s.top == null ? null : s.top
        };
      })
      .filter(Boolean)
      .sort(function (a, b) { return a.p - b.p; });
  }

  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function sample(p) {
    if (!points.length) return { x: 0.5, scale: 1, face: 1, opacity: 1, top: null, seg: 0 };
    if (p <= points[0].p) return withSeg(points[0], 0);
    var last = points.length - 1;
    if (p >= points[last].p) return withSeg(points[last], 1);

    for (var i = 0; i < last; i++) {
      var a = points[i], b = points[i + 1];
      if (p >= a.p && p <= b.p) {
        var t = (p - a.p) / (b.p - a.p || 1);
        var e = ease(t);
        // A stop with no `top` means feet on the floor. Treat that as
        // the natural resting offset so zoom in/out blends smoothly.
        var at = a.top == null ? null : a.top;
        var bt = b.top == null ? null : b.top;
        var top = null;
        if (at != null || bt != null) {
          var av = at == null ? restingTop(a.scale) : at;
          var bv = bt == null ? restingTop(b.scale) : bt;
          top = av + (bv - av) * e;
        }
        return {
          x: a.x + (b.x - a.x) * e,
          scale: a.scale + (b.scale - a.scale) * e,
          face: e < 0.5 ? a.face : b.face,
          opacity: a.opacity + (b.opacity - a.opacity) * e,
          top: top,
          seg: (i + t) / last
        };
      }
    }
    return withSeg(points[last], 1);
  }

  function withSeg(s, seg) {
    return { x: s.x, scale: s.scale, face: s.face, opacity: s.opacity, top: s.top, seg: seg };
  }

  /** Where the top of the figure naturally sits with feet on the floor. */
  function restingTop(scale) {
    return (C.height || 0.92) * scale;
  }

  /* ---------- frames ---------- */
  var shown = -1;
  var smearTimer = 0;

  function showFrame(n) {
    if (!frames.length || n === shown) return;
    if (frames[shown]) frames[shown].classList.remove("on");
    if (frames[n]) frames[n].classList.add("on");

    // Smear through the change, then settle sharp.
    if (C.smear !== 0 && shown !== -1) {
      body.classList.add("changing");
      clearTimeout(smearTimer);
      smearTimer = setTimeout(function () { body.classList.remove("changing"); },
                              (C.crossfade == null ? 260 : C.crossfade) * 0.55);
    }
    shown = n;
  }

  var swinging = false;
  function swingOnce() {
    if (swinging) return;
    swinging = true;
    if (!frames.length) {
      body.classList.add("ph-swing");
      setTimeout(function () { body.classList.remove("ph-swing"); swinging = false; }, 620);
      return;
    }
    var n = IDLE;
    var step = function () {
      n++;
      if (n >= frames.length) { showFrame(IDLE); swinging = false; return; }
      showFrame(n);
      setTimeout(step, C.frameMs || 70);
    };
    step();
  }

  /* ---------- drive ---------- */
  var curX = 0, curY = 0, tgtX = 0, tgtY = 0, running = false, started = false;
  var lastStop = -1;

  function apply(p) {
    var s = sample(p);
    var vw = window.innerWidth, vh = window.innerHeight;

    var x = s.x;
    var scale = s.scale;
    if (vw < 760) {
      // Phones are too narrow for the outer stops, and a 2.4x close-up
      // spills half a screen off each side. Pull in and cap the zoom.
      x = 0.5 + (x - 0.5) * 0.4;
      scale = Math.min(scale, C.maxScaleMobile || 1.35);
    }
    tgtX = x * vw;

    // Vertical: with feet on the floor the top lands at height*scale.
    // If this stop wants the top somewhere else, push the figure down
    // by the difference, which is what reads as a camera move.
    var h = (C.height || 0.92) * vh;
    tgtY = s.top == null ? 0 : (h * scale - s.top * vh);

    if (!started) { curX = tgtX; curY = tgtY; started = true; }

    inner.style.setProperty("--s", scale.toFixed(3));
    inner.style.setProperty("--turn", s.face < 0 ? "180deg" : "0deg");
    // Fade back through content-heavy sections so he reads as depth
    // rather than clutter behind the cards.
    var base = C.opacity == null ? 1 : C.opacity;
    wrap.style.setProperty("--char-opacity", (base * (s.opacity == null ? 1 : s.opacity)).toFixed(3));

    if (SCRUB && frames.length > 1) {
      // Frame follows scroll: down plays forward, up rewinds.
      var n = Math.round(s.seg * (frames.length - 1));
      showFrame(Math.max(0, Math.min(frames.length - 1, n)));
    } else {
      for (var i = 0; i < points.length; i++) {
        if (Math.abs(p - points[i].p) < 0.02 && lastStop !== i) {
          lastStop = i;
          swingOnce();
          break;
        }
      }
    }

    if (!running) { running = true; requestAnimationFrame(loop); }
  }

  function loop() {
    curX += (tgtX - curX) * 0.09;
    curY += (tgtY - curY) * 0.09;
    wrap.style.transform = "translate3d(" + curX.toFixed(1) + "px," + curY.toFixed(1) + "px,0)";
    if (Math.abs(tgtX - curX) > 0.4 || Math.abs(tgtY - curY) > 0.4) {
      requestAnimationFrame(loop);
    } else {
      running = false;
    }
  }

  var tick = false;
  function onScroll() {
    if (tick) return;
    tick = true;
    requestAnimationFrame(function () {
      var max = doc.documentElement.scrollHeight - window.innerHeight;
      apply(max > 0 ? window.scrollY / max : 0);
      tick = false;
    });
  }

  function reset() { measure(); lastStop = -1; onScroll(); }

  measure();
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", reset);
  if (window.ResizeObserver) new ResizeObserver(reset).observe(doc.body);
})();
