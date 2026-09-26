/* ===========================================================
   SITE CONFIG — every piece of editable copy lives here.
   Change a value, commit, done. No build step.
   Anything marked TODO is a placeholder waiting on real info.
   =========================================================== */

window.SITE = {
  name:      "Loopsely",
  handle:    "@Loopsely",
  channelId: "UCjGkhRhs6k7LJ-dIdp3e-IA",

  // One line under the wordmark. Keep it short — it sits at large size.
  tagline:   "TODO: what he makes, e.g. “Minecraft content, every week”",

  // Home page "about" teaser — 2-3 sentences.
  blurb:     "TODO: short intro. Who he is, what the channel is, why someone should subscribe.",

  // about.html long-form. Each string is its own paragraph.
  story: [
    "TODO: paragraph one — how the channel started.",
    "TODO: paragraph two — what viewers can expect, upload cadence, the kind of series he runs."
  ],

  // Shown as tags on the about page. Delete the array to hide the section.
  // Taken from the channel's actual uploads and streams.
  games: ["Valorant", "Beast of Reincarnation", "Sons of the Forest",
          "Black Myth: Wukong", "LORT", "Minecraft"],

  links: {
    youtube:   "https://www.youtube.com/@Loopsely",
    x:         "https://x.com/loopsely",
    instagram: "https://instagram.com/loopsely",
    // TODO: a Discord SERVER INVITE (discord.gg/xxxx), not the username.
    // Leave null and the Discord buttons hide themselves automatically.
    discord:   null,
    discordTag: "@Loopsely"
  },

  // Business enquiries block. Leave null to hide the whole section.
  businessEmail: null, // TODO: e.g. "you@example.com"

  // Terminal boot screen shown once per browser session. false turns it off.
  intro: true,

  // Background character. Rides the page: centre in the hero, out
  // left, over to the right, back to centre at the end. Swings on
  // arrival and turns around when it changes sides.
  //
  // frames: 0 draws a placeholder silhouette. Set it to the number of
  // sliced frames (frame-00.webp, frame-01.webp, ...) to use real art.
  // Frame 0 is the resting pose; the rest play once as the swing.
  character: {
    enabled: true,
    frames:  5,         // calm -> guard -> shoulder -> raised -> full height
    path:    "assets/img/char/frame-%02d.webp",
    idleFrame: 0,
    scrub:   true,      // frames follow scroll position; scrolling up rewinds
    frameMs: 70,        // only used when scrub is false
    crossfade: 650,     // ms to dissolve between poses; 0 = hard cut
    smear:     7,       // px of blur while a pose changes; 0 = off
    float:     10,      // px of slow idle drift so held poses stay alive; 0 = off
    opacity: 1,
    height:  0.92,      // full-body height as a fraction of the viewport
    maxScaleMobile: 1.35, // phones cannot take the full close-up
    floor:   0,

    // The journey down the page, modelled on docs/ref.
    //   x     0 = left edge, 0.5 = centre, 1 = right edge
    //   scale 1 = full body; >1 zooms in like a camera push
    //   top   optional - keeps the TOP of the figure at this fraction of
    //         the viewport. Only needed when zoomed in, to choose what
    //         stays on screen. Omit it and the feet sit on the floor.
    //   face  1 looks right, -1 looks left
    //   opacity  1 solid, lower to fade behind busy sections
    stops: [
      { sel: ".hero",      x: 0.50, scale: 2.40, top: 1.02, face: 1, opacity: 1.00 },
      { sel: "#videos",    x: 0.06, scale: 1.05, face:  1, opacity: 0.30 },
      { sel: "#streams",   x: 0.94, scale: 0.95, face: 1, opacity: 0.30 },
      { sel: "#shorts",    x: 0.94, scale: 0.95, face: 1, opacity: 0.35 },
      { sel: "#community", x: 0.82, scale: 1.00, face: 1, opacity: 1.00 }
    ]
  },

  // Scrolling ticker under the hero. Keep entries short and punchy -
  // they loop forever. Delete the array to fall back to name/handle.
  marquee: [
    "New videos",
    "Loopsely",
    "Join the Discord",
    "@Loopsely"
  ]
};
