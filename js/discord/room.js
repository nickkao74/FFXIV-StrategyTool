/* room.js — Discord 房間:主持人模式、白板同步、攻略頁跟隨主持人
 *
 * 啟用條件:在 Discord Activity 內,或本機開發用 ?room=<名稱>&devuser=<名字>。
 * 一般瀏覽器開啟時完全不動作。首頁、攻略頁、白板都會載入本檔並顯示房間面板。
 *
 * 白板(board.html):主持人的變更在 250ms 無新操作後整份廣播;觀看者唯讀。
 * 攻略跟隨(預設關,只有主持人能切換):開啟後觀看者會跟著主持人換頁、換章節、換步驟。
 *   關閉時大家各看各的;觀看者仍可自由瀏覽,下一次主持人移動時才會被帶過去。
 * 規則由伺服器(discord/worker/src/room.js)裁決,這裡只負責呈現與送出請求。
 */
(() => {
  const params = new URLSearchParams(location.search);
  const act = window.DISCORD_ACTIVITY || {};
  const devRoom = params.get('room');
  const devUser = params.get('devuser');
  if (!act.inDiscord && !(devRoom && devUser)) return;

  const PAGE = /\/board(\.html)?$/.test(location.pathname) ? 'board'
    : /\/guide(\.html)?$/.test(location.pathname) ? 'guide' : 'home';
  const SEND_IDLE_MS = 250;
  const LOC_IDLE_MS = 150;
  const RECONNECT_MS = [1000, 2000, 5000, 10000];
  // 換頁時要帶著走的網址參數(Discord 的連線參數,或本機開發的房間參數)
  const CARRY = ['frame_id', 'instance_id', 'platform', 'guild_id', 'channel_id', 'location_id', 'room', 'devuser'];

  let boardApi = null;     // window.BOARD_API(白板頁)
  let guideApi = null;     // window.GUIDE_API(攻略頁)
  let ws = null;
  let me = null;
  let hostId = null;
  let participants = [];
  let graceUntil = null;
  let follow = false;
  let hostLoc = null;      // 主持人最後回報的位置
  let applyingRemote = false;
  let sendTimer = null;
  let locTimer = null;
  let lastSent = null;
  let lastLocSent = null;
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
      <div class="room-follow" id="room-follow"></div>
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
    document.body.classList.toggle('room-following', !!me && !isHost() && follow);
    $('room-status').textContent = ws && ws.readyState === 1 ? `${participants.length} 人在線`
      : me ? '重新連線中…' : '連線中…';

    let role;
    if (!me) role = '';
    else if (isHost()) role = '你是<b>主持人</b>' + (PAGE === 'board' ? ',白板操作會同步給所有人。' : '。');
    else if (graceUntil && hostId && !participants.some((p) => p.id === hostId)) {
      role = `主持人 ${esc(nameOf(hostId))} 暫時離線,30 秒內未回來將自動轉交。`;
    } else role = `觀看中 · 主持人:<b>${esc(nameOf(hostId))}</b>`;
    $('room-role').innerHTML = role;

    $('room-follow').innerHTML = !me ? '' : isHost()
      ? `<label class="room-switch"><input type="checkbox" id="room-follow-cb" ${follow ? 'checked' : ''}>
           <span>攻略頁跟隨主持人</span></label>
         <span class="room-hint">${follow ? '其他人會跟著你換頁、換步驟' : '關閉中:大家各看各的'}</span>`
      : `<span class="room-hint">攻略頁跟隨:<b>${follow ? '開啟 · 正跟著主持人' : '關閉'}</b></span>`;

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
  panel.addEventListener('change', (e) => {
    if (e.target.id !== 'room-follow-cb') return;
    send({ type: 'set_follow', on: e.target.checked });
    if (e.target.checked) sendLocationNow(true);   // 開啟時立刻把大家帶到主持人這裡
  });

  // 白板觀看者不能用鍵盤操作(Ctrl+Z、Delete 等)
  if (PAGE === 'board') {
    document.addEventListener('keydown', (e) => {
      if (document.body.classList.contains('room-viewer') && !panel.contains(e.target)) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    }, true);
  }

  // ── 位置(攻略跟隨)──────────────────
  function myLocation() {
    if (PAGE === 'guide' && guideApi) return { page: 'guide', ...guideApi.getLocation() };
    return { page: PAGE };
  }

  function sendLocationNow(force = false) {
    clearTimeout(locTimer);
    locTimer = null;
    if (!isHost()) return;
    if (PAGE === 'guide' && !guideApi) return;   // 攻略還沒載入完,等 guide-ready
    const loc = myLocation();
    const text = JSON.stringify(loc);
    if (text === lastLocSent && !force) return;
    lastLocSent = text;
    send({ type: 'location', loc });
  }

  function onLocalLocation() {
    if (!isHost()) return;
    clearTimeout(locTimer);
    locTimer = setTimeout(sendLocationNow, LOC_IDLE_MS);
  }

  function pageUrl(loc) {
    const file = loc.page === 'guide' ? 'guide.html' : loc.page === 'board' ? 'board.html' : 'index.html';
    const q = new URLSearchParams();
    if (loc.page === 'guide') {
      if (loc.raid) q.set('raid', loc.raid);
      if (loc.section) q.set('section', loc.section);
      if (loc.step) q.set('step', String(loc.step));
    }
    for (const k of CARRY) if (params.has(k)) q.set(k, params.get(k));
    return `${file}?${q}`;
  }

  /** 觀看者且跟隨開啟時,移到主持人所在位置 */
  function followHost() {
    if (!follow || isHost() || !hostLoc) return;
    const loc = hostLoc;
    if (loc.page === 'guide' && PAGE === 'guide') {
      if (!guideApi) return;   // guide-ready 後會再呼叫
      if (loc.raid === guideApi.getLocation().raid) { guideApi.goTo(loc); return; }
    } else if (loc.page === PAGE) {
      return;
    }
    location.href = pageUrl(loc);
  }

  // ── 白板同步 ─────────────────────────
  function send(msg) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); }

  function sendBoardNow() {
    clearTimeout(sendTimer);
    sendTimer = null;
    if (!isHost() || !boardApi) return;
    const board = boardApi.state.toJSON();
    const text = JSON.stringify(board);
    if (text === lastSent) return;
    lastSent = text;
    send({ type: 'state', board });
  }

  function onLocalBoardChange() {
    if (applyingRemote || !isHost()) return;
    clearTimeout(sendTimer);
    sendTimer = setTimeout(sendBoardNow, SEND_IDLE_MS);
  }

  async function applyRemoteBoard(board) {
    if (!board || !boardApi) return;
    applyingRemote = true;
    try { await boardApi.applyRemote(board); lastSent = JSON.stringify(boardApi.state.toJSON()); }
    catch (e) { console.error('[room] 套用遠端盤面失敗', e); }
    finally { applyingRemote = false; }
  }

  function setHost(newHostId) {
    const wasHost = isHost();
    hostId = newHostId;
    if (!wasHost && isHost()) {
      requestSent = false;
      if (boardApi) boardApi.history.reset();   // 不讓新主持人 Ctrl+Z 退回別人的操作
      lastSent = null;
      sendBoardNow();          // 立刻把目前盤面交給伺服器
      sendLocationNow(true);   // 跟隨開啟時,大家改跟新主持人
    }
    if (wasHost && !isHost()) pendingRequests = [];
  }

  // ── 連線 ─────────────────────────────
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

    let opened = false;
    ws.addEventListener('open', () => { opened = true; reconnectTry = 0; render(); });
    ws.addEventListener('message', async (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      switch (msg.type) {
        case 'welcome':
          me = msg.you;
          setParticipants(msg.participants);
          follow = !!msg.follow;
          hostLoc = msg.location;
          if (msg.hostId !== me.id && msg.board) await applyRemoteBoard(msg.board);
          setHost(msg.hostId);
          followHost();
          break;
        case 'participants': {
          const wasFollow = follow;
          setParticipants(msg.participants);
          graceUntil = msg.graceUntil;
          follow = !!msg.follow;
          setHost(msg.hostId);
          pendingRequests = pendingRequests.filter((r) => participants.some((p) => p.id === r.id));
          if (follow && !wasFollow) followHost();
          break;
        }
        case 'state':
          if (!isHost()) await applyRemoteBoard(msg.board);
          break;
        case 'location':
          hostLoc = msg.loc;
          followHost();
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
      // 一次都沒連上:多半是存下的 token 失效(伺服器 401),下次改走完整授權
      if (!opened && act.inDiscord && act.invalidateToken) act.invalidateToken();
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

  // 本機開發:站內連結也要帶著 room/devuser(Discord 參數由 activity.js 處理)
  if (!act.inDiscord) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      const url = new URL(a.getAttribute('href'), location.href);
      if (url.origin !== location.origin) return;
      for (const k of ['room', 'devuser']) if (!url.searchParams.has(k)) url.searchParams.set(k, params.get(k));
      a.setAttribute('href', url.pathname + url.search + url.hash);
    }, true);
  }

  function start() {
    document.body.appendChild(panel);
    render();
    connect().catch(onConnectError);
  }

  if (PAGE === 'board') {
    // 白板要等 boardMain 初始化完(含自動保存還原)
    document.addEventListener('board-ready', () => {
      boardApi = window.BOARD_API;
      boardApi.state.onChange(onLocalBoardChange);
      start();
    });
  } else {
    if (PAGE === 'guide') {
      document.addEventListener('guide-ready', () => {
        guideApi = window.GUIDE_API;
        guideApi.onChange(onLocalLocation);
        sendLocationNow();
        followHost();
      });
    }
    start();
  }
})();
