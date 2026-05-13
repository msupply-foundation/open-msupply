// Sync object
/** @type {import('@jest/types').Config.InitialOptions} */

const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig');

module.exports = {
  transform: {
    // React Compiler pilot: purchasing files go through babel-jest with the
    // compiler plugin. More-specific key must come first — jest picks the
    // first matching transform.
    '[/\\\\]packages[/\\\\]purchasing[/\\\\].+\\.(t|j)sx?$': [
      'babel-jest',
      {
        babelrc: false,
        configFile: false,
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
          ['@babel/preset-react', { runtime: 'automatic' }],
        ],
        plugins: [
          ['babel-plugin-react-compiler', { target: '19' }],
        ],
      },
    ],
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
  },
  transformIgnorePatterns: [
    '/node_modules/(?!uuid|@mui/x-date-pickers|@babel)',
  ],
  modulePathIgnorePatterns: [
    '[/\\\\]standard_reports[/\\\\].*[/\\\\]convert_data_js[/\\\\]',
    '[/\\\\]standard_forms[/\\\\].*[/\\\\]convert_data_js[/\\\\]',
    // Ignore stale compiled JS in dist/ so only source .ts/.tsx tests run
    '<rootDir>/dist',
  ],
  roots: ['../client', '../standard_reports', '../standard_forms'],
};
