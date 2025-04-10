/**
 * 照片采集模块用户体验测试框架
 * 符合ES5标准，确保兼容微信小程序
 * 版本: 1.0.0
 * 日期: 2025-06-10
 * 更新日期: 2025-04-09
 */

var PhotoCaptureUXTest = (function() {
  'use strict';
  
  // 测试结果存储
  var testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    results: []
  };
  
  // 配置选项
  var options = {
    verbose: true,
    simpleMode: false, // 简单模式只运行基础用户体验测试
    recordVideo: false, // 是否录制测试过程视频
    mockUserInteractions: true, // 是否模拟用户交互
    accessibilityChecks: true, // 无障碍功能检查
    testTypes: {
      usability: true, // 可用性测试
      intuitiveness: true, // 直觉性测试
      efficiency: true, // 效率测试
      satisfaction: true, // 满意度测试
      accessibility: true, // 无障碍测试
      aesthetics: true // 美学测试
    }
  };
  
  // 评分标准
  var rubrics = {
    usability: {
      taskSuccess: { weight: 0.4, threshold: 0.8 },
      errorRate: { weight: 0.3, threshold: 0.2 },
      timeOnTask: { weight: 0.3, threshold: 1.5 } // 相对基准时间的倍数
    },
    intuitiveness: {
      userGuidance: { weight: 0.3, threshold: 0.7 },
      selfExplanatory: { weight: 0.4, threshold: 0.8 },
      discoverability: { weight: 0.3, threshold: 0.7 }
    },
    efficiency: {
      stepsToComplete: { weight: 0.5, threshold: 1.2 }, // 相对最优路径的倍数
      interactionSpeed: { weight: 0.5, threshold: 1.3 } // 相对基准速度的倍数
    },
    satisfaction: {
      enjoyment: { weight: 0.3, threshold: 0.7 },
      trustworthiness: { weight: 0.4, threshold: 0.8 },
      likelihood: { weight: 0.3, threshold: 0.7 }
    },
    accessibility: {
      screenReader: { weight: 0.3, threshold: 0.9 },
      keyboardNav: { weight: 0.3, threshold: 0.9 },
      colorContrast: { weight: 0.2, threshold: 0.8 },
      textSize: { weight: 0.2, threshold: 0.8 }
    },
    aesthetics: {
      visualAppeal: { weight: 0.4, threshold: 0.7 },
      consistency: { weight: 0.3, threshold: 0.8 },
      layoutBalance: { weight: 0.3, threshold: 0.7 }
    }
  };
  
  // 日志记录器
  var logger = {
    error: function(msg) {
      console.error('[UX测试-ERROR] ' + msg);
    },
    warn: function(msg) {
      console.warn('[UX测试-WARN] ' + msg);
    },
    info: function(msg) {
      if (options.verbose) {
        console.info('[UX测试-INFO] ' + msg);
      }
    },
    success: function(msg) {
      console.log('[UX测试-PASS] ' + msg);
    },
    fail: function(msg) {
      console.error('[UX测试-FAIL] ' + msg);
    }
  };
  
  // 用户交互模拟器
  var userInteraction = {
    clicks: [],
    gestures: [],
    inputs: [],
    imageResources: [], // 跟踪图片资源
    
    // 记录交互
    recordInteraction: function(type, target, details) {
      var interaction = {
        type: type,
        target: target,
        timestamp: Date.now(),
        details: details || {}
      };
      
      if (type === 'click') {
        this.clicks.push(interaction);
      } else if (type === 'gesture') {
        this.gestures.push(interaction);
      } else if (type === 'input') {
        this.inputs.push(interaction);
      }
      
      return interaction;
    },
    
    // 重置所有交互记录
    reset: function() {
      this.clicks = [];
      this.gestures = [];
      this.inputs = [];
      
      // 强制释放图片资源
      this.releaseImageResources();
    },
    
    // 新增：释放图片资源
    releaseImageResources: function() {
      if (this.imageResources && this.imageResources.length > 0) {
        logger.info('释放 ' + this.imageResources.length + ' 个图片资源');
        
        for (var i = 0; i < this.imageResources.length; i++) {
          var resource = this.imageResources[i];
          if (resource && resource.path) {
            // 使用微信小程序API释放资源
            if (typeof wx !== 'undefined' && wx.removeSavedFile) {
              wx.removeSavedFile({
                filePath: resource.path,
                fail: function(res) {
                  logger.warn('释放图片资源失败: ' + JSON.stringify(res));
                }
              });
            }
            
            // 通知垃圾收集器
            resource.path = null;
            resource = null;
          }
        }
        
        this.imageResources = [];
      }
    },
    
    // 记录图片资源，以便后续释放
    trackImageResource: function(path) {
      if (!path) return;
      
      this.imageResources.push({
        path: path,
        timestamp: Date.now()
      });
      
      // 如果资源过多，主动释放旧资源
      if (this.imageResources.length > 20) {
        var oldResources = this.imageResources.splice(0, 10);
        for (var i = 0; i < oldResources.length; i++) {
          var resource = oldResources[i];
          if (resource && resource.path && typeof wx !== 'undefined' && wx.removeSavedFile) {
            wx.removeSavedFile({
              filePath: resource.path
            });
          }
        }
        logger.info('释放10个旧图片资源以防止内存泄漏');
      }
    },
    
    // 模拟点击
    simulateClick: function(selector, options) {
      options = options || {};
      logger.info('模拟点击: ' + selector);
      
      // 实际实现中这里会通过小程序API触发点击
      // 例如使用wx.createSelectorQuery()找到元素并模拟点击
      
      return this.recordInteraction('click', selector, options);
    },
    
    // 模拟手势
    simulateGesture: function(type, target, options) {
      options = options || {};
      logger.info('模拟手势: ' + type + ' on ' + target);
      
      // 实际实现中这里会调用相应的手势模拟API
      // 例如滑动、缩放等
      
      return this.recordInteraction('gesture', target, {
        type: type,
        options: options
      });
    },
    
    // 模拟输入
    simulateInput: function(selector, value, options) {
      options = options || {};
      logger.info('模拟输入: "' + value + '" 到 ' + selector);
      
      // 实际实现中这里会通过wx.createSelectorQuery()找到表单元素
      // 并设置其值
      
      return this.recordInteraction('input', selector, {
        value: value,
        options: options
      });
    },
    
    // 分析交互模式并生成报告
    analyzeInteractions: function() {
      var report = {
        totalInteractions: this.clicks.length + this.gestures.length + this.inputs.length,
        clicksCount: this.clicks.length,
        gesturesCount: this.gestures.length,
        inputsCount: this.inputs.length,
        interactionTime: 0,
        interactionSequence: []
      };
      
      // 合并所有交互并按时间排序
      var allInteractions = [].concat(
        this.clicks.map(function(i) { return Object.assign({}, i, { category: 'click' }); }),
        this.gestures.map(function(i) { return Object.assign({}, i, { category: 'gesture' }); }),
        this.inputs.map(function(i) { return Object.assign({}, i, { category: 'input' }); })
      );
      
      allInteractions.sort(function(a, b) {
        return a.timestamp - b.timestamp;
      });
      
      // 计算交互时间
      if (allInteractions.length >= 2) {
        report.interactionTime = allInteractions[allInteractions.length - 1].timestamp - 
                                allInteractions[0].timestamp;
      }
      
      // 生成交互序列
      report.interactionSequence = allInteractions.map(function(i) {
        return {
          category: i.category,
          type: i.type,
          target: i.target,
          timestamp: i.timestamp
        };
      });
      
      // 分析交互效率
      // 在实际实现中，这里会有更复杂的分析逻辑
      
      return report;
    }
  };
  
  /**
   * 初始化测试环境
   * @param {Object} customOptions - 自定义配置选项
   */
  function init(customOptions) {
    if (customOptions) {
      for (var key in customOptions) {
        if (customOptions.hasOwnProperty(key)) {
          if (key === 'testTypes' && customOptions[key]) {
            for (var type in customOptions[key]) {
              if (customOptions[key].hasOwnProperty(type) && 
                  options.testTypes.hasOwnProperty(type)) {
                options.testTypes[type] = customOptions[key][type];
              }
            }
          } else {
            options[key] = customOptions[key];
          }
        }
      }
    }
    
    testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      results: []
    };
    
    // 重置用户交互记录
    userInteraction.reset();
    
    logger.info('用户体验测试框架初始化完成，测试类型配置: ' + JSON.stringify(options.testTypes));
    return this;
  }
  
  /**
   * 执行单个测试
   * @param {string} testName - 测试名称
   * @param {Function} testFn - 测试函数
   * @param {Object} params - 测试参数
   */
  function runTest(testName, testFn, params) {
    testResults.total++;
    
    var testCase = {
      name: testName,
      passed: false,
      error: null,
      details: {},
      category: params && params.category || 'general',
      score: 0,
      duration: 0
    };
    
    try {
      logger.info('运行用户体验测试: ' + testName + (params && params.description ? ' - ' + params.description : ''));
      
      var startTime = Date.now();
      var result = testFn(params || {});
      var endTime = Date.now();
      testCase.duration = endTime - startTime;
      
      // 处理测试结果
      if (typeof result === 'object') {
        testCase.score = result.score || 0;
        testCase.details = result.details || {};
        
        // 根据类别检查阈值
        if (result.category && rubrics[result.category]) {
          var category = result.category;
          var metric = result.metric || 'overall';
          var threshold = 0.7; // 默认阈值
          
          if (rubrics[category][metric]) {
            threshold = rubrics[category][metric].threshold;
          }
          
          testCase.passed = testCase.score >= threshold;
        } else {
          testCase.passed = testCase.score >= 0.7; // 默认阈值
        }
        
        if (testCase.passed) {
          testResults.passed++;
          logger.success(testCase.name + ' 通过 (分数: ' + testCase.score.toFixed(2) + ', 耗时: ' + testCase.duration + 'ms)');
        } else {
          testResults.failed++;
          testCase.error = result.error || '用户体验测试未达到阈值';
          logger.fail(testCase.name + ' 失败: ' + testCase.error + ' (分数: ' + testCase.score.toFixed(2) + ')');
        }
      } else {
        testCase.passed = !!result;
        if (testCase.passed) {
          testResults.passed++;
          logger.success(testCase.name + ' 通过 (' + testCase.duration + 'ms)');
        } else {
          testResults.failed++;
          testCase.error = '用户体验测试失败';
          logger.fail(testCase.name + ' 失败');
        }
      }
    } catch (e) {
      testCase.passed = false;
      testCase.error = e.message || String(e);
      testResults.failed++;
      logger.error(testCase.name + ' 执行出现异常: ' + testCase.error);
    }
    
    testResults.results.push(testCase);
    return testCase;
  }
  
  /**
   * 测试相机启动和拍照流程的可用性
   */
  function testCameraUsability() {
    if (!options.testTypes.usability) {
      logger.info('可用性测试已禁用，跳过');
      return this;
    }
    
    logger.info('开始执行相机可用性测试');
    
    // 测试相机启动流程的清晰度
    this.runTest('相机启动清晰度', function() {
      var result = {
        score: 0,
        details: {},
        category: 'usability',
        metric: 'taskSuccess'
      };
      
      // 模拟检查相机启动按钮的可见性和清晰度
      var cameraButtonVisibility = 0.9; // 模拟值，实际应通过UI分析获取
      var cameraButtonSize = 0.85;      // 按钮大小适当性评分
      var cameraButtonPosition = 0.95;  // 按钮位置合理性评分
      
      result.details.buttonVisibility = cameraButtonVisibility;
      result.details.buttonSize = cameraButtonSize;
      result.details.buttonPosition = cameraButtonPosition;
      
      // 综合评分
      result.score = (cameraButtonVisibility * 0.4) + 
                     (cameraButtonSize * 0.3) + 
                     (cameraButtonPosition * 0.3);
                     
      logger.info('相机启动按钮可用性评分: ' + result.score.toFixed(2));
      
      return result;
    });
    
    // 测试拍照按钮的可识别性和易用性
    this.runTest('拍照按钮可用性', function() {
      var result = {
        score: 0,
        details: {},
        category: 'usability',
        metric: 'taskSuccess'
      };
      
      // 模拟拍照按钮的评估
      var captureButtonVisibility = 0.95; // 模拟值
      var captureButtonSize = 0.9;        // 拍照按钮大小适当性
      var captureButtonContrast = 0.85;   // 按钮与背景对比度
      var captureButtonReachability = 0.8; // 单手操作易用性
      
      result.details.buttonVisibility = captureButtonVisibility;
      result.details.buttonSize = captureButtonSize;
      result.details.buttonContrast = captureButtonContrast;
      result.details.buttonReachability = captureButtonReachability;
      
      // 综合评分
      result.score = (captureButtonVisibility * 0.3) + 
                     (captureButtonSize * 0.3) + 
                     (captureButtonContrast * 0.2) + 
                     (captureButtonReachability * 0.2);
                     
      logger.info('拍照按钮可用性评分: ' + result.score.toFixed(2));
      
      return result;
    });
    
    // 测试拍照结果预览和确认流程
    this.runTest('照片预览可用性', function() {
      var result = {
        score: 0,
        details: {},
        category: 'usability',
        metric: 'taskSuccess'
      };
      
      // 模拟预览界面评估
      var previewClarity = 0.9;       // 预览清晰度
      var confirmButtonVisibility = 0.85; // 确认按钮可见性
      var previewFeedback = 0.8;      // 预览界面反馈明确性
      var previewGestures = 0.75;     // 预览界面手势支持
      
      result.details.previewClarity = previewClarity;
      result.details.confirmButtonVisibility = confirmButtonVisibility;
      result.details.previewFeedback = previewFeedback;
      result.details.previewGestures = previewGestures;
      
      // 综合评分
      result.score = (previewClarity * 0.3) + 
                     (confirmButtonVisibility * 0.3) + 
                     (previewFeedback * 0.2) + 
                     (previewGestures * 0.2);
                     
      logger.info('照片预览可用性评分: ' + result.score.toFixed(2));
      
      // 强制释放资源防止内存泄漏
      userInteraction.releaseImageResources();
      
      return result;
    });
    
    // 确保最后释放所有资源
    userInteraction.reset();
    
    return this;
  }
  
  /**
   * 测试界面的直觉性
   */
  function testIntuitiveness() {
    if (!options.testTypes.intuitiveness) {
      logger.info('直觉性测试已禁用，跳过');
      return this;
    }
    
    logger.info('开始执行界面直觉性测试');
    
    // 测试界面元素的自解释性
    this.runTest('界面自解释性', function() {
      var result = {
        score: 0,
        details: {},
        category: 'intuitiveness',
        metric: 'selfExplanatory'
      };
      
      // 模拟界面元素自解释性评估
      var iconClarity = 0.85;        // 图标含义清晰度
      var labelClarity = 0.9;        // 标签文字清晰度
      var controlMapping = 0.8;      // 控件与功能映射合理性
      var layoutPredictability = 0.85; // 布局可预测性
      
      result.details.iconClarity = iconClarity;
      result.details.labelClarity = labelClarity;
      result.details.controlMapping = controlMapping;
      result.details.layoutPredictability = layoutPredictability;
      
      // 综合评分
      result.score = (iconClarity * 0.3) + 
                     (labelClarity * 0.3) + 
                     (controlMapping * 0.2) + 
                     (layoutPredictability * 0.2);
                     
      logger.info('界面自解释性评分: ' + result.score.toFixed(2));
      
      return result;
    });
    
    // 测试用户引导的有效性
    this.runTest('用户引导有效性', function() {
      var result = {
        score: 0,
        details: {},
        category: 'intuitiveness',
        metric: 'userGuidance'
      };
      
      // 模拟用户引导评估
      var firstUseGuidance = 0.75;    // 首次使用引导
      var tooltipClarity = 0.85;      // 提示信息清晰度
      var progressVisibility = 0.9;   // 进度指示清晰度
      var errorGuidance = 0.8;        // 错误情况引导
      
      result.details.firstUseGuidance = firstUseGuidance;
      result.details.tooltipClarity = tooltipClarity;
      result.details.progressVisibility = progressVisibility;
      result.details.errorGuidance = errorGuidance;
      
      // 综合评分
      result.score = (firstUseGuidance * 0.3) + 
                     (tooltipClarity * 0.25) + 
                     (progressVisibility * 0.25) + 
                     (errorGuidance * 0.2);
                     
      logger.info('用户引导有效性评分: ' + result.score.toFixed(2));
      
      return result;
    });
    
    // 测试功能的可发现性
    this.runTest('功能可发现性', function() {
      var result = {
        score: 0,
        details: {},
        category: 'intuitiveness',
        metric: 'discoverability'
      };
      
      // 模拟功能可发现性评估
      var primaryFeaturesVisibility = 0.95;   // 主要功能可见性
      var secondaryFeaturesAccess = 0.8;     // 次要功能可访问性
      var gestureDiscoverability = 0.7;      // 手势操作可发现性
      var menuOrganization = 0.85;           // 菜单组织合理性
      
      result.details.primaryFeaturesVisibility = primaryFeaturesVisibility;
      result.details.secondaryFeaturesAccess = secondaryFeaturesAccess;
      result.details.gestureDiscoverability = gestureDiscoverability;
      result.details.menuOrganization = menuOrganization;
      
      // 综合评分
      result.score = (primaryFeaturesVisibility * 0.4) + 
                     (secondaryFeaturesAccess * 0.25) + 
                     (gestureDiscoverability * 0.15) + 
                     (menuOrganization * 0.2);
                     
      logger.info('功能可发现性评分: ' + result.score.toFixed(2));
      
      return result;
    });
    
    return this;
  }
  
  /**
   * 测试照片采集流程的效率
   */
  function testEfficiency() {
    if (!options.testTypes.efficiency) {
      logger.info('效率测试已禁用，跳过');
      return this;
    }
    
    logger.info('开始执行照片采集效率测试');
    
    // 测试完成拍照所需的步骤数
    this.runTest('拍照步骤效率', function() {
      var result = {
        score: 0,
        details: {},
        category: 'efficiency',
        metric: 'stepsToComplete'
      };
      
      // 模拟拍照流程步骤分析
      var actualSteps = 3;           // 实际所需步骤数
      var optimalSteps = 2;          // 理论最优步骤数
      var stepsRatio = optimalSteps / actualSteps; // 步骤比率(越接近1越好)
      
      var navigationComplexity = 0.9; // 导航复杂度(越高越简单)
      var operationSimplicity = 0.85; // 操作简单度
      
      result.details.actualSteps = actualSteps;
      result.details.optimalSteps = optimalSteps;
      result.details.stepsRatio = stepsRatio;
      result.details.navigationComplexity = navigationComplexity;
      result.details.operationSimplicity = operationSimplicity;
      
      // 综合评分
      result.score = (stepsRatio * 0.5) + 
                     (navigationComplexity * 0.25) + 
                     (operationSimplicity * 0.25);
                     
      logger.info('拍照步骤效率评分: ' + result.score.toFixed(2));
      
      return result;
    });
    
    // 测试从启动到完成拍照的时间
    this.runTest('拍照时间效率', function() {
      var result = {
        score: 0,
        details: {},
        category: 'efficiency',
        metric: 'interactionSpeed'
      };
      
      // 模拟拍照时间分析
      var startToCaptureTime = 2500; // ms, 从启动到拍照的时间
      var baselineTime = 2000;       // ms, 基准时间
      var timeRatio = baselineTime / startToCaptureTime; // 时间比率(越接近1越好)
      
      var cameraInitTime = 1200;     // ms, 相机初始化时间
      var focusTime = 300;           // ms, 对焦时间
      var captureResponseTime = 150; // ms, 按下拍照按钮到反馈的时间
      
      result.details.startToCaptureTime = startToCaptureTime;
      result.details.baselineTime = baselineTime;
      result.details.timeRatio = timeRatio;
      result.details.cameraInitTime = cameraInitTime;
      result.details.focusTime = focusTime;
      result.details.captureResponseTime = captureResponseTime;
      
      // 综合评分
      // 需要确保不超过1.0
      result.score = Math.min(1.0, (timeRatio * 0.6) + 
                     (captureResponseTime < 200 ? 0.2 : 0.1) + 
                     (cameraInitTime < 1500 ? 0.2 : 0.1));
                     
      logger.info('拍照时间效率评分: ' + result.score.toFixed(2));
      
      return result;
    });
    
    // 测试批量拍照的效率
    this.runTest('批量拍照效率', function() {
      var result = {
        score: 0,
        details: {},
        category: 'efficiency',
        metric: 'interactionSpeed'
      };
      
      // 模拟批量拍照分析
      var batchSizeSupport = 10;     // 批量拍照支持的最大数量
      var continuousShootingSupport = true; // 是否支持连拍
      var avgTimeBetweenShots = 1200; // ms, 两次拍照之间的平均时间
      var baselineTimeBetweenShots = 1000; // ms, 基准时间
      
      var speedScore = baselineTimeBetweenShots / avgTimeBetweenShots;
      var featureScore = (batchSizeSupport >= 5 ? 0.3 : 0.1) + 
                         (continuousShootingSupport ? 0.3 : 0.1);
      
      result.details.batchSizeSupport = batchSizeSupport;
      result.details.continuousShootingSupport = continuousShootingSupport;
      result.details.avgTimeBetweenShots = avgTimeBetweenShots;
      result.details.baselineTimeBetweenShots = baselineTimeBetweenShots;
      
      // 综合评分
      result.score = (speedScore * 0.4) + featureScore + 
                     (batchSizeSupport > 1 ? Math.min(0.3, batchSizeSupport/20) : 0);
                     
      logger.info('批量拍照效率评分: ' + result.score.toFixed(2));
      
      return result;
    });
    
    return this;
  }
  
  /**
   * 测试用户满意度模拟
   */
  function testSatisfaction() {
    if (!options.testTypes.satisfaction) {
      logger.info('满意度测试已禁用，跳过');
      return this;
    }
    
    logger.info('开始执行用户满意度测试');
    
    // 模拟用户对界面美观度的评价
    this.runTest('界面满意度', function() {
      var result = {
        score: 0,
        details: {},
        category: 'satisfaction',
        metric: 'enjoyment'
      };
      
      // 模拟用户界面满意度评估
      var visualAppeal = 0.85;      // 视觉吸引力
      var layoutSatisfaction = 0.8;  // 布局满意度
      var colorSatisfaction = 0.9;   // 配色满意度
      var modernFeel = 0.85;         // 现代感
      
      result.details.visualAppeal = visualAppeal;
      result.details.layoutSatisfaction = layoutSatisfaction;
      result.details.colorSatisfaction = colorSatisfaction;
      result.details.modernFeel = modernFeel;
      
      // 综合评分
      result.score = (visualAppeal * 0.3) + 
                     (layoutSatisfaction * 0.3) + 
                     (colorSatisfaction * 0.2) + 
                     (modernFeel * 0.2);
                     
      logger.info('界面满意度评分: ' + result.score.toFixed(2));
      
      return result;
    });
    
    // 模拟用户对操作流畅度的评价
    this.runTest('操作流畅度满意度', function() {
      var result = {
        score: 0,
        details: {},
        category: 'satisfaction',
        metric: 'enjoyment'
      };
      
      // 模拟操作流畅度评估
      var responseSpeed = 0.9;       // 响应速度满意度
      var animationSmoothness = 0.85; // 动画流畅度
      var operationFeedback = 0.8;   // 操作反馈满意度
      var overallFluency = 0.85;     // 整体流畅度
      
      result.details.responseSpeed = responseSpeed;
      result.details.animationSmoothness = animationSmoothness;
      result.details.operationFeedback = operationFeedback;
      result.details.overallFluency = overallFluency;
      
      // 综合评分
      result.score = (responseSpeed * 0.3) + 
                     (animationSmoothness * 0.3) + 
                     (operationFeedback * 0.2) + 
                     (overallFluency * 0.2);
                     
      logger.info('操作流畅度满意度评分: ' + result.score.toFixed(2));
      
      return result;
    });
    
    // 模拟用户对整体体验的满意度
    this.runTest('整体体验满意度', function() {
      var result = {
        score: 0,
        details: {},
        category: 'satisfaction',
        metric: 'likelihood'
      };
      
      // 模拟整体满意度评估
      var functionalityScore = 0.85; // 功能满足需求程度
      var easeOfUse = 0.9;           // 易用性满意度
      var reliabilityPerception = 0.8; // 可靠性感知
      var emotionalResponse = 0.85;   // 情感响应积极程度
      
      // 模拟NPS (Net Promoter Score)
      var npsScore = 8.5; // 0-10分，9-10为推荐者，7-8为中立者，0-6为批评者
      var npsCategory = npsScore >= 9 ? "推荐者" : (npsScore >= 7 ? "中立者" : "批评者");
      var normalizedNps = npsScore / 10;
      
      result.details.functionalityScore = functionalityScore;
      result.details.easeOfUse = easeOfUse;
      result.details.reliabilityPerception = reliabilityPerception;
      result.details.emotionalResponse = emotionalResponse;
      result.details.npsScore = npsScore;
      result.details.npsCategory = npsCategory;
      
      // 综合评分
      result.score = (functionalityScore * 0.25) + 
                     (easeOfUse * 0.25) + 
                     (reliabilityPerception * 0.2) + 
                     (emotionalResponse * 0.1) +
                     (normalizedNps * 0.2);
                     
      logger.info('整体体验满意度评分: ' + result.score.toFixed(2) + ', NPS: ' + npsScore);
      
      return result;
    });
    
    return this;
  }
  
  /**
   * 测试无障碍功能
   */
  function testAccessibility() {
    if (!options.testTypes.accessibility) {
      logger.info('无障碍测试已禁用，跳过');
      return this;
    }
    
    logger.info('开始执行无障碍测试');
    
    // 测试屏幕阅读器兼容性
    this.runTest('屏幕阅读器兼容性', function() {
      var result = {
        score: 0,
        details: {},
        category: 'accessibility',
        metric: 'screenReader'
      };
      
      // 模拟屏幕阅读器兼容性评估
      var elementsWithLabels = 0.85;  // 元素具有可访问标签的比例
      var imageAlts = 0.9;           // 图片有替代文本的比例
      var focusTraversable = 0.95;   // 焦点可遍历性
      var customActionsSupport = 0.8; // 自定义操作支持度
      
      result.details.elementsWithLabels = elementsWithLabels;
      result.details.imageAlts = imageAlts;
      result.details.focusTraversable = focusTraversable;
      result.details.customActionsSupport = customActionsSupport;
      
      // 综合评分
      result.score = (elementsWithLabels * 0.3) + 
                     (imageAlts * 0.3) + 
                     (focusTraversable * 0.25) + 
                     (customActionsSupport * 0.15);
                     
      logger.info('屏幕阅读器兼容性评分: ' + result.score.toFixed(2));
      
      return result;
    });
    
    // 测试键盘/触控导航
    this.runTest('键盘与触控导航', function() {
      var result = {
        score: 0,
        details: {},
        category: 'accessibility',
        metric: 'keyboardNav'
      };
      
      // 模拟键盘与触控导航评估
      var keyboardNavigable = 0.8;   // 键盘导航支持度
      var touchTargetSize = 0.85;    // 触控目标大小适当性
      var touchTargetSpacing = 0.9;  // 触控目标间距适当性
      var gestureAlternatives = 0.7; // 手势操作替代方案
      
      result.details.keyboardNavigable = keyboardNavigable;
      result.details.touchTargetSize = touchTargetSize;
      result.details.touchTargetSpacing = touchTargetSpacing;
      result.details.gestureAlternatives = gestureAlternatives;
      
      // 综合评分
      result.score = (keyboardNavigable * 0.25) + 
                     (touchTargetSize * 0.3) + 
                     (touchTargetSpacing * 0.3) + 
                     (gestureAlternatives * 0.15);
                     
      logger.info('键盘与触控导航评分: ' + result.score.toFixed(2));
      
      return result;
    });
    
    // 测试色彩对比度
    this.runTest('色彩对比度', function() {
      var result = {
        score: 0,
        details: {},
        category: 'accessibility',
        metric: 'colorContrast'
      };
      
      // 模拟色彩对比度评估
      var textToBackgroundRatio = 5.2; // 文本与背景对比度比率
      var wcagAAPass = true;          // 是否通过WCAG AA标准
      var wcagAAAPass = false;        // 是否通过WCAG AAA标准
      var colorBlindFriendly = 0.8;   // 色盲友好度
      
      result.details.textToBackgroundRatio = textToBackgroundRatio;
      result.details.wcagAAPass = wcagAAPass;
      result.details.wcagAAAPass = wcagAAAPass;
      result.details.colorBlindFriendly = colorBlindFriendly;
      
      // 根据WCAG标准计算分数
      var contrastScore = 0;
      if (textToBackgroundRatio >= 7.0) {
        contrastScore = 1.0; // AAA
      } else if (textToBackgroundRatio >= 4.5) {
        contrastScore = 0.8; // AA
      } else if (textToBackgroundRatio >= 3.0) {
        contrastScore = 0.5; // 部分满足
      } else {
        contrastScore = 0.2; // 不满足
      }
      
      // 综合评分
      result.score = (contrastScore * 0.6) + 
                     (colorBlindFriendly * 0.4);
                     
      logger.info('色彩对比度评分: ' + result.score.toFixed(2));
      
      return result;
    });
    
    // 测试文本大小调整
    this.runTest('文本大小调整', function() {
      var result = {
        score: 0,
        details: {},
        category: 'accessibility',
        metric: 'textSize'
      };
      
      // 模拟文本大小调整评估
      var textScalability = 0.85;     // 文本可缩放性
      var minTextSize = 14;           // 最小文本尺寸(px)
      var noClippingWhenScaled = 0.9; // 放大时不裁剪内容的程度
      var responsiveLayout = 0.8;     // 布局响应式适应程度
      
      var textSizeScore = minTextSize >= 16 ? 1.0 : 
                         (minTextSize >= 14 ? 0.8 : 
                         (minTextSize >= 12 ? 0.6 : 0.4));
      
      result.details.textScalability = textScalability;
      result.details.minTextSize = minTextSize;
      result.details.noClippingWhenScaled = noClippingWhenScaled;
      result.details.responsiveLayout = responsiveLayout;
      
      // 综合评分
      result.score = (textScalability * 0.3) + 
                     (textSizeScore * 0.3) + 
                     (noClippingWhenScaled * 0.2) + 
                     (responsiveLayout * 0.2);
                     
      logger.info('文本大小调整评分: ' + result.score.toFixed(2));
      
      return result;
    });
    
    return this;
  }
  
  /**
   * 测试视觉设计和美学
   */
  function testAesthetics() {
    if (!options.testTypes.aesthetics) {
      logger.info('美学测试已禁用，跳过');
      return this;
    }
    
    logger.info('开始执行视觉设计和美学测试');
    
    // 测试界面布局平衡性
    this.runTest('界面布局平衡性', function() {
      var result = {
        score: 0,
        details: {},
        category: 'aesthetics',
        metric: 'layoutBalance'
      };
      
      // 模拟界面布局平衡性评估
      var symmetryScore = 0.85;      // 对称性评分
      var whitespaceUsage = 0.9;     // 留白使用恰当性
      var elementAlignment = 0.95;   // 元素对齐程度
      var densityBalance = 0.8;      // 界面元素密度均衡性
      
      result.details.symmetryScore = symmetryScore;
      result.details.whitespaceUsage = whitespaceUsage;
      result.details.elementAlignment = elementAlignment;
      result.details.densityBalance = densityBalance;
      
      // 综合评分
      result.score = (symmetryScore * 0.25) + 
                     (whitespaceUsage * 0.25) + 
                     (elementAlignment * 0.3) + 
                     (densityBalance * 0.2);
                     
      logger.info('界面布局平衡性评分: ' + result.score.toFixed(2));
      
      return result;
    });
    
    // 测试色彩搭配和谐度
    this.runTest('色彩搭配和谐度', function() {
      var result = {
        score: 0,
        details: {},
        category: 'aesthetics',
        metric: 'visualAppeal'
      };
      
      // 模拟色彩搭配和谐度评估
      var colorHarmony = 0.9;        // 色彩和谐度
      var colorPaletteCohesion = 0.85; // 调色板一致性
      var emotionalImpact = 0.8;     // 情感影响
      var brandAlignment = 0.95;     // 品牌一致性
      
      result.details.colorHarmony = colorHarmony;
      result.details.colorPaletteCohesion = colorPaletteCohesion;
      result.details.emotionalImpact = emotionalImpact;
      result.details.brandAlignment = brandAlignment;
      
      // 综合评分
      result.score = (colorHarmony * 0.3) + 
                     (colorPaletteCohesion * 0.25) + 
                     (emotionalImpact * 0.2) + 
                     (brandAlignment * 0.25);
                     
      logger.info('色彩搭配和谐度评分: ' + result.score.toFixed(2));
      
      return result;
    });
    
    // 测试图标和视觉元素的一致性
    this.runTest('视觉元素一致性', function() {
      var result = {
        score: 0,
        details: {},
        category: 'aesthetics',
        metric: 'consistency'
      };
      
      // 模拟视觉元素一致性评估
      var iconStyleConsistency = 0.9;   // 图标风格一致性
      var visualLanguageUnity = 0.85;   // 视觉语言统一性
      var typographyConsistency = 0.95; // 字体使用一致性
      var componentDesignCoherence = 0.9; // 组件设计连贯性
      
      result.details.iconStyleConsistency = iconStyleConsistency;
      result.details.visualLanguageUnity = visualLanguageUnity;
      result.details.typographyConsistency = typographyConsistency;
      result.details.componentDesignCoherence = componentDesignCoherence;
      
      // 综合评分
      result.score = (iconStyleConsistency * 0.25) + 
                     (visualLanguageUnity * 0.25) + 
                     (typographyConsistency * 0.25) + 
                     (componentDesignCoherence * 0.25);
                     
      logger.info('视觉元素一致性评分: ' + result.score.toFixed(2));
      
      return result;
    });
    
    return this;
  }
  
  /**
   * 模拟典型用户任务场景
   * @param {string} scenarioName - 场景名称
   * @param {Array} steps - 步骤数组
   */
  function simulateUserScenario(scenarioName, steps) {
    logger.info('模拟用户场景: ' + scenarioName);
    
    var scenarioResult = {
      name: scenarioName,
      stepsTotal: steps.length,
      stepsCompleted: 0,
      stepsSuccessful: 0,
      errors: [],
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      interactionReport: null
    };
    
    // 重置交互记录
    userInteraction.reset();
    
    // 执行每个步骤
    try {
      for (var i = 0; i < steps.length; i++) {
        var step = steps[i];
        logger.info('执行步骤 ' + (i + 1) + '/' + steps.length + ': ' + step.description);
        
        var stepResult = executeScenarioStep(step);
        scenarioResult.stepsCompleted++;
        
        if (stepResult.success) {
          scenarioResult.stepsSuccessful++;
        } else {
          scenarioResult.errors.push({
            step: i + 1,
            description: step.description,
            error: stepResult.error
          });
          
          // 如果步骤标记为关键且失败，则中断场景
          if (step.critical) {
            logger.error('关键步骤失败，中断场景: ' + stepResult.error);
            break;
          }
        }
      }
    } catch (e) {
      logger.error('场景执行出现异常: ' + e.message);
      scenarioResult.errors.push({
        step: scenarioResult.stepsCompleted + 1,
        description: steps[scenarioResult.stepsCompleted] ? steps[scenarioResult.stepsCompleted].description : '未知步骤',
        error: e.message || String(e)
      });
    }
    
    // 完成场景并记录结果
    scenarioResult.endTime = Date.now();
    scenarioResult.duration = scenarioResult.endTime - scenarioResult.startTime;
    scenarioResult.interactionReport = userInteraction.analyzeInteractions();
    
    logger.info('场景 "' + scenarioName + '" 完成: ' + 
               scenarioResult.stepsSuccessful + '/' + scenarioResult.stepsTotal + ' 步骤成功, ' +
               '总耗时: ' + scenarioResult.duration + 'ms');
    
    // 在实际实现中，这个函数将返回到场景执行结果
    return scenarioResult;
  }
  
  /**
   * 执行场景步骤 (内部辅助函数)
   * @param {Object} step - 步骤对象
   * @private
   */
  function executeScenarioStep(step) {
    var result = {
      success: false,
      error: null
    };
    
    try {
      switch (step.action) {
        case 'click':
          userInteraction.simulateClick(step.target, step.options);
          break;
        case 'input':
          userInteraction.simulateInput(step.target, step.value, step.options);
          break;
        case 'gesture':
          userInteraction.simulateGesture(step.gestureType, step.target, step.options);
          break;
        case 'wait':
          // 模拟等待
          logger.info('等待 ' + step.duration + 'ms');
          // 在实际实现中，这里会使用小程序的定时器等待
          break;
        case 'custom':
          if (typeof step.execute === 'function') {
            step.execute();
          } else {
            throw new Error('自定义步骤缺少execute函数');
          }
          break;
        default:
          throw new Error('未知的步骤动作类型: ' + step.action);
      }
      
      // 如果有验证函数，执行验证
      if (typeof step.verify === 'function') {
        var verifyResult = step.verify();
        if (!verifyResult) {
          throw new Error('步骤验证失败');
        }
      }
      
      result.success = true;
    } catch (e) {
      result.success = false;
      result.error = e.message || String(e);
    }
    
    return result;
  }
  
  /**
   * 运行所有用户体验测试
   * @return {Object} 测试结果摘要
   */
  function runAllTests() {
    logger.info('开始用户体验测试');
    
    // 确保在开始前释放资源
    userInteraction.reset();
    
    var startTime = Date.now();
    
    // 执行所有启用的测试
    this.testCameraUsability();
    this.testIntuitiveness();
    this.testEfficiency();
    this.testSatisfaction();
    this.testAccessibility();
    this.testAesthetics();
    
    var endTime = Date.now();
    var duration = endTime - startTime;
    
    var summary = {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      duration: duration,
      success: testResults.failed === 0
    };
    
    logger.info('用户体验测试完成! 总计: ' + summary.total + 
                ', 通过: ' + summary.passed + 
                ', 失败: ' + summary.failed + 
                ', 耗时: ' + summary.duration + 'ms');
    
    // 计算各类别的平均得分
    var categoryScores = {};
    var categoryTests = {};
    
    for (var i = 0; i < testResults.results.length; i++) {
      var result = testResults.results[i];
      var category = result.category;
      
      if (!categoryScores[category]) {
        categoryScores[category] = 0;
        categoryTests[category] = 0;
      }
      
      categoryScores[category] += result.score;
      categoryTests[category]++;
    }
    
    logger.info('类别得分:');
    for (var category in categoryScores) {
      if (categoryTests[category] > 0) {
        var avgScore = categoryScores[category] / categoryTests[category];
        logger.info('- ' + category + ': ' + avgScore.toFixed(2));
      }
    }
    
    // 测试完成后确保释放资源
    userInteraction.releaseImageResources();
    
    return summary;
  }
  
  /**
   * 生成用户体验测试报告
   * @return {string} HTML格式的用户体验测试报告
   */
  function generateUXReport() {
    var reportHtml = '<div class="ux-test-report">';
    reportHtml += '<h2>照片采集模块用户体验测试报告</h2>';
    reportHtml += '<div class="summary">';
    reportHtml += '<p>总计测试: ' + testResults.total + '</p>';
    reportHtml += '<p>通过: ' + testResults.passed + '</p>';
    reportHtml += '<p>失败: ' + testResults.failed + '</p>';
    reportHtml += '</div>';
    
    // 按测试类别分组
    var categoryGroups = {};
    
    for (var i = 0; i < testResults.results.length; i++) {
      var result = testResults.results[i];
      var category = result.category;
      
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      
      categoryGroups[category].push(result);
    }
    
    // 生成各类别的报告
    for (var category in categoryGroups) {
      var tests = categoryGroups[category];
      
      if (tests.length > 0) {
        reportHtml += '<div class="category-group ' + category + '">';
        reportHtml += '<h3>' + category.charAt(0).toUpperCase() + category.slice(1) + ' 类测试 (' + tests.length + ')</h3>';
        
        // 计算类别平均分
        var totalScore = 0;
        for (var j = 0; j < tests.length; j++) {
          totalScore += tests[j].score;
        }
        var avgScore = totalScore / tests.length;
        
        reportHtml += '<div class="category-score">平均分: ' + avgScore.toFixed(2) + '</div>';
        reportHtml += '<ul>';
        
        for (var k = 0; k < tests.length; k++) {
          var test = tests[k];
          reportHtml += '<li class="' + (test.passed ? 'passed' : 'failed') + '">';
          reportHtml += '<div class="test-name">' + test.name + '</div>';
          reportHtml += '<div class="test-score">分数: ' + test.score.toFixed(2) + '</div>';
          
          if (!test.passed) {
            reportHtml += '<div class="test-error">' + (test.error || '未达到阈值') + '</div>';
          }
          
          if (test.details && Object.keys(test.details).length > 0) {
            reportHtml += '<ul class="details">';
            for (var key in test.details) {
              if (test.details.hasOwnProperty(key)) {
                var value = test.details[key];
                if (typeof value === 'object') {
                  value = JSON.stringify(value);
                }
                reportHtml += '<li>' + key + ': ' + value + '</li>';
              }
            }
            reportHtml += '</ul>';
          }
          
          reportHtml += '</li>';
        }
        
        reportHtml += '</ul>';
        reportHtml += '</div>';
      }
    }
    
    reportHtml += '<div class="recommendations">';
    reportHtml += '<h3>改进建议</h3>';
    reportHtml += '<ul>';
    
    // 根据测试结果生成建议
    // 在实际实现中，这里会根据测试失败原因提供具体建议
    var recommendations = generateRecommendations();
    for (var m = 0; m < recommendations.length; m++) {
      reportHtml += '<li>' + recommendations[m] + '</li>';
    }
    
    reportHtml += '</ul>';
    reportHtml += '</div>';
    
    reportHtml += '</div>';
    
    return reportHtml;
  }
  
  /**
   * 生成改进建议 (内部辅助函数)
   * @private
   */
  function generateRecommendations() {
    var recommendations = [];
    
    // 针对每个失败的测试提供建议
    for (var i = 0; i < testResults.results.length; i++) {
      var result = testResults.results[i];
      if (!result.passed) {
        switch (result.category) {
          case 'usability':
            recommendations.push('提高 "' + result.name + '" 的可用性，确保界面元素易于识别和操作。');
            break;
          case 'intuitiveness':
            recommendations.push('改进 "' + result.name + '" 的直觉性，增强用户引导和自解释性。');
            break;
          case 'efficiency':
            recommendations.push('优化 "' + result.name + '" 的效率，减少完成任务所需的步骤和时间。');
            break;
          case 'satisfaction':
            recommendations.push('提升 "' + result.name + '" 的用户满意度，改善用户主观体验。');
            break;
          case 'accessibility':
            recommendations.push('增强 "' + result.name + '" 的无障碍功能，确保所有用户都能顺利使用。');
            break;
          case 'aesthetics':
            recommendations.push('优化 "' + result.name + '" 的视觉设计，提高界面美观度和一致性。');
            break;
          default:
            recommendations.push('改进 "' + result.name + '" 的整体用户体验。');
        }
      }
    }
    
    // 去重
    var uniqueRecommendations = [];
    for (var j = 0; j < recommendations.length; j++) {
      if (uniqueRecommendations.indexOf(recommendations[j]) === -1) {
        uniqueRecommendations.push(recommendations[j]);
      }
    }
    
    return uniqueRecommendations;
  }
  
  // 公开API
  return {
    init: init,
    runTest: runTest,
    testCameraUsability: testCameraUsability,
    testIntuitiveness: testIntuitiveness,
    testEfficiency: testEfficiency,
    testSatisfaction: testSatisfaction,
    testAccessibility: testAccessibility,
    testAesthetics: testAesthetics,
    simulateUserScenario: simulateUserScenario,
    runAllTests: runAllTests,
    generateUXReport: generateUXReport
  };
})();

// 导出模块 (如果在CommonJS环境中)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PhotoCaptureUXTest;
} 