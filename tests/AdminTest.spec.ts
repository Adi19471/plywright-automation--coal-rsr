import { test } from "../src/fixures/myfixures";
import chalk from "chalk";

import "../src/hooks/commonhooks";

test.describe("Authentication Admin page", () => {
  test("Admin page Opening", { tag: "@smoke" }, async ({ adminPage }) => {
    console.log(chalk.blue(`Start Admin page opening.......`));

    await adminPage.Adminopen();

    console.log(chalk.blue(`complted Admin page  .......`));
  });
});
