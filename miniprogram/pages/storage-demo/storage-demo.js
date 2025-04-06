/**
 * 本地存储管理系统示例页面
 * 展示存储管理系统的基本用法与功能演示
 */

// 引入存储相关服务和工具
var storageService = require('../../services/storageService').getStorageServiceInstance();
var dataManager = require('../../utils/storageDataManager').dataManager;
var storageManager = require('../../utils/storageManager').getStorageManagerInstance();
var offlineSync = require('../../utils/offlineStorageSync').getOfflineSyncInstance();
var eventBus = require('../../utils/eventBus');

Page({
  data: {
    isInitialized: false,
    isOnline: true,
    storageInfo: null,
    testData: null,
    syncStatus: 'idle',
    syncQueue: 0,
    syncResults: [],
    logs: [],
    showDebug: false,
    activeTab: 'basic',  // basic, sync, manage, debug
    collections: [
      { id: 'user', name: '用户数据' },
      { id: 'work', name: '工作数据' },
      { id: 'settings', name: '设置' },
      { id: 'media', name: '媒体' },
      { id: 'temp', name: '临时数据' }
    ],
    selectedCollection: 'work',
    testKey: '',
    testValue: ''
  },

  onLoad: function() {
    this.initEvents();
    this.refreshStorageInfo();
    
    // 检查网络状态
    wx.getNetworkType({
      success: res => {
        this.setData({
          isOnline: res.networkType !== 'none'
        });
      }
    });
    
    // 初始化标记
    this.setData({
      isInitialized: true,
      testKey: 'test_item_' + Date.now()
    });
    
    // 加载当前同步状态
    var status = offlineSync.getSyncStatus();
    this.setData({
      syncStatus: status.status,
      syncQueue: status.queueSize
    });
    
    this.addLog('页面加载完成');
  },
  
  onUnload: function() {
    this.removeEvents();
  },
  
  // 初始化事件监听
  initEvents: function() {
    // 监听存储变更事件
    eventBus.on('storage:dataChanged', this.handleDataChanged.bind(this));
    
    // 监听同步事件
    eventBus.on('offlineSync:syncStarted', this.handleSyncStarted.bind(this));
    eventBus.on('offlineSync:syncCompleted', this.handleSyncCompleted.bind(this));
    eventBus.on('offlineSync:syncError', this.handleSyncError.bind(this));
    
    // 监听存储清理事件
    eventBus.on('storage:storageCleanup', this.handleStorageCleanup.bind(this));
    
    // 监听网络变化
    wx.onNetworkStatusChange(res => {
      this.setData({
        isOnline: res.isConnected
      });
      this.addLog('网络状态变化: ' + (res.isConnected ? '在线' : '离线'));
    });
  },
  
  // 移除事件监听
  removeEvents: function() {
    eventBus.off('storage:dataChanged');
    eventBus.off('offlineSync:syncStarted');
    eventBus.off('offlineSync:syncCompleted');
    eventBus.off('offlineSync:syncError');
    eventBus.off('storage:storageCleanup');
  },
  
  // 刷新存储信息
  refreshStorageInfo: function() {
    storageManager.getStorageSummary().then(info => {
      this.setData({
        storageInfo: info
      });
    });
  },
  
  // 存储数据变更处理
  handleDataChanged: function(data) {
    this.addLog('数据变更: ' + data.type + ' | ' + data.collection + ' | ' + data.key);
    this.refreshStorageInfo();
  },
  
  // 同步开始处理
  handleSyncStarted: function(data) {
    this.setData({
      syncStatus: 'syncing'
    });
    this.addLog('同步开始: ' + data.queueSize + '项等待同步');
  },
  
  // 同步完成处理
  handleSyncCompleted: function(data) {
    this.setData({
      syncStatus: 'idle',
      syncQueue: offlineSync.getSyncStatus().queueSize
    });
    this.addLog('同步完成: 成功' + data.successful + '项, 失败' + data.failed + '项');
    this.refreshStorageInfo();
  },
  
  // 同步错误处理
  handleSyncError: function(data) {
    this.setData({
      syncStatus: 'error'
    });
    this.addLog('同步错误: ' + (data.error ? data.error.message : '未知错误'));
  },
  
  // 存储清理处理
  handleStorageCleanup: function(data) {
    this.addLog('存储清理: 释放了 ' + this.formatFileSize(data.cleanedSize) + ' 空间');
    this.refreshStorageInfo();
  },
  
  // 添加日志
  addLog: function(message) {
    var time = new Date().toLocaleTimeString();
    var logs = this.data.logs.slice();
    logs.unshift('[' + time + '] ' + message);
    
    // 保持日志不超过50条
    if (logs.length > 50) {
      logs = logs.slice(0, 50);
    }
    
    this.setData({
      logs: logs
    });
  },
  
  // 切换选项卡
  switchTab: function(e) {
    var tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
    
    if (tab === 'manage') {
      this.refreshStorageInfo();
    } else if (tab === 'sync') {
      var status = offlineSync.getSyncStatus();
      this.setData({
        syncStatus: status.status,
        syncQueue: status.queueSize
      });
    }
  },
  
  // 存储测试数据
  handleSaveData: function() {
    var collection = this.data.selectedCollection;
    var key = this.data.testKey;
    var value = this.data.testValue || '测试数据 ' + new Date().toLocaleString();
    
    storageService.saveData(collection, key, value).then(() => {
      this.addLog('保存成功: ' + collection + ' | ' + key);
      
      // 加载保存的数据
      this.handleLoadData();
    }).catch(error => {
      this.addLog('保存失败: ' + error.message);
    });
  },
  
  // 读取测试数据
  handleLoadData: function() {
    var collection = this.data.selectedCollection;
    var key = this.data.testKey;
    
    storageService.getData(collection, key, null).then(data => {
      this.setData({
        testData: data
      });
      this.addLog('读取成功: ' + collection + ' | ' + key);
    }).catch(error => {
      this.addLog('读取失败: ' + error.message);
    });
  },
  
  // 删除测试数据
  handleRemoveData: function() {
    var collection = this.data.selectedCollection;
    var key = this.data.testKey;
    
    storageService.removeData(collection, key).then(() => {
      this.setData({
        testData: null
      });
      this.addLog('删除成功: ' + collection + ' | ' + key);
    }).catch(error => {
      this.addLog('删除失败: ' + error.message);
    });
  },
  
  // 清理集合
  handleClearCollection: function() {
    var collection = this.data.selectedCollection;
    
    wx.showModal({
      title: '确认清理',
      content: '确定要清理 ' + collection + ' 集合中的所有数据吗？',
      success: res => {
        if (res.confirm) {
          storageService.clearCollection(collection).then(() => {
            this.setData({
              testData: null
            });
            this.addLog('清理集合成功: ' + collection);
            this.refreshStorageInfo();
          }).catch(error => {
            this.addLog('清理集合失败: ' + error.message);
          });
        }
      }
    });
  },
  
  // 触发同步
  handleStartSync: function() {
    storageService.syncData().then(result => {
      if (!result) {
        this.addLog('没有需要同步的数据');
      }
    }).catch(error => {
      this.addLog('触发同步失败: ' + error.message);
    });
  },
  
  // 触发存储空间清理
  handleCleanStorage: function() {
    storageManager.cleanupStorage(true).then(freedSpace => {
      this.addLog('手动清理存储空间: 释放了 ' + this.formatFileSize(freedSpace) + ' 空间');
      this.refreshStorageInfo();
    }).catch(error => {
      this.addLog('清理存储空间失败: ' + error.message);
    });
  },
  
  // 格式化文件大小
  formatFileSize: function(size) {
    if (size < 1024) {
      return size + ' 字节';
    } else if (size < 1024 * 1024) {
      return (size / 1024).toFixed(2) + ' KB';
    } else {
      return (size / (1024 * 1024)).toFixed(2) + ' MB';
    }
  },
  
  // 测试数据类型管理
  handleTestDataTypes: function() {
    // 保存不同类型的数据
    Promise.all([
      dataManager.saveCore('test_core', { name: '核心数据测试' }),
      dataManager.saveUser('test_user', { name: '用户数据测试' }),
      dataManager.saveWork('test_work', { name: '工作数据测试' }),
      dataManager.saveCache('test_cache', { name: '缓存数据测试' }),
      dataManager.saveTemp('test_temp', { name: '临时数据测试' })
    ]).then(() => {
      this.addLog('测试数据类型: 保存成功');
      this.refreshStorageInfo();
    });
  },
  
  // 测试离线同步
  handleTestOfflineSync: function() {
    // 模拟添加离线同步项
    var testData = {
      key: 'offline_test_' + Date.now(),
      data: {
        data: '离线同步测试数据 ' + new Date().toLocaleString(),
        metadata: {
          collection: 'work',
          key: 'offline_test',
          updatedAt: Date.now()
        }
      }
    };
    
    // 添加到同步队列
    offlineSync.addToSyncQueue('work', 'update', testData, {
      priority: offlineSync.SyncPriority.NORMAL
    }).then(operationId => {
      this.addLog('添加同步项成功: ' + operationId);
      
      // 更新同步状态
      var status = offlineSync.getSyncStatus();
      this.setData({
        syncStatus: status.status,
        syncQueue: status.queueSize
      });
    }).catch(error => {
      this.addLog('添加同步项失败: ' + error.message);
    });
  },
  
  // 清空测试数据
  handleClearTestData: function() {
    // 清除所有测试数据
    Promise.all([
      dataManager.removeByPrefix('core_test_'),
      dataManager.removeByPrefix('user_test_'),
      dataManager.removeByPrefix('work_test_'),
      dataManager.clearCache(),
      dataManager.clearTemp()
    ]).then(() => {
      this.addLog('清除测试数据成功');
      this.refreshStorageInfo();
    });
  },
  
  // 处理集合变更
  handleCollectionChange: function(e) {
    this.setData({
      selectedCollection: e.detail.value
    });
  },
  
  // 处理测试键变更
  handleKeyChange: function(e) {
    this.setData({
      testKey: e.detail.value
    });
  },
  
  // 处理测试值变更
  handleValueChange: function(e) {
    this.setData({
      testValue: e.detail.value
    });
  },
  
  // 切换调试信息
  toggleDebug: function() {
    this.setData({
      showDebug: !this.data.showDebug
    });
  },
  
  // 清空日志
  clearLogs: function() {
    this.setData({
      logs: []
    });
  }
}); 