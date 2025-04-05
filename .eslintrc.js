module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [
    'react',
    '@typescript-eslint',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // 基础规则
    'indent': ['error', 2, { 'SwitchCase': 1 }],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'max-len': ['error', { 'code': 100 }],
    'max-depth': ['error', 5], // 最大嵌套深度为5
    'complexity': ['error', 10], // 控制圈复杂度
    'no-debugger': 'error',
    'prefer-const': 'error',
    
    // React 相关规则
    'react/prop-types': 'off', // 使用TypeScript，无需prop-types
    'react/react-in-jsx-scope': 'off', // React 17+不需要引入React
    'react/display-name': 'off',
    'react/jsx-uses-react': 'off',
    'react/jsx-uses-vars': 'error',
    
    // TypeScript 相关规则
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
    
    // 小程序特殊规则
    'camelcase': ['error', { 
      'properties': 'never', 
      'ignoreDestructuring': true,
      'allow': ['^wx', '^on']  // 允许微信API的wx前缀和事件处理的on前缀
    }],
  },
  // 小程序和Web端的规则覆盖
  overrides: [
    {
      // 小程序特定规则
      files: ['miniprogram/**/*.js', 'miniprogram/**/*.ts', 'miniprogram/**/*.wxs'],
      globals: {
        'wx': 'readonly',
        'App': 'readonly',
        'Page': 'readonly',
        'Component': 'readonly',
        'getApp': 'readonly',
        'getCurrentPages': 'readonly',
      },
      rules: {
        'no-undef': 'off', // 微信小程序全局对象会被误报为未定义
      }
    },
    {
      // React Web端特定规则
      files: ['web/src/**/*.js', 'web/src/**/*.jsx', 'web/src/**/*.ts', 'web/src/**/*.tsx'],
      env: {
        'browser': true,
        'jest': true,
      },
      rules: {
        // Web特定规则可以在这里添加
      }
    }
  ]
}; 