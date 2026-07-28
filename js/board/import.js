/* import.js — 從攻略資料(data/<raidId>.js 的 RAID_DATA)導入盤面到白板
 *
 * 兩邊座標系相同(場地中心為原點、半徑 100),差別在資料模型:
 *   攻略:每個 step 自帶完整畫面(actors / aoes / tethers / annotations / markers),彼此獨立。
 *   白板:物件是全域清單,每個影格只存「哪些物件是什麼狀態」的快照。
 * 因此導入時,每個 step 的物件都會被建成獨立實體,並在「不屬於自己的影格」中設為隱藏。
 */

/* 攻略的機制語意色 → 白板的一般顏色命名 */
const GUIDE_COLOR_MAP = {
  fire: 'orange', ice: 'yellow', thunder: 'blue', void: 'purple', death: 'red',
  accent: 'cyan', purple: 'magenta', white: 'white', generic: 'white',
  yellow: 'yellow', red: 'red', blue: 'blue', green: 'green',
};
function guideColor(c) { return GUIDE_COLOR_MAP[c] || 'white'; }

/** 三角點名畫在人頭上方,與白板手動放置標註的偏移一致 */
const MARKER_HEAD_OFFSET = -16;

function loadGuideRaid(raidId) {
  return new Promise((resolve, reject) => {
    if (window.RAID_DATA && window.RAID_DATA[raidId]) { resolve(window.RAID_DATA[raidId]); return; }
    const s = document.createElement('script');
    s.src = `data/${raidId}.js`;
    s.onload = () => {
      const data = (window.RAID_DATA || {})[raidId];
      data ? resolve(data) : reject(new Error(`攻略資料 data/${raidId}.js 內容不正確`));
    };
    s.onerror = () => reject(new Error(`找不到攻略資料 data/${raidId}.js`));
    document.head.appendChild(s);
  });
}

/** 把一個攻略 step 轉成白板實體。
 * running:跨 step 延續的玩家位置(攻略某些 step 只寫部分角色,未提及者維持前一格位置)。
 * 回傳的 objects 已帶好 id,連線可直接引用。 */
function convertGuideStep(step, running) {
  for (const role of PLAYER_ROLES) {
    const pos = step.actors && step.actors[role];
    if (pos) running[role] = { x: pos.x, y: pos.y };
  }
  const actors = {};
  for (const role of PLAYER_ROLES) actors[role] = { ...(running[role] || { x: 0, y: 0 }) };

  const boss = step.boss
    ? { x: step.boss.x, y: step.boss.y, facing: typeof step.boss.facing === 'number' ? step.boss.facing : null, visible: true }
    : { x: 0, y: 0, facing: null, visible: false };

  const objects = [];
  const byPoint = new Map();   // "x,y" → 物件 id,讓「以座標指定的連線端點」能接到剛建立的物件(黑洞)

  const point = (ref) => {
    if (Array.isArray(ref)) return { x: ref[0], y: ref[1] };
    if (ref === 'boss') return { x: boss.x, y: boss.y };
    if (typeof ref === 'string' && actors[ref]) return { ...actors[ref] };
    return { x: 0, y: 0 };
  };
  /** 能吸附到兵棋就吸附(之後拖兵棋時範圍會跟著跑),否則用絕對座標 */
  const place = (ref) => {
    if (ref === 'boss') return { attachTo: 'BOSS', dx: 0, dy: 0 };
    if (typeof ref === 'string' && actors[ref]) return { attachTo: ref, dx: 0, dy: 0 };
    const p = point(ref);
    return { x: p.x, y: p.y };
  };
  const push = (spec, atRef) => {
    const obj = { id: nextObjectId(), locked: false, sync: false, visible: true, ...spec };
    objects.push(obj);
    if (Array.isArray(atRef)) byPoint.set(`${atRef[0]},${atRef[1]}`, obj.id);
    return obj;
  };

  for (const a of step.aoes || []) {
    const at = a.at != null ? a.at : [a.x || 0, a.y || 0];
    const pos = place(at);
    switch (a.type) {
      case 'circle':
        push({ kind: 'aoe-circle', ...pos, r: a.r || 12, color: guideColor(a.color) }, at); break;
      case 'donut':
        push({ kind: 'aoe-donut', ...pos, rOuter: a.rOuter || 100, rInner: a.rInner || 40, color: guideColor(a.color) }, at); break;
      case 'cone':
        push({ kind: 'aoe-cone', ...pos, angle: a.angle || 0, spread: a.spread || 90, r: a.r || 100, color: guideColor(a.color) }, at); break;
      case 'blackhole':
        push({ kind: 'blackhole', ...pos, r: a.r || 10 }, at); break;
      case 'tentacle':
        push({ kind: 'tentacle', ...pos, label: a.label != null ? String(a.label) : '' }, at); break;
    }
  }

  const endpoint = (ref) => {
    if (Array.isArray(ref)) {
      const hit = byPoint.get(`${ref[0]},${ref[1]}`);
      return hit || { x: ref[0], y: ref[1] };
    }
    if (ref === 'boss') return 'BOSS';
    if (typeof ref === 'string' && actors[ref]) return ref;
    const p = point(ref);
    return { x: p.x, y: p.y };
  };
  for (const t of step.tethers || []) {
    push({ kind: 'tether', from: endpoint(t.from), to: endpoint(t.to), color: guideColor(t.color || 'purple') });
  }

  for (const an of step.annotations || []) {
    switch (an.type) {
      case 'arrow': {
        const a = point(an.from), b = point(an.to);
        push({ kind: 'arrow-line', x1: a.x, y1: a.y, x2: b.x, y2: b.y, color: guideColor(an.color || 'white') });
        break;
      }
      case 'arcArrow':
        push({
          kind: 'arrow-arc', radius: an.radius || 80,
          start: an.startAngle || 0, end: an.endAngle || 0,
          dir: an.dir === 'ccw' ? 'ccw' : 'cw', color: guideColor(an.color || 'white'),
        });
        break;
      case 'knockback': {
        const at = an.at != null ? an.at : [0, 0];
        push({
          kind: 'knockback', ...place(at),
          count: an.count || 8, rInner: an.rInner || 18, rOuter: an.rOuter || 38,
          color: guideColor(an.color || 'white'),
        }, at);
        break;
      }
      case 'text': {
        const at = an.at != null ? an.at : [0, 0];
        push({ kind: 'marker', markerType: 'text', text: an.text || '', ...place(at), color: guideColor(an.color || 'white') }, at);
        break;
      }
    }
  }

  for (const m of step.markers || []) {
    const at = m.at != null ? m.at : [0, 0];
    const markerType = ['share', 'triangle', 'target'].includes(m.type) ? m.type : 'share';
    const pos = place(at);
    if (markerType === 'triangle') {
      if (pos.attachTo) pos.dy = MARKER_HEAD_OFFSET; else pos.y += MARKER_HEAD_OFFSET;
    }
    push({ kind: 'marker', markerType, ...pos, color: 'white' }, at);
  }

  return { actors, boss, objects, note: step.caption || '' };
}

/** 把選定的攻略步驟寫入白板。
 * mode:'overwrite' = 覆蓋(多格時清空整條時間軸,單格時只覆蓋目前影格);'append' = 接在目前影格之後。 */
function applyGuideImport(state, steps, mode) {
  const overwriteAll = mode === 'overwrite' && steps.length > 1;

  if (overwriteAll) {
    state.objects = [];
    state.timeline.frames = [];
    state.timeline.currentIndex = -1;
    state.clearSelection({ silent: true });
  }
  const preExistingIds = state.objects.map((o) => o.id);

  // 玩家位置以目前盤面為延續起點,攻略沒提到的角色就留在原地
  const running = {};
  for (const t of state.tokens) if (t.kind === 'player') running[t.id] = { x: t.x, y: t.y };

  const converted = steps.map((s) => convertGuideStep(s, running));
  for (const c of converted) state.objects.push(...c.objects);
  const allNewIds = converted.flatMap((c) => c.objects.map((o) => o.id));

  // 既有影格看不到新導入的物件
  for (const f of state.timeline.frames) {
    for (const id of allNewIds) f.snapshot[id] = { visible: false };
  }

  const newFrames = converted.map((c) => {
    const snapshot = {};
    for (const role of PLAYER_ROLES) snapshot[role] = { x: c.actors[role].x, y: c.actors[role].y, visible: true };
    snapshot.BOSS = { x: c.boss.x, y: c.boss.y, facing: c.boss.facing, visible: c.boss.visible };
    const own = new Set(c.objects.map((o) => o.id));
    for (const id of allNewIds) {
      snapshot[id] = own.has(id) ? state._captureFields(state.getObject(id)) : { visible: false };
    }
    // 新影格中不顯示導入前就存在的物件,避免兩批內容疊在一起
    for (const id of preExistingIds) snapshot[id] = { visible: false };
    return { snapshot, note: c.note };
  });

  const frames = state.timeline.frames;
  let landing;
  if (overwriteAll || !frames.length) {
    state.timeline.frames = newFrames;
    landing = 0;
  } else if (mode === 'overwrite') {
    const i = Math.max(0, state.timeline.currentIndex);
    frames.splice(i, 1, newFrames[0]);
    landing = i;
  } else {
    const at = state.timeline.currentIndex + 1;
    frames.splice(at, 0, ...newFrames);
    landing = at;
  }

  state.timeline.currentIndex = landing;
  state.goToFrame(landing);
}

/* ── 彈窗介面 ───────────────────────────────────── */

/** onRequestArena(raidId):由 app.js 提供,負責把白板切換到該攻略對應的場地/階段 */
function initGuideImportUI(state, onRequestArena) {
  const modal = document.getElementById('import-modal');
  const openBtn = document.getElementById('import-guide-btn');
  const closeBtn = document.getElementById('import-close');
  const raidSelect = document.getElementById('import-raid-select');
  const sectionSelect = document.getElementById('import-section-select');
  const selectAll = document.getElementById('import-select-all');
  const stepList = document.getElementById('import-step-list');
  const countEl = document.getElementById('import-count');
  const overwriteBtn = document.getElementById('import-overwrite-btn');
  const appendBtn = document.getElementById('import-append-btn');

  let raidData = null;

  for (const r of window.RAID_LIST || []) {
    const opt = document.createElement('option');
    opt.value = r.id; opt.textContent = r.name;
    raidSelect.appendChild(opt);
  }

  /** 目前列出的章節(全部章節時為所有有步驟的章節) */
  function visibleSections() {
    if (!raidData) return [];
    const withSteps = (raidData.sections || []).filter((s) => (s.steps || []).length);
    if (sectionSelect.value === '*') return withSteps;
    return withSteps.filter((s) => s.id === sectionSelect.value);
  }

  function renderSections() {
    sectionSelect.innerHTML = '';
    const all = document.createElement('option');
    all.value = '*'; all.textContent = '★ 全部階段';
    sectionSelect.appendChild(all);
    for (const s of (raidData.sections || [])) {
      if (!(s.steps || []).length) continue;
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = `${s.title}(${s.steps.length} 格)`;
      sectionSelect.appendChild(opt);
    }
    sectionSelect.value = sectionSelect.options[1] ? sectionSelect.options[1].value : '*';
  }

  function renderSteps() {
    stepList.innerHTML = '';
    const sections = visibleSections();
    const multi = sections.length > 1;
    for (const sec of sections) {
      if (multi) {
        const t = document.createElement('div');
        t.className = 'step-group-title';
        t.textContent = sec.title;
        stepList.appendChild(t);
      }
      sec.steps.forEach((step, i) => {
        const row = document.createElement('label');
        row.className = 'step-item';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = true;
        cb.dataset.sectionId = sec.id;
        cb.dataset.stepIndex = i;
        cb.addEventListener('change', syncCount);
        const txt = document.createElement('span');
        txt.textContent = `${i + 1}. ${step.caption || '(無說明)'}`;
        row.append(cb, txt);
        stepList.appendChild(row);
      });
    }
    selectAll.checked = true;
    syncCount();
  }

  function checkedBoxes() {
    return [...stepList.querySelectorAll('input[type=checkbox]')].filter((c) => c.checked);
  }

  function syncCount() {
    const n = checkedBoxes().length;
    const total = stepList.querySelectorAll('input[type=checkbox]').length;
    selectAll.checked = n > 0 && n === total;
    selectAll.indeterminate = n > 0 && n < total;
    countEl.textContent = n ? `已選 ${n} 格` : '尚未選擇任何影格';
    overwriteBtn.disabled = appendBtn.disabled = n === 0;
    overwriteBtn.textContent = n > 1 ? '導入並覆蓋全部影格' : '導入並覆蓋目前影格';
  }

  function selectedSteps() {
    const byId = new Map((raidData.sections || []).map((s) => [s.id, s]));
    return checkedBoxes().map((cb) => byId.get(cb.dataset.sectionId).steps[Number(cb.dataset.stepIndex)]);
  }

  async function loadRaid(raidId) {
    raidData = await loadGuideRaid(raidId);
    renderSections();
    renderSteps();
  }

  async function runImport(mode) {
    const steps = selectedSteps();
    if (!steps.length) return;
    try {
      await onRequestArena(raidSelect.value);
      applyGuideImport(state, steps, mode);
      modal.hidden = true;
    } catch (e) {
      console.error(e);
      alert('導入失敗:' + e.message);
    }
  }

  openBtn.addEventListener('click', async () => {
    modal.hidden = false;
    const wanted = (state.phaseDef && state.phaseDef.guideRaidId) || raidSelect.value;
    if (raidSelect.value !== wanted || !raidData) {
      if ([...raidSelect.options].some((o) => o.value === wanted)) raidSelect.value = wanted;
      try {
        await loadRaid(raidSelect.value);
      } catch (e) {
        stepList.innerHTML = '';
        countEl.textContent = e.message;
      }
    }
  });
  closeBtn.addEventListener('click', () => { modal.hidden = true; });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });
  raidSelect.addEventListener('change', () => loadRaid(raidSelect.value).catch((e) => alert(e.message)));
  sectionSelect.addEventListener('change', renderSteps);
  selectAll.addEventListener('change', () => {
    stepList.querySelectorAll('input[type=checkbox]').forEach((c) => { c.checked = selectAll.checked; });
    syncCount();
  });
  overwriteBtn.addEventListener('click', () => runImport('overwrite'));
  appendBtn.addEventListener('click', () => runImport('append'));
}
