import { test } from "../../src/fixures/myfixures";

import "../../src/hooks/commonhooks";

import { BerthData } from "../../src/test-driven/Test-Data-Berth";

test("Berth Detailes", async ({ berthMasterPage, adminPage }) => {

  console.log("................Berth is Started..............");
  await adminPage.Adminopen();
  await berthMasterPage.BerthDetaile(BerthData);
  await berthMasterPage.SearchBerth(BerthData);
  console.log("..........Berth is Ended..............");
});
