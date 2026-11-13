const { test, expect } = require("@playwright/test")
const AxeBuilder = require("@axe-core/playwright").default

test("archive demo changes cohorts, handles missing samples and saves a shortlist", async ({
  page,
}) => {
  await page.goto("/projects/residue-lens-demo/")
  const cohort = page.getByLabel("Growing method")
  await expect(cohort).toBeEnabled()
  await expect(
    page.getByRole("region", { name: "Comparison results" }),
  ).toContainText("100%")
  await cohort.selectOption("organic")
  await expect(
    page.getByRole("region", { name: "Comparison results" }),
  ).toContainText("No samples in this cohort")
  await page.getByRole("button", { name: "Save to shortlist" }).first().click()
  await expect(
    page.getByRole("complementary", { name: "Demo shortlist" }),
  ).toContainText("Grapes")
  await page.getByRole("button", { name: "Above MRL", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "Above MRL", exact: true }),
  ).toBeVisible()
  for (const checkbox of await page.getByRole("checkbox").all())
    await checkbox.uncheck()
  await expect(
    page.getByText("Choose a food above to see its monitoring results."),
  ).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})

test("archive demo preserves the original artwork, colours and selectable evidence", async ({
  page,
}) => {
  await page.goto("/projects/residue-lens-demo/")
  const grapes = page.getByRole("button", { name: /^Grapes/ })
  await expect(grapes).toBeEnabled()
  await expect(grapes.locator(".residue-demo__track > span")).toHaveCSS(
    "background-color",
    "rgb(195, 79, 69)",
  )
  const broccoli = page.getByRole("button", {
    name: /^Broccoli/,
  })
  await expect(broccoli.locator(".residue-demo__track > span")).toHaveCSS(
    "background-color",
    "rgb(214, 154, 39)",
  )
  await expect(
    page
      .getByRole("button", { name: /^Garlic/ })
      .locator(".residue-demo__track > span"),
  ).toHaveCSS("background-color", "rgb(36, 134, 95)")
  await page.getByRole("checkbox", { name: "Grapes", exact: true }).uncheck()
  await expect(broccoli.locator(".residue-demo__track > span")).toHaveCSS(
    "background-color",
    "rgb(214, 154, 39)",
  )
  await broccoli.focus()
  await page.keyboard.press("Enter")
  await expect(
    page.getByRole("region", { name: "Selected food evidence" }),
  ).toContainText("Broccoli: the evidence")
  await page
    .getByRole("button", { name: "Median residue count", exact: true })
    .click()
  await expect(
    page.getByRole("heading", { name: "Typical residue count per sample" }),
  ).toBeVisible()
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    const images = page.locator(".residue-demo img:visible")
    for (const image of await images.all()) {
      await expect(image).toHaveJSProperty("complete", true)
      expect(await image.evaluate(img => img.naturalWidth)).toBeGreaterThan(0)
      await expect(image).toHaveCSS("margin-top", "0px")
    }
    if (width !== 320) {
      const audit = await new AxeBuilder({ page })
        .include(".residue-demo")
        .analyze()
      expect(audit.violations).toEqual([])
    }
  }
})
