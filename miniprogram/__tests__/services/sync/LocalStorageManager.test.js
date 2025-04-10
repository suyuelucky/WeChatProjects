/**
 * LocalStorageManager组件单元测试
 * 
 * 创建时间: 2025年4月9日 10:22:30 CST
 * 创建者: Claude 3.7 Sonnet
 */

'use strict';

// 模拟wx对象
global.wx = {
  getStorageSync: jest.fn(),
  setStorageSync: jest.fn(),
  removeStorageSync: jest.fn(),
  getStorageInfoSync: jest.fn(),
  clearStorageSync: jest.fn()
};

// 导入被测试模块
const LocalStorageManager = require('../../../services/sync/LocalStorageManager');

describe('LocalStorageManager', () => {
  let storageManager;
  const mockStorageData = {};
  
  // 测试前重置模拟和创建实例
  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 模拟wx.getStorageSync的实现
    wx.getStorageSync.mockImplementation((key) => {
      return mockStorageData[key] !== undefined ? mockStorageData[key] : null;
    });
    
    // 模拟wx.setStorageSync的实现
    wx.setStorageSync.mockImplementation((key, value) => {
      mockStorageData[key] = value;
    });
    
    // 模拟wx.removeStorageSync的实现
    wx.removeStorageSync.mockImplementation((key) => {
      delete mockStorageData[key];
    });
    
    // 模拟wx.getStorageInfoSync的实现
    wx.getStorageInfoSync.mockImplementation(() => {
      return {
        keys: Object.keys(mockStorageData),
        currentSize: Object.keys(mockStorageData).length * 1024,
        limitSize: 10 * 1024 * 1024
      };
    });
    
    // 模拟wx.clearStorageSync的实现
    wx.clearStorageSync.mockImplementation(() => {
      Object.keys(mockStorageData).forEach(key => {
        delete mockStorageData[key];
      });
    });
    
    // 创建LocalStorageManager实例
    storageManager = new LocalStorageManager({
      prefix: 'test_'
    });
  });
  
  // 基本功能测试
  describe('基本功能', () => {
    test('初始化应创建有效实例', () => {
      expect(storageManager).toBeDefined();
      expect(typeof storageManager.set).toBe('function');
      expect(typeof storageManager.get).toBe('function');
      expect(typeof storageManager.remove).toBe('function');
    });
    
    test('设置和获取数据项', () => {
      const testKey = 'user_profile';
      const testData = { id: 1, name: 'Test User' };
      
      // 设置数据
      storageManager.set(testKey, testData);
      
      // 验证wx.setStorageSync被正确调用
      expect(wx.setStorageSync).toHaveBeenCalledWith(
        expect.stringContaining(testKey), 
        expect.anything()
      );
      
      // 获取数据
      const result = storageManager.get(testKey);
      
      // 验证返回的数据
      expect(result).toEqual(testData);
      expect(wx.getStorageSync).toHaveBeenCalled();
    });
    
    test('移除数据项', () => {
      const testKey = 'temp_data';
      const testData = { value: 'temporary' };
      
      // 先设置数据
      storageManager.set(testKey, testData);
      
      // 确认数据存在
      expect(storageManager.get(testKey)).toEqual(testData);
      
      // 移除数据
      storageManager.remove(testKey);
      
      // 验证wx.removeStorageSync被调用
      expect(wx.removeStorageSync).toHaveBeenCalledWith(
        expect.stringContaining(testKey)
      );
      
      // 确认数据已被移除
      expect(storageManager.get(testKey)).toBeNull();
    });
    
    test('检查键是否存在', () => {
      const existingKey = 'existing_key';
      const nonExistingKey = 'non_existing_key';
      
      // 设置一个键
      storageManager.set(existingKey, 'exists');
      
      // 检查存在的键
      expect(storageManager.has(existingKey)).toBe(true);
      
      // 检查不存在的键
      expect(storageManager.has(nonExistingKey)).toBe(false);
    });
    
    test('获取所有键', () => {
      // 设置多个测试数据
      storageManager.set('key1', 'value1');
      storageManager.set('key2', 'value2');
      storageManager.set('key3', 'value3');
      
      // 获取所有键
      const keys = storageManager.keys();
      
      // 验证结果
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
      expect(keys.length).toBe(3);
    });
    
    test('清除所有数据', () => {
      // 设置多个测试数据
      storageManager.set('key1', 'value1');
      storageManager.set('key2', 'value2');
      
      // 清除数据
      storageManager.clear();
      
      // 验证wx.clearStorageSync被调用
      expect(wx.clearStorageSync).toHaveBeenCalled();
      
      // 验证数据已被清除
      expect(storageManager.keys().length).toBe(0);
    });
  });
  
  // 高级功能测试
  describe('高级功能', () => {
    test('带默认值的获取操作', () => {
      const defaultValue = { default: true };
      
      // 获取不存在的键，应返回默认值
      const result = storageManager.get('non_existing', defaultValue);
      expect(result).toEqual(defaultValue);
    });
    
    test('批量设置操作', () => {
      const batchData = {
        key1: 'value1',
        key2: 'value2',
        key3: 'value3'
      };
      
      // 批量设置
      storageManager.setBatch(batchData);
      
      // 验证所有数据都被设置
      expect(storageManager.get('key1')).toBe('value1');
      expect(storageManager.get('key2')).toBe('value2');
      expect(storageManager.get('key3')).toBe('value3');
    });
    
    test('批量获取操作', () => {
      // 设置多个测试数据
      storageManager.set('key1', 'value1');
      storageManager.set('key2', 'value2');
      
      // 批量获取
      const results = storageManager.getBatch(['key1', 'key2', 'non_existing']);
      
      // 验证结果
      expect(results).toEqual({
        key1: 'value1',
        key2: 'value2',
        non_existing: null
      });
    });
    
    test('批量移除操作', () => {
      // 设置多个测试数据
      storageManager.set('key1', 'value1');
      storageManager.set('key2', 'value2');
      storageManager.set('key3', 'value3');
      
      // 批量移除
      storageManager.removeBatch(['key1', 'key2']);
      
      // 验证结果
      expect(storageManager.get('key1')).toBeNull();
      expect(storageManager.get('key2')).toBeNull();
      expect(storageManager.get('key3')).toBe('value3');
    });
    
    test('按前缀获取键', () => {
      // 设置不同前缀的数据
      storageManager.set('user_1', 'data1');
      storageManager.set('user_2', 'data2');
      storageManager.set('post_1', 'data3');
      
      // 获取特定前缀的键
      const userKeys = storageManager.getKeysByPrefix('user_');
      
      // 验证结果
      expect(userKeys).toContain('user_1');
      expect(userKeys).toContain('user_2');
      expect(userKeys).not.toContain('post_1');
      expect(userKeys.length).toBe(2);
    });
    
    test('按前缀移除键', () => {
      // 设置不同前缀的数据
      storageManager.set('temp_1', 'data1');
      storageManager.set('temp_2', 'data2');
      storageManager.set('perm_1', 'data3');
      
      // 移除特定前缀的键
      storageManager.removeByPrefix('temp_');
      
      // 验证结果
      expect(storageManager.get('temp_1')).toBeNull();
      expect(storageManager.get('temp_2')).toBeNull();
      expect(storageManager.get('perm_1')).toBe('data3');
    });
  });
  
  // 数据序列化测试
  describe('数据序列化', () => {
    test('复杂对象序列化和反序列化', () => {
      const complexObject = {
        id: 1,
        name: 'Complex',
        nested: {
          field1: 'value1',
          field2: [1, 2, 3]
        },
        date: new Date('2025-01-01'),
        fn: function() { return 'function should not be serialized'; }
      };
      
      // 设置复杂对象
      storageManager.set('complex', complexObject);
      
      // 获取存储的对象
      const retrieved = storageManager.get('complex');
      
      // 验证关键字段
      expect(retrieved.id).toBe(complexObject.id);
      expect(retrieved.name).toBe(complexObject.name);
      expect(retrieved.nested.field1).toBe(complexObject.nested.field1);
      expect(retrieved.nested.field2).toEqual(complexObject.nested.field2);
      
      // 验证日期被正确序列化为字符串
      expect(typeof retrieved.date).toBe('string');
      
      // 验证函数未被保留
      expect(retrieved.fn).toBeUndefined();
    });
    
    test('循环引用处理', () => {
      // 创建带有循环引用的对象
      const cyclicObject = { name: 'Cyclic' };
      cyclicObject.self = cyclicObject;
      
      // 尝试设置循环引用对象
      expect(() => {
        storageManager.set('cyclic', cyclicObject);
      }).not.toThrow();
      
      // 验证存储了不带循环引用的版本
      const retrieved = storageManager.get('cyclic');
      expect(retrieved.name).toBe('Cyclic');
    });
  });
  
  // 错误处理测试
  describe('错误处理', () => {
    test('无效键名处理', () => {
      // 测试各种无效键名
      expect(() => storageManager.set('', 'value')).toThrow();
      expect(() => storageManager.set(null, 'value')).toThrow();
      expect(() => storageManager.set(undefined, 'value')).toThrow();
      expect(() => storageManager.set({}, 'value')).toThrow();
    });
    
    test('存储失败恢复', () => {
      // 模拟存储失败
      wx.setStorageSync.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });
      
      // 尝试设置数据
      expect(() => {
        storageManager.set('fail_key', 'value');
      }).toThrow();
      
      // 验证备份/恢复机制
      expect(storageManager.get('fail_key')).toBeNull();
    });
    
    test('存储配额超出处理', () => {
      // 模拟存储配额超出
      wx.setStorageSync.mockImplementationOnce(() => {
        const error = new Error('Storage quota exceeded');
        error.errMsg = 'setStorageSync:fail storage limit exceeded';
        throw error;
      });
      
      // 尝试设置大量数据
      const largeData = new Array(1000000).fill('x').join('');
      expect(() => {
        storageManager.set('large_key', largeData);
      }).toThrow(/storage limit/);
      
      // 验证是否触发了自动清理机制
      expect(storageManager.get('large_key')).toBeNull();
    });
  });
  
  // 性能测试
  describe('性能测试', () => {
    test('大批量数据操作性能', () => {
      // 创建大批量测试数据
      const batchData = {};
      for (let i = 0; i < 100; i++) {
        batchData[`perf_key_${i}`] = `value_${i}`;
      }
      
      // 测量批量设置性能
      const setBatchStart = Date.now();
      storageManager.setBatch(batchData);
      const setBatchTime = Date.now() - setBatchStart;
      console.log(`批量设置100项耗时: ${setBatchTime}ms`);
      
      // 要求批量设置性能在合理范围内
      expect(setBatchTime).toBeLessThan(100); // 100ms以内
      
      // 测量批量获取性能
      const getBatchStart = Date.now();
      storageManager.getBatch(Object.keys(batchData));
      const getBatchTime = Date.now() - getBatchStart;
      console.log(`批量获取100项耗时: ${getBatchTime}ms`);
      
      // 要求批量获取性能在合理范围内
      expect(getBatchTime).toBeLessThan(50); // 50ms以内
    });
  });
  
  // 生命周期测试
  describe('生命周期管理', () => {
    test('数据项过期处理', () => {
      // 设置带过期时间的数据
      storageManager.set('expiring_key', 'value', { expires: Date.now() + 50 });
      
      // 检查数据存在
      expect(storageManager.get('expiring_key')).toBe('value');
      
      // 等待过期
      return new Promise(resolve => {
        setTimeout(() => {
          // 检查数据已过期
          expect(storageManager.get('expiring_key')).toBeNull();
          resolve();
        }, 100);
      });
    });
    
    test('数据版本管理', () => {
      // 设置初始版本
      storageManager.set('versioned_key', { data: 'v1' }, { version: 1 });
      
      // 设置更新版本
      storageManager.set('versioned_key', { data: 'v2' }, { version: 2 });
      
      // 检查当前版本
      expect(storageManager.get('versioned_key').data).toBe('v2');
      
      // 获取特定版本
      expect(storageManager.getVersion('versioned_key', 1).data).toBe('v1');
    });
  });
}); 