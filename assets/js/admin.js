(function () {
  "use strict";

  let allLearners = [];
  let currentSession = null;
  let currentResetLearner = null;

  async function init() {
    try {
      await Auth.init();
      const session = await Auth.getSession();
      if (!session) {
        window.location.href = 'auth.html';
        return;
      }
      currentSession = session;

      // Check if user is admin
      const isAdmin = await checkAdminStatus(session.user.id);
      if (!isAdmin) {
        showError('Access denied. Admin privileges required.');
        setTimeout(() => {
          window.location.href = 'index.html#/modules';
        }, 2000);
        return;
      }

      initDarkMode();
      initSyncIndicator();
      await loadLearners();
      setupEventListeners();
    } catch (e) {
      console.error('Admin init error:', e);
      showError('Failed to load admin dashboard: ' + e.message);
    }
  }

  async function checkAdminStatus(userId) {
    try {
      const { data, error } = await window.AuthModule.supabaseClient
        .from('learners')
        .select('is_admin')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data?.is_admin || false;
    } catch (e) {
      console.error('Error checking admin status:', e);
      return false;
    }
  }

  async function loadLearners() {
    try {
      const { data, error } = await window.AuthModule.supabaseClient
        .from('learners')
        .select(`
          id,
          email,
          full_name,
          created_at,
          last_login
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      allLearners = data || [];

      // Load progress for each learner
      const learnersWithProgress = await Promise.all(
        allLearners.map(async (learner) => {
          const progress = await getProgressSummary(learner.id);
          return { ...learner, ...progress };
        })
      );

      allLearners = learnersWithProgress;
      renderLearners(allLearners);
    } catch (e) {
      console.error('Error loading learners:', e);
      showError('Failed to load learners: ' + e.message);
    }
  }

  async function getProgressSummary(learnerId) {
    try {
      const { data: progress, error } = await window.AuthModule.supabaseClient
        .from('progress')
        .select('module_num, passed, assessment_score')
        .eq('learner_id', learnerId);

      if (error) throw error;

      const modulesCompleted = (progress || []).filter(p => p.passed).length;
      const avgScore = progress?.length > 0
        ? Math.round(progress.filter(p => p.assessment_score).reduce((sum, p) => sum + (p.assessment_score || 0), 0) / progress.length)
        : 0;

      const { data: certs } = await window.AuthModule.supabaseClient
        .from('certificates')
        .select('id')
        .eq('learner_id', learnerId);

      return {
        modulesCompleted,
        avgScore,
        certificatesIssued: certs?.length || 0
      };
    } catch (e) {
      console.error('Error getting progress summary:', e);
      return { modulesCompleted: 0, avgScore: 0, certificatesIssued: 0 };
    }
  }

  function renderLearners(learners) {
    const container = document.getElementById('learners-list');

    if (!learners.length) {
      container.innerHTML = '<div class="empty-state"><p>No learners yet</p></div>';
      return;
    }

    const rows = learners.map(l => `
      <tr>
        <td class="learner-name">${escapeHtml(l.full_name || l.email)}</td>
        <td>${escapeHtml(l.email)}</td>
        <td>
          <span class="progress-badge ${getProgressClass(l.modulesCompleted)}">
            ${l.modulesCompleted}/${window.PNT.config.totalModules} modules
          </span>
        </td>
        <td>${l.avgScore}%</td>
        <td>${l.certificatesIssued}</td>
        <td>${new Date(l.last_login || l.created_at).toLocaleDateString()}</td>
        <td class="actions">
          <button class="btn-sm" onclick="viewLearnerDetails('${l.id}')">View</button>
          <button class="btn-sm" onclick="openResetModal('${l.id}', '${escapeHtml(l.email)}')">Reset</button>
        </td>
      </tr>
    `).join('');

    container.innerHTML = `
      <table class="learners-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Progress</th>
            <th>Avg Score</th>
            <th>Certificates</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function getProgressClass(completed) {
    if (completed === 0) return 'progress-not-started';
    if (completed === window.PNT.config.totalModules) return 'progress-complete';
    return 'progress-in-progress';
  }

  function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    const exportBtn = document.getElementById('export-csv-btn');
    const signOutBtn = document.getElementById('sign-out-btn');

    searchInput?.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = allLearners.filter(l =>
        l.full_name?.toLowerCase().includes(query) ||
        l.email?.toLowerCase().includes(query)
      );
      renderLearners(filtered);
    });

    exportBtn?.addEventListener('click', exportCSV);
    signOutBtn?.addEventListener('click', () => {
      PNT.store.auth.signOut();
    });
  }

  function exportCSV() {
    const headers = ['Name', 'Email', 'Modules Completed', 'Avg Score', 'Certificates', 'Last Login'];
    const rows = allLearners.map(l => [
      l.full_name || l.email,
      l.email,
      l.modulesCompleted,
      l.avgScore,
      l.certificatesIssued,
      new Date(l.last_login || l.created_at).toISOString()
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `learners-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  window.viewLearnerDetails = async function (learnerId) {
    try {
      const { data: progress } = await window.AuthModule.supabaseClient
        .from('progress')
        .select('*')
        .eq('learner_id', learnerId)
        .order('module_num');

      const learner = allLearners.find(l => l.id === learnerId);
      const details = progress?.map(p => `
        <li>Module ${p.module_num}: ${p.passed ? '✓ Passed' : '○ In Progress'} (${p.assessment_score}%)</li>
      `).join('') || '<li>No progress</li>';

      showAlert(`
        <strong>${learner?.full_name || learner?.email}</strong>
        <ul style="margin-top: 10px;">${details}</ul>
      `, 'info');
    } catch (e) {
      console.error('Error viewing learner details:', e);
    }
  };

  window.openResetModal = function (learnerId, email) {
    currentResetLearner = learnerId;
    document.getElementById('reset-email').textContent = email;
    document.getElementById('reset-modal').classList.add('show');
  };

  window.closeResetModal = function () {
    document.getElementById('reset-modal').classList.remove('show');
    currentResetLearner = null;
  };

  window.confirmReset = async function () {
    if (!currentResetLearner) return;

    const learner = allLearners.find(l => l.id === currentResetLearner);
    if (!learner) return;

    try {
      closeResetModal();
      showAlert('Sending password reset link...', 'info');

      const { error } = await window.AuthModule.supabaseClient.auth
        .resetPasswordForEmail(learner.email, {
          redirectTo: `${window.location.origin}/reset-password.html`
        });

      if (error) throw error;

      showAlert(`Password reset link sent to ${learner.email}`, 'success');
    } catch (e) {
      console.error('Error resetting password:', e);
      showAlert('Failed to send reset link: ' + e.message, 'error');
    }
  };

  function showAlert(message, type = 'error') {
    const container = document.getElementById('alert-container');
    const className = type === 'success' ? 'success' : type === 'info' ? 'info' : 'error';
    const alert = document.createElement('div');
    alert.className = className;
    alert.innerHTML = message;
    container.appendChild(alert);

    if (type !== 'error') {
      setTimeout(() => alert.remove(), 3000);
    }
  }

  function showError(message) {
    const container = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.className = 'error';
    alert.textContent = message;
    container.appendChild(alert);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function initDarkMode() {
    const toggle = document.getElementById('dark-mode-toggle');
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (savedTheme !== 'light' && prefersDark);

    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      toggle.textContent = '☀️';
    }

    toggle?.addEventListener('click', () => {
      const isCurrentlyDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isCurrentlyDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        toggle.textContent = '🌙';
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        toggle.textContent = '☀️';
      }
    });
  }

  function initSyncIndicator() {
    const indicator = document.getElementById('sync-status');
    window.showSyncStatus = (syncing) => {
      if (syncing) {
        indicator.textContent = '⊙';
        indicator.style.color = '#ff9500';
        indicator.classList.add('pulse');
      } else {
        navigator.onLine
          ? (indicator.textContent = '●', indicator.style.color = '#4caf50', indicator.classList.remove('pulse'))
          : (indicator.textContent = '●', indicator.style.color = '#f44336', indicator.classList.remove('pulse'));
      }
    };

    const updateOnline = () => {
      if (navigator.onLine) {
        indicator.textContent = '●';
        indicator.style.color = '#4caf50';
        indicator.classList.remove('pulse');
      } else {
        indicator.textContent = '●';
        indicator.style.color = '#f44336';
      }
    };

    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    updateOnline();
  }

  // Close modal on outside click
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('reset-modal');
    if (e.target === modal) closeResetModal();
  });

  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
