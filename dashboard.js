const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxJIxUp_1VCNkQfSaL40v1Io5C_NAE8V8rlutBah6zaUQdXui4os9v1VnyMqb3AhjZG/exec";
let currentEditFileId = "", currentEditName = "";

// State untuk Sistem Folder
let rootFolderId = "";
let currentViewFolderId = ""; 
let folderPath = []; // Menyimpan riwayat navigasi folder

// Mencegah XSS
function escapeHTML(str) {
  return String(str).replace(/[&<>'"]/g, tag => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[tag] || tag));
}

document.addEventListener("DOMContentLoaded", () => {
  const email = localStorage.getItem("email");
  rootFolderId = localStorage.getItem("folderId");
  
  if (!email || !rootFolderId) return window.location.href = "index.html";

  // Inisiasi Path Folder Awal
  currentViewFolderId = rootFolderId;
  folderPath = [{ id: rootFolderId, name: "Root" }];
  
  // Load Profile (Email, Display Name, Avatar)
  document.getElementById("userEmail").textContent = escapeHTML(email);
  loadUserProfile(email);

  if (localStorage.getItem("darkMode") === "on") {
    document.body.classList.add("dark");
    document.getElementById("darkModeToggle").innerHTML = '<i class="fa-solid fa-sun"></i> Light';
  }

  // Drag and Drop Upload
  const drop = document.getElementById("dropArea");
  drop.addEventListener("click", () => document.getElementById("fileInput").click());
  drop.addEventListener("dragover", e => { e.preventDefault(); drop.style.borderColor = "var(--primary)"; });
  drop.addEventListener("dragleave", () => { drop.style.borderColor = "var(--gh-border)"; });
  drop.addEventListener("drop", e => {
    e.preventDefault(); drop.style.borderColor = "var(--gh-border)";
    handleUpload({ target: { files: e.dataTransfer.files } });
  });

  document.getElementById("fileInput").addEventListener("change", handleUpload);
  
  loadStats(); 
  loadFileList();
});

/* --- FUNGSI PROFIL (NAMA & AVATAR) --- */
function loadUserProfile(email) {
  const savedName = localStorage.getItem("displayName");
  const savedAvatar = localStorage.getItem("avatarData");
  
  document.getElementById("userDisplayName").textContent = savedName ? escapeHTML(savedName) : escapeHTML(email.split('@')[0]);
  
  const avatarImg = document.getElementById("userAvatar");
  if (savedAvatar) {
    avatarImg.src = savedAvatar;
  } else {
    avatarImg.src = `https://ui-avatars.com/api/?name=${escapeHTML(savedName || email)}&background=007bff&color=fff&size=200`;
  }
}

function openProfileModal() {
  document.getElementById("inputDisplayName").value = localStorage.getItem("displayName") || "";
  document.getElementById("profileModal").style.display = "flex";
}

async function saveProfile() {
  const newName = document.getElementById("inputDisplayName").value.trim();
  const fileInput = document.getElementById("inputAvatar");
  const btn = document.getElementById("btn-save-profile");
  
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;
  btn.disabled = true;

  if (newName) localStorage.setItem("displayName", newName);

  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      localStorage.setItem("avatarData", reader.result);
      finishSaveProfile();
    };
    reader.readAsDataURL(file);
  } else {
    finishSaveProfile();
  }
}

function finishSaveProfile() {
  const email = localStorage.getItem("email");
  loadUserProfile(email);
  document.getElementById("profileModal").style.display = "none";
  const btn = document.getElementById("btn-save-profile");
  btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Simpan`;
  btn.disabled = false;
  Swal.fire({icon: 'success', title: 'Profil Diperbarui', timer: 1000, showConfirmButton: false});
}

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

/* --- FUNGSI FOLDER & BREADCRUMB --- */
function renderBreadcrumb() {
  const bcArea = document.getElementById("breadcrumbArea");
  bcArea.innerHTML = "";
  folderPath.forEach((folder, index) => {
    if (index > 0) bcArea.innerHTML += ` <span>/</span> `;
    if (index === folderPath.length - 1) {
      bcArea.innerHTML += ` <span style="color: var(--gh-text); font-weight:600;"><i class="${index === 0 ? 'fa-solid fa-house' : 'fa-solid fa-folder'}"></i> ${escapeHTML(folder.name)}</span>`;
    } else {
      bcArea.innerHTML += ` <a onclick="navigateToIndex(${index})"><i class="${index === 0 ? 'fa-solid fa-house' : 'fa-solid fa-folder'}"></i> ${escapeHTML(folder.name)}</a>`;
    }
  });
}

function navigateToIndex(index) {
  folderPath = folderPath.slice(0, index + 1);
  currentViewFolderId = folderPath[folderPath.length - 1].id;
  loadFileList();
}

function navigateToRoot() { navigateToIndex(0); }

function enterFolder(id, name) {
  folderPath.push({ id: id, name: name });
  currentViewFolderId = id;
  loadFileList();
}

function openFolderModal() {
  document.getElementById("inputFolderName").value = "";
  document.getElementById("folderModal").style.display = "flex";
}

async function createFolder() {
  const name = document.getElementById("inputFolderName").value.trim();
  if(!name) return Swal.fire('Oops!', 'Nama folder tidak boleh kosong', 'warning');

  const btn = document.getElementById("btn-create-folder");
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Membuat...`; 
  btn.disabled = true;

  try {
    const form = new FormData();
    form.append("action", "createFolder"); // Perintah yang dikirim ke Apps Script
    form.append("parentFolderId", currentViewFolderId);
    form.append("folderName", escapeHTML(name));

    const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
    const result = await res.json();
    
    if(result.success) {
      Swal.fire({icon: 'success', title: 'Folder Dibuat', timer: 1500, showConfirmButton: false});
      document.getElementById("folderModal").style.display = "none";
      loadFileList(); // Refresh daftar file
    } else {
      // Jika Backend membalas 'Aksi tidak dikenal'
      if (result.message && result.message.toLowerCase().includes("tidak dikenal")) {
        Swal.fire({
          icon: 'warning',
          title: 'Sistem Belum Siap',
          html: 'Tombol ini sudah responsif, tapi <b>Google Apps Script</b> Anda belum ditambahkan kode untuk membuat folder.<br><br>Silakan tambahkan blok kode <code>createFolder</code> ke backend Anda.',
        });
      } else {
        Swal.fire('Gagal', result.message, 'error');
      }
    }
  } catch(e) { 
    Swal.fire('Error', 'Terjadi kesalahan jaringan atau koneksi terputus.', 'error'); 
  } finally { 
    btn.innerHTML = `<i class="fa-solid fa-check"></i> Buat`; 
    btn.disabled = false; 
  }
}

/* --- FUNGSI UPLOAD --- */
async function handleUpload(e) {
  const files = e.target.files;
  if(files.length === 0) return;
  const limitMB = parseInt(localStorage.getItem("limitMB") || "10");
  const currentUsage = await getCurrentUsage();
  const remaining = (limitMB * 1024 * 1024) - currentUsage;

  for(let file of files) {
    if (file.size > remaining) {
      Swal.fire('Storage Full', `File ${escapeHTML(file.name)} melebihi sisa kapasitas Anda.`, 'warning'); continue;
    }
    Swal.fire({ title: 'Mengupload...', text: escapeHTML(file.name), allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise(resolve => {
        reader.onload = async () => {
          const base64 = reader.result.split(",")[1];
          const form = new FormData();
          form.append("action", "upload"); 
          form.append("email", localStorage.getItem("email"));
          // Upload diarahkan ke Folder yang sedang dibuka (Bukan selalu root)
          form.append("folderId", currentViewFolderId); 
          form.append("fileName", escapeHTML(file.name));
          form.append("mimeType", file.type); 
          form.append("fileData", base64);

          const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
          const result = await res.json();
          if(result.success) {
            Swal.fire({icon: 'success', title: 'Berhasil diupload!', timer: 1000, showConfirmButton: false});
            loadStats(); loadFileList();
          } else Swal.fire('Error', result.message, 'error');
          resolve();
        };
      });
    } catch(err) { Swal.fire('Error', 'Koneksi jaringan gagal.', 'error'); }
  }
  // Reset input file agar bisa upload file dengan nama sama lagi
  document.getElementById("fileInput").value = "";
}

async function getCurrentUsage() {
  const form = new FormData();
  form.append("action", "stats"); form.append("folderId", rootFolderId);
  const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
  const result = await res.json(); return result.sizeBytes || 0;
}

/* --- FETCH FILE & FOLDER LIST --- */
async function loadFileList() {
  renderBreadcrumb();
  const list = document.getElementById("fileList");
  list.innerHTML = `<p style="padding: 20px; text-align: center;" class="text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Memuat workspace...</p>`;
  
  try {
    const form = new FormData();
    form.append("action", "list"); 
    // Ambil file dari dalam direktori folder saat ini
    form.append("folderId", currentViewFolderId); 
    
    const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
    const result = await res.json();
    list.innerHTML = "";

    // Tambah tombol 'Kembali' jika tidak di root
    if (folderPath.length > 1) {
      list.innerHTML += `
        <div class="gh-row is-folder" style="cursor:pointer;" onclick="navigateToIndex(${folderPath.length - 2})">
          <div style="display:flex; align-items:center; gap: 12px; font-weight:500;">
            <i class="fa-solid fa-level-up-alt" style="color: var(--gh-text-muted);"></i>
            <span>.. (Kembali)</span>
          </div>
        </div>`;
    }

    if(result.files.length === 0 && folderPath.length === 1) {
      list.innerHTML += `<p style="padding: 20px; text-align: center;" class="text-muted">Folder kosong. Tarik & Lepas file ke area ini.</p>`;
      return;
    }

    // Render Data (Folder & Files)
    result.files.forEach(file => {
      const safeName = escapeHTML(file.name);
      // Deteksi jika item adalah Folder dari mimeType backend (Google Drive folder)
      const isFolder = file.mimeType === "application/vnd.google-apps.folder" || file.type === "folder" || (!file.link && !file.name.includes("."));

      if (isFolder) {
        list.innerHTML += `
          <div class="gh-row is-folder">
            <div style="display:flex; align-items:center; gap: 12px; overflow: hidden; cursor:pointer;" onclick="enterFolder('${file.id}', '${safeName}')">
              <i class="fa-solid fa-folder" style="color: #ecc94b; font-size: 1.2em;"></i>
              <a style="color: var(--primary); font-weight: 500; text-decoration: none;">${safeName}</a>
            </div>
            <div class="actions">
              <button onclick="deleteFile('${file.id}')" class="btn-danger" title="Hapus Folder"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>`;
      } else {
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
      }
    });
  } catch(e) { 
    list.innerHTML = `<p style="padding: 20px; color: red; text-align:center;">Gagal memuat file. Pastikan koneksi aman.</p>`; 
  }
}

function isEditable(name) { return ["html", "txt", "js", "css", "json"].some(ext => name.toLowerCase().endsWith(ext)); }

function copyLink(link) {
  navigator.clipboard.writeText(link).then(() => Swal.fire({icon: 'success', title: 'URL Disalin!', showConfirmButton: false, timer: 1000}));
}

async function editFile(id, name) {
  currentEditFileId = id; currentEditName = name;
  Swal.fire({ title: 'Memuat source code...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  try {
    const res = await fetch(`${WEB_APP_URL}?action=read&id=${id}`);
    document.getElementById("editArea").value = await res.text();
    Swal.close(); document.getElementById("editModal").style.display = "flex";
  } catch(e) { Swal.fire('Error', 'Gagal memuat file.', 'error'); }
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
    if (result.success) { Swal.fire({icon: 'success', title: 'Tersimpan!', showConfirmButton: false, timer: 1000}); closeModal(); loadFileList(); }
    else throw new Error("Failed");
  } catch(e) { Swal.fire('Error', 'Gagal menyimpan perubahan.', 'error'); }
  finally { btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Commit Changes`; btn.disabled = false; }
}

async function deleteFile(fileId) {
  Swal.fire({ title: 'Hapus item ini?', text: "Tindakan ini tidak bisa dibatalkan.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#cb2431', confirmButtonText: 'Ya, Hapus!'
  }).then(async (result) => {
    if (result.isConfirmed) {
      Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      try {
        const form = new FormData(); form.append("action", "delete"); form.append("fileId", fileId);
        const res = await fetch(WEB_APP_URL, { method: "POST", body: form });
        if ((await res.json()).success) { Swal.fire('Terhapus!', '', 'success'); loadFileList(); loadStats(); }
      } catch(e) { Swal.fire('Error', 'Koneksi jaringan error.', 'error'); }
    }
  });
}

async function loadStats() {
  try {
    const form = new FormData(); form.append("action", "stats"); form.append("folderId", rootFolderId);
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
