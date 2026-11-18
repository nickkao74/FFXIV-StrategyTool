/* room.js — 房間 Durable Object(每個 Discord Activity instanceId 一間)
 *
 * 職責:
 *   - 管理參與者連線(WebSocket Hibernation API,閒置時不計費)
 *   - 主持人規則:第一個進入者成為主持人;主持人可指派;參與者可申請、主持人同意才轉移;
 *     主持人斷線保留 HOST_GRACE_MS,期滿交給最早加入且仍在線者
 *   - 只接受主持人送來的盤面,保存最後一份並轉發給其他人(晚加入者直接拿到目前盤面)
 *
 * 訊息格式(JSON):
 *   client → server  { type:'state', board }            主持人廣播盤面(整份)
 *                    { type:'request_host' }             申請主持
 *                    { type:'respond_request', userId, accept }   主持人回覆申請
 *                    { type:'assign_host', userId }      主持人指派
 *                    { type:'location', loc }            主持人目前所在頁面(攻略跟隨用)
 *                    { type:'set_follow', on }           主持人開關「攻略頁跟隨主持人」(預設關)
 *   server → client  { type:'welcome', you, hostId, participants, board, location, follow }
 *                    { type:'participants', hostId, participants, graceUntil, follow }
 *                    { type:'location', loc }
 *                    { type:'state', board }
 *                    { type:'host_request', from:{id,name} } (只送主持人)
 *                    { type:'request_result', accept }   (只送申請者)
 *                    { type:'error', message }
 *   預留:{ type:'patch', ops } 單一物件變更(M3 多人編輯用),目前伺服器會拒收。
 */
const HOST_GRACE_MS = 30_000;
const MAX_BOARD_BYTES = 1_500_000;

export class Room {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  // ── 連線 ─────────────────────────────
  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }
    const user = JSON.parse(request.headers.get('X-Room-User'));
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const joinOrder = (await this.ctx.storage.get('joinOrder')) || {};
    if (!joinOrder[user.id]) {
      joinOrder[user.id] = Date.now();
      await this.ctx.storage.put('joinOrder', joinOrder);
    }
    this.ctx.acceptWebSocket(server, [user.id]);
    server.serializeAttachment({ id: user.id, name: user.name });

    let hostId = await this.ctx.storage.get('hostId');
    if (!hostId) {
      hostId = user.id;
      await this.ctx.storage.put('hostId', hostId);
    } else if (hostId === user.id) {
      // 主持人在寬限期內重連:取消轉移
      await this.ctx.storage.delete('graceUntil');
      await this.ctx.storage.deleteAlarm();
    }

    const board = await this.ctx.storage.get('board');
    this._send(server, {
      type: 'welcome',
      you: user,
      hostId,
      participants: this._participants(joinOrder),
      board: board || null,
      location: (await this.ctx.storage.get('location')) || null,
      follow: !!(await this.ctx.storage.get('follow')),
    });
    await this._broadcastParticipants();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, raw) {
    const me = ws.deserializeAttachment();
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const hostId = await this.ctx.storage.get('hostId');
    const isHost = me.id === hostId;

    switch (msg.type) {
      case 'state': {
        if (!isHost) return this._send(ws, { type: 'error', message: 'not_host' });
        const text = JSON.stringify(msg.board);
        if (text.length > MAX_BOARD_BYTES) return this._send(ws, { type: 'error', message: 'board_too_large' });
        await this.ctx.storage.put('board', msg.board);
        this._broadcast({ type: 'state', board: msg.board }, me.id);
        break;
      }
      case 'location': {
        if (!isHost || !msg.loc || typeof msg.loc !== 'object') return;
        const loc = {
          page: String(msg.loc.page || ''), raid: msg.loc.raid ? String(msg.loc.raid) : null,
          section: msg.loc.section ? String(msg.loc.section) : null,
          step: Number.isInteger(msg.loc.step) ? msg.loc.step : 0,
          tab: msg.loc.tab ? String(msg.loc.tab) : null,
        };
        await this.ctx.storage.put('location', loc);
        this._broadcast({ type: 'location', loc }, me.id);
        break;
      }
      case 'set_follow': {
        if (!isHost) return;
        await this.ctx.storage.put('follow', !!msg.on);
        await this._broadcastParticipants();
        break;
      }
      case 'request_host': {
        if (isHost) return;
        for (const s of this.ctx.getWebSockets(hostId)) {
          this._send(s, { type: 'host_request', from: { id: me.id, name: me.name } });
        }
        break;
      }
      case 'respond_request': {
        if (!isHost) return;
        for (const s of this.ctx.getWebSockets(msg.userId)) {
          this._send(s, { type: 'request_result', accept: !!msg.accept });
        }
        if (msg.accept && this._isOnline(msg.userId)) await this._setHost(msg.userId);
        break;
      }
      case 'assign_host': {
        if (!isHost || !this._isOnline(msg.userId)) return;
        await this._setHost(msg.userId);
        break;
      }
      default:
        this._send(ws, { type: 'error', message: 'unknown_type' });
    }
  }

  async webSocketClose(ws) { await this._onLeave(ws); }
  async webSocketError(ws) { await this._onLeave(ws); }

  async _onLeave(ws) {
    const me = ws.deserializeAttachment();
    const stillHere = this.ctx.getWebSockets(me.id).some((s) => s !== ws && s.readyState === 1);
    if (!stillHere) {
      const hostId = await this.ctx.storage.get('hostId');
      if (me.id === hostId) {
        const graceUntil = Date.now() + HOST_GRACE_MS;
        await this.ctx.storage.put('graceUntil', graceUntil);
        await this.ctx.storage.setAlarm(graceUntil);
      }
    }
    await this._broadcastParticipants(ws);
  }

  /** 主持人寬限期到:交給最早加入且仍在線者;沒人在線就清空,下一個進來的人當主持人 */
  async alarm() {
    const hostId = await this.ctx.storage.get('hostId');
    await this.ctx.storage.delete('graceUntil');
    if (hostId && this._isOnline(hostId)) return;
    const joinOrder = (await this.ctx.storage.get('joinOrder')) || {};
    const next = this._participants(joinOrder)[0];
    if (next) await this._setHost(next.id);
    else await this.ctx.storage.delete('hostId');
  }

  // ── 工具 ─────────────────────────────
  async _setHost(userId) {
    await this.ctx.storage.put('hostId', userId);
    await this.ctx.storage.delete('graceUntil');
    await this.ctx.storage.deleteAlarm();
    await this._broadcastParticipants();
  }

  _isOnline(userId) {
    return this.ctx.getWebSockets(userId).some((s) => s.readyState === 1);
  }

  /** 線上參與者(同一人多個連線只算一次),依加入順序排列 */
  _participants(joinOrder, exclude) {
    const seen = new Map();
    for (const s of this.ctx.getWebSockets()) {
      if (s === exclude || s.readyState !== 1) continue;
      const a = s.deserializeAttachment();
      if (a && !seen.has(a.id)) seen.set(a.id, { id: a.id, name: a.name, joinedAt: joinOrder[a.id] || 0 });
    }
    return [...seen.values()].sort((x, y) => x.joinedAt - y.joinedAt);
  }

  async _broadcastParticipants(exclude) {
    const joinOrder = (await this.ctx.storage.get('joinOrder')) || {};
    const hostId = (await this.ctx.storage.get('hostId')) || null;
    const graceUntil = (await this.ctx.storage.get('graceUntil')) || null;
    const follow = !!(await this.ctx.storage.get('follow'));
    const participants = this._participants(joinOrder, exclude);
    for (const s of this.ctx.getWebSockets()) {
      if (s !== exclude) this._send(s, { type: 'participants', hostId, participants, graceUntil, follow });
    }
  }

  _broadcast(msg, exceptUserId) {
    const text = JSON.stringify(msg);
    for (const s of this.ctx.getWebSockets()) {
      const a = s.deserializeAttachment();
      if (a && a.id !== exceptUserId) { try { s.send(text); } catch { /* 已斷線 */ } }
    }
  }

  _send(ws, msg) { try { ws.send(JSON.stringify(msg)); } catch { /* 已斷線 */ } }
}
