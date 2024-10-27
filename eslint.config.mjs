import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import pluginPromise from 'eslint-plugin-promise';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import ts from 'typescript-eslint';

export default [
  { files: ['**/*.{js,ts,tsx}'] },
  { languageOptions: { globals: globals.browser } },
  js.configs.recommended,
  ...ts.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginPromise.configs['flat/recommended'],
  eslintConfigPrettier,
  {
    plugins: {
      'react-hooks': pluginReactHooks,
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-array-constructor': 'error',
      '@typescript-eslint/no-empty-function': ['error'],
      '@typescript-eslint/no-unused-vars': [
        2,
        {
          argsIgnorePattern: '^_',
        },
      ],
      'no-console': [
        2,
        {
          allow: ['warn', 'error'],
        },
      ],
      ...pluginReactHooks.configs.recommended.rules,
    },
  },
  {
    ignores: [
      'build/*',
      'artifacts/*',
      'AriaNg/*',
      '*.config.*[t|j]s',
      'plugins/*',
    ],
  },
];
