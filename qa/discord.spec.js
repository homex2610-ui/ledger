// Discord invite e2e. Two servers back this file: :5173 (no
// VITE_DISCORD_INVITE_URL → unconfigured state, CTAs hidden) and :5174 (QA
// value set via qa/serve-configured.mjs → configured state, CTAs render).
// The QA invite is test-only — the prod bundle grep pins that it never ships.
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const QA_INVITE = "https://discord.gg/ledger-qa";
const CTA_NAME = "Join the Ledger Discord community (opens in a new tab)";

async function enterDemo(page) {
  await page.goto("/");
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

const sideNav = (page) => page.locator('nav[aria-label="Primary"]');

test.describe("configured (VITE_DISCORD_INVITE_URL set)", () => {
  test.use({ baseURL: "http://localhost:5174" });

  test("community: Ledger Discord CTA renders with the configured invite", async ({ page }) => {
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await enterDemo(page);
    await sideNav(page).getByRole("button", { name: "Community" }).click();
    const cta = page.getByRole("link", { name: CTA_NAME });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", QA_INVITE);
    await expect(cta).toHaveAttribute("target", "_blank");
    const rel = await cta.getAttribute("rel");
    expect(rel).toContain("noopener");
    expect(rel).toContain("noreferrer");
    await expect(page.getByText("Study together beyond Ledger.")).toBeVisible();
    expect(errors.filter(e => /discord/i.test(e))).toEqual([]);
  });

  test("account: Ledger Discord row renders in the profile panel", async ({ page }) => {
    await enterDemo(page);
    await page.getByRole("button", { name: "Account" }).click();
    const cta = page.getByRole("link", { name: CTA_NAME });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", QA_INVITE);
    await expect(cta).toHaveAttribute("target", "_blank");
    const rel = await cta.getAttribute("rel");
    expect(rel).toContain("noopener");
    expect(rel).toContain("noreferrer");
    await expect(page.getByText("Ledger Discord")).toBeVisible();
  });

  test("stories: Join Ledger Discord appears as a secondary action beside Share/Download", async ({ page }) => {
    await enterDemo(page);
    await page.getByRole("button", { name: "Share today's Ledger Story" }).click();
    await expect(page.getByRole("dialog", { name: "Ledger Stories" })).toBeVisible();
    const cta = page.getByRole("link", { name: CTA_NAME });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", QA_INVITE);
    const rel = await cta.getAttribute("rel");
    expect(rel).toContain("noopener");
    expect(rel).toContain("noreferrer");
    // Existing share/download controls unchanged next to the new CTA.
    await expect(page.getByRole("button", { name: /Download Ledger Story/ })).toBeVisible();
  });
});

test.describe("unconfigured (no VITE_DISCORD_INVITE_URL)", () => {
  test.use({ baseURL: "http://localhost:5173" });

  test("community/account/stories: no Discord CTA, no broken or undefined hrefs, no console errors", async ({ page }) => {
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await enterDemo(page);

    // Community: section and CTA absent entirely.
    await sideNav(page).getByRole("button", { name: "Community" }).click();
    await expect(page.getByText("Study together beyond Ledger.")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Discord/i })).toHaveCount(0);
    const hrefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a")).map(a => a.getAttribute("href"))
    );
    expect(hrefs.filter(h => h === "undefined" || h === null)).toEqual([]);

    // Profile panel: no Discord row.
    await page.getByRole("button", { name: "Account" }).click();
    await expect(page.getByRole("link", { name: /Discord/i })).toHaveCount(0);
    await page.keyboard.press("Escape");

    // Stories: no Discord CTA; sharing still opens and works.
    await sideNav(page).getByRole("button", { name: "Home" }).click();
    await page.getByRole("button", { name: "Share today's Ledger Story" }).click();
    await expect(page.getByRole("dialog", { name: "Ledger Stories" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Discord/i })).toHaveCount(0);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download Ledger Story/ }).click();
    const download = await downloadPromise;
    await readFileCheck(download);
    await page.getByRole("button", { name: "Close Ledger Stories" }).click();

    expect(errors.filter(e => /discord|undefined/i.test(e))).toEqual([]);
  });
});

// Reuse the PNG header check from ledger.spec.js — proves the story export
// itself is untouched by the Discord work.
async function readFileCheck(download) {
  const png = await readFile(await (await download).path());
  expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(png.readUInt32BE(16)).toBe(1080);
  expect(png.readUInt32BE(20)).toBe(1920);
}
