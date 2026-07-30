/* state.js — 白板狀態(BoardState) */

const BOARD_ROLE_TYPE = {
  MT: 'tank', ST: 'tank', H1: 'healer', H2: 'healer',
  D1: 'dps', D2: 'dps', D3: 'dps', D4: 'dps',
};
const PLAYER_ROLES = ['MT', 'ST', 'H1', 'H2', 'D1', 'D2', 'D3', 'D4'];

/** 這些欄位屬於「實體本身的設定」,不隨影格變化,建立影格快照時排除
 * 注意:visible 特意「不」排除 ── 顯示/隱藏要能逐格變化(例如 BOSS 影格1隱藏、影格2顯示)。 */
const FRAME_EXCLUDE_FIELDS = new Set(['id', 'kind', 'locked', 'sync', 'label']);

let _boardIdSeq = 1;
function nextObjectId() { return `obj-${_boardIdSeq++}`; }

/** 載入盤面後把流水號推到既有 id 之後,避免新物件的 id 撞到載入進來的物件 */
function adoptObjectIds(objects) {
  for (const o of objects) {
    const m = /^obj-(\d+)$/.exec(o.id || '');
    if (m) _boardIdSeq = Math.max(_boardIdSeq, Number(m[1]) + 1);
  }
}

class BoardState {
  constructor() {
    this.version = 1;
    this.arenaId = null;
    this.phaseId = null;
    this.arenaDef = null;   // 目前場地(完整資料)
    this.phaseDef = null;   // 目前階段(完整資料)
    this.tokens = [];       // [{id, kind:'player'|'boss'|'waymark', label, x, y, locked, visible, sync}]
    this.objects = [];      // [{id, kind:'aoe-circle'|... , ...params, locked, attachTo, dx, dy, sync}]
    this.waymarksLocked = false;
    this.selectedKind = null; // 'token' | 'object' | null
    this.selectedId = null;
    this.timeline = { frames: [], currentIndex: -1, holdSec: 1.5 }; // frames: [{snapshot:{[id]:fields}, note}]; holdSec 為全域統一間隔
    this.listeners = [];
  }

  onChange(fn) { this.listeners.push(fn); }
  emit() { this.listeners.forEach((fn) => fn(this)); }

  loadPhase(arenaDef, phaseDef, { keepTokens = false } = {}) {
    this.arenaId = arenaDef.id;
    this.arenaDef = arenaDef;
    this.phaseId = phaseDef.id;
    this.phaseDef = phaseDef;

    if (!keepTokens || !this.tokens.length) {
      this.resetTokensToDefault({ silent: true });
    } else {
      // 保留現有玩家/BOSS 位置,只重建場地標記(不同場地大小不同)
      this.tokens = this.tokens.filter((t) => t.kind !== 'waymark');
      this._addWaymarkTokens();
    }
    this.objects = [];
    this.timeline = { frames: [], currentIndex: -1, holdSec: 1.5 };
    this.clearSelection({ silent: true });
    this.emit();
  }

  resetTokensToDefault({ silent = false } = {}) {
    const def = (this.phaseDef && this.phaseDef.defaultTokens) || {};
    this.tokens = [];
    for (const role of PLAYER_ROLES) {
      const pos = def[role] || { x: 0, y: 0 };
      this.tokens.push({ id: role, kind: 'player', label: role, x: pos.x, y: pos.y, locked: false, visible: true, sync: false });
    }
    const bossPos = def.BOSS || { x: 0, y: 0 };
    // facing:角度(0=面向 A/正上方,順時針);null 表示不顯示朝向箭頭
    this.tokens.push({ id: 'BOSS', kind: 'boss', label: 'BOSS', x: bossPos.x, y: bossPos.y, facing: 0, locked: false, visible: true, sync: false });
    this._addWaymarkTokens();
    if (!silent) this.emit();
  }

  _addWaymarkTokens() {
    const wms = (this.phaseDef && this.phaseDef.waymarks) || [];
    for (const wm of wms) {
      this.tokens.push({
        // 場地標記本質是固定參考點,預設為「同步」不隨影格變化
        id: `wm-${wm.id}`, kind: 'waymark', label: wm.id,
        x: wm.x, y: wm.y, locked: this.waymarksLocked, visible: true, sync: true,
      });
    }
  }

  // ── 兵棋 ──────────────────────────────
  getToken(id) { return this.tokens.find((t) => t.id === id); }

  moveToken(id, x, y) {
    const t = this.getToken(id);
    if (!t || t.locked) return;
    t.x = x; t.y = y;
    this._syncCurrentFrame(t);
    this.emit();
  }

  /** 更新兵棋的非位置欄位(目前用於 BOSS 面向) */
  updateToken(id, patch) {
    const t = this.getToken(id);
    if (!t) return;
    Object.assign(t, patch);
    this._syncCurrentFrame(t);
    this.emit();
  }

  toggleTokenLock(id) {
    const t = this.getToken(id);
    if (!t) return;
    t.locked = !t.locked;
    this.emit();
  }

  toggleTokenVisible(id) {
    const t = this.getToken(id);
    if (!t) return;
    t.visible = !t.visible;
    this._syncCurrentFrame(t);
    this.emit();
  }

  toggleWaymarksLock() {
    this.waymarksLocked = !this.waymarksLocked;
    this.tokens.forEach((t) => { if (t.kind === 'waymark') t.locked = this.waymarksLocked; });
    this.emit();
  }

  /** 批次鎖定/解鎖:items = [{kind:'token'|'object', id}] */
  setManyLocked(items, locked) {
    for (const { kind, id } of items) {
      const entity = kind === 'token' ? this.getToken(id) : this.getObject(id);
      if (entity) entity.locked = locked;
    }
    this.emit();
  }

  // ── 物件(地毯/箭頭/連線/標註)───────────
  getObject(id) { return this.objects.find((o) => o.id === id); }

  /** 任何可被連線/吸附引用的實體(兵棋或物件) */
  getEntity(id) { return this.getToken(id) || this.getObject(id); }

  addObject(partial) {
    const obj = { id: nextObjectId(), locked: false, sync: false, visible: true, ...partial };
    this.objects.push(obj);
    this._syncCurrentFrame(obj);
    this.select('object', obj.id);
    return obj;
  }

  updateObject(id, patch) {
    const o = this.getObject(id);
    if (!o) return;
    Object.assign(o, patch);
    this._syncCurrentFrame(o);
    this.emit();
  }

  /** 物件位置計算:若有 attachTo,位置 = 錨點位置(遞迴解析)+ 偏移量 */
  effectivePosition(obj) {
    if (obj.attachTo) {
      const anchor = this.getEntity(obj.attachTo);
      if (anchor) {
        const ap = this.effectivePosition(anchor);
        return { x: ap.x + (obj.dx || 0), y: ap.y + (obj.dy || 0) };
      }
    }
    return { x: obj.x || 0, y: obj.y || 0 };
  }

  moveObject(id, x, y) {
    const o = this.getObject(id);
    if (!o || o.locked) return;
    if (o.attachTo) {
      const anchor = this.getEntity(o.attachTo);
      const ap = anchor ? this.effectivePosition(anchor) : { x: 0, y: 0 };
      o.dx = x - ap.x; o.dy = y - ap.y;
    } else {
      o.x = x; o.y = y;
    }
    this._syncCurrentFrame(o);
    this.emit();
  }

  detachObject(id) {
    const o = this.getObject(id);
    if (!o || !o.attachTo) return;
    const p = this.effectivePosition(o);
    o.x = p.x; o.y = p.y;
    o.attachTo = null; o.dx = 0; o.dy = 0;
    this._syncCurrentFrame(o);
    this.emit();
  }

  removeObject(id) {
    this.objects = this.objects.filter((o) => o.id !== id);
    // 連線若引用了被刪除的物件,一併移除
    this.objects = this.objects.filter((o) => o.kind !== 'tether' || (o.from !== id && o.to !== id));
    for (const f of this.timeline.frames) delete f.snapshot[id];
    if (this.selectedKind === 'object' && this.selectedId === id) this.clearSelection({ silent: true });
    this.emit();
  }

  toggleObjectLock(id) {
    const o = this.getObject(id);
    if (!o) return;
    o.locked = !o.locked;
    this.emit();
  }

  toggleObjectVisible(id) {
    const o = this.getObject(id);
    if (!o) return;
    o.visible = !o.visible;
    this._syncCurrentFrame(o);
    this.emit();
  }

  // ── 同步模式(逐格獨立 / 同步全部影格)───────
  /** kind: 'token' | 'object' */
  toggleSync(kind, id) {
    const entity = kind === 'token' ? this.getToken(id) : this.getObject(id);
    if (!entity) return;
    entity.sync = !entity.sync;
    if (entity.sync) {
      // 同步模式:不再逐格記錄,從所有影格快照中移除
      for (const f of this.timeline.frames) delete f.snapshot[id];
    } else {
      // 逐格模式:以目前值覆蓋所有影格的初始快照
      const snap = this._captureFields(entity);
      for (const f of this.timeline.frames) f.snapshot[id] = snap;
    }
    this.emit();
  }

  _captureFields(entity) {
    const out = {};
    for (const k of Object.keys(entity)) {
      if (!FRAME_EXCLUDE_FIELDS.has(k)) out[k] = entity[k];
    }
    return JSON.parse(JSON.stringify(out));
  }

  /** 編輯逐格(sync:false)實體時,即時寫回目前影格的快照 */
  _syncCurrentFrame(entity) {
    if (entity.sync) return;
    const frame = this.timeline.frames[this.timeline.currentIndex];
    if (!frame) return;
    frame.snapshot[entity.id] = this._captureFields(entity);
  }

  // ── 時間軸 ────────────────────────────
  /** 在目前影格之後插入一個新影格(複製當前盤面) */
  addFrame() {
    const snapshot = {};
    for (const t of this.tokens) if (!t.sync) snapshot[t.id] = this._captureFields(t);
    for (const o of this.objects) if (!o.sync) snapshot[o.id] = this._captureFields(o);
    const frame = { snapshot, note: '' };
    const at = this.timeline.currentIndex + 1;
    this.timeline.frames.splice(at, 0, frame);
    this.timeline.currentIndex = at;
    this.emit();
  }

  duplicateFrame(index) {
    const src = this.timeline.frames[index];
    if (!src) return;
    const copy = { snapshot: JSON.parse(JSON.stringify(src.snapshot)), note: src.note || '' };
    this.timeline.frames.splice(index + 1, 0, copy);
    this.timeline.currentIndex = index + 1;
    this.emit();
  }

  removeFrame(index) {
    if (index < 0 || index >= this.timeline.frames.length) return;
    this.timeline.frames.splice(index, 1);
    if (!this.timeline.frames.length) this.timeline.currentIndex = -1;
    else this.timeline.currentIndex = Math.min(index, this.timeline.frames.length - 1);
    this.emit();
  }

  reorderFrame(fromIndex, toIndex) {
    const frames = this.timeline.frames;
    if (fromIndex < 0 || fromIndex >= frames.length || toIndex < 0 || toIndex >= frames.length) return;
    const [f] = frames.splice(fromIndex, 1);
    frames.splice(toIndex, 0, f);
    this.timeline.currentIndex = toIndex;
    this.emit();
  }

  /** 目前影格的說明文字(導入攻略時會帶入該步驟的 caption) */
  setFrameNote(text) {
    const frame = this.timeline.frames[this.timeline.currentIndex];
    if (!frame) return;
    frame.note = text;
    this.emit();
  }

  /** 全部影格共用同一個間隔秒數 */
  setHoldSec(sec) {
    this.timeline.holdSec = Math.max(0.5, sec);
    this.emit();
  }

  /** 套用指定影格的快照到目前盤面(逐格實體);同步實體不受影響 */
  goToFrame(index) {
    const frame = this.timeline.frames[index];
    if (!frame) return;
    for (const [id, fields] of Object.entries(frame.snapshot)) {
      const entity = this.getEntity(id);
      if (entity && !entity.sync) Object.assign(entity, fields);
    }
    this.timeline.currentIndex = index;
    this.emit();
  }

  // ── 選取 ──────────────────────────────
  select(kind, id) {
    this.selectedKind = kind; this.selectedId = id;
    this.emit();
  }
  clearSelection({ silent = false } = {}) {
    this.selectedKind = null; this.selectedId = null;
    if (!silent) this.emit();
  }
  isSelected(kind, id) { return this.selectedKind === kind && this.selectedId === id; }

  /** 從序列化的盤面還原。arenaDef/phaseDef 由呼叫端先解析好(場地定義不進存檔,只存 id) */
  loadFromJSON(data, arenaDef, phaseDef) {
    this.arenaId = arenaDef.id;
    this.arenaDef = arenaDef;
    this.phaseId = phaseDef.id;
    this.phaseDef = phaseDef;
    this.waymarksLocked = !!data.waymarksLocked;
    this.tokens = (data.tokens || []).map((t) => ({ ...t }));
    this.objects = (data.objects || []).map((o) => ({ ...o }));
    const tl = data.timeline || {};
    this.timeline = {
      frames: JSON.parse(JSON.stringify(tl.frames || [])),
      currentIndex: typeof tl.currentIndex === 'number' ? tl.currentIndex : -1,
      holdSec: tl.holdSec || 1.5,
    };
    adoptObjectIds(this.objects);
    this.clearSelection({ silent: true });

    const idx = this.timeline.currentIndex;
    if (this.timeline.frames[idx]) this.goToFrame(idx);  // goToFrame 內含 emit
    else this.emit();
  }

  toJSON() {
    return {
      version: this.version,
      arenaId: this.arenaId,
      phaseId: this.phaseId,
      waymarksLocked: this.waymarksLocked,
      tokens: this.tokens.map((t) => ({ ...t })),
      objects: this.objects.map((o) => ({ ...o })),
      timeline: JSON.parse(JSON.stringify(this.timeline)),
    };
  }
}
