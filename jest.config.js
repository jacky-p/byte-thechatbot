/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest", {}],
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
};

module.exports = config;
