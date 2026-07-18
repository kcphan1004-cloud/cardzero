import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const heroPath = path.join(root, 'components', 'Hero.tsx');

if (!fs.existsSync(heroPath)) {
  console.error('找不到 components/Hero.tsx');
  process.exit(1);
}

const original = fs.readFileSync(heroPath, 'utf8');
let next = original;

const backupPath = `${heroPath}.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.writeFileSync(backupPath, original, 'utf8');

function removeElementContaining(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<Link\\b[^>]*>[\\s\\S]*?${escaped}[\\s\\S]*?<\\/Link>`, 'g'),
    new RegExp(`<a\\b[^>]*>[\\s\\S]*?${escaped}[\\s\\S]*?<\\/a>`, 'g'),
    new RegExp(`<button\\b[^>]*>[\\s\\S]*?${escaped}[\\s\\S]*?<\\/button>`, 'g'),
  ];

  let changed = false;
  for (const pattern of patterns) {
    const updated = text.replace(pattern, (match) => {
      changed = true;
      return '';
    });
    text = updated;
  }

  return { text, changed };
}

for (const label of ['浏览卡牌', '开始组牌']) {
  const result = removeElementContaining(next, label);
  next = result.text;
  if (!result.changed) {
    console.warn(`没有找到按钮：${label}`);
  }
}

// 清理由按钮删除后留下的空按钮容器。
next = next
  .replace(/<div\b([^>]*)className="([^"]*(?:flex|grid)[^"]*)"([^>]*)>\s*<\/div>/g, '')
  .replace(/\n{3,}/g, '\n\n');

// 仅缩小桌面 Hero，手机尺寸保持不变。
const heightReplacements = [
  ['lg:min-h-[760px]', 'lg:min-h-[620px]'],
  ['lg:min-h-[720px]', 'lg:min-h-[600px]'],
  ['lg:min-h-[680px]', 'lg:min-h-[580px]'],
  ['lg:h-[760px]', 'lg:h-[620px]'],
  ['lg:h-[720px]', 'lg:h-[600px]'],
  ['lg:h-[680px]', 'lg:h-[580px]'],
  ['xl:min-h-[760px]', 'xl:min-h-[620px]'],
  ['xl:min-h-[720px]', 'xl:min-h-[600px]'],
  ['xl:h-[760px]', 'xl:h-[620px]'],
  ['xl:h-[720px]', 'xl:h-[600px]'],
  ['lg:py-32', 'lg:py-24'],
  ['lg:py-28', 'lg:py-20'],
  ['xl:py-36', 'xl:py-24'],
];

let resized = false;
for (const [from, to] of heightReplacements) {
  if (next.includes(from)) {
    next = next.replaceAll(from, to);
    resized = true;
  }
}

// 常见的 viewport 高度写法：桌面缩小约 10vh。
next = next.replace(/lg:min-h-\[([7-9]\d)vh\]/g, (_, value) => {
  resized = true;
  return `lg:min-h-[${Math.max(58, Number(value) - 10)}vh]`;
});
next = next.replace(/lg:h-\[([7-9]\d)vh\]/g, (_, value) => {
  resized = true;
  return `lg:h-[${Math.max(58, Number(value) - 10)}vh]`;
});

if (!resized) {
  console.warn('没有辨识到常见的桌面高度 class；按钮仍会删除。');
  console.warn('请检查 Hero 最外层 className，并把 lg:min-h / lg:h / lg:py 稍微调小。');
}

if (next === original) {
  console.error('没有产生任何修改，已停止写入。');
  process.exit(1);
}

fs.writeFileSync(heroPath, next, 'utf8');
console.log('已修改 components/Hero.tsx');
console.log(`备份：${path.relative(root, backupPath)}`);
console.log('下一步执行：npm run build');
