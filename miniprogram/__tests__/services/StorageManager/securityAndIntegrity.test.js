/**
 * StorageManager安全性与完整性测试
 * 
 * 创建时间: 2025-04-09 15:45:18 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 测试文件
 */

// 引入测试框架
var assert = require('../../mocks/assert.mock');
var wxMock = require('../../mocks/wx.mock');
var StorageManager = require('../../../services/storage/StorageManager');
var EncryptionManager = require('../../../services/security/EncryptionManager');

/**
 * 测试套件：StorageManager - 安全性与完整性测试
 * 测试存储管理器的安全特性、加密机制和数据完整性
 */
describe('StorageManager - 安全性与完整性测试', function() {
  
  /**
   * 在每个测试前重置环境
   */
  beforeEach(function() {
    // 重置wx Mock
    wxMock.resetMock();
    
    // 初始化加密管理器
    EncryptionManager.init({
      storage: wxMock.storage,
      enableIntegrityVerification: true
    });
    
    // 初始化存储管理器，启用全部安全功能
    StorageManager.init({
      prefix: 'sec_test_',
      storage: wxMock.storage,
      defaultSecurityLevel: 3, // 最高安全级别
      enableSecureRead: true,
      enableSecureWrite: true
    });
  });
  
  /**
   * 测试加密存储
   * @category 安全测试
   * @priority P0
   */
  test('test_encrypted_storage', function() {
    // 准备测试数据
    var sensitiveData = {
      username: 'testuser',
      password: 'p@$$w0rd123',
      creditCard: '1234-5678-9012-3456',
      securityQuestion: 'What is your first pet\'s name?',
      securityAnswer: 'Fluffy'
    };
    
    // 使用加密存储敏感数据
    StorageManager.secureSet('user_sensitive_data', sensitiveData, {
      securityLevel: 3 // 最高安全级别
    });
    
    // 获取加密后的原始存储内容
    var rawStorage = wxMock.getStorageDirectly('sec_test_user_sensitive_data');
    
    // 验证存储的数据是加密的
    assert.isTrue(typeof rawStorage === 'string');
    assert.isFalse(rawStorage.includes('testuser'));
    assert.isFalse(rawStorage.includes('p@$$w0rd123'));
    assert.isFalse(rawStorage.includes('1234-5678-9012-3456'));
    
    // 验证通过正确方法可以解密并获取
    var retrievedData = StorageManager.secureGet('user_sensitive_data');
    assert.equals(retrievedData.username, 'testuser');
    assert.equals(retrievedData.password, 'p@$$w0rd123');
    assert.equals(retrievedData.creditCard, '1234-5678-9012-3456');
  });
  
  /**
   * 测试安全级别控制
   * @category 安全测试
   * @priority P1
   */
  test('test_security_levels', function() {
    // 准备不同安全级别的数据
    var publicData = { name: 'Public Data', value: 'This is public' };
    var internalData = { name: 'Internal Data', value: 'For internal use' };
    var confidentialData = { name: 'Confidential', value: 'Restricted access' };
    var secretData = { name: 'Secret', value: 'Top secret information' };
    
    // 存储不同安全级别的数据
    StorageManager.secureSet('level0_data', publicData, { securityLevel: 0 });
    StorageManager.secureSet('level1_data', internalData, { securityLevel: 1 });
    StorageManager.secureSet('level2_data', confidentialData, { securityLevel: 2 });
    StorageManager.secureSet('level3_data', secretData, { securityLevel: 3 });
    
    // 获取原始存储数据
    var rawLevel0 = wxMock.getStorageDirectly('sec_test_level0_data');
    var rawLevel1 = wxMock.getStorageDirectly('sec_test_level1_data');
    var rawLevel2 = wxMock.getStorageDirectly('sec_test_level2_data');
    var rawLevel3 = wxMock.getStorageDirectly('sec_test_level3_data');
    
    // 验证安全级别0（无加密）
    assert.isTrue(rawLevel0.includes('Public Data'));
    
    // 验证安全级别1-3（递增加密强度）
    assert.isFalse(rawLevel1.includes('Internal Data'));
    assert.isFalse(rawLevel2.includes('Confidential'));
    assert.isFalse(rawLevel3.includes('Secret'));
    
    // 获取加密强度信息
    var level1Info = JSON.parse(EncryptionManager.decryptData(rawLevel1));
    var level2Info = JSON.parse(EncryptionManager.decryptData(rawLevel2));
    var level3Info = JSON.parse(EncryptionManager.decryptData(rawLevel3));
    
    // 验证加密算法复杂度随安全级别提高
    assert.isTrue(level1Info.encryptionInfo.iterations < level2Info.encryptionInfo.iterations);
    assert.isTrue(level2Info.encryptionInfo.iterations < level3Info.encryptionInfo.iterations);
  });
  
  /**
   * 测试数据完整性验证
   * @category 安全测试
   * @priority P0
   */
  test('test_data_integrity', function() {
    // 准备测试数据
    var criticalData = {
      id: 'critical_record_123',
      value: 1000,
      isVerified: true,
      owner: 'system'
    };
    
    // 存储带数据完整性签名的数据
    StorageManager.secureSet('integrity_test', criticalData, {
      securityLevel: 3,
      enableIntegrityCheck: true
    });
    
    // 获取原始存储数据
    var rawData = wxMock.getStorageDirectly('sec_test_integrity_test');
    
    // 修改原始数据以模拟篡改
    var tamperedData = rawData.replace(/"value":1000/, '"value":9999');
    wxMock.setStorageDirectly('sec_test_integrity_test', tamperedData);
    
    // 尝试获取被篡改的数据
    var retrievedData = StorageManager.secureGet('integrity_test');
    
    // 数据完整性检查应该失败，返回null
    assert.isNull(retrievedData);
    
    // 验证错误日志
    var logEntries = wxMock.getLogEntries();
    var integrityErrorLog = logEntries.find(entry => 
      entry.includes('数据完整性验证失败') || 
      entry.includes('Data integrity verification failed'));
    
    assert.isNotUndefined(integrityErrorLog);
  });
  
  /**
   * 测试防止键值枚举
   * @category 安全测试
   * @priority P1
   */
  test('test_key_enumeration_protection', function() {
    // 存储敏感数据与正常数据
    StorageManager.secureSet('user_profile', { name: 'Test User' }, { securityLevel: 0 });
    StorageManager.secureSet('api_key', { key: 'sk_test_123456789' }, { securityLevel: 3 });
    StorageManager.secureSet('auth_token', { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' }, { securityLevel: 3 });
    
    // 获取存储的所有键
    var allKeys = wxMock.getStorageInfo().keys;
    
    // 验证高安全级别的键名已被混淆
    assert.isTrue(allKeys.includes('sec_test_user_profile'));
    
    // 高安全级别的键不应直接使用原名
    assert.isFalse(allKeys.includes('sec_test_api_key'));
    assert.isFalse(allKeys.includes('sec_test_auth_token'));
    
    // 高安全级别的键应使用哈希值
    var hasObfuscatedKeys = allKeys.some(key => 
      key.startsWith('sec_test_') && 
      key.length > 30 && 
      !['user_profile', 'api_key', 'auth_token'].some(name => key.includes(name))
    );
    
    assert.isTrue(hasObfuscatedKeys);
    
    // 通过StorageManager可以正确获取数据
    var apiKeyData = StorageManager.secureGet('api_key');
    var authTokenData = StorageManager.secureGet('auth_token');
    
    assert.equals(apiKeyData.key, 'sk_test_123456789');
    assert.equals(authTokenData.token, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  });
  
  /**
   * 测试安全清除
   * @category 安全测试
   * @priority P0
   */
  test('test_secure_data_removal', function() {
    // 准备测试数据
    var sensitiveData = { 
      key: 'very_sensitive_key_12345',
      value: 'extremely_sensitive_value'
    };
    
    // 存储敏感数据
    StorageManager.secureSet('data_to_remove', sensitiveData, { securityLevel: 3 });
    
    // 确认数据已存储
    var storedData = StorageManager.secureGet('data_to_remove');
    assert.isNotNull(storedData);
    
    // 安全清除敏感数据
    var clearResult = StorageManager.secureRemove('data_to_remove', { secureClear: true });
    assert.isTrue(clearResult);
    
    // 验证内存中无法获取数据
    var removedData = StorageManager.secureGet('data_to_remove');
    assert.isNull(removedData);
    
    // 验证存储中确实移除
    var keys = wxMock.getStorageInfo().keys;
    var hasKey = keys.some(key => 
      key === 'sec_test_data_to_remove' || 
      (key.startsWith('sec_test_') && key.includes('data_to_remove'))
    );
    
    assert.isFalse(hasKey);
    
    // 验证存储历史中的数据也被安全清除
    var storageHistory = wxMock.getStorageHistory();
    var foundInHistory = false;
    
    for (var i = 0; i < storageHistory.length; i++) {
      var entry = storageHistory[i];
      if (entry.key.includes('data_to_remove') && 
          (entry.value.includes('very_sensitive_key_12345') || 
           entry.value.includes('extremely_sensitive_value'))) {
        foundInHistory = true;
        break;
      }
    }
    
    assert.isFalse(foundInHistory, '敏感数据应该从存储历史中完全清除');
  });
  
  /**
   * 测试安全备份与恢复
   * @category 安全测试
   * @priority P2
   */
  test('test_secure_backup_restore', function() {
    // 准备各种安全级别的测试数据
    var testData = [
      { key: 'backup_level0', data: { id: 0, value: 'Public' }, level: 0 },
      { key: 'backup_level1', data: { id: 1, value: 'Internal' }, level: 1 },
      { key: 'backup_level2', data: { id: 2, value: 'Confidential' }, level: 2 },
      { key: 'backup_level3', data: { id: 3, value: 'Secret' }, level: 3 }
    ];
    
    // 存储测试数据
    testData.forEach(item => {
      StorageManager.secureSet(item.key, item.data, { securityLevel: item.level });
    });
    
    // 创建安全备份
    var backupResult = StorageManager.createSecureBackup({
      password: 'backup_password_123',
      includeLevels: [0, 1, 2, 3]
    });
    
    assert.isTrue(backupResult.success);
    assert.isString(backupResult.backupData);
    assert.isNumber(backupResult.itemCount);
    assert.equals(backupResult.itemCount, 4);
    
    // 验证备份数据是加密的
    assert.isFalse(backupResult.backupData.includes('Public'));
    assert.isFalse(backupResult.backupData.includes('Internal'));
    assert.isFalse(backupResult.backupData.includes('Confidential'));
    assert.isFalse(backupResult.backupData.includes('Secret'));
    
    // 清除所有数据
    StorageManager.clear();
    
    // 验证数据已清除
    testData.forEach(item => {
      var data = StorageManager.secureGet(item.key);
      assert.isNull(data);
    });
    
    // 恢复备份
    var restoreResult = StorageManager.restoreFromBackup({
      backupData: backupResult.backupData,
      password: 'backup_password_123'
    });
    
    assert.isTrue(restoreResult.success);
    assert.equals(restoreResult.itemCount, 4);
    
    // 验证数据已恢复
    testData.forEach(item => {
      var restoredData = StorageManager.secureGet(item.key);
      assert.isNotNull(restoredData);
      assert.equals(restoredData.id, item.data.id);
      assert.equals(restoredData.value, item.data.value);
    });
    
    // 测试使用错误密码恢复
    StorageManager.clear();
    var failedRestoreResult = StorageManager.restoreFromBackup({
      backupData: backupResult.backupData,
      password: 'wrong_password'
    });
    
    assert.isFalse(failedRestoreResult.success);
    
    // 验证数据未恢复
    testData.forEach(item => {
      var data = StorageManager.secureGet(item.key);
      assert.isNull(data);
    });
  });
  
  /**
   * 测试防篡改机制
   * @category 安全测试
   * @priority P0
   */
  test('test_tamper_protection', function() {
    // 准备测试数据
    var criticalConfig = {
      apiEndpoint: 'https://api.example.com/v1',
      debugMode: false,
      maxRetries: 3,
      timeout: 5000,
      securityLevel: 'high'
    };
    
    // 存储关键配置
    StorageManager.secureSet('app_config', criticalConfig, {
      securityLevel: 3,
      enableIntegrityCheck: true,
      tamperProtection: true
    });
    
    // 获取存储的原始数据
    var rawData = wxMock.getStorageDirectly('sec_test_app_config');
    
    // 模拟篡改：修改配置启用调试模式和降低安全级别
    var tamperedConfig = JSON.parse(EncryptionManager.decryptData(rawData));
    tamperedConfig.data.debugMode = true;
    tamperedConfig.data.securityLevel = 'low';
    
    // 重新加密但不更新签名，模拟篡改
    var tamperedEncrypted = EncryptionManager.encryptData(JSON.stringify(tamperedConfig.data));
    var tamperedFull = JSON.stringify({
      ...tamperedConfig,
      data: tamperedEncrypted,
      // 保持原有签名不变，这将导致完整性检查失败
    });
    
    wxMock.setStorageDirectly('sec_test_app_config', tamperedFull);
    
    // 尝试获取被篡改的数据
    var retrievedConfig = StorageManager.secureGet('app_config');
    
    // 应该检测到篡改并返回null
    assert.isNull(retrievedConfig);
    
    // 检查是否记录了篡改尝试
    var securityEvent = StorageManager.getSecurityEvents().find(event => 
      event.type === 'TAMPERING_ATTEMPT' && 
      event.key.includes('app_config')
    );
    
    assert.isNotUndefined(securityEvent);
    assert.equals(securityEvent.severity, 'critical');
  });
}); 