let stream = null;
let scanTimer = null;
let scanInProgress = false;

const video = document.getElementById('camera-video');
const canvas = document.getElementById('camera-canvas');
const startButton = document.getElementById('start-camera-btn');
const stopButton = document.getElementById('stop-camera-btn');
const resultBox = document.getElementById('result-box');
const statusBox = document.getElementById('camera-status');
const recognitionList = document.getElementById('recognition-list');
const subjectInput = document.getElementById('camera-subject');

function setStatus(text, active = false) {
  statusBox.innerHTML = `<span class="${active ? 'is-live' : ''}"></span> ${text}`;
}

function stopCamera() {
  window.clearInterval(scanTimer);
  scanTimer = null;
  if (stream) stream.getTracks().forEach((track) => track.stop());
  stream = null;
  video.srcObject = null;
  video.classList.remove('is-active');
  startButton.style.display = 'block';
  stopButton.style.display = 'none';
  setStatus('Camera offline');
  resultBox.textContent = 'Live scanning paused.';
}

async function scanFrame() {
  if (scanInProgress || !stream || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
  scanInProgress = true;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  try {
    const response = await fetch('/api/attendance/recognize', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: canvas.toDataURL('image/jpeg', 0.76), subject: subjectInput.value.trim() })
    });
    const data = await response.json();
    if (data.success) {
      resultBox.className = 'result-box success';
      resultBox.textContent = data.message;
      recognitionList.innerHTML = data.students.map((student) => `<div class="recognition-chip">✓ ${student.name}<small>Roll ${student.roll_no}</small></div>`).join('');
    } else if (data.message !== 'No registered faces recognized' && data.message !== 'No face detected in captured image') {
      resultBox.className = 'result-box warning';
      resultBox.textContent = data.message;
    }
  } catch (error) {
    resultBox.className = 'result-box warning';
    resultBox.textContent = 'Connection to the scanner was lost.';
  } finally { scanInProgress = false; }
}

startButton.addEventListener('click', async () => {
  if (!subjectInput.value.trim()) {
    showToast('Please enter a subject name', 'error');
    subjectInput.focus();
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    video.srcObject = stream;
    video.classList.add('is-active');
    startButton.style.display = 'none';
    stopButton.style.display = 'block';
    setStatus('Live scan active', true);
    resultBox.className = 'result-box';
    resultBox.textContent = 'Looking for registered faces…';
    await video.play();
    scanFrame();
    scanTimer = window.setInterval(scanFrame, 1400);
  } catch (error) {
    resultBox.className = 'result-box warning';
    resultBox.textContent = 'Camera access was denied or is unavailable.';
  }
});

stopButton.addEventListener('click', stopCamera);
window.addEventListener('beforeunload', stopCamera);
