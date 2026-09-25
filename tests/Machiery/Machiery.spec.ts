import { test } from "../../src/fixures/myfixures";

import "../../src/hooks/commonhooks";

import { MachieryData } from "../../src/test-driven/Test-Data-Machiery";

test("Machinery Detailes", async ({ machineryPage, adminPage }) => {

  console.log("................Machinery is Started..............");
  await adminPage.Adminopen();
  await machineryPage.MachineryDetaile(MachieryData);
  await machineryPage.SearchMachinery(MachieryData);
  console.log("..........Machinery is Ended..............");
});
