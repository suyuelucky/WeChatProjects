/**
 * EncryptionManager数据签名与验证功能测试
 * 
 * 创建时间: 2025-04-09 11:27:24 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 测试文件
 */

// 引入测试框架
var assert = require('../../mocks/assert.mock');
var EncryptionManager = require('../../../services/security/EncryptionManager');

// 测试套件
describe('EncryptionManager - 数据签名与验证功能测试', function() {
  
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
   * 测试基本签名与验证功能
   * @category 功能测试
   * @priority P0
   */
  test('test_basic_sign_and_verify', function() {
    // 1. 准备测试数据
    var testData = "需要签名的测试数据";
    
    // 2. 生成签名
    var signature = EncryptionManager.signData(testData);
    
    // 3. 验证签名不为空
    assert.notNull(signature);
    
    // 4. 验证签名有效性
    var isValid = EncryptionManager.verifySignature(testData, signature);
    assert.isTrue(isValid);
    
    // 5. 修改数据后签名应失效
    var modifiedData = testData + " 被篡改";
    var isStillValid = EncryptionManager.verifySignature(modifiedData, signature);
    assert.isFalse(isStillValid);
  });
  
  /**
   * 测试对象数据签名与验证
   * @category 功能测试
   * @priority P0
   */
  test('test_object_sign_and_verify', function() {
    // 1. 准备复杂对象测试数据
    var testObject = {
      id: 1001,
      name: "测试对象",
      details: {
        type: "签名测试",
        timestamp: Date.now()
      },
      tags: ["安全", "加密", "签名"]
    };
    
    // 2. 生成签名
    var signature = EncryptionManager.signData(testObject);
    
    // 3. 验证签名不为空
    assert.notNull(signature);
    
    // 4. 验证签名有效性
    var isValid = EncryptionManager.verifySignature(testObject, signature);
    assert.isTrue(isValid);
    
    // 5. 修改对象后签名应失效
    var clonedObject = JSON.parse(JSON.stringify(testObject));
    clonedObject.name = "被篡改的对象";
    var isStillValid = EncryptionManager.verifySignature(clonedObject, signature);
    assert.isFalse(isStillValid);
  });
  
  /**
   * 测试使用特定密钥进行签名与验证
   * @category 功能测试
   * @priority P1
   */
  test('test_sign_with_specific_key', function() {
    // 1. 生成签名密钥对
    var keyPair = EncryptionManager.generateKey('asymmetric', 2048);
    
    // 2. 准备测试数据
    var testData = "使用特定密钥签名的数据";
    
    // 3. 使用私钥生成签名
    var signature = EncryptionManager.signData(testData, {
      privateKey: keyPair.privateKey
    });
    
    // 4. 使用对应公钥验证签名
    var isValid = EncryptionManager.verifySignature(testData, signature, {
      publicKey: keyPair.publicKey
    });
    assert.isTrue(isValid);
    
    // 5. 使用不同密钥对的公钥验证应失败
    var anotherKeyPair = EncryptionManager.generateKey('asymmetric', 2048);
    var isInvalid = EncryptionManager.verifySignature(testData, signature, {
      publicKey: anotherKeyPair.publicKey
    });
    assert.isFalse(isInvalid);
  });
  
  /**
   * 测试不同签名算法
   * @category 功能测试
   * @priority P1
   */
  test('test_different_signature_algorithms', function() {
    // 1. 准备测试数据
    var testData = "使用不同算法签名的数据";
    
    // 2. 使用RSA-SHA256算法签名
    var rsaSignature = EncryptionManager.signData(testData, {
      algorithm: 'RSA-SHA256'
    });
    
    // 3. 使用ECDSA算法签名
    var ecdsaSignature = EncryptionManager.signData(testData, {
      algorithm: 'ECDSA'
    });
    
    // 4. 验证两种签名不同
    assert.notEquals(rsaSignature, ecdsaSignature);
    
    // 5. 验证两种签名都有效
    var isRsaValid = EncryptionManager.verifySignature(testData, rsaSignature, {
      algorithm: 'RSA-SHA256'
    });
    var isEcdsaValid = EncryptionManager.verifySignature(testData, ecdsaSignature, {
      algorithm: 'ECDSA'
    });
    
    assert.isTrue(isRsaValid);
    assert.isTrue(isEcdsaValid);
    
    // 6. 交叉验证应失败（算法不匹配）
    var crossVerify1 = EncryptionManager.verifySignature(testData, rsaSignature, {
      algorithm: 'ECDSA'
    });
    var crossVerify2 = EncryptionManager.verifySignature(testData, ecdsaSignature, {
      algorithm: 'RSA-SHA256'
    });
    
    assert.isFalse(crossVerify1);
    assert.isFalse(crossVerify2);
  });
  
  /**
   * 测试数据完整性验证
   * @category 安全测试
   * @priority P0
   */
  test('test_data_integrity_verification', function() {
    // 1. 准备测试数据
    var originalData = {
      id: "record-123",
      content: "敏感数据内容",
      timestamp: Date.now()
    };
    
    // 2. 签名并存储
    var signature = EncryptionManager.signData(originalData);
    
    // 模拟存储原始数据和签名
    var storedData = JSON.parse(JSON.stringify(originalData));
    var storedSignature = signature;
    
    // 3. 验证未修改数据的完整性
    var isIntegrityMaintained = EncryptionManager.verifySignature(storedData, storedSignature);
    assert.isTrue(isIntegrityMaintained);
    
    // 4. 模拟数据篡改（各种情况）
    
    // 4.1 修改字段值
    var tamper1 = JSON.parse(JSON.stringify(storedData));
    tamper1.content = "被篡改的内容";
    assert.isFalse(EncryptionManager.verifySignature(tamper1, storedSignature));
    
    // 4.2 添加新字段
    var tamper2 = JSON.parse(JSON.stringify(storedData));
    tamper2.newField = "未经授权的字段";
    assert.isFalse(EncryptionManager.verifySignature(tamper2, storedSignature));
    
    // 4.3 删除字段
    var tamper3 = JSON.parse(JSON.stringify(storedData));
    delete tamper3.timestamp;
    assert.isFalse(EncryptionManager.verifySignature(tamper3, storedSignature));
  });
  
  /**
   * 测试签名性能
   * @category 性能测试
   * @priority P2
   */
  test('test_signature_performance', function() {
    // 1. 准备大量测试数据
    var largeData = generateLargeData(100); // 100条记录
    
    // 2. 测量签名时间
    var startTime = Date.now();
    var signature = EncryptionManager.signData(largeData);
    var signTime = Date.now() - startTime;
    
    console.log('大数据签名耗时: ' + signTime + 'ms');
    
    // 3. 验证签名时间在可接受范围内
    assert.isTrue(signTime < 100, "大数据签名时间应少于100ms");
    
    // 4. 测量验证时间
    startTime = Date.now();
    var isValid = EncryptionManager.verifySignature(largeData, signature);
    var verifyTime = Date.now() - startTime;
    
    console.log('大数据验证耗时: ' + verifyTime + 'ms');
    
    // 5. 验证验证时间在可接受范围内
    assert.isTrue(verifyTime < 100, "大数据验证时间应少于100ms");
    
    // 6. 确保验证结果正确
    assert.isTrue(isValid);
  });
  
  /**
   * 测试签名错误处理
   * @category 错误处理测试
   * @priority P1
   */
  test('test_signature_error_handling', function() {
    // 1. 测试空数据签名
    try {
      EncryptionManager.signData(null);
      assert.fail("应该抛出错误但未抛出");
    } catch(error) {
      assert.equals(error.message, "无法对null或undefined数据进行签名");
    }
    
    // 2. 测试无效签名验证
    var testData = "测试数据";
    var isValid = EncryptionManager.verifySignature(testData, "无效的签名");
    assert.isFalse(isValid);
    
    // 3. 测试使用无效算法
    try {
      EncryptionManager.signData(testData, {
        algorithm: "不存在的算法"
      });
      assert.fail("应该抛出错误但未抛出");
    } catch(error) {
      assert.equals(error.message, "不支持的签名算法: 不存在的算法");
    }
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
      id: "item-" + i,
      name: "测试数据" + i,
      value: "需要签名的长文本值-".repeat(5) + i,
      timestamp: Date.now(),
      status: i % 2 === 0 ? "active" : "inactive"
    });
  }
  return result;
} 