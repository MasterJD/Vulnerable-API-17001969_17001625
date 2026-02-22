/**
 * Jest Configuration
 * ==================
 * Central configuration for Jest test runner.
 * Enforces global code coverage thresholds to ensure quality.
 *
 * @see https://jestjs.io/docs/configuration
 */

module.exports = {
  // ---------------------------------------------------------------------------
  // Test Discovery
  // ---------------------------------------------------------------------------

  // Pattern used to detect test files
  testMatch: ['**/__tests__/**/*.test.js'],

  // Use Node.js as the test environment (not jsdom/browser)
  testEnvironment: 'node',

  // ---------------------------------------------------------------------------
  // Code Coverage Configuration
  // ---------------------------------------------------------------------------

  // Automatically collect coverage information when tests are run
  collectCoverage: true,

  // Directory where Jest should output its coverage reports
  coverageDirectory: 'coverage',

  // Reporter formats:
  //   - text         → human-readable summary in terminal
  //   - lcov         → HTML report (open coverage/lcov-report/index.html)
  //   - json-summary → machine-readable coverage-summary.json for CI tools
  coverageReporters: ['text', 'lcov', 'json-summary'],

  // Which source files to include in coverage analysis.
  // Excludes tests, mocks, configs, static assets, and non-source directories.
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!__tests__/**',
    '!__mocks__/**',
    '!jest.config.js',
    '!bin/**',
    '!public/**',
    '!attacks/**',
    '!scanner/**',
    '!scripts/**',
  ],

  // ---------------------------------------------------------------------------
  // Coverage Thresholds (GOVERNANCE GATE)
  // ---------------------------------------------------------------------------
  // If any metric drops below the threshold, `jest --coverage` exits with
  // a non-zero code, causing the CI build to fail.
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
