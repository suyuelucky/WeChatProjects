/**
 * 工作留痕系统 - 照片采集模块测试运行器
 * 符合ES5标准，确保微信小程序兼容性
 * 更新日期: 2025-04-09
 */

var PerformanceTest = require('./PerformanceTest');
var FunctionalTest = require('./FunctionalTest');
var CompatibilityTest = require('./CompatibilityTest');
var SecurityTest = require('./SecurityTest');
var PhotoCaptureUXTest = require('./UXTest'); // 用户体验测试框架

var TestRunner = {
  /**
   * 初始化测试运行器
   * @param {Object} options 配置选项
   */
  init: function(options) {
    this.options = options || {};
    this.results = {
      performance: null,
      functional: null,
      compatibility: null,
      security: null,
      ux: null, // 用户体验测试结果
      summary: null
    };
    
    console.info('[TestRunner] 测试运行器初始化完成');
  },
  
  /**
   * 运行性能测试
   * @param {Object} options 测试选项
   * @param {Function} callback 回调函数
   */
  runPerformanceTests: function(options, callback) {
    var that = this;
    console.info('[TestRunner] 开始运行性能测试...');
    
    PerformanceTest.init(options);
    PerformanceTest.runFullTestSuite(options, function(results) {
      that.results.performance = results;
      console.info('[TestRunner] 性能测试完成');
      
      if (callback) {
        callback(results);
      }
    });
  },
  
  /**
   * 运行功能测试
   * @param {Object} options 测试选项
   * @param {Function} callback 回调函数
   */
  runFunctionalTests: function(options, callback) {
    var that = this;
    console.info('[TestRunner] 开始运行功能测试...');
    
    FunctionalTest.init(options);
    FunctionalTest.runAllTests(options, function(results) {
      that.results.functional = results;
      console.info('[TestRunner] 功能测试完成');
      
      if (callback) {
        callback(results);
      }
    });
  },
  
  /**
   * 运行兼容性测试
   * @param {Object} options 测试选项
   * @param {Function} callback 回调函数
   */
  runCompatibilityTests: function(options, callback) {
    var that = this;
    console.info('[TestRunner] 开始运行兼容性测试...');
    
    CompatibilityTest.init(options);
    CompatibilityTest.runAllTests(options, function(results) {
      that.results.compatibility = results;
      console.info('[TestRunner] 兼容性测试完成');
      
      if (callback) {
        callback(results);
      }
    });
  },
  
  /**
   * 运行安全测试
   * @param {Object} options 测试选项
   * @param {Function} callback 回调函数
   */
  runSecurityTests: function(options, callback) {
    var that = this;
    console.info('[TestRunner] 开始运行安全测试...');
    
    SecurityTest.init(options);
    SecurityTest.runAllTests(options, function(results) {
      that.results.security = results;
      console.info('[TestRunner] 安全测试完成');
      
      if (callback) {
        callback(results);
      }
    });
  },
  
  /**
   * 运行用户体验测试
   * @param {Object} options 测试选项
   * @param {Function} callback 回调函数
   */
  runUXTests: function(options, callback) {
    var that = this;
    console.info('[TestRunner] 开始运行用户体验测试...');
    
    // 初始化用户体验测试框架
    PhotoCaptureUXTest.init(options);
    
    // 运行所有用户体验测试
    var results = PhotoCaptureUXTest.runAllTests();
    that.results.ux = results;
    console.info('[TestRunner] 用户体验测试完成');
    
    if (callback) {
      callback(results);
    }
  },
  
  /**
   * 运行所有测试
   * @param {Object} options 测试选项
   * @param {Function} callback 回调函数
   */
  runAllTests: function(options, callback) {
    var that = this;
    var opts = options || {};
    
    console.info('[TestRunner] 开始运行所有测试...');
    
    // 按顺序运行测试套件
    this.runPerformanceTests(opts, function() {
      that.runFunctionalTests(opts, function() {
        that.runCompatibilityTests(opts, function() {
          that.runSecurityTests(opts, function() {
            that.runUXTests(opts, function() { // 新增用户体验测试
              // 生成总体报告
              that.results.summary = that._generateSummaryReport();
              console.info('[TestRunner] 所有测试完成');
              
              if (callback) {
                callback(that.results);
              }
            });
          });
        });
      });
    });
  },
  
  /**
   * 生成总体测试报告
   * @return {Object} 总体测试报告
   */
  _generateSummaryReport: function() {
    var performancePassRate = this.results.performance ? 
      this._getPassRate(this.results.performance) : 0;
    
    var functionalPassRate = this.results.functional ? 
      this._getPassRate(this.results.functional) : 0;
    
    var compatibilityPassRate = this.results.compatibility ? 
      this._getPassRate(this.results.compatibility) : 0;
    
    var securityPassRate = this.results.security ? 
      this._getPassRate(this.results.security) : 0;
      
    var uxPassRate = this.results.ux ? 
      this._getPassRate(this.results.ux) : 0;
    
    // 计算总体通过率
    var overallPassRate = (performancePassRate + functionalPassRate + 
                          compatibilityPassRate + securityPassRate + 
                          uxPassRate) / 5;
    
    return {
      timestamp: new Date().toISOString(),
      passRates: {
        performance: performancePassRate,
        functional: functionalPassRate,
        compatibility: compatibilityPassRate,
        security: securityPassRate,
        ux: uxPassRate,
        overall: overallPassRate
      },
      status: overallPassRate >= 0.9 ? 'PASS' : 'FAIL',
      recommendations: this._generateRecommendations()
    };
  },
  
  /**
   * 获取测试结果的通过率
   * @param {Object} results 测试结果
   * @return {Number} 通过率(0-1)
   */
  _getPassRate: function(results) {
    // 从结果中提取通过率，不同测试套件的结构可能不同
    if (results.summary && typeof results.summary.passRate !== 'undefined') {
      return results.summary.passRate;
    }
    
    // 如果结果中没有直接的通过率，计算一个
    var passed = 0;
    var total = 0;
    
    if (results.results) {
      var testResults = results.results;
      for (var key in testResults) {
        if (testResults.hasOwnProperty(key)) {
          total++;
          if (testResults[key].passed) {
            passed++;
          }
        }
      }
    }
    
    return total > 0 ? passed / total : 0;
  },
  
  /**
   * 生成改进建议
   * @return {Array} 改进建议列表
   * @private
   */
  _generateRecommendations: function() {
    var recommendations = [];
    
    // 性能测试建议
    if (this.results.performance) {
      if (this._getPassRate(this.results.performance) < 0.8) {
        recommendations.push("优化照片采集性能，特别是相机启动速度和图片处理速度");
      }
      
      // 从性能测试中提取具体的低性能指标
      var perfResults = this.results.performance.results;
      if (perfResults) {
        for (var key in perfResults) {
          if (perfResults.hasOwnProperty(key) && !perfResults[key].passed) {
            switch (key) {
              case 'cameraStart':
                recommendations.push("优化相机启动时间，当前启动时间不满足性能要求");
                break;
              case 'photoCapture':
                recommendations.push("提高拍照操作响应速度");
                break;
              case 'imageCompress':
                recommendations.push("优化图片压缩算法，减少处理时间");
                break;
              case 'photoListLoading':
                recommendations.push("优化照片列表加载性能，特别是在弱网环境下");
                break;
            }
          }
        }
      }
    }
    
    // 功能测试建议
    if (this.results.functional) {
      if (this._getPassRate(this.results.functional) < 0.9) {
        recommendations.push("完善照片采集核心功能，确保所有功能正常工作");
      }
    }
    
    // 兼容性测试建议
    if (this.results.compatibility) {
      if (this._getPassRate(this.results.compatibility) < 0.8) {
        recommendations.push("改善不同设备和系统版本的兼容性，确保一致的用户体验");
      }
    }
    
    // 安全测试建议
    if (this.results.security) {
      if (this._getPassRate(this.results.security) < 0.95) {
        recommendations.push("增强照片数据的安全性保护和隐私处理");
      }
    }
    
    // 用户体验测试建议
    if (this.results.ux) {
      if (this._getPassRate(this.results.ux) < 0.85) {
        recommendations.push("提升照片采集模块的整体用户体验");
      }
      
      // 获取具体的低分用户体验维度
      var categories = {};
      
      if (this.results.ux.results) {
        for (var i = 0; i < this.results.ux.results.length; i++) {
          var result = this.results.ux.results[i];
          if (!result.passed) {
            var category = result.category;
            if (!categories[category]) {
              categories[category] = [];
            }
            categories[category].push(result.name);
          }
        }
        
        for (var category in categories) {
          if (categories.hasOwnProperty(category)) {
            switch (category) {
              case 'usability':
                recommendations.push("改进照片采集界面的可用性，提高操作直观性和便捷性");
                break;
              case 'intuitiveness':
                recommendations.push("增强界面的直觉性设计，减少用户学习成本");
                break;
              case 'efficiency':
                recommendations.push("优化照片采集流程，减少操作步骤，提高任务完成效率");
                break;
              case 'satisfaction':
                recommendations.push("提升用户满意度，改善用户情感体验");
                break;
              case 'accessibility':
                recommendations.push("增强无障碍功能支持，确保所有用户群体可用");
                break;
              case 'aesthetics':
                recommendations.push("改进视觉设计，提高界面美观度和一致性");
                break;
            }
          }
        }
      }
    }
    
    // 去重
    var uniqueRecommendations = [];
    for (var i = 0; i < recommendations.length; i++) {
      if (uniqueRecommendations.indexOf(recommendations[i]) === -1) {
        uniqueRecommendations.push(recommendations[i]);
      }
    }
    
    return uniqueRecommendations;
  }
};

// 新增：安全检查工具
var SecurityChecker = {
  // 检查XSS风险
  checkXSSRisk: function(input) {
    if (!input || typeof input !== 'string') return false;
    
    // 检查常见XSS攻击向量
    var xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript\s*:/gi,
      /onerror\s*=/gi,
      /onclick\s*=/gi,
      /onload\s*=/gi,
      /on\w+\s*=/gi
    ];
    
    for (var i = 0; i < xssPatterns.length; i++) {
      if (xssPatterns[i].test(input)) {
        console.error('检测到XSS注入风险: ' + input);
        return true;
      }
    }
    
    return false;
  },
  
  // 检查SQL注入风险
  checkSQLInjectionRisk: function(input) {
    if (!input || typeof input !== 'string') return false;
    
    // 检查常见SQL注入攻击向量
    var sqlPatterns = [
      /'\s*OR\s*'1'\s*=\s*'1/gi,
      /'\s*OR\s*1\s*=\s*1/gi,
      /'\s*;\s*DROP\s+TABLE/gi,
      /'\s*;\s*DELETE\s+FROM/gi,
      /'\s*UNION\s+SELECT/gi,
      /--\s/gi
    ];
    
    for (var i = 0; i < sqlPatterns.length; i++) {
      if (sqlPatterns[i].test(input)) {
        console.error('检测到SQL注入风险: ' + input);
        return true;
      }
    }
    
    return false;
  },
  
  // 安全清理输入
  sanitizeInput: function(input) {
    if (!input || typeof input !== 'string') return input;
    
    // 替换可能导致XSS的字符
    var sanitized = input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
      
    return sanitized;
  },
  
  // 验证所有测试输入的安全性
  validateTestInputSafety: function(testParams) {
    if (!testParams) return true;
    
    for (var key in testParams) {
      if (testParams.hasOwnProperty(key) && typeof testParams[key] === 'string') {
        // 检查XSS风险
        if (this.checkXSSRisk(testParams[key])) {
          return false;
        }
        
        // 检查SQL注入风险
        if (this.checkSQLInjectionRisk(testParams[key])) {
          return false;
        }
        
        // 安全处理输入
        testParams[key] = this.sanitizeInput(testParams[key]);
      }
    }
    
    return true;
  }
};

// 修改现有的runTest方法，增加安全检查
function runTest(testType, testName, testParams) {
  var testFunction;
  var testResult = {
    name: testName,
    type: testType,
    passed: false,
    score: 0,
    details: {},
    error: null,
    startTime: Date.now(),
    endTime: 0,
    duration: 0
  };
  
  // 安全检查测试参数
  if (!SecurityChecker.validateTestInputSafety(testParams)) {
    testResult.error = "测试参数包含安全风险，测试已中止";
    testResult.endTime = Date.now();
    testResult.duration = testResult.endTime - testResult.startTime;
    console.error(testResult.error);
    return testResult;
  }
  
  // ... existing code ...
}

// 修改runTestSuite方法，增加安全检查
function runTestSuite(testSuite) {
  if (!testSuite || !testSuite.tests || !Array.isArray(testSuite.tests)) {
    console.error('无效的测试套件');
    return {
      name: testSuite.name || '未知测试套件',
      passed: false,
      total: 0,
      passed: 0,
      failed: 0,
      results: []
    };
  }
  
  // 安全检查整个测试套件
  for (var i = 0; i < testSuite.tests.length; i++) {
    var test = testSuite.tests[i];
    if (test.params && !SecurityChecker.validateTestInputSafety(test.params)) {
      console.error('测试套件包含安全风险，测试已中止: ' + test.name);
      return {
        name: testSuite.name,
        passed: false,
        total: testSuite.tests.length,
        passed: 0,
        failed: testSuite.tests.length,
        results: [{
          name: test.name,
          type: test.type,
          passed: false,
          error: "测试参数包含安全风险，测试已中止"
        }]
      };
    }
  }
  
  // ... existing code ...
}

module.exports = TestRunner; 