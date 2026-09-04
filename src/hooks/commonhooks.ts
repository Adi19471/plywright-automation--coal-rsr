import { test } from "../fixures/myfixures";
import chalk from "chalk";

test.beforeEach(async ({ page }) => {

    console.log(chalk.gray("Test Launching...."));

    await page.goto("/RSR");
});




test.afterEach(async ({ page }, testInfo) => {

    if (testInfo.status !== testInfo.expectedStatus) {

        console.log(chalk.red(" Test Failed"));

        await page.screenshot({
            path: `test-results/${testInfo.title}.png`,
            fullPage: true
        });
    }

    console.log(chalk.yellow("Test Completed - Application"));
});