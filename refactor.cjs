const fs = require('fs');
const files = [
  'src/components/SidebarControls.tsx',
  'src/components/ExportModal.tsx',
  'src/components/ArtboardCanvas.tsx',
  'src/utils/bezier.ts'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  
  // 1. Theme mappings (Backgrounds)
  content = content.replace(/bg-\[\#0d0d0f\]|bg-\[\#141417\]|bg-\[\#09090b\]/g, 'bg-[var(--color-paper)]');
  content = content.replace(/bg-zinc-900\/50|bg-zinc-900|bg-\[\#18181b\]|bg-\[\#1c1c21\]|bg-\[\#1a1a1f\]|bg-zinc-800/g, 'bg-[var(--color-surface-alt)]');
  content = content.replace(/bg-black\/40|bg-black\/80/g, 'bg-[var(--color-paper)]');
  content = content.replace(/bg-white\/80/g, 'bg-[var(--color-surface-alt)]\/80');

  // 2. Borders
  content = content.replace(/border-white\/10|border-white\/5|border-\[\#333\]|border-zinc-800/g, 'border-[var(--color-hairline)]');

  // 3. Typography colors
  content = content.replace(/text-zinc-500|text-zinc-600|text-zinc-400|text-zinc-300/g, 'text-[var(--color-mid-gray)]');
  content = content.replace(/text-zinc-200|text-white\/50|text-white/g, 'text-[var(--color-ink)]');
  
  // 4. Accent Colors (Neon -> Neutral)
  content = content.replace(/text-\[\#00F2FF\]/g, 'text-[var(--color-ink)]');
  content = content.replace(/border-\[\#00F2FF\]\/[0-9]+/g, 'border-[var(--color-ink)]');
  content = content.replace(/bg-\[\#00F2FF\]\/10|bg-\[\#00F2FF\]\/20/g, 'bg-[var(--color-canvas)]');
  content = content.replace(/bg-\[\#00F2FF\]/g, 'bg-[var(--color-ink)]');
  content = content.replace(/accent-\[\#00F2FF\]/g, 'accent-[var(--color-ink)]');
  content = content.replace(/shadow-\[\#00F2FF\]\/[0-9]+/g, '');
  content = content.replace(/shadow-lg|shadow-xl/g, '[box-shadow:var(--shadow-subtle)]');
  content = content.replace(/shadow-sm/g, ''); // we use custom subtle shadow

  content = content.replace(/text-emerald-400|text-emerald-300/g, 'text-[var(--color-ink)]');
  content = content.replace(/bg-emerald-500\/[0-9]+/g, 'bg-[var(--color-canvas)]');
  content = content.replace(/border-emerald-500\/[0-9]+/g, 'border-[var(--color-ink)]');
  content = content.replace(/accent-emerald-400/g, 'accent-[var(--color-ink)]');

  content = content.replace(/text-amber-400|text-amber-300|text-pink-400/g, 'text-[var(--color-ink)]');
  content = content.replace(/bg-amber-400\/[0-9]+|bg-pink-500\/[0-9]+/g, 'bg-[var(--color-canvas)]');
  content = content.replace(/border-amber-400\/[0-9]+|border-pink-500\/[0-9]+/g, 'border-[var(--color-ink)]');
  content = content.replace(/accent-amber-400/g, 'accent-[var(--color-ink)]');
  
  // 5. Border radius
  content = content.replace(/rounded-lg/g, 'rounded-[18px]');
  content = content.replace(/rounded-xl|rounded-2xl/g, 'rounded-[24px]');
  
  // 6. Sidebar specific
  content = content.replace(/w-80 lg:w-\[380px\] border-l border-\[var\(--color-hairline\)\] bg-\[var\(--color-paper\)\] flex flex-col/g, 'w-80 lg:w-[380px] border-l border-[var(--color-hairline)] bg-[var(--color-surface-alt)] flex flex-col');
  
  // Write back
  fs.writeFileSync(f, content);
  console.log('Processed', f);
});
