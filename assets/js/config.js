// Supabase configuration
window.config = window.config || {};
// Localhost uses the local Supabase stack ('supabase start'). Other hosts use the self-hosted
// Supabase at pnt-api.daintta.com. The publishable keys are safe to share; they only allow what
// the row-level security rules permit.
const IS_LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname);
window.config.SUPABASE_URL = IS_LOCAL ? 'http://127.0.0.1:54321' : 'https://pnt-api.daintta.com';
window.config.SUPABASE_ANON_KEY = IS_LOCAL
  ? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
  : 'sb_publishable_LrQVJn96w2UrVaztYYG-Jw_FqP5WNzP';

/* Site configuration. Edit these values to suit your organisation. */
window.PNT = window.PNT || {};
PNT.config = {
  appVersion: "0.9.12",          // shown in the footer; bump on every release
  organisation: "Daintta",
  programmeTitle: "PNT Engineering",
  programmeSubtitle: "Foundation & Practitioner Learning Programme",

  // Assessment rules
  passMark: 80,                 // percentage needed to pass each module assessment
  requireAllLessonsRead: true,  // assessment unlocks only after every lesson is marked as read
  revealAnswersOnFail: false,   // true = show correct answers even when the learner fails
  maxAttempts: 0,               // 0 = unlimited (display only in the standalone build)

  // Certificate signatory. Leave signatoryName empty to omit the signature block.
  certificate: {
    signatoryName: "",
    signatoryTitle: ""
  },

  // Storage and data constants
  storageKey: "daintta-pnt-learning-v1",
  totalModules: 10,
  modulesPerStage: [4, 3, 3],  // Foundation, Technology, Engineering
  stages: [
    { name: "Foundation", modules: [1, 2, 3, 4], note: "PNT concepts, GNSS and performance" },
    { name: "Technology and resilience", modules: [5, 6, 7], note: "Alternative PNT, threats and resilient architectures" },
    { name: "Engineering application", modules: [8, 9, 10], note: "Systems engineering, assurance and applied scenarios" }
  ]
};

// SharePoint module documentation links
PNT.sharePointDocs = {
  1: "https://daintta.sharepoint.com/sites/Daintta/_layouts/15/guestaccess.aspx?share=IQBkwQgXY7zTS6NgzeSnWl17AfGRsJkHsIe1aF91VKdaNQE&e=N5paQx",
  2: "https://daintta.sharepoint.com/sites/Daintta/_layouts/15/guestaccess.aspx?share=IQCcgqi7wIOIRJJkbhjrmKlCAYXGTNPaGik57rCgYmwv3iI&e=xLup94",
  3: "https://daintta.sharepoint.com/sites/Daintta/_layouts/15/guestaccess.aspx?share=IQAaTmyTT6LjQJwEgi5j93NrAW-FaxRBl_103BRa3oZrJDI&e=bhi5iO",
  4: "https://daintta.sharepoint.com/sites/Daintta/_layouts/15/guestaccess.aspx?share=IQC3MaVgRBUFS5MElvdAczAVAXfi6YyYUFuZ2FLv7PcffWQ&e=QKFUbJ",
  5: "https://daintta.sharepoint.com/sites/Daintta/_layouts/15/guestaccess.aspx?share=IQB3JqpLmX4vTqOPsb8oRjdWAfgceH3PD3crr76PdE-oXvI&e=j5qQRy",
  6: "https://daintta.sharepoint.com/sites/Daintta/_layouts/15/guestaccess.aspx?share=IQDL8NwGV5tPTqBN_NHVA0qIAcoo-obiVQYDPwUj9FsC7BQ&e=zl1GFr",
  7: "https://daintta.sharepoint.com/sites/Daintta/_layouts/15/guestaccess.aspx?share=IQDJmAirF0yXSbuBxsr9y9j2AXlwK6l78UynNBLPM30oeAo&e=9WSiXI",
  8: "https://daintta.sharepoint.com/sites/Daintta/_layouts/15/guestaccess.aspx?share=IQDYRk8KKFFrQIGcZIR09SWSAUky1S2OF1UIVOaX0dv5bQ4&e=xDUVpL",
  9: "https://daintta.sharepoint.com/sites/Daintta/_layouts/15/guestaccess.aspx?share=IQDX-lY5J5CNSay9OpqNHJySAYMfXd-dM9CzX0rkzukLgNk&e=ERiMHF",
  10: "https://daintta.sharepoint.com/sites/Daintta/_layouts/15/guestaccess.aspx?share=IQCw4KCt8unxRaMrZ-BMiyJ0Acwze7eg3HfaDrFSCdIp7Is&e=fr3VcL"
};
