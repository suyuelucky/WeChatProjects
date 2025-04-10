/**
 * StorageManager基本测试
 * 
 * 创建时间: 2025-04-09 12:30:22 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 测试文件
 */

// 引入测试框架
var assert = require('../../mocks/assert.mock');
var wxMock = require('../../mocks/wx.mock');
var StorageManager = require('../../../services/storage/StorageManager');
var EncryptionManager = require('../../../services/security/EncryptionManager');

/**
 * 测试套件：StorageManager - 基本功能测试
 * 测试安全存储管理器的基本功能
 */
describe('StorageManager - 基本功能测试', function() {
  
  /**
   * 在每个测试前重置环境
   */
  beforeEach(function() {
    // 重置wx Mock
    wxMock.resetMock();
    
    // 初始化加密管理器
    EncryptionManager.init({
      storage: wxMock.storage
    });
    
    // 初始化存储管理器
    StorageManager.init({
      prefix: 'test_',
      storage: wxMock.storage
    });
  });
  
  /**
   * 测试初始化
   * @category 功能测试
   * @priority P0
   */
  test('test_initialization', function() {
    // 验证管理器状态
    assert.isTrue(StorageManager._state.initialized);
    
    // 测试自定义配置
    var customManager = Object.create(StorageManager);
    customManager.init({
      prefix: 'custom_',
      encryptByDefault: false,
      defaultSecurityLevel: 2
    });
    
    assert.equals(customManager.config.prefix, 'custom_');
    assert.isFalse(customManager.config.encryptByDefault);
    assert.equals(customManager.config.defaultSecurityLevel, 2);
  });
  
  /**
   * 测试基本存储和检索
   * @category 功能测试
   * @priority P0
   */
  test('test_basic_set_get', function() {
    // 测试数据
    var testData = {
      name: 'Test User',
      id: 12345,
      email: 'test@example.com'
    };
    
    // 存储数据
    var success = StorageManager.secureSet('user_profile', testData);
    assert.isTrue(success);
    
    // 检索数据
    var retrievedData = StorageManager.secureGet('user_profile');
    
    // 验证数据完整性
    assert.isNotNull(retrievedData);
    assert.equals(retrievedData.name, testData.name);
    assert.equals(retrievedData.id, testData.id);
    assert.equals(retrievedData.email, testData.email);
    
    // 检查存储细节
    var fullKey = StorageManager._getFullStorageKey('user_profile');
    var rawStored = wxMock.getStorageSync(fullKey);
    
    // 验证数据已加密（默认应加密）
    assert.isTrue(typeof rawStored === 'string');
    assert.notIncludes(rawStored, 'Test User');
  });
  
  /**
   * 测试数据删除
   * @category 功能测试
   * @priority P0
   */
  test('test_data_removal', function() {
    // 存储测试数据
    StorageManager.secureSet('test_item', { value: 'to be deleted' });
    
    // 验证数据已存储
    var beforeRemoval = StorageManager.secureGet('test_item');
    assert.isNotNull(beforeRemoval);
    
    // 删除数据
    var removed = StorageManager.remove('test_item');
    assert.isTrue(removed);
    
    // 验证数据已删除
    var afterRemoval = StorageManager.secureGet('test_item');
    assert.isNull(afterRemoval);
  });
  
  /**
   * 测试不同安全级别
   * @category 功能测试
   * @priority P1
   */
  test('test_security_levels', function() {
    // 临时数据 - 安全级别0
    StorageManager.secureSet('temp_data', { value: 'temporary' }, {
      securityLevel: StorageManager.config.securityLevels.TEMPORARY,
      encrypt: false
    });
    
    // 标准数据 - 安全级别1
    StorageManager.secureSet('standard_data', { value: 'standard' }, {
      securityLevel: StorageManager.config.securityLevels.STANDARD
    });
    
    // 敏感数据 - 安全级别2
    StorageManager.secureSet('sensitive_data', { value: 'sensitive' }, {
      securityLevel: StorageManager.config.securityLevels.SENSITIVE
    });
    
    // 高敏感数据 - 安全级别3
    StorageManager.secureSet('highly_sensitive', { value: 'top secret' }, {
      securityLevel: StorageManager.config.securityLevels.HIGHLY_SENSITIVE
    });
    
    // 验证所有数据都能正确检索
    assert.equals(StorageManager.secureGet('temp_data').value, 'temporary');
    assert.equals(StorageManager.secureGet('standard_data').value, 'standard');
    assert.equals(StorageManager.secureGet('sensitive_data').value, 'sensitive');
    assert.equals(StorageManager.secureGet('highly_sensitive').value, 'top secret');
    
    // 验证不同安全级别的存储键
    var tempKey = StorageManager._getFullStorageKey('temp_data', { securityLevel: 0 });
    var standardKey = StorageManager._getFullStorageKey('standard_data', { securityLevel: 1 });
    var sensitiveKey = StorageManager._getFullStorageKey('sensitive_data', { securityLevel: 2 });
    var highlyKey = StorageManager._getFullStorageKey('highly_sensitive', { securityLevel: 3 });
    
    // 验证键格式正确（包含安全级别）
    assert.includes(tempKey, 's0_');
    assert.includes(standardKey, 's1_');
    assert.includes(sensitiveKey, 's2_');
    assert.includes(highlyKey, 's3_');
    
    // 验证敏感数据即使设置不加密也会强制加密
    var tempRaw = wxMock.getStorageSync(tempKey);
    var sensitiveRaw = wxMock.getStorageSync(sensitiveKey);
    
    // 临时数据应为非加密格式
    assert.includes(tempRaw, 'temporary');
    
    // 敏感数据应为加密格式
    assert.notIncludes(sensitiveRaw, 'sensitive');
  });
  
  /**
   * 测试数据查询
   * @category 功能测试
   * @priority P1
   */
  test('test_data_query', function() {
    // 准备测试数据
    StorageManager.secureSet('user1', { id: 1, name: 'Alice', role: 'admin', active: true }, {
      tags: ['user', 'admin']
    });
    
    StorageManager.secureSet('user2', { id: 2, name: 'Bob', role: 'user', active: true }, {
      tags: ['user']
    });
    
    StorageManager.secureSet('user3', { id: 3, name: 'Charlie', role: 'user', active: false }, {
      tags: ['user', 'inactive']
    });
    
    StorageManager.secureSet('config1', { setting: 'display', value: 'dark' }, {
      tags: ['config', 'ui']
    });
    
    // 1. 查询所有用户（键名匹配）
    var users = StorageManager.query({
      keyPattern: '^user'
    });
    
    assert.equals(users.length, 3);
    
    // 2. 查询带特定标签的数据
    var admins = StorageManager.query({
      tags: ['admin']
    }, { includeContent: true });
    
    assert.equals(admins.length, 1);
    assert.equals(admins[0].data.name, 'Alice');
    
    // 3. 查询特定内容的数据
    var activeUsers = StorageManager.query({
      contentMatch: { active: true }
    }, { includeContent: true });
    
    assert.equals(activeUsers.length, 2);
    
    // 4. 组合查询
    var activeAdmins = StorageManager.query({
      tags: ['user'],
      contentMatch: { role: 'admin', active: true }
    });
    
    assert.equals(activeAdmins.length, 1);
  });
  
  /**
   * 测试存储信息统计
   * @category 功能测试
   * @priority P2
   */
  test('test_storage_info', function() {
    // 添加一些测试数据
    for (var i = 0; i < 5; i++) {
      StorageManager.secureSet('item' + i, { value: 'test' + i }, {
        securityLevel: i % 4
      });
    }
    
    // 获取存储信息
    var info = StorageManager.getStorageInfo();
    
    // 验证基本信息
    assert.isNotNull(info);
    assert.isTrue(info.customItems >= 5);
    
    // 验证安全级别统计
    var totalSecurityItems = 
      info.securityLevelCounts[0] + 
      info.securityLevelCounts[1] + 
      info.securityLevelCounts[2] + 
      info.securityLevelCounts[3];
    
    assert.isTrue(totalSecurityItems >= 5);
  });
}); 