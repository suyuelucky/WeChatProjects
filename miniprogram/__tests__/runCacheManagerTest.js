/**
 * CacheManager组件测试运行器
 * 
 * 创建日期: 2025-04-08
 * 作者: AI开发团队
 * 
 * 说明: 这个脚本用于运行CacheManager组件的测试，确保其符合工业级验收标准
 */

'use strict';

const fs = require('fs');
const path = require('path');

// 全局测试框架
global.describe = function(desc, fn) {
  console.log(`\n[测试套件] ${desc}`);
  fn();
};

global.beforeEach = function(fn) {
  global._beforeEachFn = fn;
};

global.afterEach = function(fn) {
  global._afterEachFn = fn;
};

global.it = function(desc, fn) {
  console.log(`  [测试用例] ${desc}`);
  
  try {
    // 执行beforeEach如果有
    if (global._beforeEachFn) {
      global._beforeEachFn();
    }
    
    const result = fn(global.done);
    
    // 处理异步测试
    if (result && typeof result.then === 'function') {
      global._asyncTests.push({
        desc: desc,
        promise: result
      });
      console.log(`    ⏳ 异步测试启动`);
    }
    
    // 执行afterEach如果有
    if (global._afterEachFn) {
      global._afterEachFn();
    }
  } catch (e) {
    console.error(`    ❌ 失败: ${e.message || e}`);
    global._failures.push({
      desc: desc,
      error: e
    });
  }
};

global.done = function(error) {
  if (error) {
    console.error(`    ❌ 异步测试失败: ${error.message || error}`);
    global._failures.push({
      desc: '异步测试',
      error: error
    });
  } else {
    console.log(`    ✅ 异步测试通过`);
  }
};

// 断言库
global.expect = function(actual) {
  return {
    toBeDefined: function() {
      if (actual === undefined) {
        fail('期望定义，实际为 undefined');
      }
    },
    toBeNull: function() {
      if (actual !== null) {
        fail(`期望为 null，实际为 ${actual}`);
      }
    },
    toBe: function(expected) {
      if (actual !== expected) {
        fail(`期望 ${expected}，实际为 ${actual}`);
      }
    },
    toEqual: function(expected) {
      const actualStr = JSON.stringify(actual);
      const expectedStr = JSON.stringify(expected);
      if (actualStr !== expectedStr) {
        fail(`期望 ${expectedStr}，实际为 ${actualStr}`);
      }
    },
    toBeLessThan: function(expected) {
      if (!(actual < expected)) {
        fail(`期望 ${actual} < ${expected}`);
      }
    }
  };
};

global.fail = function(message) {
  throw new Error(message || '测试失败');
};

// 模拟wx API
global.wx = {
  _storage: {},
  _storageInfo: {
    keys: [],
    currentSize: 0,
    limitSize: 10 * 1024 * 1024
  },
  
  setStorage: function(options) {
    console.log(`    [模拟] wx.setStorage 键: ${options.key}`);
    
    try {
      this._storage[options.key] = options.data;
      if (!this._storageInfo.keys.includes(options.key)) {
        this._storageInfo.keys.push(options.key);
      }
      this._storageInfo.currentSize = JSON.stringify(this._storage).length;
      
      if (options.success) options.success();
      if (options.complete) options.complete();
    } catch (e) {
      console.error(`    [模拟] wx.setStorage 错误: ${e.message}`);
      if (options.fail) options.fail(e);
      if (options.complete) options.complete();
    }
  },
  
  getStorage: function(options) {
    console.log(`    [模拟] wx.getStorage 键: ${options.key}`);
    
    try {
      if (this._storage[options.key] !== undefined) {
        console.log(`    [模拟] wx.getStorage 找到值`);
        if (options.success) options.success({ data: this._storage[options.key] });
      } else {
        console.log(`    [模拟] wx.getStorage 未找到值`);
        if (options.fail) options.fail({ errMsg: 'getStorage:fail data not found' });
      }
      if (options.complete) options.complete();
    } catch (e) {
      console.error(`    [模拟] wx.getStorage 错误: ${e.message}`);
      if (options.fail) options.fail(e);
      if (options.complete) options.complete();
    }
  },
  
  removeStorage: function(options) {
    console.log(`    [模拟] wx.removeStorage 键: ${options.key}`);
    
    try {
      delete this._storage[options.key];
      
      const index = this._storageInfo.keys.indexOf(options.key);
      if (index > -1) {
        this._storageInfo.keys.splice(index, 1);
      }
      
      this._storageInfo.currentSize = JSON.stringify(this._storage).length;
      
      if (options.success) options.success();
      if (options.complete) options.complete();
    } catch (e) {
      console.error(`    [模拟] wx.removeStorage 错误: ${e.message}`);
      if (options.fail) options.fail(e);
      if (options.complete) options.complete();
    }
  },
  
  clearStorage: function(options) {
    console.log(`    [模拟] wx.clearStorage`);
    
    try {
      this._storage = {};
      this._storageInfo.keys = [];
      this._storageInfo.currentSize = 0;
      
      if (options && options.success) options.success();
      if (options && options.complete) options.complete();
    } catch (e) {
      console.error(`    [模拟] wx.clearStorage 错误: ${e.message}`);
      if (options && options.fail) options.fail(e);
      if (options && options.complete) options.complete();
    }
  },
  
  getStorageInfo: function(options) {
    console.log(`    [模拟] wx.getStorageInfo`);
    
    try {
      const info = {
        keys: [...this._storageInfo.keys],
        currentSize: this._storageInfo.currentSize,
        limitSize: this._storageInfo.limitSize
      };
      
      if (options && options.success) options.success(info);
      if (options && options.complete) options.complete();
    } catch (e) {
      console.error(`    [模拟] wx.getStorageInfo 错误: ${e.message}`);
      if (options && options.fail) options.fail(e);
      if (options && options.complete) options.complete();
    }
  },
  
  _reset: function() {
    this._storage = {};
    this._storageInfo.keys = [];
    this._storageInfo.currentSize = 0;
  }
};

// 全局变量
global._failures = [];
global._asyncTests = [];

// Promise对象，Node.js环境已有

// 运行测试
console.log('\n=============================================');
console.log('开始运行 CacheManager 测试');
console.log('=============================================\n');

// 导入CacheManager
console.log('正在导入CacheManager模块...');

// 获取CacheManager的绝对路径
const cacheManagerPath = path.resolve(__dirname, '../services/CacheManager.js');
console.log('CacheManager路径:', cacheManagerPath);

// 检查文件是否存在
if (fs.existsSync(cacheManagerPath)) {
  console.log('CacheManager文件存在');
  try {
    const CacheManager = require(cacheManagerPath);
    
    console.log('CacheManager导入成功:', typeof CacheManager);
    
    // 创建一个实例来测试
    try {
      const instance = new CacheManager({
        prefix: 'test_',
        defaultExpiration: 300000 // 5分钟
      });
      
      console.log('CacheManager实例创建成功:', typeof instance);
      
      // 列出所有方法
      const methods = Object.keys(CacheManager.prototype).filter(
        method => typeof CacheManager.prototype[method] === 'function'
      );
      
      console.log('CacheManager方法:\n - ' + methods.join('\n - '));
      
      // 设置全局实例供测试使用
      global.cacheManagerInstance = instance;
      global.CacheManager = CacheManager;
      
      // 导入并运行测试
      try {
        require('./CacheManager.test.js');
        
        // 处理异步测试
        if (global._asyncTests.length > 0) {
          Promise.all(global._asyncTests.map(test => {
            return test.promise
              .then(() => {
                console.log(`    ✅ 通过: ${test.desc}`);
              })
              .catch(error => {
                console.error(`    ❌ 失败: ${test.desc} - ${error.message || error}`);
                global._failures.push({
                  desc: test.desc,
                  error: error
                });
              });
          }))
          .then(() => {
            console.log('\n=============================================');
            console.log('CacheManager 测试完成');
            console.log('=============================================\n');
            
            if (global._failures.length > 0) {
              console.error(`测试失败: ${global._failures.length} 个测试用例未通过`);
              process.exit(1);
            } else {
              console.log('所有测试通过！');
              process.exit(0);
            }
          })
          .catch(error => {
            console.error('运行异步测试时发生错误:', error);
            process.exit(1);
          });
        } else {
          console.log('\n=============================================');
          console.log('CacheManager 测试完成');
          console.log('=============================================\n');
          
          if (global._failures.length > 0) {
            console.error(`测试失败: ${global._failures.length} 个测试用例未通过`);
            process.exit(1);
          } else {
            console.log('所有测试通过！');
            process.exit(0);
          }
        }
      } catch (e) {
        console.error('运行测试时发生错误:', e);
        process.exit(1);
      }
    } catch (e) {
      console.error('创建CacheManager实例失败:', e);
      process.exit(1);
    }
  } catch (e) {
    console.error('导入CacheManager模块失败:', e);
    process.exit(1);
  }
} else {
  console.error('CacheManager文件不存在:', cacheManagerPath);
  process.exit(1);
} 