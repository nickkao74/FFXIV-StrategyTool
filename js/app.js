/* app.js — 攻略頁主控(傳統 script,支援 file:// 雙擊開啟)
 * 注意:ROLE_TYPE 共用 arena.js 的全域宣告。 */

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 行內格式:**粗體**、`code`、{{role:標籤}} 隊伍位置標示 */
function inlineFormat(s) {
  return escapeHtml(s)
    .replace(/\{\{(tank|healer|dps):([^}]+)\}\}/g, '<span class="role-chip role-$1">$2</span>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

/** 表格分隔列,例如 |---|---|  或 | :--- | ---: | */
function isTableRule(t) {
  return /^\|(\s*:?-{2,}:?\s*\|)+$/.test(t);
}

/** 把 | a | b | 切成 ['a','b'];儲存格內可用 <br> 換行 */
function splitRow(t) {
  return t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

/** 極簡 Markdown:**粗體**、`code`、{{role:標籤}}、- 清單、| 表格 | */
function md(text) {
  const lines = text.trim().split('\n');
  let html = '', inList = false;

  const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();

    // ── 表格:連續的 | ... | 行,第二行為分隔列時視為有表頭 ──
    if (t.startsWith('|') && t.endsWith('|') && !isTableRule(t)) {
      const rows = [];
      let hasHead = false;
      while (i < lines.length) {
        const r = lines[i].trim();
        if (!r.startsWith('|') || !r.endsWith('|')) break;
        if (isTableRule(r)) { hasHead = rows.length === 1; i++; continue; }
        rows.push(splitRow(r));
        i++;
      }
      i--; // 迴圈外層會再 ++
      if (rows.length) {
        closeList();
        html += '<table class="md-table">';
        rows.forEach((cells, ri) => {
          const tag = (hasHead && ri === 0) ? 'th' : 'td';
          const tds = cells
            .map((c) => `<${tag}>${inlineFormat(c).replace(/&lt;br\s*\/?&gt;/g, '<br>')}</${tag}>`)
            .join('');
          html += `<tr>${tds}</tr>`;
        });
        html += '</table>';
      }
      continue;
    }

    if (t.startsWith('> ')) {
      closeList();
      html += `<blockquote>${inlineFormat(t.slice(2))}</blockquote>`;
    } else if (t.startsWith('- ')) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${inlineFormat(t.slice(2))}</li>`;
    } else if (t.startsWith('### ')) {
      closeList();
      html += `<h3 class="md-h3">${inlineFormat(t.slice(4))}</h3>`;
    } else if (t === '---') {
      closeList();
      html += '<hr class="md-hr">';
    } else {
      closeList();
      if (t) html += `<p>${inlineFormat(t)}</p>`;
    }
  }
  closeList();
  return html;
}

function loadRaidScript(raidId) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `data/${raidId}.js`;
    s.onload = () => {
      const data = (window.RAID_DATA || {})[raidId];
      data ? resolve(data) : reject(new Error(`資料檔 data/${raidId}.js 內容不正確`));
    };
    s.onerror = () => reject(new Error(`找不到資料檔 data/${raidId}.js`));
    document.head.appendChild(s);
  });
}

async function main() {
  const params = new URLSearchParams(location.search);
  const raidId = params.get('raid') || 'o4s-p1';
  const data = await loadRaidScript(raidId);

  document.title = `${data.name} — FFXIV 攻略工具`;
  document.getElementById('raid-title').textContent = data.name;

  // ── 職位選擇器 ───────────────────────────
  const roleBar = document.getElementById('role-bar');
  let selectedRole = localStorage.getItem('ffxiv-role') || null;
  for (const role of data.roles) {
    const btn = document.createElement('button');
    btn.className = `role-btn role-${ROLE_TYPE[role]}`;
    btn.textContent = role;
    btn.dataset.role = role;
    btn.addEventListener('click', () => {
      selectedRole = selectedRole === role ? null : role;
      if (selectedRole) localStorage.setItem('ffxiv-role', selectedRole);
      else localStorage.removeItem('ffxiv-role');
      syncRole();
    });
    roleBar.appendChild(btn);
  }

  // ── 沙盤 + 播放器 ───────────────────────
  const arena = new Arena(document.getElementById('arena'), data.arena, data.roles);
  const player = new StepPlayer(document.getElementById('player'), arena);

  // ── 頁籤(圖文攻略 / 速查表)───────────────
  const pageTabsEl = document.getElementById('page-tabs');
  const stageEl = document.getElementById('stage');
  const contentEl = document.getElementById('content');
  const timelineEl = document.getElementById('timeline');
  const cheatsheetEl = document.getElementById('cheatsheet-view');
  const pages = [
    { id: 'guide', icon: '📖', label: '圖文攻略' },
    ...(data.cheatsheet && data.cheatsheet.length ? [{ id: 'cheatsheet', icon: '⚡', label: '速查表' }] : []),
  ];
  let currentPage = 'guide';

  for (const p of pages) {
    const btn = document.createElement('button');
    btn.className = 'page-tab';
    btn.dataset.page = p.id;
    btn.innerHTML = `<span class="page-tab-icon">${p.icon}</span><span>${p.label}</span>`;
    btn.addEventListener('click', () => setPage(p.id));
    pageTabsEl.appendChild(btn);
  }

  function setPage(id) {
    currentPage = id;
    [...pageTabsEl.children].forEach((b) => b.classList.toggle('active', b.dataset.page === id));
    const isGuide = id === 'guide';
    stageEl.style.display = isGuide ? '' : 'none';
    contentEl.style.display = isGuide ? '' : 'none';
    timelineEl.style.display = isGuide ? '' : 'none';
    cheatsheetEl.hidden = isGuide;
  }

  // ── 速查表 ──────────────────────────────
  if (data.cheatsheet && data.cheatsheet.length) {
    const grid = document.getElementById('cheat-grid');
    const cheatTabsEl = document.getElementById('cheat-tabs');

    for (const card of data.cheatsheet) {
      const el = document.createElement('div');
      el.className = 'cheat-card';
      el.dataset.phase = card.phase || '';
      el.style.setProperty('--tag-color', `var(--${card.color || 'accent'})`);
      const items = (card.points || []).map((p) => `<li>${inlineFormat(p)}</li>`).join('');
      el.innerHTML = `<h3><span class="cheat-tag">${card.tag || ''}</span>${card.title}</h3><ul>${items}</ul>`;
      grid.appendChild(el);
    }

    function setCheatGroup(id) {
      [...cheatTabsEl.children].forEach((b) => b.classList.toggle('active', b.dataset.group === id));
      for (const el of grid.children) el.hidden = !!id && el.dataset.phase !== id;
      cheatsheetEl.scrollTop = 0;
    }

    /* 卡片有填 phase 才長出分組頁籤;沒填的攻略維持單一長列表。
     * 只有一個階段也不必分組。 */
    const cheatPhases = [...new Set(data.cheatsheet.map((c) => c.phase).filter(Boolean))];
    if (cheatPhases.length > 1) {
      for (const g of [{ id: '', label: '全部' }, ...cheatPhases.map((p) => ({ id: p, label: p }))]) {
        const btn = document.createElement('button');
        btn.className = 'cheat-tab';
        btn.dataset.group = g.id;
        btn.textContent = g.label;
        btn.addEventListener('click', () => setCheatGroup(g.id));
        cheatTabsEl.appendChild(btn);
      }
      setCheatGroup('');
    }
  }

  // ── 時間軸 ──────────────────────────────
  const timeline = timelineEl;
  let currentSection = null;
  // 章節按鈕另存一份:插入階段分隔後 timeline.children 的索引不再等於章節索引
  const timelineItems = [];
  let lastPhase = null;
  data.sections.forEach((sec, i) => {
    // 章節可選填 phase(如 P1/P2/P3);沒填的攻略維持單層列表
    if (sec.phase && sec.phase !== lastPhase) {
      const head = document.createElement('div');
      head.className = 'timeline-phase';
      head.textContent = sec.phase;
      timeline.appendChild(head);
      lastPhase = sec.phase;
    }
    const item = document.createElement('button');
    item.className = 'timeline-item' + (sec.phase ? ' timeline-item-nested' : '');
    item.innerHTML = `<span class="timeline-num">${i + 1}</span><span>${escapeHtml(sec.title)}</span>`;
    item.addEventListener('click', () => { setPage('guide'); showSection(i); });
    timeline.appendChild(item);
    timelineItems.push(item);
  });

  const secTitle = document.getElementById('section-title');
  const secBody = document.getElementById('section-body');
  const roleNotesEl = document.getElementById('role-notes');

  function showSection(i) {
    currentSection = i;
    const sec = data.sections[i];
    timelineItems.forEach((n, j) => n.classList.toggle('active', j === i));
    secTitle.innerHTML = (sec.phase ? `<span class="section-phase">${escapeHtml(sec.phase)}</span>` : '')
      + escapeHtml(sec.title);
    secBody.innerHTML = md(sec.body || '');
    player.load(sec.steps || []);
    renderRoleNotes(sec);
    document.getElementById('content').scrollTop = 0;
  }

  function renderRoleNotes(sec) {
    roleNotesEl.innerHTML = '';
    if (!sec.roleNotes) { roleNotesEl.style.display = 'none'; return; }
    roleNotesEl.style.display = '';
    const entries = Object.entries(sec.roleNotes);
    // 選中職位的職責置頂
    entries.sort(([a], [b]) => (b === selectedRole) - (a === selectedRole));
    for (const [role, note] of entries) {
      // roleNotes 的 key 可為 "MT" 或 "D1-D4" / "H1 H2" 等群組寫法
      const rolesInKey = role.split(/[\s,/]+/).flatMap(expandRange);
      const mine = selectedRole && rolesInKey.includes(selectedRole);
      const div = document.createElement('div');
      div.className = 'role-note' + (mine ? ' mine' : '');
      div.innerHTML = `<span class="role-note-tag role-${roleTypeOfKey(rolesInKey)}">${role}</span><span>${inlineFormat(note)}</span>`;
      roleNotesEl.appendChild(div);
    }
  }

  function expandRange(token) {
    const m = token.match(/^([A-Z]+)(\d)-(?:[A-Z]+)?(\d)$/);
    if (!m) return [token];
    const out = [];
    for (let n = +m[2]; n <= +m[3]; n++) out.push(m[1] + n);
    return out;
  }
  function roleTypeOfKey(roles) {
    return ROLE_TYPE[roles[0]] || 'dps';
  }

  function syncRole() {
    [...roleBar.children].forEach((b) =>
      b.classList.toggle('active', b.dataset.role === selectedRole));
    arena.setSelectedRole(selectedRole);
    if (currentSection != null) renderRoleNotes(data.sections[currentSection]);
    // 重新渲染目前步驟以更新高亮層級
    if (player.steps.length) player.go(player.index, true);
  }

  setPage('guide');
  showSection(0);
  syncRole();
}

main().catch((e) => {
  document.body.insertAdjacentHTML('beforeend',
    `<div style="color:#f66;padding:1em">載入失敗:${e.message}</div>`);
  console.error(e);
});
