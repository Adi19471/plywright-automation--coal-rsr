import { Locator, Page, expect } from "@playwright/test";

type usersData = {
  UserName: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Active: boolean;
};

export class UsersPage {
  readonly page: Page;
  readonly Users: Locator;
  readonly usersHeading: Locator;
  readonly TotalCount: Locator;
  readonly searchAllFields: Locator;

  constructor(page: Page) {
    this.page = page;
    this.Users = page.getByRole("button", { name: "Users", exact: true });
    this.usersHeading = page.getByRole("heading", {
      name: "Users",
      exact: true,
    });
    this.TotalCount = page.getByRole("heading", { name: "Total Count" });

    this.searchAllFields = page.getByRole("textbox", {
      name: "Search All Fields",
    });
  }

  async UsersDetaile() {
    // The Masters screen ignores clicks until its data has finished loading.
    await this.page.waitForLoadState("networkidle");

    // Total Count shows 0 until the list request returns, so wait for it.
    const [listResponse] = await Promise.all([
      this.page.waitForResponse((res) =>
        res.url().includes("/adminScreens/getUsers"),
      ),
      this.Users.click(),
    ]);
    const list = await listResponse.json();

    await expect(this.usersHeading).toBeVisible();
    await expect(this.TotalCount).toHaveText(`Total Count: ${list.length}`);
    console.log(await this.TotalCount.textContent());
  }

  // Search filters the grid as you type; no Enter or search button needed.
  async SearchUsers(data: usersData) {
    await this.searchAllFields.fill(data.UserName);

    const row = this.page.getByRole("row").filter({
      has: this.page.getByRole("gridcell", {
        name: data.UserName,
        exact: true,
      }),
    });
    await expect(row).toBeVisible();
    for (const value of [data.FirstName, data.LastName, data.Email]) {
      await expect(
        row.getByRole("gridcell", { name: value, exact: true }),
      ).toBeVisible();
    }
    await expect(
      row.getByRole("gridcell", {
        name: data.Active ? "Yes" : "No",
        exact: true,
      }),
    ).toBeVisible();
    console.log("After search", await this.TotalCount.textContent());
  }
}
