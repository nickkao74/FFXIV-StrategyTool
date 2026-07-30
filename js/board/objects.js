/* objects.js — 物件(地毯/箭頭/連線/標註)幾何與渲染輔助
 * 座標慣例:場地中心為原點;角度 0=正上方(A),順時針增加(90=B,180=C,270=D)。
 */

function boardDegToPoint(deg, r) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: r * Math.cos(rad), y: r * Math.sin(rad) };
}
function boardPointToDeg(x, y) {
  const rad = Math.atan2(y, x);
  let deg = rad * 180 / Math.PI + 90;
  return ((deg % 360) + 360) % 360;
}

const OBJECT_DEFAULTS = {
  'aoe-circle': { r: 15, color: 'yellow' },
  'aoe-donut': { rOuter: 40, rInner: 18, color: 'purple' },
  'aoe-rect': { w: 50, h: 18, rot: 0, color: 'orange' },
  'aoe-cone': { angle: 0, spread: 90, r: 60, color: 'blue' },
  'knockback': { count: 8, rInner: 20, rOuter: 40, color: 'white' },
  'arrow-line': { color: 'white' },
  'arrow-arc': { radius: 60, start: 0, end: 90, dir: 'cw', color: 'white' },
  'tether': { color: 'magenta' },
  'marker': { markerType: 'share', color: 'cyan' },
  // 副本專屬(見 data/board-special-objects.js)
  'blackhole': { r: 10 },
  'tentacle': { label: '1' },
  // 極朱雀
  'quadrant': { quad: 'ne', glyph: '水', floor: 'brown', boom: 0 },
  'tower': { r: 15 },
  'feather': { size: 'small', r: 28, cleared: 0 },
  'bird': { alive: 0 },
  'xmark': { size: 7 },
  'poem-strip': { text: '十之水向十之水向', side: 'east' },
};

/* 極朱雀朱紅旋律:四塊地板位置固定,只有假名與配色不同 */
const QUAD_SECTORS = {
  ne: { a0: 0, a1: 90 }, se: { a0: 90, a1: 180 },
  sw: { a0: 180, a1: 270 }, nw: { a0: 270, a1: 360 },
};
const POEM_FLOOR = { 水: 'brown', 向: 'yellow', 十: 'green', 之: 'purple' };

function quadDeg(deg, r) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: +(r * Math.cos(rad)).toFixed(2), y: +(r * Math.sin(rad)).toFixed(2) };
}

/** 全角字元(CJK、全角標點、假名)約佔一個字寬,其餘半角約 0.55 倍。
 * 用於背景板寬度估算 —— renderBoardObject 回傳的節點尚未進 DOM,無法量測。 */
const FULLWIDTH_RE = /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/;
function estimateTextWidth(text, fontSize) {
  let units = 0;
  for (const ch of String(text)) units += FULLWIDTH_RE.test(ch) ? 1 : 0.55;
  return units * fontSize;
}

function bo(name, attrs = {}, parent = null) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

/** 建立單一物件的 SVG 節點(不含事件綁定,由呼叫端附加) */
function renderBoardObject(obj, state) {
  const p = state.effectivePosition(obj);
  switch (obj.kind) {
    case 'aoe-circle':
      return bo('circle', { cx: p.x, cy: p.y, r: obj.r, class: `bobj aoe aoe-${obj.color}` });
    case 'aoe-donut': {
      const rO = obj.rOuter, rI = obj.rInner;
      return bo('path', {
        class: `bobj aoe aoe-${obj.color}`, 'fill-rule': 'evenodd',
        d: `M${p.x - rO},${p.y} a${rO},${rO} 0 1,0 ${rO * 2},0 a${rO},${rO} 0 1,0 ${-rO * 2},0 ` +
           `M${p.x - rI},${p.y} a${rI},${rI} 0 1,0 ${rI * 2},0 a${rI},${rI} 0 1,0 ${-rI * 2},0`,
      });
    }
    case 'aoe-rect':
      return bo('rect', {
        x: p.x - obj.w / 2, y: p.y - obj.h / 2, width: obj.w, height: obj.h,
        transform: `rotate(${obj.rot} ${p.x} ${p.y})`,
        class: `bobj aoe aoe-${obj.color}`,
      });
    case 'aoe-cone': {
      const r = obj.r;
      const a0 = (obj.angle - obj.spread / 2 - 90) * Math.PI / 180;
      const a1 = (obj.angle + obj.spread / 2 - 90) * Math.PI / 180;
      const large = obj.spread > 180 ? 1 : 0;
      return bo('path', {
        class: `bobj aoe aoe-${obj.color}`,
        d: `M${p.x},${p.y} L${p.x + r * Math.cos(a0)},${p.y + r * Math.sin(a0)} ` +
           `A${r},${r} 0 ${large},1 ${p.x + r * Math.cos(a1)},${p.y + r * Math.sin(a1)} Z`,
      });
    }
    case 'knockback': {
      const g = bo('g', { class: `bobj ann-${obj.color}` });
      for (let i = 0; i < obj.count; i++) {
        const a = (i / obj.count) * 2 * Math.PI - Math.PI / 2;
        bo('line', {
          x1: p.x + obj.rInner * Math.cos(a), y1: p.y + obj.rInner * Math.sin(a),
          x2: p.x + obj.rOuter * Math.cos(a), y2: p.y + obj.rOuter * Math.sin(a),
          class: 'ann-arrow ann-thin', 'marker-end': 'url(#board-arrowhead)',
        }, g);
      }
      return g;
    }
    case 'arrow-line':
      return bo('line', {
        x1: obj.x1, y1: obj.y1, x2: obj.x2, y2: obj.y2,
        class: `bobj ann-arrow ann-${obj.color}`, 'marker-end': 'url(#board-arrowhead)',
      });
    case 'arrow-arc': {
      const dir = obj.dir === 'ccw' ? -1 : 1;
      const sweep = ((obj.end - obj.start) * dir % 360 + 360) % 360 || 360;
      const pts = [];
      const step = 6;
      for (let a = 0; a <= sweep; a += step) {
        const pt = boardDegToPoint(obj.start + a * dir, obj.radius);
        pts.push(`${pt.x.toFixed(2)},${pt.y.toFixed(2)}`);
      }
      const last = boardDegToPoint(obj.start + sweep * dir, obj.radius);
      pts.push(`${last.x.toFixed(2)},${last.y.toFixed(2)}`);
      return bo('path', {
        d: 'M' + pts.join(' L'),
        class: `bobj ann-arc ann-${obj.color}`, 'marker-end': 'url(#board-arrowhead)',
      });
    }
    case 'tether': {
      const a = resolveEndpointPos(state, obj.from);
      const b = resolveEndpointPos(state, obj.to);
      return bo('line', {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        class: `bobj tether tether-${obj.color}`,
      });
    }
    case 'blackhole': {
      const g = bo('g', { class: 'bobj blackhole' });
      bo('circle', { cx: p.x, cy: p.y, r: obj.r + 3, class: 'blackhole-glow' }, g);
      bo('circle', { cx: p.x, cy: p.y, r: obj.r, class: 'blackhole-core' }, g);
      bo('circle', { cx: p.x, cy: p.y, r: obj.r * 0.45, class: 'blackhole-eye' }, g);
      return g;
    }
    case 'tentacle': {
      const g = bo('g', { class: 'bobj tentacle' });
      bo('circle', { cx: p.x, cy: p.y, r: 6.5, class: 'tentacle-body' }, g);
      const t = bo('text', { x: p.x, y: p.y + 0.5, class: 'tentacle-label' }, g);
      t.textContent = obj.label != null ? obj.label : '';
      return g;
    }
    // ── 極朱雀專屬 ───────────────────────────────
    // 四色假名地板。位置由 quad 決定(場地固定),所以不吃 p 的位移。
    case 'quadrant': {
      const sec = QUAD_SECTORS[obj.quad] || QUAD_SECTORS.ne;
      const r = 100;
      const p0 = quadDeg(sec.a0, r), p1 = quadDeg(sec.a1, r);
      const g = bo('g', {
        class: `bobj quad quad-${obj.floor || 'brown'}${+obj.boom ? ' quad-boom' : ''}`,
      });
      bo('path', {
        class: 'quad-fill',
        d: `M0,0 L${p0.x},${p0.y} A${r},${r} 0 0,1 ${p1.x},${p1.y} Z`,
      }, g);
      const c = quadDeg(sec.a0 + 45, 58);
      bo('text', { x: c.x, y: c.y, class: 'quad-glyph' }, g).textContent = obj.glyph || '';
      return g;
    }
    case 'tower': {
      const g = bo('g', { class: 'bobj tower' });
      bo('circle', { cx: p.x, cy: p.y, r: obj.r, class: 'tower-ring' }, g);
      bo('circle', { cx: p.x, cy: p.y, r: obj.r * 0.42, class: 'tower-core' }, g);
      return g;
    }
    case 'feather': {
      const big = obj.size === 'big';
      const g = bo('g', {
        class: `bobj feather feather-${big ? 'big' : 'small'}${+obj.cleared ? ' feather-cleared' : ''}`,
      });
      if (!+obj.cleared) bo('circle', { cx: p.x, cy: p.y, r: obj.r, class: 'feather-aura' }, g);
      const h = big ? 13 : 8;
      bo('path', {
        class: 'feather-quill',
        d: `M${p.x},${p.y - h} Q${p.x + h * 0.42},${p.y} ${p.x},${p.y + h} Q${p.x - h * 0.42},${p.y} ${p.x},${p.y - h} Z`,
      }, g);
      return g;
    }
    case 'bird': {
      const g = bo('g', { class: `bobj bird bird-${+obj.alive ? 'alive' : 'dead'}` });
      bo('path', {
        class: 'bird-body',
        d: `M${p.x - 7},${p.y + 4} L${p.x},${p.y - 6} L${p.x + 7},${p.y + 4} L${p.x},${p.y + 1} Z`,
      }, g);
      return g;
    }
    case 'xmark': {
      const s = obj.size || 7;
      const g = bo('g', { class: 'bobj xmark' });
      bo('path', {
        d: `M${p.x - s},${p.y - s} L${p.x + s},${p.y + s} M${p.x + s},${p.y - s} L${p.x - s},${p.y + s}`,
      }, g);
      return g;
    }
    // 場外的「詩」文字列。文字順序就是地板爆炸順序,是這個機制的判讀依據。
    case 'poem-strip': {
      const chars = [...String(obj.text || '')];
      const g = bo('g', { class: 'bobj poem-strip' });
      if (!chars.length) return g;
      const x = obj.side === 'west' ? -112 : 112;
      const gap = chars.length > 4 ? 25 : 34;
      const y0 = -((chars.length - 1) * gap) / 2;
      chars.forEach((ch, i) => {
        const y = y0 + i * gap;
        const cg = bo('g', { class: `ps-cell ps-${POEM_FLOOR[ch] || 'generic'}` }, g);
        bo('circle', { cx: x, cy: y, r: gap * 0.42 }, cg);
        bo('text', { x, y: y + 0.5, class: 'ps-glyph' }, cg).textContent = ch;
      });
      return g;
    }
    case 'marker':
      return renderBoardMarker(obj, p);
    default:
      return bo('g');
  }
}

/** 連線端點:可以是實體 id(跟隨移動),也可以是固定座標 {x,y}(攻略導入的場上定點) */
function resolveEndpointPos(state, ref) {
  if (ref && typeof ref === 'object') return { x: ref.x || 0, y: ref.y || 0 };
  const entity = state.getEntity(ref);
  return entity ? state.effectivePosition(entity) : { x: 0, y: 0 };
}

function renderBoardMarker(obj, p) {
  const g = bo('g', { class: `bobj marker-group ann-${obj.color || 'white'}`, transform: `translate(${p.x},${p.y})` });
  switch (obj.markerType) {
    case 'share':
      bo('circle', { cx: 0, cy: 0, r: 13, class: 'marker-share-outer' }, g);
      bo('circle', { cx: 0, cy: 0, r: 8.5, class: 'marker-share-inner' }, g);
      break;
    case 'triangle':
      bo('path', { d: 'M0,-14 L8,8 L-8,8 Z', class: 'marker-triangle' }, g);
      break;
    case 'target': {
      const s = 11;
      for (const [dx, dy, rot] of [[-s, -s, 0], [s, -s, 90], [s, s, 180], [-s, s, 270]]) {
        bo('path', { d: 'M-3,1 L-3,-3 L1,-3', transform: `translate(${dx},${dy}) rotate(${rot})`, class: 'marker-target-corner' }, g);
      }
      break;
    }
    case 'death':
      bo('circle', { cx: 0, cy: 0, r: 11, class: 'marker-death-bg' }, g);
      bo('text', { x: 0, y: 0.5, class: 'marker-death-text' }, g).textContent = '☠';
      break;
    case 'forbid':
      bo('circle', { cx: 0, cy: 0, r: 11, class: 'marker-forbid-circle' }, g);
      bo('line', { x1: -7.5, y1: -7.5, x2: 7.5, y2: 7.5, class: 'marker-forbid-slash' }, g);
      break;
    case 'text': {
      const bg = bo('rect', { x: -1, y: -9, width: 2, height: 18, class: 'marker-text-bg' }, g);
      const t = bo('text', { x: 0, y: 0.5, class: 'marker-text-label' }, g);
      t.textContent = obj.text || '';
      // 節點還沒進 DOM,量不到實際寬度,只能估。全角字約 1em、半角約 0.55em,
      // 全部當 1em 算會讓英數字串的底板明顯過寬。
      const w = Math.max(18, estimateTextWidth(obj.text || '', 8) + 10);
      bg.setAttribute('x', -w / 2); bg.setAttribute('width', w);
      break;
    }
  }
  return g;
}
