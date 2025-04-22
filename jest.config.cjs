/** @type {import('jest').Config} */
const config = {
  verbose: true, // Display individual test results with the test suite hierarchy.
  testEnvironment: 'jsdom', // Default environment for backend tests
  testMatch: [ // Where to find test files
    '**/test/**/*.test.js',
    // Add other patterns if needed, e.g., for component tests:
    // '**/__tests__/**/*.test.js'
  ],
  // Add any necessary setup files, module mappings, etc. here later
  // For example, to handle different environments (Node/JSDOM) or setup emulators
  // setupFilesAfterEnv: ['<rootDir>/test/setupTests.js'],
};

module.exports = config; 