/* canvas.js — 白板 SVG 畫布:場地繪製 + 兵棋/物件拖曳 + 放置工具 */
const BOARD_SVG_NS = 'http://www.w3.org/2000/svg';
const TOKEN_TRANSITION = 'transform .5s ease-in-out, opacity .3s';

function bel(name, attrs = {}, parent = null) {
  const node = document.createElementNS(BOARD_SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

class BoardCanvas {
  constructor(container, state) {
    this.container = container;
    this.state = state;
    this.tokenNodes = new Map();
    this.dragging = null; // { type:'token'|'object', id, offsetX, offsetY }
    this.tool = 'select';
    this.pending = null;  // 兩段式工具(直線箭頭/連線)暫存的第一個點/id
    this.onToolComplete = null; // 放置完成後回呼(切回 select)

    this._buildStatic();
    this.state.onChange(() => this.render());
  }

  _buildStatic() {
    this.container.innerHTML = '';
    const svg = bel('svg', { class: 'board-svg' }, null);
    this.container.appendChild(svg);
    this.svg = svg;

    const defs = bel('defs', {}, svg);
    const marker = bel('marker', {
      id: 'board-arrowhead', viewBox: '0 0 10 10', refX: '8', refY: '5',
      markerWidth: '5', markerHeight: '5', orient: 'auto-start-reverse',
    }, defs);
    bel('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'context-stroke' }, marker);

    this.floorLayer = bel('g', { class: 'board-floor' }, svg);
    this.objectLayer = bel('g', { class: 'board-objects' }, svg);
    this.tetherLayer = bel('g', { class: 'board-tethers' }, svg);
    this.waymarkLayer = bel('g', { class: 'board-waymarks' }, svg);
    this.tokenLayer = bel('g', { class: 'board-tokens' }, svg);
    this.markerLayer = bel('g', { class: 'board-markers' }, svg);

    svg.addEventListener('pointerdown', (e) => this._onSvgPointerDown(e));
    svg.addEventListener('pointermove', (e) => this._onPointerMove(e));
    svg.addEventListener('pointerup', () => this._endDrag());
    svg.addEventListener('pointerleave', () => this._endDrag());
  }

  setTool(toolId) {
    this.tool = toolId;
    this.pending = null;
    this.container.classList.toggle('placing', toolId !== 'select');
  }

  setPhase(arenaDef, phaseDef) {
    const shape = phaseDef.shape || 'circle';
    const size = phaseDef.size || { r: 100 };
    const pad = 18;
    let vb;
    if (shape === 'rect') {
      const w = size.w || 200, h = size.h || 200;
      vb = `${-w / 2 - pad} ${-h / 2 - pad} ${w + pad * 2} ${h + pad * 2}`;
    } else {
      const r = size.r || 100;
      vb = `${-r - pad} ${-r - pad} ${(r + pad) * 2} ${(r + pad) * 2}`;
    }
    this.svg.setAttribute('viewBox', vb);

    this.floorLayer.innerHTML = '';
    if (shape === 'rect') {
      const w = size.w || 200, h = size.h || 200;
      bel('rect', { x: -w / 2, y: -h / 2, width: w, height: h, class: 'board-floor-shape' }, this.floorLayer);
    } else {
      const r = size.r || 100;
      bel('circle', { cx: 0, cy: 0, r, class: 'board-floor-shape' }, this.floorLayer);
    }
  }

  render() {
    const wmTokens = this.state.tokens.filter((t) => t.kind === 'waymark');
    this._syncTokenLayer(this.waymarkLayer, wmTokens, 'waymark');
    const otherTokens = this.state.tokens.filter((t) => t.kind !== 'waymark');
    this._syncTokenLayer(this.tokenLayer, otherTokens, 'token');

    this._renderObjects();
  }

  _syncTokenLayer(layer, tokens, kindGroup) {
    const seen = new Set();
    for (const t of tokens) {
      seen.add(t.id);
      let g = this.tokenNodes.get(t.id);
      if (!g) {
        g = this._createTokenNode(t, kindGroup);
        layer.appendChild(g);
        this.tokenNodes.set(t.id, g);
      }
      g.setAttribute('transform', `translate(${t.x},${t.y})`);
      g.classList.toggle('locked', !!t.locked);
      g.classList.toggle('selected', this.state.isSelected('token', t.id));
      g.style.display = t.visible === false ? 'none' : '';
      g.style.cursor = t.locked ? 'not-allowed' : 'grab';
    }
    for (const [id, node] of [...this.tokenNodes]) {
      if (!seen.has(id) && node.dataset.kindGroup === kindGroup) {
        node.remove();
        this.tokenNodes.delete(id);
      }
    }
  }

  _createTokenNode(t, kindGroup) {
    const g = bel('g', { class: `board-token token-${t.kind}`, 'data-id': t.id, 'data-entity': 'token' }, null);
    g.dataset.kindGroup = kindGroup;
    g.style.transition = TOKEN_TRANSITION;

    if (t.kind === 'waymark') {
      bel('circle', { cx: 0, cy: 0, r: 7.5, class: `wm-circle wm-${t.label}` }, g);
      const txt = bel('text', { x: 0, y: 0.5, class: 'wm-text' }, g);
      txt.textContent = t.label;
    } else if (t.kind === 'boss') {
      bel('path', { d: 'M0,-16 L7,-6 L-7,-6 Z', class: 'boss-facing' }, g);
      bel('circle', { cx: 0, cy: 0, r: 11, class: 'boss-circle' }, g);
      const txt = bel('text', { x: 0, y: 0.5, class: 'boss-text' }, g);
      txt.textContent = 'BOSS';
    } else {
      const role = BOARD_ROLE_TYPE[t.id] || 'dps';
      bel('circle', { cx: 0, cy: 0, r: 7, class: `player-circle role-${role}` }, g);
      const txt = bel('text', { x: 0, y: 0.5, class: 'player-text' }, g);
      txt.textContent = t.label;
    }

    g.addEventListener('pointerdown', (e) => this._onEntityPointerDown(e, 'token', t.id));
    return g;
  }

  _renderObjects() {
    this.objectLayer.innerHTML = '';
    this.tetherLayer.innerHTML = '';
    this.markerLayer.innerHTML = '';
    for (const obj of this.state.objects) {
      if (obj.visible === false) continue; // 該影格中此物件被隱藏
      const node = renderBoardObject(obj, this.state);
      node.dataset.id = obj.id;
      node.dataset.entity = 'object';
      node.classList.toggle('locked', !!obj.locked);
      node.classList.toggle('selected', this.state.isSelected('object', obj.id));
      node.addEventListener('pointerdown', (e) => this._onEntityPointerDown(e, 'object', obj.id));
      if (obj.kind === 'tether') this.tetherLayer.appendChild(node);
      else if (obj.kind === 'marker') this.markerLayer.appendChild(node);
      else this.objectLayer.appendChild(node);
    }
  }

  // ── 座標轉換 ──────────────────────────
  _clientToBoard(clientX, clientY) {
    const pt = this.svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = this.svg.getScreenCTM().inverse();
    const p = pt.matrixTransform(ctm);
    return { x: p.x, y: p.y };
  }

  // ── 事件:點在兵棋/物件上 ────────────────
  _onEntityPointerDown(e, kind, id) {
    e.preventDefault();
    e.stopPropagation();
    if (this.tool === 'select') {
      this.state.select(kind, id);
      const entity = kind === 'token' ? this.state.getToken(id) : this.state.getObject(id);
      if (!entity || entity.locked) return;
      const p = this._clientToBoard(e.clientX, e.clientY);
      const anchorPos = kind === 'token' ? entity : this.state.effectivePosition(entity);
      this.dragging = { type: kind, id, offsetX: anchorPos.x - p.x, offsetY: anchorPos.y - p.y };
      if (kind === 'token') {
        const node = this.tokenNodes.get(id);
        if (node) node.style.transition = 'none'; // 拖曳時關閉動畫過渡,避免手感延遲
      }
      this.svg.setPointerCapture(e.pointerId);
      return;
    }
    if (this.tool === 'tether') {
      this._handleTetherPick(kind, id);
      return;
    }
    if (this.tool.startsWith('marker-')) {
      this._placeMarkerOn(kind, id);
      return;
    }
  }

  // ── 事件:點在空白畫布 ──────────────────
  _onSvgPointerDown(e) {
    if (e.target !== this.svg && e.target.closest('[data-entity]')) return; // 已由實體處理
    const p = this._clientToBoard(e.clientX, e.clientY);

    if (this.tool === 'select') {
      this.state.clearSelection();
      return;
    }
    if (this.tool === 'tether') return; // 連線只認實體,點空白不動作
    if (this.tool.startsWith('marker-')) {
      this._placeMarker(p.x, p.y, this.tool.slice('marker-'.length));
      this._completeTool();
      return;
    }
    if (this.tool === 'arrow-line') {
      if (!this.pending) {
        this.pending = { x: p.x, y: p.y };
      } else {
        this.state.addObject({ kind: 'arrow-line', x1: this.pending.x, y1: this.pending.y, x2: p.x, y2: p.y, color: 'white' });
        this._completeTool();
      }
      return;
    }
    if (this.tool === 'arrow-arc-cw' || this.tool === 'arrow-arc-ccw') {
      const radius = Math.hypot(p.x, p.y);
      const deg = boardPointToDeg(p.x, p.y);
      const dir = this.tool === 'arrow-arc-cw' ? 'cw' : 'ccw';
      this.state.addObject({ kind: 'arrow-arc', radius: Math.round(radius), start: Math.round(deg - 45), end: Math.round(deg + 45), dir, color: 'white' });
      this._completeTool();
      return;
    }
    if (OBJECT_DEFAULTS[this.tool]) {
      this.state.addObject({ kind: this.tool, x: p.x, y: p.y, ...OBJECT_DEFAULTS[this.tool] });
      this._completeTool();
      return;
    }
  }

  _handleTetherPick(kind, id) {
    if (!this.pending) {
      this.pending = { kind, id };
      return;
    }
    if (this.pending.kind === kind && this.pending.id === id) return; // 同一個物件,忽略
    this.state.addObject({ kind: 'tether', from: this.pending.id, to: id, color: 'purple' });
    this._completeTool();
  }

  _placeMarkerOn(kind, id) {
    const markerType = this.tool.slice('marker-'.length);
    if (markerType === 'text') {
      const text = window.prompt('輸入標籤文字:', '');
      if (text === null || text.trim() === '') { this._completeTool(); return; }
      this.state.addObject({ kind: 'marker', markerType, text: text.trim(), attachTo: id, dx: 0, dy: -16 });
    } else {
      this.state.addObject({ kind: 'marker', markerType, attachTo: id, dx: 0, dy: -16 });
    }
    this._completeTool();
  }

  _placeMarker(x, y, markerType) {
    if (markerType === 'text') {
      const text = window.prompt('輸入標籤文字:', '');
      if (text === null || text.trim() === '') return;
      this.state.addObject({ kind: 'marker', markerType, text: text.trim(), x, y });
    } else {
      this.state.addObject({ kind: 'marker', markerType, x, y });
    }
  }

  _completeTool() {
    this.pending = null;
    this.setTool('select');
    if (this.onToolComplete) this.onToolComplete();
  }

  // ── 拖曳 ──────────────────────────────
  _onPointerMove(e) {
    if (!this.dragging) return;
    const p = this._clientToBoard(e.clientX, e.clientY);
    const x = p.x + this.dragging.offsetX, y = p.y + this.dragging.offsetY;
    if (this.dragging.type === 'token') this.state.moveToken(this.dragging.id, x, y);
    else this.state.moveObject(this.dragging.id, x, y);
  }

  _endDrag() {
    if (this.dragging && this.dragging.type === 'token') {
      const node = this.tokenNodes.get(this.dragging.id);
      if (node) node.style.transition = TOKEN_TRANSITION; // 拖曳結束恢復動畫過渡(供影格切換使用)
    }
    this.dragging = null;
  }
}
