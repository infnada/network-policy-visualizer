export default {
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["react", "react-hooks"],
  rules: {
    // React specific rules
    "react/prop-types": "warn",
    "react/jsx-uses-react": "off",
    "react/react-in-jsx-scope": "off",
    "react/jsx-key": "error",
    "react/no-unused-state": "warn",
    "react/no-direct-mutation-state": "error",

    // React Hooks rules
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",

    // General JavaScript rules
    "no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
    "no-console": [
      "warn",
      {
        allow: ["warn", "error"],
      },
    ],
    "no-debugger": "error",
    "no-duplicate-imports": "error",
    "no-var": "error",
    "prefer-const": "error",
    "prefer-template": "warn",

    // Code style rules
    indent: [
      "error",
      2,
      {
        SwitchCase: 1,
      },
    ],
    quotes: [
      "error",
      "double",
      {
        avoidEscape: true,
      },
    ],
    semi: ["error", "always"],
    "comma-dangle": ["error", "always-multiline"],
    "object-curly-spacing": ["error", "always"],
    "array-bracket-spacing": ["error", "never"],
    "space-before-blocks": "error",
    "keyword-spacing": "error",
    "space-infix-ops": "error",
    "eol-last": "error",
    "no-trailing-spaces": "error",
    "max-len": [
      "warn",
      {
        code: 100,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
      },
    ],
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
