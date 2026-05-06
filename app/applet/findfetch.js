const fs = require('fs');
const oldCode = fs.readFileSync('/tmp-old-code.ts', 'utf8');
const lines = oldCode.split('\n');
lines.forEach((l, i) => {
  if (l.includes('fetch')) {
    console.log(`Line ${i}: ${l}`);
  }
});
