import {test} from "../../src/fixures/myfixures"

import "../../src/hooks/commonhooks"


test("Party Page", async({adminPage,partyPage}) =>{

console.log("Party page strat ...................")
 await   adminPage.Adminopen()

await partyPage.verifyParty()
console.log("Party page End ...................")
})