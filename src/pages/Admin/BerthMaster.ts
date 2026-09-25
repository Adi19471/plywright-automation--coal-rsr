import { Locator, Page, expect } from "@playwright/test";

type berthData = {
  BerthNumber: string;
  MeasurementType: string;
  Draft: number;
  Description: string;
  Active: boolean;
};

export class BerthMasterPage {
  readonly page: Page;
  readonly Berth: Locator;
  readonly berthHeading: Locator;
  readonly TotalCount: Locator;
  readonly newbutton: Locator;
  readonly berthtitle: Locator;

  readonly BerthNumber: Locator;
  readonly MeasurementType: Locator;
  readonly Draft: Locator;
  readonly Description: Locator;
  readonly Active: Locator;

  readonly SaveButton: Locator;
  readonly successToast: Locator;
  readonly searchAllFields: Locator;

  constructor(page: Page) {
    this.page = page;
    this.Berth = page.getByRole("button", { name: "Berth", exact: true });
    // exact: "Berth" would otherwise also match the drawer's "Add Berth".
    this.berthHeading = page.getByRole("heading", {
      name: "Berth",
      exact: true,
    });
    this.TotalCount = page.getByRole("heading", { name: "Total Count" });

    this.newbutton = page.getByRole("button", { name: "New" });
    this.berthtitle = page.getByRole("heading", { name: "Add Berth" });

    this.BerthNumber = page.getByRole("textbox", {
      name: "Berth Number",
      exact: true,
    });
    this.MeasurementType = page.getByRole("combobox", {
      name: "Measurement Type",
      exact: true,
    });
    this.Draft = page.getByRole("spinbutton", { name: "Draft", exact: true });
    this.Description = page.getByRole("textbox", {
      name: "Description",
      exact: true,
    });
    this.Active = page.getByRole("checkbox", { name: "Active" });

    this.SaveButton = page.getByRole("button", { name: "Save" });
    this.successToast = page.getByText("Berth added successfully");

    this.searchAllFields = page.getByRole("textbox", {
      name: "Search All Fields",
    });
  }

  // Measurement Type is an autocomplete: type to filter, then pick the exact option.
  private async selectOption(field: Locator, value: string) {
    await field.fill(value);
    await this.page.getByRole("option", { name: value, exact: true }).click();
    await expect(field).toHaveValue(value);
  }

  async BerthDetaile(data: berthData) {
    // The Masters screen ignores clicks until its data has finished loading.
    await this.page.waitForLoadState("networkidle");
    await this.Berth.click();

    await expect(this.berthHeading).toBeVisible();
    await expect(this.TotalCount).toBeVisible();
    console.log(await this.TotalCount.textContent());

    await this.newbutton.click();

    await expect(this.berthtitle).toBeVisible();

    await this.BerthNumber.fill(data.BerthNumber);
    await this.selectOption(this.MeasurementType, data.MeasurementType);
    await this.Draft.fill(String(data.Draft));
    await this.Description.fill(data.Description);
    await this.Active.setChecked(data.Active);

    const [saveResponse] = await Promise.all([
      this.page.waitForResponse((res) =>
        res.url().includes("/adminScreens/saveBerth"),
      ),
      this.SaveButton.click(),
    ]);
    expect(
      saveResponse.ok(),
      `Berth save failed: ${await saveResponse.text()}`,
    ).toBeTruthy();

    await expect(this.successToast).toBeVisible();
    await expect(this.berthtitle).not.toBeVisible();
  }

  async SearchBerth(data: berthData) {
    await this.searchAllFields.fill(data.BerthNumber);

    const row = this.page.getByRole("row").filter({
      has: this.page.getByRole("gridcell", {
        name: data.BerthNumber,
        exact: true,
      }),
    });
    await expect(row).toBeVisible();
    await expect(row).toContainText(data.MeasurementType);
    await expect(
      row.getByRole("gridcell", { name: String(data.Draft), exact: true }),
    ).toBeVisible();
    await expect(row).toContainText(data.Description);
    // exact: "Inactive" also contains "Active".
    await expect(
      row.getByRole("gridcell", {
        name: data.Active ? "Active" : "Inactive",
        exact: true,
      }),
    ).toBeVisible();
  }
}
