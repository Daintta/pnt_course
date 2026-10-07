// Supabase configuration
// For local development: http://127.0.0.1:54321
// For production Azure: https://your-subdomain/
window.config = window.config || {};
window.config.SUPABASE_URL = 'http://127.0.0.1:54321';
window.config.SUPABASE_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'; // Replace with your local key from supabase start

/* Site configuration. Edit these values to suit your organisation. */
window.PNT = window.PNT || {};
PNT.config = {
  appVersion: "0.9.11",          // shown in the footer; bump on every release
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
  }
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
