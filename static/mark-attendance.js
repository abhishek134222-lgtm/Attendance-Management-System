let studentsList = [];
let statusMap = {};

const dateInput = document.getElementById('attendance-date');
dateInput.value = new Date().toISOString().split('T')[0];

async function loadStudents() {
  try {
    const res = await fetch('/api/students');
    studentsList = await res.json();
    studentsList.forEach(s => statusMap[s.id] = 'Present');
    renderTable();
  } catch (err) {
    console.error(err);
  }
}

function renderTable() {
  const tbody = document.getElementById('mark-table-body');
  tbody.innerHTML = '';

  studentsList.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.roll_no}</td>
      <td>${s.name}</td>
      <td>${s.class}</td>
      <td>
        <div class="status-toggle">
          <button class="status-btn present ${statusMap[s.id]==='Present'?'active':''}" data-id="${s.id}" data-status="Present">Present</button>
          <button class="status-btn absent ${statusMap[s.id]==='Absent'?'active':''}" data-id="${s.id}" data-status="Absent">Absent</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      statusMap[btn.dataset.id] = btn.dataset.status;
      renderTable();
    });
  });
}

document.getElementById('save-attendance-btn').addEventListener('click', async () => {
  const date = dateInput.value;
  const records = Object.keys(statusMap).map(id => ({ student_id: id, status: statusMap[id] }));

  try {
    const res = await fetch('/api/attendance/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, records })
    });
    if (res.ok) showToast('Attendance saved successfully!');
  } catch (err) {
    showToast('Failed to save attendance', 'error');
  }
});

loadStudents();