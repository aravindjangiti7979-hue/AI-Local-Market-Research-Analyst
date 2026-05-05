module.exports = {
  root: true,
  env: { 
    browser: true, 
    es2020: true,
    node: true, // Add Node.js environment
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: { 
    ecmaVersion: 'latest', 
    sourceType: 'module' 
  },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react/prop-types': 'off',
  },
  globals: {
    __dirname: 'readonly', // Define __dirname as a global
    require: 'readonly',   // Define require as a global
  }
}