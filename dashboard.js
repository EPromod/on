const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxJIxUp_1VCNkQfSaL40v1Io5C_NAE8V8rlutBah6zaUQdXui4os9v1VnyMqb3AhjZG/exec";

let currentEditFileId = "", currentEditName = "";

document.addEventListener("DOMContentLoaded", () => {
  const email = localStorage.getItem("email");
  const folderId = localStorage.getItem("folderId");
  if (!email || !folderId) return window.location.href = "index.html";

  document.getElementById("userEmail").textContent = email;

  // Dark Mode State
  const darkToggle = document.getElementById("darkModeToggle");
  if (localStorage.getItem("darkMode") === "on") {
    document.body.classList.add("dark");
    darkToggle.textContent = "☀️ Light Mode";
  }

  // Drag & Drop Upload
  const drop = document.getElementById("dropArea");
  drop.addEventListener("click", () => document.getElementById("fileInput").click());
  drop.addEventListener("dragover", e => {
    e.preventDefault();
    drop.style.borderColor = "#007bff";
  });
  drop.addEventListener("dragleave", () => {
    drop.style.borderColor = "#aaa";
  });
  drop.addEventListener("drop", e => {
    e.preventDefault();
    drop.style.borderColor = "#aaa";
    handleUpload({ target: { files: e.dataTransfer.files } });
  });

  document.getElementById("fileInput").addEventListener("change", handleUpload);

  loadStats();
  loadFileList();
});

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

function toggleDarkMode() {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  localStorage.setItem("darkMode", dark ? "on" : "off");
  document.getElementById("darkModeToggle").textContent = dark ? "☀️ Light Mode" : "🌙 Dark Mode";
}

async function handleUpload(e) {
  const files = e.target.files;
  const limitMB = parseInt(localStorage.getItem("limitMB") || "10");
  const currentUsage = await getCurrentUsage();
  const remaining = (limitMB * 1024 * 1024) - currentUsage;

  const paths = [];

  for (const file of files) {
    if (file.size > remaining) {
      alert(`File ${file.name} melebihi batas penyimpanan.`);
      continue;
    }

    const path = file.webkitRelativePath || file.name; // Dapatkan path relatif
    paths.push(path);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(",")[1];
      const form = new FormData();
      form.append("action", "upload");
      form.append("email", localStorage.getItem("email"));
      form.append("folderId", localStorage.getItem("folderId"));
      form.append("fileName", path); // path relatif!
      form.append("mimeType", file.type);
      form.append("fileData", base64);

      const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
      const result = await res.json();
      if (!result.success) alert(result.message);
    };
    reader.readAsDataURL(file);
  }

  alert("Semua file dari folder telah diunggah.");
  loadStats();
  loadFileList();
}


async function getCurrentUsage() {
  const form = new FormData();
  form.append("action", "stats");
  form.append("folderId", localStorage.getItem("folderId"));

  const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
  const result = await res.json();
  return result.sizeBytes || 0;
}

async function loadFileList() {
  const form = new FormData();
  form.append("action", "list");
  form.append("folderId", localStorage.getItem("folderId"));

  const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
  const result = await res.json();
  const list = document.getElementById("fileList");
  list.innerHTML = "";

  result.files.forEach(file => {
    const isIndex = file.name.toLowerCase().endsWith("index.html");
    const div = document.createElement("div");
    div.className = "file-card";
    div.innerHTML = `
      <strong>${file.name}${isIndex ? " 🏠" : ""}</strong>
      <div class="file-actions">
        <a href="${file.link}" target="_blank">${isIndex ? "🏠" : "🔗"}</a>
        <button onclick="copyLink('${file.link}')">📋</button>
        ${isEditable(file.name) ? `<button onclick="editFile('${file.id}', '${file.name}')">✏️</button>` : ""}
        <button onclick="showQR('${file.link}')">📱</button>
        <button onclick="deleteFile('${file.id}')">🗑️</button>
      </div>`;
    list.appendChild(div);
  });
  
}

function isEditable(name) {
  return ["html", "txt", "js", "css", "json"].some(ext => name.toLowerCase().endsWith(ext));
}

function copyLink(link) {
  navigator.clipboard.writeText(link).then(() => {
    alert("Link disalin!");
  });
}

async function editFile(id, name) {
  currentEditFileId = id;
  currentEditName = name;
  const res = await fetch(`${WEB_APP_URL}?action=read&id=${id}`);
  const content = await res.text();
  document.getElementById("editArea").value = content;
  document.getElementById("editModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("editModal").style.display = "none";
}

async function saveEdit() {
  const form = new FormData();
  form.append("action", "save");
  form.append("fileId", currentEditFileId);
  form.append("fileName", currentEditName);
  form.append("content", document.getElementById("editArea").value);

  const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
  const result = await res.json();
  if (result.success) {
    alert("Disimpan!");
    closeModal();
    loadFileList();
  } else {
    alert("Gagal menyimpan.");
  }
}

async function deleteFile(fileId) {
  const form = new FormData();
  form.append("action", "delete");
  form.append("fileId", fileId);
  const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
  const result = await res.json();
  if (result.success) {
    loadFileList();
    loadStats();
  }
}

async function loadStats() {
  const form = new FormData();
  form.append("action", "stats");
  form.append("folderId", localStorage.getItem("folderId"));

  const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
  const result = await res.json();
  document.getElementById("fileCount").textContent = result.count;
  document.getElementById("fileSize").textContent = result.size;
}

function showQR(link) {
  document.getElementById("qrModal").style.display = "flex";
  const canvas = document.getElementById("qrCanvas");
  QRCode.toCanvas(canvas, link, { width: 200 }, function (error) {
    if (error) console.error(error);
  });
}

function closeQR() {
  document.getElementById("qrModal").style.display = "none";
}
