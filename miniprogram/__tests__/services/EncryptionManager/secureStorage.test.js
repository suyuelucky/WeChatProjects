/**
 * EncryptionManager安全存储测试
 * 
 * 创建时间: 2025-04-09 12:21:20 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 测试文件
 */

// 引入测试框架
var assert = require('../../mocks/assert.mock');
var wxMock = require('../../mocks/wx.mock');
var EncryptionManager = require('../../../services/security/EncryptionManager');

/**
 * 测试套件：EncryptionManager - 安全存储测试
 * 
 * 测试加密管理器的安全存储功能，包括数据持久化、存储隔离和不同安全级别
 */
describe('EncryptionManager - 安全存储测试', function() {
  
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
   * 测试基本安全存储功能
   * @category 功能测试
   * @priority P0
   */
  test('test_basic_secure_storage', function() {
    // 测试数据
    var testData = {
      username: 'secureUser',
      password: 'verySecretPassword123!',
      email: 'secure@example.com',
      creditCard: '1234-5678-9012-3456'
    };
    
    // 存储键名
    var storageKey = 'test_secure_data';
    
    // 1. 安全存储数据
    EncryptionManager.secureStore(storageKey, testData);
    
    // 2. 获取原始存储数据，验证不是明文
    var rawStored = wxMock.getStorageSync(EncryptionManager.config.storagePrefix + storageKey);
    
    assert.isNotNull(rawStored, '应该存储了数据');
    assert.notIncludes(rawStored, 'secureUser', '存储数据不应包含明文username');
    assert.notIncludes(rawStored, 'verySecretPassword123!', '存储数据不应包含明文password');
    assert.notIncludes(rawStored, '1234-5678-9012-3456', '存储数据不应包含明文信用卡号');
    
    // 3. 安全检索数据
    var retrievedData = EncryptionManager.secureRetrieve(storageKey);
    
    // 4. 验证检索的数据与原始数据一致
    assert.isNotNull(retrievedData, '应能检索到数据');
    assert.equals(retrievedData.username, testData.username);
    assert.equals(retrievedData.password, testData.password);
    assert.equals(retrievedData.email, testData.email);
    assert.equals(retrievedData.creditCard, testData.creditCard);
  });
  
  /**
   * 测试不同数据类型安全存储
   * @category 功能测试
   * @priority P1
   */
  test('test_secure_storage_data_types', function() {
    // 1. 测试字符串
    var stringData = 'Simple sensitive string';
    EncryptionManager.secureStore('string_test', stringData);
    var retrievedString = EncryptionManager.secureRetrieve('string_test');
    assert.equals(retrievedString, stringData);
    
    // 2. 测试数字
    var numberData = 12345.6789;
    EncryptionManager.secureStore('number_test', numberData);
    var retrievedNumber = EncryptionManager.secureRetrieve('number_test');
    assert.equals(retrievedNumber, numberData);
    
    // 3. 测试布尔值
    var boolData = true;
    EncryptionManager.secureStore('bool_test', boolData);
    var retrievedBool = EncryptionManager.secureRetrieve('bool_test');
    assert.equals(retrievedBool, boolData);
    
    // 4. 测试数组
    var arrayData = [1, 'two', 3.0, false, {nested: 'object'}];
    EncryptionManager.secureStore('array_test', arrayData);
    var retrievedArray = EncryptionManager.secureRetrieve('array_test');
    assert.equals(retrievedArray.length, arrayData.length);
    assert.equals(retrievedArray[0], arrayData[0]);
    assert.equals(retrievedArray[1], arrayData[1]);
    assert.equals(retrievedArray[4].nested, arrayData[4].nested);
    
    // 5. 测试嵌套对象
    var objectData = {
      id: 12345,
      info: {
        name: 'Test Object',
        tags: ['sensitive', 'secure'],
        active: true,
        stats: {
          created: '2025-04-09',
          accessCount: 42
        }
      }
    };
    EncryptionManager.secureStore('object_test', objectData);
    var retrievedObject = EncryptionManager.secureRetrieve('object_test');
    assert.equals(retrievedObject.id, objectData.id);
    assert.equals(retrievedObject.info.name, objectData.info.name);
    assert.equals(retrievedObject.info.tags.length, objectData.info.tags.length);
    assert.equals(retrievedObject.info.stats.accessCount, objectData.info.stats.accessCount);
  });
  
  /**
   * 测试安全存储数据更新
   * @category 功能测试
   * @priority P0
   */
  test('test_secure_storage_update', function() {
    // 1. 存储初始数据
    var initialData = {
      username: 'initialUser',
      loginCount: 5
    };
    var storageKey = 'update_test';
    
    EncryptionManager.secureStore(storageKey, initialData);
    
    // 2. 验证初始数据已正确存储
    var initialRetrieved = EncryptionManager.secureRetrieve(storageKey);
    assert.equals(initialRetrieved.username, initialData.username);
    assert.equals(initialRetrieved.loginCount, initialData.loginCount);
    
    // 3. 更新数据
    var updatedData = {
      username: 'updatedUser',
      loginCount: 10,
      lastLogin: '2025-04-09'
    };
    
    EncryptionManager.secureStore(storageKey, updatedData);
    
    // 4. 验证更新后的数据
    var updatedRetrieved = EncryptionManager.secureRetrieve(storageKey);
    assert.equals(updatedRetrieved.username, updatedData.username);
    assert.equals(updatedRetrieved.loginCount, updatedData.loginCount);
    assert.equals(updatedRetrieved.lastLogin, updatedData.lastLogin);
    
    // 5. 验证初始数据被完全替换（不是合并）
    assert.notEquals(updatedRetrieved, initialData);
  });
  
  /**
   * 测试安全存储数据删除
   * @category 功能测试
   * @priority P0
   */
  test('test_secure_storage_delete', function() {
    // 1. 存储测试数据
    var testData = { sensitive: 'information' };
    var storageKey = 'delete_test';
    
    EncryptionManager.secureStore(storageKey, testData);
    
    // 2. 验证数据已存储
    var stored = wxMock.getStorageSync(EncryptionManager.config.storagePrefix + storageKey);
    assert.isNotNull(stored);
    
    // 3. 删除数据
    EncryptionManager.secureDelete(storageKey);
    
    // 4. 验证数据已被删除
    var afterDelete = wxMock.getStorageSync(EncryptionManager.config.storagePrefix + storageKey);
    assert.isNull(afterDelete);
    
    // 5. 尝试检索已删除的数据应返回null
    var retrievedAfterDelete = EncryptionManager.secureRetrieve(storageKey);
    assert.isNull(retrievedAfterDelete);
  });
  
  /**
   * 测试安全存储错误处理
   * @category 错误处理测试
   * @priority P0
   */
  test('test_secure_storage_error_handling', function() {
    // 1. 测试存储无效密钥
    var hasError = false;
    try {
      EncryptionManager.secureStore('', {data: 'test'});
    } catch (error) {
      hasError = true;
      assert.includes(error.message.toLowerCase(), 'key');
    }
    assert.isTrue(hasError, '无效密钥应抛出错误');
    
    // 2. 测试检索不存在的数据
    var nonExistentData = EncryptionManager.secureRetrieve('non_existent_key');
    assert.isNull(nonExistentData, '检索不存在的数据应返回null');
    
    // 3. 测试存储后修改原始对象不影响存储数据
    var mutableObject = { count: 1 };
    EncryptionManager.secureStore('mutable_test', mutableObject);
    
    // 修改原始对象
    mutableObject.count = 2;
    
    // 检索存储的数据
    var retrievedObject = EncryptionManager.secureRetrieve('mutable_test');
    assert.equals(retrievedObject.count, 1, '存储数据应是原始值的深拷贝');
  });
  
  /**
   * 测试安全存储命名空间
   * @category 功能测试
   * @priority P1
   */
  test('test_secure_storage_namespaces', function() {
    // 1. 测试默认命名空间
    var defaultData = {value: 'default namespace'};
    EncryptionManager.secureStore('namespace_test', defaultData);
    
    // 2. 使用自定义命名空间
    var customNamespace = 'custom_space';
    EncryptionManager.setNamespace(customNamespace);
    
    var customData = {value: 'custom namespace'};
    EncryptionManager.secureStore('namespace_test', customData);
    
    // 3. 验证两个命名空间的数据独立存储
    EncryptionManager.setNamespace(null); // 恢复默认命名空间
    var defaultRetrieved = EncryptionManager.secureRetrieve('namespace_test');
    assert.equals(defaultRetrieved.value, 'default namespace');
    
    EncryptionManager.setNamespace(customNamespace);
    var customRetrieved = EncryptionManager.secureRetrieve('namespace_test');
    assert.equals(customRetrieved.value, 'custom namespace');
    
    // 4. 验证两个不同的存储项实际存在
    EncryptionManager.setNamespace(null);
    assert.isNotNull(wxMock.getStorageSync(EncryptionManager.config.storagePrefix + 'namespace_test'));
    
    var customKeyName = EncryptionManager.config.storagePrefix + customNamespace + '_namespace_test';
    assert.isNotNull(wxMock.getStorageSync(customKeyName));
    
    // 5. 删除自定义命名空间中的数据
    EncryptionManager.setNamespace(customNamespace);
    EncryptionManager.secureDelete('namespace_test');
    
    var customDeleted = EncryptionManager.secureRetrieve('namespace_test');
    assert.isNull(customDeleted);
    
    // 默认命名空间中的数据应该仍然存在
    EncryptionManager.setNamespace(null);
    var defaultStillExists = EncryptionManager.secureRetrieve('namespace_test');
    assert.isNotNull(defaultStillExists);
  });
  
  /**
   * 测试安全存储批量操作
   * @category 功能测试
   * @priority P1
   */
  test('test_secure_storage_batch_operations', function() {
    // 1. 创建批量测试数据
    var batchData = {
      'item1': {id: 1, value: 'first item'},
      'item2': {id: 2, value: 'second item'},
      'item3': {id: 3, value: 'third item'},
      'item4': {id: 4, value: 'fourth item'},
      'item5': {id: 5, value: 'fifth item'}
    };
    
    // 2. 批量存储
    for (var key in batchData) {
      EncryptionManager.secureStore(key, batchData[key]);
    }
    
    // 3. 获取所有安全存储项
    var allItems = EncryptionManager.getAllSecureItems();
    
    // 4. 验证返回的项数量
    assert.isNotNull(allItems);
    var itemCount = 0;
    for (var key in allItems) {
      itemCount++;
    }
    assert.isTrue(itemCount >= Object.keys(batchData).length);
    
    // 5. 验证特定项的内容
    for (var key in batchData) {
      assert.equals(allItems[key].id, batchData[key].id);
      assert.equals(allItems[key].value, batchData[key].value);
    }
    
    // 6. 批量删除
    EncryptionManager.clearAllSecureItems();
    
    // 7. 验证所有项已删除
    for (var key in batchData) {
      var retrievedAfterClear = EncryptionManager.secureRetrieve(key);
      assert.isNull(retrievedAfterClear);
    }
  });
  
  /**
   * 测试安全存储性能
   * @category 性能测试
   * @priority P1
   */
  test('test_secure_storage_performance', function() {
    // 1. 生成大量测试数据
    var largeData = {
      id: 'perf_test',
      name: '性能测试数据',
      items: []
    };
    
    // 添加1000个条目
    for (var i = 0; i < 1000; i++) {
      largeData.items.push({
        id: i,
        value: 'Item value ' + i,
        timestamp: Date.now() + i,
        tags: ['tag1', 'tag2', 'tag' + i]
      });
    }
    
    // 2. 测量存储性能
    var storeStartTime = Date.now();
    EncryptionManager.secureStore('perf_test', largeData);
    var storeTime = Date.now() - storeStartTime;
    
    // 3. 测量检索性能
    var retrieveStartTime = Date.now();
    var retrievedData = EncryptionManager.secureRetrieve('perf_test');
    var retrieveTime = Date.now() - retrieveStartTime;
    
    // 4. 验证数据完整性
    assert.equals(retrievedData.items.length, largeData.items.length);
    assert.equals(retrievedData.items[0].value, largeData.items[0].value);
    assert.equals(retrievedData.items[999].value, largeData.items[999].value);
    
    // 5. 输出性能数据
    console.log('大数据安全存储耗时: ' + storeTime + 'ms');
    console.log('大数据安全检索耗时: ' + retrieveTime + 'ms');
    
    // 6. 验证性能在可接受范围内
    assert.isTrue(storeTime < 500, '大数据安全存储应在500ms内完成');
    assert.isTrue(retrieveTime < 300, '大数据安全检索应在300ms内完成');
  });
}); 