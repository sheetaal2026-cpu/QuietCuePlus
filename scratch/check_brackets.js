const fs = require('fs');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const bracketRegex = /['"`][^'"`]*[()][^'"`]*['"`]/;
  
  lines.forEach((line, idx) => {
    // Exclude code syntax like function calls, imports, conditionals, ts types
    if (line.includes('//') || line.includes('import ') || line.includes('function ') || line.includes('export ') || line.includes('interface ')) return;
    const match = line.match(bracketRegex);
    if (match) {
      // Check if it's regex or code
      if (!line.includes('.replace(') && !line.includes('RegExp') && !line.includes('catch(') && !line.includes('.includes(')) {
        console.log(`${filePath}:${idx + 1}: ${line.trim()}`);
      }
    }
  });
}

checkFile('frontend/src/translations.ts');
console.log('Check finished.');
