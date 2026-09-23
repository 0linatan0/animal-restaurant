export const FOODS = {
  dumpling: { name: '饺子', fullName: '水饺', unit: '个' },
  shrimp: { name: '虾', fullName: '大虾', unit: '只' },
  ribs: { name: '排骨', fullName: '排骨', unit: '块' },
  broccoli: { name: '西蓝花', fullName: '西蓝花', unit: '朵' },
  greens: { name: '青菜', fullName: '青菜', unit: '棵' },
  mushroom: { name: '香菇', fullName: '香菇', unit: '个' },
  bun: { name: '包子', fullName: '包子', unit: '个' },
};
export const FOOD_IDS = Object.keys(FOODS);
export const ROLES = { rabbit: '小兔子', bear: '小熊' };
export const NUMBERS = ['零', '一', '二', '三', '四', '五'];
export const amount = (n) => n === 2 ? '两' : NUMBERS[n];
export const DEFAULT_SETTINGS = { mode: 'order', quantity: '1-5', hints: 'full', minutes: 5 };
export const MODE_NAMES = { order: '动物点餐', sort: '食物分类', free: '自由厨房' };

const common = {
  welcome: ['入座与结束', '小厨师，你好呀！'],
  goodbye: ['入座与结束', '今天先做到这里，谢谢小厨师。我们下次再见！'],
  warning: ['入座与结束', '餐厅快要收工啦。'],
  thanks: ['感谢', '谢谢小厨师，我要开动啦！'],
  freeThanks: ['感谢', '谢谢你准备的饭，看起来好好吃呀！'],
  countHelp: ['引导', '我们一起数一数。点一点盘子里的食物吧。'],
  less: ['引导', '好像还少一点，我们一起数数？'],
  more: ['引导', '好像多了一点，可以拿回去再看看。'],
  empty: ['引导', '先放一点食物到盘子里吧。'],
  full: ['引导', '盘子装满啦，可以拿回去再看看。'],
  sortIntro: ['分类与自由玩', '把一样的食物放在一起吧！'],
  sortWrong: ['分类与自由玩', '看看盘子上的图案，把一样的放在一起。'],
  sortThanks: ['分类与自由玩', '都分好啦，谢谢你帮忙！'],
  freeIntro: ['分类与自由玩', '今天你来做主，想请我吃些什么呢？'],
  resume: ['引导', '我们继续做饭吧。'],
};
export const LINES = Object.fromEntries(Object.entries(common).map(([id, [group, text]]) => [id, { id, group, text }]));
for (const n of [1, 2, 3, 4, 5]) {
  LINES[`count-${n}`] = { id: `count-${n}`, group: '逐个计数', text: NUMBERS[n] };
  LINES[`total-mixed-${n}`] = { id: `total-mixed-${n}`, group: '总量确认', text: `一共有${amount(n)}个。` };
  for (const food of FOOD_IDS) {
    const f = FOODS[food];
    LINES[`order-${food}-${n}`] = { id: `order-${food}-${n}`, group: '点餐', text: `我想吃${amount(n)}${f.unit}${f.name}。` };
    LINES[`total-${food}-${n}`] = { id: `total-${food}-${n}`, group: '总量确认', text: `一共${amount(n)}${f.unit}${f.name}。` };
  }
}
for (const food of FOOD_IDS) LINES[`wrong-${food}`] = { id: `wrong-${food}`, group: '引导', text: `看看，我想吃的是${FOODS[food].name}。` };
export const GROUPS = [...new Set(Object.values(LINES).map(l => l.group))];
export const voiceKey = (role, line) => `${role}/${line}`;
export const defaultAudio = (role, line) => `./assets/audio/${role}/${line}.mp3`;

// 旧鸡翅录音只保留备份兼容，不作为排骨台词播放。
export const ARCHIVED_LINE_IDS = ['wrong-wing', ...[1, 2, 3, 4, 5].flatMap(n => [`order-wing-${n}`, `total-wing-${n}`])];
