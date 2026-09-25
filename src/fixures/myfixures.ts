import { AdminPage } from "../pages/Admin/Admin";
import { AuthenticationPage } from "../pages/Admin/Authentication";

import { Wagons } from "../pages/Admin/Wagons";

import { SidingPage } from "../pages/Admin/Sidings";

import { test as base, expect } from "@playwright/test";
import { TankerPage } from "../pages/Admin/Tanker";
import {LocationPage} from "../pages/Admin/Location"

import { PartyPage } from "../pages/Admin/Party";

import { SublocationPage } from "../pages/Admin/Sublocation";

import { SubsiteryMasterPage } from "../pages/Admin/SubsiteryMaster";

import { BerthMasterPage } from "../pages/Admin/BerthMaster";

import { EquipmentPage } from "../pages/Admin/Equipment";

import { MachineryPage } from "../pages/Admin/Machinery";

import { UsersPage } from "../pages/Admin/Users";

import { DashboardPage } from "../pages/Dashboard/Dashboard";

import { LogoutPage } from "../pages/logout/Logout";

import fs from "fs";

type MyFixtures = {
  authenticationPage: AuthenticationPage;
  adminPage: AdminPage;
  wagons: Wagons;
  sidingPage:SidingPage;
  tankerPage:TankerPage;
  locationPage:LocationPage;
  partyPage:PartyPage;
  sublocationPage:SublocationPage;
  subsiteryMasterPage:SubsiteryMasterPage;
  berthMasterPage:BerthMasterPage;
  equipmentPage:EquipmentPage;
  machineryPage:MachineryPage;
  usersPage:UsersPage;
  dashboardPage:DashboardPage;
  logoutPage:LogoutPage;
};

// The app stores its auth token in sessionStorage, which storageState()
// cannot capture (only cookies + localStorage are persisted). auth.setup.ts
// dumps sessionStorage to this file separately; re-inject it into every
// fresh context before any page script runs, so the saved session actually
// works instead of landing back on the login screen.
const sessionStorageFile = "playwright/.auth/session-storage.json";

export const test = base.extend<MyFixtures>({
  context: async ({ context, storageState }, use) => {
  
    
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

  partyPage:async({page},use) =>{
const partyPage = await use(new PartyPage(page))
  },

  sublocationPage:async({page},use) =>{
    await use(new SublocationPage(page))
  },

  subsiteryMasterPage:async({page},use) =>{
    await use(new SubsiteryMasterPage(page))
  },

  berthMasterPage:async({page},use) =>{
    await use(new BerthMasterPage(page))
  },

  equipmentPage:async({page},use) =>{
    await use(new EquipmentPage(page))
  },

  machineryPage:async({page},use) =>{
    await use(new MachineryPage(page))
  },

  usersPage:async({page},use) =>{
    await use(new UsersPage(page))
  },

  dashboardPage:async({page},use) =>{
    await use(new DashboardPage(page))
  },

  logoutPage:async({page},use) =>{
    await use(new LogoutPage(page))
  }
});

export { expect };



