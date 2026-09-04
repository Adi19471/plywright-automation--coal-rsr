import { test } from "../../src/fixures/myfixures";
import chalk from "chalk";

import "../../src/hooks/commonhooks";

import { wagonData } from "../../src/test-driven/Test-Data-Wagonsdata";

test("Wagons appcaltion Test", { tag: "@regression" }, async ({
  adminPage,
  wagons,
}) => {
  console.log(chalk.blue(`wagons  page opening.......`));
    await adminPage.Adminopen();
  await wagons.ClickOnWagons();
  await wagons.AddnewWagon(wagonData);
  await wagons.SearchFieldsData(wagonData.code);
  await wagons.BacktoBack()
  console.log(chalk.blue(`wagons complted  .......`));
});
