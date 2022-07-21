// Sync object
/** @type {import('@jest/types').Config.InitialOptions} */

const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig');

module.exports = {
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', { sourceMaps: 'inline' }],
  },
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
  moduleNameMapper: {
    kbar: '<rootDir>/__mocks__/kbar.ts',
    ...pathsToModuleNameMapper(compilerOptions.paths, {
      prefix: '<rootDir>/',
    }),
    '.+\\.(gif)$': 'jest-transform-stub',
    '@awesome-cordova-plugins/printer': '<rootDir>/__mocks__/printer.ts',
  },
  transformIgnorePatterns: ['/node_modules/(?!uuid)'],
};
