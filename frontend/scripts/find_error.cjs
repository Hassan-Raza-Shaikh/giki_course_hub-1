const fs = require('fs');
const { parse } = require('@babel/parser');
const code = fs.readFileSync('src/pages/AdminPanel.jsx', 'utf8').split('\n');

for (let i = 1840; i >= 300; i--) {
  const partial = code.slice(0, i).join('\n') + '\n</div></div>);};';
  try {
    parse(partial, { sourceType: 'module', plugins: ['jsx'] });
    console.log('Valid up to line', i);
    break;
  } catch (e) {
    // continue
  }
}
