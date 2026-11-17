/* 場地資料:極青龍徵魂戰(四聖獸奇譚 青龍之座)
 * 1m = 5 單位(名目半徑 20m = 100)。P1/P2 場地 19.5m;P3 陸地 20m,外側是海。 */
window.ARENA_DATA = window.ARENA_DATA || {};
window.ARENA_DATA['seiryu'] = {
  id: 'seiryu',
  name: '極青龍徵魂戰',
  phases: [
    {
      id: 'p1',
      name: 'P1 / P2 青龍與式鬼',
      guideRaidId: 'seiryu-ex',
      guidePhases: ['戰前', 'P1', 'P2'],
      shape: 'circle',
      size: { r: 100 },
      waymarks: [
        { id: 'A', x: 0, y: -88 },
        { id: 'B', x: 88, y: 0 },
        { id: 'C', x: 0, y: 88 },
        { id: 'D', x: -88, y: 0 },
      ],
      defaultTokens: {
        MT: { x: 0, y: -28 }, ST: { x: -12, y: 30 },
        H1: { x: 10, y: 48 }, H2: { x: -10, y: 48 },
        D1: { x: -20, y: 22 }, D2: { x: 20, y: 22 },
        D3: { x: 0, y: 56 }, D4: { x: 12, y: 32 },
        BOSS: { x: 0, y: 0 },
      },
    },
    {
      id: 'p3',
      name: 'P3 海上陸地',
      guideRaidId: 'seiryu-ex',
      guidePhases: ['P3'],
      shape: 'circle',
      size: { r: 100 },
      waymarks: [
        { id: 'A', x: 0, y: -88 },
        { id: 'B', x: 88, y: 0 },
        { id: 'C', x: 0, y: 88 },
        { id: 'D', x: -88, y: 0 },
      ],
      // 升龍踩塔的雙人組站位(中央集合)
      defaultTokens: {
        MT: { x: 26, y: -6 }, ST: { x: 26, y: 6 },
        H1: { x: -26, y: -6 }, H2: { x: -26, y: 6 },
        D1: { x: 14, y: -20 }, D2: { x: 14, y: 20 },
        D3: { x: -14, y: -20 }, D4: { x: -14, y: 20 },
        BOSS: { x: 0, y: 0 },
      },
    },
  ],
};
