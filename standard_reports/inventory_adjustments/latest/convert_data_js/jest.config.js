/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  transform: {
    "^.+\.tsx?$": ["ts-jest", {}],
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/generated-types/**",
    "!src/test/**",
  ],
};
