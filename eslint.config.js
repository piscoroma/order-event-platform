const js = require("@eslint/js");
const nodePlugin = require("eslint-plugin-n");
const globals = require("globals");

module.exports = [
   {
      ignores: [
         "**/node_modules/**",
         "infra/**"
      ]
   },
   
   js.configs.recommended,

   {
      files: ["**/*.js"],

      languageOptions: {
         ecmaVersion: 2022,
         sourceType: "commonjs",
         globals: {
            ...globals.node
         }
      },

      plugins: {
         n: nodePlugin
      },

      rules: {
         "no-unused-vars": "warn",
         "no-console": "off",

         "n/no-missing-require": "error",
         "n/no-unpublished-require": "off",

         "eqeqeq": "error",
         "func-call-spacing": [
            "error",
            "never"
         ],

         "no-async-promise-executor": "error"
      }
   },

   {
      files: ["**/tests/**/*.js"],

      languageOptions: {
         globals: {
            ...globals.jest
         }
      }
   }
];
