let stream = null;
let scanTimer = null;
let scanInProgress = false;
let facingMode = 'user';

const video = document.getElementById('camera-video');
const captureCanvas = document.getElementById('camera-canvas');
const stage = document.querySelector('.camera-stage');
const startButton = document.getElementById('start-camera-btn');
const stopButton = document.getElementById('stop-camera-btn');
const switchButton = document.getElementById('switch-camera-btn');
const resultBox = document.getElementById('result-box');
const statusBox = document.getElementById('camera-status');
const recognitionList = document.getElementById('recognition-list');
const subjectInput = document.getElementById('camera-subject');

function setStatus(text, active = false) {
  statusBox.innerHTML = `<span class="${active ? 'is-live' : ''}"></span> ${text}`;
}

function setCameraControls(isLive) {
  startButton.hidden = isLive;
  stopButton.hidden = !isLive;
  switchButton.hidden = !isLive;
  stage.classList.toggle('is-live', isLive);
}

function stopCamera(message = 'Live scanning paused.') {
  window.clearInterval(scanTimer);
  scanTimer = null;
  scanInProgress = false;
  if (stream) stream.getTracks().forEach((track) => track.stop());
  stream = null;
  video.srcObject = null;
  video.classList.remove('is-active');
  video.classList.remove('is-rear-camera');
  setCameraControls(false);
  setStatus('Camera offline');
  resultBox.className = 'result-box';
  resultBox.textContent = message;
}

function cameraErrorMessage(error) {
  if (!window.isSecureContext) return 'Camera access requires HTTPS (or localhost). Open this site securely on your phone.';
  if (error?.name === 'NotAllowedError') return 'Camera permission was denied. Allow camera access in your browser settings and try again.';
  if (error?.name === 'NotFoundError') return 'No camera was found on this device.';
  if (error?.name === 'NotReadableError') return 'Your camera is being used by another app. Close it and try again.';
  return 'Camera access is unavailable. Please try again.';
}

async function requestCamera() {
  const preferred = { video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };
  try {
    return await navigator.mediaDevices.getUserMedia(preferred);
  } catch (error) {
    // Some laptops and older mobile browsers reject facingMode constraints.
    if (error.name === 'OverconstrainedError' || error.name === 'NotFoundError') {
      return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
    throw error;
  }
}

function waitForVideo() {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Video did not start')), 8000);
    video.addEventListener('loadeddata', () => { window.clearTimeout(timeout); resolve(); }, { once: true });
  });
}

async function scanFrame() {
  if (scanInProgress || !stream || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) return;
  scanInProgress = true;
  captureCanvas.width = video.videoWidth;
  captureCanvas.height = video.videoHeight;
  captureCanvas.getContext('2d').drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
  try {
    const response = await fetch('/api/attendance/recognize', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: captureCanvas.toDataURL('image/jpeg', 0.76), subject: subjectInput.value.trim() })
    });
    const data = await response.json();
    if (data.success) {
      resultBox.className = 'result-box success';
      resultBox.textContent = data.message;
      recognitionList.innerHTML = data.students.map((student) => `<div class="recognition-chip">✓ ${student.name}<small>Roll ${student.roll_no}</small></div>`).join('');
    } else if (!['No registered faces recognized', 'No face detected in captured image'].includes(data.message)) {
      resultBox.className = 'result-box warning';
      resultBox.textContent = data.message;
    }
  } catch (error) {
    resultBox.className = 'result-box warning';
    resultBox.textContent = 'Connection to the scanner was lost.';
  } finally { scanInProgress = false; }
}

async function startCamera() {
  if (!subjectInput.value.trim()) {
    showToast('Please enter a subject name', 'error');
    subjectInput.focus();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    resultBox.className = 'result-box warning';
    resultBox.textContent = 'This browser does not support camera access.';
    return;
  }
  try {
    setStatus('Opening camera…');
    stream = await requestCamera();
    video.srcObject = stream;
    await video.play();
    await waitForVideo();
    video.classList.add('is-active');
    video.classList.toggle('is-rear-camera', facingMode === 'environment');
    setCameraControls(true);
    setStatus('Live scan active', true);
    resultBox.className = 'result-box';
    resultBox.textContent = 'Looking for registered faces…';
    scanFrame();
    scanTimer = window.setInterval(scanFrame, 1400);
  } catch (error) {
    stopCamera(cameraErrorMessage(error));
  }
}

startButton.addEventListener('click', startCamera);
stopButton.addEventListener('click', () => stopCamera());
switchButton.addEventListener('click', async () => {
  facingMode = facingMode === 'user' ? 'environment' : 'user';
  stopCamera('Switching camera…');
  await startCamera();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && stream) stopCamera('Camera paused while the app was in the background.'); });
window.addEventListener('beforeunload', stopCamera);
