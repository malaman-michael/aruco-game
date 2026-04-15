const {
    defineConfig,
} = require("eslint/config");

const globals = require("globals");

const {
    fixupConfigRules,
} = require("@eslint/compat");

const parser = require("vue-eslint-parser");
const js = require("@eslint/js");

const {
    FlatCompat,
} = require("@eslint/eslintrc");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = defineConfig([{
    languageOptions: {
        globals: {
            ...globals.browser,
        },

        parser: parser,
        ecmaVersion: "latest",
        sourceType: "module",
        parserOptions: {},
    },

    extends: fixupConfigRules(compat.extends(
        "eslint:recommended",
        "plugin:vue/vue3-recommended",
        "plugin:import/recommended",
    )),

    settings: {
        "import/resolver": {
            node: {
                extensions: [".js", ".vue", ".json"],
            },

            alias: {
                map: [["@", "./src"]],
                extensions: [".vue", ".js"],
            },
        },

        "import/case-sensitive": true,
    },

    rules: {
        "import/no-unresolved": ["error", {
            caseSensitive: true,
        }],

        "import/extensions": ["warn", "always", {
            ignorePackages: true,
        }],
    },
}]);