const nextJest = require("next/jest");
module.exports = nextJest({ dir: "./" })({
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/integration/**/*.integration.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^server-only$": "<rootDir>/tests/server-only.js",
  },
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  clearMocks: true,
  testTimeout: 30000,
});
