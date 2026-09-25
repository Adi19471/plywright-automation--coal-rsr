import { Locator, Page, expect } from "@playwright/test";

type equipmentData = {
  Code: string;
  Description: string;
  Active: boolean;
};

export class EquipmentPage {
  readonly page: Page;
  readonly Equipment: Locator;
  readonly equipmentHeading: Locator;
  readonly TotalCount: Locator;
  readonly newbutton: Locator;
  readonly equipmenttitle: Locator;

  readonly Code: Locator;
  readonly Description: Locator;
  readonly Active: Locator;

  readonly SaveButton: Locator;
  readonly successToast: Locator;
  readonly searchAllFields: Locator;

  constructor(page: Page) {
    this.page = page;
    this.Equipment = page.getByRole("button", {
      name: "Equipment",
      exact: true,
    });
    // exact: "Equipment Type" would otherwise also match the drawer's
    // "Add Equipment Type".
    this.equipmentHeading = page.getByRole("heading", {
      name: "Equipment Type",
      exact: true,
    });
    this.TotalCount = page.getByRole("heading", { name: "Total Count" });

    this.newbutton = page.getByRole("button", { name: "New" });
    this.equipmenttitle = page.getByRole("heading", {
      name: "Add Equipment Type",
    });

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

  async EquipmentDetaile(data: equipmentData) {
    // The Masters screen ignores clicks until its data has finished loading.
    await this.page.waitForLoadState("networkidle");
    // Total Count shows 0 until the list request returns, so wait for it.
    const [listResponse] = await Promise.all([
      this.page.waitForResponse((res) =>
        res.url().includes("/adminScreens/getET"),
      ),
      this.Equipment.click(),
    ]);
    const list = await listResponse.json();

    await expect(this.equipmentHeading).toBeVisible();
    await expect(this.TotalCount).toHaveText(`Total Count: ${list.length}`);
    console.log(await this.TotalCount.textContent());

    await this.newbutton.click();

    await expect(this.equipmenttitle).toBeVisible();

    await this.Code.fill(data.Code);
    await this.Description.fill(data.Description);
    await this.Active.setChecked(data.Active);

    const [saveResponse] = await Promise.all([
      this.page.waitForResponse((res) =>
        res.url().includes("/adminScreens/saveET"),
      ),
      this.SaveButton.click(),
    ]);
    expect(
      saveResponse.ok(),
      `Equipment save failed: ${await saveResponse.text()}`,
    ).toBeTruthy();

    await expect(this.successToast).toBeVisible();
    await expect(this.equipmenttitle).not.toBeVisible();
  }

  async SearchEquipment(data: equipmentData) {
    await this.searchAllFields.fill(data.Code);

    const row = this.page.getByRole("row").filter({
      has: this.page.getByRole("gridcell", { name: data.Code, exact: true }),
    });
    await expect(row).toBeVisible();
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
