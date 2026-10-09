export class ReactiveGlitter {
  constructor(count = 100) {
    this.count = count;
    this.particles = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.01,
      vy: (Math.random() - 0.5) * 0.01,
      size: Math.random() * 4 + 1
    }));
  }

  update(motion = 0, audio = 0) {
    this.particles.forEach(p => {
      p.x += p.vx + (Math.random() - 0.5) * motion * 0.02;
      p.y += p.vy + (Math.random() - 0.5) * motion * 0.02;
      if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
      if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;
    });
    return this.particles;
  }
}
