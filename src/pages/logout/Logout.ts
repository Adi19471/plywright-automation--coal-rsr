import { Locator, Page, expect } from "@playwright/test";

export class LogoutPage {
  readonly page: Page;
  readonly SignInButton: Locator;
  readonly LogoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.SignInButton = page.getByRole("button", { name: "Sign In" });
    this.LogoutButton = page.getByRole("button", { name: "Logout" });
  }

  async clickSignIn() {
    await this.SignInButton.click();
  }

  async clickLogout() {
    await this.LogoutButton.click();
    await expect(this.SignInButton).toBeVisible();
  }
}
