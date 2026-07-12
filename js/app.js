/* app.js — 攻略頁主控(傳統 script,支援 file:// 雙擊開啟)
 * 注意:ROLE_TYPE 共用 arena.js 的全域宣告。 */

/** 極簡 Markdown:**粗體**、`code`、換行、- 清單 */
function md(text) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = esc(text.trim()).split('\n');
  let html = '', inList = false;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('- ')) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${inline(t.slice(2))}</li>`;
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      if (t) html += `<p>${inline(t)}</p>`;
    }
  }
  if (inList) html += '</ul>';
  return html;
  function inline(s) {
    return s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  }
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

  // ── 時間軸 ──────────────────────────────
  const timeline = document.getElementById('timeline');
  let currentSection = null;
  data.sections.forEach((sec, i) => {
    const item = document.createElement('button');
    item.className = 'timeline-item';
    item.innerHTML = `<span class="timeline-num">${i + 1}</span><span>${sec.title}</span>`;
    item.addEventListener('click', () => showSection(i));
    timeline.appendChild(item);
  });

  const secTitle = document.getElementById('section-title');
  const secBody = document.getElementById('section-body');
  const roleNotesEl = document.getElementById('role-notes');

  function showSection(i) {
    currentSection = i;
    const sec = data.sections[i];
    [...timeline.children].forEach((n, j) => n.classList.toggle('active', j === i));
    secTitle.textContent = sec.title;
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
      div.innerHTML = `<span class="role-note-tag role-${roleTypeOfKey(rolesInKey)}">${role}</span><span>${note}</span>`;
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

  showSection(0);
  syncRole();
}

main().catch((e) => {
  document.body.insertAdjacentHTML('beforeend',
    `<div style="color:#f66;padding:1em">載入失敗:${e.message}</div>`);
  console.error(e);
});
