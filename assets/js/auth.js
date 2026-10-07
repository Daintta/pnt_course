const Auth = (() => {
  let supabaseClient = null;

  async function init() {
    if (!window.config.SUPABASE_URL || !window.config.SUPABASE_ANON_KEY) {
      throw new Error('Supabase URL and anon key must be configured in config.js');
    }
    if (!window.supabase) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0';
      document.head.appendChild(script);
      return new Promise((resolve, reject) => {
        script.onload = () => {
          const { createClient } = window.supabase;
          supabaseClient = createClient(window.config.SUPABASE_URL, window.config.SUPABASE_ANON_KEY);
          resolve();
        };
        script.onerror = () => reject(new Error('Failed to load Supabase SDK'));
      });
    }
    const { createClient } = window.supabase;
    supabaseClient = createClient(window.config.SUPABASE_URL, window.config.SUPABASE_ANON_KEY);
  }

  async function signInWithMagicLink(email) {
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'http://localhost:8000' },
    });
    if (error) throw new Error(`Sign-in failed: ${error.message}`);
    return { email };
  }

  async function getSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    return session;
  }

  async function signOut() {
    await supabaseClient.auth.signOut();
  }

  async function syncLearnerProfile() {
    const session = await getSession();
    if (!session) throw new Error('No active session');
    const { data: existing } = await supabaseClient.from('learners').select('id, name').eq('id', session.user.id).single();
    if (!existing) {
      const { error } = await supabaseClient.from('learners').insert([{
        id: session.user.id,
        email: session.user.email,
        name: session.user.email.split('@')[0],
      }]);
      if (error) throw error;
    } else {
      await supabaseClient.from('learners').update({ last_login: new Date().toISOString() }).eq('id', session.user.id);
    }
  }

  return { init, signInWithMagicLink, getSession, signOut, syncLearnerProfile };
})();
