const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxJIxUp_1VCNkQfSaL40v1Io5C_NAE8V8rlutBah6zaUQdXui4os9v1VnyMqb3AhjZG/exec";

// Security: Prevent XSS
function escapeHTML(str) {
  return String(str).replace(/[&<>'"]/g, tag => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[tag] || tag));
}

function switchForm(type) {
  document.getElementById("loginForm").style.display = type === "login" ? "block" : "none";
  document.getElementById("registerForm").style.display = type === "register" ? "block" : "none";
  document.getElementById("resetForm").style.display = type === "reset" ? "block" : "none";
}

// Security: Button State Handler to prevent double submission (Spam)
function toggleButton(btnId, isLoading, text) {
  const btn = document.getElementById(btnId);
  if (isLoading) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;
  } else {
    btn.disabled = false;
    btn.innerHTML = text;
  }
}

async function register() {
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  if(!email || !password) return Swal.fire('Error', 'Harap isi email dan password', 'error');

  toggleButton('btn-register', true);
  try {
    const form = new FormData();
    form.append("action", "register"); form.append("email", escapeHTML(email)); form.append("password", password);
    const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
    const result = await res.json();
    if (result.success) {
      Swal.fire('Sukses', result.message, 'success');
      switchForm("login");
    } else throw new Error(result.message);
  } catch(e) { Swal.fire('Gagal', e.message || 'Terjadi kesalahan sistem', 'error'); }
  finally { toggleButton('btn-register', false, `<i class="fa-solid fa-user-plus"></i> Sign Up`); }
}

async function login() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  if(!email || !password) return Swal.fire('Error', 'Harap isi email dan password', 'error');

  toggleButton('btn-login', true);
  try {
    const form = new FormData();
    form.append("action", "login"); form.append("email", escapeHTML(email)); form.append("password", password);
    const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
    const result = await res.json();
    if (result.success) {
      localStorage.setItem("email", escapeHTML(email));
      localStorage.setItem("folderId", escapeHTML(result.folderId || ""));
      localStorage.setItem("userType", escapeHTML(result.type || "basic"));
      localStorage.setItem("limitMB", result.limit || 10);
      Swal.fire({ title: 'Welcome!', icon: 'success', timer: 1000, showConfirmButton: false }).then(() => {
        window.location.href = email === "admin@edyhost.com" ? "admin.html" : "dashboard.html";
      });
    } else throw new Error(result.message);
  } catch(e) { Swal.fire('Gagal', e.message || 'Terjadi kesalahan sistem', 'error'); }
  finally { toggleButton('btn-login', false, `<i class="fa-solid fa-right-to-bracket"></i> Sign In`); }
}

async function resetPassword() {
  const email = document.getElementById("resetEmail").value.trim();
  if(!email) return Swal.fire('Error', 'Harap isi email', 'error');

  toggleButton('btn-reset', true);
  try {
    const form = new FormData();
    form.append("action", "reset"); form.append("email", escapeHTML(email));
    const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
    const result = await res.json();
    if (result.success) {
      Swal.fire('Sukses', result.message, 'success'); switchForm("login");
    } else throw new Error(result.message);
  } catch(e) { Swal.fire('Gagal', e.message || 'Terjadi kesalahan sistem', 'error'); }
  finally { toggleButton('btn-reset', false, `<i class="fa-solid fa-key"></i> Reset Password`); }
}
