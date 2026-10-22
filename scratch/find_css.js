const fs = require('fs');
const content = fs.readFileSync('frontend/src/App.css', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('firetv-video-card') || l.includes('firetv-wrapper') || l.includes('firetv-voice-typing-overlay')) {
    console.log(`${idx + 1}: ${l}`);
  }
});
