import sharedConfig from "../../eslint.config.mjs";

export default [
  ...sharedConfig,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        // Check consumers against the current build, not the historical npm pin.
        projectService: false,
        project: "./tsconfig.lint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
