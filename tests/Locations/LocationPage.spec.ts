import { test } from "../../src/fixures/myfixures";

import "../../src/hooks/commonhooks";

import { LocationData } from "../../src/test-driven/Test-Data-Location";

test("Location Detailes", async ({ locationPage, adminPage }) => {

  console.log("................Location is Started..............")
  await adminPage.Adminopen();
  await locationPage.LocationDetaile(LocationData);
  await locationPage.SearchLocation(LocationData.LocationCode);
    console.log("..........Location is ended apcpaltion ..............")
});
