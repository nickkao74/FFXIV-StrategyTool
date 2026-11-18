/* 攻略清單:首頁卡片與白板的副本下拉選單都讀這裡。
 *
 * 欄位
 *   id          對應 data/<id>.js
 *   name        完整名稱(白板下拉選單、攻略頁標題用)
 *   title       首頁卡片的主標:完整的副本名稱(繁中)
 *   alias       玩家俗稱的代號(UWU、O4S…),沒有就不填
 *   subtitle    選填的補充說明(例如只做了某個階段)
 *   category    'ultimate'(絕境戰)| 'savage'(零式)| 'extreme'(極)
 *   series      選填,同系列副本的名稱(歐米茄、四聖獸…),首頁第二層篩選用;不標難度
 *   patch       版本 / 資料片
 *   phases      階段膠囊:label 顯示文字、section 為點擊後要跳到的章節 id
 *   author      攻略來源(原作者),顯示在每個攻略入口
 *   measured    true = 沙盤圖尺寸為 BossMod 實測值
 *   banner      卡片橫幅:{ xivapi: '任務搜尋器英文名稱的一部分' } 由 XIVAPI 查出副本封面圖;
 *               或直接給 { url: '圖片網址或 img/xxx.png' } 指定圖檔
 *   description 完整說明(滑鼠停在卡片上時顯示)
 */
window.RAID_LIST = [
  {
    "id": "uwu",
    "name": "絕神兵零式(UWU) 究極神兵破壞作戰",
    "title": "絕境戰 究極神兵破壞作戰",
    "alias": "UWU",
    "category": "ultimate",
    "patch": "4.0 紅蓮之狂潮",
    "phases": [
      { "label": "P1 迦樓羅", "section": "uwu-p1-intro" },
      { "label": "P2 伊弗利特", "section": "uwu-p2-transition" },
      { "label": "P3 泰坦", "section": "uwu-p3-open" },
      { "label": "P4 究極神兵", "section": "uwu-p4-lb" }
    ],
    "author": "みんとっと Minto",
    "measured": true,
    "banner": { "xivapi": "Refrain (Ultimate)" },
    "description": "絕境戰 究極神兵破壞作戰。P1 迦樓羅:低氣壓/高氣壓換以太供應、覺醒與突破極限。P2 伊弗利特:火獄之楔逆 Z 字、地火引導、灼熱咆哮與四連火神衝。P3 泰坦:大地粉碎跳躍縮場、大激震擊退、三連岩牢(自滅法)與覺醒地裂斬。P4 究極神兵:LB 階段與一運。沙盤圖尺寸為 BossMod 實測值。"
  },
  {
    "id": "o4s-p1",
    "name": "歐米加零式:德爾塔篇4層 P1(艾克斯迪司)",
    "title": "次元的夾縫 歐米加零式:德爾塔篇4層",
    "alias": "O4S",
    "subtitle": "目前只有第一階段(艾克斯迪司)",
    "category": "savage",
    "series": "歐米茄",
    "patch": "4.0 紅蓮之狂潮",
    "phases": [
      { "label": "P1 艾克斯迪司", "section": "intro" }
    ],
    "author": "菓子君_Okashi",
    "measured": false,
    "banner": { "xivapi": "Deltascape V4.0 (Savage)" },
    "description": "次元的夾縫 歐米加零式:DELTA篇4層 第一階段。冰火雷三系機制、決戰觸手、黑洞遛球。"
  },
  {
    "id": "hells-kier-ex",
    "name": "極朱雀徵魂戰",
    "title": "極朱雀徵魂戰",
    "category": "extreme",
    "series": "四聖獸",
    "patch": "4.0 紅蓮之狂潮",
    "phases": [
      { "label": "P1 火焰鳥", "section": "p1-bird" },
      { "label": "P2 音遊吃球", "section": "p2" },
      { "label": "P3 朱紅旋律", "section": "p3-melody" }
    ],
    "author": "菓子君_Okashi",
    "measured": true,
    "banner": { "xivapi": "Kier (Extreme)" },
    "description": "四聖獸奇譚 極朱雀(機制同幻朱雀)。P1 火焰鳥與蘇生之羽、P2 音遊吃球、P3 朱紅旋律四色地板、傀儡旋律與踩塔。沙盤圖尺寸為實測值。"
  },
  {
    "id": "seiryu-ex",
    "name": "極青龍徵魂戰",
    "title": "極青龍徵魂戰",
    "category": "extreme",
    "series": "四聖獸",
    "patch": "4.0 紅蓮之狂潮",
    "phases": [
      { "label": "P1 青龍", "section": "p1-open" },
      { "label": "P2 式鬼運動會", "section": "p2-wheels" },
      { "label": "P3 海上陸地", "section": "p3-sea" }
    ],
    "author": "菓子君_Okashi",
    "measured": true,
    "banner": { "xivapi": "Wreath of Snakes (Extreme)" },
    "description": "四聖獸奇譚 最終戰 極青龍。P1 鋼鐵月環與換坦死刑、P2 式鬼運動會(車輪、石頭鬼、天狗)與泥巴小怪、P3 海上陸地:大太法師半場拍擊、蛇崩擊退、荒魂燃燒強化技能與升龍踩塔。尺寸取自 BossMod 實測值,九字切與塔的位置為示意。"
  }
];

/* 封存:被新版取代、但保留下來供對照的舊攻略。
 * 首頁會把這些收在一個預設收合的區塊裡,不與現行攻略混在一起。 */
window.RAID_ARCHIVE = [
  {
    "id": "hells-kier-ex-legacy",
    "name": "極朱雀徵魂戰(目測版沙盤圖)",
    "author": "菓子君_Okashi",
    "description": "極朱雀的原始版本,文字與現行版相同,但沙盤圖的圈與範圍是目測近似的。已由實測數值版取代,保留供尺寸有疑慮時對照。",
    "replacedBy": "hells-kier-ex"
  },
  {
    "id": "uwu-legacy",
    "name": "絕神兵零式(UWU)(目測版沙盤圖)",
    "author": "みんとっと Minto",
    "description": "UWU 的原始版本,文字與現行版相同,但 P1 迦樓羅、P2 伊弗利特的沙盤圖範圍是目測近似的(P3、P4 兩版相同)。已由實測數值版取代,保留供尺寸有疑慮時對照。",
    "replacedBy": "uwu"
  }
];
