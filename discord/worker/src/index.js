/* Discord Activity Worker
 * /api/token  POST {code} → 向 Discord 交換 access_token(client secret 只存在這裡)
 * /api/room   WebSocket   → 驗證身分後轉給該 instance 的 Room Durable Object
 * 其他路徑    → 靜態網站(wrangler.toml 的 [assets])
 */
export { Room } from './room.js';

async function identify(url, env) {
  // 本機開發:.dev.vars 設 DEV_MODE=1 時可用 ?devuser=名稱 跳過 Discord 驗證
  const devUser = url.searchParams.get('devuser');
  if (env.DEV_MODE === '1' && devUser) return { id: `dev-${devUser}`, name: devUser };

  const token = url.searchParams.get('token');
  if (!token) return null;
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const u = await res.json();
  return { id: u.id, name: u.global_name || u.username };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/token') {
      if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
      if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) {
        return Response.json({ error: 'server_not_configured' }, { status: 500 });
      }
      let code;
      try { ({ code } = await request.json()); } catch { /* fallthrough */ }
      if (!code) return Response.json({ error: 'missing_code' }, { status: 400 });

      const res = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.DISCORD_CLIENT_ID,
          client_secret: env.DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
        }),
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: 'token_exchange_failed' }, { status: 502 });
      return Response.json({ access_token: data.access_token, expires_in: data.expires_in });
    }

    if (url.pathname === '/api/room') {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
      const instance = url.searchParams.get('instance');
      if (!instance || instance.length > 200) return new Response('missing instance', { status: 400 });
      const user = await identify(url, env);
      if (!user) return new Response('unauthorized', { status: 401 });

      const stub = env.ROOMS.get(env.ROOMS.idFromName(instance));
      const headers = new Headers(request.headers);
      headers.set('X-Room-User', JSON.stringify(user));
      return stub.fetch(new Request(request.url, { headers }));
    }

    return env.ASSETS.fetch(request);
  },
};
