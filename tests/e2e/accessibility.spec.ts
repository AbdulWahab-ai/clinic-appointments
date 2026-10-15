import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** WCAG 2.1 AA automated checks (axe-core). Requires a seeded database. */
const PASSWORD = process.env.SEED_PASSWORD ?? "Demo-Clinic-2026!";

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );
  expect(summary).toEqual([]);
}

for (const path of [
  "/en",
  "/ur",
  "/en/sign-in",
  "/ur/sign-in",
  "/en/c/shifa-family",
  "/ur/c/shifa-family",
]) {
  test(`no WCAG A/AA violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await audit(page);
  });
}

test("no WCAG A/AA violations in the staff app", async ({ page }) => {
  await page.goto("/en/sign-in");
  await page.getByLabel("Email").fill("admin@shifa.test");
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/app\/shifa-family$/);
  await audit(page);
});

test("skip link moves focus to the main content", async ({ page }) => {
  await page.goto("/en");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("sign-in works with the keyboard alone", async ({ page }) => {
  await page.goto("/en/sign-in");
  await page.getByLabel("Email").focus();
  await page.keyboard.type("reception@shifa.test");
  await page.keyboard.press("Tab");
  await page.keyboard.type(PASSWORD);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/app\/shifa-family$/);
});

test("pages don't scroll sideways on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  for (const path of ["/en", "/ur", "/en/sign-in", "/ur/c/shifa-family"]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
