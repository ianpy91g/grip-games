// 遊戲清單：首頁依這裡的順序、依裝置分區顯示。
// 新增遊戲：在 GAMES 加一筆（folder 是遊戲資料夾名稱，thumb 是 thumbs/ 裡的截圖），
// 用到新的裝置時，在 DEVICES 也加一筆。
window.DEVICES = [
  { id: 'oriori', name: 'ORIORI 握力球', note: '一顆，藍牙名稱 weixin-…', color: '#f2a93b' },
  { id: 'funfit', name: '健身趣 握力環', note: '兩支當左右手，藍牙名稱 FUNFITGRIP', color: '#5fd0f0' }
];

window.GAMES = [
  { folder: 'egg', title: '捏蛋大挑戰', device: 'oriori', thumb: 'thumbs/egg.jpg',
    desc: '握力超過門檻撐 0.5 秒捏破蛋，從麻雀蛋一路到恐龍蛋，破完 10 關還有奇異鳥蛋。' },
  { folder: 'rocket', title: '水火箭發射', device: 'oriori', thumb: 'thumbs/rocket.jpg',
    desc: '握緊打氣、放開發射，放開那一瞬間的握力越大，火箭飛越高：從越過樹梢到飛出太空。' },
  { folder: 'fishing', title: '釣魚大師', device: 'oriori', thumb: 'thumbs/fishing.jpg',
    desc: '握緊收線、放鬆下沉，「！」出現時用力握讓魚上鉤；魚越大要越大的握力，掙扎時還要加力。90 秒比總重、收集圖鑑。' },
  { folder: 'keeper', title: '守門員大作戰', device: 'funfit', thumb: 'thumbs/keeper.jpg',
    desc: '握右手往右撲、握左手往左撲，球要碰到身體才算擋下。10 關、變化球、大招「重影」。' }
];
