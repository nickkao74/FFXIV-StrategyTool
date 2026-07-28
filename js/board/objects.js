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
};

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
      // 依文字寬度粗估調整背景寬度
      const w = Math.max(18, (obj.text || '').length * 8 + 8);
      bg.setAttribute('x', -w / 2); bg.setAttribute('width', w);
      break;
    }
  }
  return g;
}
