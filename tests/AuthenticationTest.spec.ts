import { test } from "../src/fixures/myfixures";
import { loginDetailesTestdata_driven } from "../src/test-driven/Test-Data-Login";
import chalk from "chalk";

import "../src/hooks/commonhooks";

// This spec verifies the login flow itself, so it must start logged OUT —
// override the project's default storageState (see auth.setup.ts) for this file only.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("RSR RAIL-SHIP-TRUCK", () => {
  test("Verify authentication page", { tag: "@smoke" }, async ({ authenticationPage }) => {
    console.log(
      chalk.green`(============appclaiton is Starting here============)`,
    );

    // await authenticationPage.goto();
    await authenticationPage.verifyLoginPage();

    await authenticationPage.verifyLoginDetailes(loginDetailesTestdata_driven);

    console.log(
      chalk.red`(============appclaiton is ending  here============)`,
    );

    await authenticationPage.verifyDashboardVisible();
  });
});
