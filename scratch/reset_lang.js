const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/action/set-language',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log('Reset language to en:', d));
});
req.write(JSON.stringify({ language: 'en' }));
req.end();
