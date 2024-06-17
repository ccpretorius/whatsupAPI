export default {
  root: true,
  env: {
    node: true,
    es2020: true,
  },
  extends: "eslint:recommended",
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module",
  },
  rules: {
    "no-console": "off", // Allows console.log statements, you can change it to 'warn' or 'error' if needed
    "no-process-env": "off", // Disables the rule that disallows process.env
  },
};
