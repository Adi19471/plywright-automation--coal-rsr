import { faker } from "@faker-js/faker";

export const EquipmentData = {

  // Code must be unique; a fixed value (e.g. "2350") fails on the second run.
  Code: faker.string.alphanumeric(6).toUpperCase(),

  Description: `${faker.commerce.productAdjective()} Equipment`,

  Active: true,

};
