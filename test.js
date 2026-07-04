const puppeteer = require('/Users/yotathai/.nvm/versions/node/v20.18.0/lib/node_modules/puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('response', response => {
    if (!response.ok()) {
      console.log('RESPONSE FAILED:', response.url(), response.status());
    }
  });

  await page.goto('https://yotathai.github.io/Qr-Code/', {waitUntil: 'networkidle0'});
  await page.screenshot({path: 'screenshot.png'});
  await browser.close();
  console.log('DONE');
})();
