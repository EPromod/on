const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxJIxUp_1VCNkQfSaL40v1Io5C_NAE8V8rlutBah6zaUQdXui4os9v1VnyMqb3AhjZG/exec";
let currentEditFileId = "", currentEditName = "";

function escapeHTML(str) {
  return String(str).replace(/[&<>'"]/g, tag => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[tag] || tag));
}

document.addEventListener("DOMContentLoaded", () => {
  const email = localStorage.getItem("email");
  const folderId = localStorage.getItem("folderId");
  if (!email || !folderId) return window.location.href = "index.html";

  document.getElementById("userEmail").textContent = escapeHTML(email);
  document.querySelector('img[alt="Avatar"]').src = `https://ui-avatars.com/api/?name=${escapeHTML(email)}&background=007bff&color=fff&size=200`;

  if (localStorage.getItem("darkMode") === "on") {
    document.body.classList.add("dark");
    document.getElementById("darkModeToggle").innerHTML = '<i class="fa-solid fa-sun"></i> Light';
  }

  const drop = document.getElementById("dropArea");
  drop.addEventListener("click", () => document.getElementById("fileInput").click());
  drop.addEventListener("dragover", e => { e.preventDefault(); drop.style.borderColor = "var(--primary)"; });
  drop.addEventListener("dragleave", () => { drop.style.borderColor = "var(--gh-border)"; });
  drop.addEventListener("drop", e => {
    e.preventDefault(); drop.style.borderColor = "var(--gh-border)";
    handleUpload({ target: { files: e.dataTransfer.files } });
  });

  document.getElementById("fileInput").addEventListener("change", handleUpload);
  loadStats(); loadFileList();
});

function logout() {
  Swal.fire({ title: 'Logout?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes' }).then((r) => {
    if (r.isConfirmed) { localStorage.clear(); window.location.href = "index.html"; }
  });
}

function toggleDarkMode() {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  localStorage.setItem("darkMode", dark ? "on" : "off");
  document.getElementById("darkModeToggle").innerHTML = dark ? '<i class="fa-solid fa-sun"></i> Light' : '<i class="fa-solid fa-moon"></i> Dark';
}

async function handleUpload(e) {
  const files = e.target.files;
  if(files.length === 0) return;
  const limitMB = parseInt(localStorage.getItem("limitMB") || "10");
  const currentUsage = await getCurrentUsage();
  const remaining = (limitMB * 1024 * 1024) - currentUsage;

  for(let file of files) {
    if (file.size > remaining) {
      Swal.fire('Storage Full', `File ${escapeHTML(file.name)} exceeds your limit.`, 'warning'); continue;
    }
    Swal.fire({ title: 'Uploading...', text: escapeHTML(file.name), allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise(resolve => {
        reader.onload = async () => {
          const base64 = reader.result.split(",")[1];
          const form = new FormData();
          form.append("action", "upload"); form.append("email", localStorage.getItem("email"));
          form.append("folderId", localStorage.getItem("folderId")); form.append("fileName", escapeHTML(file.name));
          form.append("mimeType", file.type); form.append("fileData", base64);

          const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
          const result = await res.json();
          if(result.success) {
            Swal.fire({icon: 'success', title: 'Uploaded!', timer: 1000, showConfirmButton: false});
            loadStats(); loadFileList();
          } else Swal.fire('Error', result.message, 'error');
          resolve();
        };
      });
    } catch(err) { Swal.fire('Error', 'Network connection failed.', 'error'); }
  }
}

async function getCurrentUsage() {
  const form = new FormData();
  form.append("action", "stats"); form.append("folderId", localStorage.getItem("folderId"));
  const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
  const result = await res.json(); return result.sizeBytes || 0;
}

async function loadFileList() {
  const list = document.getElementById("fileList");
  list.innerHTML = `<p style="padding: 20px; text-align: center;" class="text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Fetching repository...</p>`;
  try {
    const form = new FormData();
    form.append("action", "list"); form.append("folderId", localStorage.getItem("folderId"));
    const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
    const result = await res.json();
    list.innerHTML = "";

    if(result.files.length === 0) return list.innerHTML = `<p style="padding: 20px; text-align: center;" class="text-muted">No files found. Drag & Drop to upload.</p>`;

    result.files.forEach(file => {
      const safeName = escapeHTML(file.name);
      list.innerHTML += `
        <div class="gh-row">
          <div style="display:flex; align-items:center; gap: 12px; overflow: hidden;">
            <i class="fa-solid fa-file-code" style="color: var(--gh-text-muted);"></i>
            <a href="${file.link}" target="_blank" style="color: var(--primary); font-weight: 500; text-decoration: none;">${safeName}</a>
          </div>
          <div class="actions">
            <button onclick="copyLink('${file.link}')" title="Copy URL"><i class="fa-regular fa-copy"></i></button>
            ${isEditable(file.name) ? `<button onclick="editFile('${file.id}', '${safeName}')" title="Edit Code"><i class="fa-solid fa-pen"></i></button>` : ""}
            <button onclick="showQR('${file.link}')" title="QR Code"><i class="fa-solid fa-qrcode"></i></button>
            <button onclick="deleteFile('${file.id}')" class="btn-danger" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`;
    });
  } catch(e) { list.innerHTML = `<p style="padding: 20px; color: red;">Failed to load files.</p>`; }
}

function isEditable(name) { return ["html", "txt", "js", "css", "json"].some(ext => name.toLowerCase().endsWith(ext)); }

function copyLink(link) {
  navigator.clipboard.writeText(link).then(() => Swal.fire({icon: 'success', title: 'Copied to clipboard!', showConfirmButton: false, timer: 1000}));
}

async function editFile(id, name) {
  currentEditFileId = id; currentEditName = name;
  Swal.fire({ title: 'Fetching source...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  try {
    const res = await fetch(`${WEB_APP_URL}?action=read&id=${id}`);
    document.getElementById("editArea").value = await res.text();
    Swal.close(); document.getElementById("editModal").style.display = "flex";
  } catch(e) { Swal.fire('Error', 'Failed to fetch file.', 'error'); }
}
function closeModal() { document.getElementById("editModal").style.display = "none"; }

async function saveEdit() {
  const btn = document.getElementById('btn-save');
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Committing...`; btn.disabled = true;
  try {
    const form = new FormData();
    form.append("action", "save"); form.append("fileId", currentEditFileId);
    form.append("fileName", currentEditName); form.append("content", document.getElementById("editArea").value);
    const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
    const result = await res.json();
    if (result.success) { Swal.fire({icon: 'success', title: 'Committed!', showConfirmButton: false, timer: 1000}); closeModal(); loadFileList(); }
    else throw new Error("Failed");
  } catch(e) { Swal.fire('Error', 'Failed to save changes.', 'error'); }
  finally { btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Commit Changes`; btn.disabled = false; }
}

async function deleteFile(fileId) {
  Swal.fire({ title: 'Delete this file?', text: "This action cannot be undone.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#cb2431', confirmButtonText: 'Yes, delete it!'
  }).then(async (result) => {
    if (result.isConfirmed) {
      Swal.fire({ title: 'Deleting...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      try {
        const form = new FormData(); form.append("action", "delete"); form.append("fileId", fileId);
        const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
        if ((await res.json()).success) { Swal.fire('Deleted!', '', 'success'); loadFileList(); loadStats(); }
      } catch(e) { Swal.fire('Error', 'Network error.', 'error'); }
    }
  });
}

async function loadStats() {
  try {
    const form = new FormData(); form.append("action", "stats"); form.append("folderId", localStorage.getItem("folderId"));
    const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
    const result = await res.json();
    document.getElementById("fileCount").textContent = result.count; document.getElementById("fileSize").textContent = result.size;
  } catch(e) {}
}

function showQR(link) {
  document.getElementById("qrModal").style.display = "flex";
  QRCode.toCanvas(document.getElementById("qrCanvas"), link, { width: 220, margin: 1 });
}
function closeQR() { document.getElementById("qrModal").style.display = "none"; }
