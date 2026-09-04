import { faker } from "@faker-js/faker";

// faker.vehicle.type() only returns from a small fixed set (e.g. "Minivan",
// "Cargo Van"), which collides with descriptions already saved by earlier
// test runs and gets rejected server-side as a duplicate. Append a unique
// suffix so the description is always new.
export const wagonData = {
  code: faker.string.alphanumeric(6).toUpperCase(),
  wagontypetext: `${faker.vehicle.type()} ${faker.string.alphanumeric(4).toUpperCase()}`,
  active: true,
};



console.log("Code:", wagonData.code);
console.log("Wagon Type:", wagonData.wagontypetext);
