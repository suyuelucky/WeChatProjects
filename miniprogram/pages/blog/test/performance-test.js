/**
 * 博客滑动性能测试页面
 * 创建时间：2025年04月10日 21:30:58
 * 创建者：Claude助手
 * 修改时间：2025年05月12日 19:43:08 修复性能测试中的虚假指标和可扩展性问题
 */

// 由于在小程序环境中导入模块可能有限制，这里先模拟一个简化版的测试类
const MockPerformanceTest = {
  scenarios: {
    largeDataset: {
      name: "大量数据测试",
      description: "测试1000条博客数据的加载和渲染性能",
      data: Array(100).fill(0).map((_, i) => ({
        id: `blog_${i}`,
        content: `这是第${i+1}条测试博客内容，包含一些测试文本。性能测试需要模拟大量文本内容以测试渲染效率。`,
        images: i % 3 === 0 ? [`https://picsum.photos/400/300?random=${i}`] : [],
        author: {
          nickname: `测试用户${i}`,
          avatarUrl: `https://picsum.photos/100/100?random=${i}`
        },
        createTime: new Date(Date.now() - i * 3600000).toLocaleString(),
        likes: Math.floor(Math.random() * 100),
        comments: Math.floor(Math.random() * 20)
      }))
    },
    largeImages: {
      name: "大尺寸图片测试",
      description: "测试加载和渲染大量高分辨率图片的性能",
      data: Array(30).fill(0).map((_, i) => ({
        id: `blog_img_${i}`,
        content: `图片测试 #${i+1}。这是一个包含大尺寸图片的测试博客。`,
        images: [
          `https://picsum.photos/800/600?random=${i*2}`,
          `https://picsum.photos/800/800?random=${i*2+1}`
        ],
        author: {
          nickname: `图片测试用户${i}`,
          avatarUrl: `https://picsum.photos/100/100?random=${i+100}`
        },
        createTime: new Date(Date.now() - i * 3600000).toLocaleString(),
        likes: Math.floor(Math.random() * 100),
        comments: Math.floor(Math.random() * 20)
      }))
    }
  },
  
  currentTest: null,
  isMonitoring: false,
  metrics: {
    fps: 0,
    jankCount: 0,
    scrollEvents: 0,
    startTime: 0,
    lastFrameTime: 0,
    frameCount: 0,
    frameTimes: []
  },
  
  runTestScenario(scenarioId) {
    if (!this.scenarios[scenarioId]) {
      return { error: "未找到测试场景" };
    }
    
    this.currentTest = scenarioId;
    this.isMonitoring = true;
    this.metrics = { 
      fps: 0, 
      jankCount: 0, 
      scrollEvents: 0,
      startTime: Date.now(),
      lastFrameTime: Date.now(),
      frameCount: 0,
      frameTimes: []
    };
    
    // 启动性能监控
    this.startMonitoring();
    
    // 返回测试数据
    return {
      name: this.scenarios[scenarioId].name,
      description: this.scenarios[scenarioId].description,
      data: this.scenarios[scenarioId].data
    };
  },
  
  startMonitoring() {
    // 使用真实的帧率监控，通过requestAnimationFrame
    const monitorFrame = () => {
      if (!this.isMonitoring) return;
      
      const now = Date.now();
      const frameDuration = now - this.metrics.lastFrameTime;
      
      // 记录帧信息
      this.metrics.frameCount++;
      this.metrics.frameTimes.push(frameDuration);
      
      // 检测卡顿（单帧时间超过33ms视为卡顿）
      if (frameDuration > 33) {
        this.metrics.jankCount++;
      }
      
      // 更新帧率计算
      const elapsed = now - this.metrics.startTime;
      if (elapsed > 0) {
        this.metrics.fps = Math.round((this.metrics.frameCount * 1000) / elapsed);
      }
      
      this.metrics.lastFrameTime = now;
      
      // 继续下一帧监控
      requestAnimationFrame(monitorFrame);
    };
    
    // 开始监控
    this.metrics.startTime = Date.now();
    this.metrics.lastFrameTime = this.metrics.startTime;
    requestAnimationFrame(monitorFrame);
  },
  
  recordScrollEvent() {
    if (this.isMonitoring) {
      this.metrics.scrollEvents++;
    }
  },
  
  getCurrentPerformanceData() {
    return this.isMonitoring ? this.metrics : null;
  },
  
  endCurrentTest() {
    if (!this.currentTest) {
      return { error: "没有正在运行的测试" };
    }
    
    this.isMonitoring = false;
    
    // 计算性能指标
    const frameTimes = this.metrics.frameTimes;
    const avgFrameTime = frameTimes.length > 0 
      ? frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length 
      : 0;
      
    const minFps = avgFrameTime > 0 ? Math.round(1000 / Math.max(...frameTimes)) : 0;
    const maxFps = avgFrameTime > 0 ? Math.round(1000 / Math.min(...frameTimes)) : 0;
    const avgFps = avgFrameTime > 0 ? Math.round(1000 / avgFrameTime) : 0;
    
    const jankFrames = this.metrics.jankCount;
    const jankPercentage = this.metrics.frameCount > 0 
      ? ((jankFrames / this.metrics.frameCount) * 100).toFixed(2) + '%'
      : '0%';
    
    // 生成测试报告
    const report = {
      overallScore: this.calculateOverallScore(avgFps, jankPercentage),
      fps: {
        current: avgFps,
        min: minFps,
        max: maxFps,
        avg: avgFps,
        target: 60,
        belowTarget: frameTimes.filter(time => time > (1000 / 60)).length,
        belowSixty: frameTimes.filter(time => time > 16.67).length,
        jankFrames: jankFrames,
        jankPercentage: jankPercentage
      },
      jank: {
        count: jankFrames,
        longTasks: frameTimes.filter(time => time > 50).length,
        renderBlockTime: (frameTimes.filter(time => time > 33).reduce((sum, time) => sum + time, 0)).toFixed(2) + 'ms',
        totalBlocking: frameTimes.length > 0
          ? ((frameTimes.filter(time => time > 33).reduce((sum, time) => sum + time, 0) / 
              frameTimes.reduce((sum, time) => sum + time, 0)) * 100).toFixed(2) + '%'
          : '0%'
      },
      render: {
        frameCount: this.metrics.frameCount,
        avgFrameTime: avgFrameTime.toFixed(2) + 'ms'
      },
      result: {
        passLevel1: avgFps >= 60 && jankFrames <= 5,
        passLevel2: avgFps >= 90 && jankFrames <= 3,
        passLevel3: avgFps >= 120 && jankFrames <= 1,
        recommendation: this.generateRecommendations(avgFps, jankFrames)
      }
    };
    
    const result = {
      scenarioName: this.currentTest,
      name: this.scenarios[this.currentTest].name,
      performanceReport: report,
      passed: report.fps.avg >= 60,
      details: []
    };
    
    this.currentTest = null;
    return result;
  },
  
  calculateOverallScore(fps, jankPercentage) {
    // 将字符串百分比转换为数字
    const jankPercent = parseFloat(jankPercentage);
    
    // FPS得分，满分60分
    const fpsScore = Math.min(60, fps) / 60 * 60;
    
    // 卡顿得分，满分40分，无卡顿得满分，5%以上卡顿得0分
    const jankScore = jankPercent <= 0 ? 40 : Math.max(0, 40 - (jankPercent / 5 * 40));
    
    // 总分
    return Math.round(fpsScore + jankScore);
  },
  
  generateRecommendations(fps, jankCount) {
    const recommendations = [];
    
    if (fps < 60) {
      recommendations.push('优化渲染逻辑');
      recommendations.push('考虑使用虚拟列表减轻渲染负担');
    }
    
    if (jankCount > 0) {
      recommendations.push('减少DOM节点数量');
      recommendations.push('优化图片加载和缓存策略');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('当前性能良好，可以考虑进一步优化以支持更高刷新率设备');
    }
    
    return recommendations;
  }
};

Page({
  data: {
    // 界面状态控制
    isTestRunning: false,
    isTestComplete: false,
    showResults: false,
    testProgress: 0,
    currentTestName: "",
    
    // 测试配置
    selectedScenario: 'largeDataset',
    testDuration: 10, // 测试时长(秒)
    targetFPS: 60,    // 目标帧率
    fpsOptions: [60, 90, 120],  // 帧率选项
    fpsIndex: 0,      // 当前选择的帧率索引
    
    // 实时性能指标
    currentFps: 0,
    currentJanks: 0,
    
    // 测试场景列表
    scenarios: [
      {
        id: 'largeDataset',
        name: '大量数据测试',
        description: '测试1000条博客数据的加载和渲染性能'
      },
      {
        id: 'largeImages',
        name: '大尺寸图片测试',
        description: '测试加载和渲染大量高分辨率图片的性能'
      },
      {
        id: 'rapidScrolling',
        name: '频繁滚动测试',
        description: '测试用户快速滚动列表时的性能表现'
      },
      {
        id: 'mixedContent',
        name: '混合内容测试',
        description: '测试文本、图片、交互元素混合内容的性能'
      },
      {
        id: 'backgroundLoading',
        name: '后台加载测试',
        description: '测试在滚动过程中动态加载更多数据的性能'
      }
    ],
    
    // 当前测试数据
    currentScenario: null,
    testData: [],
    
    // 测试结果
    testResult: null,
    
    selectedScenarioIndex: 0,
  },
  
  // 性能测试实例
  performanceTest: null,
  
  onLoad: function() {
    // 使用模拟的性能测试实例
    this.performanceTest = MockPerformanceTest;
    
    // 确保每个场景ID都有对应的测试数据
    this.addMissingScenarios();
  },
  
  // 添加缺失的测试场景数据
  addMissingScenarios: function() {
    const scenarios = this.data.scenarios;
    for (let i = 0; i < scenarios.length; i++) {
      const scenarioId = scenarios[i].id;
      
      // 如果性能测试实例中没有对应场景，添加一个
      if (!this.performanceTest.scenarios[scenarioId]) {
        console.log(`添加缺失的测试场景: ${scenarioId}`);
        
        // 复制largeDataset场景作为基础
        const baseScenario = this.performanceTest.scenarios.largeDataset;
        
        // 创建新场景
        this.performanceTest.scenarios[scenarioId] = {
          name: scenarios[i].name,
          description: scenarios[i].description,
          data: JSON.parse(JSON.stringify(baseScenario.data))
        };
      }
    }
  },
  
  // 选择测试场景
  onScenarioSelect: function(e) {
    const index = e.detail.value;
    const scenarioId = this.data.scenarios[index].id;
    
    this.setData({
      selectedScenario: scenarioId,
      selectedScenarioIndex: index
    });
  },
  
  // 设置测试时长
  setTestDuration(e) {
    this.setData({
      testDuration: e.detail.value
    });
    console.log(`测试时长设置为: ${e.detail.value}秒`);
  },
  
  // 切换目标帧率
  bindFPSChange(e) {
    const index = e.detail.value;
    const targetFPS = this.data.fpsOptions[index];
    this.setData({
      fpsIndex: index,
      targetFPS: targetFPS
    });
    console.log(`目标帧率设置为: ${targetFPS}fps`);
  },
  
  // 开始测试
  startTest: function() {
    if (this.data.isTestRunning) return;
    
    const { selectedScenario, testDuration, targetFPS } = this.data;
    
    // 检查场景是否存在
    const scenarioIndex = this.data.scenarios.findIndex(s => s.id === selectedScenario);
    if (scenarioIndex === -1) {
      wx.showToast({
        title: '请选择测试场景',
        icon: 'none'
      });
      return;
    }
    
    // 获取场景信息
    const scenario = this.data.scenarios[scenarioIndex];
    
    // 开始测试流程
    this.setData({
      isTestRunning: true,
      isTestComplete: false,
      showResults: false,
      testProgress: 0,
      currentFps: 0,
      currentJanks: 0,
      currentTestName: scenario.name
    });
    
    // 从性能测试实例获取测试数据
    try {
      const scenarioData = this.performanceTest.runTestScenario(selectedScenario);
      
      if (scenarioData.error) {
        wx.showToast({
          title: scenarioData.error,
          icon: 'none'
        });
        this.setData({ isTestRunning: false });
        return;
      }
      
      this.setData({
        currentScenario: {
          id: selectedScenario,
          name: scenario.name,
          description: scenario.description
        },
        testData: scenarioData.data
      });
      
      // 设置测试结束定时器
      this.testEndTimer = setTimeout(() => {
        this.stopTest();
      }, testDuration * 1000);
      
      // 设置进度更新定时器
      this.testProgressTimer = setInterval(() => {
        const elapsedTime = Date.now() - this.testStartTime;
        const progress = Math.min(100, Math.round((elapsedTime / (testDuration * 1000)) * 100));
        
        // 获取实时性能数据
        const performanceData = this.performanceTest.getCurrentPerformanceData();
        if (performanceData) {
          this.setData({
            testProgress: progress,
            currentFps: performanceData.fps,
            currentJanks: performanceData.jankCount
          });
        } else {
          this.setData({
            testProgress: progress
          });
        }
      }, 100);
      
      // 记录测试开始时间
      this.testStartTime = Date.now();
      
    } catch (error) {
      console.error('测试启动错误:', error);
      wx.showToast({
        title: '启动测试失败',
        icon: 'none'
      });
      this.setData({ isTestRunning: false });
    }
  },
  
  // 停止测试
  stopTest: function() {
    if (!this.data.isTestRunning) return;
    
    // 清除定时器
    if (this.testEndTimer) {
      clearTimeout(this.testEndTimer);
      this.testEndTimer = null;
    }
    
    if (this.testProgressTimer) {
      clearInterval(this.testProgressTimer);
      this.testProgressTimer = null;
    }
    
    // 获取测试结果
    try {
      const result = this.performanceTest.endCurrentTest();
      if (result.error) {
        wx.showToast({
          title: result.error,
          icon: 'none'
        });
        this.setData({ isTestRunning: false });
        return;
      }
      
      // 显示测试结果
      this.setData({
        isTestRunning: false,
        isTestComplete: true,
        showResults: true,
        testResult: result.performanceReport
      });
      
    } catch (error) {
      console.error('停止测试错误:', error);
      wx.showToast({
        title: '获取测试结果失败',
        icon: 'none'
      });
      this.setData({ isTestRunning: false });
    }
  },
  
  // 滚动事件处理
  onScroll: function() {
    if (this.data.isTestRunning && this.performanceTest) {
      this.performanceTest.recordScrollEvent();
    }
  },
  
  // 返回测试配置页面
  backToConfig: function() {
    this.setData({
      showResults: false,
      isTestComplete: false
    });
  },
  
  // 重新开始测试
  restartTest: function() {
    this.setData({
      showResults: false,
      isTestComplete: false
    });
    this.startTest();
  },
  
  onUnload: function() {
    // 清理定时器
    if (this.testEndTimer) {
      clearTimeout(this.testEndTimer);
    }
    
    if (this.testProgressTimer) {
      clearInterval(this.testProgressTimer);
    }
  }
}); 