// Live production verification for the Discord invite feature.
// Usage: node qa/live-verify.mjs <https://production-url>
//
// Verifies against the DEPLOYED site (not the dev server):
//   1. Auth screen still renders "Continue with Discord" and clicking it
//      starts the Discord OAuth flow (provider=discord redirect).
//   2. Demo Mode boots, onboarding completes.
//   3. All three Discord CTAs render (Community, profile panel, Stories)
//      with the SAME configured invite URL, target=_blank and
//      rel="noopener noreferrer".
//   4. Clicking a CTA opens the invite in a new tab.
//   5. The invite URL is baked into the production bundle (proves the
//      Vercel env var reached the Vite build) and is reachable.
//   6. No console errors and no undefined/broken Discord hrefs.
//   7. Light smoke: Community workspace, Stories dialog and profile panel
//      still render (deep behavior is covered by the local e2e suite).
import { chromium } from "@playwright/test";

const LIVE_URL = process.argv[2];
if (!LIVE_URL) {
  console.error("usage: node qa/live-verify.mjs <https://production-url>");
  process.exit(1);
}

const CTA_NAME = "Join the Ledger Discord community (opens in a new tab)";
const results = [];
const ok = (name) => results.push(`  ok  ${name}`);
const bad = (name, detail) => results.push(`  FAIL ${name}: ${detail}`);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push(String(e)));

const waitVisible = (locator, ms = 20_000) => locator.waitFor({ state: "visible", timeout: ms });

try {
  // ── 1. Discord OAuth still present and wired ──────────────────────────
  await page.goto(LIVE_URL);
  await waitVisible(page.getByRole("button", { name: "Continue with Discord" }), 30_000);
  ok("auth: Continue with Discord button renders on the live site");

  // Click and watch for the OAuth redirect (Supabase authorize -> Discord).
  // Don't complete the flow; verifying the redirect starts is the automated
  // ceiling without real credentials.
  let oauthStarted = false;
  const onNav = () => {
    const u = page.url();
    if (u.includes("provider=discord") || u.includes("discord.com/oauth2")) oauthStarted = true;
  };
  page.on("framenavigated", onNav);
  await page.getByRole("button", { name: "Continue with Discord" }).click();
  await page.waitForTimeout(4_000);
  if (oauthStarted) ok("auth: clicking Continue with Discord starts the Discord OAuth redirect");
  else bad("auth: no provider=discord / discord.com redirect observed after click", page.url().slice(0, 120));

  // ── 2. Demo Mode + onboarding ─────────────────────────────────────────
  await page.goto(LIVE_URL);
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
  ok("demo: demo mode boots and onboarding completes on the live site");
  const sideNav = () => page.locator('nav[aria-label="Primary"]');

  // ── 3. Bundle check: invite URL baked into the deployment ─────────────
  const bundleHasInvite = await page.evaluate(async () => {
    const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src).filter(s => s.includes("/assets/"));
    for (const src of scripts.slice(0, 3)) {
      const res = await fetch(src);
      if (!res.ok) continue;
      const text = await res.text();
      const m = text.match(/https:\/\/discord\.gg\/[A-Za-z0-9_-]+/);
      if (m) return m[0];
    }
    return null;
  });
  if (bundleHasInvite) ok(`deploy: invite URL baked into the production bundle (${bundleHasInvite})`);
  else bad("deploy: no discord.gg invite URL found in the production bundle (env var not injected / not redeployed)", "bundle scan");

  // ── 4. Community CTA ──────────────────────────────────────────────────
  await sideNav().getByRole("button", { name: "Community" }).click();
  const communityCta = page.getByRole("link", { name: CTA_NAME });
  await communityCta.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  if (await communityCta.isVisible().catch(() => false)) ok("community: Ledger Discord CTA renders");
  else bad("community: CTA not visible", "expected link " + CTA_NAME);

  const assertCta = async (cta, where) => {
    const href = await cta.getAttribute("href");
    if (!href || href === "undefined" || !href.startsWith("https://discord.gg/")) bad(where, `bad href ${href}`);
    else if (bundleHasInvite && href !== bundleHasInvite) bad(where, `href ${href} != bundle invite ${bundleHasInvite}`);
    else ok(`${where}: href is the configured invite (${href})`);
    const t = await cta.getAttribute("target");
    const r = await cta.getAttribute("rel") || "";
    if (t !== "_blank") bad(where, `target=${t}`);
    else ok(`${where}: target=_blank`);
    if (!r.includes("noopener") || !r.includes("noreferrer")) bad(where, `rel=${r}`);
    else ok(`${where}: rel contains noopener+noreferrer`);
  };
  await assertCta(communityCta, "community");

  // Clicking opens the invite in a new tab.
  const [popup] = await Promise.all([context.waitForEvent("page"), communityCta.click()]);
  const popupUrl = popup.url();
  // Discord 301-redirects discord.gg invites to discord.com/invite/... — either
  // landing URL proves the click opened the invite in a new tab.
  if (popupUrl.startsWith("https://discord.gg/") || popupUrl.startsWith("https://discord.com/invite/"))
    ok(`community: click opens the invite in a new tab (${popupUrl})`);
  else bad("community: popup URL", popupUrl.slice(0, 120));
  await popup.close();

  // ── 5. Account / profile panel CTA ────────────────────────────────────
  // The Community tab stays mounted (hidden) while the panel is open, so scope
  // the CTA to the Profile dialog to avoid strict-mode 2-element matches.
  await page.getByRole("button", { name: "Account" }).click();
  const panelCta = page.getByRole("dialog", { name: "Profile" }).getByRole("link", { name: CTA_NAME });
  await panelCta.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  if (await panelCta.isVisible().catch(() => false)) ok("account: Ledger Discord row renders in the profile panel");
  else bad("account: CTA not visible in profile panel", "expected link " + CTA_NAME);
  await assertCta(panelCta, "account");
  await page.keyboard.press("Escape");

  // ── 6. Stories CTA ─────────────────────────────────────────────────────
  await sideNav().getByRole("button", { name: "Home" }).click();
  await page.getByRole("button", { name: "Share today's Ledger Story" }).click();
  const storiesCta = page.getByRole("dialog", { name: "Ledger Stories" }).getByRole("link", { name: CTA_NAME });
  await storiesCta.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  if (await storiesCta.isVisible().catch(() => false)) ok("stories: Join Ledger Discord CTA renders");
  else bad("stories: CTA not visible", "expected link " + CTA_NAME);
  await assertCta(storiesCta, "stories");
  await page.getByRole("button", { name: "Close Ledger Stories" }).click();

  // ── 7. No undefined/broken Discord URLs; invite reachable ─────────────
  const broken = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a")).filter(a => (a.getAttribute("href") || "") === "undefined").map(a => a.outerHTML.slice(0, 80))
  );
  if (broken.length === 0) ok("urls: no undefined hrefs on the page");
  else bad("urls: undefined hrefs found", broken.join(" | "));

  if (bundleHasInvite) {
    const resp = await page.request.get(bundleHasInvite, { maxRedirects: 3 });
    const status = resp.status();
    if (status >= 200 && status < 400) ok(`invite: ${bundleHasInvite} responds (HTTP ${status})`);
    else bad("invite: HTTP " + status, bundleHasInvite);
  }

  // ── 8. Functionality smoke (behavior is covered by local e2e) ─────────
  await sideNav().getByRole("button", { name: "Community" }).click();
  await page.getByText("YOUR CIRCLE", { exact: true }).waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  if (await page.getByText("YOUR CIRCLE", { exact: true }).isVisible().catch(() => false)) ok("smoke: Community workspace renders");
  else bad("smoke: Community YOUR CIRCLE not visible", "see snapshot");

  if (consoleErrors.length === 0) ok("console: no error-level console messages during verification");
  else bad("console", consoleErrors.slice(0, 3).join(" || "));
} catch (e) {
  bad("script", e.message.split("\n")[0]);
} finally {
  console.log(`\nLive verification for ${LIVE_URL}`);
  console.log(results.join("\n"));
  const failed = results.filter(r => r.startsWith("  FAIL"));
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  await browser.close();
  process.exit(failed.length ? 1 : 0);
}
