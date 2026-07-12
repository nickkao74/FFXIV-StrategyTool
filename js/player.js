/* player.js — 沙盤步驟播放器 */
class StepPlayer {
  constructor(root, arena) {
    this.root = root;
    this.arena = arena;
    this.steps = [];
    this.index = 0;

    root.innerHTML = `
      <div class="player-caption"></div>
      <div class="player-controls">
        <button class="btn-prev" title="上一步">◀</button>
        <div class="player-dots"></div>
        <button class="btn-next" title="下一步">▶</button>
      </div>`;
    this.captionEl = root.querySelector('.player-caption');
    this.dotsEl = root.querySelector('.player-dots');
    this.prevBtn = root.querySelector('.btn-prev');
    this.nextBtn = root.querySelector('.btn-next');

    this.prevBtn.addEventListener('click', () => this.go(this.index - 1));
    this.nextBtn.addEventListener('click', () => this.go(this.index + 1));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.go(this.index - 1);
      if (e.key === 'ArrowRight') this.go(this.index + 1);
    });
  }

  load(steps) {
    this.steps = steps || [];
    this.dotsEl.innerHTML = '';
    this.steps.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'player-dot';
      dot.title = `步驟 ${i + 1}`;
      dot.addEventListener('click', () => this.go(i));
      this.dotsEl.appendChild(dot);
    });
    this.root.style.display = this.steps.length ? '' : 'none';
    if (this.steps.length) this.go(0, true);
  }

  go(i, force = false) {
    if (!this.steps.length) return;
    const next = Math.max(0, Math.min(this.steps.length - 1, i));
    if (next === this.index && !force) return;
    this.index = next;
    const step = this.steps[this.index];
    this.arena.renderStep(step);
    this.captionEl.textContent = `${this.index + 1}/${this.steps.length}　${step.caption || ''}`;
    [...this.dotsEl.children].forEach((d, j) => d.classList.toggle('active', j === this.index));
    this.prevBtn.disabled = this.index === 0;
    this.nextBtn.disabled = this.index === this.steps.length - 1;
  }
}
