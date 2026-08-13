/* 由 data/uwu.js 產出校對版 data/uwu-lab.js。
 *
 * 資料優先序(依使用者指示):
 *   1. 攻略逐字稿  _OriginalReferences/UWU/P1/逐字稿_繁體中文.md
 *   2. 灰機 wiki    _OriginalReferences/UWU/P1/huijiwiki.md
 *   3. BossMod      _OriginalReferences/BossmodReborn/.../Ultimate/UWU/
 *
 * BossMod 只用來「調整」既有圖解的尺寸,不用來推翻前兩者的機制描述。
 * 逐項比對與判斷理由見 ../07-UWU-P1對照.md。
 *
 * 用法:node "_Planning/BossMod逆向解析/tools/rebuild-uwu.js"
 * ⚠ 要改文字請改 data/uwu.js;要改幾何請改這支腳本。
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');

global.window = {};
require(path.join(ROOT, 'data/uwu.js'));
const d = JSON.parse(JSON.stringify(window.RAID_DATA['uwu']));

// UWU 場地與朱雀相同:ArenaCenter (100,100)、Polygon(center, 20, 64)
const K = 5;                       // 1m = 5 單位
const y = (v) => +(v * K).toFixed(2);

d.id = 'uwu-lab';
d.name = '絕神兵零式(UWU) 究極神兵破壞作戰(校對版)';

const sec = (id) => d.sections.find((s) => s.id === id);
const steps = (id) => sec(id).steps;
const log = [];
const note = (what) => log.push(what);

/* ── 全域:依 BossMod 的 A 級數值統一尺寸 ──────────────────
 * 對照表:
 *   Slipstream      AOEShapeCone(11.7, 45°)   螺旋氣流
 *   Downburst       AOEShapeCone(11.7, 45°)   下行突風
 *   EyeOfTheStorm   AOEShapeDonut(12, 25)     台風眼
 *   FeatherRain     AOEShapeCircle(3)         飛翎雨
 *   GreatWhirlwind  AOEShapeCircle(8)         大龍捲風
 *   WickedWheel     AOEShapeCircle(8.7)       邪輪旋風(本體)
 *   WickedWheelSis  AOEShapeCircle(8.36)      邪輪旋風(分身)
 *   WickedTornado   AOEShapeDonut(7, 20)      邪氣龍捲
 *   Mesohigh        circle r=3                中高壓
 *   SpinyShield     circle r=6                高氣壓穹頂
 */
const R = {
  slipstream: y(11.7),   // 58.5
  downburst: y(11.7),    // 58.5
  eyeInner: y(12), eyeOuter: y(25),
  feather: y(3),         // 15
  whirlwind: y(8),       // 40
  wheel: y(8.7),         // 43.5
  wheelSister: y(8.36),  // 41.8
  tornadoIn: y(7), tornadoOut: y(20),
  meso: y(3),            // 15
  dome: y(6),            // 30
  friction: y(5),        // 25 ← ⚠ 僅 AID 註解,BossMod 無對應元件
};

/* ── 開場:螺旋氣流 / 寒風之歌 / 大龍捲風 ───────────────── */
{
  const s = steps('uwu-p1-open');

  // ① 螺旋氣流:張角 100°→90°,半徑 100→58.5
  s[0].aoes[0] = { type: 'cone', at: [0, 0], angle: 0, spread: 90, r: R.slipstream, color: 'wind' };
  s[0].caption = '螺旋氣流:**半徑只有 11.7m**(場地半徑 20m),張角 90°,依王的**當前面向**發動 + 暈眩。'
    + '離王夠遠的人本來就打不到 —— 真正要動的只有近身的 MT,往側邊閃開即可';
  s[0].annotations = (s[0].annotations || []).concat([
    { type: 'text', at: [0, 104], text: '扇形只到 11.7m,外圈是安全的', color: 'blue' },
  ]);
  note('螺旋氣流 扇形 r100/100° → r58.5/90°(BossMod AOEShapeCone(11.7, 45°))');

  // ② 寒風之歌:形狀維持逐字稿的扇形(理由見 07),只補上大龍捲風的正確半徑
  s[1].annotations = (s[1].annotations || []).concat([
    { type: 'text', at: [0, 104], text: '形狀依影片為扇形;BossMod 模型為直線衝鋒但自己標註未驗證', color: 'white' },
  ]);

  // ③ 大龍捲風:r30 → 40
  s[2].aoes[0].r = R.whirlwind;
  s[2].caption = '承受先頭判定的位置會留下**大龍捲風(半徑 8m)** —— 直徑 16m,在半徑 20m 的場地上是很大一塊。'
    + '**接完之後**全員(含補師)才開始移動,繞開龍捲風退回中央集合';
  note('大龍捲風 r30 → 40(BossMod AOEShapeCircle(8))');
}

/* ── 小怪:下行突風 ────────────────────────────────── */
{
  const s = steps('uwu-p1-adds');
  const st = s[1];
  st.aoes[0] = { type: 'cone', at: [0, 0], angle: 0, spread: 90, r: R.downburst, color: 'thunder' };
  st.caption = '同時:螺旋氣流(朝南扇形)→ 無讀條下行突風(朝一仇 MT 方向扇形)。'
    + '**兩招的形狀完全相同:半徑 11.7m、張角 90°** —— 站位邏輯可以共用。'
    + 'MT 閃完螺旋氣流立刻回位一人承受;ST 此時正在吃刺羽的氣旋';
  note('下行突風 扇形 r100/60° → r58.5/90°(與螺旋氣流同形狀)');
}

/* ── 穹頂:飛翎雨 / 高氣壓穹頂 / 烈風刃 ───────────────── */
{
  const s = steps('uwu-p1-dome');

  // 飛翎雨 r11 → 15
  for (const a of s[0].aoes) if (a.type === 'circle') a.r = R.feather;
  s[0].caption = '飛翎雨在中央集合一起丟(隨機 5 人**半徑 3m** 小圓 + 裂傷)→ 接寒風之嘯,'
    + '趁詠唱期間**在西側原地**把刺羽打死';
  note('飛翎雨 r11 → 15(BossMod AOEShapeCircle(3));點名人數 5 依逐字稿與 wiki');

  // 高氣壓穹頂 r26 → 30
  for (const st of s) for (const a of st.aoes || []) if (a.color === 'ice') a.r = R.dome;
  s[1].caption = '刺羽在**原地(西側)**炸開 → 大暴風後留下**半徑 6m 的高氣壓穹頂**(20 秒)。'
    + '**ST 先進去解除 2 層**。穹頂不大,五個人要進去站得下但別擠出邊界';
  note('高氣壓穹頂 r26 → 30(BossMod P1PlumeShield circle 6f)');

  // 烈風刃 r20 → 25(⚠ 僅 AID 註解)
  for (const st of s) for (const a of st.aoes || []) if (a.color === 'wind' && a.r === 20) a.r = R.friction;
  s[2].annotations = (s[2].annotations || []).concat([
    { type: 'text', at: [0, 104], text: '⚠ 烈風刃 r5m 僅來自 AID 註解,BossMod 無對應元件', color: 'yellow' },
  ]);
  note('烈風刃 r20 → 25 ⚠ C 級:AID 註解寫 range 5 circle,BossMod 沒有做這個元件');
}

/* ── 分身階段:邪輪旋風 / 台風眼 / 龍捲風 / 飛翎雨 ────────── */
{
  const s = steps('uwu-p1-clone');

  for (const st of s) {
    for (const a of st.aoes || []) {
      if (a.type === 'circle' && a.at === 'boss') a.r = R.wheel;               // 邪輪旋風(本體)
      else if (a.type === 'donut' && a.rInner === 92) {                        // 台風眼
        a.rInner = R.eyeInner; a.rOuter = R.eyeOuter;
      } else if (a.type === 'circle' && (a.at === 'MT' || a.at === 'ST')) {
        a.r = R.whirlwind;                                                      // 坦克腳下的大龍捲風
      } else if (a.type === 'circle' && a.r === 11) {
        a.r = R.feather;                                                        // 飛翎雨
      }
    }
  }

  s[2].caption = '⚠ **台風眼的範圍比想像中大得多:12m 到 25m 的環形** —— 場地半徑才 20m,'
    + '所以**從 12m 往外一路到牆邊全都是判定**,安全區只有中央直徑 24m 的圓。'
    + 'MT 先在 3 號位讓**邪輪旋風(半徑 8.7m)**讀完,再移動去接先頭';
  s[2].annotations = (s[2].annotations || []).concat([
    { type: 'text', at: [0, 104], text: '台風眼安全區 = 中央 12m 以內,不是只有貼牆危險', color: 'red' },
  ]);
  note('台風眼 donut 92-104 → 60-125(BossMod AOEShapeDonut(12, 25))—— 修正幅度最大的一項');
  note('邪輪旋風(本體) r34 → 43.5;分身版另有 8.36 的版本');
  note('坦克腳下大龍捲風 r26 → 40');
}

/* ── 中高壓 ──────────────────────────────────────── */
{
  const s = steps('uwu-p1-meso');
  const st = s[2];
  for (const a of st.aoes || []) {
    if (a.type === 'circle' && a.color === 'void') a.r = R.meso;
    if (a.type === 'cone') { a.spread = 90; a.r = R.slipstream; }
  }
  st.caption = '**螺旋氣流出來之後** MT 才移動去接中高壓:兩位接線者從中央往東西兩側拉開,'
    + '中高壓落地(**半徑 3m 的小圓**)→ 清除低氣壓 + 超級氣旋。'
    + '圈很小,但兩人還是要拉開到互不重疊';
  note('中高壓 r14 → 15(BossMod P1Mesohigh _radius = 3);螺旋氣流同步改成 r58.5/90°');
}

/* ── 覺醒後:邪氣龍捲 / 下行突風 / 剛羽 ─────────────────── */
{
  const s = steps('uwu-p1-awake');

  // 邪氣龍捲 donut 26-100 → 35-100
  for (const a of s[0].aoes || []) if (a.type === 'donut') { a.rInner = R.tornadoIn; a.rOuter = R.tornadoOut; }
  s[0].caption = '覺醒後的邪輪旋風:圓形(半徑 8.7m)打完會**追加邪氣龍捲(內 7m / 外 20m 的環形)** —— '
    + '**安全區只有王身邊 7m 以內**,看到圓消失就立刻衝進去';
  s[0].annotations = (s[0].annotations || []).concat([
    { type: 'text', at: [0, 104], text: '⚠ 環形內圈 7m 是 BossMod 的值;AID 註解寫「?-20」,官方未定', color: 'yellow' },
  ]);
  note('邪氣龍捲 donut 26-100 → 35-100(BossMod ShapeTornado = Donut(7, 20));內圈 7 ⚠ AID 註解標「?」');

  // 覺醒後下行突風 spread 60 → 90
  for (const a of s[1].aoes || []) if (a.type === 'cone') { a.spread = 90; a.r = R.downburst; }
  note('覺醒後下行突風 扇形 r100/60° → r58.5/90°');

  // 剛羽的羽槍 r8(⚠ 僅 AID 註解)
  s[2].aoes = (s[2].aoes || []).map((a) => a.type === 'feather' ? { ...a, r: y(8) } : a);
  s[2].annotations = (s[2].annotations || []).concat([
    { type: 'text', at: [0, 104], text: '⚠ 羽槍 r8m 僅來自 AID 註解,BossMod 無對應元件', color: 'yellow' },
  ]);
  note('剛羽的羽槍圈 → 40 ⚠ C 級:AID 註解 Featherlance range 8 circle');
}

const header = `/* 絕神兵零式(UWU) —— 校對版
 *
 * ⚠ 自動產生,請勿手改 —— 下次重跑會被覆蓋。
 *   文字要改 → data/uwu.js
 *   幾何要改 → _Planning/BossMod逆向解析/tools/rebuild-uwu.js
 *   重新產生 → node "_Planning/BossMod逆向解析/tools/rebuild-uwu.js"
 *
 * 文字沿用 data/uwu.js(來源:攻略逐字稿 + 灰機 wiki),
 * 沙盤圖尺寸改採 BossMod Reborn 的實測數值。換算 1m = 5 單位。
 * 逐項比對見 _Planning/BossMod逆向解析/07-UWU-P1對照.md。
 */
window.RAID_DATA = window.RAID_DATA || {};
window.RAID_DATA['uwu-lab'] = `;

fs.writeFileSync(path.join(ROOT, 'data/uwu-lab.js'),
  header + JSON.stringify(d, null, 2) + ';\n', 'utf8');

console.log('written data/uwu-lab.js');
for (const l of log) console.log('  · ' + l);
