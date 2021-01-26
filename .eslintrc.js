module.exports = {
  extends: ['airbnb-base'],
  parser: 'babel-eslint',
  env: {
    browser: true,
    node: true,
  },
  rules: {
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    'no-console': 0,
  },
};
