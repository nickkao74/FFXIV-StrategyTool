/* 副本專屬物件:只在選定副本時才出現於工具列,避免通用工具列被冷門機制物件塞滿。
 * 同一個物件可同時屬於多個副本(raids 陣列)。
 * kind 必須是 objects.js 的 OBJECT_DEFAULTS 中已定義的種類。
 * raids 內的 id 對應 data/raids.js 的 RAID_LIST。
 *
 * ⚠ 新增專屬物件時請照 .claude/skills/board-object-parity 走完整份檢查表 ——
 *   只在這裡登記工具列按鈕、卻漏掉 import.js 的轉換,會讓攻略導入時靜默丟棄該圖元。 */
window.BOARD_SPECIAL_OBJECTS = [
  { kind: 'tentacle', label: '觸手', icon: '✧', raids: ['o4s-p1'] },
  { kind: 'blackhole', label: '黑洞', icon: '⬤', raids: ['o4s-p1'] },

  // 極朱雀徵魂戰
  { kind: 'quadrant', label: '假名地板', icon: '◳', raids: ['hells-kier-ex'] },
  { kind: 'poem-strip', label: '詩文字列', icon: '⋮', raids: ['hells-kier-ex'] },
  { kind: 'tower', label: '塔', icon: '◎', raids: ['hells-kier-ex'] },
  { kind: 'feather', label: '羽毛', icon: '❋', raids: ['hells-kier-ex'] },
  { kind: 'bird', label: '火焰鳥', icon: '➤', raids: ['hells-kier-ex'] },
  { kind: 'xmark', label: '禁止標記', icon: '✕', raids: ['hells-kier-ex'] },
];
