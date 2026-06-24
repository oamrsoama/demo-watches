/* =========================================================
   Demo Watches — Starfield Canvas  (js/starfield.js)
   ========================================================= */

class Starfield {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx    = this.canvas.getContext('2d');
    this.stars  = [];
    this.nebulae = [];
    this.frame  = 0;
    this.raf    = null;

    this.resize();
    this.generateStars(420);
    this.generateNebulae(4);
    this.animate();

    window.addEventListener('resize', () => {
      this.resize();
      this.stars   = [];
      this.nebulae = [];
      this.generateStars(420);
      this.generateNebulae(4);
    });
  }

  resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  randomStarColor() {
    const r = Math.random();
    if (r < 0.60) return { r: 255, g: 255, b: 255 }; // white
    if (r < 0.85) return { r: 135, g: 206, b: 235 }; // sky blue
    return          { r: 255, g: 215, b:   0 };       // gold
  }

  generateStars(count) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    for (let i = 0; i < count; i++) {
      const col = this.randomStarColor();
      this.stars.push({
        x:       Math.random() * W,
        y:       Math.random() * H,
        size:    Math.random() * 2.2 + 0.4,
        baseOp:  Math.random() * 0.55 + 0.35,
        phase:   Math.random() * Math.PI * 2,
        speed:   Math.random() * 0.008 + 0.003,
        r: col.r, g: col.g, b: col.b,
      });
    }
  }

  generateNebulae(count) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const palettes = [
      { r: 107, g: 70,  b: 193 }, // purple
      { r:  14, g: 184, b: 166 }, // teal
      { r:  14, g: 165, b: 233 }, // sky blue
      { r: 212, g: 175, b:  55 }, // gold
    ];
    for (let i = 0; i < count; i++) {
      const c = palettes[i % palettes.length];
      this.nebulae.push({
        x:     Math.random() * W,
        y:     Math.random() * H,
        rx:    W * (0.18 + Math.random() * 0.22),
        ry:    H * (0.12 + Math.random() * 0.18),
        op:    0.045 + Math.random() * 0.055,
        phase: Math.random() * Math.PI * 2,
        speed: 0.0004 + Math.random() * 0.0003,
        r: c.r, g: c.g, b: c.b,
      });
    }
  }

  drawNebulae(t) {
    const ctx = this.ctx;
    this.nebulae.forEach(n => {
      const pulse = Math.sin(n.phase + t * n.speed) * 0.3 + 0.7;
      const ox = Math.cos(n.phase + t * n.speed * 0.7) * 40;
      const oy = Math.sin(n.phase + t * n.speed * 0.5) * 25;

      const grad = ctx.createRadialGradient(
        n.x + ox, n.y + oy, 0,
        n.x + ox, n.y + oy, Math.max(n.rx, n.ry)
      );
      grad.addColorStop(0,   `rgba(${n.r},${n.g},${n.b},${(n.op * pulse).toFixed(3)})`);
      grad.addColorStop(0.5, `rgba(${n.r},${n.g},${n.b},${(n.op * pulse * 0.4).toFixed(3)})`);
      grad.addColorStop(1,   `rgba(${n.r},${n.g},${n.b},0)`);

      ctx.save();
      ctx.scale(n.rx / Math.max(n.rx, n.ry), n.ry / Math.max(n.rx, n.ry));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(
        (n.x + ox) * (Math.max(n.rx, n.ry) / n.rx),
        (n.y + oy) * (Math.max(n.rx, n.ry) / n.ry),
        Math.max(n.rx, n.ry), 0, Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    });
  }

  drawStars(t) {
    const ctx = this.ctx;
    this.stars.forEach(s => {
      const op = s.baseOp * (Math.sin(s.phase + t * s.speed) * 0.45 + 0.55);
      ctx.globalAlpha = Math.max(0, Math.min(1, op));
      ctx.fillStyle   = `rgb(${s.r},${s.g},${s.b})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();

      // subtle glow for larger stars
      if (s.size > 1.6) {
        ctx.globalAlpha = op * 0.25;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
  }

  animate() {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const H   = this.canvas.height;
    this.frame++;
    const t = this.frame;

    // Background
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    // Subtle deep-space vignette gradient
    const vignette = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H)*0.75);
    vignette.addColorStop(0,   'rgba(10,14,26,0)');
    vignette.addColorStop(1,   'rgba(0,0,0,0.55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    this.drawNebulae(t);
    this.drawStars(t);

    this.raf = requestAnimationFrame(() => this.animate());
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
  }
}

window.addEventListener('load', () => {
  window._starfield = new Starfield('starfield');
});
