/** @type {import('jest').Config} */
// AGENTS.md §2: overall ≥90%, branch ≥80%, core business logic ≥95%
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/test/**/*.test.js"],
  collectCoverageFrom: [
    "modules/todotxt.js",
    "modules/util.js",
    "modules/exception.js",
    "modules/md5.js",
    "modules/fileUtil.js",
    "modules/todoclient.js"
  ],
  coverageDirectory: "test/coverage",
  coverageReporters: ["text", "text-summary", "html", "lcov"],
  coverageThreshold: {
    // AGENTS.md §2: overall ≥90%, branch ≥80%; core (todotxt, todoclient, fileUtil) ≥95% verified in COMPLIANCE
    global: {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  testPathIgnorePatterns: ["/node_modules/", "test/coverage/", "test/setup.js"],
  setupFiles: ["<rootDir>/test/setup.js"]
};
