let allStudents = [];

async function loadStudents() {
  try {
    const res = await fetch('/api/students');
    allStudents = await res.json();
    populateClassFilter();
    renderStudents(allStudents);
  } catch (err) {
    console.error(err);
  }
}

function populateClassFilter() {
  const filterEl = document.getElementById('class-filter');
  if (!filterEl) return;

  const classes = [...new Set(allStudents.map(s => s.class))].sort();
  const currentValue = filterEl.value;
  filterEl.innerHTML = '<option value="">All Classes</option>';
  classes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    filterEl.appendChild(opt);
  });
  filterEl.value = currentValue;
}

function renderStudents(students) {
  const tbody = document.getElementById('students-table-body');
  tbody.innerHTML = '';

  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:rgba(255,255,255,0.4); padding:30px;">No students found</td></tr>';
    return;
  }

  students.forEach(s => {
    const tr = document.createElement('tr');
    const badge = s.trained ? '<span class="badge yes">Yes</span>' : '<span class="badge no">No</span>';
    tr.innerHTML = `
      <td>${s.roll_no}</td>
      <td>${s.name}</td>
      <td>${s.class}</td>
      <td>${badge}</td>
      <td>
        <button class="btn-small" onclick="captureFace(${s.id})">Register Face</button>
        <button class="btn-danger" onclick="deleteStudent(${s.id})">Remove</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('class-filter')?.addEventListener('change', (e) => {
  const selected = e.target.value;
  const filtered = selected ? allStudents.filter(s => s.class === selected) : allStudents;
  renderStudents(filtered);
});

document.getElementById('add-student-btn').addEventListener('click', async () => {
  const name = document.getElementById('student-name').value.trim();
  const roll_no = document.getElementById('student-roll').value.trim();
  const className = document.getElementById('student-class').value.trim();

  if (!name || !roll_no || !className) {
    showToast('Please fill all fields', 'error');
    return;
  }

  try {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, roll_no, class: className })
    });
    const data = await res.json();

    if (res.ok) {
      document.getElementById('student-name').value = '';
      document.getElementById('student-roll').value = '';
      document.getElementById('student-class').value = '';
      loadStudents();
      showToast('Student added');
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Cannot connect to server', 'error');
  }
});

async function captureFace(id) {
  showToast('Camera opening... Press SPACE to capture, Q to finish', 'success');
  try {
    const res = await fetch(`/api/students/${id}/capture`, { method: 'POST' });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    loadStudents();
  } catch (err) {
    showToast('Failed to capture face', 'error');
  }
}

async function deleteStudent(id) {
  if (!confirm('Remove this student?')) return;
  try {
    await fetch(`/api/students/${id}`, { method: 'DELETE' });
    loadStudents();
  } catch (err) {
    showToast('Failed to delete student', 'error');
  }
}

loadStudents();