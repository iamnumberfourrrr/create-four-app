import { chromium } from "playwright";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });

const outDir = "plans/visuals/260507-1100-landing-build";

// 1. Hero copy button: click and capture copied state
await page.getByRole("button", { name: "copy install command" }).click();
await page.waitForTimeout(150);
await page.screenshot({ path: `${outDir}/v10-interaction-copy.png`, fullPage: false });

// Wait for state reset before next interaction
await page.waitForTimeout(1700);

// 2. Configurator: enable shadcn (should auto-check tailwind), enable docker, set db=postgres
await page.evaluate(() => {
  const el = document.getElementById("configure");
  if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
});
await page.waitForTimeout(300);
const shadcnCheckbox = page.locator("label").filter({ hasText: "shadcn" }).locator("input[type=checkbox]");
await shadcnCheckbox.click();
const dockerCheckbox = page.locator("label").filter({ hasText: "docker" }).locator("input[type=checkbox]");
await dockerCheckbox.click();
await page.getByRole("button", { name: /^postgres$/i }).first().click();
await page.getByRole("button", { name: "github", exact: true }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/v10-interaction-configured.png`, fullPage: false });

// 3. Module table: scroll to it and expand first row
await page.evaluate(() => {
  const el = document.getElementById("modules");
  if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
});
await page.waitForTimeout(300);
const tailwindRow = page.locator("button[aria-controls=row-tailwind]");
await tailwindRow.click();
await page.waitForTimeout(450);
await page.screenshot({ path: `${outDir}/v10-interaction-table-open.png`, fullPage: false });

// 4. Theme toggle: click and screenshot dark state
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
await page.getByRole("button", { name: /switch to dark theme/i }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/v10-interaction-dark.png`, fullPage: false });

await browser.close();
console.log("ok");
