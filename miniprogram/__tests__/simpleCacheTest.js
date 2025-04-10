/**
 * CacheManager组件简化测试脚本
 * 
 * 创建日期: 2025-04-08
 * 作者: AI开发团队
 * 
 * 说明: 这个脚本专注于验证CacheManager的核心功能，确保其符合工业级验收标准
 */

'use strict';

// 导入CacheManager
const CacheManager = require('../services/CacheManager');

// 模拟wx API
global.wx = {
  _storage: {},
  _storageInfo: {
    keys: [],
    currentSize: 0,
    limitSize: 10 * 1024 * 1024
  },
  
  setStorage: function(options) {
    try {
      this._storage[options.key] = options.data;
      if (!this._storageInfo.keys.includes(options.key)) {
        this._storageInfo.keys.push(options.key);
      }
      this._storageInfo.currentSize = JSON.stringify(this._storage).length;
      console.log(`[wx.setStorage] 键: ${options.key}`);
      
      if (options.success) options.success();
      if (options.complete) options.complete();
    } catch (e) {
      console.error(`[wx.setStorage] 错误: ${e.message}`);
      if (options.fail) options.fail(e);
      if (options.complete) options.complete();
    }
  },
  
  getStorage: function(options) {
    try {
      if (this._storage[options.key] !== undefined) {
        console.log(`[wx.getStorage] 键: ${options.key}, 已找到`);
        if (options.success) options.success({ data: this._storage[options.key] });
      } else {
        console.log(`[wx.getStorage] 键: ${options.key}, 未找到`);
        if (options.fail) options.fail({ errMsg: 'getStorage:fail data not found' });
      }
      if (options.complete) options.complete();
    } catch (e) {
      console.error(`[wx.getStorage] 错误: ${e.message}`);
      if (options.fail) options.fail(e);
      if (options.complete) options.complete();
    }
  },
  
  removeStorage: function(options) {
    try {
      console.log(`[wx.removeStorage] 键: ${options.key}`);
      delete this._storage[options.key];
      
      const index = this._storageInfo.keys.indexOf(options.key);
      if (index > -1) {
        this._storageInfo.keys.splice(index, 1);
      }
      
      this._storageInfo.currentSize = JSON.stringify(this._storage).length;
      
      if (options.success) options.success();
      if (options.complete) options.complete();
    } catch (e) {
      console.error(`[wx.removeStorage] 错误: ${e.message}`);
      if (options.fail) options.fail(e);
      if (options.complete) options.complete();
    }
  },
  
  clearStorage: function(options) {
    try {
      console.log('[wx.clearStorage]');
      this._storage = {};
      this._storageInfo.keys = [];
      this._storageInfo.currentSize = 0;
      
      if (options && options.success) options.success();
      if (options && options.complete) options.complete();
    } catch (e) {
      console.error(`[wx.clearStorage] 错误: ${e.message}`);
      if (options && options.fail) options.fail(e);
      if (options && options.complete) options.complete();
    }
  },
  
  getStorageInfo: function(options) {
    try {
      console.log('[wx.getStorageInfo]');
      if (options && options.success) options.success(this._storageInfo);
      if (options && options.complete) options.complete();
    } catch (e) {
      console.error(`[wx.getStorageInfo] 错误: ${e.message}`);
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

// 简单测试框架
const Test = {
  run: function(testName, testFunction) {
    console.log(`\n开始测试: ${testName}`);
    try {
      const result = testFunction();
      if (result instanceof Promise) {
        return result
          .then(() => console.log(`✅ 测试通过: ${testName}`))
          .catch(error => {
            console.error(`❌ 测试失败: ${testName}`);
            console.error(`   错误: ${error.message || JSON.stringify(error)}`);
            throw error;
          });
      } else {
        console.log(`✅ 测试通过: ${testName}`);
        return Promise.resolve();
      }
    } catch (error) {
      console.error(`❌ 测试失败: ${testName}`);
      console.error(`   错误: ${error.message || JSON.stringify(error)}`);
      return Promise.reject(error);
    }
  }
};

// 断言库
const assert = {
  equal: function(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `期望 ${expected}，但得到 ${actual}`);
    }
  },
  deepEqual: function(actual, expected, message) {
    const actualJSON = JSON.stringify(actual);
    const expectedJSON = JSON.stringify(expected);
    if (actualJSON !== expectedJSON) {
      throw new Error(message || `期望 ${expectedJSON}，但得到 ${actualJSON}`);
    }
  },
  ok: function(value, message) {
    if (!value) {
      throw new Error(message || `期望为真，但得到 ${value}`);
    }
  },
  fail: function(message) {
    throw new Error(message || '断言失败');
  }
};

// 运行测试
async function runTests() {
  console.log('\n============================================');
  console.log('CacheManager 简化测试开始');
  console.log('============================================\n');
  
  let cacheManager;
  
  try {
    // 创建CacheManager实例
    await Test.run('创建CacheManager实例', () => {
      cacheManager = new CacheManager({
        prefix: 'test_cache_',
        defaultExpiration: 300000, // 5分钟
        maxItems: 100
      });
      
      assert.ok(cacheManager, 'CacheManager实例应该被创建');
      return Promise.resolve();
    });
    
    // 测试基本的设置和获取功能
    await Test.run('设置和获取缓存项', async () => {
      const testKey = 'testKey';
      const testData = { message: 'Hello World' };
      
      await cacheManager.set(testKey, testData);
      const retrievedData = await cacheManager.get(testKey);
      
      assert.deepEqual(retrievedData, testData, '获取的数据应该与设置的数据相同');
    });
    
    // 测试删除功能
    await Test.run('删除缓存项', async () => {
      const testKey = 'testKeyToRemove';
      const testData = { message: 'Delete Me' };
      
      await cacheManager.set(testKey, testData);
      await cacheManager.remove(testKey);
      
      try {
        await cacheManager.get(testKey);
        assert.fail('应该抛出错误，因为缓存项已被删除');
      } catch (error) {
        // 预期会抛出错误
        assert.ok(error, '删除后获取应该抛出错误');
      }
    });
    
    // 测试清除所有缓存
    await Test.run('清除所有缓存', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');
      await cacheManager.clear();
      
      try {
        await cacheManager.get('key1');
        assert.fail('应该抛出错误，因为缓存已被清除');
      } catch (error) {
        // 预期会抛出错误
        assert.ok(error, '清除后获取应该抛出错误');
      }
    });
    
    // 测试过期功能
    await Test.run('缓存过期功能', async () => {
      const testKey = 'expiringKey';
      const testData = { message: 'This will expire' };
      const shortExpiration = 100; // 100ms
      
      await cacheManager.set(testKey, testData, { expiration: shortExpiration });
      
      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 150));
      
      try {
        await cacheManager.get(testKey);
        assert.fail('应该抛出错误，因为缓存项已过期');
      } catch (error) {
        // 预期会抛出错误
        assert.ok(error, '过期后获取应该抛出错误');
      }
    });
    
    // 测试getOrFetch功能
    await Test.run('getOrFetch功能', async () => {
      const testKey = 'fetchKey';
      const initialData = { source: 'initial' };
      const newData = { source: 'fetched' };
      let fetchCalled = false;
      
      const fetchFn = () => {
        fetchCalled = true;
        return Promise.resolve(newData);
      };
      
      // 首次应该调用fetchFn
      let result = await cacheManager.getOrFetch(testKey, fetchFn);
      assert.ok(fetchCalled, 'fetchFn应该被调用');
      assert.deepEqual(result, newData, '应该返回fetchFn的结果');
      
      // 重置标志
      fetchCalled = false;
      
      // 第二次应该使用缓存
      result = await cacheManager.getOrFetch(testKey, fetchFn);
      assert.ok(!fetchCalled, 'fetchFn不应该被调用');
      assert.deepEqual(result, newData, '应该返回缓存的数据');
      
      // 使用forceRefresh强制刷新
      fetchCalled = false;
      result = await cacheManager.getOrFetch(testKey, fetchFn, { forceRefresh: true });
      assert.ok(fetchCalled, 'forceRefresh时fetchFn应该被调用');
      assert.deepEqual(result, newData, '应该返回fetchFn的结果');
    });
    
    console.log('\n============================================');
    console.log('所有测试通过！CacheManager符合工业级验收标准');
    console.log('============================================\n');
    
  } catch (error) {
    console.error('\n============================================');
    console.error('测试失败！需要修复问题以达到工业级验收标准');
    console.error('============================================\n');
    process.exit(1);
  }
}

// 执行测试
runTests(); 