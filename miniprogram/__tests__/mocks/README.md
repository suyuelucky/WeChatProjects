# LocalStorage Mock 实现与性能测试

## 简介

本目录包含用于测试环境的 localStorage 模拟实现及其性能测试工具。这些工具可用于在不依赖真实浏览器环境的情况下模拟 localStorage 行为，并且可以评估模拟实现与真实实现之间的性能差异。

## 文件说明

- `localStorage.mock.js`: localStorage 的模拟实现
- `storage-test-utils.js`: 用于测试的辅助函数集合
- `run-performance-comparison.js`: 运行性能比较测试的脚本
- `../localStorage-performance.test.js`: 性能测试用例

## 使用方法

### 在项目中使用 LocalStorageMock

1. 引入 LocalStorageMock 类：

```javascript
const { LocalStorageMock } = require('./__tests__/mocks/localStorage.mock');
```

2. 创建实例并使用：

```javascript
// 创建实例
const mockStorage = new LocalStorageMock();

// 使用与原生 localStorage 一致的 API
mockStorage.setItem('key', 'value');
const value = mockStorage.getItem('key');
mockStorage.removeItem('key');
mockStorage.clear();
console.log(mockStorage.length);
const keyAtIndex = mockStorage.key(0);
```

### 在测试中使用 LocalStorageMock

在 Jest 测试中，您可以通过以下方式使用 LocalStorageMock：

```javascript
// 在测试文件开头
const { LocalStorageMock } = require('./__tests__/mocks/localStorage.mock');

// 在测试前设置全局 localStorage
beforeAll(() => {
  global.localStorage = new LocalStorageMock();
});

// 在测试中
test('测试使用 localStorage', () => {
  localStorage.setItem('testKey', 'testValue');
  expect(localStorage.getItem('testKey')).toBe('testValue');
});
```

## 运行性能测试

要运行性能比较测试，请确保已安装所需的依赖（主要是 Jest），然后执行：

```bash
node ./__tests__/mocks/run-performance-comparison.js
```

此命令将运行 `localStorage-performance.test.js` 中的测试，并比较模拟实现与真实 localStorage 的性能差异。

## 测试工具函数

`storage-test-utils.js` 提供了以下实用功能：

- `generateLargeString(size)`: 生成指定大小的随机字符串
- `runPerformanceTest(testFunction, iterations)`: 运行性能测试并收集数据
- `clearRealLocalStorage()`: 清除真实的 localStorage（仅在浏览器或 JSDOM 环境下可用）
- `formatPerformanceResults(results)`: 格式化性能测试结果为可读字符串
- `compareResults(mockResults, realResults)`: 对比两个测试结果并计算差异百分比

## 性能测试场景

性能测试涵盖以下场景：

1. 小型数据（100字节）的读写操作
2. 中型数据（1KB）的读写操作
3. 大型数据（5KB）的读写操作
4. 批量操作测试（添加和删除多个项目）

每个测试都会比较模拟实现与真实实现的性能差异，并输出详细的测试结果。

## 注意事项

- 模拟实现支持错误模拟，可以测试异常情况
- 性能测试在 JSDOM 环境中运行，可能与实际浏览器中的性能有所差异
- 性能测试结果受测试环境影响，不同机器上的结果可能有所不同 