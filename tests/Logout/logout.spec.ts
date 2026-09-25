import { test } from "../../src/fixures/myfixures";

import "../../src/hooks/commonhooks";

import { loginDetailesTestdata_driven } from "../../src/test-driven/Test-Data-Login";

// Start logged OUT so the Sign In button is on screen.
test.use({ storageState: { cookies: [], origins: [] } });

test("Logout", async ({ authenticationPage, logoutPage }) => {
  console.log("................Logout is Started..............");

  await authenticationPage.username.fill(loginDetailesTestdata_driven.username);
  await authenticationPage.password.fill(loginDetailesTestdata_driven.password);

  await logoutPage.clickSignIn();
  // await logoutPage.clickLogout();

  console.log("..........Logout is Ended..............");
});
