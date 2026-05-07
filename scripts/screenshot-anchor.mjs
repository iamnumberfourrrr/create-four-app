import { chromium } from "playwright";

const browser = await chromium.launch();
const [url, anchor, out, wStr, hStr] = process.argv.slice(2);
const w = parseInt(wStr, 10);
const h = parseInt(hStr, 10);
const ctx = await browser.newContext({ viewport: { width: w, height: h } });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "networkidle" });
if (anchor) {
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
  }, anchor);
  await page.waitForTimeout(200);
}
await page.screenshot({ path: out, fullPage: false });
await browser.close();
console.log(out);
