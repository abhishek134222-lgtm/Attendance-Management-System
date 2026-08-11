async function loadReport() {
  try {
    const subject = document.getElementById('report-subject').value.trim();
    const params = subject ? `?subject=${encodeURIComponent(subject)}` : '';
    const res = await fetch(`/api/attendance/report${params}`);
    const report = await res.json();
    const tbody = document.getElementById('report-table-body');
    tbody.innerHTML = '';

    report.forEach(r => {
      const pct = r.percentage || 0;
      let color = '#4ade80';
      if (pct < 75) color = '#f87171';
      else if (pct < 90) color = '#fbbf24';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.roll_no}</td>
        <td>${r.name}</td>
        <td>${r.class}</td>
        <td>${r.present_days || 0}</td>
        <td>${r.total_days || 0}</td>
        <td style="color:${color}; font-weight:600;">${pct}%</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}
loadReport();

let reportFilterTimer;
document.getElementById('report-subject').addEventListener('input', () => {
  clearTimeout(reportFilterTimer);
  reportFilterTimer = setTimeout(loadReport, 250);
});
