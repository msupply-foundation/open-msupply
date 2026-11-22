// Sync object
/** @type {import('@jest/types').Config.InitialOptions} */

const project = {
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest", { sourceMaps: "inline" }],
  },
  testEnvironment: "./jest-timezone-environment.js",
  transformIgnorePatterns: [
    "/node_modules/(?!uuid|@mui/x-date-pickers|@babel)",
  ],
  roots: ["../standard_reports"],
};

// convert_data runs in the report's timezone, which can be either side of UTC, so every test runs
// once behind it and once ahead of it. A test that passes in only one is assuming a timezone.
module.exports = {
  projects: [
    {
      ...project,
      displayName: "Pacific/Pago_Pago",
      testEnvironmentOptions: { timezone: "Pacific/Pago_Pago" },
    },
    {
      ...project,
      displayName: "Pacific/Auckland",
      testEnvironmentOptions: { timezone: "Pacific/Auckland" },
    },
  ],
};
