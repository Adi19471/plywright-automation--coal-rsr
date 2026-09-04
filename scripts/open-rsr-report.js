const { exec } = require("child_process");
const path = require("path");

const reportPath = path.resolve(__dirname, "..", "rsr-report", "index.html");
const cmd =
  process.platform === "win32"
    ? `start "" "${reportPath}"`
    : process.platform === "darwin"
      ? `open "${reportPath}"`
      : `xdg-open "${reportPath}"`;

exec(cmd, (err) => {
  if (err) {
    console.error(`Could not open report automatically. Open it manually: ${reportPath}`);
  }
});
