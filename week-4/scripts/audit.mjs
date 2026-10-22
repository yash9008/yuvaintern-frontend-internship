// QA only: captures repeatable lab evidence, never loaded by the webpage.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const executable = process.env.LAUNCHPAD_BROWSER || chromium.executablePath();
const targets = process.env.AUDIT_TARGET ? [process.env.AUDIT_TARGET] : ['baseline', 'week-4'];
const base = process.env.LAUNCHPAD_BASE_URL || 'http://127.0.0.1:8024/';
fs.mkdirSync(path.join(root, 'evidence'), { recursive: true });
for (const target of targets) {
  const url = target === 'baseline' ? (process.env.BASELINE_URL || new URL('tests/fixtures/week-3/',base).href) : base;
  const browser = await chromium.launch({ headless: true, executablePath: executable });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(url);
  await page.addScriptTag({path: require.resolve('axe-core/axe.min.js')});
  const axe = await page.evaluate(async () => {
    const r = await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice']}});
    return {testEngine:r.testEngine, testEnvironment:r.testEnvironment, url:r.url, violations:r.violations, incomplete:r.incomplete, passes:r.passes.map(x=>({id:x.id,nodes:x.nodes.length}))};
  });
  fs.writeFileSync(path.join(root, `evidence/${target}-axe.json`), JSON.stringify(axe,null,2));
  console.log(target, 'axe violations:', axe.violations.map(v=>[v.id,v.nodes.map(n=>n.target)]));
  await browser.close();
  const runs=[];
  for(let i=1;i<=3;i++) {
    const chrome = await launch({ chromePath: executable, chromeFlags:['--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions'] });
    try {
      const result = await lighthouse(url,{port:chrome.port,output:'json',logLevel:'error',onlyCategories:['performance','accessibility','best-practices','seo']});
      fs.writeFileSync(path.join(root,`evidence/${target}-lighthouse-${i}.json`),result.report);
      const l=result.lhr;
      const metrics=Object.fromEntries(['first-contentful-paint','largest-contentful-paint','speed-index','total-blocking-time','cumulative-layout-shift'].map(k=>[k,l.audits[k].numericValue]));
      runs.push({run:i,scores:Object.fromEntries(Object.entries(l.categories).map(([k,v])=>[k,Math.round(v.score*100)])),metrics});
      console.log(target,i,runs.at(-1));
    } finally { await chrome.kill(); }
  }
  fs.writeFileSync(path.join(root,`evidence/${target}-summary.json`),JSON.stringify({date:'2026-10-22',url,profile:'Lighthouse default mobile, simulated throttling; local Python HTTP server; no compression',runs},null,2));
}
