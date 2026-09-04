



import {test} from "../../src/fixures/myfixures"

import "../../src/hooks/commonhooks"


import { testdataTanker } from "../../src/test-driven/Test-Data-Tankers";

test("Tankser Types", async({adminPage, tankerPage}) =>{
console.log("=================Tanker types is started=================")
  await adminPage.Adminopen();
    await tankerPage.clickTankerType(testdataTanker.tanker,testdataTanker.Active)

    console.log("=================Tanker types is closing =================")
})