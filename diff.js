import { readFileSync } from 'fs';
const oldLines = readFileSync('/tmp-old-code.ts', 'utf8').split('\n');
const newLines = readFileSync('src/AuraokeApp.tsx', 'utf8').split('\n');
let diffs = 0;
for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
  if (oldLines[i] !== newLines[i]) {
    console.log(`Line ${i+1}:\n< ${oldLines[i] || ''}\n> ${newLines[i] || ''}\n---`);
    diffs++;
    if(diffs > 50) break;
  }
}
