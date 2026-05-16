redirectIfAuthed();

let selectedRole = 'admin';

function switchTab(tab) {
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('signup-form').classList.toggle('hidden', tab !== 'signup');
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
}

function selectRole(role) {
  selectedRole = role;
  document.getElementById('role-admin').classList.toggle('selected', role === 'admin');
  document.getElementById('role-member').classList.toggle('selected', role === 'member');
}

async function doLogin() {
  const btn = document.getElementById('login-btn');
  const err = document.getElementById('login-error');
  err.classList.add('hidden');
  btn.innerHTML = '<span class="spinner"></span> Signing in...';
  btn.disabled = true;
  try {
    const { user, token } = await apiFetch('/auth/login', {
      method: 'POST',
      body: { email: document.getElementById('login-email').value, password: document.getElementById('login-password').value }
    });
    setSession(user, token);
    window.location.href = '/dashboard.html';
  } catch (e) {
    err.textContent = e.message;
    err.classList.remove('hidden');
    btn.innerHTML = 'Sign In';
    btn.disabled = false;
  }
}

async function doSignup() {
  const btn = document.getElementById('signup-btn');
  const err = document.getElementById('signup-error');
  err.classList.add('hidden');
  btn.innerHTML = '<span class="spinner"></span> Creating account...';
  btn.disabled = true;
  try {
    const { user, token } = await apiFetch('/auth/signup', {
      method: 'POST',
      body: {
        name: document.getElementById('signup-name').value,
        email: document.getElementById('signup-email').value,
        password: document.getElementById('signup-password').value,
        role: selectedRole
      }
    });
    setSession(user, token);
    window.location.href = '/dashboard.html';
  } catch (e) {
    err.textContent = e.message;
    err.classList.remove('hidden');
    btn.innerHTML = 'Create Account';
    btn.disabled = false;
  }
}

// Enter key support
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const loginVisible = !document.getElementById('login-form').classList.contains('hidden');
    if (loginVisible) doLogin(); else doSignup();
  }
});
