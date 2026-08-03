let isLoginMode = true;

const submitBtn = document.getElementById('submit-btn');
const switchLink = document.getElementById('switch-link');
const switchText = document.getElementById('switch-text');
const formSubtitle = document.getElementById('form-subtitle');
const signupFields = document.getElementById('signup-fields');
const errorMsg = document.getElementById('error-msg');

switchLink.addEventListener('click', () => {
  isLoginMode = !isLoginMode;
  errorMsg.textContent = '';
  errorMsg.style.color = '#f87171';

  if (isLoginMode) {
    submitBtn.textContent = 'Login';
    formSubtitle.textContent = 'Login to your teacher account';
    signupFields.style.display = 'none';
    switchText.innerHTML = 'Don\'t have an account? <a id="switch-link">Sign up</a>';
  } else {
    submitBtn.textContent = 'Sign Up';
    formSubtitle.textContent = 'Create your teacher account';
    signupFields.style.display = 'block';
    switchText.innerHTML = 'Already have an account? <a id="switch-link">Login</a>';
  }
  document.getElementById('switch-link').addEventListener('click', () => switchLink.click());
});

submitBtn.addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  errorMsg.textContent = '';

  if (!email || !password) {
    errorMsg.textContent = 'Please fill all fields';
    return;
  }

  try {
    if (isLoginMode) {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        errorMsg.textContent = data.message || 'Login failed';
        return;
      }

      sessionStorage.setItem('teacherName', data.name);
      sessionStorage.setItem('teacherId', data.id);
      window.location.href = '/dashboard.html';

    } else {
      const name = document.getElementById('name').value.trim();
      if (!name) {
        errorMsg.textContent = 'Please enter your name';
        return;
      }

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        errorMsg.textContent = data.message || 'Signup failed';
        return;
      }

      errorMsg.style.color = '#4ade80';
      errorMsg.textContent = 'Account created! Please login.';
      setTimeout(() => switchLink.click(), 1200);
    }
  } catch (err) {
    errorMsg.textContent = 'Cannot connect to server. Is app.py running?';
  }
});