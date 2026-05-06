const newLines = require('fs').readFileSync('src/AuraokeApp.tsx', 'utf8').split('\n');
const start = newLines.findIndex(l => l.includes('const timer = setTimeout(async () => {'));
const end = newLines.findIndex((l, i) => i > start && l.includes('return () => clearTimeout(timer);'));
console.log(newLines.slice(start, end + 2).join('\n'));
