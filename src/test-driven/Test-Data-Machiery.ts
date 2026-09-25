import { faker } from "@faker-js/faker";

export const MachieryData = {

  // Code must be unique and at most 5 characters; longer codes are rejected
  // with "Something went wrong".
  Code: faker.string.alphanumeric(5).toUpperCase(),

  // Must match a dropdown option exactly: ON HIRE, TERMINAL OWNED.
  Group: "TERMINAL OWNED",

  Description: `${faker.commerce.productAdjective()} Machinery`,

  Active: true,

};
