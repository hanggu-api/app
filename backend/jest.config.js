/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json", "node"],
  roots: ["<rootDir>/src"],
  transform: {
    "^.+\\.[tj]sx?$": ["ts-jest", { useESM: false }],
  },
  transformIgnorePatterns: ["node_modules/(?!(uuid)/)"],
};
