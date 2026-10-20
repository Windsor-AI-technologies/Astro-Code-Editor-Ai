import headers from 'eslint-plugin-headers'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default [
  {
    ignores: ['dist/**', 'src-tauri/target/**', 'src/vite-env.d.ts'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      headers,
      'react-hooks': reactHooks,
    },
    rules: {
      'headers/header-format': [
        'error',
        {
          source: 'string',
          style: 'jsdoc',
          content: [
            '##################################################################',
            '                  Copyright (c) 2026 Windsor',
            '                      Astro Code Editor',
            '##################################################################',
          ].join('\n'),
          blockPrefix: '\n',
          blockSuffix: '\n',
          linePrefix: '',
          trailingNewlines: 1,
        },
      ],
    },
  },
]
