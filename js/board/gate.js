/* gate.js — 存取密碼門檻(僅供擋不知情者,非真安全機制) */
const BOARD_PASSWORD = '654321';
const BOARD_AUTH_KEY = 'ffxiv-board-auth';

function boardGateInit(onPass) {
  const overlay = document.getElementById('gate-overlay');
  const app = document.getElementById('board-app');
  const input = document.getElementById('gate-input');
  const btn = document.getElementById('gate-submit');
  const errEl = document.getElementById('gate-error');

  function reveal() {
    overlay.hidden = true;
    app.hidden = false;
    onPass();
  }

  if (sessionStorage.getItem(BOARD_AUTH_KEY) === '1') {
    reveal();
    return;
  }

  function tryPass() {
    if (input.value.trim() === BOARD_PASSWORD) {
      sessionStorage.setItem(BOARD_AUTH_KEY, '1');
      reveal();
    } else {
      errEl.textContent = '密碼錯誤,請再試一次。';
      input.value = '';
      input.focus();
    }
  }

  btn.addEventListener('click', tryPass);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryPass(); });
  input.focus();
}
