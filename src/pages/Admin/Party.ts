import { Page, Locator, expect } from "@playwright/test";

export class PartyPage {
  readonly page: Page;
  readonly Party: Locator;
  readonly Total_Count: Locator;
  readonly Back_button: Locator;

  constructor(page: Page) {
    this.page = page;

    this.Party = page.getByRole("button", { name: "Party" });

    this.Total_Count = page.getByRole("heading", { name: "Total Count" });
    this.Back_button = page.getByRole("button", { name: "Back" });
  }

  async verifyParty() {
    await this.Party.click();
    await this.page.waitForLoadState("networkidle");
    await expect(this.Total_Count).toBeVisible();

    console.log("Total Count:", await this.Total_Count.textContent());

    await this.Back_button.click();

    await expect(this.Party).toBeVisible({ timeout: 1000 });
  }
}
