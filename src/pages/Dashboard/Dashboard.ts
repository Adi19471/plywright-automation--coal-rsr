import { Locator, Page, expect } from "@playwright/test";

type dashboardTile = {
  Name: string;
  CountKey: string;
  Url: RegExp;
  Heading: string;
};

export class DashboardPage {
  readonly page: Page;
  readonly DashboardLink: Locator;
  readonly dashboardHeading: Locator;
  readonly OverviewDistribution: Locator;
  readonly CategoryBreakdown: Locator;

  constructor(page: Page) {
    this.page = page;
    this.DashboardLink = page.getByRole("link", {
      name: "Dashboard",
      exact: true,
    });
    this.dashboardHeading = page.getByRole("heading", {
      name: "Operations Dashboard",
    });
    this.OverviewDistribution = page.getByRole("heading", {
      name: "Overview Distribution",
    });
    this.CategoryBreakdown = page.getByRole("heading", {
      name: "Category Breakdown",
    });
  }

  tile(name: string): Locator {
    return this.page.getByRole("link", {
      name: `Open Total ${name}`,
      exact: true,
    });
  }

  // Opens the Dashboard and returns the counts the tiles are built from.
  async DashboardDetaile(): Promise<Record<string, number>> {
    const [countResponse] = await Promise.all([
      this.page.waitForResponse((res) =>
        res.url().includes("/menu/dashboard/getCount"),
      ),
      this.page.goto("/RSR/dashboard/default"),
    ]);
    const counts = await countResponse.json();
    console.log("Dashboard counts:", JSON.stringify(counts));

    await expect(this.dashboardHeading).toBeVisible();
    await expect(this.OverviewDistribution).toBeVisible();
    await expect(this.CategoryBreakdown).toBeVisible();
    return counts;
  }

  async verifyTileCount(tile: dashboardTile, counts: Record<string, number>) {
    await expect(this.tile(tile.Name)).toBeVisible();
    await expect(this.tile(tile.Name).getByRole("heading")).toHaveText(
      String(counts[tile.CountKey]),
    );
  }

  async openTileAndReturn(tile: dashboardTile) {
    await this.tile(tile.Name).click();
    await expect(this.page).toHaveURL(tile.Url);
    await expect(
      this.page.getByRole("heading", { name: tile.Heading, exact: true }),
    ).toBeVisible();

    await this.DashboardLink.click();
    await expect(this.dashboardHeading).toBeVisible();
  }
}
