/* 由封存版 data/hells-kier-ex-legacy.js 產出現行版 data/hells-kier-ex.js。
 *
 * 文字內容原封不動,只重算沙盤圖幾何:把目測近似的尺寸換成
 * BossMod Reborn 插件的實測數值(換算率 1m = 5 單位)。
 * 依據與換算公式見 _Planning/BossMod逆向解析/。
 *
 * 用法:node "_Planning/BossMod逆向解析/tools/rebuild-hells-kier.js"
 *
 * ⚠ 要改攻略「文字」請改 legacy 檔;要改「幾何」請改這支腳本。
 *   直接手改 data/hells-kier-ex.js 會在下次重跑時被覆蓋。
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');

global.window = {};
require(path.join(ROOT, 'data/hells-kier-ex-legacy.js'));
const src = window.RAID_DATA['hells-kier-ex-legacy'];
const d = JSON.parse(JSON.stringify(src));

const K = 5;                 // 1 yalm = 5 個場地單位(場地名目半徑 20 yalm = 100)
const y = (v) => +(v * K).toFixed(2);

d.id = 'hells-kier-ex';
d.name = '極朱雀徵魂戰';

let stats = { rect: 0, cone: 0, circle: 0, feather: 0, tower: 0, hole: 0, quad: 0, kb: 0 };

for (const sec of d.sections) {
  for (const st of sec.steps || []) {
    const out = [];
    for (const a of st.aoes || []) {
      switch (a.type) {
        case 'hole':                       // 天坑 = Phase2Bounds 內緣 3.5y
          a.r = y(3.5); stats.hole++; break;
        case 'feather':                    // WingAndAPrayer:圓 r9
          if (a.r != null || !a.cleared) a.r = y(9);
          stats.feather++; break;
        case 'tower':                      // IncandescentInterlude:塔 r4
          a.r = y(4); stats.tower++; break;
        case 'quadrant':                   // Hotspot:扇形 r21
          a.r = y(21); stats.quad++; break;
        case 'circle':
          if (a.color === 'ice') a.r = y(1);        // P2 平台圈 r1(限 1 人)
          else if (a.color === 'fire') a.r = y(6);  // ScathingNet 分攤 r6
          else a.r = y(6);                          // Rekindle 紅圈 r6
          stats.circle++; break;
        case 'cone':
          if (a.spread === 180) { a.r = y(41); stats.cone++; }        // PhantomFlurry
          else if (a.spread === 90) { a.r = y(40); stats.cone++; }    // FleetingSummer
          else if (a.spread === 22) {                                  // WellOfFlame → 矩形
            out.push({ type: 'rect', at: a.at ?? [a.x || 0, a.y || 0],
              angle: a.angle || 0, lengthFront: y(41), halfWidth: y(10), color: a.color });
            stats.rect++; continue;
          } else if (a.spread === 26) {                                // Rout → 矩形
            out.push({ type: 'rect', at: a.at ?? [a.x || 0, a.y || 0],
              angle: a.angle || 0, lengthFront: y(55), halfWidth: y(3), color: a.color });
            stats.rect++; continue;
          }
          break;
      }
      out.push(a);
    }
    if (st.aoes) st.aoes = out;

    for (const an of st.annotations || []) {
      if (an.type === 'knockback') {       // RuthlessRefrain:擊退 11y
        an.rInner = y(4); an.rOuter = y(15); stats.kb++;
      }
    }
  }
}

const sec = (id) => d.sections.find((s) => s.id === id);
const step = (id, i) => sec(id).steps[i];

/* ── 引誘 / 拒絕:把插件算出的門檻畫成安全帶 ───────────── */
{
  const s = sec('p3-melody');
  // 引誘:牽引 11y,中央天坑 3.5y → 必須站在 3.5+11 = 14.5y 以外
  s.steps[0].aoes.unshift({ type: 'donut', at: [0, 0], rInner: y(14.5), rOuter: 100, color: 'accent' });
  s.steps[0].annotations.push({ type: 'text', at: [0, 104], text: '安全帶 = 離中心 14.5m 以外(3.5 天坑 + 11 牽引)', color: 'yellow' });
  s.steps[0].caption = '【引誘旋律】牽引 11m 朝中心。安全帶是**離中心 14.5m 以外**(天坑 3.5 + 牽引 11),圖中亮環即為該範圍';
  // 拒絕:擊退 11y,場地外緣 20y → 必須站在 20-11 = 9y 以內
  s.steps[1].aoes.unshift({ type: 'circle', at: [0, 0], r: y(9), color: 'accent' });
  s.steps[1].annotations.push({ type: 'text', at: [0, 104], text: '安全帶 = 離中心 9m 以內(20 外緣 − 11 擊退)', color: 'yellow' });
  s.steps[1].caption = '【拒絕旋律】擊退 11m 遠離中心。安全帶是**離中心 9m 以內**(場地外緣 20 − 擊退 11),圖中亮圈即為該範圍';
}

/* ── 踩塔:站位由「塔的位置 − 擊退距離」反推 ───────────── */
{
  const s = sec('p3-tower');
  const R = 84 - y(11);   // 塔在 84,擊退 55 → 站 29
  const put = (st, map) => { for (const k in map) st.actors[k] = map[k]; };
  const inner = {
    MT: { x: -6, y: -R }, D1: { x: 6, y: -R },
    ST: { x: R, y: -6 }, D2: { x: R, y: 6 },
    H2: { x: -6, y: R }, D4: { x: 6, y: R },
    H1: { x: -R, y: -6 }, D3: { x: -R, y: 6 },
  };
  put(s.steps[0], inner);
  s.steps[0].annotations.push({ type: 'text', at: [0, 104], text: `站位 = 塔(16.8m) − 擊退(11m) → 離中心約 ${(R / K).toFixed(1)}m`, color: 'yellow' });
  s.steps[0].caption = '① 就位:塔在 A/B/C/D 最外緣(半徑 4m)。**站位由「塔的位置 − 擊退 11m」反推**,八人兩兩貼在該圈上';
}

/* ── 井宿焰:改成矩形後,原圖的 MT 站位落在範圍內 ─────────
 * 原本畫成 22° 扇形時 (-30,-66) 看起來在扇形外側,
 * 但真實形狀是 halfWidth 50 的長方形,|x|=30 其實正在帶子裡。 */
{
  const s = sec('p3-jing').steps[0];
  s.actors.MT = { x: -68, y: -40 };
  s.annotations = (s.annotations || []).concat([
    { type: 'text', at: [0, 104], text: '⚠ 矩形半寬 10m(圖上 50),|x| 小於 50 一律中招', color: 'red' },
  ]);
  s.caption = '① 井宿焰(矩形 41 × 寬 20)+ 四人紅圈:**寬度不隨距離變窄**,必須橫向離開中線 10m 以上。原本畫成扇形時看起來安全的內側站位其實會中招';
}

/* ── 朱紅旋律:補一張插件 AI 的解(站在四塊地板的交界十字帶) ── */
{
  const s = sec('p3-floor-id');
  s.steps.push({
    caption: '【插件 AI 的解法】每發只隔 1.25 秒,BossMod 的自動走位是把人壓在**四塊地板交界的十字帶(±1m)**上,靠最短距離左右閃。可當作背不出字時的保底',
    boss: { x: 0, y: 0, facing: 0 },
    aoes: [
      { type: 'quadrant', quad: 'nw', r: y(21) },
      { type: 'quadrant', quad: 'ne', r: y(21) },
      { type: 'quadrant', quad: 'sw', r: y(21) },
      { type: 'quadrant', quad: 'se', r: y(21) },
      { type: 'rect', at: [0, 0], angle: 0, lengthFront: 100, lengthBack: 100, halfWidth: y(1), color: 'accent' },
      { type: 'rect', at: [0, 0], angle: 90, lengthFront: 100, lengthBack: 100, halfWidth: y(1), color: 'accent' },
      { type: 'hole', at: [0, 0], r: y(3.5) },
    ],
    annotations: [
      { type: 'text', at: [0, -104], text: '交界十字帶 ±1m = SDInvertedCross(center, 20, 1)', color: 'yellow' },
      { type: 'text', at: [0, 104], text: '每發間隔固定 1.25 秒 —— 這就是「秒穿」的來源', color: 'white' },
    ],
    actors: {
      MT: { x: 0, y: -70 }, ST: { x: 70, y: 0 }, H1: { x: -70, y: 0 }, H2: { x: 0, y: 70 },
      D1: { x: 0, y: -48 }, D2: { x: 48, y: 0 }, D3: { x: -48, y: 0 }, D4: { x: 0, y: 48 },
    },
  });
}

/* 「沙盤圖怎麼看:尺寸都是實測值」這一章與對應的速查表項目原本插在這裡,
 * 已移除 —— 它說明的是「我們怎麼畫這張圖」而非「這場戰鬥怎麼打」,
 * 放在攻略最前面會擋住讀者要看的內容。
 * 完整內容(含可直接貼回的程式碼)保留在 ../06-尺寸對照表.md。 */

const header = `/* 極朱雀徵魂戰(Hell's Kier Extreme)
 *
 * ⚠ 自動產生,請勿手改 —— 下次重跑會被覆蓋。
 *   文字要改 → data/hells-kier-ex-legacy.js
 *   幾何要改 → _Planning/BossMod逆向解析/tools/rebuild-hells-kier.js
 *   重新產生 → node "_Planning/BossMod逆向解析/tools/rebuild-hells-kier.js"
 *
 * 文字內容沿用封存版,沙盤圖幾何改採 BossMod Reborn 的實測數值。
 * 換算:場地名目半徑 20m = 圖上 100 單位 → 1m = 5 單位。
 * 逆向依據見 _Planning/BossMod逆向解析/。
 */
window.RAID_DATA = window.RAID_DATA || {};
window.RAID_DATA['hells-kier-ex'] = `;

fs.writeFileSync(path.join(ROOT, 'data/hells-kier-ex.js'),
  header + JSON.stringify(d, null, 2) + ';\n', 'utf8');

console.log('written', stats);
