import { test } from "../../src/fixures/myfixures";

import "../../src/hooks/commonhooks";

import { SubsiteryMasterData } from "../../src/test-driven/Test-Data-SubsiteryMaster";

test("Subsidiary Detailes", async ({ subsiteryMasterPage, adminPage }) => {

  console.log("................Subsidiary is Started..............");
  await adminPage.Adminopen();
  await subsiteryMasterPage.SubsiteryMasterDetaile(SubsiteryMasterData);
  await subsiteryMasterPage.SearchSubsiteryMaster(SubsiteryMasterData);
  console.log("..........Subsidiary is Ended..............");
});
