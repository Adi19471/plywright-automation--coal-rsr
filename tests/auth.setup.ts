import { test as setup } from "../src/fixures/myfixures";
import { loginDetailesTestdata_driven } from "../src/test-driven/Test-Data-Login";
import fs from "fs";

const authFile = "playwright/.auth/user.json";
// The app keeps its auth token in sessionStorage, which storageState() cannot
// capture (it only persists cookies + localStorage). Save it separately so it
// can be re-injected into fresh contexts — see src/fixures/myfixures.ts.
const sessionStorageFile = "playwright/.auth/session-storage.json";

// Finds a JWT anywhere in the saved sessionStorage dump and checks its `exp`
// claim, so re-running tests doesn't force a fresh UI login every time —
// only once the previous session has actually expired.
function hasValidSavedSession(): boolean {
  if (!fs.existsSync(authFile) || !fs.existsSync(sessionStorageFile)) return false;

  try {
    const dump: Record<string, string> = JSON.parse(fs.readFileSync(sessionStorageFile, "utf-8"));

    for (const value of Object.values(dump)) {
      const jwtMatch = value.match(/[\w-]+\.[\w-]+\.[\w-]+/);
      if (!jwtMatch) continue;

      const payload = JSON.parse(Buffer.from(jwtMatch[0].split(".")[1], "base64url").toString("utf-8"));
      if (typeof payload.exp !== "number") continue;

      // Require at least 5 minutes of remaining validity so a run doesn't
      // start with a session that expires mid-test.
      return payload.exp * 1000 > Date.now() + 5 * 60 * 1000;
    }
  } catch {
    return false;
  }

  return false;
}

setup("authenticate", async ({ page, authenticationPage }) => {
  if (hasValidSavedSession()) {
    console.log("Existing session is still valid — skipping login.");
    return;
  }

  await page.goto("/RSR");
  await authenticationPage.verifyLoginDetailes(loginDetailesTestdata_driven);
  await authenticationPage.verifyDashboardVisible();

  const sessionStorageDump = await page.evaluate(() => JSON.stringify(sessionStorage));
  fs.writeFileSync(sessionStorageFile, sessionStorageDump);

  await page.context().storageState({ path: authFile });
});
