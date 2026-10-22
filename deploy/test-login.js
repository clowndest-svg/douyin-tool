const { chromium } = require('/opt/douyin-tool/node_modules/playwright-core');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const p = await b.newPage({ userAgent: UA, viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
  await p.goto('https://www.douyin.com/', { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {});
  await p.waitForTimeout(5000);
  console.log('TITLE=' + await p.title());
  console.log('TEXT=' + (await p.evaluate(() => document.body ? document.body.innerText.slice(0, 260) : 'no-body')).replace(/\n/g, '|'));
  const els = await p.evaluate(() => [...document.querySelectorAll('button,span,div')]
    .filter(e => e.offsetParent !== null && e.textContent.trim() === '登录')
    .map(e => ({ tag: e.tagName, cls: (e.className || '').toString().slice(0, 60), x: Math.round(e.getBoundingClientRect().left), y: Math.round(e.getBoundingClientRect().top) })));
  console.log('LOGIN_ELS=' + JSON.stringify(els).slice(0, 500));
  await p.evaluate(() => {
    const list = [...document.querySelectorAll('button,span,div')].filter(e => e.offsetParent !== null && e.textContent.trim() === '登录');
    if (list.length) list[list.length - 1].click();
  });
  await p.waitForTimeout(3000);
  console.log('AFTER=' + (await p.evaluate(() => document.body ? document.body.innerText.slice(0, 300) : 'no-body')).replace(/\n/g, '|'));
  await p.screenshot({ path: '/tmp/home.png' });
  await b.close();
})().catch(e => console.log('ERR ' + String(e.message).split('\n')[0]));
