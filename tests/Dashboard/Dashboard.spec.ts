import { test } from "../../src/fixures/myfixures";

import "../../src/hooks/commonhooks";

import { DashboardTiles } from "../../src/test-driven/Test-Data-Dashboard";

test("Dashboard Detailes", async ({ dashboardPage }) => {

  console.log("................Dashboard is Started..............");
  const counts = await dashboardPage.DashboardDetaile();

  for (const tile of DashboardTiles) {
    await test.step(`Total ${tile.Name} tile`, async () => {
      await dashboardPage.verifyTileCount(tile, counts);
      await dashboardPage.openTileAndReturn(tile);
    });
  }
  console.log("..........Dashboard is Ended..............");
});
