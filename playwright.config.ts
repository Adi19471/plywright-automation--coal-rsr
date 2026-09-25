import { defineConfig, devices } from "@playwright/test";

import chalk from "chalk";


import dotenv from "dotenv";
import fs from "fs";
import path from "path";


const envName = process.env.TEST_ENV ?? "local";
const envFile = path.resolve(__dirname, `.env.${envName}`);
dotenv.config({ path: fs.existsSync(envFile) ? envFile : path.resolve(__dirname, ".env") });

console.log(chalk.cyan(`Running against [${envName}] environment  ${process.env.BASE_URL}`));

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. Locally cap at 2 — the shared RSR test
   * server (10.99.99.57) can't serve 6 browsers at once: pages load too slowly
   * for assertions and login returns "Network error". */
  workers: process.env.CI ? 1 : 2,

  /* The RSR screens load their data slowly; 5s default is too tight. */
  expect: { timeout: 15_000 },

  /* Per-test timeout. Raised above the 30s default because slowMo (below) adds
   * ~1s to every action, and the Wagons flow alone runs a dozen+ actions. */
  timeout: 60_000,

  /* Prints the slowest test files to the console/CI log after each run —
   * this is Playwright's built-in "speed report", no extra tooling needed.
   * See https://playwright.dev/docs/api/class-testconfig#test-config-report-slow-tests */
  reportSlowTests: { max: 5, threshold: 30_000 },

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: "playwright-report",

        open: process.env.CI ? "never" : "on-failure",
      },
    ],
    [
      "allure-playwright",
      {
        detail: true,
        suiteTitle: true,
        resultsDir: "allure-results",
        environmentInfo: {
          Base_URL: process.env.BASE_URL,
          Node_Version: process.version,
          Platform: `${process.platform} ${process.arch}`,
          CI: process.env.CI ? "true" : "false",
        },
        categories: [
          {
            name: "Login / session failures",
            messageRegex: ".*(Sign In|Operations Dashboard|[Ll]ogin|[Aa]uthenticat).*",
            matchedStatuses: ["failed", "broken"],
          },
          {
            name: "Timeouts / element not found",
            messageRegex: ".*(Timeout|exceeded|not visible|not found).*",
            matchedStatuses: ["failed", "broken"],
          },
          {
            name: "Test defects",
            matchedStatuses: ["broken"],
          },
          {
            name: "Product defects",
            matchedStatuses: ["failed"],
          },
        ],
      },
    ],
    [
      "./src/reporters/RsrHtmlReporter.ts",
      {
        outputFolder: "rsr-report",
        title: "RSR Test Report",
      },
    ],
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: process.env.BASE_URL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
    screenshot: "on-first-failure",
    video: "on",
    launchOptions: {
      slowMo: 1000,
    },
  },

  /* Configure projects for major browsers */
  projects: [
    /* Runs tests/auth.setup.ts once to log in and save the session to
     * playwright/.auth/user.json, so regular tests below can skip the UI login. */
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },

    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user.json",
      },
      dependencies: ["setup"],
    },

  
  ],

});
