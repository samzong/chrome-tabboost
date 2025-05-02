module.exports = {
  testEnvironment: "jsdom",
  moduleFileExtensions: ["js", "json"],
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  coverageDirectory: "<rootDir>/coverage",
  collectCoverageFrom: ["src/**/*.js", "!src/**/*.test.js", "!**/node_modules/**"],
  moduleNameMapper: {
    "\\.(css|less|scss)$": "<rootDir>/tests/mocks/styleMock.js",
    "\\.(png|jpg|jpeg|gif|svg)$": "<rootDir>/tests/mocks/fileMock.js",
  },
};
