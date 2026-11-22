import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import typescript from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
    js.configs.recommended,
    ...typescript.configs.recommended,
    {
        ...react.configs.flat.recommended,
        ...react.configs.flat['jsx-runtime'], // Required for React 17+
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react/no-unescaped-entities': 'off',
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    {
        plugins: {
            'react-hooks': reactHooks,
        },
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
        },
    },
    {
        // Pruebas de frontend que corren en Node (node --test) y pruebas E2E de Cypress.
        files: ['tests/**/*.mjs', 'cypress.config.ts'],
        languageOptions: { globals: { ...globals.node } },
    },
    {
        files: ['cypress/**/*.{ts,js}'],
        languageOptions: { globals: { ...globals.browser, ...globals.mocha, cy: 'readonly', Cypress: 'readonly' } },
    },
    {
        ignores: ['vendor', 'node_modules', 'public', 'bootstrap/ssr', 'tailwind.config.js', 'cypress/videos', 'cypress/screenshots', 'cypress/reports'],
    },
    prettier, // Turn off all rules that might conflict with Prettier
];
