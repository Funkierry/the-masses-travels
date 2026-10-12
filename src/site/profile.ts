import type { RouteNode } from '../data.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Everything personal lives here. Replace the sample person, texts, links and
// images with your own; the page reads nothing else.
//
// Pictures: the home key visual and the about plate are drawn graphics, so no
// photo is needed. Work previews are paths relative to public/assets/ — the
// defaults are game map previews used as placeholders for a local demo only.
// ─────────────────────────────────────────────────────────────────────────────

export const profile = {
 name: { lines: ['Lin', 'Ye'], cn: '林叶', latin: 'Lin Ye' },
 role: '交互设计师 · 前端开发', roleEn: 'INTERACTION DESIGNER / FRONT-END',
 location: '上海 · SHANGHAI', since: 2019,
 tagline: '把动态影像，<br>拆成可以触摸的界面。',
 taglineEn: 'TURNING MOTION INTO INTERFACES YOU CAN TOUCH',
 quote: '好的界面，像一段可以倒放的影像。',
 bio: '专注于动效、数据可视化与网页交互。喜欢从影像、海报和游戏界面里找节奏，再把它们改写成可以被拖动、被点亮、被拆开的网页。日常使用 TypeScript、Three.js 与 Figma。',
 facts: [
  { label: '经验', en: 'EXPERIENCE', value: '6 年' },
  { label: '方向', en: 'FOCUS', value: '动效 · 交互 · 可视化' },
  { label: '工具', en: 'TOOLS', value: 'TS · Three.js · Figma' }
 ],
 years: 6,
 // The about plate: glyph 先锋 (flag) / 近卫 (blade) / 重装 (shield) / 狙击 (crosshair), stars 1–6.
 plateRole: '狙击', plateStars: 5, accent: '#cf5a6a',
 resume: '#', // a PDF link, if you have one
 contact: {
  email: 'hello@example.com',
  links: [
   { label: 'GitHub', url: 'https://github.com/' },
   { label: 'Bilibili', url: 'https://www.bilibili.com/' },
   { label: 'Dribbble', url: 'https://dribbble.com/' }
  ]
 }
};

const work = (id: string, code: string, kind: RouteNode['kind'], x: number, y: number, title: string, en: string, meta: string, description: string, preview: string, tags: string[], label?: string): RouteNode =>
 ({ id, code, kind, x, y, title, en, meta, description, preview: `game/${preview}.webp`, tags, link: '#', label });

// Works map: main projects sit on the axis; experiments branch above, writing below.
export const works: RouteNode[] = [
 work('wk-01', 'WK-01', 'operation', 66, 60, '众生行记 · 交互映像', "THE MASSES' TRAVELS", '2026 · 设计 / 开发', '以 PV 与活动界面为参考的平面设计交互图录：关卡地图、图谱、绘制的人员图版与可拆解的三维圣堂。', 'stage-01', ['Three.js', 'Canvas', '动效'], 'PROJECT'),
 work('wk-02', 'WK-02', 'operation', 116, 60, '城市噪声地图', 'CITY OF NOISE', '2025 · 数据可视化', '用一年的环境噪声数据生成可缩放的城市剖面，按小时回放城市的呼吸。', 'stage-03', ['D3', '数据', 'WebGL'], 'PROJECT'),
 work('nt-01', 'NOTE-01', 'tutorial', 141, 82, '写给设计师的 Canvas 笔记', 'NOTES ON CANVAS', '2025 · 文章', '一组关于离屏画布、逐帧动画与性能的写作，附可交互示例。', 'stage-tr01', ['写作', '教程'], 'NOTE'),
 work('wk-03', 'WK-03', 'operation', 166, 60, '展览导览系统', 'EXHIBITION GUIDE', '2024 · 交互设计', '为一次影像展设计的移动端导览：展品识别、路线推荐与离线缓存。', 'stage-05', ['移动端', '展览'], 'PROJECT'),
 work('wk-04', 'WK-04', 'operation', 216, 60, '品牌动态规范', 'MOTION GUIDELINES', '2024 · 动效设计', '为一个消费品牌建立动效语言：节奏、缓动曲线、转场与组件动效库。', 'stage-06', ['品牌', '规范'], 'PROJECT'),
 work('lab-01', 'LAB-01', 'story', 248, 38, '手势画布', 'GESTURE CANVAS', '实验 · 2025', '用摄像头追踪手势，在画布上留下会消散的线条。', 'stage-ex02', ['实验', '手势'], 'LAB'),
 work('lab-02', 'LAB-02', 'story', 290, 24, '字母的形变', 'LETTER MORPH', '实验 · 2024', '衬线字母之间的插值与翻转，一个字体动效小工具。', 'stage-ex04', ['字体', '实验'], 'LAB'),
 work('lab-03', 'LAB-03', 'story', 332, 38, '声音的形状', 'SHAPE OF SOUND', '实验 · 2023', '把音频频谱映射成可拖动的三维地形。', 'stage-ex06', ['音频', 'Three.js'], 'LAB'),
 work('wk-05', 'WK-05', 'operation', 364, 60, '在线课程平台', 'LEARNING PLATFORM', '2023 · 产品设计', '从信息架构到界面组件的完整改版，课程完课率提升 18%（示例数据）。', 'stage-08', ['产品', '设计系统'], 'PROJECT'),
 work('wk-06', 'WK-06', 'operation', 414, 60, '独立游戏 UI', 'INDIE GAME UI', '2022 · 界面设计', '为一款叙事解谜游戏设计主菜单、存档与道具界面。', 'stage-10', ['游戏', 'UI'], 'PROJECT'),
 work('next', 'NEXT', 'special', 470, 60, '下一个项目', 'YOUR PROJECT HERE', '期待合作', '这里留给下一段合作。点击「联系我」，在契约页让两只手的指尖相触。', 'stage-s01', ['合作'], 'NEXT')
];
export const WORKS_WIDTH = 540;
export const workLinks: [string, string][] = [['wk-02', 'nt-01'], ['nt-01', 'wk-03'], ['wk-04', 'lab-01'], ['lab-01', 'lab-02'], ['lab-02', 'lab-03'], ['lab-03', 'wk-05']];

// Skills: each bird on the blueprint plate carries one; level is 1–5.
export const skills = [
 { name: '动效设计', en: 'MOTION DESIGN', level: 5 }, { name: '交互原型', en: 'PROTOTYPING', level: 5 },
 { name: 'TypeScript', en: 'TYPESCRIPT', level: 4 }, { name: 'Three.js / WebGL', en: 'REAL-TIME 3D', level: 4 },
 { name: 'Canvas 2D', en: 'CANVAS', level: 5 }, { name: '数据可视化', en: 'DATA VIS', level: 4 },
 { name: '设计系统', en: 'DESIGN SYSTEMS', level: 4 }, { name: '字体排印', en: 'TYPOGRAPHY', level: 3 },
 { name: 'Figma', en: 'FIGMA', level: 5 }, { name: 'Blender', en: 'BLENDER', level: 3 },
 { name: '用户研究', en: 'USER RESEARCH', level: 3 }, { name: '前端性能', en: 'PERFORMANCE', level: 4 }
];
