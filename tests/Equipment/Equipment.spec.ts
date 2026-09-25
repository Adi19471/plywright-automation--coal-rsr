import { test } from "../../src/fixures/myfixures";

import "../../src/hooks/commonhooks";

import { EquipmentData } from "../../src/test-driven/Test-Data-Equipment";

test("Equipment Detailes", async ({ equipmentPage, adminPage }) => {

  console.log("................Equipment is Started..............");
  await adminPage.Adminopen();
  await equipmentPage.EquipmentDetaile(EquipmentData);
  await equipmentPage.SearchEquipment(EquipmentData);
  console.log("..........Equipment is Ended..............");
});
