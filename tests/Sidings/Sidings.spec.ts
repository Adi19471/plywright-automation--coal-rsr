import {test} from "../../src/fixures/myfixures"

import { sidingsData } from "../../src/test-driven/Test-Data-Sidings";
import "../../src/hooks/commonhooks";


test("SidingPage", async({adminPage, sidingPage}) =>{
console.log("=================SidingPage  is started=================")

    await adminPage.Adminopen();

   await  sidingPage.ClickOnSidings(sidingsData.Code,sidingsData.Description,sidingsData.Active)
console.log("=================SidingPage  is Close=================")

})