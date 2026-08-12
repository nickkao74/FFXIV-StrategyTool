// 離線腳本：把篩選後的 TextVerbose / Network log 轉成戰術白板重播用的精簡 JSON。
// 用法: node scripts/parse-fight-log.js <TextVerbose.log> <Network.log> <輸出.json>
'use strict';
const fs = require('fs');
const readline = require('readline');

const [,, textPath, netPath, outPath] = process.argv;
if (!textPath || !netPath || !outPath) {
  console.error('用法: node scripts/parse-fight-log.js <TextVerbose.log> <Network.log> <輸出.json>');
  process.exit(1);
}

const SAMPLE_SEC = 0.5;

function parseTs(s) {
  // "2026-08-04T23:33:10.0006371" 或帶 +08:00
  return Date.parse(s.replace(/(\.\d{3})\d*/, '$1'));
}

async function forEachLine(path, fn) {
  const rl = readline.createInterface({ input: fs.createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) fn(line);
}

// ---------- Pass 1: TextVerbose ----------
const actors = new Map(); // id -> {name, type}
const tracked = new Set(); // 追蹤位置的 actor id（玩家 + 朱雀本體）
const lastPos = new Map(); // id -> {x,y,heading}
const positions = new Map(); // id -> [[t,x,y,heading], ...]
const bossHP = []; // [t,hp,maxHp] 朱雀本體
const playerHP = new Map(); // id -> [[t,hp,maxHp]]
const statusRaw = []; // {t,target,targetName,statusId,statusName,stacks,duration,source}
const casts = []; // {t,ability,x,y,castTime} — BOSS 技能施放，用來畫機制範圍(telegraph)

let fightStartMs = null;
let firstMs = null;
let lastMs = null;
let nextTick = null;

function registerActor(id, name, type) {
  if (!actors.has(id)) actors.set(id, { name, type });
  if (type === 'Player') tracked.add(id);
  if (type === 'Enemy' && name === '朱雀') tracked.add(id);
}

function maybeSampleTick(ms) {
  if (nextTick === null) return;
  while (ms >= nextTick) {
    const t = +(((nextTick - fightStartMs) / 1000).toFixed(2));
    for (const id of tracked) {
      const p = lastPos.get(id);
      if (!p) continue;
      if (!positions.has(id)) positions.set(id, []);
      positions.get(id).push([t, p.x, p.y, p.heading]);
    }
    nextTick += SAMPLE_SEC * 1000;
  }
}

async function pass1() {
  await forEachLine(textPath, (line) => {
    if (!line) return;
    const bar = line.indexOf('|');
    if (bar < 0) return;
    const tsStr = line.slice(0, bar);
    const rest = line.slice(bar + 1);
    const type = rest.slice(0, 4);
    const ms = parseTs(tsStr);
    if (Number.isNaN(ms)) return;
    if (firstMs === null) firstMs = ms;
    lastMs = ms;

    if (type === 'MOVE') {
      const fields = rest.split('|');
      const id = fields[1];
      const posParts = fields[2] ? fields[2].split('/') : null;
      const heading = fields[3];
      if (!posParts || posParts.length < 3) return;
      lastPos.set(id, { x: +posParts[0], y: +posParts[2], heading: +heading });
      if (tracked.has(id)) maybeSampleTick(ms);
      return;
    }

    if (type === 'HP  ') {
      const fields = rest.split('|');
      const desc = fields[1]; // id/dataId/name/type/x/y/z/heading
      if (!desc) return;
      const d = desc.split('/');
      const id = d[0], name = d[2], atype = d[3];
      registerActor(id, name, atype);
      const cur = +fields[2], max = +fields[3];
      const t = fightStartMs !== null ? +(((ms - fightStartMs) / 1000).toFixed(2)) : null;
      if (t !== null) {
        if (atype === 'Enemy' && name === '朱雀') bossHP.push([t, cur, max]);
        else if (atype === 'Player') {
          if (!playerHP.has(id)) playerHP.set(id, []);
          playerHP.get(id).push([t, cur, max]);
        }
      }
      return;
    }

    if (type === 'STA+') {
      const fields = rest.split('|');
      const desc = fields[1];
      if (!desc) return;
      const d = desc.split('/');
      const id = d[0], name = d[2], atype = d[3];
      registerActor(id, name, atype);
      const stacks = fields[2];
      const idName = fields[3] || ''; // "48 '進食'"
      const m = idName.match(/^(\S+)\s+'(.*)'$/);
      const statusId = m ? m[1] : idName;
      const statusName = m ? m[2] : idName;
      const duration = +fields[5];
      const sourceDesc = fields[6] || '';
      const sourceName = sourceDesc.split('/')[2] || '';
      const t = fightStartMs !== null ? +(((ms - fightStartMs) / 1000).toFixed(2)) : null;
      if (t !== null) {
        statusRaw.push({ t, target: id, targetName: name, statusId, statusName, stacks: +stacks || 0, duration: Number.isFinite(duration) ? duration : null, source: sourceName });
      }
      return;
    }

    if (type === 'CST+') {
      // 技能施放：只收 BOSS(朱雀本體 或 其 Helper 分身，AOE 常由 Helper 施放)發動的技能，
      // 用來畫機制範圍(telegraph)。log 沒有實際判定半徑，前端會用預設半徑示意。
      const fields = rest.split('|');
      const casterDesc = fields[1];
      if (!casterDesc) return;
      const cd = casterDesc.split('/');
      const casterName = cd[2], casterType = cd[3];
      if (casterName !== '朱雀' || (casterType !== 'Enemy' && casterType !== 'Helper')) return;
      const abilityM = (fields[2] || '').match(/'(.*)'$/);
      const ability = abilityM ? abilityM[1] : (fields[2] || '');
      const targetPos = (fields[4] || '').split('/');
      if (targetPos.length < 3) return;
      const x = +targetPos[0], y = +targetPos[2];
      const castTimeParts = (fields[5] || '').split('/');
      const castTime = +castTimeParts[1] || 0;
      const t = fightStartMs !== null ? +(((ms - fightStartMs) / 1000).toFixed(2)) : null;
      if (t !== null && Number.isFinite(x) && Number.isFinite(y)) {
        casts.push({ t, ability, x, y, castTime });
      }
      return;
    }

    if (type === 'ACT+') {
      // 抓 job，補充玩家資訊（HP/STA+ 已能取得 name/type，這裡補 job）
      const fields = rest.split('|');
      const id = fields[1];
      const name = fields[5];
      const job = fields[8];
      if (job && job !== 'None') {
        registerActor(id, name, 'Player');
        actors.get(id).job = job;
      }
      return;
    }

    if (type === '戰鬥開始') return; // n/a
  });
}

// ---------- 找戰鬥開始時間：從 TextVerbose 掃一次太浪費，改在 pass1 中若遇不到就退而求其次 ----------
// 直接用外部傳入或預設：呼叫端可在檔名/CLI 帶入，這裡簡化為抓檔案最早時間為 t=0 起點，
// 實際「戰鬥開始」時間由 Network log 的「戰鬥開始！」文字決定，pass2 前會設定 fightStartMs。

// ---------- Pass 2: Network（傷害 / 治療 / 戰鬥起訖） ----------
const damage = [];
let combatStartMs = null;
let combatEndMs = null;
let taskEndMs = null;

function stripName(s) { return s.trim(); }
// FFXIV 聊天記錄的「結果行」開頭常是空白 + 私用區圖示字元(如 U+E06F)，不是單純空白，需一併清掉。
function cleanLead(s) { return s.replace(/^[\s\u{E000}-\u{F8FF}]+/u, ''); }

async function pass2() {
  let currentCaster = null;
  let currentAbility = null;

  await forEachLine(netPath, (line) => {
    if (!line) return;
    const fields = line.split('|');
    if (fields[0] !== '00') return;
    const tsStr = fields[1];
    const ms = Date.parse(tsStr);
    if (Number.isNaN(ms)) return;
    const text = fields[4] || '';

    if (text.includes('戰鬥開始！') && combatStartMs === null) combatStartMs = ms;
    if (text.includes('任務結束了')) taskEndMs = ms;

    const indented = /^\s/.test(text);
    const trimmed = text.trim();
    if (!trimmed) return;

    // 傷害/治療判斷用的旗標
    function extractFlags(s) {
      let crit = false, directHit = false;
      let str = s;
      str = cleanLead(str);
      const m = str.match(/^(直擊加暴擊！|暴擊！|直擊！)\s*/);
      if (m) {
        if (m[1].includes('直擊')) directHit = true;
        if (m[1].includes('暴擊')) crit = true;
        str = cleanLead(str.slice(m[0].length));
      }
      return { crit, directHit, str };
    }

    if (!indented) {
      // 嘗試抓 "來源 發動了/詠唱了/發動攻擊「技能」 (可能後面直接接結果文字)"
      const m = trimmed.match(/^(.+?)(發動了|詠唱了|正在詠唱|發動攻擊)(?:「([^」]*)」)?\s*(.*)$/);
      if (m) {
        currentCaster = stripName(m[1]);
        currentAbility = m[3] || null;
        const restText = m[4] || '';
        if (restText && /受到了|恢復了/.test(restText)) {
          parseResult(restText);
        }
        return;
      }
      // 非動作行（例如狀態效果訊息），若本身含傷害/治療字樣也嘗試解析（保守起見略過，避免誤判）
      return;
    }

    // 縮排結果行
    parseResult(trimmed);

    function parseResult(raw) {
      const { crit, directHit, str } = extractFlags(raw);
      let m;
      if ((m = str.match(/^(\S+?)受到了(\d+)(?:\(\+\d+%\))?點傷害/))) {
        const target = m[1], amount = +m[2];
        const t = fightStartMs !== null ? +(((ms - fightStartMs) / 1000).toFixed(2)) : null;
        if (t !== null) damage.push({ t, kind: 'damage', source: currentCaster, ability: currentAbility, target, amount, crit, directHit });
        return;
      }
      if ((m = str.match(/^(\S+?)恢復了(\d+)點?(HP|MP)/))) {
        const target = m[1], amount = +m[2], resource = m[3];
        if (resource !== 'HP') return;
        const t = fightStartMs !== null ? +(((ms - fightStartMs) / 1000).toFixed(2)) : null;
        if (t !== null) damage.push({ t, kind: 'heal', source: currentCaster, ability: currentAbility, target, amount, crit, directHit });
        return;
      }
      if ((m = str.match(/^「(.+?)」恢復了(\S+?)(\d+)點?HP/))) {
        // 「心關」恢復了尼克斯7330HP。 型式：來源在前
        const src = m[1], target = m[2], amount = +m[3];
        const t = fightStartMs !== null ? +(((ms - fightStartMs) / 1000).toFixed(2)) : null;
        if (t !== null) damage.push({ t, kind: 'heal', source: src, ability: currentAbility, target, amount, crit, directHit });
      }
    }
  });
}

(async () => {
  // 先掃一次 Network log：蒐集所有「戰鬥開始！」時間點（同一份 log 可能包含團滅後的重新挑戰，
  // 也就是不只一次「戰鬥開始！」），預設取「最後一次」開場當作本次重播的 t=0 基準（= 最終那次挑戰）。
  // 如需改抓其他次，可用環境變數 PULL_START_ISO 指定該次「戰鬥開始！」的時間戳（需與 log 內文字一致）。
  const combatStarts = [];
  await new Promise((resolve) => {
    forEachLine(netPath, (line) => {
      if (line.startsWith('00|') && line.includes('戰鬥開始！')) {
        const fields = line.split('|');
        combatStarts.push(Date.parse(fields[1]));
      }
    }).then(resolve);
  });

  if (combatStarts.length === 0) {
    console.error('找不到「戰鬥開始！」標記，請確認 Network log 篩選區間有包含開場。');
    process.exit(1);
  }
  if (combatStarts.length > 1) {
    console.log(`偵測到 ${combatStarts.length} 次「戰鬥開始！」（可能含團滅重新挑戰），時間點：`,
      combatStarts.map(ms => new Date(ms).toISOString()));
  }
  if (process.env.PULL_START_ISO) {
    fightStartMs = Date.parse(process.env.PULL_START_ISO);
    console.log('使用指定的 PULL_START_ISO 作為起點:', process.env.PULL_START_ISO);
  } else {
    fightStartMs = combatStarts[combatStarts.length - 1]; // 預設取最後一次(最終挑戰)
  }
  combatStartMs = fightStartMs;
  nextTick = fightStartMs;

  await pass1();
  await pass2();

  const endMs = taskEndMs || lastMs;
  const durationSec = +(((endMs - fightStartMs) / 1000).toFixed(1));

  // 這份 TextVerbose 是整場遊玩紀錄，可能涵蓋團滅後的重新挑戰（多次 pull）。
  // fightStartMs 已鎖定「本次要輸出的那次挑戰」的開場時間，這裡把所有時間序資料裁到
  // [MIN_T, durationSec + PAD] 範圍，濾掉其他 pull 混進來的資料。
  const MIN_T = -30, PAD = 5;
  const inRange = (t) => t >= MIN_T && t <= durationSec + PAD;
  const filterArr = (arr) => arr.filter((row) => inRange(row[0]));

  const actorList = [...actors.entries()].map(([id, a]) => ({
    id, name: a.name, type: a.type, job: a.job || null,
    isPlayer: tracked.has(id) && a.type === 'Player',
    isBoss: a.type === 'Enemy' && a.name === '朱雀',
  })).filter(a => a.isPlayer || a.isBoss);

  const positionsOut = {};
  for (const [id, arr] of positions.entries()) {
    if (!tracked.has(id)) continue;
    const filtered = filterArr(arr);
    if (filtered.length) positionsOut[id] = filtered;
  }
  // 只保留在本次挑戰時間範圍內真的有出現過的 actor（例如另一次 pull 的 BOSS 實例會被濾掉）
  const activeIds = new Set(Object.keys(positionsOut));
  const actorListFiltered = actorList.filter(a => activeIds.has(a.id));

  const playerHPOut = {};
  for (const [id, arr] of playerHP.entries()) {
    const filtered = filterArr(arr);
    if (filtered.length) playerHPOut[id] = filtered;
  }

  const bossHPOut = filterArr(bossHP);
  const statusOut = statusRaw.filter((s) => inRange(s.t));
  const damageOut = damage.filter((d) => inRange(d.t));
  const castsOut = casts.filter((c) => inRange(c.t));

  const output = {
    meta: {
      fightName: '幻 朱雀征魂戰',
      date: '2026-08-04',
      combatStartUtc: new Date(fightStartMs).toISOString(),
      taskEndUtc: taskEndMs ? new Date(taskEndMs).toISOString() : null,
      durationSec,
      result: 'wipe',
      sampleSec: SAMPLE_SEC,
      pullCount: combatStarts.length,
    },
    actors: actorListFiltered,
    positions: positionsOut,
    bossHP: bossHPOut,
    playerHP: playerHPOut,
    status: statusOut,
    damage: damageOut,
    casts: castsOut,
  };

  fs.writeFileSync(outPath, JSON.stringify(output));
  console.log('actors:', actorListFiltered.length, 'damage events:', damageOut.length, 'status events:', statusOut.length, 'boss HP samples:', bossHPOut.length, 'casts:', castsOut.length);
  console.log('輸出:', outPath, (fs.statSync(outPath).size / 1024 / 1024).toFixed(2), 'MB');

  // 同時輸出一份 .js（掛在 window.FIGHT_REPLAY_DATA），方便用 <script src> 直接載入，
  // 避免 file:// 開啟頁面時 fetch() 讀本地 JSON 被瀏覽器擋下的問題。
  const jsOutPath = outPath.replace(/\.json$/, '.js');
  fs.writeFileSync(jsOutPath, `window.FIGHT_REPLAY_DATA = ${JSON.stringify(output)};\n`);
  console.log('輸出:', jsOutPath, (fs.statSync(jsOutPath).size / 1024 / 1024).toFixed(2), 'MB');
})();
