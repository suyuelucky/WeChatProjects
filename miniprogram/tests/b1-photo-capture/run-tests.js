/**
 * B1照片捕捉功能测试运行器
 * 创建时间: 2025-04-10 10:22:36
 * 创建者: Claude AI 3.7 Sonnet
 */

// 导入测试用例
var ConfigManagerTest = require('./config-manager.test');
var PhotoProcessorTest = require('./photo-processor.test');

/**
 * 测试运行器
 */
var TestRunner = {
  // 测试状态
  _status: {
    total: 0,
    passed: 0,
    failed: 0,
    running: false
  },
  
  /**
   * 运行所有测试
   */
  runAllTests: function() {
    var that = this;
    
    // 避免重复运行
    if (this._status.running) {
      console.warn('[TestRunner] 测试已在运行中，请等待完成');
      return;
    }
    
    // 重置状态
    this._resetStatus();
    this._status.running = true;
    
    // 显示测试开始提示
    console.log('==================================================');
    console.log('开始运行B1照片捕捉功能测试 - ' + this._getCurrentTime());
    console.log('==================================================');
    
    // 使用Promise链式执行测试，确保有序执行
    this._runTest('配置管理器测试', function() {
      return ConfigManagerTest.runAllTests();
    })
    .then(function() {
      return that._runTest('照片处理器测试', function() {
        return PhotoProcessorTest.runAllTests();
      });
    })
    .then(function() {
      // 测试完成
      that._showTestResults();
      that._status.running = false;
    })
    .catch(function(error) {
      // 测试出错
      console.error('[TestRunner] 测试执行出错:', error);
      that._status.running = false;
      that._showTestResults();
    });
  },
  
  /**
   * 运行单个测试组
   * @param {String} name 测试名称
   * @param {Function} testFn 测试函数
   * @returns {Promise} 测试结果Promise
   * @private
   */
  _runTest: function(name, testFn) {
    var that = this;
    
    console.log('\n----- 开始测试: ' + name + ' -----');
    
    return new Promise(function(resolve, reject) {
      try {
        // 检查测试函数是否返回Promise
        var result = testFn();
        
        if (result && typeof result.then === 'function') {
          // Promise测试
          result
            .then(function() {
              console.log('----- 测试通过: ' + name + ' -----');
              that._status.passed++;
              that._status.total++;
              resolve();
            })
            .catch(function(error) {
              console.error('----- 测试失败: ' + name + ' -----');
              console.error('错误信息:', error);
              that._status.failed++;
              that._status.total++;
              // 测试失败也视为完成，不中断后续测试
              resolve();
            });
        } else {
          // 同步测试
          console.log('----- 测试通过: ' + name + ' -----');
          that._status.passed++;
          that._status.total++;
          resolve();
        }
      } catch (error) {
        console.error('----- 测试失败: ' + name + ' -----');
        console.error('错误信息:', error);
        that._status.failed++;
        that._status.total++;
        // 测试失败也视为完成，不中断后续测试
        resolve();
      }
    });
  },
  
  /**
   * 重置测试状态
   * @private
   */
  _resetStatus: function() {
    this._status = {
      total: 0,
      passed: 0,
      failed: 0,
      running: false
    };
  },
  
  /**
   * 显示测试结果
   * @private
   */
  _showTestResults: function() {
    console.log('\n==================================================');
    console.log('测试执行完成 - ' + this._getCurrentTime());
    console.log('总测试数: ' + this._status.total);
    console.log('通过测试: ' + this._status.passed);
    console.log('失败测试: ' + this._status.failed);
    
    if (this._status.failed === 0) {
      console.log('测试结果: 全部通过 ✓');
    } else {
      console.log('测试结果: 存在失败 ✗');
    }
    console.log('==================================================\n');
    
    // 在界面显示结果
    if (typeof wx !== 'undefined') {
      wx.showModal({
        title: '测试执行完成',
        content: '总测试数: ' + this._status.total + 
                '\n通过测试: ' + this._status.passed + 
                '\n失败测试: ' + this._status.failed,
        showCancel: false
      });
    }
  },
  
  /**
   * 获取当前时间字符串
   * @returns {String} 格式化的时间字符串
   * @private
   */
  _getCurrentTime: function() {
    var now = new Date();
    var year = now.getFullYear();
    var month = this._padZero(now.getMonth() + 1);
    var day = this._padZero(now.getDate());
    var hours = this._padZero(now.getHours());
    var minutes = this._padZero(now.getMinutes());
    var seconds = this._padZero(now.getSeconds());
    
    return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds;
  },
  
  /**
   * 数字补零
   * @param {Number} num 数字
   * @returns {String} 补零后的字符串
   * @private
   */
  _padZero: function(num) {
    return num < 10 ? '0' + num : '' + num;
  }
};

// 导出测试运行器
module.exports = TestRunner; 