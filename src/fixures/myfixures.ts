import { AdminPage } from "../pages/Admin/Admin";
import { AuthenticationPage } from "../pages/Admin/Authentication";

import { Wagons } from "../pages/Admin/Wagons";

import { SidingPage } from "../pages/Admin/Sidings";

import { test as base, expect } from "@playwright/test";
import { TankerPage } from "../pages/Admin/Tanker";
import {LocationPage} from "../pages/Admin/Location"

import fs from "fs";

type MyFixtures = {
  authenticationPage: AuthenticationPage;
  adminPage: AdminPage;
  wagons: Wagons;
  sidingPage:SidingPage;
  tankerPage:TankerPage;
  locationPage:LocationPage;
};

// The app stores its auth token in sessionStorage, which storageState()
// cannot capture (only cookies + localStorage are persisted). auth.setup.ts
// dumps sessionStorage to this file separately; re-inject it into every
// fresh context before any page script runs, so the saved session actually
// works instead of landing back on the login screen.
const sessionStorageFile = "playwright/.auth/session-storage.json";

export const test = base.extend<MyFixtures>({
  context: async ({ context, storageState }, use) => {
    // Only restore the saved session for tests that explicitly point at the
    // auth file (the "chromium" project's default `storageState` string).
    // Skip it for the "setup" project (storageState is unset — a stale token
    // pre-seeded before a fresh login makes the app skip straight to the
    // dashboard and never render the login form) and for tests that opt into
    // starting logged out via an inline object override, e.g.
    // AuthenticationTest.spec.ts's `storageState: { cookies: [], origins: [] }`.
    const usesSavedAuthFile = typeof storageState === "string";

    if (usesSavedAuthFile && fs.existsSync(sessionStorageFile)) {
      const sessionStorageDump = fs.readFileSync(sessionStorageFile, "utf-8");
      await context.addInitScript((dump) => {
        const entries = JSON.parse(dump) as Record<string, string>;
        for (const [key, value] of Object.entries(entries)) {
          window.sessionStorage.setItem(key, value);
        }
      }, sessionStorageDump);
    }
    await use(context);
  },

  authenticationPage: async ({ page }, use) => {
    const authenticationPage = await use(new AuthenticationPage(page));
  },

  adminPage: async ({ page }, use) => {
    const adminPage = await use(new AdminPage(page));
  },

  wagons: async ({ page }, use) => {
    const wagons = await use(new Wagons(page));
  },

  sidingPage:async({page},use) =>{
    const sidingPage = await use(new SidingPage(page))
  },

  tankerPage:async({page},use) =>{
    const tankerPage= await use(new TankerPage(page))
  },

  locationPage:async({page},use) =>{
const locationPage = await use(new LocationPage(page))
  },
});

export { expect };



