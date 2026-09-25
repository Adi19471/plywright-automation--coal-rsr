import { test } from "../../src/fixures/myfixures";

import "../../src/hooks/commonhooks";

import { UsersData } from "../../src/test-driven/Test-Data-Users";

test("Users Detailes", async ({ usersPage, adminPage }) => {

  console.log("................Users is Started..............");
  await adminPage.Adminopen();
  await usersPage.UsersDetaile();
  await usersPage.SearchUsers(UsersData);
  console.log("..........Users is Ended..............");
});
