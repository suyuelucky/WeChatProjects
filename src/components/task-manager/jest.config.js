export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleFileExtensions: ['js'],
  testMatch: ['**/__tests__/**/*.test.js'],
  verbose: true,
  collectCoverage: true,
  coverageDirectory: '.coverage',
  coverageReporters: ['text', 'lcov'],
  setupFilesAfterEnv: ['./__tests__/setup.js']
}; 