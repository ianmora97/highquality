const js = require('@eslint/js');
const globals = require('globals');

// Only server code is linted: src/public/js is browser code written against
// jQuery/Alpine/FullCalendar globals and would need its own config.
module.exports = [
  { ignores: ['node_modules/**', 'src/public/**', 'graphify-out/**', '.claude/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
    },
  },
];
