/* history.js — 復原 / 重做(企劃書七之 3:Phase 1 提供 20 步 Ctrl+Z)
 *
 * 作法是整份盤面快照。白板的 state 不大(全本 26 格約 110KB),20 步的記憶體
 * 成本可接受,換來的好處是不必為每一種操作各寫一套反向動作 —— 新增物件種類、
 * 新增欄位都不用回頭改這裡。
 *
 * 連續變更的合併:拖曳一顆兵棋會連發數十次 emit,若每次都記一步,按一次
 * Ctrl+Z 只會退回一個像素。因此變更後先等待 IDLE_MS 的空檔再落一步,
 * 一次拖曳 = 一步。
 *
 * 歷史只在「同一個場地/階段」內有效:切換階段、載入存檔、匯入 JSON 之後會
 * 重置,避免復原牽扯到非同步的場地載入。
 */

const BOARD_HISTORY_LIMIT = 20;
const BOARD_HISTORY_IDLE_MS = 250;

class BoardHistory {
  constructor(state, limit = BOARD_HISTORY_LIMIT) {
    this.state = state;
    this.limit = limit;
    this.undoStack = [];
    this.redoStack = [];
    this.baseline = null;      // 最後一次落定的盤面(JSON 字串);null = 尚未啟用
    this.timer = null;
    this.suspended = false;    // 套用歷史狀態的當下不要再記錄
    this.onUpdate = null;
    state.onChange(() => this._scheduleCommit());
  }

  /** 切換場地/階段或載入整份盤面後呼叫:以當前盤面為新起點,丟棄舊歷史 */
  reset() {
    clearTimeout(this.timer);
    this.timer = null;
    this.undoStack = [];
    this.redoStack = [];
    this.baseline = this._snapshot();
    this._notify();
  }

  canUndo() { return this.undoStack.length > 0 || this._hasPendingChange(); }
  canRedo() { return this.redoStack.length > 0; }

  undo() {
    this._commit();
    if (!this.undoStack.length) return false;
    const prev = this.undoStack.pop();
    this.redoStack.push(this.baseline);
    this._apply(prev);
    return true;
  }

  redo() {
    this._commit();
    if (!this.redoStack.length) return false;
    const next = this.redoStack.pop();
    this.undoStack.push(this.baseline);
    this._apply(next);
    return true;
  }

  _snapshot() { return JSON.stringify(this.state.toJSON()); }

  _hasPendingChange() {
    return this.baseline !== null && this._snapshot() !== this.baseline;
  }

  _scheduleCommit() {
    if (this.suspended || this.baseline === null) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this._commit(), BOARD_HISTORY_IDLE_MS);
  }

  _commit() {
    clearTimeout(this.timer);
    this.timer = null;
    if (this.suspended || this.baseline === null) return;
    const current = this._snapshot();
    // 只改變選取狀態不算一步(選取不進 toJSON,快照會完全相同)
    if (current === this.baseline) return;
    this.undoStack.push(this.baseline);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
    this.baseline = current;
    this._notify();
  }

  _apply(json) {
    this.suspended = true;
    try {
      this.state.loadFromJSON(JSON.parse(json), this.state.arenaDef, this.state.phaseDef);
    } finally {
      this.suspended = false;
    }
    this.baseline = json;
    this._notify();
  }

  _notify() { if (this.onUpdate) this.onUpdate(this); }
}
