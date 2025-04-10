/**
 * 存储管理模块测试
 * 包含对StorageManager、cleanupStrategy和加密功能的测试
 * 
 * 作者：AI助手
 * 创建日期：2025-04-10
 */

// 引入被测试模块
var storageManager = require('../storageManager');
var cleanupStrategy = require('../cleanupStrategy');
var dataTypePriority = require('../dataTypePriority');
var encryption = require('../encryption');

// 模拟微信API
global.wx = global.wx || {
  setStorageSync: jest.fn(),
  getStorageSync: jest.fn(),
  removeStorageSync: jest.fn(),
  clearStorageSync: jest.fn(),
  getStorageInfoSync: jest.fn().mockReturnValue({
    keys: [],
    currentSize: 0,
    limitSize: 10 * 1024 * 1024
  })
};

// 测试数据
var testData = {
  basic: { id: 1, name: "测试数据", value: "test value" },
  large: { id: 2, items: Array(1000).fill({ data: "large item data" }) },
  critical: { id: 3, type: "system", name: "关键数据" }
};

describe('数据优先级模块测试', function() {
  test('数据类型优先级映射正确', function() {
    // 测试基本的优先级映射
    expect(dataTypePriority.getTypePriority(dataTypePriority.DATA_TYPES.SYSTEM))
      .toBe(dataTypePriority.PRIORITIES.CRITICAL);
    expect(dataTypePriority.getTypePriority(dataTypePriority.DATA_TYPES.TEMP))
      .toBe(dataTypePriority.PRIORITIES.LOWEST);
  });
  
  test('优先级比较功能正确', function() {
    // 测试优先级比较
    expect(dataTypePriority.isTypeHigherPriority(
      dataTypePriority.DATA_TYPES.SYSTEM, 
      dataTypePriority.DATA_TYPES.USER
    )).toBe(true);
    
    expect(dataTypePriority.isTypeHigherPriority(
      dataTypePriority.DATA_TYPES.CACHE, 
      dataTypePriority.DATA_TYPES.CORE
    )).toBe(false);
  });
  
  test('自定义优先级功能正常', function() {
    // 保存原来的优先级
    var originalPriority = dataTypePriority.getTypePriority(dataTypePriority.DATA_TYPES.CACHE);
    
    // 设置新优先级
    dataTypePriority.setTypePriority(dataTypePriority.DATA_TYPES.CACHE, 80);
    expect(dataTypePriority.getTypePriority(dataTypePriority.DATA_TYPES.CACHE)).toBe(80);
    
    // 恢复原来的优先级
    dataTypePriority.setTypePriority(dataTypePriority.DATA_TYPES.CACHE, originalPriority);
  });
});

describe('清理策略模块测试', function() {
  // 准备测试元数据
  var testMetadata = {
    'key1': {
      data: 'value1',
      metadata: {
        size: 100,
        lastAccess: Date.now() - 5000,
        priority: 'low'
      }
    },
    'key2': {
      data: 'value2',
      metadata: {
        size: 200,
        lastAccess: Date.now() - 10000,
        priority: 'medium'
      }
    },
    'key3': {
      data: 'value3',
      metadata: {
        size: 300,
        lastAccess: Date.now() - 1000,
        priority: 'high'
      }
    },
    'key4': {
      data: 'value4',
      metadata: {
        size: 400,
        lastAccess: Date.now() - 20000,
        priority: 'low',
        expiry: Date.now() - 5000 // 已过期
      }
    },
    'key5': {
      data: 'value5',
      metadata: {
        size: 500,
        lastAccess: Date.now() - 15000,
        priority: 'critical'
      }
    }
  };

  test('LRU清理策略正确清理数据', function() {
    var result = cleanupStrategy.lru(testMetadata, 300);
    
    // LRU应该选择最早访问的键
    expect(result).toContain('key2');
    expect(result).not.toContain('key5'); // 关键数据不应该被清理
  });

  test('基于优先级的清理策略正确工作', function() {
    var result = cleanupStrategy.priority(testMetadata, 300);
    
    // 应该选择优先级最低的键
    expect(result).toContain('key1');
    expect(result).not.toContain('key5'); // 关键数据不应该被清理
  });

  test('过期清理策略正确识别过期数据', function() {
    var result = cleanupStrategy.expiry(testMetadata);
    
    // 应该只清理过期的键
    expect(result).toContain('key4');
    expect(result.length).toBe(1);
  });

  test('复合清理策略综合考虑过期和优先级', function() {
    var result = cleanupStrategy.composite(testMetadata, 600);
    
    // 应该先清理过期数据，然后清理优先级低的数据
    expect(result).toContain('key4');
    expect(result.length).toBeGreaterThan(1);
    expect(result).not.toContain('key5'); // 关键数据不应该被清理
  });
});

describe('加密模块基础功能测试', function() {
  test('ArrayBuffer转换函数正常工作', function() {
    var testString = "测试字符串";
    var buffer = encryption.createStorageEncryption()._crypto.stringToArrayBuffer(testString);
    var backToString = encryption.createStorageEncryption()._crypto.arrayBufferToString(buffer);
    
    expect(backToString).toBe(testString);
  });
  
  test('Base64转换函数正常工作', function() {
    var buffer = new Uint8Array([65, 66, 67, 68]).buffer; // "ABCD"
    var base64 = encryption.createStorageEncryption()._crypto.arrayBufferToBase64(buffer);
    var backToBuffer = encryption.createStorageEncryption()._crypto.base64ToArrayBuffer(base64);
    
    var originalArray = new Uint8Array(buffer);
    var convertedArray = new Uint8Array(backToBuffer);
    
    expect(convertedArray.length).toBe(originalArray.length);
    for (var i = 0; i < originalArray.length; i++) {
      expect(convertedArray[i]).toBe(originalArray[i]);
    }
  });
});

describe('加密模块集成测试', function() {
  test('加密和解密过程能够正确还原数据', function() {
    var encryptor = encryption.createStorageEncryption({
      keyMode: 'fixed'
    });
    
    var testObj = { name: "测试对象", value: 12345 };
    var encrypted = encryptor.encrypt(testObj);
    var decrypted = encryptor.decrypt(encrypted);
    
    expect(decrypted).toEqual(testObj);
  });
  
  test('不同加密模式正确初始化', function() {
    var autoEncryptor = encryption.createStorageEncryption({ keyMode: 'auto' });
    var fixedEncryptor = encryption.createStorageEncryption({ keyMode: 'fixed' });
    var userEncryptor = encryption.createStorageEncryption({ keyMode: 'user' });
    
    expect(autoEncryptor.config.keyMode).toBe('auto');
    expect(fixedEncryptor.config.keyMode).toBe('fixed');
    expect(userEncryptor.config.keyMode).toBe('user');
  });
  
  test('不启用加密时返回原始数据', function() {
    var encryptor = encryption.createStorageEncryption({
      enabled: false
    });
    
    var testObj = { name: "未加密测试", value: 54321 };
    var result = encryptor.encrypt(testObj);
    
    expect(result.encryptionType).toBe('none');
    expect(result.data).toEqual(testObj);
  });
});

describe('存储管理器基础功能测试', function() {
  var manager;
  
  beforeEach(function() {
    // 重置模拟并创建新的管理器实例
    jest.clearAllMocks();
    manager = new storageManager({
      autoCleanup: false,
      expiryCheckEnabled: false
    });
  });
  
  test('存储和获取数据正常工作', function() {
    // 模拟存储操作
    wx.getStorageSync.mockImplementation(function(key) {
      if (key === 'test_key') {
        return JSON.stringify({
          data: testData.basic,
          metadata: { lastAccess: Date.now() }
        });
      }
      return null;
    });
    
    // 存储数据
    manager.setItem('test_key', testData.basic);
    
    // 获取数据
    var result = manager.getItem('test_key');
    expect(result).toEqual(testData.basic);
  });
  
  test('元数据管理功能正常工作', function() {
    // 模拟元数据存储
    var metadata = {};
    wx.setStorageSync.mockImplementation(function(key, value) {
      if (key.indexOf('meta_') === 0) {
        metadata[key] = value;
      }
    });
    
    wx.getStorageSync.mockImplementation(function(key) {
      if (key.indexOf('meta_') === 0) {
        return metadata[key];
      }
      return null;
    });
    
    // 存储带元数据的项目
    manager.setItem('test_meta', testData.basic, {
      metadata: {
        priority: 'high',
        category: 'test'
      }
    });
    
    // 获取元数据
    var itemMeta = manager._getItemMetadata('test_meta');
    expect(itemMeta.priority).toBe('high');
    expect(itemMeta.category).toBe('test');
  });
  
  test('命名空间隔离功能正常工作', function() {
    // 设置不同命名空间的数据
    manager.setItem('shared_key', 'default_namespace_value');
    
    var ns1 = manager.namespace('ns1');
    ns1.setItem('shared_key', 'ns1_value');
    
    var ns2 = manager.namespace('ns2');
    ns2.setItem('shared_key', 'ns2_value');
    
    // 验证数据隔离
    expect(manager.getItem('shared_key')).toBe('default_namespace_value');
    expect(ns1.getItem('shared_key')).toBe('ns1_value');
    expect(ns2.getItem('shared_key')).toBe('ns2_value');
  });
});

describe('存储管理器高级功能测试', function() {
  var manager;
  
  beforeEach(function() {
    jest.clearAllMocks();
    manager = new storageManager({
      autoCleanup: true,
      expiryCheckEnabled: true,
      cleanupStrategy: 'composite'
    });
    
    // 模拟存储信息
    wx.getStorageInfoSync.mockReturnValue({
      keys: ['key1', 'key2', 'key3', 'key4', 'key5'],
      currentSize: 8 * 1024 * 1024, // 8MB
      limitSize: 10 * 1024 * 1024  // 10MB
    });
  });
  
  test('存储配额监控功能正常工作', function() {
    // 模拟内部方法
    manager._checkStorageStatus = jest.fn();
    manager._cleanupStorage = jest.fn().mockResolvedValue(1024 * 1024); // 清理1MB
    
    // 触发配额检查
    manager._checkStorageQuota();
    
    // 验证是否检查了存储状态
    expect(manager._checkStorageStatus).toHaveBeenCalled();
  });
  
  test('过期数据清理功能正常工作', function() {
    // 模拟已过期的数据
    manager._getNamespaceMetadata = jest.fn().mockReturnValue({
      'expired_key': {
        data: 'expired value',
        metadata: {
          expiry: Date.now() - 10000, // 已过期
          size: 100
        }
      }
    });
    manager._saveNamespaceMetadata = jest.fn();
    manager._getAdapter().removeItem = jest.fn();
    
    // 运行过期检查
    manager._checkExpiredItems();
    
    // 验证过期项是否被移除
    expect(manager._getAdapter().removeItem).toHaveBeenCalled();
  });
  
  test('加密存储功能正常工作', function() {
    // 创建带加密的存储管理器
    var encryptedManager = new storageManager({
      encryption: {
        enabled: true,
        keyMode: 'fixed'
      }
    });
    
    // 模拟加密操作
    encryptedManager._encryptData = jest.fn().mockReturnValue({
      isEncrypted: true,
      data: 'encrypted_data'
    });
    
    encryptedManager._decryptData = jest.fn().mockReturnValue(testData.basic);
    
    // 存储数据
    encryptedManager.setItem('encrypted_key', testData.basic);
    
    // 验证是否加密了数据
    expect(encryptedManager._encryptData).toHaveBeenCalled();
  });
}); 