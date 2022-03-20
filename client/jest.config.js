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
    // ref: https://react-hooks-testing-library.com/installation#being-specific
    // This mapping will ensure the correct renderHook is used in the test environment
    // as the import within `utils/testing` is for the specific dom version.
    '@testing-library/react-hooks/dom': '@testing-library/react-hooks',
    ...pathsToModuleNameMapper(compilerOptions.paths, {
      prefix: '<rootDir>/',
    }),
  },
};
