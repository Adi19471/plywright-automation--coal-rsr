import { faker } from "@faker-js/faker";

export const SublocationData = {

  // Code must be unique; a fixed value (e.g. "1420") fails on the second run.
  Code: faker.string.alphanumeric(6).toUpperCase(),

  Description: `${faker.location.street()} Yard`,

  // Must match a Location dropdown option exactly.
  Location: "Kemmerhaven Terminal",

  Active: true,

};
