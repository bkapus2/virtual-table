module.exports = {
  "root": true,
  "env": {
    "jest/globals": true,
  },
  "parserOptions": {
    "ecmaVersion": 6,
    "sourceType": "module",
  },
  "plugins": ["jest"],
  "rules": {
    "semi": "error",
    "indent": ["error", 2],
    "comma-dangle": ["error", "always-multiline"],
  },
};