import { faker } from "@faker-js/faker";

export const BerthData = {

  // Random so each run creates a new berth; "Berth25" already exists.
  BerthNumber: `Berth${faker.string.numeric(5)}`,

  // Must match a dropdown option exactly: Meters, Feets, Kilograms, Litres,
  // For no.of items(Stores).
  MeasurementType: "Kilograms",

  Draft: faker.number.float({ min: 1, max: 20, fractionDigits: 1 }),

  Description: `${faker.location.street()} berth`,

  Active: true,

};
