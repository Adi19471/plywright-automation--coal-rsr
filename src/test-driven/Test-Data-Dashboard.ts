// One entry per Dashboard tile: its label, the /menu/dashboard/getCount field
// that holds its number, and the screen the tile opens.
export const DashboardTiles = [
  {
    Name: "Contracts",
    CountKey: "contractDetails",
    Url: /\/Contracts\/createContracts/,
    Heading: "Contract Manager",
  },
  {
    Name: "Parties",
    CountKey: "party",
    Url: /\/Rail\/partydasboard/,
    Heading: "Parties",
  },
  {
    // Currently opens the Parties screen, same as the Parties tile.
    Name: "Rails",
    CountKey: "rakeOperations",
    Url: /\/Rail\/partydasboard/,
    Heading: "Parties",
  },
  {
    Name: "Ships",
    CountKey: "portOperations",
    Url: /\/ShipNew\/overview_Ship_page/,
    Heading: "Ship Operations",
  },
];
