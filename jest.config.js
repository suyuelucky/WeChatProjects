/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // 指定测试环境
  testEnvironment: 'node',
  
  // 测试文件匹配模式
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.js'
  ],
  
  // 在每个测试文件执行前设置环境
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // 模块文件扩展名
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  
  // 转换配置
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
  
  // 模块解析
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^wx$': '<rootDir>/miniprogram/utils/testing/wx-mock.js'
  },
  
  // ESM 支持
  extensionsToTreatAsEsm: ['.ts'],
  
  // 忽略的目录
  testPathIgnorePatterns: ['/node_modules/'],
  
  // 覆盖率收集
  collectCoverage: true,
  coverageDirectory: 'coverage',
  
  // 测试设置
  roots: ['<rootDir>'],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testTimeout: 10000,
  verbose: true
}; 