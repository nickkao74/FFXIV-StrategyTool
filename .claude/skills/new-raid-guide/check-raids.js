/* 檢查 data/raids.js 與各攻略資料檔是否一致(首頁卡片會用到的欄位)。
 * 用法(在專案根目錄):node .claude/skills/new-raid-guide/check-raids.js
 * 有錯誤時以非 0 結束,並逐條列出;只有警告時仍以 0 結束。 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
global.window = {};
require(path.join(ROOT, 'data', 'raids.js'));
const list = window.RAID_LIST || [];
const archive = window.RAID_ARCHIVE || [];

const CATEGORIES = ['ultimate', 'savage', 'extreme'];
const errors = [];
const warns = [];

function loadRaid(id) {
  const file = path.join(ROOT, 'data', `${id}.js`);
  if (!fs.existsSync(file)) return null;
  require(file);
  return (window.RAID_DATA || {})[id] || null;
}

const ids = new Set();
for (const r of list) {
  const at = `RAID_LIST「${r.id}」`;
  if (ids.has(r.id)) errors.push(`${at}:id 重複`);
  ids.add(r.id);

  const data = loadRaid(r.id);
  if (!data) { errors.push(`${at}:找不到 data/${r.id}.js,或檔內沒有 window.RAID_DATA['${r.id}']`); continue; }

  for (const k of ['name', 'title', 'category', 'patch', 'author']) {
    if (!r[k] || !String(r[k]).trim()) errors.push(`${at}:缺少 ${k}`);
  }
  if (r.category && !CATEGORIES.includes(r.category)) {
    errors.push(`${at}:category「${r.category}」不是 ${CATEGORIES.join(' / ')};要新增難度須同步改 js/home.js 的 CATEGORIES 與 css 的 .cat-* 色票`);
  }
  if (r.category === 'ultimate' && r.series) warns.push(`${at}:絕境戰目前不設系列(series),確認是否真的需要`);
  if (r.alias && /\s/.test(r.alias)) warns.push(`${at}:alias「${r.alias}」含空白,代號通常是 UWU、O4S 這種短碼`);

  if (!Array.isArray(r.phases) || !r.phases.length) {
    errors.push(`${at}:phases 是空的,至少要有一個階段膠囊`);
  } else {
    const secIds = new Set((data.sections || []).map((s) => s.id));
    for (const p of r.phases) {
      if (!p.label) errors.push(`${at}:有階段膠囊沒有 label`);
      if (!secIds.has(p.section)) errors.push(`${at}:階段「${p.label}」指向的章節 id「${p.section}」不存在於 data/${r.id}.js`);
    }
    // 攻略裡有、首頁卻沒列出的階段
    const listed = new Set(r.phases.map((p) => p.section));
    const firstOfPhase = [];
    let last;
    for (const s of data.sections || []) {
      if (s.phase && s.phase !== last && s.phase !== '戰前') firstOfPhase.push(s);
      last = s.phase;
    }
    for (const s of firstOfPhase) {
      if (!listed.has(s.id)) warns.push(`${at}:攻略有階段「${s.phase}」(第一章 ${s.id}),但首頁 phases 沒有列出`);
    }
  }

  const b = r.banner || {};
  if (!b.url && !b.xivapi) warns.push(`${at}:沒有 banner,卡片橫幅會一直是難度色塊`);
}

for (const r of archive) {
  const at = `RAID_ARCHIVE「${r.id}」`;
  if (!loadRaid(r.id)) errors.push(`${at}:找不到 data/${r.id}.js`);
  if (!r.author) errors.push(`${at}:缺少 author`);
  if (r.replacedBy && !ids.has(r.replacedBy)) errors.push(`${at}:replacedBy「${r.replacedBy}」不在 RAID_LIST`);
  if (ids.has(r.id)) errors.push(`${at}:同一個 id 同時出現在 RAID_LIST 與 RAID_ARCHIVE`);
}

for (const w of warns) console.log(`⚠ ${w}`);
for (const e of errors) console.log(`✗ ${e}`);
console.log(errors.length ? `\n${errors.length} 個錯誤、${warns.length} 個警告` : `✓ raids.js 檢查通過(${list.length} 個攻略、${archive.length} 個封存,${warns.length} 個警告)`);
process.exit(errors.length ? 1 : 0);
