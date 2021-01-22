module.exports = {
  env: {
    browser: true,
    mocha: true,
    es6: true,
    node: true,
  },
  globals: {
    expect: true,
    sinon: true,
  },
  plugins: ['import', 'node', 'promise', 'standard', 'vue'],
  extends: [
    'plugin:vue/vue3-essential',
    'standard',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    // 'plugin:vue/recommended',
    'plugin:prettier/recommended',
    'prettier/vue',
    'prettier/@typescript-eslint',
  ],
  rules: {},
  overrides: [
    // 覆盖vue相关规则
    {
      files: ['**/*.vue'],
      rules: {},
    },
    {
      files: ['*.js'],
      rules: {
        /* 允许使用require语法 */
        '@typescript-eslint/no-var-requires': 'off',
        /* 允许this别名 */
        '@typescript-eslint/no-this-alias': 'off',
      },
    },
  ],

  // the ts-eslint recommended ruleset sets the parser so we need to set it back
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2020,
    sourceType: 'module',
    extraFileExtensions: ['.vue'],
    ecmaFeatures: {
      jsx: true,
    },
  },
}
