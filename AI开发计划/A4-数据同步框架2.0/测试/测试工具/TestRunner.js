/**
 * 测试运行器
 * 
 * 创建时间: 2025-04-08 21:55:06
 * 创建者: Claude-3.7-Sonnet
 * 文档分类: 测试工具
 */

'use strict';

/**
 * 测试运行器
 * 负责执行测试套件和报告结果
 */
var TestRunner = {
  /**
   * 注册的测试套件
   */
  _testSuites: {},
  
  /**
   * 测试结果
   */
  _results: {
    passed: 0,
    failed: 0,
    errors: 0,
    skipped: 0,
    total: 0,
    details: []
  },
  
  /**
   * 注册测试套件
   * @param {string} name 测试套件名称
   * @param {Object} suite 测试套件对象
   */
  registerTestSuite: function(name, suite) {
    this._testSuites[name] = suite;
    console.log('已注册测试套件: ' + name);
  },
  
  /**
   * 运行所有测试
   * @param {Array} [suiteNames] 要运行的测试套件名称列表，如果不提供则运行所有
   * @returns {Promise} 测试完成的承诺
   */
  runTests: function(suiteNames) {
    var self = this;
    self._results = {
      passed: 0,
      failed: 0,
      errors: 0,
      skipped: 0,
      total: 0,
      details: []
    };
    
    var suitesToRun = suiteNames || Object.keys(self._testSuites);
    
    console.log('===== 开始测试 =====');
    console.log('测试套件: ' + suitesToRun.join(', '));
    
    return self._runNextSuite(suitesToRun, 0)
      .then(function() {
        console.log('===== 测试完成 =====');
        console.log('总计: ' + self._results.total);
        console.log('通过: ' + self._results.passed);
        console.log('失败: ' + self._results.failed);
        console.log('错误: ' + self._results.errors);
        console.log('跳过: ' + self._results.skipped);
        
        return self._results;
      });
  },
  
  /**
   * 逐个运行测试套件
   * @private
   */
  _runNextSuite: function(suiteNames, index) {
    var self = this;
    
    // 所有套件运行完毕
    if (index >= suiteNames.length) {
      return Promise.resolve();
    }
    
    var suiteName = suiteNames[index];
    var suite = self._testSuites[suiteName];
    
    if (!suite) {
      console.error('测试套件未找到: ' + suiteName);
      return self._runNextSuite(suiteNames, index + 1);
    }
    
    console.log('>> 运行测试套件: ' + suiteName);
    
    return self._runSuite(suite)
      .then(function() {
        return self._runNextSuite(suiteNames, index + 1);
      });
  },
  
  /**
   * 运行单个测试套件
   * @private
   */
  _runSuite: function(suite) {
    var self = this;
    var testCases = Object.keys(suite).filter(function(key) {
      return key.indexOf('test') === 0 && typeof suite[key] === 'function';
    });
    
    self._results.total += testCases.length;
    
    // 初始化测试套件
    var setupPromise = suite.setup ? suite.setup() : Promise.resolve();
    
    return setupPromise
      .then(function() {
        // 逐个运行测试用例
        return self._runNextTest(suite, testCases, 0);
      })
      .finally(function() {
        // 清理测试套件
        if (suite.teardown) {
          return suite.teardown();
        }
      });
  },
  
  /**
   * 逐个运行测试用例
   * @private
   */
  _runNextTest: function(suite, testCases, index) {
    var self = this;
    
    // 所有测试用例运行完毕
    if (index >= testCases.length) {
      return Promise.resolve();
    }
    
    var testName = testCases[index];
    console.log('  - 运行测试: ' + testName);
    
    // 判断是否跳过测试
    if (testName.indexOf('Skip') > 0) {
      console.log('    [跳过]');
      self._results.skipped++;
      self._results.details.push({
        name: testName,
        result: 'skipped'
      });
      return self._runNextTest(suite, testCases, index + 1);
    }
    
    try {
      var testPromise = suite[testName]();
      
      // 确保测试返回Promise
      if (!(testPromise instanceof Promise)) {
        testPromise = Promise.resolve(testPromise);
      }
      
      return testPromise
        .then(function() {
          console.log('    [通过]');
          self._results.passed++;
          self._results.details.push({
            name: testName,
            result: 'passed'
          });
        })
        .catch(function(error) {
          console.error('    [失败] ' + error.message);
          self._results.failed++;
          self._results.details.push({
            name: testName,
            result: 'failed',
            error: error
          });
        })
        .finally(function() {
          return self._runNextTest(suite, testCases, index + 1);
        });
    } catch (error) {
      console.error('    [错误] ' + error.message);
      self._results.errors++;
      self._results.details.push({
        name: testName,
        result: 'error',
        error: error
      });
      return self._runNextTest(suite, testCases, index + 1);
    }
  },
  
  /**
   * 断言
   * @param {boolean} condition 断言条件
   * @param {string} message 断言消息
   * @throws {Error} 断言失败时抛出异常
   */
  assert: function(condition, message) {
    if (!condition) {
      throw new Error('断言失败: ' + message);
    }
  },
  
  /**
   * 相等断言
   * @param {*} actual 实际值
   * @param {*} expected 期望值
   * @param {string} message 断言消息
   * @throws {Error} 断言失败时抛出异常
   */
  assertEqual: function(actual, expected, message) {
    if (actual !== expected) {
      throw new Error((message || '相等断言失败') + ' - 期望: ' + expected + ', 实际: ' + actual);
    }
  },
  
  /**
   * 深度相等断言
   * @param {*} actual 实际值
   * @param {*} expected 期望值
   * @param {string} message 断言消息
   * @throws {Error} 断言失败时抛出异常
   */
  assertDeepEqual: function(actual, expected, message) {
    var actualJson = JSON.stringify(actual);
    var expectedJson = JSON.stringify(expected);
    
    if (actualJson !== expectedJson) {
      throw new Error((message || '深度相等断言失败') + 
        '\n期望: ' + expectedJson + 
        '\n实际: ' + actualJson);
    }
  },
  
  /**
   * 类型断言
   * @param {*} value 待检查的值
   * @param {string} type 期望的类型
   * @param {string} message 断言消息
   * @throws {Error} 断言失败时抛出异常
   */
  assertType: function(value, type, message) {
    var actualType = typeof value;
    
    if (type === 'array') {
      if (!Array.isArray(value)) {
        throw new Error((message || '类型断言失败') + ' - 期望: array, 实际: ' + actualType);
      }
    } else if (actualType !== type) {
      throw new Error((message || '类型断言失败') + ' - 期望: ' + type + ', 实际: ' + actualType);
    }
  },
  
  /**
   * 异常断言
   * @param {Function} fn 期望抛出异常的函数
   * @param {string|RegExp} expectedError 期望的错误消息或正则
   * @param {string} message 断言消息
   * @throws {Error} 断言失败时抛出异常
   */
  assertThrows: function(fn, expectedError, message) {
    try {
      fn();
      throw new Error((message || '异常断言失败') + ' - 期望抛出异常，但没有抛出');
    } catch (error) {
      if (expectedError) {
        if (typeof expectedError === 'string' && error.message !== expectedError) {
          throw new Error((message || '异常断言失败') + 
            ' - 期望错误消息: ' + expectedError + 
            ', 实际: ' + error.message);
        } else if (expectedError instanceof RegExp && !expectedError.test(error.message)) {
          throw new Error((message || '异常断言失败') + 
            ' - 期望错误匹配: ' + expectedError + 
            ', 实际: ' + error.message);
        }
      }
    }
  }
};

// 导出测试运行器
module.exports = TestRunner; 