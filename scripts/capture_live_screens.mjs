import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = 'C:\\Users\\sheet\\Documents\\AIDetector\\QuietCue\\frontend\\public\\slides';

async function runCapture() {
  console.log('Launching Chrome for live screen capture...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // 1. Dashboard Overview
  console.log('Navigating to QuietCue+ Dashboard on http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  const slide1Path = path.join(OUTPUT_DIR, 'live_screen_1_dashboard.png');
  await page.screenshot({ path: slide1Path });
  console.log('Captured Slide 1 Dashboard');

  // 2. Synthesize Family Time contract via real user typing & send
  console.log('Typing Family Time voice contract intent into chat...');
  const promptText = 'Alexa, start Family Time. Only interrupt me for critical safety alerts, hold deliveries until a break, and summarize routine updates afterward.';
  
  await page.click('input.chat-text-input');
  // Clear any existing input
  await page.evaluate(() => {
    const input = document.querySelector('input.chat-text-input');
    if (input) input.value = '';
  });
  await page.type('input.chat-text-input', promptText, { delay: 15 });
  await new Promise(r => setTimeout(r, 500));
  await page.click('button.chat-send-arrow');
  console.log('Sent prompt to Bedrock parser, waiting for synthesis...');
  await new Promise(r => setTimeout(r, 3500));

  const slide2Path = path.join(OUTPUT_DIR, 'live_screen_2_family_time_bedrock.png');
  await page.screenshot({ path: slide2Path });
  console.log('Captured Slide 2 Bedrock Contract with Family Time prompt');

  // 3. Navigate to Fire TV Client via ?client=tv
  console.log('Navigating to Fire TV Client on http://localhost:5173/?client=tv ...');
  await page.goto('http://localhost:5173/?client=tv', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 3000));

  const slide3Path = path.join(OUTPUT_DIR, 'live_screen_3_firetv_hud.png');
  await page.screenshot({ path: slide3Path });
  console.log('Captured Slide 3 Fire TV Client');

  // 4. Activate VR Immersion mode on Fire TV Client
  console.log('Activating VR Immersion Mode on Fire TV Client...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const vrBtn = buttons.find(b => b.textContent && (b.textContent.includes('VR Immersion') || b.textContent.includes('🥽')));
    if (vrBtn) vrBtn.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  const slide4Path = path.join(OUTPUT_DIR, 'live_screen_4_vr_immersion.png');
  await page.screenshot({ path: slide4Path });
  console.log('Captured Slide 4 VR Immersion with cyan guardian grid');

  await browser.close();
  console.log('Done captures 1 through 4!');
}

runCapture().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
