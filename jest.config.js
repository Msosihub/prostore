const nextJest = require("next/jest");
module.exports = nextJest({ dir: "./" })({
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^server-only$": "<rootDir>/tests/server-only.js",
  },
  clearMocks: true,
});
