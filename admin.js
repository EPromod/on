const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxJIxUp_1VCNkQfSaL40v1Io5C_NAE8V8rlutBah6zaUQdXui4os9v1VnyMqb3AhjZG/exec";

document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("email") !== "admin@edyhost.com") {
    alert("Akses ditolak."); window.location.href = "index.html";
    return;
  }

  loadUsers();
  loadRiwayat();
  loadGlobalStats();
  loadStoragePerUser();
  loadUserChart();
});

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

function loadUsers() {
  const form = new FormData();
  form.append("action", "getAllUsers");

  fetch(WEB_APP_URL, { method: "POST", body: form })
    .then(r => r.json())
    .then(res => {
      const div = document.getElementById("userTable");
      if (!res.success) return div.innerHTML = "Gagal memuat data.";

      let html = `<table><tr><th>Email</th><th>Tipe</th><th>Limit (MB)</th><th>Folder ID</th><th>Aksi</th></tr>`;
      res.users.forEach(user => {
        html += `<tr>
          <td><input value="${user.email}" onchange="editUser('${user.email}', this.value, 'email')"></td>
          <td>
            <select onchange="editUser('${user.email}', this.value, 'type')">
              <option value="basic" ${user.type === 'basic' ? 'selected' : ''}>basic</option>
              <option value="premium" ${user.type === 'premium' ? 'selected' : ''}>premium</option>
            </select>
          </td>
          <td><input type="number" value="${user.limit}" onchange="editUser('${user.email}', this.value, 'limit')" style="width:70px"></td>
          <td>${user.folder}</td>
          <td><button onclick="deleteUser('${user.email}')">❌ Hapus</button></td>
        </tr>`;
      });
      html += "</table>";
      div.innerHTML = html;
    });
}

function editUser(originalEmail, newValue, field) {
  const form = new FormData();
  form.append("action", "editUser");
  form.append("originalEmail", originalEmail);
  form.append("newValue", newValue);
  form.append("field", field);

  fetch(WEB_APP_URL, { method: "POST", body: form })
    .then(r => r.json())
    .then(r => { alert(r.message); loadUsers(); });
}

function deleteUser(email) {
  if (!confirm("Hapus user ini?")) return;

  const form = new FormData();
  form.append("action", "deleteUser");
  form.append("email", email);

  fetch(WEB_APP_URL, { method: "POST", body: form })
    .then(r => r.json())
    .then(r => { alert(r.message); loadUsers(); });
}

function loadRiwayat() {
  const form = new FormData();
  form.append("action", "getRiwayat");
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;
  if (start) form.append("startDate", start);
  if (end) form.append("endDate", end);

  fetch(WEB_APP_URL, { method: "POST", body: form })
    .then(r => r.json())
    .then(res => {
      const div = document.getElementById("logTable");
      if (!res.success) return div.innerHTML = "Gagal muat riwayat.";

      let html = `<table><tr><th>Email</th><th>Aksi</th><th>File</th><th>Waktu</th></tr>`;
      res.logs.forEach(row => {
        html += `<tr><td>${row.email}</td><td>${row.aksi}</td><td>${row.nama}</td><td>${row.tanggal}</td></tr>`;
      });
      html += `</table>`;
      div.innerHTML = html;
    });
}

function loadGlobalStats() {
  const form = new FormData();
  form.append("action", "getGlobalStats");

  fetch(WEB_APP_URL, { method: "POST", body: form })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        document.getElementById("globalStats").innerHTML = `
          <p>Total User: <strong>${res.totalUser}</strong></p>
          <p>Total File: <strong>${res.totalFile}</strong></p>
          <p>Total Ukuran: <strong>${res.totalSize}</strong></p>`;
      }
    });
}

function loadStoragePerUser() {
  const form = new FormData();
  form.append("action", "getStoragePerUser");

  fetch(WEB_APP_URL, { method: "POST", body: form })
    .then(r => r.json())
    .then(res => {
      const div = document.getElementById("userStorageStats");
      if (!res.success) return div.innerHTML = "Gagal memuat statistik user.";

      let html = `<table><tr><th>Email</th><th>Jumlah File</th><thUkuran</th></tr>`;
      res.data.forEach(u => {
        html += `<tr><td>${u.email}</td><td>${u.count}</td><td>${u.size}</td></tr>`;
      });
      html += "</table>";
      div.innerHTML = html;
    });
}

function loadUserChart() {
  const form = new FormData();
  form.append("action", "getStoragePerUser");

  fetch(WEB_APP_URL, { method: "POST", body: form })
    .then(r => r.json())
    .then(res => {
      const labels = res.data.map(u => u.email);
      const data = res.data.map(u => parseFloat(u.size.replace(/[^\d.]/g, "")));

      new Chart(document.getElementById("userChart"), {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "Storage (MB)",
            data,
            backgroundColor: "#007bff"
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: "Grafik Penggunaan Storage"
            }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    });
}

function exportExcel() {
  const form = new FormData();
  form.append("action", "exportExcel");

  fetch(WEB_APP_URL, { method: "POST", body: form })
    .then(r => r.json())
    .then(r => alert(r.message));
}
