/** @type {import('@ts-jest/dist/types').InitialOptionsTsJest} */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
  globals: {
    'ts-jest': {
      // Without this, there is a warning about imports which I can't remove. Everything seems
      // to be working fine, though! https://github.com/kulshekhar/ts-jest/issues/748
      diagnostics: {
        ignoreCodes: [151001],
      },
    },
  },
};
