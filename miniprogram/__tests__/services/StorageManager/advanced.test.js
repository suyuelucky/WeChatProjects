/**
 * StorageManager高级测试
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
 * 测试套件：StorageManager - 高级功能测试
 * 测试安全存储管理器的高级功能，包括缓存、同步和压力测试
 */
describe('StorageManager - 高级功能测试', function() {
  
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
    
    // 初始化存储管理器，启用高级功能
    StorageManager.init({
      prefix: 'test_',
      storage: wxMock.storage,
      enableCache: true,
      enableSync: true,
      syncEndpoint: 'https://api.example.com/sync'
    });
  });
  
  /**
   * 测试缓存机制
   * @category 性能测试
   * @priority P1
   */
  test('test_cache_mechanism', function() {
    // 准备测试数据
    var testData = { id: 1, value: 'cache test' };
    
    // 设置数据
    StorageManager.secureSet('cached_item', testData);
    
    // 模拟wx.getStorageSync调用计数
    wxMock.resetCallCounts();
    
    // 第一次获取数据（应从存储获取）
    var firstGet = StorageManager.secureGet('cached_item');
    assert.equals(wxMock.getCallCount('getStorageSync'), 1);
    assert.equals(firstGet.id, 1);
    
    // 第二次获取数据（应该从缓存获取）
    var secondGet = StorageManager.secureGet('cached_item');
    // 调用计数不应增加，说明使用了缓存
    assert.equals(wxMock.getCallCount('getStorageSync'), 1);
    assert.equals(secondGet.id, 1);
    
    // 更新数据
    testData.value = 'updated value';
    StorageManager.secureSet('cached_item', testData);
    
    // 获取更新后的数据（应该从缓存获取更新后的值）
    var thirdGet = StorageManager.secureGet('cached_item');
    // 不应从存储获取
    assert.equals(wxMock.getCallCount('getStorageSync'), 1);
    assert.equals(thirdGet.value, 'updated value');
    
    // 测试缓存过期
    // 模拟时间前进超过缓存有效期
    StorageManager._config.cacheExpiryMs = 100; // 设置缓存过期时间为100毫秒
    
    // 模拟时间流逝
    wxMock.advanceTime(200);
    
    // 获取数据（应该从存储重新获取）
    var fourthGet = StorageManager.secureGet('cached_item');
    // 应该再次调用getStorageSync
    assert.equals(wxMock.getCallCount('getStorageSync'), 2);
    assert.equals(fourthGet.value, 'updated value');
  });
  
  /**
   * 测试数据同步
   * @category 网络测试
   * @priority P1
   */
  test('test_data_synchronization', function() {
    // 准备测试数据
    for (var i = 0; i < 3; i++) {
      StorageManager.secureSet('sync_item_' + i, { id: i, value: 'test data ' + i });
    }
    
    // 模拟网络请求成功响应
    wxMock.setRequestResponse({
      statusCode: 200,
      data: {
        success: true,
        syncId: 'sync123456',
        syncedItems: 3
      }
    });
    
    // 执行同步
    var syncPromise = StorageManager.syncData();
    
    // 验证同步请求
    syncPromise.then(function(result) {
      // 验证结果
      assert.isTrue(result.success);
      assert.equals(result.syncedItems, 3);
      
      // 验证请求正确发送
      var requestCalls = wxMock.getRequestCalls();
      assert.equals(requestCalls.length, 1);
      
      // 验证请求URL和方法
      var request = requestCalls[0];
      assert.equals(request.url, 'https://api.example.com/sync');
      assert.equals(request.method, 'POST');
      
      // 验证包含设备信息
      assert.isNotUndefined(request.data.deviceId);
    });
    
    // 模拟同步失败
    wxMock.setRequestResponse({
      statusCode: 500,
      data: {
        success: false,
        error: 'Server error'
      }
    });
    
    // 执行同步，应当失败
    var failedSyncPromise = StorageManager.syncData();
    
    failedSyncPromise.catch(function(error) {
      assert.includes(error.message, 'Server error');
    });
  });
  
  /**
   * 测试批量操作
   * @category 性能测试
   * @priority P2
   */
  test('test_batch_operations', function() {
    // 准备批量数据
    var items = [];
    for (var i = 0; i < 50; i++) {
      items.push({
        key: 'batch_item_' + i,
        data: { id: i, name: 'Item ' + i, value: 'Value ' + i },
        options: { 
          securityLevel: i % 4,
          tags: ['batch', i % 2 === 0 ? 'even' : 'odd']
        }
      });
    }
    
    // 计时开始
    var startTime = Date.now();
    
    // 批量插入
    for (var j = 0; j < items.length; j++) {
      var item = items[j];
      StorageManager.secureSet(item.key, item.data, item.options);
    }
    
    // 计时结束
    var endTime = Date.now();
    var duration = endTime - startTime;
    
    // 记录性能指标
    console.log('批量插入50条数据用时: ' + duration + 'ms');
    
    // 验证所有数据插入成功
    var allItems = StorageManager.query({
      keyPattern: '^batch_item_'
    });
    assert.equals(allItems.length, 50);
    
    // 验证标签查询
    var evenItems = StorageManager.query({
      tags: ['even']
    });
    assert.equals(evenItems.length, 25);
    
    // 批量清除指定标签的数据
    StorageManager.clear({
      tags: ['odd']
    });
    
    // 验证清除结果
    var remainingItems = StorageManager.query({
      keyPattern: '^batch_item_'
    });
    assert.equals(remainingItems.length, 25);
  });
  
  /**
   * 测试错误处理
   * @category 稳定性测试
   * @priority P1
   */
  test('test_error_handling', function() {
    // 1. 测试未初始化状态
    var uninitializedManager = Object.create(StorageManager);
    uninitializedManager._state.initialized = false;
    
    // 未初始化状态应返回false，不应抛出异常
    var setResult = uninitializedManager.secureSet('test', { value: 'test' });
    assert.isFalse(setResult);
    
    var getResult = uninitializedManager.secureGet('test');
    assert.isNull(getResult);
    
    // 2. 测试无效参数
    // 无效键
    var nullKeyResult = StorageManager.secureSet(null, { value: 'test' });
    assert.isFalse(nullKeyResult);
    
    var emptyKeyResult = StorageManager.secureSet('', { value: 'test' });
    assert.isFalse(emptyKeyResult);
    
    // 无效数据
    var nullDataResult = StorageManager.secureSet('test', null);
    assert.isFalse(nullDataResult);
    
    // 3. 测试存储异常处理
    // 模拟存储失败
    wxMock.simulateStorageFailure(true);
    
    // 存储失败应返回false
    var storeFailResult = StorageManager.secureSet('fail_test', { value: 'will fail' });
    assert.isFalse(storeFailResult);
    
    // 读取失败应返回null
    var getFailResult = StorageManager.secureGet('existing_key');
    assert.isNull(getFailResult);
    
    // 恢复正常存储
    wxMock.simulateStorageFailure(false);
  });
  
  /**
   * 测试压力测试
   * @category 性能测试
   * @priority P3
   */
  test('test_stress_test', function() {
    // 该测试仅在特定环境下运行
    if (!StorageManager.config.enableStressTests) {
      console.log('压力测试已跳过，未启用');
      return;
    }
    
    // 准备大量数据
    var largeDataCount = 500;
    var largeDataSize = 10 * 1024; // 每条10KB
    
    console.log('开始压力测试: ' + largeDataCount + '条数据，每条' + (largeDataSize / 1024) + 'KB');
    
    // 生成大数据
    function generateLargeData(size) {
      var result = {
        id: Math.random().toString(36).substring(2),
        timestamp: Date.now(),
        data: []
      };
      
      // 填充数据至指定大小
      while (JSON.stringify(result).length < size) {
        result.data.push({
          value: Math.random().toString(36).substring(2),
          array: new Array(100).fill(Math.random())
        });
      }
      
      return result;
    }
    
    // 计时开始
    var startTime = Date.now();
    
    // 批量插入大数据
    for (var i = 0; i < largeDataCount; i++) {
      var largeData = generateLargeData(largeDataSize);
      StorageManager.secureSet('large_item_' + i, largeData, {
        securityLevel: i % 4
      });
      
      // 每100项检查一次进度
      if (i % 100 === 0 && i > 0) {
        var currentTime = Date.now();
        var elapsed = currentTime - startTime;
        console.log('已完成: ' + i + '/' + largeDataCount + ' (' + (elapsed / 1000).toFixed(2) + 's)');
      }
    }
    
    // 计时结束
    var endTime = Date.now();
    var totalDuration = endTime - startTime;
    
    // 输出性能统计
    console.log('压力测试完成');
    console.log('总用时: ' + (totalDuration / 1000).toFixed(2) + '秒');
    console.log('平均每条数据时间: ' + (totalDuration / largeDataCount).toFixed(2) + 'ms');
    
    // 验证存储统计
    var info = StorageManager.getStorageInfo();
    console.log('存储使用情况: ' + (info.currentSize / (1024 * 1024)).toFixed(2) + 'MB / ' + 
                (info.limitSize / (1024 * 1024)).toFixed(2) + 'MB');
    
    // 验证所有数据可访问
    var randomIndex = Math.floor(Math.random() * largeDataCount);
    var randomItem = StorageManager.secureGet('large_item_' + randomIndex);
    assert.isNotNull(randomItem);
    assert.isNotUndefined(randomItem.id);
    
    // 清理测试数据
    StorageManager.clear({
      keyPattern: '^large_item_'
    });
    
    // 验证清理结果
    var remainingItems = StorageManager.query({
      keyPattern: '^large_item_'
    });
    assert.equals(remainingItems.length, 0);
  });
}); 