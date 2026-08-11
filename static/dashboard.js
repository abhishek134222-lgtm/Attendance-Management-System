async function loadDashboard() {
  try {
    const studentsRes = await fetch('/api/students');
    const students = await studentsRes.json();
    document.getElementById('total-students').textContent = students.length;

    const today = new Date().toISOString().split('T')[0];
    const attRes = await fetch(`/api/attendance/date/${today}`);
    const attendance = await attRes.json();

    const present = attendance.filter(a => a.status === 'Present').length;
    const absent = attendance.filter(a => a.status === 'Absent').length;
    document.getElementById('present-today').textContent = present;
    document.getElementById('absent-today').textContent = absent;

    const tbody = document.getElementById('today-table-body');
    tbody.innerHTML = '';

    if (attendance.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:rgba(255,255,255,0.4); padding:30px;">No attendance marked today yet</td></tr>';
      return;
    }

    attendance.forEach(row => {
      const color = row.status === 'Present' ? '#4ade80' : '#f87171';
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${row.roll_no}</td><td>${row.name}</td><td>${row.class}</td><td>${row.subject}</td><td style="color:${color}; font-weight:600;">${row.status}</td>`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}
loadDashboard();
