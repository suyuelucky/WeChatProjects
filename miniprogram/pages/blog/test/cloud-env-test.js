/**
 * 云环境配置测试页面
 * 创建时间：2025-04-10 22:29:58
 * 创建者：Claude助手
 */

// 导入云环境检测工具
const CloudEnvChecker = require('../utils/cloud-env-checker');

Page({
  data: {
    isChecking: false,
    checkResult: null,
    logMessages: [],
    currentEnvId: '',
    errorDetails: null,
    availableEnvironments: []
  },

  onLoad: function() {
    // 获取当前环境ID
    try {
      const currentEnvId = CloudEnvChecker.getCurrentEnvId();
      this.setData({
        currentEnvId: currentEnvId
      });
      this.addLog(`当前配置的云环境ID: ${currentEnvId}`);
    } catch (err) {
      this.addLog('获取当前环境ID失败: ' + JSON.stringify(err));
    }
    
    // 获取可用环境列表
    const app = getApp();
    if (app && app.globalData && app.globalData.availableEnvs) {
      this.setData({
        availableEnvironments: app.globalData.availableEnvs
      });
    }
  },

  // 添加日志
  addLog: function(message) {
    const timestamp = new Date().toLocaleTimeString();
    const newLog = `[${timestamp}] ${message}`;
    
    this.setData({
      logMessages: [newLog, ...this.data.logMessages].slice(0, 100) // 保留最近100条日志
    });
    
    console.log(message);
  },

  // 检测并修复云环境配置
  checkAndFixEnvironment: function() {
    this.setData({
      isChecking: true,
      checkResult: null,
      errorDetails: null
    });
    
    this.addLog('开始检测云环境配置...');
    
    CloudEnvChecker.checkAndFixEnvironment()
      .then(result => {
        this.setData({
          isChecking: false,
          checkResult: result,
          currentEnvId: result.envId
        });
        
        this.addLog(`云环境检测完成: 成功`);
        
        if (result.switched) {
          this.addLog(`已自动切换到可用的云环境: ${result.envId}`);
        } else {
          this.addLog(`当前云环境正常: ${result.envId}`);
        }
        
        // 尝试使用新环境执行云函数调用
        this.testCloudFunction();
      })
      .catch(err => {
        this.setData({
          isChecking: false,
          checkResult: {
            success: false,
            message: err.message || '检测失败'
          },
          errorDetails: err
        });
        
        this.addLog(`云环境检测失败: ${err.message || '未知错误'}`);
        console.error('云环境检测失败:', err);
      });
  },

  // 测试云函数调用
  testCloudFunction: function() {
    this.addLog('测试云函数调用...');
    
    // 使用get_openid云函数测试
    wx.cloud.callFunction({
      name: 'getOpenId',
      data: { msg: 'envTest' },
      success: res => {
        this.addLog('云函数调用成功: ' + JSON.stringify(res.result || {}));
      },
      fail: err => {
        this.addLog('云函数调用失败: ' + JSON.stringify(err));
      }
    });
  },

  // 手动切换环境
  switchEnvironment: function(e) {
    const envId = e.currentTarget.dataset.env;
    
    this.addLog(`正在手动切换到环境: ${envId}`);
    
    const result = CloudEnvChecker.switchEnvironment(envId);
    
    if (result) {
      this.setData({
        currentEnvId: envId
      });
      this.addLog(`环境切换成功: ${envId}`);
      
      // 测试新环境
      this.testCloudFunction();
    } else {
      this.addLog(`环境切换失败: ${envId}`);
    }
  },
  
  // 清空日志
  clearLogs: function() {
    this.setData({
      logMessages: []
    });
    this.addLog('日志已清空');
  },
  
  // 复制错误详情到剪贴板
  copyErrorDetails: function() {
    if (!this.data.errorDetails) {
      wx.showToast({
        title: '没有错误详情',
        icon: 'none'
      });
      return;
    }
    
    const errorText = JSON.stringify(this.data.errorDetails, null, 2);
    
    wx.setClipboardData({
      data: errorText,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  }
}); 