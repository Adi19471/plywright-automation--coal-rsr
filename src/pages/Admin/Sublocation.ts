import { Locator, Page, expect } from "@playwright/test";

type sublocationData = {
  Code: string;
  Description: string;
  Location: string;
  Active: boolean;
};

export class SublocationPage {
  readonly page: Page;
  readonly Sublocation: Locator;
  readonly sublocationHeading: Locator;
  readonly TotalCount: Locator;
  readonly newbutton: Locator;
  readonly sublocationtitle: Locator;

  readonly Code: Locator;
  readonly Description: Locator;
  readonly Location: Locator;
  readonly Active: Locator;

  readonly SaveButton: Locator;
  readonly successToast: Locator;
  readonly searchAllFields: Locator;

  constructor(page: Page) {
    this.page = page;
    this.Sublocation = page.getByRole("button", {
      name: "Sub location",
      exact: true,
    });
    this.sublocationHeading = page.getByRole("heading", {
      name: "Sub-Locations",
    });
    this.TotalCount = page.getByRole("heading", { name: "Total Count" });

    this.newbutton = page.getByRole("button", { name: "New" });
    this.sublocationtitle = page.getByRole("heading", {
      name: "Add New Sub-Location",
    });

    this.Code = page.getByRole("textbox", { name: "Code", exact: true });
    this.Description = page.getByRole("textbox", {
      name: "Description",
      exact: true,
    });
    this.Location = page.getByRole("combobox", {
      name: "Location",
      exact: true,
    });
    this.Active = page.getByRole("checkbox", { name: "Active" });

    this.SaveButton = page.getByRole("button", { name: "Save" });
    this.successToast = page.getByText("Sub-location added successfully");

    this.searchAllFields = page.getByRole("textbox", {
      name: "Search All Fields",
    });
  }

  // Location is an autocomplete with ~1100 options: type to filter, then pick
  // the exact option.
  private async selectOption(field: Locator, value: string) {
    await field.fill(value);
    await this.page.getByRole("option", { name: value, exact: true }).click();
    await expect(field).toHaveValue(value);
  }

  async SublocationDetaile(data: sublocationData) {
    // The Masters screen ignores clicks until its data has finished loading.
    await this.page.waitForLoadState("networkidle");
    await this.Sublocation.click();

    await expect(this.sublocationHeading).toBeVisible();
    await expect(this.TotalCount).toBeVisible();
    console.log(await this.TotalCount.textContent());

    await this.newbutton.click();

    await expect(this.sublocationtitle).toBeVisible();

    await this.Code.fill(data.Code);
    await this.Description.fill(data.Description);
    await this.selectOption(this.Location, data.Location);
    await this.Active.setChecked(data.Active);

    const [saveResponse] = await Promise.all([
      this.page.waitForResponse((res) =>
        res.url().includes("/adminScreens/saveSubLocation"),
      ),
      this.SaveButton.click(),
    ]);
    expect(
      saveResponse.ok(),
      `Sub-location save failed: ${await saveResponse.text()}`,
    ).toBeTruthy();

    await expect(this.successToast).toBeVisible();
    await expect(this.sublocationtitle).not.toBeVisible();
  }

  async SearchSublocation(data: sublocationData) {
    await this.searchAllFields.fill(data.Code);

    const row = this.page.getByRole("row").filter({
      has: this.page.getByRole("gridcell", { name: data.Code, exact: true }),
    });
    await expect(row).toBeVisible();
    await expect(row).toContainText(data.Description);
    await expect(row).toContainText(data.Location);
  }
}
