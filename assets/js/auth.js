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

  async function signIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`Sign-in failed: ${error.message}`);
    return data.user;
  }

  async function signUp(email, password, fullName) {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) throw new Error(`Sign-up failed: ${error.message}`);
    if (!data.user) throw new Error('Sign-up failed: no user returned');
    await syncLearnerProfile(data.user.id, email, fullName);
    return data.user;
  }

  async function getSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    return session;
  }

  async function signOut() {
    await supabaseClient.auth.signOut();
  }

  async function syncLearnerProfile(userId = null, email = null, fullName = null) {
    const session = await getSession();
    const uid = userId || session?.user?.id;
    const userEmail = email || session?.user?.email;
    if (!uid) throw new Error('No active session');
    const { data: existing } = await supabaseClient.from('learners').select('id, full_name').eq('id', uid).single();
    if (!existing) {
      const { error } = await supabaseClient.from('learners').insert([{
        id: uid,
        email: userEmail,
        full_name: fullName || userEmail.split('@')[0],
      }]);
      if (error) throw error;
    } else {
      await supabaseClient.from('learners').update({ last_login: new Date().toISOString() }).eq('id', uid);
    }
  }

  return { init, signIn, signUp, getSession, signOut, syncLearnerProfile };
})();
