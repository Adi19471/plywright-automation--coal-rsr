import { Page, expect, Locator } from "@playwright/test";

type wagonsData = {
  code: string;
  wagontypetext: string;
  active: boolean;
};

export class Wagons {
  readonly page: Page;
  readonly waggonsbutton: Locator;
  readonly Wagon_Type: Locator;
  readonly Addnew: Locator;
  readonly AddNewWagonTypeText: Locator;
  readonly searchAllFields: Locator;
  readonly searchButton: Locator;
  readonly code: Locator;
  readonly wagontypetext: Locator;
  readonly active: Locator;
  readonly wagonsbuttonsave: Locator;
  readonly backbuttonclick :Locator;

  constructor(page: Page) {
    this.page = page;

    this.waggonsbutton = page.getByRole("button", {
      name: "Wagons",
    });

    this.Wagon_Type = page.getByText("WagonType");

    this.Addnew = page.getByRole("button", {
      name: "New",
    });

    this.AddNewWagonTypeText = page.getByRole("heading", {
      name: "Add New Wagon Type",
    });

    this.searchAllFields = page.getByRole("textbox", {
      name: "Search All Fields",
    });

    this.searchButton = page.getByTestId("SearchIcon");

    this.code = page.getByRole("textbox", {
      name: "Code",
    });

    this.wagontypetext = page.getByRole("textbox", {
      name: "Wagon Type",
    });

    this.active = page.getByRole("combobox").last();

    this.wagonsbuttonsave = page.getByRole("button", {
      name: "Save",
    });


    this.backbuttonclick = page.getByRole("button",{name:"Back"})
  }

  async ClickOnWagons() {
    await this.waggonsbutton.click();

    await expect(this.Wagon_Type).toBeVisible();
  }

  async AddnewWagon(data: wagonsData) {
    await this.Addnew.click();

    await expect(this.AddNewWagonTypeText).toBeVisible();

    await this.code.fill(data.code);

    await this.wagontypetext.fill(data.wagontypetext);

    if (data.active) {
      await this.active.click();

      await this.page
        .getByRole("option", {
          name: "Yes",
          exact: true,
        })
        .click();
    }

    // The app shows a "created successfully" toast and closes the dialog
    // even when the save actually failed server-side (e.g. a duplicate
    // description), so the save response itself has to be checked rather
    // than trusting the dialog closing.
    const [saveResponse] = await Promise.all([
      this.page.waitForResponse((res) => res.url().includes("/adminScreens/saveWagon")),
      this.wagonsbuttonsave.first().click(),
    ]);
    const saveResult = await saveResponse.json();
    expect(saveResult.status, `Wagon save failed: ${saveResult.message}`).not.toBe("error");

    await this.page.waitForLoadState("networkidle");
    await expect(this.AddNewWagonTypeText).not.toBeVisible();
  }

  async SearchFieldsData(newCode: string) {
    await this.searchAllFields.fill(newCode);

    await this.searchButton.click();

    // Wait for search results to load
    await this.page.waitForLoadState("networkidle");

   const wagonCode = this.page.getByRole("gridcell", {
    name: newCode,
    exact: true,
  });
     await expect(wagonCode).toBeVisible({ timeout: 10000 });
  }


  async BacktoBack(){
    await this.page.reload()
    await this.backbuttonclick.click()
  }
}
