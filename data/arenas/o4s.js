/* 場地資料:O4S(次元的夾縫 歐米加零式:DELTA篇4層) */
window.ARENA_DATA = window.ARENA_DATA || {};
window.ARENA_DATA['o4s'] = {
  id: 'o4s',
  name: '次元的夾縫 歐米加零式:DELTA篇4層',
  phases: [
    {
      id: 'p1',
      name: 'P1 艾克斯迪司',
      shape: 'circle',
      size: { r: 100 },
      waymarks: [
        { id: 'A', x: 0, y: -95 },
        { id: 'B', x: 95, y: 0 },
        { id: 'C', x: 0, y: 95 },
        { id: 'D', x: -95, y: 0 },
      ],
      defaultTokens: {
        MT: { x: 0, y: -38 }, ST: { x: 0, y: 34 },
        H1: { x: -16, y: 58 }, H2: { x: 16, y: 58 },
        D1: { x: -32, y: -6 }, D2: { x: 32, y: -6 },
        D3: { x: -26, y: 28 }, D4: { x: 26, y: 28 },
        BOSS: { x: 0, y: 0 },
      },
    },
  ],
};
