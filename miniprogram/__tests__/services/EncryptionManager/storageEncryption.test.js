/**
 * EncryptionManager存储加密功能测试
 * 
 * 创建时间: 2025-04-09 11:27:24 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 测试文件
 */

// 引入测试框架
var assert = require('../../mocks/assert.mock');
var EncryptionManager = require('../../../services/security/EncryptionManager');
var LocalStorageMock = require('../../mocks/localStorage.mock');

// 测试套件
describe('EncryptionManager - 存储加密功能测试', function() {
  
  // 测试环境变量
  var localStorage;
  
  // 初始化测试环境
  beforeEach(function() {
    // 创建模拟的localStorage
    localStorage = new LocalStorageMock();
    
    // 在每个测试用例执行前重置加密管理器状态
    EncryptionManager.init({
      defaultAlgorithm: 'AES-256-CTR',
      useCompression: false,
      securityLevel: 'high',
      storage: localStorage
    });
  });
  
  /**
   * 测试基本存储加密功能
   * @category 功能测试
   * @priority P0
   */
  test('test_basic_storage_encryption', function() {
    // 1. 准备测试数据
    var key = "sensitiveDataKey";
    var sensitiveData = {
      username: "testuser",
      token: "12345abcde",
      permissions: ["read", "write"]
    };
    
    // 2. 使用安全存储
    EncryptionManager.secureStore(key, sensitiveData);
    
    // 3. 验证数据已存储
    var rawValue = localStorage.getItem(key);
    assert.notNull(rawValue);
    
    // 4. 验证存储的数据是加密的（不是明文）
    assert.notEquals(JSON.stringify(sensitiveData), rawValue);
    
    // 5. 验证可以正确检索并解密
    var retrievedData = EncryptionManager.secureRetrieve(key);
    assert.deepEquals(sensitiveData, retrievedData);
  });
  
  /**
   * 测试存储类型加密
   * @category 功能测试
   * @priority P1
   */
  test('test_storage_types_encryption', function() {
    // 1. 字符串数据
    var stringKey = "stringDataKey";
    var stringData = "敏感字符串数据";
    EncryptionManager.secureStore(stringKey, stringData);
    var retrievedString = EncryptionManager.secureRetrieve(stringKey);
    assert.equals(stringData, retrievedString);
    
    // 2. 数字数据
    var numberKey = "numberDataKey";
    var numberData = 12345;
    EncryptionManager.secureStore(numberKey, numberData);
    var retrievedNumber = EncryptionManager.secureRetrieve(numberKey);
    assert.equals(numberData, retrievedNumber);
    
    // 3. 布尔数据
    var boolKey = "boolDataKey";
    var boolData = true;
    EncryptionManager.secureStore(boolKey, boolData);
    var retrievedBool = EncryptionManager.secureRetrieve(boolKey);
    assert.equals(boolData, retrievedBool);
    
    // 4. 数组数据
    var arrayKey = "arrayDataKey";
    var arrayData = [1, "test", {nested: true}];
    EncryptionManager.secureStore(arrayKey, arrayData);
    var retrievedArray = EncryptionManager.secureRetrieve(arrayKey);
    assert.deepEquals(arrayData, retrievedArray);
    
    // 5. 嵌套对象数据
    var objectKey = "objectDataKey";
    var objectData = {
      level1: {
        level2: {
          level3: {
            value: "深度嵌套数据"
          }
        }
      }
    };
    EncryptionManager.secureStore(objectKey, objectData);
    var retrievedObject = EncryptionManager.secureRetrieve(objectKey);
    assert.deepEquals(objectData, retrievedObject);
  });
  
  /**
   * 测试存储加密选项
   * @category 功能测试
   * @priority P1
   */
  test('test_storage_encryption_options', function() {
    // 1. 准备测试数据
    var key = "optionsTestKey";
    var data = {sensitive: true, value: "测试数据"};
    
    // 2. 使用自定义算法和密钥存储
    var customKey = EncryptionManager.generateKey('symmetric', 256);
    EncryptionManager.secureStore(key, data, {
      algorithm: 'AES-256-GCM',
      encryptionKey: customKey,
      additionalAuthenticatedData: 'authData123'
    });
    
    // 3. 使用相同选项检索
    var retrieved = EncryptionManager.secureRetrieve(key, {
      algorithm: 'AES-256-GCM',
      encryptionKey: customKey,
      additionalAuthenticatedData: 'authData123'
    });
    
    // 4. 验证数据正确
    assert.deepEquals(data, retrieved);
    
    // 5. 使用不匹配的选项尝试检索应失败
    try {
      EncryptionManager.secureRetrieve(key, {
        algorithm: 'AES-256-GCM',
        encryptionKey: customKey,
        additionalAuthenticatedData: '错误的authData'
      });
      assert.fail("应该抛出错误但未抛出");
    } catch(error) {
      assert.equals(error.message.includes("解密失败"), true);
    }
  });
  
  /**
   * 测试存储加密的安全性
   * @category 安全测试
   * @priority P0
   */
  test('test_storage_encryption_security', function() {
    // 1. 准备高敏感度测试数据
    var key = "highSecurityKey";
    var sensitiveData = {
      password: "SuperSecretP@ssw0rd",
      creditCard: "1234-5678-9012-3456",
      securityAnswer: "我母亲的娘家姓"
    };
    
    // 2. 使用高安全性设置存储
    EncryptionManager.secureStore(key, sensitiveData, {
      securityLevel: 'highest'
    });
    
    // 3. 获取原始存储内容
    var rawStored = localStorage.getItem(key);
    
    // 4. 验证存储的内容是密文
    assert.notEquals(JSON.stringify(sensitiveData), rawStored);
    
    // 5. 验证关键字段名称不作为明文出现在密文中
    assert.equals(rawStored.includes("password"), false);
    assert.equals(rawStored.includes("creditCard"), false);
    assert.equals(rawStored.includes("securityAnswer"), false);
    
    // 6. 验证关键字段值不作为明文出现在密文中
    assert.equals(rawStored.includes("SuperSecretP@ssw0rd"), false);
    assert.equals(rawStored.includes("1234-5678-9012-3456"), false);
    assert.equals(rawStored.includes("我母亲的娘家姓"), false);
    
    // 7. 验证仍可通过正确方式检索
    var retrieved = EncryptionManager.secureRetrieve(key);
    assert.deepEquals(sensitiveData, retrieved);
  });
  
  /**
   * 测试存储加密的删除功能
   * @category 功能测试
   * @priority P1
   */
  test('test_secure_delete', function() {
    // 1. 存储加密数据
    var key = "deleteTestKey";
    var data = {secret: "要删除的数据"};
    EncryptionManager.secureStore(key, data);
    
    // 2. 验证数据存在
    var exists = EncryptionManager.secureExists(key);
    assert.isTrue(exists);
    
    // 3. 安全删除数据
    var deleted = EncryptionManager.secureDelete(key);
    assert.isTrue(deleted);
    
    // 4. 验证数据已删除
    exists = EncryptionManager.secureExists(key);
    assert.isFalse(exists);
    
    // 5. 尝试检索已删除数据
    var retrieved = EncryptionManager.secureRetrieve(key);
    assert.isNull(retrieved);
  });
  
  /**
   * 测试大容量存储加密性能
   * @category 性能测试
   * @priority P2
   */
  test('test_large_data_storage_performance', function() {
    // 1. 准备大量测试数据
    var key = "largeDataKey";
    var largeData = generateLargeData(100); // 100条记录
    
    // 2. 测量存储时间
    var startTime = Date.now();
    EncryptionManager.secureStore(key, largeData);
    var storeTime = Date.now() - startTime;
    
    console.log('大数据存储耗时: ' + storeTime + 'ms');
    
    // 3. 验证存储时间在可接受范围内
    assert.isTrue(storeTime < 200, "大数据存储时间应少于200ms");
    
    // 4. 测量检索时间
    startTime = Date.now();
    var retrieved = EncryptionManager.secureRetrieve(key);
    var retrieveTime = Date.now() - startTime;
    
    console.log('大数据检索耗时: ' + retrieveTime + 'ms');
    
    // 5. 验证检索时间在可接受范围内
    assert.isTrue(retrieveTime < 200, "大数据检索时间应少于200ms");
    
    // 6. 验证检索数据正确
    assert.equals(largeData.length, retrieved.length);
    assert.deepEquals(largeData[0], retrieved[0]);
    assert.deepEquals(largeData[largeData.length-1], retrieved[retrieved.length-1]);
  });
  
  /**
   * 测试存储错误处理
   * @category 错误处理测试
   * @priority P1
   */
  test('test_storage_error_handling', function() {
    // 1. 测试空键存储
    try {
      EncryptionManager.secureStore("", {data: "测试"});
      assert.fail("应该抛出错误但未抛出");
    } catch(error) {
      assert.equals(error.message, "存储键不能为空");
    }
    
    // 2. 测试检索不存在的数据
    var nonExistent = EncryptionManager.secureRetrieve("不存在的键");
    assert.isNull(nonExistent);
    
    // 3. 模拟存储失败
    localStorage.simulateError = true;
    try {
      EncryptionManager.secureStore("errorKey", "测试数据");
      assert.fail("应该抛出错误但未抛出");
    } catch(error) {
      assert.equals(error.message.includes("存储失败"), true);
    }
    localStorage.simulateError = false;
    
    // 4. 测试存储被篡改数据
    var key = "tamperedKey";
    var data = {secret: "原始数据"};
    EncryptionManager.secureStore(key, data);
    
    // 手动篡改存储中的加密数据
    var original = localStorage.getItem(key);
    var tampered = original.substring(0, original.length-5) + "XXXXX";
    localStorage.setItem(key, tampered);
    
    // 尝试检索被篡改的数据
    try {
      EncryptionManager.secureRetrieve(key);
      assert.fail("应该抛出错误但未抛出");
    } catch(error) {
      assert.equals(error.message.includes("解密失败"), true);
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
      name: "安全存储测试数据" + i,
      value: "敏感信息-".repeat(10) + i,
      timestamp: Date.now(),
      details: {
        field1: "嵌套字段1-" + i,
        field2: "嵌套字段2-" + i,
        field3: "嵌套字段3-" + i
      }
    });
  }
  return result;
} 