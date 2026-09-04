import { Page, Locator, expect } from "@playwright/test";

export class TankerPage {
  readonly page: Page;
  readonly tankerButtonClick: Locator;
  readonly TankerTypes: Locator;
  readonly backtoback: Locator;
  readonly tankertitle: Locator;
  readonly TotalCount: Locator;
  readonly newbutton: Locator;
  readonly AddNewTankerType: Locator;

  readonly TankerTypeinput: Locator;
  readonly Active: Locator;
  readonly buttonsave: Locator;

  constructor(page: Page) {
    this.page = page;

    this.tankerButtonClick = page.getByRole("button", {
      name: "Tanker Type",
    });

    this.TankerTypes = page.getByText("Tanker Types");

    this.backtoback = page.getByRole("button", { name: "Back" });
    this.tankertitle = page.getByLabel("Tanker Types");
    this.TotalCount = page.getByRole("heading", { name: "Total Count" });
    this.newbutton = page.getByRole("button", { name: "New" });
    this.AddNewTankerType = page.getByText("Add New Tanker Type");
this.TankerTypeinput = page.getByRole("textbox", {
  name: "Tanker Type",
  exact: true,
});
    this.Active = page.getByRole("checkbox", { name: "Active" });
    this.buttonsave = page.getByRole("button", { name: "Save" });
  }

  async clickTankerType(tanker: string, Active: boolean) {
    await this.page.waitForTimeout(3000);
    await this.tankerButtonClick.click();

    await this.page.waitForTimeout(3000);
    await expect(this.TotalCount).toBeVisible();
    console.log("total count", await this.TotalCount.textContent());
    await expect(this.TankerTypes).toBeVisible();
    await this.newbutton.click();

    await expect(this.AddNewTankerType).toBeVisible();

    await this.TankerTypeinput.fill(tanker);
    await this.Active.setChecked(Active);

    await this.buttonsave.click();

    await this.page.waitForTimeout(3000);


    await this.page.reload()

    await this.backtoback.click()

    await this.page.waitForTimeout(3000)
  }
}
