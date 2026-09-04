import { defineConfig, devices } from "@playwright/test";

import chalk from "chalk";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// TEST_ENV picks which .env.<name> file to load (local | uat | beta | production).
// Falls back to plain .env if that file doesn't exist, so the previous behavior
// (a single untracked .env) still works for anyone who hasn't switched over.
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
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

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
        // Auto-open the report when a local run has failures, so you land
        // straight on the failing test instead of hunting for the folder.
        // CI never opens one — there's no display for a browser to open on.
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

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
