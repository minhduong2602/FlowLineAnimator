const fs = require('fs');
let content = fs.readFileSync('src/components/ArtboardCanvas.tsx', 'utf8');

// Replace handle colors
content = content.replace(/stroke="\#00F2FF"/g, 'stroke="var(--color-ink)"');
content = content.replace(/fill="\#00F2FF"/g, 'fill="var(--color-ink)"');
content = content.replace(/stroke="\#000"/g, 'stroke="var(--color-canvas)"');
content = content.replace(/fill="\#FFFFFF"/g, 'fill="var(--color-canvas)"');
content = content.replace(/fill="none" stroke="\#FFFFFF"/g, 'fill="none" stroke="var(--color-ink)"'); // selection halo

fs.writeFileSync('src/components/ArtboardCanvas.tsx', content);
console.log('Processed handles');
