const config = {
  extends: [
    /* recommended */
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    /* prettier */
    'plugin:prettier/recommended',
    'prettier/@typescript-eslint',
  ],
  root: true,
  env: { node: true, es6: true },

  plugins: ['@typescript-eslint'],

  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
  },
};
module.exports = config;
