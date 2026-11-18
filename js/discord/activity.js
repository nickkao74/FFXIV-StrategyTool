/* activity.js — Discord Activity 啟動層(第一階段:靜態檢視)
 *
 * 只有在 Discord 內嵌時才動作:Discord 開啟 Activity 時會在網址帶上 frame_id、
 * instance_id 等參數,以此判斷。一般瀏覽器開啟時本檔什麼都不做。
 *
 * 必須在其他會 fetch 外部網址的腳本(例如 home.js 的 XIVAPI)「之前」載入:
 * Activity 被 Discord 的 CSP 限制只能連自己的 proxy 網域,patchUrlMappings
 * 會把對外網址改寫成 /<prefix>/...,對應 Developer Portal 裡設定的 URL Mappings。
 */
(() => {
  const params = new URLSearchParams(location.search);
  const inDiscord = params.has('frame_id') && params.has('instance_id');
  window.DISCORD_ACTIVITY = {
    inDiscord, sdk: null, ready: Promise.resolve(null),
    mapUrl: (u) => u,   // 一般瀏覽器:原樣返回
  };
  if (!inDiscord) return;

  document.documentElement.classList.add('in-discord');

  // 與 Developer Portal → Activities → URL Mappings 保持一致
  const URL_MAPPINGS = [
    { prefix: '/xivapi', target: 'v2.xivapi.com' },
  ];
  /* 手動改寫外部網址。patchUrlMappings 只攔得到 fetch/XHR 與「已掛在 DOM 上」元素的
   * src 變動;用 new Image() 建立、尚未插入 DOM 就設定 src 的圖片會直接連外部網域,
   * 被 CSP 擋下而永遠不會 onload。這類情況請先經過 mapUrl。 */
  window.DISCORD_ACTIVITY.mapUrl = (u) => {
    try {
      const url = new URL(u, location.href);
      const m = URL_MAPPINGS.find((x) => url.host === x.target);
      return m ? `${location.origin}${m.prefix}${url.pathname}${url.search}${url.hash}` : u;
    } catch (e) { return u; }
  };

  if (window.discordPatchUrlMappings) {
    window.discordPatchUrlMappings(URL_MAPPINGS, { patchSrcAttributes: true });
  }

  // Discord 在 Activity 內換頁時不會保留 frame_id 等參數,但 SDK 需要它們;
  // 因此把站內連結都補上目前的 Discord 參數。
  const KEEP = ['frame_id', 'instance_id', 'platform', 'guild_id', 'channel_id', 'location_id'];
  const carry = KEEP.filter((k) => params.has(k)).map((k) => [k, params.get(k)]);
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const url = new URL(a.getAttribute('href'), location.href);
    if (url.origin !== location.origin) return;
    for (const [k, v] of carry) if (!url.searchParams.has(k)) url.searchParams.set(k, v);
    a.setAttribute('href', url.pathname + url.search + url.hash);
  }, true);

  const cfg = window.DISCORD_ACTIVITY_CONFIG || {};
  if (!cfg.clientId || !window.DiscordSDK) {
    console.warn('[activity] 缺少 clientId 或 SDK,略過 Discord 握手');
    return;
  }
  const sdk = new window.DiscordSDK(cfg.clientId);
  window.DISCORD_ACTIVITY.sdk = sdk;
  window.DISCORD_ACTIVITY.ready = sdk.ready().then(() => sdk).catch((err) => {
    console.error('[activity] Discord SDK ready 失敗', err);
    return null;
  });

  /* 取得 Discord 身分(M2 主持人模式用)。
   * authorize(prompt:none,使用者第一次會看到授權視窗)→ /api/token 換 access_token
   * → authenticate。token 存在 sessionStorage,同一次 Activity 內換頁不必重新授權。 */
  const TOKEN_KEY = `discord-token:${params.get('instance_id')}`;
  let authPromise = null;
  window.DISCORD_ACTIVITY.auth = () => authPromise || (authPromise = (async () => {
    const s = await window.DISCORD_ACTIVITY.ready;
    if (!s) throw new Error('Discord SDK 未就緒');
    let accessToken = null;
    try { accessToken = sessionStorage.getItem(TOKEN_KEY); } catch (e) { /* ignore */ }
    let auth = null;
    if (accessToken) {
      try { auth = await s.commands.authenticate({ access_token: accessToken }); } catch (e) { auth = null; }
    }
    if (!auth) {
      const { code } = await s.commands.authorize({
        client_id: cfg.clientId, response_type: 'code', state: '', prompt: 'none', scope: ['identify'],
      });
      const res = await fetch('/api/token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }),
      });
      if (!res.ok) throw new Error(`token 交換失敗 (${res.status})`);
      ({ access_token: accessToken } = await res.json());
      auth = await s.commands.authenticate({ access_token: accessToken });
      try { sessionStorage.setItem(TOKEN_KEY, accessToken); } catch (e) { /* ignore */ }
    }
    const u = auth.user;
    return { user: { id: u.id, name: u.global_name || u.username }, accessToken, instanceId: s.instanceId };
  })());
})();
