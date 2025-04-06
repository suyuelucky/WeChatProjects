/**
 * 极端测试助手
 * 用于测试系统在各种极端条件下的表现
 */

var testUtils = require('./testUtils');

var extremeTestHelper = {
  /**
   * 执行内存压力测试
   * @param {Number} iterations - 迭代次数
   * @param {Number} objectSize - 每个对象大小(KB)
   * @returns {Object} 测试结果
   */
  memoryPressureTest: function(iterations, objectSize) {
    console.log('[ExtremeTestHelper] 开始内存压力测试');
    
    var startTime = Date.now();
    var memoryObjects = [];
    var errors = [];
    
    try {
      // 创建指定大小的对象
      for (var i = 0; i < iterations; i++) {
        try {
          var obj = {
            id: 'obj_' + i,
            data: new Array(objectSize * 256).join('x'), // 约1KB = 1024字节
            timestamp: Date.now()
          };
          memoryObjects.push(obj);
          
          if (i % 10 === 0) {
            console.log('[ExtremeTestHelper] 已创建', i, '个对象');
          }
        } catch (err) {
          errors.push({
            iteration: i,
            error: err.message
          });
          break;
        }
      }
    } catch (e) {
      console.error('[ExtremeTestHelper] 内存压力测试失败', e);
    }
    
    var duration = Date.now() - startTime;
    
    // 清理内存
    memoryObjects = null;
    
    if (typeof gc !== 'undefined') {
      gc();
    }
    
    return {
      type: 'memoryPressure',
      objectsCreated: memoryObjects ? memoryObjects.length : 0,
      objectSizeKB: objectSize,
      duration: duration,
      errors: errors,
      timestamp: new Date().toISOString()
    };
  },
  
  /**
   * 网络失败模拟测试
   * @param {Number} failureRate - 失败率(0-1)
   * @param {Number} testCount - 测试次数
   */
  networkFailureTest: function(failureRate, testCount) {
    console.log('[ExtremeTestHelper] 开始网络失败模拟测试');
    
    var originalRequest = wx.request;
    var results = {
      total: 0,
      failed: 0,
      succeeded: 0,
      errors: []
    };
    
    // 重写wx.request
    wx.request = function(options) {
      results.total++;
      
      // 根据失败率决定是否模拟失败
      if (Math.random() < failureRate) {
        results.failed++;
        
        var error = {
          errMsg: '模拟的网络错误',
          statusCode: [404, 500, 502, 503][Math.floor(Math.random() * 4)]
        };
        
        results.errors.push(error);
        
        if (typeof options.fail === 'function') {
          options.fail(error);
        }
        
        if (typeof options.complete === 'function') {
          options.complete(error);
        }
        
        return;
      }
      
      // 正常请求
      results.succeeded++;
      originalRequest(options);
    };
    
    // 执行测试请求
    for (var i = 0; i < testCount; i++) {
      wx.request({
        url: 'https://www.example.com/api/test',
        success: function(res) {
          console.log('[ExtremeTestHelper] 测试请求成功');
        },
        fail: function(err) {
          console.log('[ExtremeTestHelper] 测试请求失败', err);
        }
      });
    }
    
    // 恢复原始wx.request
    setTimeout(function() {
      wx.request = originalRequest;
      console.log('[ExtremeTestHelper] 网络测试完成，已恢复原始请求功能');
    }, 5000);
    
    return results;
  },
  
  /**
   * 极端数据测试
   * @param {String} targetModule - 目标模块名称
   * @returns {Object} 测试结果
   */
  extremeDataTest: function(targetModule) {
    console.log('[ExtremeTestHelper] 开始极端数据测试:', targetModule);
    
    var results = {
      passed: 0,
      failed: 0,
      errors: []
    };
    
    // 常见极端测试用例
    var extremeCases = [
      { name: '空值测试', value: null },
      { name: '未定义测试', value: undefined },
      { name: '空字符串测试', value: '' },
      { name: '超长字符串测试', value: new Array(10000).join('x') },
      { name: '特殊字符测试', value: '!@#$%^&*()_+{}|:"<>?~`-=[]\\;\',./𠮷😊' },
      { name: 'SQL注入测试', value: "' OR 1=1; --" },
      { name: 'HTML注入测试', value: '<script>alert("XSS")</script>' },
      { name: '空数组测试', value: [] },
      { name: '超大数组测试', value: new Array(1000) },
      { name: '负数测试', value: -9999999 },
      { name: '零测试', value: 0 },
      { name: '超大数字测试', value: 9999999999999999 },
      { name: 'NaN测试', value: NaN },
      { name: 'Infinity测试', value: Infinity },
      { name: '空对象测试', value: {} },
      { name: '嵌套对象测试', value: { a: { b: { c: { d: { e: 1 } } } } } }
    ];
    
    // 获取目标模块
    var targetModuleObj;
    try {
      var moduleAdapter = require('./moduleAdapter');
      
      switch (targetModule) {
        case 'imageProcessor':
          targetModuleObj = moduleAdapter.getImageProcessor();
          break;
        case 'photoBatchProcessor':
          targetModuleObj = moduleAdapter.getPhotoBatchProcessor();
          break;
        case 'traceService':
          targetModuleObj = require('../services/traceService');
          break;
        default:
          try {
            targetModuleObj = moduleAdapter.getModule(targetModule);
          } catch (e) {
            results.errors.push({
              name: '模块加载',
              error: '无法加载模块: ' + targetModule
            });
            return results;
          }
      }
    } catch (error) {
      results.errors.push({
        name: '模块加载',
        error: error.message
      });
      return results;
    }
    
    // 测试模块的每个方法
    for (var method in targetModuleObj) {
      if (typeof targetModuleObj[method] === 'function') {
        console.log('[ExtremeTestHelper] 测试方法:', method);
        
        // 对每个极端用例进行测试
        extremeCases.forEach(function(testCase) {
          try {
            // 尝试调用方法，但不等待结果
            targetModuleObj[method](testCase.value);
            results.passed++;
          } catch (error) {
            results.failed++;
            results.errors.push({
              method: method,
              testCase: testCase.name,
              error: error.message
            });
          }
        });
      }
    }
    
    return results;
  },
  
  /**
   * 运行完整极端测试套件
   */
  runExtremeSuite: function() {
    console.log('[ExtremeTestHelper] 开始运行极端测试套件');
    
    var results = {
      memoryTest: null,
      networkTest: null,
      imageProcessorTest: null,
      photoBatchProcessorTest: null,
      traceServiceTest: null
    };
    
    try {
      // 内存压力测试
      results.memoryTest = this.memoryPressureTest(100, 10);
      
      // 网络测试
      results.networkTest = this.networkFailureTest(0.5, 5);
      
      // 模块极端数据测试
      results.imageProcessorTest = this.extremeDataTest('imageProcessor');
      results.photoBatchProcessorTest = this.extremeDataTest('photoBatchProcessor');
      results.traceServiceTest = this.extremeDataTest('traceService');
      
    } catch (error) {
      console.error('[ExtremeTestHelper] 极端测试套件执行失败', error);
    }
    
    console.log('[ExtremeTestHelper] 极端测试套件执行完毕');
    return results;
  }
};

module.exports = extremeTestHelper; 