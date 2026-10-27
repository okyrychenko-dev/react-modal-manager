import tseslint from "typescript-eslint";
import sharedConfig from "../../eslint.config.mjs";

export default [
  ...sharedConfig,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        // The verification command runs from the installed disposable app.
        projectService: false,
        project: "./tsconfig.test.json",
        tsconfigRootDir: process.cwd(),
      },
    },
  },
  {
    ...tseslint.configs.disableTypeChecked,
    files: ["scripts/**/*.mjs", "tests/browser/**/*.mjs"],
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "no-console": "off",
      "no-undef": "off",
    },
  },
];
