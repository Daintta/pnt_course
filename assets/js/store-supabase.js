/* Supabase-backed storage: all progress, attempts and certificates stored in database.
 * Learner must be authenticated to use this store. */
(function () {
  "use strict";

  PNT.store = {
    kind: "supabase",

    async init() {
      if (!window.Auth) return { needsAuth: true, mode: "signin" };
      try {
        await Auth.init();
        const session = await Auth.getSession();
        if (!session) return { needsAuth: true, mode: "signin" };
        return { ok: true };
      } catch (err) {
        console.error('Auth check failed:', err);
        return { needsAuth: true, mode: "signin" };
      }
    },

    async getProfile() {
      const session = await Auth.getSession();
      if (!session) throw new Error('No active session');

      const { data: learner, error } = await window.AuthModule.supabaseClient
        .from('learners')
        .select('id, full_name, email')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Failed to load profile:', error);
        throw new Error(`Failed to load profile: ${error.message}`);
      }
      console.log('Loaded profile from Supabase:', learner);
      return {
        fullName: learner?.full_name || '',
        email: learner?.email || session.user.email || ''
      };
    },

    async saveProfile(p) {
      const session = await Auth.getSession();
      if (!session) throw new Error('No active session');

      const { error } = await window.AuthModule.supabaseClient
        .from('learners')
        .update({ full_name: p.fullName })
        .eq('id', session.user.id);

      if (error) throw new Error(`Failed to save profile: ${error.message}`);
    },

    async getState() {
      const session = await Auth.getSession();
      if (!session) throw new Error('No active session');

      const { data: progress, error: progressError } = await window.AuthModule.supabaseClient
        .from('progress')
        .select('module_num, lessons_read')
        .eq('learner_id', session.user.id);

      if (progressError) throw progressError;

      const { data: attempts, error: attemptsError } = await window.AuthModule.supabaseClient
        .from('assessment_attempts')
        .select('module_num, score')
        .eq('learner_id', session.user.id);

      if (attemptsError) throw attemptsError;

      const { data: certs, error: certsError } = await window.AuthModule.supabaseClient
        .from('certificates')
        .select('*')
        .eq('learner_id', session.user.id);

      if (certsError) throw certsError;

      // Build read state
      const read = {};
      if (progress) {
        progress.forEach(p => {
          const moduleId = `m${String(p.module_num).padStart(2, '0')}`;
          read[moduleId] = p.lessons_read || [];
        });
      }

      // Build practice state
      const practice = {};
      if (attempts) {
        attempts.forEach(a => {
          const moduleId = `m${String(a.module_num).padStart(2, '0')}`;
          if (!practice[moduleId] || a.score > practice[moduleId].best) {
            practice[moduleId] = { best: a.score };
          }
        });
      }

      // Build attempts state
      const attemptsState = {};
      if (attempts) {
        attempts.forEach(a => {
          const moduleId = `m${String(a.module_num).padStart(2, '0')}`;
          if (!attemptsState[moduleId]) attemptsState[moduleId] = [];
          attemptsState[moduleId].push({ score: a.score });
        });
      }

      // Build certificates state
      const certificates = {};
      if (certs) {
        certs.forEach(c => {
          const key = c.type === 'module' ? `m${String(c.module_num).padStart(2, '0')}` : c.type;
          certificates[key] = {
            id: c.id,
            moduleId: c.type === 'module' ? `m${String(c.module_num).padStart(2, '0')}` : c.type,
            percent: c.score,
            issuedAt: c.issued_at,
            fullName: '', // Will be set from profile
            email: '', // Will be set from profile
            version: ''
          };
        });
      }

      return { read, practice, attempts: attemptsState, certificates };
    },

    async markRead(moduleId, lessonId) {
      const session = await Auth.getSession();
      if (!session) throw new Error('No active session');

      const moduleNum = parseInt(moduleId.substring(1), 10);

      // Get current lessons read
      const { data: existing, error: selectError } = await window.AuthModule.supabaseClient
        .from('progress')
        .select('lessons_read')
        .eq('learner_id', session.user.id)
        .eq('module_num', moduleNum)
        .single();

      if (selectError && selectError.code !== 'PGRST116') throw selectError; // PGRST116 = not found

      const lessonsRead = existing?.lessons_read || [];
      if (!lessonsRead.includes(lessonId)) {
        lessonsRead.push(lessonId);
      }

      if (existing) {
        const { error } = await window.AuthModule.supabaseClient
          .from('progress')
          .update({ lessons_read: lessonsRead, updated_at: new Date().toISOString() })
          .eq('learner_id', session.user.id)
          .eq('module_num', moduleNum);
        if (error) throw error;
      } else {
        const { error } = await window.AuthModule.supabaseClient
          .from('progress')
          .insert([{
            learner_id: session.user.id,
            module_num: moduleNum,
            lessons_read: lessonsRead
          }]);
        if (error) throw error;
      }
    },

    async recordPractice(moduleId, score, total) {
      // Practice scoring is done in-app, not stored separately
      // Could extend to store practice attempts in a separate table if needed
    },

    async submitAssessment(moduleId, answers) {
      const session = await Auth.getSession();
      if (!session) throw new Error('No active session');

      const a = PNT.assessments.find((x) => x.moduleId === moduleId);
      if (!a) throw new Error("Assessment not found.");

      const meta = PNT.catalog.find((m) => m.id === moduleId);

      // Check if all lessons read (if required)
      const state = await this.getState();
      if (PNT.config.requireAllLessonsRead && (state.read[moduleId] || []).length < meta.lessons.length) {
        throw new Error("Read all lessons before taking the assessment.");
      }

      // Score the assessment
      const results = a.questions.map((q) => ({
        id: q.id,
        correct: (answers[q.id] || "") === q.answer,
        answer: q.answer,
        explanation: q.explanation
      }));
      const score = results.filter((r) => r.correct).length;
      const total = results.length;
      const percent = Math.round((score / total) * 100);
      const passed = percent >= PNT.config.passMark;
      const now = new Date().toISOString();
      const moduleNum = parseInt(moduleId.substring(1), 10);

      // Save attempt to database
      const { data: attempt, error: attemptError } = await window.AuthModule.supabaseClient
        .from('assessment_attempts')
        .insert([{
          learner_id: session.user.id,
          module_num: moduleNum,
          answers: answers,
          score: score,
          submitted_at: now
        }])
        .select();

      if (attemptError) throw attemptError;

      // Update progress record
      const { error: progressError } = await window.AuthModule.supabaseClient
        .from('progress')
        .update({
          assessment_attempted: true,
          assessment_score: score,
          passed: passed,
          completed_at: passed ? now : null,
          updated_at: now
        })
        .eq('learner_id', session.user.id)
        .eq('module_num', moduleNum);

      if (progressError) throw progressError;

      let certificate = null;
      let programmeCertificate = null;

      // Award module certificate if passed
      if (passed) {
        const { data: existingCert, error: certCheckError } = await window.AuthModule.supabaseClient
          .from('certificates')
          .select('id')
          .eq('learner_id', session.user.id)
          .eq('type', 'module')
          .eq('module_num', moduleNum)
          .single();

        if (certCheckError && certCheckError.code !== 'PGRST116') throw certCheckError;

        if (!existingCert) {
          const certId = this._certId(moduleId);
          const { data: newCert, error: insertError } = await window.AuthModule.supabaseClient
            .from('certificates')
            .insert([{
              learner_id: session.user.id,
              type: 'module',
              module_num: moduleNum,
              score: percent
            }])
            .select();

          if (insertError) throw insertError;
          certificate = newCert?.[0];
        }
      }

      // Check if all modules passed for programme certificate
      if (passed) {
        const { data: allCerts, error: allCertsError } = await window.AuthModule.supabaseClient
          .from('certificates')
          .select('module_num')
          .eq('learner_id', session.user.id)
          .eq('type', 'module');

        if (allCertsError) throw allCertsError;

        const passedModules = new Set(allCerts?.map(c => c.module_num) || []);
        const allModulesPassed = PNT.catalog.every(m => {
          const num = parseInt(m.id.substring(1), 10);
          return passedModules.has(num);
        });

        if (allModulesPassed) {
          const { data: progCert, error: progCertError } = await window.AuthModule.supabaseClient
            .from('certificates')
            .select('id')
            .eq('learner_id', session.user.id)
            .eq('type', 'programme')
            .single();

          if (progCertError && progCertError.code !== 'PGRST116') throw progCertError;

          if (!progCert) {
            const { data: newProgCert, error: insertError } = await window.AuthModule.supabaseClient
              .from('certificates')
              .insert([{
                learner_id: session.user.id,
                type: 'programme'
              }])
              .select();

            if (insertError) throw insertError;
            programmeCertificate = newProgCert?.[0];
          }
        }
      }

      return { score, total, percent, passed, results, certificate, programmeCertificate };
    },

    async resetProgress() {
      const session = await Auth.getSession();
      if (!session) throw new Error('No active session');

      // Delete all progress records for this learner
      const { error: progressError } = await window.AuthModule.supabaseClient
        .from('progress')
        .delete()
        .eq('learner_id', session.user.id);

      if (progressError) throw progressError;

      // Delete all assessment attempts
      const { error: attemptsError } = await window.AuthModule.supabaseClient
        .from('assessment_attempts')
        .delete()
        .eq('learner_id', session.user.id);

      if (attemptsError) throw attemptsError;

      // Delete all certificates
      const { error: certsError } = await window.AuthModule.supabaseClient
        .from('certificates')
        .delete()
        .eq('learner_id', session.user.id);

      if (certsError) throw certsError;
    },

    _certId(moduleId) {
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const bytes = new Uint8Array(8);
      (window.crypto || window.msCrypto).getRandomValues(bytes);
      const rand = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
      const tag = moduleId === "programme" ? "ALL" : moduleId.replace("m", "M");
      return `PNT-${tag}-${rand.slice(0, 4)}-${rand.slice(4)}`;
    },

    auth: {
      async signOut() {
        if (window.Auth) await Auth.signOut();
        window.location.href = 'auth.html';
      }
    }
  };
})();
