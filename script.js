const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxJIxUp_1VCNkQfSaL40v1Io5C_NAE8V8rlutBah6zaUQdXui4os9v1VnyMqb3AhjZG/exec";

function switchForm(type) {
  document.getElementById("loginForm").style.display = type === "login" ? "block" : "none";
  document.getElementById("registerForm").style.display = type === "register" ? "block" : "none";
  document.getElementById("resetForm").style.display = type === "reset" ? "block" : "none";
  document.getElementById("statusMessage").textContent = "";
}

async function register() {
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;

  const form = new FormData();
  form.append("action", "register");
  form.append("email", email);
  form.append("password", password);

  const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
  const result = await res.json();

  document.getElementById("statusMessage").textContent = result.message;
  if (result.success) switchForm("login");
}

async function login() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const form = new FormData();
  form.append("action", "login");
  form.append("email", email);
  form.append("password", password);

  const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
  const result = await res.json();

  if (result.success) {
    localStorage.setItem("email", email);
    localStorage.setItem("folderId", result.folderId || "");
    localStorage.setItem("userType", result.type || "basic");
    localStorage.setItem("limitMB", result.limit || 10);

    if (email === "admin@edyhost.com") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "dashboard.html";
    }
  } else {
    document.getElementById("statusMessage").textContent = result.message;
  }
}

async function resetPassword() {
  const email = document.getElementById("resetEmail").value.trim();
  const form = new FormData();
  form.append("action", "reset");
  form.append("email", email);

  const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
  const result = await res.json();

  document.getElementById("statusMessage").textContent = result.message;
  if (result.success) switchForm("login");
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log("✅ Service Worker Terdaftar"))
    .catch(err => console.error("❌ Gagal Daftar SW", err));
}
