/* Standalone storage: progress, attempts and certificates live in this browser's localStorage.
 * Assessments are scored in the browser. See README for the store interface. */
(function () {
  "use strict";
  const KEY = "daintta-pnt-learning-v1";
  const blank = () => ({ profile: { fullName: "", email: "" }, read: {}, practice: {}, attempts: {}, certificates: {} });
  let mem = null;          // fallback if storage is blocked
  function load() {
    try { const raw = localStorage.getItem(KEY); return raw ? Object.assign(blank(), JSON.parse(raw)) : blank(); }
    catch (e) { return mem || (mem = blank()); }
  }
  function save(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { mem = d; }
  }
  function certId(moduleId) {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(8); (window.crypto || window.msCrypto).getRandomValues(bytes);
    const rand = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
    const tag = moduleId === "programme" ? "ALL" : moduleId.replace("m", "M");
    return `PNT-${tag}-${rand.slice(0, 4)}-${rand.slice(4)}`;
  }
  const version = () => (PNT.catalog[0] && PNT.catalog[0].version) || "";

  PNT.store = {
    kind: "local",
    async init() {
      return { ok: true };
    },
    async getProfile() { return load().profile; },
    async saveProfile(p) {
      const d = load();
      d.profile = { fullName: p.fullName, email: p.email || "" };
      // keep issued certificates in step with the learner's name
      Object.values(d.certificates).forEach((c) => { c.fullName = d.profile.fullName; c.email = d.profile.email; });
      save(d);
    },
    async getState() {
      const d = load();
      return { read: d.read, practice: d.practice, attempts: d.attempts, certificates: d.certificates };
    },
    async markRead(moduleId, lessonId) {
      const d = load();
      const set = new Set(d.read[moduleId] || []); set.add(lessonId);
      d.read[moduleId] = Array.from(set); save(d);
    },
    async recordPractice(moduleId, score, total) {
      const d = load();
      const prev = d.practice[moduleId];
      d.practice[moduleId] = { best: Math.max(score, prev ? prev.best : 0), total, at: new Date().toISOString() };
      save(d);
    },
    async submitAssessment(moduleId, answers) {
      const a = PNT.assessments.find((x) => x.moduleId === moduleId);
      if (!a) throw new Error("Assessment not found.");
      const meta = PNT.catalog.find((m) => m.id === moduleId);
      const d = load();
      if (PNT.config.requireAllLessonsRead && (d.read[moduleId] || []).length < meta.lessons.length) throw new Error("Read all lessons before taking the assessment.");
      const results = a.questions.map((q) => ({ id: q.id, correct: (answers[q.id] || "") === q.answer, answer: q.answer, explanation: q.explanation }));
      const score = results.filter((r) => r.correct).length;
      const total = results.length;
      const percent = Math.round((score / total) * 100);
      const passed = percent >= PNT.config.passMark;
      const now = new Date().toISOString();
      (d.attempts[moduleId] = d.attempts[moduleId] || []).push({ score, total, percent, passed, at: now });
      let certificate = null, programmeCertificate = null;
      if (passed && !d.certificates[moduleId]) {
        certificate = d.certificates[moduleId] = { id: certId(moduleId), moduleId, percent, issuedAt: now, fullName: d.profile.fullName, email: d.profile.email, version: version() };
      }
      if (passed && !d.certificates.programme && PNT.catalog.every((m) => d.certificates[m.id])) {
        programmeCertificate = d.certificates.programme = { id: certId("programme"), moduleId: "programme", percent: null, issuedAt: now, fullName: d.profile.fullName, email: d.profile.email, version: version() };
      }
      save(d);
      return { score, total, percent, passed, results, certificate, programmeCertificate };
    },
    async resetProgress() { const d = load(); const p = d.profile; const n = blank(); n.profile = p; save(n); },
    auth: {
      async signOut() {
        if (window.Auth) await Auth.signOut();
        localStorage.removeItem(KEY);
        window.location.href = 'auth.html';
      }
    }
  };
})();
