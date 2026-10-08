/* Hybrid storage: progress cached in localStorage for performance, synced to Supabase DB.
 * Assessments are scored in browser. See README for store interface. */
(function () {
  "use strict";
  const KEY = window.PNT?.config?.storageKey || "daintta-pnt-learning-v1";
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

  // Sync queue for offline operations
  const SYNC_QUEUE_KEY = "pnt-sync-queue";
  const syncQueue = {
    add(op) {
      try {
        const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || "[]");
        queue.push({ ...op, queuedAt: new Date().toISOString() });
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
      } catch (e) { console.error('Failed to queue operation:', e); }
    },
    getAll() {
      try {
        return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || "[]");
      } catch (e) { return []; }
    },
    clear() {
      try { localStorage.removeItem(SYNC_QUEUE_KEY); } catch (e) { }
    }
  };

  // Retry logic with exponential backoff and queue fallback
  async function withRetry(fn, maxAttempts = 3, queueOp = null) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        window.showSyncStatus?.(true);
        const result = await fn();
        window.showSyncStatus?.(false);
        return result;
      } catch (err) {
        if (i === maxAttempts - 1) {
          // All retries failed - queue for later if offline
          if (!navigator.onLine && queueOp) {
            console.warn('Offline - operation queued for later');
            syncQueue.add(queueOp);
          }
          window.showSyncStatus?.(false);
          throw err;
        }
        if (!navigator.onLine) {
          console.warn('Offline - operation queued for later');
          if (queueOp) syncQueue.add(queueOp);
          throw err;
        }
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        console.warn(`Sync failed, retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  // Process queued sync operations when coming back online
  async function processSyncQueue() {
    if (!navigator.onLine) return;

    const queue = syncQueue.getAll();
    if (!queue.length) return;

    console.log(`Processing ${queue.length} queued operations...`);
    let processed = 0;

    for (const op of queue) {
      try {
        if (op.type === 'markRead' && window.Auth && window.AuthModule?.supabaseClient) {
          const session = await Auth.getSession();
          if (session) {
            const d = load();
            const moduleNum = parseInt(op.moduleId.substring(1), 10);
            const { error } = await window.AuthModule.supabaseClient
              .from('progress')
              .upsert({
                learner_id: session.user.id,
                module_num: moduleNum,
                lessons_read: d.read[op.moduleId] || [],
                updated_at: new Date().toISOString()
              });
            if (error) throw error;
          }
        }
        processed++;
      } catch (e) {
        console.error(`Failed to process queued ${op.type} operation:`, e);
        break;
      }
    }

    // Remove processed items from queue
    if (processed > 0) {
      const remaining = queue.slice(processed);
      if (remaining.length) {
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));
      } else {
        syncQueue.clear();
      }
      console.log(`Processed ${processed} queued operations`);
      window.showSyncStatus?.(false);
    }
  }

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

      // Try to load from Supabase (source of truth)
      if (window.Auth && window.AuthModule?.supabaseClient) {
        try {
          const session = await Auth.getSession();
          if (session) {
            const { data: progress, error: progressError } = await window.AuthModule.supabaseClient
              .from('progress')
              .select('module_num, lessons_read, attempts, assessment_attempted, assessment_score, passed')
              .eq('learner_id', session.user.id);

            if (!progressError && progress) {
              // Merge Supabase data with localStorage
              const read = {};
              progress.forEach(p => {
                const moduleId = `m${String(p.module_num).padStart(2, '0')}`;
                read[moduleId] = p.lessons_read || [];
              });
              d.read = read;

              // Save merged state back to localStorage
              save(d);
            }
          }
        } catch (e) {
          console.error('Error loading progress from Supabase:', e);
          // Fall back to localStorage
        }
      }

      return { read: d.read, practice: d.practice, attempts: d.attempts, certificates: d.certificates };
    },
    async markRead(moduleId, lessonId) {
      const d = load();
      const set = new Set(d.read[moduleId] || []); set.add(lessonId);
      d.read[moduleId] = Array.from(set); save(d);

      // Also save to Supabase with retry and queue
      if (window.Auth && window.AuthModule?.supabaseClient) {
        const syncMarkRead = async () => {
          const session = await Auth.getSession();
          if (session) {
            const moduleNum = parseInt(moduleId.substring(1), 10);
            const { error } = await window.AuthModule.supabaseClient
              .from('progress')
              .upsert({
                learner_id: session.user.id,
                module_num: moduleNum,
                lessons_read: d.read[moduleId],
                updated_at: new Date().toISOString()
              });
            if (error) throw error;
          }
        };

        withRetry(syncMarkRead, 3, {
          type: 'markRead',
          moduleId,
          lessonId,
          fn: syncMarkRead
        }).catch(e => console.error('Failed to sync progress:', e));
      }
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

      // Sync to Supabase with retry
      if (window.Auth && window.AuthModule?.supabaseClient) {
        withRetry(async () => {
          const session = await Auth.getSession();
          if (session) {
            window.showSyncStatus?.(true);
            const moduleNum = parseInt(moduleId.substring(1), 10);
            // Save attempt
            let err = (await window.AuthModule.supabaseClient.from('assessment_attempts').insert({
              learner_id: session.user.id,
              module_num: moduleNum,
              answers: answers,
              score: score
            })).error;
            if (err) throw err;

            // Update progress with assessment result
            err = (await window.AuthModule.supabaseClient.from('progress').upsert({
              learner_id: session.user.id,
              module_num: moduleNum,
              assessment_attempted: true,
              assessment_score: score,
              passed: passed,
              completed_at: passed ? now : null,
              updated_at: now
            })).error;
            if (err) throw err;

            // Save certificate if awarded
            if (certificate) {
              err = (await window.AuthModule.supabaseClient.from('certificates').insert({
                learner_id: session.user.id,
                type: 'module',
                module_num: moduleNum,
                score: percent
              })).error;
              if (err) throw err;
            }
            window.showSyncStatus?.(false);
          }
        }).catch(e => console.error('Failed to sync assessment:', e));
      }

      return { score, total, percent, passed, results, certificate, programmeCertificate };
    },
    async resetProgress() { const d = load(); const p = d.profile; const n = blank(); n.profile = p; save(n); },
    auth: {
      async signOut() {
        if (window.Auth) await Auth.signOut();
        // Keep progress in localStorage - it's user-specific and persists across devices
        window.location.href = 'auth.html';
      }
    }
  };

  // Expose sync queue processing globally
  window.processSyncQueue = processSyncQueue;
})();
