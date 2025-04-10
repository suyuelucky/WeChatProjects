/**
 * EncryptionManager数据完整性测试
 * 
 * 创建时间: 2025-04-09 15:24:18 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 测试文件
 */

// 引入测试框架
var assert = require('../../mocks/assert.mock');
var wxMock = require('../../mocks/wx.mock');
var EncryptionManager = require('../../../services/security/EncryptionManager');

// 测试套件
describe('EncryptionManager - 数据完整性测试', function() {
  
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
   * 测试基本数据签名功能
   * @category 功能测试
   * @priority P0
   */
  test('test_basic_data_signing', function() {
    // 准备测试数据
    var testData = {
      id: 1001,
      username: 'integrity_test',
      timestamp: Date.now(),
      items: ['item1', 'item2', 'item3']
    };
    
    // 1. 对数据进行签名
    var signedData = EncryptionManager.signData(JSON.stringify(testData));
    
    // 2. 验证签名结果格式正确
    assert.isNotNull(signedData);
    assert.isTrue(typeof signedData === 'object', '签名结果应为对象');
    assert.isNotNull(signedData.data, '签名结果应包含原始数据');
    assert.isNotNull(signedData.signature, '签名结果应包含签名');
    assert.isNotNull(signedData.timestamp, '签名结果应包含时间戳');
    
    // 3. 验证签名有效性
    var isValid = EncryptionManager.verifySignature(signedData);
    assert.isTrue(isValid, '签名应验证有效');
    
    // 4. 解析签名数据并验证内容一致
    var parsedData = JSON.parse(signedData.data);
    assert.equals(parsedData.id, testData.id);
    assert.equals(parsedData.username, testData.username);
    assert.equals(parsedData.items.length, testData.items.length);
  });

  /**
   * 测试数据篡改检测
   * @category 安全测试
   * @priority P0
   */
  test('test_tamper_detection', function() {
    // 准备测试数据
    var testData = {
      id: 2001,
      username: 'tamper_test',
      balance: 1000.00,
      role: 'user'
    };
    
    // 1. 对数据进行签名
    var signedData = EncryptionManager.signData(JSON.stringify(testData));
    assert.isTrue(EncryptionManager.verifySignature(signedData), '原始签名应验证有效');
    
    // 2. 篡改数据测试
    var tamperedData = JSON.parse(JSON.stringify(signedData));
    tamperedData.data = JSON.stringify({
      ...JSON.parse(signedData.data),
      balance: 999999.99, // 篡改余额
      role: 'admin'       // 篡改角色
    });
    
    // 3. 验证篡改数据无法通过签名验证
    var isValid = EncryptionManager.verifySignature(tamperedData);
    assert.isFalse(isValid, '篡改数据应验证失败');
    
    // 4. 篡改签名测试
    var tamperedSignature = JSON.parse(JSON.stringify(signedData));
    tamperedSignature.signature = 'faked_signature_123456789abcdef';
    
    // 5. 验证篡改签名无法通过验证
    isValid = EncryptionManager.verifySignature(tamperedSignature);
    assert.isFalse(isValid, '篡改签名应验证失败');
    
    // 6. 篡改时间戳测试
    var tamperedTimestamp = JSON.parse(JSON.stringify(signedData));
    tamperedTimestamp.timestamp = Date.now() + 1000000; // 修改时间戳
    
    // 7. 验证篡改时间戳无法通过验证
    isValid = EncryptionManager.verifySignature(tamperedTimestamp);
    assert.isFalse(isValid, '篡改时间戳应验证失败');
  });

  /**
   * 测试数据哈希加盐功能
   * @category 安全测试
   * @priority P0
   */
  test('test_salted_hash', function() {
    // 准备测试数据
    var testData = "sensitive_data_123456";
    var salt = "random_salt_value";
    
    // 1. 使用相同的盐值生成哈希
    var hash1 = EncryptionManager.createSaltedHash(testData, salt);
    var hash2 = EncryptionManager.createSaltedHash(testData, salt);
    
    // 2. 验证相同的数据和盐值生成的哈希应该相同
    assert.isNotNull(hash1);
    assert.isNotNull(hash2);
    assert.equals(hash1, hash2, '相同数据和盐值应生成相同哈希');
    
    // 3. 使用不同的盐值生成哈希
    var hash3 = EncryptionManager.createSaltedHash(testData, "different_salt");
    
    // 4. 验证不同的盐值应生成不同的哈希
    assert.notEquals(hash1, hash3, '不同的盐值应生成不同的哈希');
    
    // 5. 验证哈希有效性
    var isValid1 = EncryptionManager.verifySaltedHash(testData, salt, hash1);
    assert.isTrue(isValid1, '哈希验证应成功');
    
    // 6. 验证错误的数据无法通过哈希验证
    var isValid2 = EncryptionManager.verifySaltedHash("wrong_data", salt, hash1);
    assert.isFalse(isValid2, '错误数据验证应失败');
    
    // 7. 验证错误的盐值无法通过哈希验证
    var isValid3 = EncryptionManager.verifySaltedHash(testData, "wrong_salt", hash1);
    assert.isFalse(isValid3, '错误盐值验证应失败');
    
    // 8. 验证自动生成的盐值
    var autoSaltHash = EncryptionManager.createSaltedHash(testData);
    assert.isNotNull(autoSaltHash);
    assert.isTrue(typeof autoSaltHash === 'object', '自动盐值应返回对象');
    assert.isNotNull(autoSaltHash.hash, '应包含哈希值');
    assert.isNotNull(autoSaltHash.salt, '应包含盐值');
    
    // 9. 验证自动生成的盐值哈希有效性
    var isValid4 = EncryptionManager.verifySaltedHash(testData, autoSaltHash.salt, autoSaltHash.hash);
    assert.isTrue(isValid4, '自动盐值哈希验证应成功');
  });
}); 