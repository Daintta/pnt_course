// Supabase configuration
window.config = window.config || {};
// Progress and certificates are stored in each learner's browser. No database is used.
window.config.SUPABASE_URL = '';
window.config.SUPABASE_ANON_KEY = '';

/* Site configuration. Edit these values to suit your organisation. */
window.PNT = window.PNT || {};
PNT.config = {
  appVersion: "0.10.3",          // shown in the footer; bump on every release
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
