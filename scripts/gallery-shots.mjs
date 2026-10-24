// Captures real screenshots of the running app for the landing page gallery.
// Usage: npm run build && npm start, then: node scripts/gallery-shots.mjs [http://localhost:3000]
// Needs Playwright (npm i -D playwright, or a global install). Writes public/gallery/*.jpg and data/gallery.json.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// require() also finds a globally installed Playwright, which ESM imports don't.
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = fileURLToPath(new URL("../public/gallery/", import.meta.url));
const shots = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.5, reducedMotion: "reduce" });
// Skip the loading screen.
await page.addInitScript(() => sessionStorage.setItem("ss-intro", "1"));

async function capture(name, locator, title, caption) {
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const file = `${name}.jpg`;
  await locator.screenshot({ path: OUT + file, type: "jpeg", quality: 82 });
  const box = await locator.boundingBox();
  shots.push({ src: `/gallery/${file}`, width: Math.round(box.width * 1.5), height: Math.round(box.height * 1.5), title, caption });
}

await page.goto(`${BASE}/assessment/scorecard`);
await page.click("text=Try with sample scorecard");
await page.waitForSelector("text=Shop stat sheet");
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);
// The whole step is very tall; take the first screenful (progress, upload box, first results).
await page.screenshot({ path: OUT + "upload.jpg", type: "jpeg", quality: 82, clip: { x: 0, y: 0, width: 1280, height: 800 } });
shots.push({ src: "/gallery/upload.jpg", width: 1920, height: 1200, title: "Upload", caption: "Step 1: a photo, PDF or screenshot of the insurer scorecard." });

await page.goto(`${BASE}/results`);
await page.waitForSelector("text=Shop stat sheet");
await capture("stat-sheet", page.locator("div.bg-night-2", { hasText: "Shop stat sheet" }).last(), "Stat sheet", "Six metrics against the insurer's target, with the shop's level and weakest stat.");

await page.goto(`${BASE}/assessment/jobs`);
await page.click("text=Use sample jobs");
await page.waitForSelector(".recharts-scatter");
await capture("jobs", page.locator(".recharts-wrapper").locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]"), "Slow jobs", "Every repair order plotted; the ones that ran long are flagged.");

await page.goto(`${BASE}/results`);
await page.waitForSelector("text=Scorecard details");
await page.waitForSelector("text=Before vs. after");
await capture("results", page.locator("section", { hasText: "Scorecard details" }).first(), "Results", "Value, target, gap and status, with a fix next to each weak metric.");

await page.click('button:has-text("Which job hurt me most?")');
await page.waitForSelector("text=Thinking it through…", { state: "detached" });
await capture("ask", page.locator("section", { hasText: "Ask ShopStats" }).first(), "Ask ShopStats", "Questions answered from the shop's own numbers.");

await browser.close();
writeFileSync(fileURLToPath(new URL("../data/gallery.json", import.meta.url)), JSON.stringify(shots, null, 2) + "\n");
console.log(shots.map((s) => `${s.src} ${s.width}x${s.height}`).join("\n"));
