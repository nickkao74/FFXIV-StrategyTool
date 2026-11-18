/* Discord Activity Worker
 * /api/token  POST {code} → 向 Discord 交換 access_token(client secret 只存在這裡)
 * 其他路徑    → 靜態網站(wrangler.toml 的 [assets])
 */
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
      return Response.json({ access_token: data.access_token });
    }

    return env.ASSETS.fetch(request);
  },
};
