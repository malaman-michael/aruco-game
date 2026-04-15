// eslint.config.js
import pluginVue from 'eslint-plugin-vue';
import pluginImport from 'eslint-plugin-import';
import js from '@eslint/js';

export default [
    // Configurazione base JS (regole consigliate)
    js.configs.recommended,

    // Configurazioni Vue (essenziali)
    ...pluginVue.configs['flat/essential'],

    // Configurazione personalizzata
    {
        files: ['**/*.vue', '**/*.js'],
        plugins: {
            import: pluginImport,
        },
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            // ImportANTE: usa vue-eslint-parser per i file .vue
            parser: (await import('vue-eslint-parser')).default,
            parserOptions: {
                parser: '@babel/eslint-parser', // opzionale, puoi anche usare espree
                sourceType: 'module',
                ecmaVersion: 'latest',
            },
        },
        rules: {
            // Regola per case-sensitive degli import
            'import/no-unresolved': ['error', { caseSensitive: true }],
            // Disattiva regola fastidiosa per componenti single-word
            'vue/multi-word-component-names': 'off',
        },
        settings: {
            'import/resolver': {
                node: { extensions: ['.js', '.vue'] },
            },
        },
    },
    // Ignora cartelle
    {
        ignores: ['**/node_modules/**', '**/dist/**', '**/.vercel/**', '**/public/**'],
    },
];