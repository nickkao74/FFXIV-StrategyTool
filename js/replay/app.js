/* js/replay/app.js — 戰鬥重播頁主邏輯（唯讀，無編輯功能） */

const REPLAY_SVG_NS = 'http://www.w3.org/2000/svg';
const SERIES_COLORS = [
  '#4fc3f7', '#e05d5d', '#ffd75e', '#7fb6ff', '#b06ce0', '#4caf7d', '#ff7a45', '#c98fff',
];

function rel(name, attrs = {}, parent = null) {
  const node = document.createElementNS(REPLAY_SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

function fmtTime(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 在已依時間排序的取樣陣列 [[t, ...], ...] 中，找出 <= t 的最後一筆（回傳 index） */
function findSampleIndex(arr, t) {
  let lo = 0, hi = arr.length - 1, ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid][0] <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

class ReplayPlayer {
  constructor(data) {
    this.data = data;
    this.duration = data.meta.durationSec;
    this.currentTime = 0;
    this.playing = false;
    this.speed = 1;
    this._rafId = null;
    this._lastRafMs = null;
    this.onTick = null;
  }
  play() {
    if (this.playing) return;
    this.playing = true;
    this._lastRafMs = performance.now();
    const step = (now) => {
      if (!this.playing) return;
      const dt = (now - this._lastRafMs) / 1000;
      this._lastRafMs = now;
      this.seek(this.currentTime + dt * this.speed);
      if (this.currentTime >= this.duration) { this.pause(); }
      this._rafId = requestAnimationFrame(step);
    };
    this._rafId = requestAnimationFrame(step);
  }
  pause() {
    this.playing = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
  }
  seek(t) {
    this.currentTime = Math.min(this.duration, Math.max(0, t));
    if (this.onTick) this.onTick(this.currentTime);
  }
}

class ReplayCanvas {
  constructor(container, data) {
    this.container = container;
    this.data = data;
    this.tokenNodes = new Map();

    // 兵棋唯讀顯示範圍：依所有取樣座標的最小外接方框，留邊界
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const id of Object.keys(data.positions)) {
      for (const [, x, y] of data.positions[id]) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const r = Math.max((maxX - minX) / 2, (maxY - minY) / 2) + 8;
    this.center = { x: cx, y: cy };
    this.radius = r;

    this._buildStatic();
  }

  _buildStatic() {
    this.container.innerHTML = '';
    this.bossHpFill = document.getElementById('boss-hp-fill');
    this.bossHpText = document.getElementById('boss-hp-text');
    this.bossHpName = document.getElementById('boss-hp-name');

    // 兵棋大小依場地半徑等比縮放，避免在小場地上顯得過大
    this.playerR = this.radius * 0.028;
    this.bossR = this.radius * 0.045;

    const vbX = this.center.x - this.radius, vbY = this.center.y - this.radius;
    const svg = rel('svg', { class: 'board-svg', viewBox: `${vbX} ${vbY} ${this.radius * 2} ${this.radius * 2}` });
    this.container.appendChild(svg);
    this.svg = svg;

    // 場地底圖：用外接圓概略示意（無精確場地資料，僅供走位參考）
    rel('circle', { cx: this.center.x, cy: this.center.y, r: this.radius - 4, class: 'board-floor-shape' }, svg);

    this.tokenLayer = rel('g', { class: 'board-tokens' }, svg);

    // 每位玩家用固定顏色區分（與右側圖表的顏色一致），取代原本兵棋上的文字
    const players = this.data.actors.filter((a) => a.isPlayer);
    this.playerColor = new Map(players.map((p, i) => [p.id, SERIES_COLORS[i % SERIES_COLORS.length]]));

    for (const actor of this.data.actors) {
      if (!this.data.positions[actor.id]) continue;
      const g = rel('g', { class: `board-token token-${actor.isBoss ? 'boss' : 'player'}` });
      if (actor.isBoss) {
        rel('path', { d: `M0,${-this.bossR * 1.5} L${this.bossR * 0.65},${-this.bossR * 0.55} L${-this.bossR * 0.65},${-this.bossR * 0.55} Z`, class: 'boss-facing' }, g);
        rel('circle', { cx: 0, cy: 0, r: this.bossR, class: 'boss-circle' }, g);
      } else {
        rel('circle', { cx: 0, cy: 0, r: this.playerR, class: 'player-circle', style: `fill:${this.playerColor.get(actor.id)}` }, g);
      }
      this.tokenLayer.appendChild(g);
      this.tokenNodes.set(actor.id, g);
    }
  }

  update(t) {
    for (const actor of this.data.actors) {
      const arr = this.data.positions[actor.id];
      const node = this.tokenNodes.get(actor.id);
      if (!arr || !node) continue;
      const idx = findSampleIndex(arr, t);
      const [, x, y, heading] = arr[idx];
      const visible = t >= arr[0][0] && t <= arr[arr.length - 1][0] + 2;
      node.style.display = visible ? '' : 'none';
      node.setAttribute('transform', `translate(${x},${y}) rotate(${heading || 0})`);
    }

    // BOSS 血量（取所有 boss 實例中，該時間點仍有紀錄者）
    const bossArr = this.data.bossHP;
    if (bossArr.length) {
      const idx = findSampleIndex(bossArr, t);
      const [, hp, maxHp] = bossArr[idx];
      const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
      this.bossHpFill.style.width = pct.toFixed(1) + '%';
      this.bossHpText.textContent = `${hp.toLocaleString()} / ${maxHp.toLocaleString()} (${pct.toFixed(1)}%)`;
    }
  }
}

class ReplayChart {
  constructor(canvas, data) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.data = data;
    this.duration = data.meta.durationSec;
    this.series = new Map(); // key -> {label, color, points:[[t,cum]], ratePoints:[[t,perSec]], visible}
    this.mode = 'cumulative'; // 'cumulative' | 'rate'
    this.onSeek = null;
    this._buildSeries();
    this._bindResize();
    this.canvas.addEventListener('click', (e) => this._onClick(e));
  }

  _buildSeries() {
    const players = this.data.actors.filter((a) => a.isPlayer);
    const BUCKET = 2; // 秒
    this.bucketSec = BUCKET;
    const nBuckets = Math.ceil(this.duration / BUCKET) + 1;

    players.forEach((p, i) => {
      const bucketAmt = new Float64Array(nBuckets);
      this.series.set('dealt:' + p.id, { label: `${p.name} 輸出`, color: SERIES_COLORS[i % SERIES_COLORS.length], bucketAmt, visible: i < 3, kind: 'dealt', total: 0 });
      this.series.set('taken:' + p.id, { label: `${p.name} 承傷`, color: SERIES_COLORS[i % SERIES_COLORS.length], bucketAmt: new Float64Array(nBuckets), visible: false, kind: 'taken', total: 0 });
    });

    for (const ev of this.data.damage) {
      if (ev.kind !== 'damage') continue;
      const b = Math.min(nBuckets - 1, Math.max(0, Math.floor(ev.t / BUCKET)));
      const srcPlayer = players.find((p) => p.name === ev.source || ev.source?.startsWith(p.name));
      if (srcPlayer) {
        const s = this.series.get('dealt:' + srcPlayer.id);
        s.bucketAmt[b] += ev.amount; s.total += ev.amount;
      }
      const tgtPlayer = players.find((p) => p.name === ev.target || ev.target?.startsWith(p.name));
      if (tgtPlayer) {
        const s = this.series.get('taken:' + tgtPlayer.id);
        s.bucketAmt[b] += ev.amount; s.total += ev.amount;
      }
    }

    // 累積曲線 [t, cumulative] 與單位時間曲線 [t, 每秒平均(該區間))
    for (const s of this.series.values()) {
      const pts = [], ratePts = [];
      let sum = 0;
      for (let i = 0; i < nBuckets; i++) {
        sum += s.bucketAmt[i];
        pts.push([i * BUCKET, sum]);
        ratePts.push([i * BUCKET, s.bucketAmt[i] / BUCKET]);
      }
      s.points = pts;
      s.ratePoints = ratePts;
    }

    // BOSS HP 曲線（獨立座標軸，換算成 0-100%，兩種模式都顯示，方便對照戰鬥節奏）
    this.bossPoints = this.data.bossHP.map(([t, hp, maxHp]) => [t, (hp / maxHp) * 100]);
  }

  setMode(mode) { this.mode = mode; this.draw(); }

  _bindResize() {
    const resize = () => {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.w = rect.width; this.h = rect.height;
      this.draw();
    };
    window.addEventListener('resize', resize);
    resize();
  }

  _onClick(e) {
    if (!this.onSeek) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pad = 8;
    const frac = (x - pad) / (this.w - pad * 2);
    this.onSeek(Math.max(0, Math.min(1, frac)) * this.duration);
  }

  draw() {
    const ctx = this.ctx, w = this.w, h = this.h, pad = 8;
    ctx.clearRect(0, 0, w, h);
    const plotW = w - pad * 2, plotH = h - pad * 2;
    const key = this.mode === 'rate' ? 'ratePoints' : 'points';

    let maxDmg = 1;
    for (const s of this.series.values()) {
      if (!s.visible) continue;
      for (const [, v] of s[key]) if (v > maxDmg) maxDmg = v;
    }

    const tx = (t) => pad + (t / this.duration) * plotW;
    const tyDmg = (v) => pad + plotH - (v / maxDmg) * plotH;
    const tyPct = (v) => pad + plotH - (v / 100) * plotH;

    // 格線
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad + (plotH * i) / 4;
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
    }

    // BOSS HP（虛線，右軸 0-100%）
    if (this.bossPoints.length) {
      ctx.strokeStyle = '#ff5f5f';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      this.bossPoints.forEach(([t, v], i) => {
        const x = tx(t), y = tyPct(v);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const s of this.series.values()) {
      if (!s.visible) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      s[key].forEach(([t, v], i) => {
        const x = tx(t), y = tyDmg(v);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // 播放頭
    if (typeof this.playheadT === 'number') {
      const x = tx(this.playheadT);
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, h - pad); ctx.stroke();
    }
  }

  setPlayhead(t) { this.playheadT = t; this.draw(); }
  toggle(key, visible) { const s = this.series.get(key); if (s) { s.visible = visible; this.draw(); } }
}

async function replayMain() {
  const data = window.FIGHT_REPLAY_DATA;
  if (!data) throw new Error('找不到重播資料 window.FIGHT_REPLAY_DATA');

  document.getElementById('replay-meta').textContent =
    `${data.meta.fightName} ・ ${data.meta.date} ・ 時長 ${fmtTime(data.meta.durationSec)} ・ 結果：${data.meta.result === 'wipe' ? '團滅' : '擊殺'}`;

  const select = document.getElementById('replay-select');
  const opt = document.createElement('option');
  opt.value = '0'; opt.textContent = data.meta.fightName + ' ' + data.meta.date;
  select.appendChild(opt);

  const canvasContainer = document.getElementById('board-canvas');
  const canvas = new ReplayCanvas(canvasContainer, data);

  const chartCanvas = document.getElementById('chart-canvas');
  const chart = new ReplayChart(chartCanvas, data);

  const togglesEl = document.getElementById('series-toggles');
  for (const [key, s] of chart.series.entries()) {
    if (s.kind !== 'dealt') continue; // 預設清單只列輸出，承傷可之後擴充
    const label = document.createElement('label');
    label.className = 'series-toggle';
    label.innerHTML = `<input type="checkbox" ${s.visible ? 'checked' : ''}><span class="series-swatch" style="background:${s.color}"></span><span class="series-name">${s.label}</span><span class="series-value">0</span>`;
    const input = label.querySelector('input');
    input.addEventListener('change', () => chart.toggle(key, input.checked));
    togglesEl.appendChild(label);
    label._key = key;
    label._valueEl = label.querySelector('.series-value');
  }

  const player = new ReplayPlayer(data);
  const playBtn = document.getElementById('play-btn');
  const speedSel = document.getElementById('speed-select');
  const scrubber = document.getElementById('scrubber');
  const timeLabel = document.getElementById('time-label');
  scrubber.max = String(Math.round(data.meta.durationSec));

  function renderAt(t) {
    canvas.update(t);
    chart.setPlayhead(t);
    timeLabel.textContent = `${fmtTime(t)} / ${fmtTime(data.meta.durationSec)}`;
    scrubber.value = String(Math.round(t));
    for (const label of togglesEl.children) {
      const s = chart.series.get(label._key);
      const idx = findSampleIndex(s.points, t);
      label._valueEl.textContent = Math.round(s.points[idx][1]).toLocaleString();
    }
  }

  player.onTick = renderAt;
  renderAt(0);

  playBtn.addEventListener('click', () => {
    if (player.playing) { player.pause(); playBtn.textContent = '▶ 播放'; playBtn.classList.remove('playing'); }
    else { player.play(); playBtn.textContent = '⏸ 暫停'; playBtn.classList.add('playing'); }
  });
  speedSel.addEventListener('change', () => { player.speed = Number(speedSel.value); });
  scrubber.addEventListener('input', () => { player.pause(); playBtn.textContent = '▶ 播放'; playBtn.classList.remove('playing'); player.seek(Number(scrubber.value)); });
  chart.onSeek = (t) => { player.pause(); playBtn.textContent = '▶ 播放'; playBtn.classList.remove('playing'); player.seek(t); };

  for (const btn of document.querySelectorAll('.chart-mode-btn')) {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-mode-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      chart.setMode(btn.dataset.mode);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === ' ') { e.preventDefault(); playBtn.click(); }
  });
}
