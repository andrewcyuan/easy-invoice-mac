import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("offline editor, exact PDF export, defaults and draft recovery", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const external: string[] = [];
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("http") && !url.startsWith("http://127.0.0.1:1420")) {
      external.push(url);
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/");
  await expect(page.locator(".pages canvas")).toHaveCount(1);
  await page.getByLabel("Business name", { exact: true }).fill("North Studio");
  await page
    .getByLabel("Address", { exact: true })
    .fill("10 Main Street\nNew York, NY 10001");
  await page.getByLabel("Client name", { exact: true }).fill("Acme");
  await page
    .getByLabel("Client address", { exact: true })
    .fill("20 Market Street\nSan Francisco, CA 94105");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Design consulting");
  await page.getByLabel("Rate", { exact: true }).fill("150");
  await page.getByLabel("Quantity", { exact: true }).fill("2");
  await page.getByLabel("Tax %", { exact: true }).fill("10");
  await page.getByLabel("Discount %", { exact: true }).fill("20");
  await expect(page.locator(".total strong")).toHaveText("$264.00");
  await page
    .getByRole("button", { name: "Save as Default", exact: true })
    .click();
  await page.getByRole("button", { name: "Dismiss", exact: true }).click();
  await page.locator(".editor").evaluate((el) => (el.scrollTop = 0));
  await expect(page.locator(".preview-heading")).toContainText("1 page");
  await page.screenshot({ path: "/tmp/invoice-filled.png" });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("INV-001-Acme.pdf");
  const path = await download.path();
  const data = Array.from(await readFile(path!));
  const extracted = await page.evaluate(async (bytes) => {
    // @ts-expect-error Vite-served module for integration inspection
    const { getDocument, GlobalWorkerOptions } =
      await import("/node_modules/pdfjs-dist/build/pdf.mjs");
    GlobalWorkerOptions.workerSrc =
      "/node_modules/pdfjs-dist/build/pdf.worker.mjs";
    const doc = await getDocument({ data: new Uint8Array(bytes) }).promise;
    const p = await doc.getPage(1);
    const content = await p.getTextContent();
    const metadata = await doc.getMetadata();
    const result = {
      text: content.items.map((x: { str?: string }) => x.str || "").join(" "),
      title: metadata.info.Title,
      view: p.view,
    };
    await doc.destroy();
    return result;
  }, data);
  expect(extracted.text).toContain("North Studio");
  expect(extracted.text).toContain("Design consulting");
  expect(extracted.text).toContain("264");
  expect(extracted.text).not.toMatch(/easyinvoicepdf|created with|made with/i);
  expect(extracted.title).not.toContain("easyinvoicepdf");
  expect(extracted.view).toEqual([0, 0, 612, 792]);
  await page.getByRole("button", { name: "New invoice", exact: true }).click();
  await page
    .getByRole("button", { name: "Create invoice", exact: true })
    .click();
  await expect(page.getByLabel("Invoice number", { exact: true })).toHaveValue(
    "INV-002",
  );
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "North Studio",
  );
  await expect(page.getByLabel("Description", { exact: true })).toHaveValue(
    "Design consulting",
  );
  await page.getByLabel("Rate", { exact: true }).fill("");
  await page.reload();
  await expect(page.getByLabel("Rate", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Invoice number", { exact: true })).toHaveValue(
    "INV-002",
  );
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Net price is required");
  await page.getByLabel("Rate", { exact: true }).fill("150");
  await page.getByLabel("Template", { exact: true }).click();
  await page.getByRole("option", { name: "Stripe", exact: true }).click();
  await page.getByLabel("Page size", { exact: true }).click();
  await page.getByRole("option", { name: "A4", exact: true }).click();
  await expect(page.locator(".preview-heading")).toContainText("A4");
  await page.screenshot({ path: "/tmp/invoice-stripe.png" });
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("system dark mode uses gray surfaces and keyboard-accessible controls", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator(".pages canvas")).toHaveCount(1);
  const colors = await page
    .locator(".editor")
    .evaluate((el) => ({
      panel: getComputedStyle(el).backgroundColor,
      input: getComputedStyle(el.querySelector("input")!).backgroundColor,
    }));
  expect(colors).toEqual({
    panel: "rgb(48, 48, 51)",
    input: "rgb(56, 56, 60)",
  });
  await page.getByLabel("Font Book", { exact: true }).click();
  await expect(page.getByLabel("Search installed fonts")).toBeVisible();
  await page.getByLabel("Search installed fonts").click();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Search installed fonts")).toBeHidden();
  await page.locator(".editor").evaluate((el) => (el.scrollTop = 0));
  await page.screenshot({ path: "/tmp/invoice-dark.png" });
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator(".editor")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await page.screenshot({ path: "/tmp/invoice-light.png" });
});
