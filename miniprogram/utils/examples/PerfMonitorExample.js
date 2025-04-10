/**
 * PerfMonitor工具使用示例
 * 展示如何在小程序中集成和使用性能监控工具
 */

const PerfMonitor = require('../PerfMonitor');

/**
 * 1. 在app.js中初始化性能监控
 */
function initInApp() {
  // app.js中
  App({
    onLaunch: function() {
      // 启动性能监控
      PerfMonitor.start({
        reportInterval: 30000, // 30秒自动上报一次
        reportUrl: 'https://your-server.com/performance', // 上报地址
        enableMemoryMonitor: true, // 启用内存监控
        enableSetDataMonitor: true, // 启用setData监控
        enableNetworkMonitor: true // 启用网络请求监控
      });
      
      // 其他初始化代码...
    },
    
    onShow: function() {
      // 记录应用启动时间点
      PerfMonitor.mark('app.show');
    },
    
    onHide: function() {
      // 上传性能数据
      PerfMonitor.uploadMetrics('https://your-server.com/performance');
    },
    
    onError: function(error) {
      // 记录错误，可以作为性能问题的分析依据
      console.error('应用发生错误:', error);
      
      // 上传包含错误信息的性能数据
      PerfMonitor.uploadMetrics('https://your-server.com/performance', {
        error: error
      });
    }
  });
}

/**
 * 2. 在页面中应用性能监控
 */
function useInPage() {
  // pages/index/index.js
  const PerfMonitor = require('../../utils/PerfMonitor');
  
  Page({
    data: {
      items: []
    },
    
    onLoad: function(options) {
      // 自动监控页面生命周期
      PerfMonitor.monitorPageLifecycle(this);
      
      // 记录并开始测量自定义操作
      PerfMonitor.mark('page.loadData.start');
      
      this.loadData();
    },
    
    loadData: function() {
      // 监控网络请求
      wx.request(PerfMonitor.monitorRequest({
        url: 'https://api.example.com/data',
        success: (res) => {
          // 记录数据加载完成时间点
          PerfMonitor.mark('page.loadData.end');
          PerfMonitor.measure('page.loadData', 'page.loadData.start', 'page.loadData.end');
          
          // 记录setData性能
          PerfMonitor.recordSetData(this, 'updateItems', {
            items: res.data.items
          }, () => {
            console.log('数据已更新');
          });
        }
      }));
    },
    
    onTapButton: function() {
      // 测量按钮操作耗时
      PerfMonitor.timeAction('button.tap', () => {
        // 按钮点击后的复杂操作
        this.processData();
      });
    },
    
    processData: function() {
      // 对于可能耗时的操作，使用startAction-stopAction对
      const stopTimer = PerfMonitor.startAction('processData');
      
      // 模拟耗时操作
      const result = this.heavyCalculation();
      
      // 结束计时
      const duration = stopTimer();
      console.log('数据处理耗时:', duration, 'ms');
      
      // 其他后续操作...
    },
    
    heavyCalculation: function() {
      // 模拟耗时计算
      let result = 0;
      for (let i = 0; i < 10000; i++) {
        result += Math.sqrt(i);
      }
      return result;
    },
    
    onUnload: function() {
      // 页面卸载时生成性能报告
      const report = PerfMonitor.generateReport();
      console.log(report);
    }
  });
}

/**
 * 3. 使用性能监控数据进行优化
 */
function optimizeWithPerfData() {
  // 获取性能数据
  const metrics = PerfMonitor.getAllMetrics();
  
  // 分析setData性能
  const setDataStats = metrics.performanceData.setData || [];
  
  // 计算平均耗时和大小
  if (setDataStats.length > 0) {
    const totalTime = setDataStats.reduce((sum, item) => sum + item.time, 0);
    const totalSize = setDataStats.reduce((sum, item) => sum + item.size, 0);
    
    const avgTime = totalTime / setDataStats.length;
    const avgSize = totalSize / setDataStats.length;
    
    console.log('setData平均耗时:', avgTime.toFixed(2), 'ms');
    console.log('setData平均大小:', (avgSize / 1024).toFixed(2), 'KB');
    
    // 找出耗时最长的setData操作
    const slowestSetData = setDataStats.sort((a, b) => b.time - a.time)[0];
    if (slowestSetData) {
      console.log('最慢的setData操作:', slowestSetData.name, slowestSetData.time, 'ms');
    }
  }
  
  // 分析网络请求性能
  const requestStats = metrics.performanceData.requests || [];
  
  if (requestStats.length > 0) {
    // 计算网络请求平均耗时
    const totalTime = requestStats.reduce((sum, item) => sum + item.time, 0);
    const avgTime = totalTime / requestStats.length;
    
    console.log('网络请求平均耗时:', avgTime.toFixed(2), 'ms');
    
    // 找出最慢的请求
    const slowestRequest = requestStats.sort((a, b) => b.time - a.time)[0];
    if (slowestRequest) {
      console.log('最慢的请求:', slowestRequest.url, slowestRequest.time, 'ms');
    }
    
    // 统计失败率
    const failCount = requestStats.filter(item => item.status === 'fail').length;
    const failRate = (failCount / requestStats.length * 100).toFixed(2);
    console.log('请求失败率:', failRate, '%');
  }
}

// 导出示例函数
module.exports = {
  initInApp,
  useInPage,
  optimizeWithPerfData
}; 