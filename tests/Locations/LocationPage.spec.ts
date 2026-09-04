import { test } from "../../src/fixures/myfixures";

import "../../src/hooks/commonhooks";

test("Location Detailes", async ({ locationPage, adminPage }) => {
  await adminPage.Adminopen();
  await locationPage.LocationDetaile();
});
