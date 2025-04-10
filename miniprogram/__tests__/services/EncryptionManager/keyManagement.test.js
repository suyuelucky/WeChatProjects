/**
 * EncryptionManager密钥管理测试
 * 
 * 创建时间: 2025-04-09 15:18:40 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 测试文件
 */

// 引入测试框架
var assert = require('../../mocks/assert.mock');
var wxMock = require('../../mocks/wx.mock');
var EncryptionManager = require('../../../services/security/EncryptionManager');

// 测试套件
describe('EncryptionManager - 密钥管理测试', function() {
  
  // 初始化测试环境
  beforeEach(function() {
    // 重置wx Mock
    wxMock.resetMock();
    
    // 初始化加密管理器
    EncryptionManager.init({
      storage: wxMock.storage
    });
  });
  
  /**
   * 测试密钥生成功能
   * @category 功能测试
   * @priority P0
   */
  test('test_key_generation', function() {
    // 1. 测试生成随机盐值
    var salt1 = EncryptionManager.generateSalt();
    var salt2 = EncryptionManager.generateSalt();
    
    // 验证生成的盐值不为空
    assert.isNotNull(salt1);
    assert.isNotNull(salt2);
    
    // 验证随机性（两次生成的盐值不同）
    assert.notEquals(salt1, salt2);
    
    // 验证盐值长度符合要求
    assert.isTrue(salt1.length >= 16, '盐值长度应至少为16个字符');
    
    // 2. 测试从数据派生密钥
    var key1 = EncryptionManager.generateKeyFromData('test-data-source');
    var key2 = EncryptionManager.generateKeyFromData('different-data-source');
    
    // 验证派生密钥不为空
    assert.isNotNull(key1);
    assert.isNotNull(key2);
    
    // 验证不同数据源派生的密钥不同
    assert.notEquals(key1, key2);
    
    // 验证相同数据源派生的密钥相同（确定性）
    var key1Repeat = EncryptionManager.generateKeyFromData('test-data-source');
    assert.equals(key1, key1Repeat);
    
    // 验证密钥长度符合要求
    assert.isTrue(key1.length >= 32, '生成的密钥长度应至少为32个字符');
  });
  
  /**
   * 测试主密钥管理
   * @category 安全测试
   * @priority P0
   */
  test('test_master_key_management', function() {
    // 1. 验证主密钥已在初始化时生成
    var masterKeyInfo = wxMock.getStorageSync('master_key_info');
    assert.isNotNull(masterKeyInfo, '主密钥信息应存储在storage中');
    assert.isNotNull(masterKeyInfo.salt, '主密钥信息应包含盐值');
    assert.isNotNull(masterKeyInfo.created, '主密钥信息应包含创建时间');
    
    // 2. 测试内部获取主密钥方法
    var masterKey = EncryptionManager._getMasterKey();
    assert.isNotNull(masterKey, '应能获取主密钥');
    assert.isTrue(masterKey.length >= 32, '主密钥长度应至少为32个字符');
    
    // 3. 测试主密钥缓存机制
    // 修改存储中的主密钥信息
    var originalInfo = masterKeyInfo;
    var modifiedInfo = {
      salt: EncryptionManager.generateSalt(),
      created: Date.now(),
      version: 2
    };
    wxMock.setStorageSync('master_key_info', modifiedInfo);
    
    // 尝试再次获取主密钥，应返回缓存的值
    var cachedKey = EncryptionManager._getMasterKey();
    assert.equals(cachedKey, masterKey, '应返回缓存的主密钥');
    
    // 重新初始化管理器，清除缓存
    EncryptionManager.init({
      storage: wxMock.storage
    });
    
    // 现在应该生成新的主密钥基于修改后的信息
    var newKey = EncryptionManager._getMasterKey();
    assert.notEquals(newKey, masterKey, '主密钥应基于新的盐值重新生成');
    
    // 恢复原始状态
    wxMock.setStorageSync('master_key_info', originalInfo);
  });
  
  /**
   * 测试密钥派生与Salt管理
   * @category 功能测试
   * @priority P0
   */
  test('test_key_derivation_with_salt', function() {
    // 1. 测试使用相同的数据和盐值派生一致的密钥
    var dataSeed = 'test-derivation-data';
    var salt = EncryptionManager.generateSalt();
    
    var key1 = EncryptionManager.deriveKeyFromDataAndSalt(dataSeed, salt);
    var key2 = EncryptionManager.deriveKeyFromDataAndSalt(dataSeed, salt);
    
    // 相同数据和盐应产生相同密钥
    assert.equals(key1, key2);
    
    // 2. 测试使用不同的盐值派生不同的密钥
    var differentSalt = EncryptionManager.generateSalt();
    var key3 = EncryptionManager.deriveKeyFromDataAndSalt(dataSeed, differentSalt);
    
    // 不同盐值应产生不同密钥
    assert.notEquals(key1, key3);
    
    // 3. 测试密钥迭代次数影响
    var keyDefaultIter = EncryptionManager.deriveKeyFromDataAndSalt(dataSeed, salt);
    var keyHigherIter = EncryptionManager.deriveKeyFromDataAndSalt(dataSeed, salt, {
      iterations: 20000 // 默认为10000
    });
    
    // 不同迭代次数应产生不同密钥
    assert.notEquals(keyDefaultIter, keyHigherIter);
  });
  
  /**
   * 测试密钥安全存储
   * @category 安全测试
   * @priority P0
   */
  test('test_secure_key_storage', function() {
    // 1. 测试安全存储派生密钥
    var keyId = 'test-secure-key-id';
    var keyData = 'very-sensitive-key-material';
    
    // 安全存储密钥
    EncryptionManager.storeSecureKey(keyId, keyData);
    
    // 验证密钥不是明文存储的
    var rawStoredData = wxMock.getStorageSync(EncryptionManager.config.keyPrefix + keyId);
    assert.isNotNull(rawStoredData, '密钥应已存储');
    assert.notIncludes(rawStoredData, keyData, '密钥不应明文存储');
    
    // 2. 测试安全检索密钥
    var retrievedKey = EncryptionManager.getSecureKey(keyId);
    assert.equals(retrievedKey, keyData, '应能正确检索存储的密钥');
    
    // 3. 测试密钥删除
    EncryptionManager.deleteSecureKey(keyId);
    var keyAfterDeletion = wxMock.getStorageSync(EncryptionManager.config.keyPrefix + keyId);
    assert.isNull(keyAfterDeletion, '密钥应已被删除');
    
    // 4. 验证检索不存在的密钥会失败
    var hasError = false;
    try {
      EncryptionManager.getSecureKey('non-existent-key-id');
    } catch (error) {
      hasError = true;
      assert.includes(error.message.toLowerCase(), 'key');
    }
    assert.isTrue(hasError, '检索不存在的密钥应抛出错误');
  });
  
  /**
   * 测试密钥轮换
   * @category 安全测试
   * @priority P1
   */
  test('test_key_rotation', function() {
    // 1. 初始设置测试数据和密钥
    var testData = 'This is sensitive data that will survive key rotation';
    var keyId = 'rotation-test-key';
    var initialKey = '0123456789abcdef0123456789abcdef';
    
    // 2. 存储密钥并使用其加密数据
    EncryptionManager.storeSecureKey(keyId, initialKey);
    var encryptedData = EncryptionManager.encrypt(testData, {
      key: initialKey
    });
    
    // 3. 执行密钥轮换
    var newKey = 'fedcba9876543210fedcba9876543210';
    EncryptionManager.rotateKey(keyId, newKey);
    
    // 4. 验证新密钥已存储
    var storedKey = EncryptionManager.getSecureKey(keyId);
    assert.equals(storedKey, newKey, '密钥轮换后应存储新密钥');
    
    // 5. 验证旧密钥已彻底删除
    var oldKeyExists = false;
    try {
      // 尝试查找旧密钥的痕迹
      var allStorage = wxMock.getAllStorage();
      for (var key in allStorage) {
        if (typeof allStorage[key] === 'string' && allStorage[key].includes(initialKey)) {
          oldKeyExists = true;
          break;
        }
      }
    } catch (e) {
      // 忽略错误
    }
    assert.isFalse(oldKeyExists, '旧密钥应已彻底删除');
    
    // 6. 验证轮换前加密的数据可以使用新密钥解密
    if (EncryptionManager.supportsKeyRotationWithoutReencryption) {
      var decryptedWithNewKey = EncryptionManager.decrypt(encryptedData, {
        key: newKey
      });
      assert.equals(decryptedWithNewKey, testData, '旧数据应能用新密钥解密');
    }
  });
  
  /**
   * 测试多密钥环境
   * @category 功能测试
   * @priority P1
   */
  test('test_multiple_keys_management', function() {
    // 1. 创建多个密钥
    var keys = {
      'user_data_key': 'key-for-encrypting-user-profile-data-12345',
      'payment_key': 'key-for-encrypting-payment-information-67890',
      'session_key': 'key-for-encrypting-session-data-abcdef'
    };
    
    // 2. 存储所有密钥
    for (var keyId in keys) {
      EncryptionManager.storeSecureKey(keyId, keys[keyId]);
    }
    
    // 3. 检索所有密钥
    for (var keyId in keys) {
      var retrievedKey = EncryptionManager.getSecureKey(keyId);
      assert.equals(retrievedKey, keys[keyId], '应能正确检索密钥: ' + keyId);
    }
    
    // 4. 使用不同密钥加密不同数据
    var userData = JSON.stringify({name: 'Test User', email: 'test@example.com'});
    var paymentData = JSON.stringify({cardNumber: '1234-5678-9012-3456', expiryDate: '12/28'});
    var sessionData = JSON.stringify({userId: 12345, loginTime: Date.now()});
    
    var encryptedUserData = EncryptionManager.encrypt(userData, {
      key: keys.user_data_key
    });
    var encryptedPaymentData = EncryptionManager.encrypt(paymentData, {
      key: keys.payment_key
    });
    var encryptedSessionData = EncryptionManager.encrypt(sessionData, {
      key: keys.session_key
    });
    
    // 5. 验证使用正确密钥可以解密
    var decryptedUserData = EncryptionManager.decrypt(encryptedUserData, {
      key: keys.user_data_key
    });
    var decryptedPaymentData = EncryptionManager.decrypt(encryptedPaymentData, {
      key: keys.payment_key
    });
    var decryptedSessionData = EncryptionManager.decrypt(encryptedSessionData, {
      key: keys.session_key
    });
    
    assert.equals(decryptedUserData, userData);
    assert.equals(decryptedPaymentData, paymentData);
    assert.equals(decryptedSessionData, sessionData);
    
    // 6. 验证使用错误密钥无法解密
    var hasError = false;
    try {
      EncryptionManager.decrypt(encryptedUserData, {
        key: keys.payment_key // 使用错误的密钥
      });
    } catch (error) {
      hasError = true;
    }
    assert.isTrue(hasError, '使用错误密钥应无法解密数据');
  });
  
  /**
   * 测试密钥派生因子的安全性
   * @category 安全测试
   * @priority P1
   */
  test('test_key_derivation_security', function() {
    // 1. 测试设备信息获取
    var deviceInfo = EncryptionManager._getDeviceInfo();
    assert.isNotNull(deviceInfo, '应能获取设备信息');
    assert.isTrue(deviceInfo.length > 10, '设备信息应有足够长度');
    
    // 模拟不同的设备信息
    var originalGetDeviceInfo = EncryptionManager._getDeviceInfo;
    
    // 2. 测试主密钥对设备信息的依赖性
    EncryptionManager._getDeviceInfo = function() {
      return 'different-device-info-for-testing';
    };
    
    // 重新初始化，应生成不同的主密钥
    EncryptionManager.cache = {}; // 清除缓存
    wxMock.removeStorageSync('master_key_info');
    EncryptionManager.init({
      storage: wxMock.storage
    });
    
    var differentDeviceKey = EncryptionManager._getMasterKey();
    
    // 恢复原始方法
    EncryptionManager._getDeviceInfo = originalGetDeviceInfo;
    
    // 重新初始化，应回到原始主密钥
    EncryptionManager.cache = {}; // 清除缓存
    wxMock.removeStorageSync('master_key_info');
    EncryptionManager.init({
      storage: wxMock.storage
    });
    
    var originalDeviceKey = EncryptionManager._getMasterKey();
    
    // 验证不同设备信息生成不同的主密钥
    assert.notEquals(differentDeviceKey, originalDeviceKey, '不同设备信息应生成不同的主密钥');
  });
}); 