/* 場地資料:極朱雀徵魂戰(四聖獸奇譚 朱雀之座) */
window.ARENA_DATA = window.ARENA_DATA || {};
window.ARENA_DATA['hells-kier'] = {
  id: 'hells-kier',
  name: '極朱雀徵魂戰',
  phases: [
    {
      id: 'p1',
      name: 'P1 火焰鳥 / 蘇生之羽',
      guideRaidId: 'hells-kier-ex',
      // 對應攻略章節的 phase 欄位。同一個 guideRaidId 有多個階段時,
      // 匯入要靠這個才知道該切到哪一階段(見 js/board/app.js ensureArenaForRaid)
      guidePhases: ['戰前', 'P1', 'P2'],
      shape: 'circle',
      size: { r: 100 },
      waymarks: [
        { id: 'A', x: 0, y: -95 },
        { id: 'B', x: 95, y: 0 },
        { id: 'C', x: 0, y: 95 },
        { id: 'D', x: -95, y: 0 },
      ],
      // X 字型的四個雙人組(小羽毛在斜位時的預設站位)
      defaultTokens: {
        MT: { x: -60, y: -60 }, D1: { x: -40, y: -40 },
        ST: { x: 60, y: -60 }, D2: { x: 40, y: -40 },
        H1: { x: -60, y: 60 }, D3: { x: -40, y: 40 },
        H2: { x: 60, y: 60 }, D4: { x: 40, y: 40 },
        BOSS: { x: 0, y: 0 },
      },
    },
    {
      id: 'p3',
      name: 'P3 人類形態(中央天坑)',
      guideRaidId: 'hells-kier-ex',
      guidePhases: ['P3'],
      shape: 'circle',
      size: { r: 100 },
      // 燃盡天火打掉場地中央的圓形區域,P3 全程都是天坑。
      // 這是場地特徵而非可操作物件,所以做在階段定義裡,匯入時會跳過攻略的 hole 圖元。
      hole: { r: 26 },
      waymarks: [
        { id: 'A', x: 0, y: -95 },
        { id: 'B', x: 95, y: 0 },
        { id: 'C', x: 0, y: 95 },
        { id: 'D', x: -95, y: 0 },
      ],
      // 十字型分組(＝踩塔預備位),貼近中央天坑外圈
      defaultTokens: {
        MT: { x: -9, y: -36 }, D1: { x: 9, y: -36 },
        ST: { x: 36, y: -9 }, D2: { x: 36, y: 9 },
        H2: { x: -9, y: 36 }, D4: { x: 9, y: 36 },
        H1: { x: -36, y: -9 }, D3: { x: -36, y: 9 },
        BOSS: { x: 0, y: 0 },
      },
    },
  ],
};
