import { Locator, Page, expect } from "@playwright/test";

export class LocationPage {
  readonly page: Page;
  readonly Location: Locator;
  readonly locationtitle: Locator;
  readonly newbutton: Locator;


  constructor(page: Page) {
    ((this.page = page),
      (this.Location = page
        .getByRole("button", { name: "Locations" })
        .first()));

    this.newbutton = page.getByRole("button", {name: "New" });
    this.locationtitle = page.getByRole('heading',{name:"Add New Location"});
  }

  async LocationDetaile() {
    await this.Location.click();

    await this.newbutton.click();

    await expect(this.locationtitle).toHaveText("Add New Location");
  }
}
