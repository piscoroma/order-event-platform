const path = require("path");

require("dotenv").config({
   path: path.join(__dirname, ".env.e2e")
});

const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
   testDir: "./specs",

   use: {
      ignoreHTTPSErrors: process.env.IGNORE_TLS_ERRORS === "true",
      trace: "retain-on-failure",
      screenshot: "only-on-failure",
      video: "retain-on-failure"
   },

   //globalSetup: "./globalSetup.js",

   timeout: 30_000,

   expect: {
      timeout: 5_000
   },

   fullyParallel: false,
   workers: 1,

   retries: process.env.CI ? 2 : 0,

   reporter: process.env.CI
      ? [["github"], ["html"]]
      : [["list"], ["html"]]
});