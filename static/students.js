let allStudents = [];
let stream = null;
let currentStudentId = null;
let captureCount = 0;

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
        <button class="btn-small" onclick="openCameraModal(${s.id}, '${s.name.replace(/'/g, "\\'")}')">Register Face</button>
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

async function openCameraModal(studentId, studentName) {
  currentStudentId = studentId;
  captureCount = 0;
  document.getElementById('camera-title').textContent = `Register Face - ${studentName}`;
  document.getElementById('capture-count').textContent = '0 photos captured';
  document.getElementById('camera-status').textContent = '';
  document.getElementById('camera-modal').style.display = 'flex';

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    document.getElementById('camera-video').srcObject = stream;
  } catch (err) {
    showToast('Camera access denied or unavailable', 'error');
    closeCameraModal();
  }
}

function closeCameraModal() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  document.getElementById('camera-modal').style.display = 'none';
  loadStudents();
}

document.getElementById('capture-btn').addEventListener('click', async () => {
  const video = document.getElementById('camera-video');
  const canvas = document.getElementById('camera-canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  const imageData = canvas.toDataURL('image/jpeg', 0.8);

  document.getElementById('camera-status').textContent = 'Processing...';

  try {
    const res = await fetch(`/api/students/${currentStudentId}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageData })
    });
    const data = await res.json();

    if (data.success) {
      captureCount = data.count;
      document.getElementById('capture-count').textContent = `${captureCount} photos captured`;
      document.getElementById('camera-status').textContent = 'Photo captured successfully';
      document.getElementById('camera-status').style.color = '#4ade80';
    } else {
      document.getElementById('camera-status').textContent = data.message;
      document.getElementById('camera-status').style.color = '#f87171';
    }
  } catch (err) {
    document.getElementById('camera-status').textContent = 'Failed to capture. Try again.';
    document.getElementById('camera-status').style.color = '#f87171';
  }
});

document.getElementById('close-camera-btn').addEventListener('click', closeCameraModal);

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