/* app.js — 白板主控:場地/階段切換、工具列、物件面板、畫布掛載 */

const TOOL_GROUPS = [
  { tools: [{ id: 'select', label: '選取', icon: '↖' }] },
  {
    title: '地毯', tools: [
      { id: 'aoe-circle', label: '圓形', icon: '○' },
      { id: 'aoe-donut', label: '環形', icon: '◎' },
      { id: 'aoe-rect', label: '長方形', icon: '▭' },
      { id: 'aoe-cone', label: '扇形', icon: '◺' },
    ],
  },
  {
    title: '常見預設', tools: [
      { id: 'preset-spread', label: '玩家分散地毯', icon: '✦', action: true },
      { id: 'knockback', label: '擊退', icon: '✺' },
    ],
  },
  {
    title: '箭頭', tools: [
      { id: 'arrow-line', label: '直線', icon: '↗' },
      { id: 'arrow-arc-cw', label: '順時針弧', icon: '↻' },
      { id: 'arrow-arc-ccw', label: '逆時針弧', icon: '↺' },
    ],
  },
  { title: '連線', tools: [{ id: 'tether', label: '連線', icon: '⌇' }] },
  {
    title: '標註', tools: [
      { id: 'marker-share', label: '分攤', icon: '◈' },
      { id: 'marker-triangle', label: '三角', icon: '▲' },
      { id: 'marker-death', label: '死刑', icon: '☠' },
      { id: 'marker-forbid', label: '禁止', icon: '⛔' },
      { id: 'marker-text', label: '文字', icon: 'T' },
    ],
  },
];

const COLOR_OPTIONS = [
  ['red', '紅'], ['orange', '橘'], ['yellow', '黃'], ['green', '綠'], ['cyan', '青'],
  ['blue', '藍'], ['purple', '紫'], ['magenta', '桃'], ['white', '白'],
];

const PROPERTY_SCHEMAS = {
  'aoe-circle': [{ key: 'r', label: '半徑', type: 'number', min: 2, max: 100 }, { key: 'color', label: '顏色', type: 'color' }],
  'aoe-donut': [{ key: 'rOuter', label: '外半徑', type: 'number', min: 2, max: 100 }, { key: 'rInner', label: '內半徑', type: 'number', min: 1, max: 99 }, { key: 'color', label: '顏色', type: 'color' }],
  'aoe-rect': [{ key: 'w', label: '寬', type: 'number', min: 2, max: 200 }, { key: 'h', label: '高', type: 'number', min: 2, max: 200 }, { key: 'rot', label: '旋轉角', type: 'number', min: 0, max: 359 }, { key: 'color', label: '顏色', type: 'color' }],
  'aoe-cone': [{ key: 'angle', label: '朝向角', type: 'number', min: 0, max: 359 }, { key: 'spread', label: '張角', type: 'number', min: 1, max: 360 }, { key: 'r', label: '半徑', type: 'number', min: 2, max: 150 }, { key: 'color', label: '顏色', type: 'color' }],
  'knockback': [{ key: 'count', label: '箭頭數', type: 'number', min: 3, max: 24 }, { key: 'rInner', label: '內半徑', type: 'number', min: 1, max: 100 }, { key: 'rOuter', label: '外半徑', type: 'number', min: 2, max: 150 }, { key: 'color', label: '顏色', type: 'color' }],
  'arrow-line': [{ key: 'color', label: '顏色', type: 'color' }],
  'arrow-arc': [{ key: 'radius', label: '半徑', type: 'number', min: 2, max: 150 }, { key: 'start', label: '起始角', type: 'number', min: 0, max: 359 }, { key: 'end', label: '結束角', type: 'number', min: 0, max: 359 }, { key: 'dir', label: '方向', type: 'select', options: [['cw', '順時針'], ['ccw', '逆時針']] }, { key: 'color', label: '顏色', type: 'color' }],
  'tether': [{ key: 'color', label: '顏色', type: 'color' }],
  'marker': [], // 依 markerType 動態附加(見 renderPropertyPanel)
  'blackhole': [{ key: 'r', label: '半徑', type: 'number', min: 2, max: 60 }],
  'tentacle': [{ key: 'label', label: '編號', type: 'text' }],
};

function loadArenaScript(arenaId) {
  return new Promise((resolve, reject) => {
    if (window.ARENA_DATA && window.ARENA_DATA[arenaId]) {
      resolve(window.ARENA_DATA[arenaId]);
      return;
    }
    const s = document.createElement('script');
    s.src = `data/arenas/${arenaId}.js`;
    s.onload = () => {
      const data = (window.ARENA_DATA || {})[arenaId];
      data ? resolve(data) : reject(new Error(`場地資料 data/arenas/${arenaId}.js 內容不正確`));
    };
    s.onerror = () => reject(new Error(`找不到場地資料 data/arenas/${arenaId}.js`));
    document.head.appendChild(s);
  });
}

const TOKEN_LABELS = { player: '玩家', boss: 'BOSS', waymark: '場地標記' };
const OBJECT_LABELS = {
  'aoe-circle': '圓形地毯', 'aoe-donut': '環形地毯', 'aoe-rect': '長方地毯', 'aoe-cone': '扇形地毯',
  'knockback': '擊退', 'arrow-line': '直線箭頭', 'arrow-arc': '弧形箭頭', 'tether': '連線',
  'blackhole': '黑洞', 'tentacle': '觸手',
  'marker': { share: '分攤標記', triangle: '三角標記', target: '目標標記', death: '死刑標記', forbid: '禁止標記', text: '文字標記' },
};
function objectLabel(o) {
  if (o.kind === 'marker') return OBJECT_LABELS.marker[o.markerType] || '標註';
  if (o.kind === 'tentacle') return `觸手 ${o.label || ''}`.trim();
  return OBJECT_LABELS[o.kind] || o.kind;
}

/** 物件子分組(依種類自動分類,各分組可整組收合/鎖定)*/
const OBJECT_GROUPS = [
  { id: 'aoe', title: '地毯 / 範圍', match: (o) => ['aoe-circle', 'aoe-donut', 'aoe-rect', 'aoe-cone', 'knockback'].includes(o.kind) },
  { id: 'arrow', title: '箭頭', match: (o) => ['arrow-line', 'arrow-arc'].includes(o.kind) },
  { id: 'tether', title: '連線', match: (o) => o.kind === 'tether' },
  { id: 'marker', title: '標註', match: (o) => o.kind === 'marker' },
  { id: 'special', title: '副本專屬', match: (o) => ['blackhole', 'tentacle'].includes(o.kind) },
];

async function boardMain() {
  const state = new BoardState();
  const canvas = new BoardCanvas(document.getElementById('board-canvas'), state);
  canvas.onToolComplete = () => syncToolButtons();

  const arenaSelect = document.getElementById('arena-select');
  const phaseTabs = document.getElementById('phase-tabs');
  const resetBtn = document.getElementById('reset-tokens-btn');
  const toolBar = document.getElementById('tool-bar');
  const propertyPanel = document.getElementById('property-panel');
  const objectList = document.getElementById('object-list');

  // ── 場地下拉選單 ──────────────────────
  const index = window.ARENA_INDEX || [];
  for (const a of index) {
    const opt = document.createElement('option');
    opt.value = a.id; opt.textContent = a.name;
    arenaSelect.appendChild(opt);
  }

  let currentArenaDef = null;

  async function setArena(arenaId) {
    currentArenaDef = await loadArenaScript(arenaId);
    arenaSelect.value = arenaId;
    renderPhaseTabs();
    setPhase(currentArenaDef.phases[0].id, { keepTokens: false });
  }

  function renderPhaseTabs() {
    phaseTabs.innerHTML = '';
    for (const phase of currentArenaDef.phases) {
      const btn = document.createElement('button');
      btn.className = 'phase-tab';
      btn.textContent = phase.name;
      btn.dataset.phaseId = phase.id;
      btn.addEventListener('click', () => setPhase(phase.id, { keepTokens: true }));
      phaseTabs.appendChild(btn);
    }
  }

  function setPhase(phaseId, { keepTokens }) {
    const phaseDef = currentArenaDef.phases.find((p) => p.id === phaseId);
    canvas.setPhase(currentArenaDef, phaseDef);
    state.loadPhase(currentArenaDef, phaseDef, { keepTokens });
    [...phaseTabs.children].forEach((b) => b.classList.toggle('active', b.dataset.phaseId === phaseId));
    followPhaseInSpecialTools(phaseDef);
  }

  /** 導入攻略前把白板切到該攻略對應的場地/階段;找不到對照就沿用目前場地 */
  async function ensureArenaForRaid(raidId) {
    for (const a of index) {
      const def = await loadArenaScript(a.id);
      const phase = def.phases.find((p) => p.guideRaidId === raidId);
      if (!phase) continue;
      if (state.arenaId === def.id && state.phaseId === phase.id) return;
      currentArenaDef = def;
      arenaSelect.value = def.id;
      renderPhaseTabs();
      setPhase(phase.id, { keepTokens: false });
      return;
    }
  }

  arenaSelect.addEventListener('change', () => setArena(arenaSelect.value));
  resetBtn.addEventListener('click', () => {
    if (!confirm('確定要重置所有兵棋站位嗎?此動作無法復原。')) return;
    state.resetTokensToDefault();
  });

  // ── 工具列 ────────────────────────────
  function syncToolButtons() {
    [...toolBar.querySelectorAll('.tool-btn')].forEach((b) =>
      b.classList.toggle('active', b.dataset.tool === canvas.tool));
  }

  function makeToolButton(t) {
    const btn = document.createElement('button');
    btn.className = 'tool-btn';
    btn.dataset.tool = t.id;
    btn.title = t.label;
    btn.innerHTML = `<span class="tool-icon">${t.icon}</span><span class="tool-label">${t.label}</span>`;
    btn.addEventListener('click', () => {
      if (t.action) { runPresetAction(t.id); return; }
      canvas.setTool(t.id === canvas.tool ? 'select' : t.id);
      syncToolButtons();
    });
    return btn;
  }

  for (const group of TOOL_GROUPS) {
    if (group.title) {
      const label = document.createElement('div');
      label.className = 'tool-group-title';
      label.textContent = group.title;
      toolBar.appendChild(label);
    }
    const row = document.createElement('div');
    row.className = 'tool-group-row';
    for (const t of group.tools) row.appendChild(makeToolButton(t));
    toolBar.appendChild(row);
  }

  // ── 副本專屬工具(只在選定副本時列出,避免通用工具列被冷門物件塞滿)──
  const specialTitle = document.createElement('div');
  specialTitle.className = 'tool-group-title';
  specialTitle.textContent = '副本專屬';
  toolBar.appendChild(specialTitle);

  const specialSelect = document.createElement('select');
  specialSelect.id = 'special-raid-select';
  for (const r of window.RAID_LIST || []) {
    const opt = document.createElement('option');
    opt.value = r.id; opt.textContent = r.name;
    specialSelect.appendChild(opt);
  }
  toolBar.appendChild(specialSelect);

  const specialRow = document.createElement('div');
  specialRow.className = 'tool-group-row';
  toolBar.appendChild(specialRow);

  function renderSpecialTools() {
    specialRow.innerHTML = '';
    const items = (window.BOARD_SPECIAL_OBJECTS || []).filter((o) => o.raids.includes(specialSelect.value));
    if (!items.length) {
      const p = document.createElement('p');
      p.className = 'tool-special-empty';
      p.textContent = '此副本沒有專屬物件。';
      specialRow.appendChild(p);
      return;
    }
    for (const it of items) specialRow.appendChild(makeToolButton({ id: it.kind, label: it.label, icon: it.icon }));
    syncToolButtons();
  }
  specialSelect.addEventListener('change', renderSpecialTools);

  /** 切換階段時,副本專屬下拉預設跟著走(使用者仍可自行改選) */
  function followPhaseInSpecialTools(phaseDef) {
    const raidId = phaseDef && phaseDef.guideRaidId;
    if (raidId && [...specialSelect.options].some((o) => o.value === raidId)) specialSelect.value = raidId;
    renderSpecialTools();
  }

  renderSpecialTools();
  syncToolButtons();

  function runPresetAction(id) {
    if (id === 'preset-spread') {
      for (const role of PLAYER_ROLES) {
        state.addObject({ kind: 'aoe-circle', attachTo: role, dx: 0, dy: 0, r: 15, color: 'cyan' });
      }
    }
  }

  // ── 屬性面板 ──────────────────────────
  // 輸入框自身觸發的變更不重建面板(避免每打一個字就整個 DOM 重建、輸入框失焦)
  let suppressPropertyRerender = false;

  /** BOSS 的面向角(其他兵棋沒有可調參數) */
  function renderBossProperties() {
    const t = state.getToken(state.selectedId);
    if (!t || t.kind !== 'boss') { propertyPanel.style.display = 'none'; return; }
    propertyPanel.style.display = '';

    const title = document.createElement('h3');
    title.textContent = 'BOSS';
    propertyPanel.appendChild(title);

    const row = document.createElement('label');
    row.className = 'prop-row';
    const cap = document.createElement('span');
    cap.textContent = '面向角';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = 0; input.max = 359;
    input.placeholder = '不顯示';
    input.value = typeof t.facing === 'number' ? t.facing : '';
    input.addEventListener('input', () => {
      suppressPropertyRerender = true;
      state.updateToken(t.id, { facing: input.value === '' ? null : Number(input.value) });
      suppressPropertyRerender = false;
    });
    row.append(cap, input);
    propertyPanel.appendChild(row);

    const hint = document.createElement('p');
    hint.className = 'list-empty';
    hint.textContent = '0 = 面向 A(正上方),順時針增加;留空則不顯示朝向箭頭。';
    propertyPanel.appendChild(hint);
  }

  function renderPropertyPanel() {
    propertyPanel.innerHTML = '';
    if (state.selectedKind === 'token') { renderBossProperties(); return; }
    if (state.selectedKind !== 'object') { propertyPanel.style.display = 'none'; return; }
    const obj = state.getObject(state.selectedId);
    if (!obj) { propertyPanel.style.display = 'none'; return; }
    propertyPanel.style.display = '';

    const title = document.createElement('h3');
    title.textContent = objectLabel(obj);
    propertyPanel.appendChild(title);

    let schema = PROPERTY_SCHEMAS[obj.kind] || [];
    if (obj.kind === 'marker' && obj.markerType === 'text') {
      schema = [{ key: 'text', label: '文字', type: 'text' }];
    }
    for (const field of schema) {
      const row = document.createElement('label');
      row.className = 'prop-row';
      const cap = document.createElement('span');
      cap.textContent = field.label;
      row.appendChild(cap);

      let input;
      if (field.type === 'select') {
        input = document.createElement('select');
        for (const [val, lbl] of field.options) {
          const opt = document.createElement('option');
          opt.value = val; opt.textContent = lbl;
          input.appendChild(opt);
        }
        input.value = obj[field.key];
      } else if (field.type === 'color') {
        input = document.createElement('select');
        for (const [val, lbl] of COLOR_OPTIONS) {
          const opt = document.createElement('option');
          opt.value = val; opt.textContent = lbl;
          input.appendChild(opt);
        }
        input.value = obj[field.key];
      } else if (field.type === 'text') {
        input = document.createElement('input');
        input.type = 'text';
        input.value = obj[field.key] || '';
      } else {
        input = document.createElement('input');
        input.type = 'number';
        if (field.min != null) input.min = field.min;
        if (field.max != null) input.max = field.max;
        input.value = obj[field.key];
      }
      input.addEventListener('input', () => {
        const v = field.type === 'number' ? Number(input.value) : input.value;
        suppressPropertyRerender = true;
        state.updateObject(obj.id, { [field.key]: v });
        suppressPropertyRerender = false;
      });
      row.appendChild(input);
      propertyPanel.appendChild(row);
    }

    const btnRow = document.createElement('div');
    btnRow.className = 'prop-actions';
    if (obj.attachTo) {
      const detachBtn = document.createElement('button');
      detachBtn.className = 'toolbar-btn';
      detachBtn.textContent = '解除吸附';
      detachBtn.addEventListener('click', () => state.detachObject(obj.id));
      btnRow.appendChild(detachBtn);
    }
    const delBtn = document.createElement('button');
    delBtn.className = 'toolbar-btn danger';
    delBtn.textContent = '刪除';
    delBtn.addEventListener('click', () => state.removeObject(obj.id));
    btnRow.appendChild(delBtn);
    propertyPanel.appendChild(btnRow);
  }

  // ── 物件清單面板(可摺疊分區 + 整組鎖定)──────
  const collapsedGroups = new Set(); // UI 狀態,不隨盤面存檔

  function isAllLocked(items) {
    return items.length > 0 && items.every((i) => i.locked);
  }

  function makeSectionHeader({ groupId, title, items, kindOf }) {
    const header = document.createElement('div');
    header.className = 'list-section-header';

    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'list-collapse-btn';
    collapseBtn.textContent = collapsedGroups.has(groupId) ? '▸' : '▾';
    collapseBtn.addEventListener('click', () => {
      if (collapsedGroups.has(groupId)) collapsedGroups.delete(groupId);
      else collapsedGroups.add(groupId);
      renderObjectList();
    });
    header.appendChild(collapseBtn);

    const titleEl = document.createElement('h3');
    titleEl.textContent = `${title}(${items.length})`;
    header.appendChild(titleEl);

    if (items.length) {
      const allLocked = isAllLocked(items);
      const lockAllBtn = document.createElement('button');
      lockAllBtn.className = 'list-icon-btn' + (allLocked ? ' locked-all' : '');
      lockAllBtn.title = allLocked ? '解鎖整組' : '鎖定整組';
      lockAllBtn.textContent = allLocked ? '🔒' : '🔓';
      lockAllBtn.addEventListener('click', () => {
        const target = !isAllLocked(items);
        state.setManyLocked(items.map((it) => ({ kind: kindOf(it), id: it.id })), target);
      });
      header.appendChild(lockAllBtn);
    }
    return header;
  }

  function renderObjectList() {
    objectList.innerHTML = '';

    // ── 兵棋(玩家 + BOSS)──
    const playerTokens = state.tokens.filter((t) => t.kind === 'player' || t.kind === 'boss');
    const tokenSection = document.createElement('div');
    tokenSection.className = 'list-section';
    tokenSection.appendChild(makeSectionHeader({ groupId: 'tokens', title: '兵棋', items: playerTokens, kindOf: () => 'token' }));
    if (!collapsedGroups.has('tokens')) {
      for (const t of playerTokens) {
        tokenSection.appendChild(makeListRow({
          label: t.label + (t.kind !== 'player' ? `(${TOKEN_LABELS[t.kind]})` : ''),
          selected: state.isSelected('token', t.id),
          locked: t.locked,
          visible: t.visible !== false,
          sync: t.sync,
          onSelect: () => state.select('token', t.id),
          onLockToggle: () => state.toggleTokenLock(t.id),
          onVisToggle: () => state.toggleTokenVisible(t.id),
          onSyncToggle: () => state.toggleSync('token', t.id),
        }));
      }
    }
    objectList.appendChild(tokenSection);

    // ── 場地標記(獨立分類)──
    const waymarkTokens = state.tokens.filter((t) => t.kind === 'waymark');
    const wmSection = document.createElement('div');
    wmSection.className = 'list-section';
    wmSection.appendChild(makeSectionHeader({ groupId: 'waymarks', title: '場地標記', items: waymarkTokens, kindOf: () => 'token' }));
    if (!collapsedGroups.has('waymarks')) {
      for (const t of waymarkTokens) {
        wmSection.appendChild(makeListRow({
          label: t.label,
          selected: state.isSelected('token', t.id),
          locked: t.locked,
          visible: t.visible !== false,
          sync: t.sync,
          onSelect: () => state.select('token', t.id),
          onLockToggle: () => state.toggleTokenLock(t.id),
          onVisToggle: () => state.toggleTokenVisible(t.id),
          onSyncToggle: () => state.toggleSync('token', t.id),
        }));
      }
    }
    objectList.appendChild(wmSection);

    // ── 物件(依種類分子分組)──
    const objHeaderWrap = document.createElement('div');
    objHeaderWrap.className = 'list-section-title-only';
    objHeaderWrap.textContent = '物件';
    objectList.appendChild(objHeaderWrap);

    if (!state.objects.length) {
      const empty = document.createElement('p');
      empty.className = 'list-empty';
      empty.textContent = '尚無物件,使用左側工具列放置。';
      objectList.appendChild(empty);
    }

    for (const group of OBJECT_GROUPS) {
      const items = state.objects.filter(group.match);
      if (!items.length) continue;
      const groupId = `obj-${group.id}`;
      const groupSection = document.createElement('div');
      groupSection.className = 'list-section list-subgroup';
      groupSection.appendChild(makeSectionHeader({ groupId, title: group.title, items, kindOf: () => 'object' }));
      if (!collapsedGroups.has(groupId)) {
        for (const o of items) {
          groupSection.appendChild(makeListRow({
            label: objectLabel(o) + (o.attachTo ? ` → ${o.attachTo}` : ''),
            selected: state.isSelected('object', o.id),
            locked: o.locked,
            visible: o.visible !== false,
            sync: o.sync,
            onSelect: () => state.select('object', o.id),
            onLockToggle: () => state.toggleObjectLock(o.id),
            onVisToggle: () => state.toggleObjectVisible(o.id),
            onSyncToggle: () => state.toggleSync('object', o.id),
            onDelete: () => state.removeObject(o.id),
          }));
        }
      }
      objectList.appendChild(groupSection);
    }
  }

  function makeListRow({ label, selected, locked, visible = true, sync = false, onSelect, onLockToggle, onVisToggle, onSyncToggle, onDelete }) {
    const row = document.createElement('div');
    row.className = 'list-row' + (selected ? ' selected' : '');
    const nameBtn = document.createElement('button');
    nameBtn.className = 'list-name';
    nameBtn.textContent = label;
    nameBtn.addEventListener('click', onSelect);
    row.appendChild(nameBtn);

    if (onSyncToggle) {
      const syncBtn = document.createElement('button');
      syncBtn.className = 'list-icon-btn' + (sync ? ' sync-on' : '');
      syncBtn.title = sync ? '同步模式(所有影格共用,點擊改為逐格獨立)' : '逐格獨立(點擊改為同步全部影格)';
      syncBtn.textContent = sync ? '🔗' : '⛓';
      syncBtn.addEventListener('click', onSyncToggle);
      row.appendChild(syncBtn);
    }

    const lockBtnEl = document.createElement('button');
    lockBtnEl.className = 'list-icon-btn';
    lockBtnEl.title = locked ? '解鎖' : '鎖定';
    lockBtnEl.textContent = locked ? '🔒' : '🔓';
    lockBtnEl.addEventListener('click', onLockToggle);
    row.appendChild(lockBtnEl);

    if (onVisToggle) {
      const visBtn = document.createElement('button');
      visBtn.className = 'list-icon-btn';
      visBtn.title = visible ? '隱藏' : '顯示';
      visBtn.textContent = visible ? '👁' : '🚫';
      visBtn.addEventListener('click', onVisToggle);
      row.appendChild(visBtn);
    }
    if (onDelete) {
      const delBtn = document.createElement('button');
      delBtn.className = 'list-icon-btn danger';
      delBtn.title = '刪除';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', onDelete);
      row.appendChild(delBtn);
    }
    return row;
  }

  // ── 鍵盤:Delete 刪除選取物件 ─────────────
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    if (state.selectedKind === 'object') state.removeObject(state.selectedId);
  });

  // ── 時間軸 ────────────────────────────
  const timelineFramesEl = document.getElementById('timeline-frames');
  const addFrameBtn = document.getElementById('timeline-add-btn');
  const playBtn = document.getElementById('timeline-play-btn');
  const prevFrameBtn = document.getElementById('timeline-prev-btn');
  const nextFrameBtn = document.getElementById('timeline-next-btn');
  const dupFrameBtn = document.getElementById('timeline-dup-btn');
  const delFrameBtn = document.getElementById('timeline-del-btn');
  const moveLeftBtn = document.getElementById('timeline-moveleft-btn');
  const moveRightBtn = document.getElementById('timeline-moveright-btn');
  const holdSecInput = document.getElementById('timeline-holdsec');
  const frameNoteInput = document.getElementById('frame-note-input');
  let playTimer = null;
  let isPlaying = false;

  // ── 影格說明(右側欄最上方)───────────────
  frameNoteInput.addEventListener('input', () => state.setFrameNote(frameNoteInput.value));

  function renderFrameNote() {
    const frame = state.timeline.frames[state.timeline.currentIndex];
    frameNoteInput.disabled = !frame;
    frameNoteInput.placeholder = frame ? '為這個影格加上說明…' : '尚無影格';
    // 正在輸入時不覆寫,避免游標跳位
    if (document.activeElement !== frameNoteInput) frameNoteInput.value = frame ? (frame.note || '') : '';
  }

  addFrameBtn.addEventListener('click', () => { stopPlayback(); state.addFrame(); });
  dupFrameBtn.addEventListener('click', () => {
    stopPlayback();
    if (state.timeline.currentIndex >= 0) state.duplicateFrame(state.timeline.currentIndex);
  });
  delFrameBtn.addEventListener('click', () => {
    stopPlayback();
    if (state.timeline.currentIndex >= 0) state.removeFrame(state.timeline.currentIndex);
  });
  moveLeftBtn.addEventListener('click', () => {
    stopPlayback();
    const i = state.timeline.currentIndex;
    if (i > 0) state.reorderFrame(i, i - 1);
  });
  moveRightBtn.addEventListener('click', () => {
    stopPlayback();
    const i = state.timeline.currentIndex;
    if (i >= 0 && i < state.timeline.frames.length - 1) state.reorderFrame(i, i + 1);
  });
  prevFrameBtn.addEventListener('click', () => stepFrame(-1));
  nextFrameBtn.addEventListener('click', () => stepFrame(1));
  holdSecInput.addEventListener('input', () => state.setHoldSec(Number(holdSecInput.value) || 1.5));

  function stepFrame(delta) {
    stopPlayback();
    const frames = state.timeline.frames;
    if (!frames.length) return;
    const cur = state.timeline.currentIndex < 0 ? 0 : state.timeline.currentIndex;
    const next = Math.max(0, Math.min(frames.length - 1, cur + delta));
    state.goToFrame(next);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    stepFrame(e.key === 'ArrowLeft' ? -1 : 1);
  });

  playBtn.addEventListener('click', () => {
    if (isPlaying) stopPlayback();
    else startPlayback();
  });

  function startPlayback() {
    const frames = state.timeline.frames;
    if (frames.length < 2) return;
    isPlaying = true;
    playBtn.classList.add('playing');
    playBtn.textContent = '⏸ 暫停';
    // 已在最後一格時按播放,視為「從頭重播」而非立即停止
    const startIndex = (state.timeline.currentIndex >= 0 && state.timeline.currentIndex < frames.length - 1)
      ? state.timeline.currentIndex : 0;
    state.goToFrame(startIndex);
    scheduleNext();
  }

  function scheduleNext() {
    const frames = state.timeline.frames;
    const cur = state.timeline.currentIndex;
    if (cur >= frames.length - 1) { stopPlayback(); return; }
    const holdMs = (state.timeline.holdSec || 1.5) * 1000;
    playTimer = setTimeout(() => {
      if (!isPlaying) return;
      state.goToFrame(cur + 1);
      scheduleNext();
    }, holdMs);
  }

  function stopPlayback() {
    isPlaying = false;
    if (playTimer) clearTimeout(playTimer);
    playTimer = null;
    playBtn.classList.remove('playing');
    playBtn.textContent = '▶ 播放';
  }

  function renderTimeline() {
    timelineFramesEl.innerHTML = '';
    const frames = state.timeline.frames;
    const hasFrames = frames.length > 0;
    const hasCurrent = state.timeline.currentIndex >= 0;

    playBtn.disabled = frames.length < 2;
    prevFrameBtn.disabled = !hasFrames || state.timeline.currentIndex <= 0;
    nextFrameBtn.disabled = !hasFrames || state.timeline.currentIndex >= frames.length - 1;
    dupFrameBtn.disabled = !hasCurrent;
    delFrameBtn.disabled = !hasCurrent;
    moveLeftBtn.disabled = !hasCurrent || state.timeline.currentIndex <= 0;
    moveRightBtn.disabled = !hasCurrent || state.timeline.currentIndex >= frames.length - 1;
    if (document.activeElement !== holdSecInput) holdSecInput.value = state.timeline.holdSec;

    if (!hasFrames) {
      const empty = document.createElement('span');
      empty.className = 'timeline-empty';
      empty.textContent = '尚無影格,擺好第一個盤面後按「新增影格」開始製作走位動畫。';
      timelineFramesEl.appendChild(empty);
      return;
    }

    frames.forEach((frame, i) => {
      const chip = document.createElement('button');
      chip.className = 'frame-chip' + (i === state.timeline.currentIndex ? ' active' : '');
      chip.textContent = i + 1;
      chip.title = frame.note ? `影格 ${i + 1}:${frame.note}` : `跳到影格 ${i + 1}`;
      chip.addEventListener('click', () => { stopPlayback(); state.goToFrame(i); });
      timelineFramesEl.appendChild(chip);
    });
  }

  // 注意:canvas 已在其建構函式中自行訂閱 state.onChange 來 render(),此處不重複呼叫
  state.onChange(() => {
    if (!suppressPropertyRerender) renderPropertyPanel();
    renderObjectList();
    renderTimeline();
    renderFrameNote();
  });

  initGuideImportUI(state, async (raidId) => {
    stopPlayback();
    await ensureArenaForRaid(raidId);
  });

  await setArena(index[0].id);
}
