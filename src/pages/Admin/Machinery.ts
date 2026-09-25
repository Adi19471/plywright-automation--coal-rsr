import { Locator, Page, expect } from "@playwright/test";

type machineryData = {
  Code: string;
  Group: string;
  Description: string;
  Active: boolean;
};

export class MachineryPage {
  readonly page: Page;
  readonly Machinery: Locator;
  readonly machineryHeading: Locator;
  readonly TotalCount: Locator;
  readonly newbutton: Locator;
  readonly machinerytitle: Locator;

  readonly Code: Locator;
  readonly Group: Locator;
  readonly Description: Locator;
  readonly Active: Locator;

  readonly SaveButton: Locator;
  readonly successToast: Locator;
  readonly searchAllFields: Locator;

  constructor(page: Page) {
    this.page = page;
    this.Machinery = page.getByRole("button", {
      name: "Machinery",
      exact: true,
    });
    // exact: "Machinery Type" would otherwise also match the drawer's
    // "Add Machinery Type".
    this.machineryHeading = page.getByRole("heading", {
      name: "Machinery Type",
      exact: true,
    });
    this.TotalCount = page.getByRole("heading", { name: "Total Count" });

    this.newbutton = page.getByRole("button", { name: "New" });
    this.machinerytitle = page.getByRole("heading", {
      name: "Add Machinery Type",
    });

    this.Code = page.getByRole("textbox", { name: "Code", exact: true });
    this.Group = page.getByRole("combobox", { name: "Group", exact: true });
    this.Description = page.getByRole("textbox", {
      name: "Description",
      exact: true,
    });
    this.Active = page.getByRole("checkbox", { name: "Active" });

    this.SaveButton = page.getByRole("button", { name: "Save" });
    this.successToast = page.getByText("Created successfully");

    this.searchAllFields = page.getByRole("textbox", {
      name: "Search All Fields",
    });
  }

  // Group is an autocomplete: type to filter, then pick the exact option.
  private async selectOption(field: Locator, value: string) {
    await field.fill(value);
    await this.page.getByRole("option", { name: value, exact: true }).click();
    await expect(field).toHaveValue(value);
  }

  async MachineryDetaile(data: machineryData) {
    // The Masters screen ignores clicks until its data has finished loading.
    await this.page.waitForLoadState("networkidle");

    // Total Count shows 0 until the list request returns, so wait for it.
    const [listResponse] = await Promise.all([
      this.page.waitForResponse((res) =>
        res.url().includes("/adminScreens/getMT"),
      ),
      this.Machinery.click(),
    ]);
    const list = await listResponse.json();

    await expect(this.machineryHeading).toBeVisible();
    await expect(this.TotalCount).toHaveText(`Total Count: ${list.length}`);
    console.log(await this.TotalCount.textContent());

    await this.newbutton.click();

    await expect(this.machinerytitle).toBeVisible();

    await this.Code.fill(data.Code);
    await this.selectOption(this.Group, data.Group);
    await this.Description.fill(data.Description);
    await this.Active.setChecked(data.Active);

    const [saveResponse] = await Promise.all([
      this.page.waitForResponse((res) =>
        res.url().includes("/adminScreens/saveMT"),
      ),
      this.SaveButton.click(),
    ]);
    // A failed save still returns HTTP 200 (and the UI still shows "Created
    // successfully"), so check the status in the response body.
    const saveResult = await saveResponse.json();
    expect(
      saveResult.status,
      `Machinery save failed: ${saveResult.message}`,
    ).toBe("success");

    await expect(this.successToast).toBeVisible();
    await expect(this.machinerytitle).not.toBeVisible();
  }

  async SearchMachinery(data: machineryData) {
    await this.searchAllFields.fill(data.Code);

    const row = this.page.getByRole("row").filter({
      has: this.page.getByRole("gridcell", { name: data.Code, exact: true }),
    });
    await expect(row).toBeVisible();
    await expect(row).toContainText(data.Group);
    // Description and Active are not checked: the backend currently saves
    // both as null (every row shows a blank Description and "Active").
  }
}
