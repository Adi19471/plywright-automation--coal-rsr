import { Locator, Page, expect } from "@playwright/test";

type subsiteryMasterData = {
  Name: string;
  Code: string;
  Description: string;
  Active: boolean;
};

export class SubsiteryMasterPage {
  readonly page: Page;
  readonly Subsidiary: Locator;
  readonly subsidiaryHeading: Locator;
  readonly TotalCount: Locator;
  readonly newbutton: Locator;
  readonly subsidiarytitle: Locator;

  readonly Name: Locator;
  readonly Code: Locator;
  readonly Description: Locator;
  readonly Active: Locator;

  readonly SaveButton: Locator;
  readonly successToast: Locator;
  readonly searchAllFields: Locator;

  constructor(page: Page) {
    this.page = page;
    this.Subsidiary = page.getByRole("button", {
      name: "Subsidiary",
      exact: true,
    });
    // exact: "Subsidiary" would otherwise also match the drawer's "Add Subsidiary".
    this.subsidiaryHeading = page.getByRole("heading", {
      name: "Subsidiary",
      exact: true,
    });
    this.TotalCount = page.getByRole("heading", { name: "Total Count" });

    this.newbutton = page.getByRole("button", { name: "New" });
    this.subsidiarytitle = page.getByRole("heading", {
      name: "Add Subsidiary",
    });

    this.Name = page.getByRole("textbox", { name: "Name", exact: true });
    this.Code = page.getByRole("textbox", { name: "Code", exact: true });
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

  async SubsiteryMasterDetaile(data: subsiteryMasterData) {
    // The Masters screen ignores clicks until its data has finished loading.
    await this.page.waitForLoadState("networkidle");
    await this.Subsidiary.click();

    await expect(this.subsidiaryHeading).toBeVisible();
    await expect(this.TotalCount).toBeVisible();
    console.log(await this.TotalCount.textContent());

    await this.newbutton.click();

    await expect(this.subsidiarytitle).toBeVisible();

    await this.Name.fill(data.Name);
    await this.Code.fill(data.Code);
    await this.Description.fill(data.Description);
    await this.Active.setChecked(data.Active);

    const [saveResponse] = await Promise.all([
      this.page.waitForResponse((res) =>
        res.url().includes("/adminScreens/saveSubsidiary"),
      ),
      this.SaveButton.click(),
    ]);
    expect(
      saveResponse.ok(),
      `Subsidiary save failed: ${await saveResponse.text()}`,
    ).toBeTruthy();

    await expect(this.successToast).toBeVisible();
    await expect(this.subsidiarytitle).not.toBeVisible();
  }

  async SearchSubsiteryMaster(data: subsiteryMasterData) {
    await this.searchAllFields.fill(data.Code);

    const row = this.page.getByRole("row").filter({
      has: this.page.getByRole("gridcell", { name: data.Code, exact: true }),
    });
    await expect(row).toBeVisible();
    await expect(row).toContainText(data.Name);
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
