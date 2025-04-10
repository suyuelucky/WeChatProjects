/**
 * B1-基础照片采集模块 - 测试运行器
 * 
 * 本文件用于执行照片采集模块的单元测试和集成测试
 * 并生成测试报告
 */

// 引入测试套件
var UnitTests = require('./UnitTest.js');
var IntegrationTests = require('./IntegrationTest.js');

// 创建测试上下文
var TestContext = function() {
  var assertions = {
    total: 0,
    passed: 0,
    failed: 0
  };
  
  var testResults = [];
  var currentTest = null;
  
  // 获取组件类的模拟实现
  this.getCameraPreviewClass = function() {
    return require('../mocks/CameraPreviewMock.js');
  };
  
  this.getCameraModeControllerClass = function() {
    return require('../mocks/CameraModeControllerMock.js');
  };
  
  this.getImageCompressorClass = function() {
    return require('../mocks/ImageCompressorMock.js');
  };
  
  this.getPhotoStorageClass = function() {
    return require('../mocks/PhotoStorageMock.js');
  };
  
  this.getPhotoBatchProcessorClass = function() {
    return require('../mocks/PhotoBatchProcessorMock.js');
  };
  
  this.getMemoryManagerClass = function() {
    return require('../mocks/MemoryManagerMock.js');
  };
  
  // 获取测试图像路径
  this.getTestImagePath = function() {
    return '../test_assets/test_image.jpg';
  };
  
  // 获取文件大小
  this.getFileSize = function(path) {
    return new Promise(function(resolve) {
      // 模拟实现，返回假的文件大小
      setTimeout(function() {
        resolve(1024 * 1024 * (Math.random() + 0.5)); // 0.5MB到1.5MB
      }, 10);
    });
  };
  
  // 断言
  this.assert = function(condition, message) {
    assertions.total++;
    if (condition) {
      assertions.passed++;
      console.log('  ✓ ' + message);
    } else {
      assertions.failed++;
      console.log('  ✗ ' + message);
      if (currentTest) {
        currentTest.errors.push(message);
      }
    }
  };
  
  // 测试失败处理
  this.fail = function(message) {
    assertions.total++;
    assertions.failed++;
    console.log('  ✗ ' + message);
    if (currentTest) {
      currentTest.errors.push(message);
    }
  };
  
  // 日志输出
  this.log = function(message) {
    console.log('  ℹ ' + message);
  };
  
  // 模拟权限被拒绝
  this.simulatePermissionDenied = function() {
    return new Promise(function(resolve) {
      setTimeout(resolve, 10);
    });
  };
  
  // 恢复权限
  this.restorePermissions = function() {
    return new Promise(function(resolve) {
      setTimeout(resolve, 10);
    });
  };
  
  // 模拟存储空间不足
  this.simulateLowDiskSpace = function() {
    return new Promise(function(resolve) {
      setTimeout(resolve, 10);
    });
  };
  
  // 恢复存储空间
  this.restoreDiskSpace = function() {
    return new Promise(function(resolve) {
      setTimeout(resolve, 10);
    });
  };
  
  // 模拟相机初始化错误
  this.simulateCameraInitError = function() {
    return new Promise(function(resolve) {
      setTimeout(resolve, 10);
    });
  };
  
  // 运行单个测试
  this.runTest = function(test) {
    return new Promise(function(resolve) {
      console.log('\n开始测试: ' + test.name);
      
      var testResult = {
        name: test.name,
        startTime: Date.now(),
        endTime: 0,
        duration: 0,
        status: 'running',
        errors: []
      };
      
      currentTest = testResult;
      testResults.push(testResult);
      
      test.run(this, function() {
        testResult.endTime = Date.now();
        testResult.duration = testResult.endTime - testResult.startTime;
        testResult.status = testResult.errors.length > 0 ? 'failed' : 'passed';
        
        console.log('测试完成: ' + test.name + ' (' + testResult.duration + 'ms) - ' + testResult.status);
        currentTest = null;
        resolve();
      }.bind(this));
    }.bind(this));
  };
  
  // 获取测试结果
  this.getResults = function() {
    return {
      assertions: assertions,
      tests: testResults,
      summary: {
        total: testResults.length,
        passed: testResults.filter(function(r) { return r.status === 'passed'; }).length,
        failed: testResults.filter(function(r) { return r.status === 'failed'; }).length,
        totalDuration: testResults.reduce(function(sum, r) { return sum + r.duration; }, 0)
      }
    };
  };
  
  // 打印测试结果
  this.printResults = function() {
    var results = this.getResults();
    var summary = results.summary;
    
    console.log('\n===== 测试结果概要 =====');
    console.log('总测试数: ' + summary.total);
    console.log('通过测试: ' + summary.passed);
    console.log('失败测试: ' + summary.failed);
    console.log('总断言数: ' + results.assertions.total);
    console.log('通过断言: ' + results.assertions.passed);
    console.log('失败断言: ' + results.assertions.failed);
    console.log('总耗时: ' + summary.totalDuration + 'ms');
    
    if (summary.failed > 0) {
      console.log('\n===== 失败测试详情 =====');
      results.tests.filter(function(t) { return t.status === 'failed'; }).forEach(function(test) {
        console.log('\n' + test.name + ':');
        test.errors.forEach(function(error, i) {
          console.log('  ' + (i + 1) + '. ' + error);
        });
      });
    }
    
    console.log('\n===== 测试结束 =====');
  };
};

// 运行所有测试
function runAllTests() {
  var context = new TestContext();
  var allTests = [];
  
  // 收集单元测试
  Object.keys(UnitTests).forEach(function(key) {
    if (typeof UnitTests[key] === 'function') {
      allTests.push(UnitTests[key]());
    }
  });
  
  // 收集集成测试
  Object.keys(IntegrationTests).forEach(function(key) {
    if (typeof IntegrationTests[key] === 'function') {
      allTests.push(IntegrationTests[key]());
    }
  });
  
  console.log('照片采集模块测试开始，共 ' + allTests.length + ' 个测试用例');
  console.log('测试开始时间: ' + new Date().toLocaleString());
  
  // 顺序执行所有测试
  var promise = Promise.resolve();
  allTests.forEach(function(test) {
    promise = promise.then(function() {
      return context.runTest(test);
    });
  });
  
  promise.then(function() {
    context.printResults();
  })
  .catch(function(error) {
    console.error('测试过程中发生错误:', error);
  });
}

// 运行特定的测试
function runSpecificTests(testNames) {
  var context = new TestContext();
  var testsToRun = [];
  
  // 从单元测试中查找匹配的测试
  testNames.forEach(function(testName) {
    if (typeof UnitTests[testName] === 'function') {
      testsToRun.push(UnitTests[testName]());
    }
  });
  
  // 从集成测试中查找匹配的测试
  testNames.forEach(function(testName) {
    if (typeof IntegrationTests[testName] === 'function') {
      testsToRun.push(IntegrationTests[testName]());
    }
  });
  
  if (testsToRun.length === 0) {
    console.log('未找到指定的测试用例');
    return;
  }
  
  console.log('开始执行 ' + testsToRun.length + ' 个测试用例');
  console.log('测试开始时间: ' + new Date().toLocaleString());
  
  // 顺序执行选定的测试
  var promise = Promise.resolve();
  testsToRun.forEach(function(test) {
    promise = promise.then(function() {
      return context.runTest(test);
    });
  });
  
  promise.then(function() {
    context.printResults();
  })
  .catch(function(error) {
    console.error('测试过程中发生错误:', error);
  });
}

// 解析命令行参数并执行相应的测试
function main() {
  var args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'all') {
    // 运行所有测试
    runAllTests();
  } else if (args[0] === 'unit') {
    // 运行所有单元测试
    var unitTestNames = Object.keys(UnitTests).filter(function(key) {
      return typeof UnitTests[key] === 'function';
    });
    runSpecificTests(unitTestNames);
  } else if (args[0] === 'integration') {
    // 运行所有集成测试
    var integrationTestNames = Object.keys(IntegrationTests).filter(function(key) {
      return typeof IntegrationTests[key] === 'function';
    });
    runSpecificTests(integrationTestNames);
  } else {
    // 运行指定的测试
    runSpecificTests(args);
  }
}

// 启动测试
main(); 