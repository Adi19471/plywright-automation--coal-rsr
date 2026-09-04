import { expect, Locator, Page } from "@playwright/test";

type UserLogin = {
  username: string;
  password: string;
};

export class AuthenticationPage {
  readonly page: Page;

  readonly welcomebacktitle: Locator;

  readonly username: Locator;
  readonly password: Locator;
  readonly SignInbuttonclick: Locator;

  readonly operationDashoboard: Locator;

  constructor(page: Page) {
    this.page = page;

    this.welcomebacktitle = page.getByRole("heading", {
      name: "Port Logistics & Services",
    });

    this.username = page.getByRole("textbox", { name: "User Name" });
    this.password = page.getByRole("textbox", { name: "Password" });
    this.SignInbuttonclick = page.getByRole("button", { name: "Sign In" });
    this.operationDashoboard = page.getByText("Operations Dashboard");
  }

  async goto() {
    await this.page.goto("/RSR");
  }

  async verifyLoginPage() {
    await expect(this.welcomebacktitle).toBeVisible();
  }

  async verifyLoginDetailes(data: UserLogin) {
    await this.username.fill(data.username);
    await this.password.fill(data.password);
    await this.SignInbuttonclick.click();
  }

  async verifyDashboardVisible() {
    await this.page.waitForTimeout(5000)
    await expect(this.operationDashoboard).toBeVisible();
  }
}
