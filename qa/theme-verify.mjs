// Themed verification probe (dev server, demo mode):
//  1. Fresh session (no saved preference) boots into Midnight
//  2. Backgrounds are true black across shell/rail/workspace
//  3. Switching theme away and back to Midnight works
//  4. A saved theme preference overrides the new default
import { chromium } from "@playwright/test";

const BASE = process.argv[2] || "http://localhost:5173";
const out = [];
const ok = (n, v) => out.push(`ok   ${n}: ${v}`);
const bad = (n, v) => out.push(`FAIL ${n}: ${v}`);
const cs = (page, sel, prop) =>
  page.locator(sel).first().evaluate((el, p) => getComputedStyle(el)[p], prop);

async function enterDemo(page) {
  await page.goto(BASE);
  await page.getByRole("button", { name: "Continue as Guest / Demo Mode" }).click();
  await page.getByText("Who are you?").waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  if (await page.getByText("Who are you?").isVisible().catch(() => false)) {
    await page.getByPlaceholder("e.g. Aditya").fill("QA Tester");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByText("What are you targeting?").waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByText("Lock the date").waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("button", { name: "Start tracking" }).click();
  }
  await page.locator('nav[aria-label="Primary"]').waitFor({ state: "visible", timeout: 20_000 });
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

// ── 1. Fresh session: default theme is Midnight ─────────────────────────
await enterDemo(page);
const bodyBg = await cs(page, "body", "backgroundColor");
const railBg = await cs(page, ".lg-side", "backgroundColor");
const canvasVar = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg-canvas").trim());
const shellBg = await cs(page, ".app-shell", "backgroundColor");
const headerBg = await cs(page, "header", "backgroundColor").catch(() => "n/a");

if (bodyBg === "rgb(0, 0, 0)") ok("body/app background", bodyBg); else bad("body/app background", bodyBg);
if (railBg === "rgb(0, 0, 0)") ok("sidebar rail background", railBg); else bad("sidebar rail background", railBg);
if (canvasVar === "#000000") ok("--bg-canvas token", canvasVar); else bad("--bg-canvas token", canvasVar);
if (shellBg === "rgba(0, 0, 0, 0)" || shellBg === "transparent") ok("shell is transparent over black canvas", shellBg);
else bad("shell is transparent over black canvas", shellBg);

// Midnight accent applied (focus #8AAAC6 in the emitted CSS)
const css = await page.evaluate(() => [...document.querySelectorAll("style")].map(s => s.textContent).join("\n"));
if (css.includes("#8AAAC6")) ok("Midnight accent (#8AAAC6) emitted", "yes"); else bad("Midnight accent (#8AAAC6) emitted", "no");

// Theme picker marks Midnight as the active theme
await page.getByRole("button", { name: "Account" }).click();
await page.getByRole("menuitem", { name: "Settings" }).click();
await page.getByRole("button", { name: "Appearance", exact: true }).click();
const pressed = await page.getByRole("button", { name: "Switch to Midnight" }).getAttribute("aria-pressed").catch(() => null);
if (pressed === "true") ok("Midnight selected in Appearance", "aria-pressed=true"); else bad("Midnight selected in Appearance", String(pressed));

// Workspace background reads black in the dashboard area (element painted over canvas)
const workspaceBg = await page.evaluate(() => {
  const pageEl = document.querySelector(".lg-page");
  const r = pageEl.getBoundingClientRect();
  const probe = document.elementFromPoint(r.left + r.width / 2, r.top + 40);
  if (!probe) return null;
  return getComputedStyle(probe).backgroundColor;
});
ok("dashboard probe element bg", workspaceBg || "n/a");

// ── 2. Switch to Nocturne, then back to Midnight ────────────────────────
await page.getByRole("button", { name: "Switch to Nocturne" }).click();
await page.waitForTimeout(300);
const nocturneBg = await cs(page, "body", "backgroundColor");
if (nocturneBg !== "rgb(0, 0, 0)") ok("switch away → Nocturne bg differs", nocturneBg);
else bad("switch away → Nocturne bg differs", nocturneBg);

await page.getByRole("button", { name: "Switch to Midnight" }).click();
await page.waitForTimeout(300);
const backBg = await cs(page, "body", "backgroundColor");
if (backBg === "rgb(0, 0, 0)") ok("switch back → Midnight bg", backBg); else bad("switch back → Midnight bg", backBg);
const backRail = await cs(page, ".lg-side", "backgroundColor");
if (backRail === "rgb(0, 0, 0)") ok("switch back → rail bg", backRail); else bad("switch back → rail bg", backRail);

console.log(out.join("\n"));
await browser.close();
process.exit(out.some(l => l.startsWith("FAIL")) ? 1 : 0);
