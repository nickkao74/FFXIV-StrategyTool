/* arena.js — SVG 沙盤渲染引擎
 * 座標系:場地中心為原點,x 向右、y 向下,場地半徑 = 100。
 */
const SVG_NS = 'http://www.w3.org/2000/svg';

const ROLE_TYPE = {
  MT: 'tank', ST: 'tank',
  H1: 'healer', H2: 'healer',
  D1: 'dps', D2: 'dps', D3: 'dps', D4: 'dps',
};

function el(name, attrs = {}, parent = null) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

class Arena {
  constructor(container, arenaDef, roles) {
    this.container = container;
    this.arenaDef = arenaDef;
    this.roles = roles;
    this.selectedRole = null;
    this.actorNodes = new Map();
    this._build();
  }

  _build() {
    this.container.innerHTML = '';
    const svg = el('svg', { viewBox: '-118 -118 236 236', class: 'arena-svg' }, null);
    this.container.appendChild(svg);
    this.svg = svg;

    const defs = el('defs', {}, svg);
    const marker = el('marker', {
      id: 'arrowhead', viewBox: '0 0 10 10', refX: '8', refY: '5',
      markerWidth: '5', markerHeight: '5', orient: 'auto-start-reverse',
    }, defs);
    el('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'context-stroke' }, marker);

    // 場地
    const floor = el('g', { class: 'floor' }, svg);
    el('circle', { cx: 0, cy: 0, r: 100, class: 'arena-floor' }, floor);
    el('circle', { cx: 0, cy: 0, r: 100, class: 'arena-rim' }, floor);
    el('circle', { cx: 0, cy: 0, r: 55, class: 'arena-inner-line' }, floor);

    // 場地標記 A/B/C/D(A上 B右 C下 D左)
    const wmDefs = this.arenaDef.waymarks || [
      { id: 'A', x: 0, y: -95 }, { id: 'B', x: 95, y: 0 },
      { id: 'C', x: 0, y: 95 }, { id: 'D', x: -95, y: 0 },
    ];
    const wmLayer = el('g', { class: 'waymarks' }, svg);
    for (const wm of wmDefs) {
      const g = el('g', { class: `waymark waymark-${wm.id}` }, wmLayer);
      el('circle', { cx: wm.x, cy: wm.y, r: 7.5 }, g);
      const t = el('text', { x: wm.x, y: wm.y, class: 'waymark-text' }, g);
      t.textContent = wm.id;
    }

    // 圖層順序:AOE → 連線 → 註記 → BOSS → 玩家
    this.layers = {
      aoes: el('g', { class: 'layer-aoes' }, svg),
      tethers: el('g', { class: 'layer-tethers' }, svg),
      annotations: el('g', { class: 'layer-annotations' }, svg),
      boss: el('g', { class: 'layer-boss' }, svg),
      actors: el('g', { class: 'layer-actors' }, svg),
      markers: el('g', { class: 'layer-markers' }, svg),
    };

    // 建立持久的玩家節點(位置切換時有平滑過渡)
    for (const role of this.roles) {
      const g = el('g', { class: `actor actor-${ROLE_TYPE[role] || 'dps'}`, 'data-role': role }, this.layers.actors);
      el('circle', { cx: 0, cy: 0, r: 7, class: 'actor-body' }, g);
      const t = el('text', { x: 0, y: 0.5, class: 'actor-label' }, g);
      t.textContent = role;
      g.style.transition = 'transform .7s ease-in-out, opacity .4s';
      this.actorNodes.set(role, g);
    }

    // BOSS 節點(持久)
    const bossG = el('g', { class: 'boss' }, this.layers.boss);
    this.bossFacing = el('path', { class: 'boss-facing', d: 'M0,-24 L9,-11 L-9,-11 Z' }, bossG);
    el('circle', { cx: 0, cy: 0, r: 12, class: 'boss-body' }, bossG);
    const bt = el('text', { x: 0, y: 0.5, class: 'boss-label' }, bossG);
    bt.textContent = 'BOSS';
    bossG.style.transition = 'transform .7s ease-in-out, opacity .4s';
    this.bossNode = bossG;
  }

  setSelectedRole(role) {
    this.selectedRole = role;
    for (const [r, node] of this.actorNodes) {
      node.classList.toggle('selected', r === role);
    }
  }

  /** 渲染一個步驟 */
  renderStep(step) {
    // 清除非持久圖層
    for (const key of ['aoes', 'tethers', 'annotations', 'markers']) {
      this.layers[key].innerHTML = '';
    }

    // 玩家位置
    for (const [role, node] of this.actorNodes) {
      const pos = step.actors ? step.actors[role] : null;
      if (pos) {
        node.style.opacity = '1';
        node.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      } else {
        node.style.opacity = '0.12';
      }
    }
    // 選中職位節點移到最上層
    if (this.selectedRole && this.actorNodes.has(this.selectedRole)) {
      this.layers.actors.appendChild(this.actorNodes.get(this.selectedRole));
    }

    // BOSS
    if (step.boss) {
      this.bossNode.style.opacity = '1';
      this.bossNode.style.transform = `translate(${step.boss.x}px, ${step.boss.y}px)`;
      if (typeof step.boss.facing === 'number') {
        this.bossFacing.style.display = '';
        this.bossFacing.setAttribute('transform', `rotate(${step.boss.facing})`);
      } else {
        this.bossFacing.style.display = 'none';
      }
    } else {
      this.bossNode.style.opacity = '0';
    }

    // AOE
    for (const aoe of step.aoes || []) this._drawAoe(aoe, step);
    // 連線
    for (const tether of step.tethers || []) this._drawTether(tether, step);
    // 註記
    for (const ann of step.annotations || []) this._drawAnnotation(ann, step);
    // 點名標記
    for (const mk of step.markers || []) this._drawMarker(mk, step);
  }

  _resolvePoint(ref, step) {
    if (Array.isArray(ref)) return { x: ref[0], y: ref[1] };
    if (typeof ref === 'string' && step.actors && step.actors[ref]) return step.actors[ref];
    if (ref === 'boss' && step.boss) return step.boss;
    return { x: 0, y: 0 };
  }

  _drawAoe(aoe, step) {
    const layer = this.layers.aoes;
    const p = this._resolvePoint(aoe.at ?? [aoe.x ?? 0, aoe.y ?? 0], step);
    const cls = `aoe aoe-${aoe.color || 'generic'}`;
    switch (aoe.type) {
      case 'circle':
        el('circle', { cx: p.x, cy: p.y, r: aoe.r || 12, class: cls }, layer);
        break;
      case 'donut': {
        const rO = aoe.rOuter || 100, rI = aoe.rInner || 40;
        el('path', {
          class: cls, 'fill-rule': 'evenodd',
          d: `M${p.x - rO},${p.y} a${rO},${rO} 0 1,0 ${rO * 2},0 a${rO},${rO} 0 1,0 ${-rO * 2},0 ` +
             `M${p.x - rI},${p.y} a${rI},${rI} 0 1,0 ${rI * 2},0 a${rI},${rI} 0 1,0 ${-rI * 2},0`,
        }, layer);
        break;
      }
      case 'cone': {
        const r = aoe.r || 100;
        const a0 = ((aoe.angle - aoe.spread / 2) - 90) * Math.PI / 180;
        const a1 = ((aoe.angle + aoe.spread / 2) - 90) * Math.PI / 180;
        const large = aoe.spread > 180 ? 1 : 0;
        el('path', {
          class: cls,
          d: `M${p.x},${p.y} L${p.x + r * Math.cos(a0)},${p.y + r * Math.sin(a0)} ` +
             `A${r},${r} 0 ${large},1 ${p.x + r * Math.cos(a1)},${p.y + r * Math.sin(a1)} Z`,
        }, layer);
        break;
      }
      case 'blackhole': {
        const g = el('g', { class: 'blackhole' }, layer);
        el('circle', { cx: p.x, cy: p.y, r: (aoe.r || 10) + 3, class: 'blackhole-glow' }, g);
        el('circle', { cx: p.x, cy: p.y, r: aoe.r || 10, class: 'blackhole-core' }, g);
        el('circle', { cx: p.x, cy: p.y, r: (aoe.r || 10) * 0.45, class: 'blackhole-eye' }, g);
        break;
      }
      case 'tentacle': {
        const g = el('g', { class: 'tentacle' }, layer);
        el('circle', { cx: p.x, cy: p.y, r: 6.5, class: 'tentacle-body' }, g);
        if (aoe.label != null) {
          const t = el('text', { x: p.x, y: p.y + 0.5, class: 'tentacle-label' }, g);
          t.textContent = aoe.label;
        }
        break;
      }
    }
  }

  _drawTether(tether, step) {
    const a = this._resolvePoint(tether.from, step);
    const b = this._resolvePoint(tether.to, step);
    el('line', {
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      class: `tether tether-${tether.color || 'purple'}`,
    }, this.layers.tethers);
  }

  _drawAnnotation(ann, step) {
    const layer = this.layers.annotations;
    switch (ann.type) {
      case 'arrow': {
        const a = this._resolvePoint(ann.from, step);
        const b = this._resolvePoint(ann.to, step);
        el('line', {
          x1: a.x, y1: a.y, x2: b.x, y2: b.y,
          class: `ann-arrow ann-${ann.color || 'white'}`,
          'marker-end': 'url(#arrowhead)',
        }, layer);
        break;
      }
      case 'arcArrow': {
        // 以場地中心為圓心的弧形箭頭:radius、startAngle、endAngle(deg,0=上)
        // 預設順時針;ann.dir === 'ccw' 為逆時針。以取樣點繪製,圓心固定在中心。
        const r = ann.radius || 80;
        const dir = ann.dir === 'ccw' ? -1 : 1;
        const sweep = ((ann.endAngle - ann.startAngle) * dir % 360 + 360) % 360 || 360;
        const toXY = (deg) => {
          const rad = (deg - 90) * Math.PI / 180;
          return `${(r * Math.cos(rad)).toFixed(2)},${(r * Math.sin(rad)).toFixed(2)}`;
        };
        const pts = [];
        const stepDeg = 6;
        for (let a = 0; a <= sweep; a += stepDeg) pts.push(toXY(ann.startAngle + a * dir));
        pts.push(toXY(ann.startAngle + sweep * dir));
        el('path', {
          d: 'M' + pts.join(' L'),
          class: `ann-arc ann-${ann.color || 'white'}`,
          'marker-end': 'url(#arrowhead)',
        }, layer);
        break;
      }
      case 'text': {
        const p = this._resolvePoint(ann.at, step);
        const t = el('text', { x: p.x, y: p.y, class: `ann-text ann-${ann.color || 'white'}` }, layer);
        t.textContent = ann.text;
        break;
      }
      case 'knockback': {
        // 從某點向外的多方向擊退箭頭
        const p = this._resolvePoint(ann.at ?? [0, 0], step);
        const count = ann.count || 8;
        const r0 = ann.rInner || 18, r1 = ann.rOuter || 38;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * 2 * Math.PI - Math.PI / 2;
          el('line', {
            x1: p.x + r0 * Math.cos(a), y1: p.y + r0 * Math.sin(a),
            x2: p.x + r1 * Math.cos(a), y2: p.y + r1 * Math.sin(a),
            class: `ann-arrow ann-${ann.color || 'white'} ann-thin`,
            'marker-end': 'url(#arrowhead)',
          }, layer);
        }
        break;
      }
    }
  }

  _drawMarker(mk, step) {
    const layer = this.layers.markers;
    const p = this._resolvePoint(mk.at, step);
    switch (mk.type) {
      case 'share': {
        const g = el('g', { class: 'marker-share' }, layer);
        el('circle', { cx: p.x, cy: p.y, r: 13, class: 'share-outer' }, g);
        el('circle', { cx: p.x, cy: p.y, r: 8.5, class: 'share-inner' }, g);
        break;
      }
      case 'triangle': {
        el('path', {
          d: `M${p.x},${p.y - 16} l6,9 l-12,0 Z`,
          class: 'marker-triangle',
        }, layer);
        break;
      }
      case 'target': {
        const g = el('g', { class: 'marker-target' }, layer);
        const s = 11;
        for (const [dx, dy, rot] of [[-s, -s, 0], [s, -s, 90], [s, s, 180], [-s, s, 270]]) {
          el('path', {
            d: 'M-3,1 L-3,-3 L1,-3',
            transform: `translate(${p.x + dx},${p.y + dy}) rotate(${rot})`,
            class: 'target-corner',
          }, g);
        }
        break;
      }
    }
  }
}
