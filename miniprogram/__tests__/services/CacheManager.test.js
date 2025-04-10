/**
 * CacheManager组件测试套件
 * A3-网络请求管理模块2.0
 * 
 * 创建日期: 2025-04-08
 * 作者: AI开发团队
 * 
 * 测试覆盖:
 * - 基础功能测试: 构造函数、缓存读写、过期机制
 * - 错误处理测试: 参数验证、异常处理
 * - 边界条件测试: 缓存满、键不存在
 * - 性能测试: 响应时间、内存占用
 * - 集成测试: 与本地存储交互
 */

'use strict';

// 模拟wx API
global.wx = {
  setStorage: jest.fn(function(options) {
    setTimeout(function() {
      if (options.success) options.success();
    }, 0);
  }),
  
  getStorage: jest.fn(function(options) {
    setTimeout(function() {
      if (options.success) options.success({ data: options.mockData || null });
    }, 0);
  }),
  
  removeStorage: jest.fn(function(options) {
    setTimeout(function() {
      if (options.success) options.success();
    }, 0);
  }),
  
  getStorageInfo: jest.fn(function(options) {
    setTimeout(function() {
      if (options.success) options.success({ keys: ['cache_test1', 'cache_test2', 'other_key'] });
    }, 0);
  }),
  
  clearStorage: jest.fn(function(options) {
    setTimeout(function() {
      if (options.success) options.success();
    }, 0);
  })
};

// 导入被测试组件
const CacheManager = require('../../services/CacheManager');

describe('CacheManager', function() {
  
  // 每个测试前重置mock
  beforeEach(function() {
    jest.clearAllMocks();
  });
  
  // 1️⃣ 基础功能测试
  describe('Basic', function() {
    it('应使用默认选项正确初始化', function() {
      const cache = new CacheManager();
      expect(cache).toBeDefined();
      expect(cache._defaultExpire).toBe(5 * 60 * 1000); // 默认5分钟过期
      expect(cache._memoryLimit).toBe(100); // 默认内存缓存容量为100
      expect(cache._useStorage).toBe(true); // 默认使用本地存储
    });
    
    it('应正确合并用户选项和默认选项', function() {
      const customConfig = {
        defaultExpire: 60000, // 1分钟
        memoryLimit: 50,
        useStorage: false
      };
      const cache = new CacheManager(customConfig);
      expect(cache._defaultExpire).toBe(60000);
      expect(cache._memoryLimit).toBe(50);
      expect(cache._useStorage).toBe(false);
    });
    
    it('set方法应正确存储缓存', async function() {
      const cache = new CacheManager();
      await cache.set('test', 'value');
      
      expect(wx.setStorage).toHaveBeenCalled();
      expect(cache._memoryCache['test']).toBeDefined();
      expect(cache._memoryCache['test'].value).toBe('value');
    });
    
    it('get方法应正确获取缓存', async function() {
      const cache = new CacheManager();
      await cache.set('test', 'value');
      
      const value = await cache.get('test');
      expect(value).toBe('value');
      expect(cache._stats.hits).toBe(1);
    });
    
    it('delete方法应正确删除缓存', async function() {
      const cache = new CacheManager();
      await cache.set('test', 'value');
      await cache.delete('test');
      
      expect(wx.removeStorage).toHaveBeenCalled();
      expect(cache._memoryCache['test']).toBeUndefined();
      
      const value = await cache.get('test');
      expect(value).toBeNull();
    });
    
    it('clear方法应正确清空缓存', async function() {
      const cache = new CacheManager();
      await cache.set('test1', 'value1');
      await cache.set('test2', 'value2');
      await cache.clear();
      
      expect(cache._memoryCache).toEqual({});
      expect(cache._lruQueue).toEqual([]);
    });
  });
  
  // 2️⃣ 错误处理测试
  describe('Error', function() {
    it('set方法应验证key参数', async function() {
      const cache = new CacheManager();
      try {
        await cache.set(null, 'value');
        fail('应该抛出错误');
      } catch (error) {
        expect(error.message).toContain('缓存键不能为空');
      }
    });
    
    it('应处理存储API调用失败的情况', async function() {
      const cache = new CacheManager();
      
      // 模拟setStorage失败
      wx.setStorage.mockImplementationOnce(function(options) {
        setTimeout(function() {
          if (options.fail) options.fail(new Error('存储失败'));
        }, 0);
      });
      
      try {
        await cache.set('test', 'value');
        // 这里不应该抛出错误，因为我们在内部已经处理了错误
      } catch (error) {
        // 期望不会走到这里
        fail('不应该抛出错误');
      }
      
      // 验证内存缓存仍然有效
      expect(cache._memoryCache['test']).toBeDefined();
      expect(cache._memoryCache['test'].value).toBe('value');
    });
    
    it('应处理读取不存在的缓存', async function() {
      const cache = new CacheManager();
      const value = await cache.get('nonexistent');
      
      expect(value).toBeNull();
      expect(cache._stats.misses).toBe(1);
    });
  });
  
  // 3️⃣ 边界条件测试
  describe('Edge', function() {
    it('缓存应在达到过期时间后失效', async function() {
      const cache = new CacheManager();
      
      // 设置过期时间为10ms的缓存
      await cache.set('test', 'value', { expire: 10 });
      
      // 立即获取，应该有效
      let value = await cache.get('test');
      expect(value).toBe('value');
      
      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // 再次获取，应该已失效
      value = await cache.get('test');
      expect(value).toBeNull();
      expect(cache._stats.expired).toBe(1);
    });
    
    it('缓存应在达到内存限制时淘汰最久未使用的项', async function() {
      // 创建一个容量为2的缓存管理器
      const cache = new CacheManager({ memoryLimit: 2 });
      
      // 添加3个缓存项
      await cache.set('item1', 'value1');
      await cache.set('item2', 'value2');
      
      // 此时缓存满了，再添加一项
      await cache.set('item3', 'value3');
      
      // 验证最久未使用的item1被淘汰
      expect(cache._memoryCache['item1']).toBeUndefined();
      expect(cache._memoryCache['item2']).toBeDefined();
      expect(cache._memoryCache['item3']).toBeDefined();
      expect(cache._stats.evicted).toBe(1);
    });
    
    it('LRU算法应正确更新使用顺序', async function() {
      const cache = new CacheManager({ memoryLimit: 3 });
      
      // 添加3个缓存项
      await cache.set('item1', 'value1');
      await cache.set('item2', 'value2');
      await cache.set('item3', 'value3');
      
      // 访问item1，使其变为最近使用
      await cache.get('item1');
      
      // 添加第4个项，此时item2应该被淘汰（因为item1最近被访问过）
      await cache.set('item4', 'value4');
      
      expect(cache._memoryCache['item1']).toBeDefined();
      expect(cache._memoryCache['item2']).toBeUndefined();
      expect(cache._memoryCache['item3']).toBeDefined();
      expect(cache._memoryCache['item4']).toBeDefined();
    });
  });
  
  // 4️⃣ 性能测试
  describe('Performance', function() {
    it('get/set操作应在100ms内完成', async function() {
      const cache = new CacheManager();
      const iterations = 100;
      
      const startTime = Date.now();
      
      // 执行多次set和get操作
      for (let i = 0; i < iterations; i++) {
        await cache.set(`key${i}`, `value${i}`);
      }
      
      for (let i = 0; i < iterations; i++) {
        await cache.get(`key${i}`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100);
    });
    
    it('缓存统计应正确记录命中和未命中', async function() {
      const cache = new CacheManager();
      
      // 设置一些缓存
      await cache.set('hit1', 'value1');
      await cache.set('hit2', 'value2');
      
      // 执行一些命中和未命中的操作
      await cache.get('hit1');
      await cache.get('hit2');
      await cache.get('miss1');
      await cache.get('miss2');
      
      // 验证统计
      const stats = cache.getStats();
      expect(stats.stats.hits).toBe(2);
      expect(stats.stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.5); // 命中率应为50%
    });
    
    it('resetStats方法应正确重置统计数据', function() {
      const cache = new CacheManager();
      
      // 修改一些统计数据
      cache._stats.hits = 10;
      cache._stats.misses = 5;
      
      // 重置统计
      cache.resetStats();
      
      // 验证统计已重置
      expect(cache._stats.hits).toBe(0);
      expect(cache._stats.misses).toBe(0);
      expect(cache._stats.expired).toBe(0);
      expect(cache._stats.evicted).toBe(0);
    });
  });
  
  // 5️⃣ 集成测试
  describe('Integration', function() {
    it('应正确与本地存储交互', async function() {
      const cache = new CacheManager();
      
      // 设置缓存
      await cache.set('test', 'value');
      
      // 清空内存缓存，模拟重新加载
      cache._memoryCache = {};
      
      // 模拟从存储返回数据
      wx.getStorage.mockImplementationOnce(function(options) {
        setTimeout(function() {
          options.success({
            data: {
              key: 'test',
              value: 'value',
              expire: Date.now() + 1000,
              createTime: Date.now()
            }
          });
        }, 0);
      });
      
      // 获取缓存，应从本地存储获取
      const value = await cache.get('test');
      expect(value).toBe('value');
      expect(wx.getStorage).toHaveBeenCalled();
    });
    
    it('应在本地存储获取失败时正确处理', async function() {
      const cache = new CacheManager();
      
      // 模拟getStorage失败
      wx.getStorage.mockImplementationOnce(function(options) {
        setTimeout(function() {
          options.fail(new Error('读取失败'));
        }, 0);
      });
      
      // 获取不存在的缓存
      const value = await cache.get('test');
      
      // 应返回null，且不抛出错误
      expect(value).toBeNull();
    });
    
    it('destroy方法应清理所有资源', function() {
      const cache = new CacheManager();
      
      // 设置一些数据
      cache._memoryCache = { test: 'value' };
      cache._lruQueue = ['test'];
      
      // 调用destroy
      cache.destroy();
      
      // 验证资源已清理
      expect(cache._memoryCache).toEqual({});
      expect(cache._lruQueue).toEqual([]);
      expect(cache._pendingRequests).toEqual({});
      expect(cache._cleanupInterval).toBeNull();
    });
    
    it('clear方法应清除所有缓存键', async function() {
      const cache = new CacheManager();
      
      // 设置一些缓存
      await cache.set('test1', 'value1');
      await cache.set('test2', 'value2');
      
      // 清空缓存
      await cache.clear();
      
      // 验证wx.getStorageInfo和wx.removeStorage被调用
      expect(wx.getStorageInfo).toHaveBeenCalled();
      expect(wx.removeStorage).toHaveBeenCalledTimes(2); // 应该被调用2次
    });
  });
}); 