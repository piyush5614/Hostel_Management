import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export const baseConfig = tseslint.config(
  {
    ignores: ['dist', '**/dist/**', 'node_modules', '**/node_modules/**', '.venv', '**/android/**'],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-console': 'off',
    },
  }
);

export default baseConfig;
