/* 首頁:攻略卡片、難度篩選、搜尋、封存區、副本橫幅。資料來自 data/raids.js。 */
(() => {
  const XIVAPI = 'https://v2.xivapi.com/api';
  const CATEGORIES = [
    { id: 'ultimate', label: '絕境戰' },
    { id: 'savage', label: '零式' },
    { id: 'extreme', label: '極' },
  ];
  const catLabel = (id) => (CATEGORIES.find((c) => c.id === id) || {}).label || '';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const list = document.getElementById('raid-list');
  const raids = window.RAID_LIST;
  if (!raids) { list.textContent = '載入失敗:找不到 data/raids.js'; return; }

  // ── 攻略卡 ──────────────────────────────
  const guideUrl = (id, section) =>
    `guide.html?raid=${encodeURIComponent(id)}` + (section ? `&section=${encodeURIComponent(section)}` : '');

  const cards = raids.map((raid) => {
    const card = document.createElement('article');
    card.className = `raid-card cat-${raid.category || 'extreme'}`;
    if (raid.description) card.title = raid.description;
    const title = raid.title || raid.name;
    const phases = (raid.phases || []).map((p) =>
      `<a class="phase-chip" href="${guideUrl(raid.id, p.section)}">${esc(p.label)}</a>`).join('');
    card.innerHTML = `
      <div class="raid-banner"><span>${esc(title)}</span></div>
      <div class="raid-body">
        <div class="raid-meta">
          <span class="cat-tag">${esc(catLabel(raid.category))}</span>
          ${raid.series ? `<span class="series-tag">${esc(raid.series)}</span>` : ''}
          <span>${esc(raid.patch)}</span>
        </div>
        <a class="raid-card-link raid-titles" href="${guideUrl(raid.id)}">
          <strong>${esc(title)}${raid.alias ? ` <span class="raid-alias">${esc(raid.alias)}</span>` : ''}</strong>
          ${raid.subtitle ? `<span>${esc(raid.subtitle)}</span>` : ''}
        </a>
        ${phases ? `<nav class="phase-chips" aria-label="跳到階段">${phases}</nav>` : ''}
        <div class="raid-foot">
          <span>攻略來源:<span class="raid-author">${esc(raid.author || '未標示')}</span></span>
          ${raid.measured ? '<span>沙盤圖:實測尺寸</span>' : ''}
        </div>
      </div>`;
    loadBanner(raid, card.querySelector('.raid-banner'));
    // 搜尋比對的文字:名稱、代號、系列、副標、階段、說明、作者
    const haystack = [raid.name, raid.title, raid.alias, raid.series, raid.subtitle, raid.description, raid.author,
      ...(raid.phases || []).map((p) => p.label)].join(' ').toLowerCase();
    return { raid, card, haystack };
  });

  list.innerHTML = '';
  for (const c of cards) list.appendChild(c.card);

  // ── 篩選與搜尋 ─────────────────────────
  /* 第一層:難度。第二層:系列(只在目前難度底下有系列時出現,例如零式→歐米茄、極→四聖獸)。
   * 選「全部」難度時,第二層列出所有系列。 */
  const tabsEl = document.getElementById('filter-tabs');
  const seriesEl = document.getElementById('series-tabs');
  const searchEl = document.getElementById('raid-search');
  const emptyEl = document.getElementById('raid-empty');
  let activeCat = 'all';
  let activeSeries = 'all';

  const makeTab = (cls, label, count, onClick) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = cls;
    btn.innerHTML = `${esc(label)}<span class="filter-count">${count}</span>`;
    btn.addEventListener('click', onClick);
    return btn;
  };

  const tabs = [{ id: 'all', label: '全部' }, ...CATEGORIES]
    .map((t) => ({ ...t, count: t.id === 'all' ? raids.length : raids.filter((r) => r.category === t.id).length }))
    .filter((t) => t.id === 'all' || t.count > 0);
  for (const t of tabs) {
    const btn = makeTab('filter-tab', t.label, t.count, () => { activeCat = t.id; activeSeries = 'all'; renderSeries(); applyFilter(); });
    btn.dataset.cat = t.id;
    tabsEl.appendChild(btn);
  }

  function renderSeries() {
    const pool = raids.filter((r) => activeCat === 'all' || r.category === activeCat);
    const names = [...new Set(pool.map((r) => r.series).filter(Boolean))];
    seriesEl.replaceChildren();
    seriesEl.hidden = !names.length;
    if (!names.length) return;
    for (const name of ['all', ...names]) {
      const count = name === 'all' ? pool.length : pool.filter((r) => r.series === name).length;
      const btn = makeTab('series-tab', name === 'all' ? '全部系列' : name, count,
        () => { activeSeries = name; applyFilter(); });
      btn.dataset.series = name;
      seriesEl.appendChild(btn);
    }
  }

  searchEl.addEventListener('input', applyFilter);

  function applyFilter() {
    const q = searchEl.value.trim().toLowerCase();
    let shown = 0;
    for (const { raid, card, haystack } of cards) {
      const ok = (activeCat === 'all' || raid.category === activeCat)
        && (activeSeries === 'all' || raid.series === activeSeries)
        && (!q || haystack.includes(q));
      card.hidden = !ok;
      if (ok) shown++;
    }
    const mark = (el, key, value) => {
      for (const b of el.children) {
        const on = b.dataset[key] === value;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on);
      }
    };
    mark(tabsEl, 'cat', activeCat);
    mark(seriesEl, 'series', activeSeries);
    emptyEl.hidden = shown > 0;
  }
  renderSeries();
  applyFilter();

  // ── 封存區 ──────────────────────────────
  // 沒有內容就整塊不顯示,免得留一個永遠空的折疊區
  const archive = window.RAID_ARCHIVE || [];
  const box = document.getElementById('archive');
  if (!archive.length) box.remove();
  else {
    box.querySelector('summary').textContent = `封存(${archive.length})`;
    const byId = new Map(raids.map((r) => [r.id, r.title || r.name]));
    const archiveList = document.getElementById('archive-list');
    for (const raid of archive) {
      const now = byId.get(raid.replacedBy);
      const a = document.createElement('a');
      a.className = 'archive-card';
      a.href = guideUrl(raid.id);
      a.innerHTML = `<strong>${esc(raid.name)}</strong>`
        + (now ? `<span class="pill-note archive-replaced">已由「${esc(now)}」取代</span>` : '')
        + `<p>${esc(raid.description)}</p>`
        + `<p>攻略來源:${esc(raid.author || '未標示')}</p>`;
      archiveList.appendChild(a);
    }
  }

  // ── 副本橫幅 ────────────────────────────
  /* banner.url:直接使用指定圖檔。
   * banner.xivapi:用任務搜尋器的英文名稱向 XIVAPI 查 ContentFinderCondition 的封面圖(376×120)。
   * 查到的網址存在 localStorage,下次不用再查;查不到或離線就維持難度色塊。 */
  function loadBanner(raid, el) {
    const b = raid.banner || {};
    const show = (url) => {
      if (!url) return;
      const img = new Image();
      img.alt = '';
      img.decoding = 'async';
      img.onload = () => { el.replaceChildren(img); };
      img.src = url;
    };
    if (b.url) { show(b.url); return; }
    if (!b.xivapi) return;
    xivapiBanner(b.xivapi).then(show).catch(() => {});
  }

  async function xivapiBanner(name) {
    const key = `ffxiv-banner:${name}`;
    try { const hit = localStorage.getItem(key); if (hit) return hit; } catch (e) { /* 無痕模式等 */ }
    const q = new URLSearchParams({
      sheets: 'ContentFinderCondition',
      query: `Name~"${name}"`,
      fields: 'Name,Image',
      language: 'en',
      limit: '1',
    });
    const res = await fetch(`${XIVAPI}/search?${q}`);
    if (!res.ok) throw new Error(`XIVAPI ${res.status}`);
    const json = await res.json();
    const img = json.results && json.results[0] && json.results[0].fields && json.results[0].fields.Image;
    const path = img && (img.path_hr1 || img.path);
    if (!path) throw new Error('XIVAPI 找不到封面圖');
    const url = `${XIVAPI}/asset?path=${encodeURIComponent(path)}&format=png`;
    try { localStorage.setItem(key, url); } catch (e) { /* 存不了就下次再查 */ }
    return url;
  }
})();
