function checkAuth() {
  fetch('/api/students').catch(() => {});
}

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    });
  }

  const teacherNameEl = document.getElementById('teacher-name');
  if (teacherNameEl) {
    teacherNameEl.textContent = sessionStorage.getItem('teacherName') || 'Teacher';
  }
});

function showToast(message, type = 'success') {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

const canvas = document.getElementById('cursor-canvas');
if (canvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let pointer = null;
  let lastPoint = null;
  let hue = 155;
  let particles = [];
  let frameId;

  function resizeCanvas() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  resizeCanvas();

  window.addEventListener('resize', () => {
    resizeCanvas();
  });

  window.addEventListener('mousemove', (e) => {
    const point = { x: e.clientX, y: e.clientY };
    const distance = lastPoint
      ? Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y)
      : 0;
    const count = Math.min(5, Math.max(1, Math.ceil(distance / 10)));

    pointer = point;
    hue = (hue + 3 + distance * 0.35) % 360;

    for (let i = 0; i < count; i++) {
      const progress = count === 1 ? 1 : i / (count - 1);
      const x = lastPoint ? lastPoint.x + (point.x - lastPoint.x) * progress : point.x;
      const y = lastPoint ? lastPoint.y + (point.y - lastPoint.y) * progress : point.y;
      particles.push({
        x,
        y,
        size: 3 + Math.random() * 4 + Math.min(distance / 18, 3),
        hue: (hue + i * 12) % 360,
        life: 1,
        vx: (Math.random() - 0.5) * 0.75,
        vy: (Math.random() - 0.5) * 0.75 - 0.15
      });
    }
    lastPoint = point;
  });

  function animateParticles() {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';

    particles = particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.028;
      p.size *= 0.975;
      p.hue = (p.hue + 0.8) % 360;
      return p.life > 0;
    });

    particles.forEach((p) => {
      const alpha = p.life * p.life;
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3.5);
      glow.addColorStop(0, `hsla(${p.hue}, 100%, 76%, ${alpha})`);
      glow.addColorStop(0.35, `hsla(${p.hue + 25}, 95%, 65%, ${alpha * 0.42})`);
      glow.addColorStop(1, `hsla(${p.hue + 45}, 100%, 60%, 0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3.5, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
    });

    if (pointer) {
      const core = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 18);
      core.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
      core.addColorStop(0.16, `hsla(${hue}, 100%, 78%, 0.8)`);
      core.addColorStop(1, `hsla(${hue + 35}, 100%, 65%, 0)`);
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, 18, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    frameId = requestAnimationFrame(animateParticles);
  }
  animateParticles();

  window.addEventListener('beforeunload', () => cancelAnimationFrame(frameId), { once: true });
}
