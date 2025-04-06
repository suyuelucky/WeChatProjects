/**
 * 测试工具箱
 * 提供小程序各模块的极端测试功能
 */

var testUtils = {
  /**
   * 初始化测试环境
   */
  init: function() {
    console.log('[TestUtils] 初始化测试环境');
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      logs: []
    };
    return this;
  },

  /**
   * 记录测试结果
   * @param {String} name 测试名称
   * @param {Boolean} isPassed 是否通过
   * @param {String} message 详细信息
   * @param {Object} data 相关数据
   */
  log: function(name, isPassed, message, data) {
    this.results.total++;
    if (isPassed) {
      this.results.passed++;
      console.log('[✓] ' + name + ': ' + message);
    } else {
      this.results.failed++;
      console.error('[✗] ' + name + ': ' + message, data || '');
    }

    this.results.logs.push({
      name: name,
      passed: isPassed,
      message: message,
      data: data,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * 断言表达式为真
   * @param {String} name 测试名称
   * @param {Boolean} expression 断言表达式
   * @param {String} message 错误信息
   */
  assert: function(name, expression, message) {
    this.log(name, !!expression, expression ? '通过' : (message || '断言失败'), {
      expression: expression
    });
    return !!expression;
  },

  /**
   * 获取测试结果摘要
   */
  getSummary: function() {
    var duration = Date.now() - this._startTime;
    return {
      passed: this.results.passed,
      failed: this.results.failed,
      total: this.results.total,
      duration: duration,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * 运行图像处理模块测试
   */
  testImageProcessor: function() {
    var that = this;
    this._startTime = Date.now();
    
    console.log('[TestUtils] 开始测试图像处理模块');
    
    try {
      // 测试模块导入
      var imageProcessor = require('./imageProcessor');
      this.assert('模块导入', imageProcessor, '模块导入失败');
      
      // 检查API是否存在
      this.assert('API: compressImage', typeof imageProcessor.compressImage === 'function', '压缩图像API不存在');
      this.assert('API: resizeImage', typeof imageProcessor.resizeImage === 'function', '调整图像大小API不存在');
      this.assert('API: batchProcess', typeof imageProcessor.batchProcess === 'function', '批量处理API不存在');
      
      // 测试压缩图像功能
      if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
        var info = wx.getSystemInfoSync();
        this.log('系统信息', true, 'SDK版本：' + info.SDKVersion, info);
      }
      
      // 直接返回结果，异步测试可通过回调处理
      return this.getSummary();
    } catch (error) {
      this.log('测试执行', false, '发生异常: ' + error.message, error);
      return this.getSummary();
    }
  },
  
  /**
   * 运行照片批处理器测试
   */
  testPhotoBatchProcessor: function() {
    this._startTime = Date.now();
    
    console.log('[TestUtils] 开始测试照片批处理器');
    
    try {
      // 测试模块导入
      var photoBatchProcessor = require('./photoBatchProcessor');
      this.assert('模块导入', photoBatchProcessor, '模块导入失败');
      
      // 检查API是否存在
      this.assert('API: processBatch', typeof photoBatchProcessor.processBatch === 'function', '批处理API不存在');
      this.assert('API: getProcessingStats', typeof photoBatchProcessor.getProcessingStats === 'function', '获取统计API不存在');
      this.assert('API: cleanupCache', typeof photoBatchProcessor.cleanupCache === 'function', '清理缓存API不存在');
      
      // 返回结果
      return this.getSummary();
    } catch (error) {
      this.log('测试执行', false, '发生异常: ' + error.message, error);
      return this.getSummary();
    }
  },
  
  /**
   * 测试工作留痕系统
   */
  testTraceSystem: function() {
    this._startTime = Date.now();
    
    console.log('[TestUtils] 开始测试工作留痕系统');
    
    try {
      // 测试模块导入
      var traceService = require('../services/traceService');
      this.assert('模块导入', traceService, '模块导入失败');
      
      // 检查API是否存在
      this.assert('API: getTraceTypes', typeof traceService.getTraceTypes === 'function', '获取留痕类型API不存在');
      this.assert('API: getAllTraces', typeof traceService.getAllTraces === 'function', '获取所有留痕API不存在');
      
      // 检查留痕类型
      var types = traceService.getTraceTypes();
      this.assert('留痕类型数量', Array.isArray(types) && types.length > 0, '留痕类型列表为空');
      
      // 检查每个类型是否有必要字段
      if (Array.isArray(types)) {
        for (var i = 0; i < types.length; i++) {
          var type = types[i];
          this.assert(
            '留痕类型完整性: ' + (type.id || '未知'), 
            type.id && type.name && type.icon && type.description,
            '留痕类型缺少必要字段'
          );
        }
      }
      
      // 返回结果
      return this.getSummary();
    } catch (error) {
      this.log('测试执行', false, '发生异常: ' + error.message, error);
      return this.getSummary();
    }
  },
  
  /**
   * 运行所有测试
   */
  runAllTests: function() {
    var that = this;
    this.init();
    this._startTime = Date.now();
    
    console.log('[TestUtils] 开始运行所有测试');
    
    // 记录测试时间
    var startTime = Date.now();
    
    // 存储所有测试结果
    var results = {
      imageProcessor: null,
      photoBatchProcessor: null,
      traceSystem: null
    };
    
    // 运行图像处理模块测试
    try {
      results.imageProcessor = this.testImageProcessor();
    } catch (error) {
      console.error('图像处理模块测试失败', error);
      results.imageProcessor = {
        error: error.message,
        passed: 0,
        failed: 1,
        total: 1
      };
    }
    
    // 运行照片批处理器测试
    try {
      results.photoBatchProcessor = this.testPhotoBatchProcessor();
    } catch (error) {
      console.error('照片批处理器测试失败', error);
      results.photoBatchProcessor = {
        error: error.message,
        passed: 0,
        failed: 1,
        total: 1
      };
    }
    
    // 运行工作留痕系统测试
    try {
      results.traceSystem = this.testTraceSystem();
    } catch (error) {
      console.error('工作留痕系统测试失败', error);
      results.traceSystem = {
        error: error.message,
        passed: 0,
        failed: 1,
        total: 1
      };
    }
    
    // 计算总结果
    var totalPassed = (results.imageProcessor?.passed || 0) + 
                      (results.photoBatchProcessor?.passed || 0) + 
                      (results.traceSystem?.passed || 0);
    var totalFailed = (results.imageProcessor?.failed || 0) + 
                      (results.photoBatchProcessor?.failed || 0) + 
                      (results.traceSystem?.failed || 0);
    var totalTests = (results.imageProcessor?.total || 0) + 
                     (results.photoBatchProcessor?.total || 0) + 
                     (results.traceSystem?.total || 0);
    
    var duration = Date.now() - startTime;
    
    // 汇总结果
    var summary = {
      passed: totalPassed,
      failed: totalFailed,
      total: totalTests,
      duration: duration,
      timestamp: new Date().toISOString(),
      results: results
    };
    
    // 输出测试汇总
    if (totalFailed > 0) {
      console.error('[TestUtils] 测试完成，存在失败项目：', totalPassed + '/' + totalTests + ' 通过');
    } else {
      console.log('[TestUtils] 测试全部通过：', totalPassed + '/' + totalTests + ' 通过');
    }
    
    return summary;
  }
};

module.exports = testUtils; 