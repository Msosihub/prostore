// Compile validation only: fixture fonts, no live credentials or prerendering.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
for (const file of [
  ".env",
  ".env.local",
  ".env.production",
  ".env.production.local",
]) {
  if (fs.existsSync(path.join(root, file)))
    throw new Error(
      "Offline validation refuses repository environment files; use a clean checkout",
    );
}
const font = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
if (!fs.existsSync(font))
  throw new Error(
    "This validation fixture requires the local DejaVuSans.ttf font",
  );
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "prostore-compile-"));
try {
  const mockFile = path.join(temp, "fonts.cjs");
  fs.writeFileSync(
    mockFile,
    "module.exports = " +
      JSON.stringify({
        "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap": `/* latin */\n@font-face { font-family: Inter; font-style: normal; font-weight: 100 900; src: url(${font}) format("truetype"); }`,
      }),
  );
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "build",
      "--experimental-build-mode",
      "compile",
    ],
    {
      cwd: root,
      stdio: "inherit",
      env: {
        PATH: process.env.PATH,
        HOME: temp,
        NODE_ENV: "production",
        NEXT_TELEMETRY_DISABLED: "1",
        NEXT_FONT_GOOGLE_MOCKED_RESPONSES: mockFile,
        DATABASE_URL:
          "postgresql://invalid:invalid@127.0.0.1:1/build_validation_only",
        NEXT_PUBLIC_SERVER_URL: "https://example.test",
      },
    },
  );
  process.exitCode = result.status ?? 1;
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
