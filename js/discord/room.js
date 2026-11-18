/* room.js — 白板房間同步與主持人模式(M2)
 *
 * 啟用條件:在 Discord Activity 內,或本機開發用 ?room=<名稱>&devuser=<名字>。
 * 一般瀏覽器開啟 board.html 時完全不動作。
 *
 * 主持人:編輯白板,變更在 250ms 無新操作後整份廣播(與復原歷史同一個節奏)。
 * 觀看者:白板唯讀,收到盤面就套用;可申請主持。
 * 規則本身由伺服器(discord/worker/src/room.js)裁決,這裡只負責呈現與送出請求。
 */
(() => {
  const params = new URLSearchParams(location.search);
  const act = window.DISCORD_ACTIVITY || {};
  const devRoom = params.get('room');
  const devUser = params.get('devuser');
  if (!act.inDiscord && !(devRoom && devUser)) return;

  const SEND_IDLE_MS = 250;
  const RECONNECT_MS = [1000, 2000, 5000, 10000];

  let api = null;          // window.BOARD_API
  let ws = null;
  let me = null;
  let hostId = null;
  let participants = [];
  let graceUntil = null;
  let applyingRemote = false;
  let sendTimer = null;
  let lastSent = null;
  let reconnectTry = 0;
  let pendingRequests = [];   // 主持人待處理的申請 [{id,name}]
  let requestSent = false;

  const isHost = () => !!me && me.id === hostId;

  // ── 介面 ─────────────────────────────
  const panel = document.createElement('aside');
  panel.id = 'room-panel';
  panel.innerHTML = `
    <div class="room-head">
      <strong>房間</strong>
      <span class="room-status" id="room-status">連線中…</span>
      <button class="room-toggle" id="room-toggle" title="收合">–</button>
    </div>
    <div class="room-body" id="room-body">
      <p class="room-role" id="room-role"></p>
      <ul class="room-people" id="room-people"></ul>
      <div class="room-requests" id="room-requests"></div>
      <div class="room-actions" id="room-actions"></div>
    </div>`;
  const $ = (id) => panel.querySelector(`#${id}`);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  $('room-toggle').addEventListener('click', () => {
    panel.classList.toggle('collapsed');
    $('room-toggle').textContent = panel.classList.contains('collapsed') ? '+' : '–';
  });

  const knownNames = new Map();   // 離線的人也能顯示名字
  function nameOf(id) {
    const p = participants.find((x) => x.id === id);
    return p ? p.name : (knownNames.get(id) || '(離線)');
  }
  function setParticipants(list) {
    participants = list;
    for (const p of list) knownNames.set(p.id, p.name);
  }

  function render() {
    document.body.classList.toggle('room-viewer', !!me && !isHost());
    $('room-status').textContent = ws && ws.readyState === 1 ? `${participants.length} 人在線` : '重新連線中…';

    let role;
    if (!me) role = '';
    else if (isHost()) role = '你是<b>主持人</b>,你的操作會同步給所有人。';
    else if (graceUntil && hostId && !participants.some((p) => p.id === hostId)) {
      role = `主持人 ${esc(nameOf(hostId))} 暫時離線,30 秒內未回來將自動轉交。`;
    } else role = `觀看中 · 主持人:<b>${esc(nameOf(hostId))}</b>`;
    $('room-role').innerHTML = role;

    $('room-people').innerHTML = participants.map((p) => `
      <li class="${p.id === hostId ? 'is-host' : ''}">
        <span class="room-name">${p.id === hostId ? '👑 ' : ''}${esc(p.name)}${me && p.id === me.id ? '(你)' : ''}</span>
        ${isHost() && p.id !== me.id ? `<button data-assign="${esc(p.id)}">交給他</button>` : ''}
      </li>`).join('');

    $('room-requests').innerHTML = isHost() ? pendingRequests.map((r) => `
      <div class="room-request">
        <span>${esc(r.name)} 申請主持</span>
        <button data-accept="${esc(r.id)}">同意</button>
        <button data-reject="${esc(r.id)}">拒絕</button>
      </div>`).join('') : '';

    $('room-actions').innerHTML = !me || isHost() ? '' : (requestSent
      ? '<span class="room-hint">已送出申請,等待主持人回覆…</span>'
      : '<button id="room-request-btn">申請主持</button>');
  }

  panel.addEventListener('click', (e) => {
    const t = e.target;
    if (t.dataset.assign) {
      if (confirm(`把主持權交給 ${nameOf(t.dataset.assign)}?`)) send({ type: 'assign_host', userId: t.dataset.assign });
    } else if (t.dataset.accept || t.dataset.reject) {
      const userId = t.dataset.accept || t.dataset.reject;
      send({ type: 'respond_request', userId, accept: !!t.dataset.accept });
      pendingRequests = pendingRequests.filter((r) => r.id !== userId);
      render();
    } else if (t.id === 'room-request-btn') {
      send({ type: 'request_host' });
      requestSent = true;
      render();
    }
  });

  // 觀看者不能用鍵盤操作白板(Ctrl+Z、Delete 等)
  document.addEventListener('keydown', (e) => {
    if (document.body.classList.contains('room-viewer') && !panel.contains(e.target)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);

  // ── 同步 ─────────────────────────────
  function send(msg) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); }

  function sendBoardNow() {
    clearTimeout(sendTimer);
    sendTimer = null;
    if (!isHost()) return;
    const board = api.state.toJSON();
    const text = JSON.stringify(board);
    if (text === lastSent) return;
    lastSent = text;
    send({ type: 'state', board });
  }

  function onLocalChange() {
    if (applyingRemote || !isHost()) return;
    clearTimeout(sendTimer);
    sendTimer = setTimeout(sendBoardNow, SEND_IDLE_MS);
  }

  async function applyRemote(board) {
    if (!board) return;
    applyingRemote = true;
    try { await api.applyRemote(board); lastSent = JSON.stringify(api.state.toJSON()); }
    catch (e) { console.error('[room] 套用遠端盤面失敗', e); }
    finally { applyingRemote = false; }
  }

  function setHost(newHostId) {
    const wasHost = isHost();
    hostId = newHostId;
    if (!wasHost && isHost()) {
      requestSent = false;
      api.history.reset();     // 不讓新主持人 Ctrl+Z 退回別人的操作
      lastSent = null;
      sendBoardNow();          // 立刻把目前盤面交給伺服器
    }
    if (wasHost && !isHost()) pendingRequests = [];
  }

  async function connect() {
    let query;
    if (act.inDiscord) {
      const a = await act.auth();
      query = new URLSearchParams({ instance: a.instanceId, token: a.accessToken });
    } else {
      query = new URLSearchParams({ instance: devRoom, devuser: devUser });
    }
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/api/room?${query}`);

    ws.addEventListener('open', () => { reconnectTry = 0; render(); });
    ws.addEventListener('message', async (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      switch (msg.type) {
        case 'welcome':
          me = msg.you;
          setParticipants(msg.participants);
          if (msg.hostId !== me.id && msg.board) await applyRemote(msg.board);
          setHost(msg.hostId);
          break;
        case 'participants':
          setParticipants(msg.participants);
          graceUntil = msg.graceUntil;
          setHost(msg.hostId);
          pendingRequests = pendingRequests.filter((r) => participants.some((p) => p.id === r.id));
          break;
        case 'state':
          if (!isHost()) await applyRemote(msg.board);
          break;
        case 'host_request':
          if (!pendingRequests.some((r) => r.id === msg.from.id)) pendingRequests.push(msg.from);
          break;
        case 'request_result':
          requestSent = false;
          if (!msg.accept) alert('主持人拒絕了你的申請。');
          break;
        case 'error':
          console.warn('[room] 伺服器回應錯誤', msg.message);
          break;
      }
      render();
    });
    ws.addEventListener('close', () => {
      render();
      const wait = RECONNECT_MS[Math.min(reconnectTry++, RECONNECT_MS.length - 1)];
      setTimeout(() => connect().catch(onConnectError), wait);
    });
  }

  function onConnectError(e) {
    console.error('[room] 無法連線', e);
    $('room-status').textContent = '無法連線';
    $('room-role').textContent = `房間連線失敗:${e.message || e}`;
  }

  document.addEventListener('board-ready', () => {
    api = window.BOARD_API;
    document.body.appendChild(panel);
    render();
    api.state.onChange(onLocalChange);
    connect().catch(onConnectError);
  });
})();
