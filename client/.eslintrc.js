module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'plugin:jest-dom/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'google',
    'prettier',
    'plugin:storybook/recommended',
  ],
  overrides: [
    {
      files: ['*.js', '*.jsx'],
      plugins: ['plugin:react/recommended', 'google', 'prettier'],
    },
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },

  settings: { react: { version: 'detect' } },
  plugins: ['react', '@typescript-eslint'],
  rules: {
    camelcase: ['error', { allow: ['_ONLY_FOR_TESTING'] }],
    'require-jsdoc': 'off',
    'valid-jsdoc': 'off',
    'react/display-name': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    'react/prop-types': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    'spaced-comment': [
      'error',
      'always',
      { markers: ['#', '/'], exceptions: ['-'] },
    ],
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
    'prefer-const': [
      'error',
      {
        destructuring: 'any',
        ignoreReadBeforeAssign: true,
      },
    ],
  },
  ignorePatterns: ['**/operations.generated.ts', '**/types/schema.ts'],
};
