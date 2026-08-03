let stream = null;

document.getElementById('start-camera-btn').addEventListener('click', async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    const video = document.getElementById('camera-video');
    video.srcObject = stream;
    video.style.display = 'block';
    document.getElementById('start-camera-btn').style.display = 'none';
    document.getElementById('scan-btn').style.display = 'inline-block';
  } catch (err) {
    document.getElementById('result-box').innerHTML = '<span style="color:#f87171;">Camera access denied or unavailable</span>';
  }
});

document.getElementById('scan-btn').addEventListener('click', async () => {
  const video = document.getElementById('camera-video');
  const canvas = document.getElementById('camera-canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  const imageData = canvas.toDataURL('image/jpeg', 0.8);

  const resultBox = document.getElementById('result-box');
  resultBox.innerHTML = '<span style="color:#a78bfa;">Scanning...</span>';

  try {
    const res = await fetch('/api/attendance/recognize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageData })
    });
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