module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:import/recommended'
  ],
  parser: 'vue-eslint-parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: {
    'import/resolver': {
      node: { extensions: ['.js', '.vue', '.json'] },
      alias: { map: [['@', './src']], extensions: ['.vue', '.js'] }
    },
    // Forza la verifica case-sensitive anche su Windows
    'import/case-sensitive': true
  },
  rules: {
    // Questa regola fallisce se l'import non corrisponde ESATTAMENTE al path sul disco
    'import/no-unresolved': ['error', { caseSensitive: true }],
    // Evita di importare file con estensione .vue se manca (opzionale)
    'import/extensions': ['warn', 'always', { ignorePackages: true }]
  }
};