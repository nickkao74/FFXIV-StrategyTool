/* storage.js — 盤面的本地保存與檔案交換(企劃書 3.8 / M4)
 *
 * 三種儲存方式共用同一份序列化結果(state.toJSON()):
 *   1. 自動保存:每次變更後寫入 localStorage,重開頁面自動接回上次盤面。
 *   2. 具名盤面:同樣存在 localStorage,可存多份、自行命名。
 *   3. JSON 檔:匯出成單一 .json 傳給隊友,對方匯入即可。
 */

const BOARD_AUTOSAVE_KEY = 'ffxiv-board-autosave';
const BOARD_SAVES_KEY = 'ffxiv-board-saves';
const BOARD_SAVE_LIMIT = 30;

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn(`讀取 ${key} 失敗,已略過`, e);
    return fallback;
  }
}

/** localStorage 可能因容量上限或無痕模式寫入失敗,一律回報而非默默吞掉 */
function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return null;
  } catch (e) {
    return e.name === 'QuotaExceededError'
      ? '瀏覽器儲存空間已滿,請先刪除一些具名盤面。'
      : `寫入失敗:${e.message}`;
  }
}

/* ── 自動保存 ─────────────────────────────── */

function loadAutosave() { return readJSON(BOARD_AUTOSAVE_KEY, null); }
function clearAutosave() { localStorage.removeItem(BOARD_AUTOSAVE_KEY); }

/** 回傳一個可直接掛到 state.onChange 的函式(合併連續變更,拖曳時不會每一格都寫入) */
function makeAutosaver(delayMs = 600) {
  let timer = null;
  let warned = false;
  return (state) => {
    if (!state.arenaId) return;   // 場地還沒載入完,不存半成品
    clearTimeout(timer);
    timer = setTimeout(() => {
      const err = writeJSON(BOARD_AUTOSAVE_KEY, state.toJSON());
      if (err && !warned) { warned = true; console.warn('自動保存失敗:' + err); }
    }, delayMs);
  };
}

/* ── 具名盤面 ─────────────────────────────── */

/** { [name]: { savedAt, data } } */
function loadSaveSlots() { return readJSON(BOARD_SAVES_KEY, {}) || {}; }

function listSaveSlots() {
  const slots = loadSaveSlots();
  return Object.entries(slots)
    .map(([name, v]) => ({ name, savedAt: v.savedAt || 0, data: v.data }))
    .sort((a, b) => b.savedAt - a.savedAt);
}

function putSaveSlot(name, data) {
  const slots = loadSaveSlots();
  if (!slots[name] && Object.keys(slots).length >= BOARD_SAVE_LIMIT) {
    return `具名盤面上限為 ${BOARD_SAVE_LIMIT} 份,請先刪除不用的。`;
  }
  slots[name] = { savedAt: Date.now(), data };
  return writeJSON(BOARD_SAVES_KEY, slots);
}

function deleteSaveSlot(name) {
  const slots = loadSaveSlots();
  delete slots[name];
  return writeJSON(BOARD_SAVES_KEY, slots);
}

/* ── JSON 檔匯出 / 匯入 ────────────────────── */

function exportBoardFile(state) {
  const data = state.toJSON();
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `board-${state.arenaId || 'unknown'}-${state.phaseId || 'p'}-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function readBoardFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(validateBoardData(JSON.parse(reader.result)));
      } catch (e) {
        reject(new Error(`檔案不是有效的盤面 JSON:${e.message}`));
      }
    };
    reader.onerror = () => reject(new Error('讀取檔案失敗'));
    reader.readAsText(file);
  });
}

/** 匯入來源可能是別人手改過的檔案,先擋掉明顯不對的結構再套用 */
function validateBoardData(data) {
  if (!data || typeof data !== 'object') throw new Error('不是物件');
  if (!data.arenaId || !data.phaseId) throw new Error('缺少 arenaId / phaseId');
  if (!Array.isArray(data.tokens)) throw new Error('缺少 tokens 陣列');
  if (!Array.isArray(data.objects)) throw new Error('缺少 objects 陣列');
  return data;
}

/* ── 盤面管理彈窗 ──────────────────────────── */

function formatSavedAt(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** applyBoard(data):由 app.js 提供,負責切換場地/階段並把盤面套進 state */
function initBoardStorageUI(state, applyBoard) {
  const modal = document.getElementById('storage-modal');
  const openBtn = document.getElementById('storage-btn');
  const closeBtn = document.getElementById('storage-close');
  const slotList = document.getElementById('storage-slot-list');
  const nameInput = document.getElementById('storage-name-input');
  const saveBtn = document.getElementById('storage-save-btn');
  const exportBtn = document.getElementById('storage-export-btn');
  const importBtn = document.getElementById('storage-import-btn');
  const fileInput = document.getElementById('storage-file-input');
  const clearBtn = document.getElementById('storage-clear-btn');
  const statusEl = document.getElementById('storage-status');

  function setStatus(msg, isError = false) {
    statusEl.textContent = msg || '';
    statusEl.classList.toggle('error', !!isError);
  }

  function renderSlots() {
    slotList.innerHTML = '';
    const slots = listSaveSlots();
    if (!slots.length) {
      const p = document.createElement('p');
      p.className = 'list-empty';
      p.textContent = '尚無具名盤面。在下方輸入名稱即可存下目前盤面。';
      slotList.appendChild(p);
      return;
    }
    for (const slot of slots) {
      const row = document.createElement('div');
      row.className = 'slot-row';

      const info = document.createElement('div');
      info.className = 'slot-info';
      const nm = document.createElement('b');
      nm.textContent = slot.name;
      const meta = document.createElement('span');
      const frames = ((slot.data || {}).timeline || {}).frames || [];
      meta.textContent = `${formatSavedAt(slot.savedAt)} · ${frames.length} 格`;
      info.append(nm, meta);
      row.appendChild(info);

      const loadBtn = document.createElement('button');
      loadBtn.className = 'toolbar-btn';
      loadBtn.textContent = '載入';
      loadBtn.addEventListener('click', async () => {
        try {
          await applyBoard(validateBoardData(slot.data));
          modal.hidden = true;
        } catch (e) { setStatus(`載入失敗:${e.message}`, true); }
      });
      row.appendChild(loadBtn);

      const overBtn = document.createElement('button');
      overBtn.className = 'toolbar-btn';
      overBtn.title = '以目前盤面覆蓋這份存檔';
      overBtn.textContent = '覆蓋';
      overBtn.addEventListener('click', () => {
        if (!confirm(`以目前盤面覆蓋「${slot.name}」?`)) return;
        const err = putSaveSlot(slot.name, state.toJSON());
        setStatus(err || `已覆蓋「${slot.name}」。`, !!err);
        renderSlots();
      });
      row.appendChild(overBtn);

      const delBtn = document.createElement('button');
      delBtn.className = 'toolbar-btn danger';
      delBtn.textContent = '刪除';
      delBtn.addEventListener('click', () => {
        if (!confirm(`刪除存檔「${slot.name}」?此動作無法復原。`)) return;
        const err = deleteSaveSlot(slot.name);
        setStatus(err || `已刪除「${slot.name}」。`, !!err);
        renderSlots();
      });
      row.appendChild(delBtn);

      slotList.appendChild(row);
    }
  }

  openBtn.addEventListener('click', () => {
    modal.hidden = false;
    setStatus('');
    nameInput.value = '';
    renderSlots();
  });
  closeBtn.addEventListener('click', () => { modal.hidden = true; });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });

  saveBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) { setStatus('請先輸入盤面名稱。', true); return; }
    if (loadSaveSlots()[name] && !confirm(`已有同名盤面「${name}」,要覆蓋嗎?`)) return;
    const err = putSaveSlot(name, state.toJSON());
    setStatus(err || `已存為「${name}」。`, !!err);
    if (!err) nameInput.value = '';
    renderSlots();
  });
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveBtn.click(); });

  exportBtn.addEventListener('click', () => {
    exportBoardFile(state);
    setStatus('已匯出 JSON 檔。');
  });

  importBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';   // 同一個檔案要能重複選取
    if (!file) return;
    try {
      const data = await readBoardFile(file);
      await applyBoard(data);
      modal.hidden = true;
    } catch (e) { setStatus(e.message, true); }
  });

  clearBtn.addEventListener('click', () => {
    if (!confirm('清空目前盤面(所有物件與影格)並重置站位?此動作無法復原。')) return;
    clearAutosave();
    state.objects = [];
    state.timeline = { frames: [], currentIndex: -1, holdSec: state.timeline.holdSec };
    state.clearSelection({ silent: true });
    state.resetTokensToDefault();
    modal.hidden = true;
  });
}
