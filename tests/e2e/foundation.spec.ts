import { expect, test, type Page } from "@playwright/test";

/** Requires a seeded database (`pnpm db:seed`). */
const PASSWORD = process.env.SEED_PASSWORD ?? "Demo-Clinic-2026!";

async function signIn(page: Page, email: string, next?: string) {
  await page.goto(`/en/sign-in${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("health endpoint reports database and redis ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect((await res.json()).status).toBe("ok");
});

test("root redirects to a locale", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("Urdu pages render right-to-left", async ({ page }) => {
  await page.goto("/ur");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ur");
});

test("public clinic page lists branches and doctors", async ({ page }) => {
  await page.goto("/en/c/shifa-family");
  await expect(page.getByRole("heading", { name: "Shifa Family Clinic" })).toBeVisible();
  await expect(page.getByText("Gulberg, Lahore")).toBeVisible();
  await expect(page.getByText("Dr. Ayesha Khan")).toBeVisible();
});

for (const [email, role] of [
  ["admin@shifa.test", "Clinic admin"],
  ["reception@shifa.test", "Reception"],
  ["dr.ayesha@shifa.test", "Doctor"],
] as const) {
  test(`${role} signs in and lands in the staff app`, async ({ page }) => {
    await signIn(page, email);
    await expect(page).toHaveURL(/\/en\/app\/shifa-family$/);
    await expect(page.getByRole("heading", { name: /Today at Shifa Family Clinic/ })).toBeVisible();
    await expect(page.getByRole("main").getByText(role)).toBeVisible();
  });
}

test("staff can switch language and sign out (desktop and phone)", async ({ page }) => {
  await signIn(page, "reception@shifa.test");
  await expect(page).toHaveURL(/\/en\/app\/shifa-family$/);
  await page.getByRole("link", { name: "اردو" }).click();
  await expect(page).toHaveURL(/\/ur\/app\/shifa-family$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByRole("button", { name: "سائن آؤٹ" }).click();
  await expect(page).toHaveURL(/\/ur\/sign-in/);
  const res = await page.goto("/en/app/shifa-family");
  expect(res?.url()).toMatch(/\/en\/sign-in\?next=/);
});

test("a branch-restricted receptionist sees their role", async ({ page }) => {
  await signIn(page, "reception.khi@shifa.test");
  await expect(page.getByRole("main").getByText("Reception")).toBeVisible();
});

test("open redirects in next= are ignored", async ({ page }) => {
  await signIn(page, "admin@shifa.test", "/\\evil.example");
  await expect(page).toHaveURL(/localhost:\d+\/en\/app/);
});

test("staff of one clinic get a 404 for another clinic's app", async ({ page }) => {
  await signIn(page, "admin@alnoor.test");
  await expect(page).toHaveURL(/\/en\/app\/al-noor$/);
  const res = await page.goto("/en/app/shifa-family");
  expect(res?.status()).toBe(404);
});

test("signed-out visitors are sent to sign-in from the staff app", async ({ page }) => {
  await page.goto("/en/app/shifa-family");
  await expect(page).toHaveURL(/\/en\/sign-in\?next=/);
});

test("wrong password shows a specific error", async ({ page }) => {
  await page.goto("/en/sign-in");
  await page.getByLabel("Email").fill("admin@shifa.test");
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "don't match" })).toBeVisible();
});

test("phone sign-in sends an OTP to the dev outbox", async ({ page }) => {
  await page.goto("/en/sign-in");
  await page.getByRole("tab", { name: "Phone" }).click();
  await page.getByLabel("Mobile number").fill("0300 0099999");
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByText(/We sent a code to \+92 300/)).toBeVisible();

  const outbox = await page.context().newPage();
  await outbox.goto("/en/dev/outbox");
  const body = await outbox.locator("li").first().innerText();
  const code = body.match(/\b(\d{6})\b/)?.[1];
  expect(code).toBeTruthy();

  await page.getByLabel("6-digit code").fill(code!);
  await page.getByRole("button", { name: "Verify and sign in" }).click();
  // The seeded patient has no staff membership, so they land in the patient portal.
  await expect(page).toHaveURL(/\/en\/portal$/);
});
