import sharedConfig from "../../eslint.config.mjs";

export default [
  ...sharedConfig,
  {
    settings: {
      "import/resolver": {
        node: { extensions: [".js", ".mjs", ".ts", ".tsx"] },
      },
    },
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          basePath: import.meta.dirname,
          zones: [
            {
              target: ".",
              from: "..",
              except: ["./snippets"],
              message: "Keep sibling example tests in their own package.",
            },
          ],
        },
      ],
    },
  },
];
