import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['**/*.mjs'], languageOptions: { globals: { console: 'readonly', process: 'readonly', URL: 'readonly', structuredClone: 'readonly' } } },
);
