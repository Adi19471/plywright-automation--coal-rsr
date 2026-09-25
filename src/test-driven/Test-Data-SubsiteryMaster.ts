import { faker } from "@faker-js/faker";

export const SubsiteryMasterData = {

  Name: `${faker.location.city()} Coal`,

  // Code must be unique; a fixed value (e.g. "MET") fails on the second run.
  Code: faker.string.alphanumeric(6).toUpperCase(),

  Description: `${faker.commerce.department()} Services`,

  Active: true,

};
