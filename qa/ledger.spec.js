// End-to-end assertions for Ledger (dev server, Demo Mode).
//
// The fixed color constants below document the CURRENT default appearance:
// DEFAULT_SETTINGS.theme = "verdigris" (THEME_PRESETS.verdigris.focus
// #6CCBC0). If the default theme ever changes, update them here — the test
// is meant to pin the palette the app actually ships with.
const ACCENT_HEX = "#6CCBC0";            // emitted verbatim into the style tag
const ACCENT_RGBA = "rgba(108,203,192,"; // hexToRgba form (no spaces)
const ACCENT_RGB = "rgb(108, 203, 192)"; // what getComputedStyle normalizes to
const HEX = /^#[0-9A-F]{6}$/;

import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

// Enter the workspace via Demo Mode, clearing onboarding when the fresh
// localStorage (no profile) shows it. Demo mode keeps storage local-only,
// so no real Supabase rows are ever touched.
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

// Settings isn't on the dock — it lives in the account popover (avatar
// button → "Settings" menuitem).
async function openSettings(page) {
  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
}

const activeNavColor = (page) =>
  page.locator(".lg-nav-item.active").first().evaluate(el => getComputedStyle(el).color);

const styleTagText = (page) =>
  page.evaluate(() => [...document.querySelectorAll("style")].map(s => s.textContent).join("\n"));

test.beforeEach(async ({ page }) => {
  await enterDemo(page);
});

test("theme system: Ledger accent is emitted in the style tag and rendered on the nav", async ({ page }) => {
  // (a) The applied accent must appear in the emitted CSS — both the raw
  // hex (the .lg-nav-item.active color rule) and the rgba forms (the
  // ::before glow / active background hexToRgba() calls).
  const css = await styleTagText(page);
  expect(css).toContain(ACCENT_HEX);
  expect(css).toContain(ACCENT_RGBA);
  // (b) The rendered output must match: computed color of the active nav
  // item resolves to the same accent as rgb().
  expect(await activeNavColor(page)).toBe(ACCENT_RGB);
});

test("countdown: the D-day numeral renders in the theme's coral token", async ({ page }) => {
  // Demo onboarding sets a target date, so the hero countdown is live. The
  // numeral must carry the theme's dedicated countdown coral — in verdigris
  // that is THEME_PRESETS.verdigris.countdown = #F0645A, independent of the
  // teal accent, so an upcoming exam reads as a deadline, not a theme color.
  const coral = await page.locator("div.num").evaluateAll(els => {
    const el = els.find(e => e.nextElementSibling && e.nextElementSibling.textContent.includes("DAYS LEFT"));
    return el ? getComputedStyle(el).color : null;
  });
  expect(coral).toBe("rgb(240, 100, 90)");
});

test("lg-mini: chapter action buttons render with the ghost system styling", async ({ page }) => {
  await sideNav(page).getByRole("button", { name: "Coverage" }).click();
  const mini = page.locator("button.lg-mini").first();
  await mini.waitFor({ state: "visible" });
  expect(await page.locator("button.lg-mini").count()).toBeGreaterThanOrEqual(1);
  const style = await mini.evaluate(el => {
    const s = getComputedStyle(el);
    return { fontSize: s.fontSize, borderTop: s.borderTopWidth, radius: s.borderRadius, color: s.color };
  });
  expect(parseFloat(style.fontSize)).toBeCloseTo(10.5, 1); // ghost mini-stamp size
  expect(style.borderTop).toBe("1px");                     // hairline border, not UA default
  expect(style.color).not.toBe("rgb(0, 0, 0)");            // not the unstyled browser color
});

test("coverage: knowledge map uses state classes and accent readouts", async ({ page }) => {
  await sideNav(page).getByRole("button", { name: "Coverage" }).click();
  await expect(page.getByText("Coverage / Knowledge map")).toBeVisible();
  await expect(page.locator(".lg-coverage-page .lg-coverage-readout")).toBeVisible();
  await expect(page.locator(".lg-coverage-page .lg-coverage-dot")).toBeVisible();
  await expect(page.locator(".lg-coverage-page .lg-coverage-row").first()).toHaveClass(/state-/);
});

test("wallpaper hooks: extractPalette and clampAccentHex behave in-page", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 256;
    const x = c.getContext("2d");
    x.fillStyle = "#3EC9A7"; x.fillRect(0, 0, 256, 192);
    x.fillStyle = "#FF6B9D"; x.fillRect(0, 192, 256, 64);
    const url = c.toDataURL("image/png");
    const swatches = await window.__ledgerWallpaper.extractPalette(url);
    return {
      swatches,
      teal: window.__ledgerWallpaper.clampAccentHex("#3EC9A7"),
      gray: window.__ledgerWallpaper.clampAccentHex("#888888"),
    };
  });
  expect(result.gray).toBeNull();                 // monochrome is not an accent
  expect(result.teal).toMatch(HEX);               // legible accent survives
  expect(result.swatches.length).toBeGreaterThanOrEqual(1);
  expect(result.swatches.length).toBeLessThanOrEqual(3);
  for (const hex of result.swatches) expect(hex).toMatch(HEX);
});

test("settings flow: wallpaper mode, clock style + 24h, sound toggle all render", async ({ page }) => {
  await openSettings(page);

  // Wallpaper: pick Black — the layer behind everything must flip to it.
  await page.getByRole("button", { name: "Wallpaper", exact: true }).click();
  const blackCard = page.getByRole("button", { name: /^Black/ });
  await blackCard.click();
  await expect(blackCard).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-wallpaper="black"]').last()).toBeAttached();

  // Clock: flip style + 24h — then prove the Home clock actually renders it.
  await page.getByRole("button", { name: "Clock", exact: true }).click();
  await page.getByRole("button", { name: "Flip", exact: true }).click();
  await expect(page.locator(".lg-seg-item.active")).toHaveText("Flip");
  await page.locator(".lg-switch").click(); // 24-hour time
  await expect(page.locator(".lg-switch input")).toBeChecked();
  await sideNav(page).getByRole("button", { name: "Home" }).click();
  await expect(page.locator(".lg-flipcell").first()).toBeVisible();

  // Sound: the coverage pulse toggle flips on.
  await openSettings(page);
  await page.getByRole("button", { name: "Sound", exact: true }).click();
  await page.locator(".lg-switch").click();
  await expect(page.locator(".lg-switch input")).toBeChecked();
});

test("settings: typing into Display name keeps focus — no per-keystroke remount", async ({ page }) => {
  // Regression for the old remount bug: Settings used to define local
  // components (Panel et al.) inside its own body, so every keystroke in the
  // Display name field remounted the subtree and dropped focus mid-typing.
  // A value-only assertion would still pass then (React reconciles the final
  // value regardless), so focus must be asserted after EVERY character.
  await openSettings(page);
  const input = page.getByRole("textbox", { name: "Display name" });
  await input.focus();
  await input.press("Control+a");
  await input.press("Delete");
  const name = "Juno-42";
  for (const ch of name) {
    await page.keyboard.type(ch);
    await expect(input).toBeFocused();
  }
  await expect(input).toHaveValue(name);
});

test("auth: fresh session after demo lands on Onboarding, never the demo dashboard", async ({ page }) => {
  // Simulates the demo → real-account transition. __ledgerAuth drives the
  // same setSession terminal the real Supabase auth listener uses, so the
  // Workspace sees an ordinary session change (userId identity swap re-fires
  // the boot load AND every save effect). Fresh accounts have no profile, so
  // the app must end on Onboarding and must never keep showing the demo
  // user's dashboard during the reload. In the e2e env the simulated user has
  // no real Supabase session, so RLS blocks its writes — the persistence
  // corruption half of the race can only be confirmed live (real OTP).
  await expect(sideNav(page)).toBeVisible();
  await page.evaluate(() => {
    window.__ledgerAuth.signInAs({ id: "11111111-2222-3333-4444-555555555555", email: "fresh@example.com" });
  });
  // The demo dashboard (nav included) must detach promptly: the boot effect
  // resets ready/profile synchronously on the session change, so the reload
  // window renders the loading state — never a stale flash of the previous
  // user's data. (Pre-fix, the dashboard persisted through the whole reload;
  // that failure mode was reproduced during the audit — this test now pins
  // the fixed contract.)
  await page.waitForSelector('nav[aria-label="Primary"]', { state: "detached", timeout: 2_000 });
  await expect(page.getByText("Who are you?")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("QA Tester")).toHaveCount(0);
});

test("audio: one shared context, created by the first real gesture", async ({ page }) => {
  // A real user gesture (pointerdown anywhere) is the app's only unlock
  // trigger. The module-owned ctx and the window.__ledgerAudioCtx handle the
  // timer chime reads must be the SAME object — the single-owner contract.
  await page.evaluate(() => window.dispatchEvent(new PointerEvent("pointerdown")));
  const state = await page.evaluate(() => {
    const s = window.__ledgerSound.state();
    return { ctxState: s.ctxState, winCtx: window.__ledgerAudioCtx ? window.__ledgerAudioCtx.state : null };
  });
  expect(state.ctxState).not.toBe("none");
  expect(state.winCtx).not.toBeNull();
  expect(state.ctxState).toBe(state.winCtx);
});

test("wallpaper upload: custom mode, persisted image, palette pins, accent takeover", async ({ page }) => {
  expect(await activeNavColor(page)).toBe(ACCENT_RGB); // default accent on Home

  await openSettings(page);
  await page.getByRole("button", { name: "Wallpaper", exact: true }).click();
  // Build a real PNG (3:1 teal:coral) inside the browser, hand it to the
  // hidden file input as a genuine upload.
  const base64 = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 256;
    const x = c.getContext("2d");
    x.fillStyle = "#3EC9A7"; x.fillRect(0, 0, 256, 192);
    x.fillStyle = "#FF6B9D"; x.fillRect(0, 192, 256, 64);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.setInputFiles("#ledger-wallpaper-input", {
    name: "wallpaper.png",
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  });

  // Custom mode engaged, image persisted downscaled as JPEG.
  await expect(page.locator('[data-wallpaper="custom"]').last()).toBeAttached();
  const stored = await page.evaluate(() => localStorage.getItem("ledger.wallpaper.img") || "");
  expect(stored.startsWith("data:image/jpeg")).toBe(true);
  const bg = await page.locator('[data-wallpaper="custom"]').last().evaluate(el => getComputedStyle(el).backgroundImage);
  expect(bg).toContain("data:image/jpeg");

  // The extraction pipeline drove the accent: back on Home, the nav accent
  // must become the clamped extraction of the test image's dominant teal
  // (#37C8A4 — deterministic from the 3:1 teal:coral canvas). The nav color
  // transitions over 160ms, so poll for the exact end value.
  await expect.poll(async () => {
    await sideNav(page).getByRole("button", { name: "Home" }).click();
    return activeNavColor(page);
  }, { timeout: 10_000 }).toBe("rgb(55, 200, 164)");

  // The extracted swatches surfaced in Color palette as pinnable buttons.
  await openSettings(page);
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  const pins = page.getByRole("button", { name: /^Pin accent/ });
  await expect(pins).toHaveCount(2);
  await pins.nth(0).click();
  await expect(pins.nth(0)).toHaveAttribute("aria-pressed", "true");

  // Remove returns to Nebula and clears storage.
  await page.getByRole("button", { name: "Wallpaper", exact: true }).click();
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.locator('[data-wallpaper="nebula"]').last()).toBeAttached();
  const cleared = await page.evaluate(() => localStorage.getItem("ledger.wallpaper.img"));
  expect(cleared).toBeNull();
});

test("sidebar: rail is opaque in all states; wordmark never overlaps nav items", async ({ page }) => {
  const rail = page.locator(".lg-side");
  const wordmark = page.locator(".lg-brand-name");

  // Collapsed state: rail background alpha must be 1 (fully opaque)
  let bg = await rail.evaluate(el => getComputedStyle(el).backgroundColor);
  expect(bg).toMatch(/^rgb\(/); // opaque rgb(), not rgba()
  // Wordmark is hidden in collapsed (opacity 0)
  await expect(wordmark).toHaveCSS("opacity", "0");

  // Pin the rail to expand it — pin button only appears on hover, so hover first
  await rail.hover();
  await page.locator(".lg-pin-btn").click();
  await expect(rail).toHaveClass(/lg-side-pinned/);

  // Expanded state: rail background still opaque
  bg = await rail.evaluate(el => getComputedStyle(el).backgroundColor);
  expect(bg).toMatch(/^rgb\(/);

  // Wordmark visible and positioned inside brand cell — not overlapping nav items
  await expect(wordmark).toHaveCSS("opacity", "1");
  const wordmarkRect = await wordmark.evaluate(el => el.getBoundingClientRect());
  const navItems = page.locator(".lg-nav-item");
  const count = await navItems.count();
  for (let i = 0; i < count; i++) {
    const itemRect = await navItems.nth(i).evaluate(el => el.getBoundingClientRect());
    const overlaps = !(
      wordmarkRect.right <= itemRect.left ||
      wordmarkRect.left >= itemRect.right ||
      wordmarkRect.bottom <= itemRect.top ||
      wordmarkRect.top >= itemRect.bottom
    );
    expect(overlaps, `wordmark overlaps nav item ${i}`).toBe(false);
  }

  // Wordmark vertical center should be within the 44px brand cell (above first nav item)
  const firstNav = await navItems.first().evaluate(el => el.getBoundingClientRect());
  expect(wordmarkRect.bottom).toBeLessThan(firstNav.top + 2); // small tolerance
});

test("sidebar: every nav label is fully contained inside the rail at desktop widths", async ({ page }) => {
  const rail = page.locator(".lg-side");

  // Pin the rail open once; state persists across viewport changes.
  await rail.hover();
  await page.locator(".lg-pin-btn").click();
  await expect(rail).toHaveClass(/lg-side-pinned/);

  const railRect = await rail.evaluate(el => el.getBoundingClientRect());
  const labels = page.locator(".lg-nav-item .dock-label, .lg-account-cell .dock-label");
  const labelCount = await labels.count();
  expect(labelCount).toBeGreaterThanOrEqual(8); // HOME..COMMUNITY + account cell

  for (const [w, h] of [[1680, 900], [1440, 900], [1366, 768]]) {
    await page.setViewportSize({ width: w, height: h });
    await expect(rail).toHaveClass(/lg-side-pinned/);
    const r = await rail.evaluate(el => el.getBoundingClientRect());
    for (let i = 0; i < labelCount; i++) {
      const lr = await labels.nth(i).evaluate(el => el.getBoundingClientRect());
      expect(lr.width, `label ${i} hidden/clipped at ${w}x${h}`).toBeGreaterThan(0);
      expect(lr.right, `label ${i} crosses the rail's right edge at ${w}x${h}`).toBeLessThanOrEqual(r.right + 0.5);
      expect(lr.left, `label ${i} crosses the rail's left edge at ${w}x${h}`).toBeGreaterThanOrEqual(r.left - 0.5);
    }
  }
});

test("sidebar: label text AND empty row space are click targets (full-row nav)", async ({ page }) => {
  const rail = page.locator(".lg-side");
  await rail.hover();
  await page.locator(".lg-pin-btn").click();
  await expect(rail).toHaveClass(/lg-side-pinned/);

  // (a) Click the label TEXT of "Coverage". The label is pointer-events:none,
  // so the click must fall through to the full-width row button underneath.
  const coverageLabel = page.locator(".lg-nav-item .dock-label", { hasText: "Coverage" }).first();
  await expect(coverageLabel).toHaveCSS("opacity", "1");
  const lb = await coverageLabel.boundingBox();
  await page.mouse.click(lb.x + lb.width / 2, lb.y + lb.height / 2);
  await expect(sideNav(page).getByRole("button", { name: "Coverage" })).toHaveAttribute("aria-current", "page");

  // (b) Click EMPTY SPACE inside the "Focus" row — 20px from the row's right
  // edge, far from both icon and label — still navigates.
  const focusRow = sideNav(page).getByRole("button", { name: "Focus" });
  const rb = await focusRow.boundingBox();
  await page.mouse.click(rb.x + rb.width - 20, rb.y + rb.height / 2);
  await expect(focusRow).toHaveAttribute("aria-current", "page");
  await expect(sideNav(page).getByRole("button", { name: "Home" })).not.toHaveAttribute("aria-current", "page");
});

test("countdown: the coral numeral survives a theme switch", async ({ page }) => {
  const numeralColor = () =>
    page.locator("div.num").evaluateAll(els => {
      const el = els.find(e => e.nextElementSibling && e.nextElementSibling.textContent.includes("DAYS LEFT"));
      return el ? getComputedStyle(el).color : null;
    });

  // Verdigris (default): coral #F0645A.
  expect(await numeralColor()).toBe("rgb(240, 100, 90)");

  await openSettings(page);
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.getByRole("button", { name: "Switch to Noir Mono" }).click();
  await expect(page.getByRole("button", { name: "Switch to Noir Mono" })).toHaveAttribute("aria-pressed", "true");
  await sideNav(page).getByRole("button", { name: "Home" }).click();

  // Noir's countdown coral #F26A5E — deliberately NOT the acid-lime accent.
  expect(await numeralColor()).toBe("rgb(242, 106, 94)");
});

test("weekly segments: empty state, seeded sessions render segments/tooltips, trigger fires", async ({ page }) => {
  // Fresh demo: no week strip yet — it only renders once at least one day in
  // the trailing week has focus logged.
  await expect(page.locator(".lg-week-ring-wrap")).not.toBeAttached();
  await expect(page.locator(".lg-week-seg")).toHaveCount(0);

  // Enable ring pulse in Settings
  await openSettings(page);
  await page.getByRole("button", { name: "Sound", exact: true }).click();
  await page.locator(".lg-switch").click();
  await expect(page.locator(".lg-switch input")).toBeChecked();

  // Go to Focus tab and seed sessions there (avoids Dashboard update issue)
  await sideNav(page).getByRole("button", { name: "Focus" }).click();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const dayBefore = new Date(Date.now() - 172800000).toISOString().slice(0, 10);
  await page.evaluate(([t, y, db]) => {
    window.__ledgerSessions.seed([
      { id: "qa-1", date: t, subject: "Physics", minutes: 90, startHour: 9, mode: "manual" },
      { id: "qa-2", date: y, subject: "Chemistry", minutes: 60, startHour: 10, mode: "manual" },
      { id: "qa-3", date: db, subject: "Maths", minutes: 45, startHour: 11, mode: "manual" },
    ]);
  }, [today, yesterday, dayBefore]);

  // Return to Home — Dashboard mounts with sessions already in state
  await sideNav(page).getByRole("button", { name: "Home" }).click();

  // Park the pointer in the content area so the rail collapses and the page
  // settles — the rail now reserves its expanded width, so collapsing it
  // slides content right-to-left (by design). Hovering a segment mid-slide
  // would move the segment out from under the pointer.
  await page.mouse.move(800, 400);
  await page.waitForTimeout(400);

  // The dashboard is ONE continuous page — the segment strip is on the page
  // and Playwright scrolls it into view for the hover below.
  await page.locator(".lg-week-ring-wrap").scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);

  // Strip now shows 3 segments
  await expect(page.locator(".lg-week-seg")).toHaveCount(3);

  // Hover tooltip interaction - hover a segment and verify tooltip shows day's data
  await page.locator(".lg-week-seg").first().hover();
  await expect(page.locator(".lg-tooltip")).toBeVisible();
  const tooltipText = await page.locator(".lg-tooltip").textContent();
  // Tooltip shows day name, date, and minutes
  expect(tooltipText).toMatch(/Fri|Sat|Sun|Mon|Tue|Wed|Thu/); // day name
  expect(tooltipText).toContain("45m"); // day before yesterday: 45m

  // Old coverage ring testid is gone
  await expect(page.locator('[data-testid="dashboard-coverage-ring"]')).not.toBeAttached();

  // Audio ticks counter incremented by 1 (session-logged trigger fired)
  const audioState = await page.evaluate(() => window.__ledgerSound.state());
  expect(audioState.ticks).toBe(1);

  // Shake burst class was applied (poll briefly for the transient class)
  await expect.poll(async () => {
    return await page.locator(".lg-week-ring-wrap").evaluate(el => el.classList.contains("lg-ring-burst"));
  }, { timeout: 2000 }).toBe(true);
});

test("trigger: session logged on Focus tab still fires tick (audio only, no shake when hidden)", async ({ page }) => {
  // Enable ring pulse
  await openSettings(page);
  await page.getByRole("button", { name: "Sound", exact: true }).click();
  await page.locator(".lg-switch").click();
  await expect(page.locator(".lg-switch input")).toBeChecked();

  // Go to Focus tab and seed a session
  await sideNav(page).getByRole("button", { name: "Focus" }).click();
  await page.evaluate(() => {
    const today = new Date().toISOString().slice(0, 10);
    window.__ledgerSessions.seed([
      { id: "qa-focus-1", date: today, subject: "Physics", minutes: 30, startHour: 12, mode: "manual" },
    ]);
  });

  // Audio tick fired (ticks = 1)
  const audioState = await page.evaluate(() => window.__ledgerSound.state());
  expect(audioState.ticks).toBe(1);

  // Return to Home — shake should have fired on mount since ringBurst changed
  await sideNav(page).getByRole("button", { name: "Home" }).click();
  await expect.poll(async () => {
    return await page.locator(".lg-week-ring-wrap").evaluate(el => el.classList.contains("lg-ring-burst"));
  }, { timeout: 2000 }).toBe(true);
});

test("community: circle workspace exposes semantic empty state and code actions (demo mode)", async ({ page }) => {
  await sideNav(page).getByRole("button", { name: "Community" }).click();
  const community = page.getByRole("main", { name: "Community" });
  await expect(community).toBeVisible();
  await expect(community.getByRole("tab", { name: "CIRCLE" })).toHaveAttribute("aria-selected", "true");

  await expect(community.getByRole("region", { name: "Circle workspace" })).toBeVisible();
  await expect(community.getByRole("textbox", { name: "Add Circle code" })).toBeVisible();
  await expect(community.getByRole("button", { name: "Copy your code" })).toBeVisible();
  await expect(community.getByRole("heading", { name: "Keep your study circle intentional." })).toBeVisible();
});

test("community: groups create, join and discover controls remain functional in demo mode", async ({ page }) => {
  await sideNav(page).getByRole("button", { name: "Community" }).click();
  const community = page.getByRole("main", { name: "Community" });
  await community.getByRole("tab", { name: "GROUPS" }).click();
  const groups = community.getByRole("region", { name: "Groups workspace" });
  await expect(groups).toBeVisible();

  await groups.getByRole("textbox", { name: "New group name" }).fill("JEE Grind");
  await expect(groups.getByRole("button", { name: "Create", exact: true })).toBeEnabled();

  await groups.getByRole("textbox", { name: "Group invite code" }).fill("J7K4QP");
  await groups.getByRole("button", { name: "Join" }).click();
  await expect(groups.getByRole("status")).toContainText("No group found with that invite code.");

  await groups.getByRole("button", { name: "DISCOVER", exact: true }).click();
  await groups.getByRole("textbox", { name: "Search public groups" }).fill("Physics");
  await groups.getByRole("button", { name: "Search" }).click();
  await expect(groups.getByRole("heading", { name: "Find the room for your next study block." })).toBeVisible();
});

test("typography: presets and font roles update the live preview", async ({ page }) => {
  await openSettings(page);
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await expect(page.getByText("TYPOGRAPHY PREVIEW")).toBeVisible();
  await page.getByRole("button", { name: "Editorial", exact: true }).click();
  await expect(page.getByRole("button", { name: "Editorial", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Display font" }).click();
  await page.getByRole("option", { name: "Manrope" }).click();
  await expect.poll(async () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--font-display"))).toMatch(/Manrope/);
});

test("profile: account command center shows real identity, metrics and actions; closes on Escape/outside click", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "Account" });
  await trigger.click();
  const panel = page.getByRole("dialog", { name: "Profile" });
  await expect(panel).toBeVisible();
  // Identity + real-data sections
  await expect(panel.getByText("CURRENT STREAK", { exact: true })).toBeVisible();
  await expect(panel.getByText("THIS WEEK", { exact: true })).toBeVisible();
  await expect(panel.getByText("ACCOUNT", { exact: true })).toBeVisible();
  // Actions
  await expect(panel.getByRole("menuitem", { name: "Edit profile" })).toBeVisible();
  await expect(panel.getByRole("menuitem", { name: "Settings" })).toBeVisible();
  await expect(panel.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  // Escape closes and focus returns to the trigger
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(trigger).toBeFocused();
  // Outside click closes
  await trigger.click();
  await expect(panel).toBeVisible();
  await page.mouse.click(700, 300);
  await expect(panel).toHaveCount(0);
});

test("dashboard: section headers render 01..08 sequential in DOM order (04 appears once data exists)", async ({ page }) => {
  // Section headers are identified structurally — a div whose direct children
  // are a 2-digit span.num (the numeral) followed by a span.sys (the label).
  // Deliberately not a component-name selector: it must survive the
  // LedgerRule -> SectionHeader rename and keep catching render-order bugs.
  const seq = () => page.evaluate(() => {
    const out = [];
    document.querySelectorAll("div").forEach(e => {
      const n = e.querySelector(":scope > span.num");
      if (n && /^0[0-9]$/.test((n.textContent || "").trim())) {
        const l = e.querySelector(":scope > span.sys");
        if (l) out.push({ n: Number(n.textContent.trim()), label: l.textContent.trim() });
      }
    });
    return out;
  });

  // Fresh demo profile: no sessions/tasks/mocks yet, so 04 TODAY is
  // intentionally hidden — the remaining headers must still be sequential.
  const empty = await seq();
  expect(empty.length).toBeGreaterThanOrEqual(7);
  for (let i = 1; i < empty.length; i++) {
    expect(empty[i].n).toBeGreaterThan(empty[i - 1].n);
  }
  expect(empty.some(x => x.label === "TODAY")).toBe(false);

  // Seed one session dated today via the existing dev hook, on the Focus
  // tab first (Dashboard doesn't pick up late seeds while mounted).
  await sideNav(page).getByRole("button", { name: "Focus" }).click();
  const today = new Date().toISOString().slice(0, 10);
  await page.evaluate(([t]) => {
    window.__ledgerSessions.seed([
      { id: "qa-order-1", date: t, subject: "Physics", minutes: 60, startHour: 9, mode: "manual" },
    ]);
  }, [today]);
  await sideNav(page).getByRole("button", { name: "Home" }).click();
  await page.waitForTimeout(400);

  // With data, the full book renders 01..08 in DOM order.
  const full = await seq();
  expect(full.map(x => x.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  expect(full.map(x => x.label)).toEqual(["STATUS", "SESSION", "YEAR", "TODAY", "SUBJECTS", "PRACTICE", "WORKSPACES", "SYSTEM"]);
});

test("every route: numbered section headers stay sequential in DOM order", async ({ page }) => {
  // Same structural selector as the dashboard book test — numeral + label
  // siblings — so every route keeps the numbered-book contract.
  const seq = () => page.evaluate(() => {
    const out = [];
    document.querySelectorAll("div").forEach(e => {
      const n = e.querySelector(":scope > span.num");
      if (n && /^0[0-9]$/.test((n.textContent || "").trim())) {
        const l = e.querySelector(":scope > span.sys");
        if (l) out.push({ n: Number(n.textContent.trim()), label: l.textContent.trim() });
      }
    });
    return out;
  });
  const nums = async () => (await seq()).map(x => x.n);
  const labels = async () => (await seq()).map(x => x.label);
  const go = async (name) => {
    await sideNav(page).getByRole("button", { name }).click();
    await page.waitForTimeout(250);
  };

  await go("Coverage");
  expect(await nums()).toEqual([1, 2, 3]);
  expect((await seq()).slice(0, 2).map(x => x.label)).toEqual(["TOTAL COVERAGE", "THE NEXT READ"]);

  await go("Focus");
  expect(await labels()).toEqual(["WORKING ON", "TODAY'S QUEUE", "FOCUS ANALYTICS"]);

  await go("Tests");
  expect(await nums()).toEqual([1, 2, 3, 4]);
  expect(await labels()).toEqual(["PERFORMANCE TRAJECTORY", "SUBJECT-WISE AVERAGE", "LOG A MOCK TEST", "TEST HISTORY"]);

  await go("Mistakes");
  expect(await nums()).toEqual([1, 2, 3]);
  expect(await labels()).toEqual(["LOG A MISTAKE", "MISTAKE PROFILE", "MISTAKE LEDGER"]);

  // Recall on a fresh profile: 05 FORGOTTEN — REGRADE SHELF is hidden until
  // a card is forgotten, so the visible book skips 04 -> 06 but stays
  // strictly sequential.
  await go("Recall");
  expect(await nums()).toEqual([1, 2, 3, 4, 6, 7, 8]);
  expect((await seq())[0].label).toBe("DECK HEALTH");

  // Community: the hero numeral is a plain div (not span.num + span.sys),
  // so the numbered book is exactly the workspace + activity aside.
  await go("Community");
  expect(await nums()).toEqual([1, 2]);
  expect(await labels()).toEqual(["YOUR CIRCLE", "TODAY'S ACTIVITY"]);

  // Settings restarts numbering per category.
  await openSettings(page);
  expect(await labels()).toEqual(["IDENTITY"]);
  await page.getByRole("button", { name: "Study Preferences" }).click();
  await page.waitForTimeout(250);
  expect(await nums()).toEqual([1, 2, 3]);
  expect(await labels()).toEqual(["STUDY PLAN", "SUBJECTS", "FOCUS TIMER"]);
});

test("stories: opens a real 9:16 preview and switches recap/template", async ({ page }) => {
  await page.getByRole("button", { name: "Share today's Ledger Story" }).click();
  await expect(page.getByRole("dialog", { name: "Ledger Stories" })).toBeVisible();
  const story = page.getByRole("dialog").locator("svg").last();
  await expect(story).toHaveAttribute("width", "1080");
  await expect(story).toHaveAttribute("height", "1920");
  await page.getByRole("button", { name: /7 Days/ }).click();
  await page.getByRole("button", { name: "Minimal" }).click();
  await expect(page.getByRole("button", { name: "Minimal" })).toHaveAttribute("aria-pressed", "true");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Share Ledger Story|Download Ledger Story/ }).click();
  const png = await readFile(await (await downloadPromise).path());
  expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(png.readUInt32BE(16)).toBe(1080);
  expect(png.readUInt32BE(20)).toBe(1920);
  await page.getByRole("button", { name: "Close Ledger Stories" }).click();
});
