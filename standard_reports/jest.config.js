// Sync object
/** @type {import('@jest/types').Config.InitialOptions} */

module.exports = {
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest", { sourceMaps: "inline" }],
  },
  testEnvironment: "jsdom",
  globalSetup: "./jest-global-setup.js",
  transformIgnorePatterns: [
    "/node_modules/(?!uuid|@mui/x-date-pickers|@babel)",
  ],
  roots: ["../standard_reports"],
};
