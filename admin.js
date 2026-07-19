const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxJIxUp_1VCNkQfSaL40v1Io5C_NAE8V8rlutBah6zaUQdXui4os9v1VnyMqb3AhjZG/exec";

function escapeHTML(str) { return String(str).replace(/[&<>'"]/g, tag => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[tag] || tag)); }

document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("email") !== "admin@edyhost.com") {
    Swal.fire({ icon: 'error', title: 'Access Denied', text: 'Administrator only.', confirmButtonText: 'Back' }).then(() => { window.location.href = "index.html"; });
    return;
  }
  loadGlobalStats(); loadUsers(); loadRiwayat(); loadStoragePerUser(); loadUserChart();
});

function logout() {
  Swal.fire({ title: 'Logout?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#cb2431', confirmButtonText: 'Yes' }).then((result) => {
    if (result.isConfirmed) { localStorage.clear(); window.location.href = "index.html"; }
  });
}

function toggleTableLoading(elementId) {
  document.getElementById(elementId).innerHTML = `<div style="padding: 32px; text-align: center;" class="text-muted"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><br><br>Loading data...</div>`;
}

async function loadUsers() {
  toggleTableLoading("userTable");
  try {
    const form = new FormData(); form.append("action", "getAllUsers");
    const res = await (await fetch(WEB_APP_URL, { method: "POST", body: form })).json();
    if (!res.success) throw new Error();

    let html = `<table style="min-width: 800px;"><tr><th>Email</th><th>Role</th><th>Limit (MB)</th><th>Folder ID</th><th>Action</th></tr>`;
    res.users.forEach(user => {
      const safeEmail = escapeHTML(user.email);
      html += `<tr>
        <td><strong>${safeEmail}</strong></td>
        <td>
          <select onchange="editUser('${safeEmail}', this.value, 'type')" style="margin:0; padding:6px; width: 100px;">
            <option value="basic" ${user.type === 'basic' ? 'selected' : ''}>Basic</option>
            <option value="premium" ${user.type === 'premium' ? 'selected' : ''}>Premium</option>
          </select>
        </td>
        <td><input type="number" value="${user.limit}" onchange="editUser('${safeEmail}', this.value, 'limit')" style="width:80px; margin:0; padding:6px;"></td>
        <td><span class="text-muted" style="font-family: monospace;">${escapeHTML(user.folder)}</span></td>
        <td><button onclick="deleteUser('${safeEmail}')" class="btn-danger"><i class="fa-solid fa-trash"></i></button></td>
      </tr>`;
    });
    document.getElementById("userTable").innerHTML = html + "</table>";
  } catch(e) { document.getElementById("userTable").innerHTML = `<p style='color:red; padding: 20px;'>Failed to load.</p>`; }
}

async function editUser(originalEmail, newValue, field) {
  Swal.fire({ title: 'Applying changes...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  try {
    const form = new FormData(); form.append("action", "editUser"); form.append("originalEmail", originalEmail);
    form.append("newValue", escapeHTML(newValue)); form.append("field", field);
    const res = await (await fetch(WEB_APP_URL, { method: "POST", body: form })).json();
    Swal.fire({icon: res.success ? 'success' : 'error', title: res.message, timer: 1500, showConfirmButton: false});
    loadUsers();
  } catch(e) { Swal.fire('Error', 'Network error', 'error'); }
}

function deleteUser(email) {
  Swal.fire({ title: 'Delete user?', text: `All data for ${email} will be destroyed!`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#cb2431', confirmButtonText: 'Destroy'
  }).then(async (result) => {
    if (result.isConfirmed) {
      Swal.fire({ title: 'Destroying...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      try {
        const form = new FormData(); form.append("action", "deleteUser"); form.append("email", email);
        await fetch(WEB_APP_URL, { method: "POST", body: form });
        Swal.fire('Destroyed!', '', 'success'); loadUsers(); loadGlobalStats();
      } catch(e) { Swal.fire('Error', 'Network error', 'error'); }
    }
  });
}

async function loadRiwayat() {
  toggleTableLoading("logTable");
  const btn = document.getElementById("btn-filter");
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`; btn.disabled = true;
  
  try {
    const form = new FormData(); form.append("action", "getRiwayat");
    const start = document.getElementById("startDate").value; const end = document.getElementById("endDate").value;
    if (start) form.append("startDate", start); if (end) form.append("endDate", end);

    const res = await (await fetch(WEB_APP_URL, { method: "POST", body: form })).json();
    let html = `<table style="min-width: 700px;"><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Target</th></tr>`;
    res.logs.forEach(row => {
      html += `<tr>
        <td class="text-muted">${escapeHTML(row.tanggal)}</td>
        <td><strong>${escapeHTML(row.email)}</strong></td>
        <td><span style="border:1px solid var(--gh-border); padding: 2px 6px; border-radius:12px; font-size:12px;">${escapeHTML(row.aksi)}</span></td>
        <td style="font-family: monospace;">${escapeHTML(row.nama)}</td>
      </tr>`;
    });
    document.getElementById("logTable").innerHTML = html + "</table>";
  } catch(e) {} finally { btn.innerHTML = `<i class="fa-solid fa-filter"></i> Filter`; btn.disabled = false; }
}

async function loadGlobalStats() {
  try {
    const form = new FormData(); form.append("action", "getGlobalStats");
    const res = await (await fetch(WEB_APP_URL, { method: "POST", body: form })).json();
    document.getElementById("globalStats").innerHTML = `
      <div class="gh-box" style="margin:0; padding: 20px; border-left: 4px solid var(--primary);"><div class="text-muted">Total Users</div><h2 style="font-size:2rem;">${escapeHTML(res.totalUser)}</h2></div>
      <div class="gh-box" style="margin:0; padding: 20px; border-left: 4px solid #2ea043;"><div class="text-muted">Total Files</div><h2 style="font-size:2rem;">${escapeHTML(res.totalFile)}</h2></div>
      <div class="gh-box" style="margin:0; padding: 20px; border-left: 4px solid #a371f7;"><div class="text-muted">Total Storage</div><h2 style="font-size:2rem;">${escapeHTML(res.totalSize)}</h2></div>
    `;
  } catch(e) {}
}

async function loadStoragePerUser() {
  toggleTableLoading("userStorageStats");
  try {
    const form = new FormData(); form.append("action", "getStoragePerUser");
    const res = await (await fetch(WEB_APP_URL, { method: "POST", body: form })).json();
    let html = `<table style="min-width: 500px;"><tr><th>Repository Owner</th><th>Files</th><th>Size</th></tr>`;
    res.data.forEach(u => {
      html += `<tr><td><strong>${escapeHTML(u.email)}</strong></td><td>${escapeHTML(u.count)}</td><td style="color:var(--primary);">${escapeHTML(u.size)}</td></tr>`;
    });
    document.getElementById("userStorageStats").innerHTML = html + "</table>";
  } catch(e) {}
}

let adminChart;
async function loadUserChart() {
  try {
    const form = new FormData(); form.append("action", "getStoragePerUser");
    const res = await (await fetch(WEB_APP_URL, { method: "POST", body: form })).json();
    const labels = res.data.map(u => escapeHTML(u.email));
    const data = res.data.map(u => parseFloat(u.size.replace(/[^\d.]/g, "")) || 0);

    if (adminChart) adminChart.destroy();
    adminChart = new Chart(document.getElementById("userChart").getContext('2d'), {
      type: "bar",
      data: { labels, datasets: [{ label: "Usage (MB)", data, backgroundColor: "#007bff", borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: "#d0d7de" } }, x: { grid: { display: false } } } }
    });
  } catch(e) {}
}

async function exportExcel() {
  Swal.fire({ title: 'Preparing Data...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  try {
    const form = new FormData(); form.append("action", "exportExcel");
    const res = await (await fetch(WEB_APP_URL, { method: "POST", body: form })).json();
    Swal.fire('Success', res.message || 'Exported.', 'success');
  } catch(e) { Swal.fire('Error', 'Network failed.', 'error'); }
}
