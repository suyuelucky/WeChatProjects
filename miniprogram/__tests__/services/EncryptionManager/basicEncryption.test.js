/**
 * EncryptionManager基础加密解密功能测试
 * 
 * 创建时间: 2025-04-09 11:27:24 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 测试文件
 */

// 引入测试框架
var assert = require('../../mocks/assert.mock');
var EncryptionManager = require('../../../services/security/EncryptionManager');

// 测试套件
describe('EncryptionManager - 基础加密解密功能测试', function() {
  
  // 初始化测试环境
  beforeEach(function() {
    // 在每个测试用例执行前重置加密管理器状态
    EncryptionManager.init({
      defaultAlgorithm: 'AES-256-CTR',
      useCompression: false,
      securityLevel: 'high'
    });
  });
  
  /**
   * 测试基本字符串加密解密功能
   * @category 功能测试
   * @priority P0
   */
  test('test_basic_string_encryption_decryption', function() {
    // 1. 准备测试数据
    var plaintext = "这是一个测试字符串ABC123!@#";
    
    // 2. 执行加密操作
    var encryptedData = EncryptionManager.encrypt(plaintext);
    
    // 3. 验证加密结果不等于原始数据
    assert.notEquals(plaintext, encryptedData);
    
    // 4. 执行解密操作
    var decryptedData = EncryptionManager.decrypt(encryptedData);
    
    // 5. 验证解密后数据与原始数据一致
    assert.equals(plaintext, decryptedData);
  });
  
  /**
   * 测试JSON对象加密解密功能
   * @category 功能测试
   * @priority P0
   */
  test('test_json_object_encryption_decryption', function() {
    // 1. 准备测试数据
    var testData = { 
      id: 1001, 
      name: "测试数据", 
      sensitive: true,
      nested: {
        field1: "内嵌字段",
        field2: 42
      }
    };
    
    // 2. 执行加密操作
    var encryptedData = EncryptionManager.encrypt(testData);
    
    // 3. 验证加密结果不等于原始数据
    assert.notEquals(JSON.stringify(testData), encryptedData);
    
    // 4. 执行解密操作
    var decryptedData = EncryptionManager.decrypt(encryptedData);
    
    // 5. 验证解密后数据与原始数据一致
    assert.deepEquals(testData, decryptedData);
  });
  
  /**
   * 测试加密选项配置
   * @category 功能测试
   * @priority P1
   */
  test('test_encryption_with_options', function() {
    // 1. 准备测试数据
    var testData = "测试加密选项";
    
    // 2. 使用特定选项执行加密
    var encryptedData1 = EncryptionManager.encrypt(testData, {
      algorithm: 'AES-256-CTR'
    });
    
    var encryptedData2 = EncryptionManager.encrypt(testData, {
      algorithm: 'AES-256-GCM',
      additionalAuthenticatedData: '身份认证数据'
    });
    
    // 3. 验证不同选项下的加密结果不同
    assert.notEquals(encryptedData1, encryptedData2);
    
    // 4. 使用对应选项解密并验证
    var decryptedData1 = EncryptionManager.decrypt(encryptedData1, {
      algorithm: 'AES-256-CTR'
    });
    
    var decryptedData2 = EncryptionManager.decrypt(encryptedData2, {
      algorithm: 'AES-256-GCM',
      additionalAuthenticatedData: '身份认证数据'
    });
    
    // 5. 验证解密正确
    assert.equals(testData, decryptedData1);
    assert.equals(testData, decryptedData2);
  });
  
  /**
   * 测试空值和边界情况
   * @category 边界测试
   * @priority P1
   */
  test('test_encryption_edge_cases', function() {
    // 1. 空字符串测试
    var emptyString = "";
    var encryptedEmpty = EncryptionManager.encrypt(emptyString);
    var decryptedEmpty = EncryptionManager.decrypt(encryptedEmpty);
    assert.equals(emptyString, decryptedEmpty);
    
    // 2. 空对象测试
    var emptyObject = {};
    var encryptedEmptyObj = EncryptionManager.encrypt(emptyObject);
    var decryptedEmptyObj = EncryptionManager.decrypt(encryptedEmptyObj);
    assert.deepEquals(emptyObject, decryptedEmptyObj);
    
    // 3. null值测试
    try {
      var encryptedNull = EncryptionManager.encrypt(null);
      assert.fail("应该抛出错误但未抛出");
    } catch(error) {
      assert.equals(error.message, "加密数据不能为null或undefined");
    }
  });
  
  /**
   * 测试大数据加密性能
   * @category 性能测试
   * @priority P2
   */
  test('test_large_data_encryption_performance', function() {
    // 1. 准备大量测试数据
    var largeData = generateLargeData(1000); // 生成1000条记录的数据
    
    // 2. 记录开始时间
    var startTime = Date.now();
    
    // 3. 执行加密
    var encryptedLargeData = EncryptionManager.encrypt(largeData);
    
    // 4. 记录加密完成时间
    var encryptionTime = Date.now() - startTime;
    console.log('大数据加密耗时: ' + encryptionTime + 'ms');
    
    // 5. 验证加密时间在可接受范围内
    assert.isTrue(encryptionTime < 200, "大数据加密时间应少于200ms");
    
    // 6. 记录解密开始时间
    startTime = Date.now();
    
    // 7. 执行解密
    var decryptedLargeData = EncryptionManager.decrypt(encryptedLargeData);
    
    // 8. 记录解密完成时间
    var decryptionTime = Date.now() - startTime;
    console.log('大数据解密耗时: ' + decryptionTime + 'ms');
    
    // 9. 验证解密时间在可接受范围内
    assert.isTrue(decryptionTime < 200, "大数据解密时间应少于200ms");
    
    // 10. 验证解密数据正确
    assert.deepEquals(largeData, decryptedLargeData);
  });
});

/**
 * 生成大量测试数据
 * @param {Number} count 记录数量
 * @returns {Array} 测试数据数组
 */
function generateLargeData(count) {
  var result = [];
  for (var i = 0; i < count; i++) {
    result.push({
      id: i,
      name: "测试数据" + i,
      value: "长文本值-".repeat(10) + i,
      timestamp: Date.now(),
      status: i % 2 === 0 ? "active" : "inactive"
    });
  }
  return result;
} 