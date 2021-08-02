module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'google',
    'prettier',
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
  plugins: ['react', , '@typescript-eslint'],
  rules: {
    'require-jsdoc': 0,
    'react/display-name': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    'spaced-comment': [
      'error',
      'always',
      { markers: ['#', '/'], exceptions: ['-'] },
    ],
  },
};
