import { chromium } from "@playwright/test";

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 900, height: 700 } });
await p.goto("http://localhost:5174/", { waitUntil: "domcontentloaded" });
await p.getByRole("button", { name: "Continue as Guest / Demo Mode" }).click();
await p.getByText("Who are you?").waitFor();
await p.getByPlaceholder("e.g. Aditya").fill("Aditya");
await p.getByRole("button", { name: "Continue" }).click();
await p.getByText("What are you targeting?").waitFor();
await p.locator('[aria-label="Target exam"]').click();
await p.getByText("NEET", { exact: true }).last().click();
await p.getByRole("button", { name: "Continue" }).click();
await p.getByText("Lock the date").waitFor();
const info = await p.evaluate(() => ({
  chips: [...document.querySelectorAll("button[aria-pressed]")].map((b2) => b2.textContent.replace(/\s+/g, " ").trim()),
  dateValue: document.querySelector("input[type=date]").value,
}));
console.log(JSON.stringify(info, null, 2));
await b.close();
