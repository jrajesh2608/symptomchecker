const API_BASE_URL = "http://localhost:8000";

// ─── Tab Switching ────────────────────────────────────────────────────────────
function showTab(tab) {
    const loginForm    = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');
    const tabLogin     = document.getElementById('tab-login');
    const tabRegister  = document.getElementById('tab-register');

    if (tab === 'login') {
        loginForm.style.display    = 'block';
        registerForm.style.display = 'none';
        tabLogin.classList.add('active-tab');
        tabRegister.classList.remove('active-tab');
    } else {
        loginForm.style.display    = 'none';
        registerForm.style.display = 'block';
        tabLogin.classList.remove('active-tab');
        tabRegister.classList.add('active-tab');
    }
    // Clear alerts when switching tabs
    hideAlert('login-error');
    hideAlert('register-error');
    hideAlert('register-success');
}

// ─── Password toggle ──────────────────────────────────────────────────────────
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon  = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// ─── Password strength meter ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const regPassword = document.getElementById('reg-password');
    if (regPassword) {
        regPassword.addEventListener('input', () => {
            const val = regPassword.value;
            const strengthDiv   = document.getElementById('password-strength');
            const strengthFill  = document.getElementById('strength-fill');
            const strengthLabel = document.getElementById('strength-label');

            if (!val) {
                strengthDiv.style.display = 'none';
                return;
            }
            strengthDiv.style.display = 'flex';

            let score = 0;
            if (val.length >= 6)  score++;
            if (val.length >= 10) score++;
            if (/[A-Z]/.test(val)) score++;
            if (/[0-9]/.test(val)) score++;
            if (/[^A-Za-z0-9]/.test(val)) score++;

            const levels = [
                { pct: '15%',  color: '#E74C3C', label: 'Very Weak' },
                { pct: '35%',  color: '#E74C3C', label: 'Weak'      },
                { pct: '55%',  color: '#F39C12', label: 'Fair'      },
                { pct: '75%',  color: '#2D9CDB', label: 'Good'      },
                { pct: '100%', color: '#27AE60', label: 'Strong'    },
            ];
            const level = levels[Math.min(score, 4)];
            strengthFill.style.width      = level.pct;
            strengthFill.style.background = level.color;
            strengthLabel.textContent     = level.label;
            strengthLabel.style.color     = level.color;
        });
    }

    // If user is already logged in, redirect straight to the app
    if (localStorage.getItem('hc_token')) {
        window.location.href = 'index.html';
    }
});

// ─── Alert helpers ────────────────────────────────────────────────────────────
function showAlert(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${msg}`;
    el.style.display = 'flex';
}

function showSuccess(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${msg}`;
    el.style.display = 'flex';
}

function hideAlert(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    if (loading) {
        btn.dataset.original = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Please wait…';
    } else {
        btn.innerHTML = btn.dataset.original || btn.innerHTML;
    }
}

// ─── Login ────────────────────────────────────────────────────────────────────
async function handleLogin() {
    hideAlert('login-error');
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showAlert('login-error', 'Please fill in all fields.');
        return;
    }

    setLoading('btn-login', true);
    try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) {
            showAlert('login-error', data.detail || 'Login failed. Please try again.');
            return;
        }
        // Store token + user info
        localStorage.setItem('hc_token', data.token);
        localStorage.setItem('hc_user', JSON.stringify(data.user));
        window.location.href = 'index.html';
    } catch (err) {
        showAlert('login-error', 'Cannot reach server. Make sure the backend is running.');
    } finally {
        setLoading('btn-login', false);
    }
}

// ─── Register ─────────────────────────────────────────────────────────────────
async function handleRegister() {
    hideAlert('register-error');
    hideAlert('register-success');
    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    if (!name || !email || !password) {
        showAlert('register-error', 'Please fill in all fields.');
        return;
    }
    if (password.length < 6) {
        showAlert('register-error', 'Password must be at least 6 characters.');
        return;
    }

    setLoading('btn-register', true);
    try {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (!res.ok) {
            showAlert('register-error', data.detail || 'Registration failed. Please try again.');
            return;
        }
        // Auto-login after registration
        localStorage.setItem('hc_token', data.token);
        localStorage.setItem('hc_user', JSON.stringify(data.user));
        showSuccess('register-success', 'Account created! Redirecting…');
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    } catch (err) {
        showAlert('register-error', 'Cannot reach server. Make sure the backend is running.');
    } finally {
        setLoading('btn-register', false);
    }
}

// ─── Allow Enter key to submit forms ─────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const loginForm    = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');
    if (loginForm && loginForm.style.display !== 'none') handleLogin();
    else if (registerForm && registerForm.style.display !== 'none') handleRegister();
});
