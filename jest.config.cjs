/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleDirectories: ['node_modules'],
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
  },
};
