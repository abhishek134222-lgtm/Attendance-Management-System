document.getElementById('start-recognition-btn').addEventListener('click', async () => {
  const resultBox = document.getElementById('result-box');
  resultBox.innerHTML = '<span style="color:#a78bfa;">Opening camera... look at screen, press Q to cancel</span>';

  try {
    const res = await fetch('/api/attendance/recognize', { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      resultBox.innerHTML = `<span style="color:#4ade80;">✓ ${data.message}</span>`;
    } else {
      resultBox.innerHTML = `<span style="color:#f87171;">${data.message}</span>`;
    }
  } catch (err) {
    resultBox.innerHTML = '<span style="color:#f87171;">Cannot connect to server</span>';
  }
});