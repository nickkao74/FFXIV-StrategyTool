/* 副本專屬物件:只在選定副本時才出現於工具列,避免通用工具列被冷門機制物件塞滿。
 * 同一個物件可同時屬於多個副本(raids 陣列)。
 * kind 必須是 objects.js 的 OBJECT_DEFAULTS 中已定義的種類。
 * raids 內的 id 對應 data/raids.js 的 RAID_LIST。 */
window.BOARD_SPECIAL_OBJECTS = [
  { kind: 'tentacle', label: '觸手', icon: '✧', raids: ['o4s-p1'] },
  { kind: 'blackhole', label: '黑洞', icon: '⬤', raids: ['o4s-p1'] },
];
