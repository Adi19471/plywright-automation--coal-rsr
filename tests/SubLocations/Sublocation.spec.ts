import { test } from "../../src/fixures/myfixures";

import "../../src/hooks/commonhooks";

import { SublocationData } from "../../src/test-driven/Test-Data-Sublocation";

test("Sub Location Detailes", async ({ sublocationPage, adminPage }) => {

  console.log("................Sub Location is Started..............");
  await adminPage.Adminopen();
  await sublocationPage.SublocationDetaile(SublocationData);
  await sublocationPage.SearchSublocation(SublocationData);
  console.log("..........Sub Location is Ended..............");
});
