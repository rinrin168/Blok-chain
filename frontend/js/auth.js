// auth.js - Login page logic
document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, go to dashboard
  if (isLoggedIn()) {
    window.location.href = './dashboard.html';
    return;
  }

  const form      = document.getElementById('login-form');
  const errMsg    = document.getElementById('error-msg');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errMsg.classList.add('hidden');

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      errMsg.textContent = 'Please enter your email and password.';
      errMsg.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Logging in...';

    try {
      const data = await apiRequest('POST', '/auth/login', { email, password });

      localStorage.setItem('certchain_token', data.token);
      localStorage.setItem('certchain_user', JSON.stringify(data.user));

      showToast('Login successful! Redirecting...', 'success');
      setTimeout(() => { window.location.href = './dashboard.html'; }, 700);
    } catch (err) {
      errMsg.textContent = err.message || 'Login failed. Please check your credentials.';
      errMsg.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Login';
    }
  });
});
