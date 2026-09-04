import { expect, Locator, Page } from "@playwright/test";

export class AdminPage {
  readonly page: Page;
//   readonly mastersTitleHeading: Locator;

  constructor(page: Page) {
    this.page = page;

    // this.mastersTitleHeading = page.getByText("Masters");
  }

  async Adminopen() {
    await this.page.goto("/RSR/MainAdmin/Screens");

    console.log("Application URL:", this.page.url());

//   await expect(
//     this.page.getByText("Masters", { exact: true })
//   ).toBeVisible();
  }


}