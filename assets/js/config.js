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

  // Scrolling ticker under the hero. Keep entries short and punchy -
  // they loop forever. Delete the array to fall back to name/handle.
  marquee: [
    "New videos",
    "Loopsely",
    "Join the Discord",
    "@Loopsely"
  ]
};
