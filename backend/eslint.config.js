import js from '@eslint/js'

export default [
  {
    ignores: ['node_modules', 'dist']
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    extends: [js.configs.recommended],
    rules: {
      // Autoriser les args non utilisés préfixés par _
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  }
]

