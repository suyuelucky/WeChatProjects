/**
 * EncryptionManager基础加密解密测试
 * 
 * 创建时间: 2025-04-10 11:47:56 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 测试文件
 */

// 引入测试框架
var assert = require('../../mocks/assert.mock');
var wxMock = require('../../mocks/wx.mock');
var EncryptionManager = require('../../../services/security/EncryptionManager');

/**
 * 测试套件：EncryptionManager - 基础加密解密测试
 * 
 * 测试加密管理器的基本加密解密功能，包括不同算法、模式和数据类型
 */
describe('EncryptionManager - 基础加密解密测试', function() {
  
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
  });
  
  /**
   * 测试基本加密解密功能
   * @category 功能测试
   * @priority P0
   */
  test('test_basic_encryption_decryption', function() {
    // 准备测试数据
    var testData = {
      username: 'testuser',
      email: 'test@example.com',
      id: 12345,
      profile: {
        age: 30,
        interests: ['coding', 'testing']
      }
    };
    
    // 1. 使用默认加密方式加密数据
    var encryptedData = EncryptionManager.encrypt(JSON.stringify(testData));
    
    // 2. 验证加密结果不是明文
    assert.notEquals(encryptedData, JSON.stringify(testData));
    assert.notIncludes(encryptedData, 'testuser');
    assert.notIncludes(encryptedData, 'test@example.com');
    
    // 3. 解密数据
    var decryptedData = EncryptionManager.decrypt(encryptedData);
    var parsedData = JSON.parse(decryptedData);
    
    // 4. 验证解密后数据与原始数据一致
    assert.equals(parsedData.username, testData.username);
    assert.equals(parsedData.email, testData.email);
    assert.equals(parsedData.id, testData.id);
    assert.equals(parsedData.profile.age, testData.profile.age);
    assert.equals(parsedData.profile.interests.length, testData.profile.interests.length);
    assert.equals(parsedData.profile.interests[0], testData.profile.interests[0]);
  });
  
  /**
   * 测试不同加密算法
   * @category 功能测试
   * @priority P0
   */
  test('test_encryption_algorithms', function() {
    // 准备测试数据
    var testData = 'This is a test string for encryption algorithm testing';
    
    // 测试AES加密
    var aesEncrypted = EncryptionManager.encrypt(testData, {
      algorithm: 'AES-256-CTR'
    });
    var aesDecrypted = EncryptionManager.decrypt(aesEncrypted);
    assert.equals(aesDecrypted, testData);
    
    // 测试AES-CBC加密
    var aesCbcEncrypted = EncryptionManager.encrypt(testData, {
      algorithm: 'AES-256-CBC'
    });
    var aesCbcDecrypted = EncryptionManager.decrypt(aesCbcEncrypted);
    assert.equals(aesCbcDecrypted, testData);
    
    // 测试不同算法加密结果不同
    assert.notEquals(aesEncrypted, aesCbcEncrypted);
  });
  
  /**
   * 测试加密参数配置
   * @category 功能测试
   * @priority P1
   */
  test('test_encryption_options', function() {
    // 准备测试数据
    var testData = 'Testing encryption with different parameters';
    
    // 默认参数加密
    var defaultEncrypted = EncryptionManager.encrypt(testData);
    
    // 使用自定义密钥加密
    var customKeyEncrypted = EncryptionManager.encrypt(testData, {
      key: 'custom-encryption-key-for-testing'
    });
    
    // 使用自定义算法加密
    var customAlgorithmEncrypted = EncryptionManager.encrypt(testData, {
      algorithm: 'AES-128-CTR'
    });
    
    // 使用压缩加密
    var compressedEncrypted = EncryptionManager.encrypt(testData, {
      useCompression: true
    });
    
    // 验证不同参数配置产生不同结果
    assert.notEquals(defaultEncrypted, customKeyEncrypted);
    assert.notEquals(defaultEncrypted, customAlgorithmEncrypted);
    assert.notEquals(defaultEncrypted, compressedEncrypted);
    
    // 验证所有加密方式都可以正确解密
    assert.equals(EncryptionManager.decrypt(defaultEncrypted), testData);
    assert.equals(EncryptionManager.decrypt(customKeyEncrypted, {
      key: 'custom-encryption-key-for-testing'
    }), testData);
    assert.equals(EncryptionManager.decrypt(customAlgorithmEncrypted), testData);
    assert.equals(EncryptionManager.decrypt(compressedEncrypted), testData);
  });
  
  /**
   * 测试边界条件处理
   * @category 边界测试
   * @priority P0
   */
  test('test_encryption_edge_cases', function() {
    // 测试空字符串
    var emptyString = '';
    var emptyEncrypted = EncryptionManager.encrypt(emptyString);
    assert.notEquals(emptyEncrypted, emptyString);
    assert.equals(EncryptionManager.decrypt(emptyEncrypted), emptyString);
    
    // 测试空对象
    var emptyObject = JSON.stringify({});
    var emptyObjEncrypted = EncryptionManager.encrypt(emptyObject);
    assert.notEquals(emptyObjEncrypted, emptyObject);
    assert.equals(EncryptionManager.decrypt(emptyObjEncrypted), emptyObject);
    
    // 测试特殊字符
    var specialChars = '!@#$%^&*()_+{}[]|\\:;"\'<>,.?/~`';
    var specialEncrypted = EncryptionManager.encrypt(specialChars);
    assert.equals(EncryptionManager.decrypt(specialEncrypted), specialChars);
    
    // 测试Unicode字符
    var unicodeChars = '你好，世界！😀🔒💻';
    var unicodeEncrypted = EncryptionManager.encrypt(unicodeChars);
    assert.equals(EncryptionManager.decrypt(unicodeEncrypted), unicodeChars);
  });
  
  /**
   * 测试大数据量加密
   * @category 性能测试
   * @priority P1
   */
  test('test_large_data_encryption', function() {
    // 生成大量数据
    var largeData = '';
    for (var i = 0; i < 10000; i++) {
      largeData += 'Block ' + i + ': This is test data for performance testing of encryption and decryption functions. ';
    }
    
    // 记录开始时间
    var startTime = Date.now();
    
    // 加密大数据
    var encrypted = EncryptionManager.encrypt(largeData);
    
    // 记录加密耗时
    var encryptionTime = Date.now() - startTime;
    
    // 重置计时器
    startTime = Date.now();
    
    // 解密大数据
    var decrypted = EncryptionManager.decrypt(encrypted);
    
    // 记录解密耗时
    var decryptionTime = Date.now() - startTime;
    
    // 验证数据正确性
    assert.equals(decrypted, largeData);
    
    // 输出性能信息
    console.log('大数据加密耗时: ' + encryptionTime + 'ms');
    console.log('大数据解密耗时: ' + decryptionTime + 'ms');
    
    // 验证性能在可接受范围内
    assert.isTrue(encryptionTime < 500, '大数据加密耗时应低于500ms');
    assert.isTrue(decryptionTime < 500, '大数据解密耗时应低于500ms');
  });
  
  /**
   * 测试加密参数错误处理
   * @category 错误处理测试
   * @priority P0
   */
  test('test_encryption_error_handling', function() {
    // 准备测试数据
    var testData = 'Test encryption error handling';
    
    // 测试无效算法处理
    var hasError = false;
    try {
      EncryptionManager.encrypt(testData, {
        algorithm: 'INVALID-ALGORITHM'
      });
    } catch (error) {
      hasError = true;
      assert.includes(error.message.toLowerCase(), 'algorithm');
    }
    assert.isTrue(hasError, '无效算法应抛出错误');
    
    // 测试无效密钥长度处理
    hasError = false;
    try {
      EncryptionManager.encrypt(testData, {
        key: 'short'
      });
    } catch (error) {
      hasError = true;
      assert.includes(error.message.toLowerCase(), 'key');
    }
    assert.isTrue(hasError, '无效密钥长度应抛出错误');
    
    // 测试解密错误数据
    hasError = false;
    try {
      EncryptionManager.decrypt('这不是有效的加密数据');
    } catch (error) {
      hasError = true;
      assert.includes(error.message.toLowerCase(), 'decrypt');
    }
    assert.isTrue(hasError, '解密无效数据应抛出错误');
    
    // 测试错误密钥解密
    var encrypted = EncryptionManager.encrypt(testData, {
      key: 'correct-encryption-key-for-testing-purposes'
    });
    
    hasError = false;
    try {
      EncryptionManager.decrypt(encrypted, {
        key: 'wrong-encryption-key-that-will-not-work-here'
      });
    } catch (error) {
      hasError = true;
      assert.includes(error.message.toLowerCase(), 'decrypt');
    }
    assert.isTrue(hasError, '使用错误密钥解密应抛出错误');
  });
  
  /**
   * 测试不同数据类型加密
   * @category 功能测试
   * @priority P1
   */
  test('test_different_data_types', function() {
    // 测试字符串
    var stringData = 'Simple string data';
    var stringEncrypted = EncryptionManager.encrypt(stringData);
    assert.equals(EncryptionManager.decrypt(stringEncrypted), stringData);
    
    // 测试数字（转字符串）
    var numberData = '12345.67890';
    var numberEncrypted = EncryptionManager.encrypt(numberData);
    assert.equals(EncryptionManager.decrypt(numberEncrypted), numberData);
    
    // 测试布尔（转字符串）
    var boolData = 'true';
    var boolEncrypted = EncryptionManager.encrypt(boolData);
    assert.equals(EncryptionManager.decrypt(boolEncrypted), boolData);
    
    // 测试数组（JSON字符串）
    var arrayData = JSON.stringify([1, 2, 'three', true, {five: 5}]);
    var arrayEncrypted = EncryptionManager.encrypt(arrayData);
    assert.equals(EncryptionManager.decrypt(arrayEncrypted), arrayData);
    
    // 测试嵌套对象（JSON字符串）
    var objectData = JSON.stringify({
      id: 1,
      name: 'Test',
      isActive: true,
      tags: ['tag1', 'tag2'],
      metadata: {
        created: '2025-04-01',
        version: 2.0
      }
    });
    var objectEncrypted = EncryptionManager.encrypt(objectData);
    assert.equals(EncryptionManager.decrypt(objectEncrypted), objectData);
  });
}); 