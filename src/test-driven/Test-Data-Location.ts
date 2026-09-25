
import { faker } from "@faker-js/faker";

export const LocationData = {

  // Location Code field accepts at most 5 characters.
  LocationCode: faker.string.alphanumeric(5).toUpperCase(),

  LocationAbbr: faker.string.alpha(3).toUpperCase(),

  LocationName: faker.location.city(),

  // Must match a dropdown option exactly (options are upper-case).
  LocationType: "PORT",

  CompanyDetails: "RSR Logistics",

  Country: "INDIA",

  Function: "Warehouse",

  // Backend stores this as an Integer (LocationDto.timeZoneId), not a zone name.
  TimeZoneID: "1",

  TimeZone: "Asia/Kolkata",

  TranshipmentHub: true,

  SRBFlag: true,

  // Colour input only accepts lower-case hex.
  ColourCode: "#1976d2",

  Active: true,

};
