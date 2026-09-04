import { expect, Locator, Page } from "@playwright/test";

export class SidingPage {
  readonly page: Page;
  readonly button: Locator;
  readonly sidingsHeading: Locator;

  readonly clickoneNewButton: Locator;
  readonly AddSiding: Locator;
  readonly Code: Locator;
  readonly Description: Locator;
  readonly CheckBoxIcon: Locator;
  readonly Savebutton: Locator;
  readonly TotalCount: Locator;
  readonly Backbutton :Locator;
  readonly Masters:Locator


  constructor(page: Page) {
    this.page = page;

    this.button = page.getByRole("button", { name: "Sidings" });

    this.sidingsHeading = page.getByText("Sidings");
    this.clickoneNewButton = page.getByRole("button", {
      name: "New",
      exact: true,
    });
    this.AddSiding = page.getByText("Add Siding");

    this.Code = page.getByLabel("Code");

    this.Description = page.getByLabel("Description");
    this.CheckBoxIcon = page.getByRole("checkbox", { name: "Active" });
    this.Savebutton = page.getByRole("button", { name: "Save" });
    this.TotalCount = page.getByRole("heading", { name: "Total Count" });
    this.Backbutton = page.getByRole("button", {name:"Back"})
    this.Masters = page.getByText("Masters")
  }

  async ClickOnSidings(Code: string, Description: string, Active: boolean) {
    await this.button.click();

    await expect(this.sidingsHeading).toBeVisible();

    await this.clickoneNewButton.click();
    await this.page.waitForTimeout(1000);
    await expect(this.AddSiding).toBeVisible();

    await this.Code.fill(Code);
    await this.Description.fill(Description);
    await this.CheckBoxIcon.setChecked(Active);

    await this.Savebutton.click();

    await this.page.waitForTimeout(2000);
    await expect(this.sidingsHeading).toBeVisible();

    await expect(this.TotalCount).toBeVisible();

    console.log("Total Count:", await this.TotalCount.textContent());

    await this.Backbutton.click() 

    await expect(this.Masters).toBeVisible()

  }
}
