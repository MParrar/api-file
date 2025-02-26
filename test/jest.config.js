module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/test/**/*.test.js',
    '**/test/**/*.spec.js',
  ],
  collectCoverage: true,
  coverageReporters: ['text', 'lcov'],
  testPathIgnorePatterns: ['\\\\node_modules\\\\'],
};
