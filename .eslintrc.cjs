/* eslint-env node */
module.exports = {
  root: true,
  env: { es2020: true },
  parserOptions: { ecmaVersion: 2020 },
  rules: {
    complexity: ["error", { max: 10 }],
  },
};
