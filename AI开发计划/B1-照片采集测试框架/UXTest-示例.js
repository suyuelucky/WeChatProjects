/**
 * UXTest.js 使用示例
 * 日期: 2025-04-09
 */

// 引入UXTest模块
var PhotoCaptureUXTest = require('./UXTest');

/**
 * 示例1: 运行所有用户体验测试
 */
function runAllUXTests() {
  console.log('示例1: 运行所有用户体验测试');
  
  // 初始化测试框架
  PhotoCaptureUXTest.init({
    verbose: true,
    testTypes: {
      usability: true,
      intuitiveness: true,
      efficiency: true,
      satisfaction: true,
      accessibility: true,
      aesthetics: true
    }
  });
  
  // 运行所有测试
  var results = PhotoCaptureUXTest.runAllTests();
  
  console.log('测试完成，结果摘要:');
  console.log('总测试数: ' + results.total);
  console.log('通过: ' + results.passed);
  console.log('失败: ' + results.failed);
  console.log('耗时: ' + results.duration + 'ms');
  
  // 生成HTML测试报告
  var reportHtml = PhotoCaptureUXTest.generateUXReport();
  console.log('已生成HTML报告，长度: ' + reportHtml.length + '字符');
  
  // 这里可以将报告保存到文件或显示在页面上
}

/**
 * 示例2: 运行特定类别的测试
 */
function runSpecificTests() {
  console.log('示例2: 运行特定类别的测试');
  
  // 初始化测试框架，只启用特定测试类型
  PhotoCaptureUXTest.init({
    verbose: true,
    testTypes: {
      usability: true,
      intuitiveness: true,
      efficiency: false,
      satisfaction: false,
      accessibility: false,
      aesthetics: false
    }
  });
  
  // 只运行可用性测试
  PhotoCaptureUXTest.testCameraUsability();
  
  // 只运行直觉性测试
  PhotoCaptureUXTest.testIntuitiveness();
  
  // 运行已启用的所有测试
  var results = PhotoCaptureUXTest.runAllTests();
  
  console.log('特定测试完成，结果摘要:');
  console.log('总测试数: ' + results.total);
  console.log('通过: ' + results.passed);
  console.log('失败: ' + results.failed);
}

/**
 * 示例3: 模拟用户场景测试
 */
function simulateUserScenario() {
  console.log('示例3: 模拟用户场景测试');
  
  // 初始化测试框架
  PhotoCaptureUXTest.init({
    verbose: true,
    mockUserInteractions: true
  });
  
  // 定义拍照场景步骤
  var photoCaptureSteps = [
    {
      action: 'click',
      target: '.camera-button',
      description: '点击相机按钮打开相机',
      critical: true
    },
    {
      action: 'wait',
      duration: 1500,
      description: '等待相机初始化'
    },
    {
      action: 'click',
      target: '.shutter-button',
      description: '点击快门按钮拍照',
      critical: true
    },
    {
      action: 'wait',
      duration: 500,
      description: '等待照片预览加载'
    },
    {
      action: 'click',
      target: '.confirm-button',
      description: '点击确认按钮保存照片'
    }
  ];
  
  // 执行场景测试
  var scenarioResult = PhotoCaptureUXTest.simulateUserScenario('标准拍照流程', photoCaptureSteps);
  
  console.log('场景测试完成，结果:');
  console.log('步骤总数: ' + scenarioResult.stepsTotal);
  console.log('成功步骤: ' + scenarioResult.stepsSuccessful);
  console.log('耗时: ' + scenarioResult.duration + 'ms');
  
  if (scenarioResult.errors.length > 0) {
    console.log('错误:');
    for (var i = 0; i < scenarioResult.errors.length; i++) {
      var error = scenarioResult.errors[i];
      console.log('步骤 ' + error.step + ': ' + error.description + ' - ' + error.error);
    }
  }
  
  // 分析交互数据
  var interactions = scenarioResult.interactionReport;
  console.log('交互分析:');
  console.log('总交互数: ' + interactions.totalInteractions);
  console.log('点击数: ' + interactions.clicksCount);
  console.log('交互时间: ' + interactions.interactionTime + 'ms');
}

/**
 * 示例4: 自定义测试用例
 */
function runCustomTest() {
  console.log('示例4: 自定义测试用例');
  
  // 初始化测试框架
  PhotoCaptureUXTest.init();
  
  // 运行自定义测试
  var testResult = PhotoCaptureUXTest.runTest('相机操作流畅度测试', function() {
    var result = {
      score: 0,
      details: {},
      category: 'efficiency',
      metric: 'interactionSpeed'
    };
    
    // 这里可以实现实际的测试逻辑
    // 以下是模拟数据
    var frameRate = 55; // fps
    var responseDelay = 120; // ms
    var animationSmoothness = 0.9; // 0-1
    
    result.details.frameRate = frameRate;
    result.details.responseDelay = responseDelay;
    result.details.animationSmoothness = animationSmoothness;
    
    // 计算评分
    var frameRateScore = frameRate >= 60 ? 1.0 : 
                         (frameRate >= 50 ? 0.9 : 
                         (frameRate >= 40 ? 0.7 : 
                         (frameRate >= 30 ? 0.5 : 0.3)));
                         
    var responseScore = responseDelay <= 100 ? 1.0 : 
                       (responseDelay <= 150 ? 0.9 : 
                       (responseDelay <= 200 ? 0.7 : 
                       (responseDelay <= 300 ? 0.5 : 0.3)));
    
    result.score = (frameRateScore * 0.4) + 
                   (responseScore * 0.4) + 
                   (animationSmoothness * 0.2);
    
    return result;
  });
  
  console.log('自定义测试结果:');
  console.log('测试名称: ' + testResult.name);
  console.log('通过: ' + testResult.passed);
  console.log('分数: ' + testResult.score);
  console.log('详情: ' + JSON.stringify(testResult.details));
}

// 执行示例
runAllUXTests();
// runSpecificTests();
// simulateUserScenario();
// runCustomTest(); 