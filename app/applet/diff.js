import fs from 'fs';
const oldLines = fs.readFileSync('/tmp-old-code.ts', 'utf8').split('\n');
const newLines = fs.readFileSync('src/AuraokeApp.tsx', 'utf8').split('\n');
let count = 0;
for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
  if (oldLines[i] !== newLines[i]) {
    console.log(`Line ${i+1}:`);
    console.log(`< ${oldLines[i]}`);
    console.log(`> ${newLines[i]}`);
    console.log('---');
    count++;
    if(count > 100) break;
  }
}
