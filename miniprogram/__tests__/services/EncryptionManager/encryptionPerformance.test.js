/**
 * EncryptionManager加密性能测试
 * 
 * 创建时间: 2025-04-15 10:25:33 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 测试文件
 */

// 引入测试框架
var assert = require('../../mocks/assert.mock');
var wxMock = require('../../mocks/wx.mock');
var EncryptionManager = require('../../../services/security/EncryptionManager');

// 测试套件
describe('EncryptionManager - 加密性能测试', function() {
  
  // 初始化测试环境
  beforeEach(function() {
    // 重置wx Mock
    wxMock.resetMock();
    
    // 初始化加密管理器
    EncryptionManager.init({
      storage: wxMock.storage,
      defaultAlgorithm: 'AES-256-CTR',
      useCompression: false,
      securityLevel: 'high'
    });
  });
  
  // 生成测试数据的辅助函数
  function generateTestData(size) {
    var data = '';
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    
    // 生成指定大小的随机数据（以KB为单位）
    var targetSize = size * 1024;
    while (data.length < targetSize) {
      data += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return data;
  }
  
  // 生成测试JSON数据的辅助函数
  function generateTestJsonData(recordCount) {
    var data = [];
    for (var i = 0; i < recordCount; i++) {
      data.push({
        id: i,
        name: 'user_' + i,
        email: 'user_' + i + '@example.com',
        timestamp: Date.now(),
        permissions: ['read', 'write', i % 3 === 0 ? 'admin' : 'user'],
        metadata: {
          lastLogin: Date.now() - Math.floor(Math.random() * 86400000),
          userAgent: 'Mozilla/5.0 (platform) Browser/Version',
          deviceType: i % 2 === 0 ? 'mobile' : 'desktop'
        }
      });
    }
    return data;
  }
  
  /**
   * 测试不同数据大小的加密性能
   * @category 性能测试
   * @priority P0
   */
  test('test_encryption_performance_by_size', function() {
    // 定义要测试的数据大小（KB）
    var testSizes = [1, 10, 100, 1000]; // 1KB, 10KB, 100KB, 1MB
    var results = {};
    
    for (var i = 0; i < testSizes.length; i++) {
      var size = testSizes[i];
      var testData = generateTestData(size);
      
      // 加密性能测试
      var startEncryptTime = Date.now();
      var encrypted = EncryptionManager.encrypt(testData);
      var encryptionTime = Date.now() - startEncryptTime;
      
      // 解密性能测试
      var startDecryptTime = Date.now();
      var decrypted = EncryptionManager.decrypt(encrypted);
      var decryptionTime = Date.now() - startDecryptTime;
      
      // 验证解密结果正确
      assert.equals(testData, decrypted);
      
      // 记录结果
      results[size + 'KB'] = {
        encryptionTime: encryptionTime + 'ms',
        decryptionTime: decryptionTime + 'ms'
      };
      
      // 输出结果
      console.log(size + 'KB 数据加密耗时: ' + encryptionTime + 'ms');
      console.log(size + 'KB 数据解密耗时: ' + decryptionTime + 'ms');
      
      // 验证性能在可接受范围内（可根据实际情况调整阈值）
      var threshold = size;  // 粗略估计，每KB数据处理时间不超过1ms
      assert.isTrue(encryptionTime < threshold, size + 'KB数据加密应在' + threshold + 'ms内完成');
      assert.isTrue(decryptionTime < threshold, size + 'KB数据解密应在' + threshold + 'ms内完成');
    }
  });
  
  /**
   * 测试不同算法的加密性能
   * @category 性能测试
   * @priority P0
   */
  test('test_encryption_performance_by_algorithm', function() {
    // 准备测试数据
    var testData = generateTestData(100); // 100KB
    
    // 定义要测试的算法
    var algorithms = [
      'AES-128-CTR',
      'AES-256-CTR',
      'AES-128-CBC',
      'AES-256-CBC',
      'AES-256-GCM'
    ];
    
    var results = {};
    
    for (var i = 0; i < algorithms.length; i++) {
      var algorithm = algorithms[i];
      
      try {
        // 加密性能测试
        var startEncryptTime = Date.now();
        var encrypted = EncryptionManager.encrypt(testData, { algorithm: algorithm });
        var encryptionTime = Date.now() - startEncryptTime;
        
        // 解密性能测试
        var startDecryptTime = Date.now();
        var decrypted = EncryptionManager.decrypt(encrypted, { algorithm: algorithm });
        var decryptionTime = Date.now() - startDecryptTime;
        
        // 验证解密结果正确
        assert.equals(testData, decrypted);
        
        // 记录结果
        results[algorithm] = {
          encryptionTime: encryptionTime + 'ms',
          decryptionTime: decryptionTime + 'ms'
        };
        
        // 输出结果
        console.log(algorithm + ' 加密耗时: ' + encryptionTime + 'ms');
        console.log(algorithm + ' 解密耗时: ' + decryptionTime + 'ms');
      } catch (e) {
        console.log(algorithm + ' 不支持: ' + e.message);
        results[algorithm] = 'not supported';
      }
    }
  });
  
  /**
   * 测试加密压缩性能
   * @category 性能测试
   * @priority P1
   */
  test('test_encryption_compression_performance', function() {
    // 生成高度可压缩的数据
    var testData = 'a'.repeat(100 * 1024); // 100KB的重复字符
    
    // 无压缩加密测试
    EncryptionManager.configure({ useCompression: false });
    
    var startNoCompressEncryptTime = Date.now();
    var encryptedNoCompress = EncryptionManager.encrypt(testData);
    var encryptionNoCompressTime = Date.now() - startNoCompressEncryptTime;
    
    var startNoCompressDecryptTime = Date.now();
    var decryptedNoCompress = EncryptionManager.decrypt(encryptedNoCompress);
    var decryptionNoCompressTime = Date.now() - startNoCompressDecryptTime;
    
    // 启用压缩加密测试
    EncryptionManager.configure({ useCompression: true });
    
    var startCompressEncryptTime = Date.now();
    var encryptedCompress = EncryptionManager.encrypt(testData);
    var encryptionCompressTime = Date.now() - startCompressEncryptTime;
    
    var startCompressDecryptTime = Date.now();
    var decryptedCompress = EncryptionManager.decrypt(encryptedCompress);
    var decryptionCompressTime = Date.now() - startCompressDecryptTime;
    
    // 验证解密结果正确
    assert.equals(testData, decryptedNoCompress);
    assert.equals(testData, decryptedCompress);
    
    // 验证压缩后的加密数据更小
    assert.isTrue(encryptedCompress.length < encryptedNoCompress.length, 
      '压缩后加密数据应小于未压缩加密数据');
    
    // 输出结果
    console.log('无压缩加密耗时: ' + encryptionNoCompressTime + 'ms');
    console.log('无压缩解密耗时: ' + decryptionNoCompressTime + 'ms');
    console.log('压缩加密耗时: ' + encryptionCompressTime + 'ms');
    console.log('压缩解密耗时: ' + decryptionCompressTime + 'ms');
    console.log('未压缩加密数据长度: ' + encryptedNoCompress.length);
    console.log('压缩加密数据长度: ' + encryptedCompress.length);
    console.log('压缩率: ' + (100 - (encryptedCompress.length / encryptedNoCompress.length * 100)).toFixed(2) + '%');
  });
  
  /**
   * 测试JSON结构加密性能
   * @category 性能测试
   * @priority P1
   */
  test('test_json_data_encryption_performance', function() {
    // 准备不同大小的JSON数据
    var sizes = [10, 100, 1000];
    var results = {};
    
    for (var i = 0; i < sizes.length; i++) {
      var count = sizes[i];
      var jsonData = generateTestJsonData(count);
      
      // 加密性能测试
      var startEncryptTime = Date.now();
      var encrypted = EncryptionManager.encrypt(jsonData);
      var encryptionTime = Date.now() - startEncryptTime;
      
      // 解密性能测试
      var startDecryptTime = Date.now();
      var decrypted = EncryptionManager.decrypt(encrypted);
      var decryptionTime = Date.now() - startDecryptTime;
      
      // 验证解密结果正确
      assert.equals(jsonData.length, decrypted.length);
      assert.deepEquals(jsonData[0], decrypted[0]);
      
      // 记录结果
      results[count + '条记录'] = {
        encryptionTime: encryptionTime + 'ms',
        decryptionTime: decryptionTime + 'ms'
      };
      
      // 输出结果
      console.log(count + '条JSON记录加密耗时: ' + encryptionTime + 'ms');
      console.log(count + '条JSON记录解密耗时: ' + decryptionTime + 'ms');
      
      // 验证性能在可接受范围内
      assert.isTrue(encryptionTime < count, count + '条JSON记录加密应在' + count + 'ms内完成');
      assert.isTrue(decryptionTime < count, count + '条JSON记录解密应在' + count + 'ms内完成');
    }
  });
  
  /**
   * 测试批量加密性能
   * @category 性能测试
   * @priority P1
   */
  test('test_batch_encryption_performance', function() {
    // 准备多个小型数据项
    var dataItems = [];
    for (var i = 0; i < 100; i++) {
      dataItems.push('数据项-' + i + '-' + generateTestData(1)); // 1KB数据
    }
    
    // 单独加密每个数据项
    var startIndividualEncryptTime = Date.now();
    var encryptedItems = [];
    for (var i = 0; i < dataItems.length; i++) {
      encryptedItems.push(EncryptionManager.encrypt(dataItems[i]));
    }
    var individualEncryptionTime = Date.now() - startIndividualEncryptTime;
    
    // 单独解密每个数据项
    var startIndividualDecryptTime = Date.now();
    var decryptedItems = [];
    for (var i = 0; i < encryptedItems.length; i++) {
      decryptedItems.push(EncryptionManager.decrypt(encryptedItems[i]));
    }
    var individualDecryptionTime = Date.now() - startIndividualDecryptTime;
    
    // 批量加密（一次性加密所有数据）
    var startBatchEncryptTime = Date.now();
    var encryptedBatch = EncryptionManager.encrypt(dataItems);
    var batchEncryptionTime = Date.now() - startBatchEncryptTime;
    
    // 批量解密
    var startBatchDecryptTime = Date.now();
    var decryptedBatch = EncryptionManager.decrypt(encryptedBatch);
    var batchDecryptionTime = Date.now() - startBatchDecryptTime;
    
    // 验证解密结果正确
    for (var i = 0; i < dataItems.length; i++) {
      assert.equals(dataItems[i], decryptedItems[i]);
    }
    assert.deepEquals(dataItems, decryptedBatch);
    
    // 输出结果
    console.log('逐个加密100项数据耗时: ' + individualEncryptionTime + 'ms');
    console.log('逐个解密100项数据耗时: ' + individualDecryptionTime + 'ms');
    console.log('批量加密100项数据耗时: ' + batchEncryptionTime + 'ms');
    console.log('批量解密100项数据耗时: ' + batchDecryptionTime + 'ms');
    
    // 验证批量处理更快
    assert.isTrue(batchEncryptionTime < individualEncryptionTime, 
      '批量加密应比逐个加密更快');
    assert.isTrue(batchDecryptionTime < individualDecryptionTime, 
      '批量解密应比逐个解密更快');
  });
  
  /**
   * 测试多线程加密模拟
   * @category 性能测试
   * @priority P2
   */
  test('test_mock_concurrent_encryption', function() {
    // 模拟多个同时加密请求
    var requestCount = 50;
    var testData = generateTestData(10); // 10KB
    
    var startTime = Date.now();
    
    // 模拟多个请求（顺序执行，但测量总时间）
    for (var i = 0; i < requestCount; i++) {
      var data = testData + i; // 轻微修改数据以避免缓存
      var encrypted = EncryptionManager.encrypt(data);
      var decrypted = EncryptionManager.decrypt(encrypted);
      assert.equals(data, decrypted);
    }
    
    var totalTime = Date.now() - startTime;
    var avgTimePerRequest = totalTime / requestCount;
    
    // 输出结果
    console.log('模拟' + requestCount + '个并发请求总耗时: ' + totalTime + 'ms');
    console.log('平均每个请求耗时: ' + avgTimePerRequest + 'ms');
    
    // 验证性能在可接受范围内
    assert.isTrue(avgTimePerRequest < 50, '平均每个加密/解密请求应在50ms内完成');
  });
  
  /**
   * 测试加密内存使用
   * @category 性能测试
   * @priority P2
   */
  test('test_encryption_memory_usage', function() {
    if (typeof global.gc === 'function') {
      // 如果有垃圾收集器可用，先运行一次
      global.gc();
    }
    
    // 记录初始内存使用
    var initialMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
    
    // 加密大量数据
    var largeData = generateTestData(1000); // 1MB
    var encrypted = EncryptionManager.encrypt(largeData);
    var decrypted = EncryptionManager.decrypt(encrypted);
    
    // 确保结果正确
    assert.equals(largeData.length, decrypted.length);
    
    // 记录结束内存使用
    var finalMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
    var memoryDelta = finalMemory - initialMemory;
    
    if (initialMemory > 0) {
      // 输出内存使用情况
      console.log('加密解密1MB数据内存增长: ' + (memoryDelta / 1024 / 1024).toFixed(2) + 'MB');
      
      // 验证内存使用在合理范围内
      // 注：因为JavaScript字符串是不可变的，所以会有额外内存开销
      assert.isTrue(memoryDelta < 10 * 1024 * 1024, '处理1MB数据的内存增长应小于10MB');
    } else {
      console.log('此环境下无法测量内存使用');
    }
  });
}); 