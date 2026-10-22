const http = require('http');

function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let respData = '';
      res.on('data', chunk => { respData += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(respData));
        } catch (e) {
          resolve(respData);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('Testing translate endpoint:');
  const t1 = await postJson('/api/action/translate', { text: 'Viewing Break', targetLanguage: 'es' });
  console.log('Spanish:', t1);

  const t2 = await postJson('/api/action/translate', { text: 'Focus Mode', targetLanguage: 'ja' });
  console.log('Japanese:', t2);

  const t3 = await postJson('/api/action/translate', { text: 'Movie Night', targetLanguage: 'hi' });
  console.log('Hindi:', t3);

  console.log('Testing set-language:');
  const s1 = await postJson('/api/action/set-language', { language: 'es' });
  console.log('Set language result:', s1);

  console.log('Testing chat voice language command:');
  const c1 = await postJson('/api/chat', { message: 'Alexa, translate to Spanish' });
  console.log('Chat response:', c1.intent);
}

run().catch(console.error);
