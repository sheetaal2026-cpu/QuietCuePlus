const fs = require('fs');
const path = require('path');

function searchDir(dir, query) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== 'dist') searchDir(full, query);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.html')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.toLowerCase().includes(query.toLowerCase())) {
        console.log(`Found "${query}" in ${full}`);
        const lines = content.split('\n');
        lines.forEach((l, idx) => {
          if (l.toLowerCase().includes(query.toLowerCase())) {
            console.log(`  Line ${idx + 1}: ${l.trim()}`);
          }
        });
      }
    }
  }
}

searchDir('frontend/src', 'hear alexa speak');
searchDir('frontend/src', 'click any command');
searchDir('frontend/src', 'auto-type');
searchDir('frontend/src', 'runVoiceTypingAnimation');
