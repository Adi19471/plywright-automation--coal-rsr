import { Locator, Page, expect } from "@playwright/test";

type locationData = {
  LocationCode: string;
  LocationAbbr: string;
  LocationName: string;
  LocationType: string;
  CompanyDetails: string;
  Country: string;
  Function: string;
  TimeZoneID: string;
  TimeZone: string;
  TranshipmentHub: boolean;
  SRBFlag: boolean;
  ColourCode: string;
  Active: boolean;
};

export class LocationPage {
  readonly page: Page;
  readonly Location: Locator;
  readonly locationtitle: Locator;
  readonly newbutton: Locator;

  readonly LocationCode: Locator;
  readonly LocationAbbr: Locator;
  readonly LocationName: Locator;
  readonly LocationType: Locator;
  readonly CompanyDetails: Locator;
  readonly Country: Locator;
  readonly Function: Locator;
  readonly TimeZoneID: Locator;
  readonly TimeZone: Locator;
  readonly TranshipmentHub: Locator;
  readonly SRBFlag: Locator;
  readonly ColourCode: Locator;
  readonly Active: Locator;

  readonly SaveButton: Locator;
  readonly searchAllFields: Locator;
  readonly searchButton: Locator;

  constructor(page: Page) {
    ((this.page = page),
      (this.Location = page.getByText("Locations", { exact: true })));

    this.newbutton = page.getByRole("button", { name: "New" });
    this.locationtitle = page.getByRole("heading", {
      name: "Add New Location",
    });

    this.LocationCode = page.getByRole("textbox", { name: "Location Code" });
    this.LocationAbbr = page.getByRole("textbox", { name: "Location Abbr" });
    this.LocationName = page.getByRole("textbox", { name: "Location Name" });
    this.LocationType = page.getByRole("combobox", { name: "Location Type" });
    this.CompanyDetails = page.getByRole("textbox", {
      name: "Company Details",
    });
    this.Country = page.getByRole("combobox", { name: "Country" });
    this.Function = page.getByRole("textbox", { name: "Function" });
    this.TimeZoneID = page.getByRole("textbox", { name: "Time Zone ID" });
    this.TimeZone = page.getByRole("textbox", {
      name: "Time Zone",
      exact: true,
    });
    this.TranshipmentHub = page.getByRole("checkbox", {
      name: "Transhipment Hub",
    });
    this.SRBFlag = page.getByRole("checkbox", { name: "SRB Flag" });
    this.ColourCode = page.getByRole("textbox", { name: "Colour Code" });
    this.Active = page.getByRole("combobox", { name: "Active" });

    this.SaveButton = page.getByRole("button", { name: "Save" });

    this.searchAllFields = page.getByRole("textbox", {
      name: "Search All Fields",
    });
    this.searchButton = page.getByTestId("SearchIcon");
  }

  // Autocomplete fields (Location Type, Country): type to filter, then pick
  // the exact option, since e.g. "PORT" also matches "INLAND PORT".
  private async selectOption(field: Locator, value: string) {
    await field.fill(value);
    await this.page.getByRole("option", { name: value, exact: true }).click();
    await expect(field).toHaveValue(value);
  }

  async LocationDetaile(data: locationData) {
    // Masters can drop a click that lands while it is still loading, so click
    // until the Location screen (its New button) shows up. Not networkidle:
    // it can hang on the page's Google Translate requests.
    await expect(async () => {
      if (await this.Location.isVisible()) {
        await this.Location.click({ timeout: 5_000 });
      }
      await expect(this.newbutton).toBeVisible({ timeout: 10_000 });
    }).toPass({ timeout: 45_000 });

    await this.newbutton.click();

    await expect(this.locationtitle).toHaveText("Add New Location");

    await this.LocationCode.fill(data.LocationCode);
    await this.LocationAbbr.fill(data.LocationAbbr);
    await this.LocationName.fill(data.LocationName);
    await this.selectOption(this.LocationType, data.LocationType);
    await this.CompanyDetails.fill(data.CompanyDetails);
    await this.selectOption(this.Country, data.Country);
    await this.Function.fill(data.Function);
    await this.TimeZoneID.fill(data.TimeZoneID);
    await this.TimeZone.fill(data.TimeZone);
    await this.TranshipmentHub.setChecked(data.TranshipmentHub);
    await this.SRBFlag.setChecked(data.SRBFlag);
    await this.ColourCode.fill(data.ColourCode);

    await this.Active.click();
    await this.page
      .getByRole("option", { name: data.Active ? "Yes" : "No", exact: true })
      .click();

    const [saveResponse] = await Promise.all([
      this.page.waitForResponse((res) =>
        res.url().includes("/adminScreens/saveLocation"),
      ),
      this.SaveButton.click(),
    ]);
    const saveResult = await saveResponse.json();
    expect(
      saveResult.status,
      `Location save failed: ${saveResult.message}`,
    ).toBe("success");

    await expect(this.locationtitle).not.toBeVisible();
  }

  async SearchLocation(LocationCode: string) {
    await this.searchAllFields.fill(LocationCode);
    await this.searchButton.click();
    await this.page.waitForLoadState("networkidle");

    await expect(
      this.page.getByRole("gridcell", { name: LocationCode, exact: true }),
    ).toBeVisible({ timeout: 10000 });
  }
}
