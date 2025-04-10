/**
 * SyncManager 测试套件
 * 测试SyncManager组件的功能
 * 
 * 创建时间: 2025年4月9日 10时14分36秒 CST
 * 创建者: Claude 3.7 Sonnet
 */

'use strict';

// 模拟事件总线
const MockEventBus = {
  events: {},
  on: function(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    return this;
  },
  off: function(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(function(cb) {
        return cb !== callback;
      });
    }
    return this;
  },
  emit: function(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(function(callback) {
        callback(data);
      });
    }
  },
  clear: function() {
    this.events = {};
  }
};

// 模拟wx API
const mockWx = {
  storage: {},
  getStorageSync: function(key) {
    return this.storage[key];
  },
  setStorageSync: function(key, data) {
    this.storage[key] = data;
  },
  removeStorageSync: function(key) {
    delete this.storage[key];
  },
  getNetworkType: function(options) {
    setTimeout(function() {
      options.success({
        networkType: 'wifi'
      });
    }, 0);
  },
  clear: function() {
    this.storage = {};
  },
  cloud: {
    callFunction: jest.fn().mockImplementation(function(options) {
      const { name, data } = options;
      if (name === 'dataSync') {
        if (data.action === 'get') {
          return Promise.resolve({
            result: {
              success: true,
              data: { id: data.key, value: 'mock data' }
            }
          });
        } else if (data.action === 'set') {
          return Promise.resolve({
            result: {
              success: true
            }
          });
        } else if (data.action === 'remove') {
          return Promise.resolve({
            result: {
              success: true
            }
          });
        } else if (data.action === 'query') {
          return Promise.resolve({
            result: {
              success: true,
              data: [{ id: '1', value: 'mock data 1' }, { id: '2', value: 'mock data 2' }]
            }
          });
        }
      }
      return Promise.resolve({ result: { success: false } });
    })
  }
};

// 模拟依赖容器
const mockContainer = {
  services: {},
  register: function(name, service) {
    this.services[name] = service;
    return this;
  },
  get: function(name) {
    return this.services[name];
  }
};

// 模拟本地存储服务
const mockStorageService = {
  items: {},
  getItem: function(collection, id) {
    const key = collection + '/' + id;
    return Promise.resolve(this.items[key] || null);
  },
  saveItem: function(collection, id, item) {
    const key = collection + '/' + id;
    this.items[key] = item;
    return Promise.resolve(item);
  },
  removeItem: function(collection, id) {
    const key = collection + '/' + id;
    delete this.items[key];
    return Promise.resolve(true);
  },
  query: function(collection) {
    const results = [];
    for (const key in this.items) {
      if (key.startsWith(collection + '/')) {
        results.push(this.items[key]);
      }
    }
    return Promise.resolve(results);
  },
  clear: function() {
    this.items = {};
  }
};

// 设置全局对象
global.wx = mockWx;

// 导入被测组件
jest.mock('../../utils/eventBus.js', () => MockEventBus);
const SyncManager = require('../../services/SyncManager.js');

describe('SyncManager', function() {
  beforeEach(function() {
    // 重置所有模拟
    MockEventBus.clear();
    mockWx.clear();
    mockStorageService.clear();
    
    // 注册服务
    mockContainer.register('storageService', mockStorageService);
    
    // 重置组件
    jest.clearAllMocks();
  });
  
  describe('初始化', function() {
    test('应正确初始化所有组件', function() {
      // 初始化SyncManager
      const manager = SyncManager.init({
        container: mockContainer,
        config: {
          appId: 'test-app',
          autoStart: false,
          collections: ['users', 'tasks', 'settings'],
          maxConcurrent: 2,
          retryLimit: 2,
          retryDelay: 1000
        }
      });
      
      // 验证组件是否正确初始化
      expect(manager).toBeDefined();
      expect(manager.syncService).toBeDefined();
      expect(manager.localAdapter).toBeDefined();
      expect(manager.cloudAdapter).toBeDefined();
      expect(manager.scheduler).toBeDefined();
      
      // 验证依赖注册
      expect(mockContainer.get('localAdapter')).toBe(manager.localAdapter);
      expect(mockContainer.get('cloudAdapter')).toBe(manager.cloudAdapter);
      expect(mockContainer.get('syncService')).toBe(manager.syncService);
      expect(mockContainer.get('syncScheduler')).toBe(manager.scheduler);
    });
  });
  
  describe('数据操作', function() {
    let manager;
    
    beforeEach(function() {
      // 初始化SyncManager
      manager = SyncManager.init({
        container: mockContainer,
        config: {
          appId: 'test-app',
          autoStart: false
        }
      });
    });
    
    test('应能保存数据并添加同步任务', function() {
      // 保存数据，并同步到云端
      return manager.saveData('users', '1', { name: 'Test User', email: 'test@example.com' }, { sync: true })
        .then(function(savedData) {
          expect(savedData).toBeDefined();
          expect(savedData.name).toBe('Test User');
          expect(savedData._meta).toBeDefined();
          expect(savedData._meta.localModified).toBe(true);
          
          // 获取同步任务状态
          const syncStatus = manager.getSyncStatus();
          expect(syncStatus.scheduler.taskCount).toBeGreaterThan(0);
          
          // 获取数据
          return manager.getData('users', '1');
        })
        .then(function(data) {
          expect(data).toBeDefined();
          expect(data.name).toBe('Test User');
          expect(data.email).toBe('test@example.com');
        });
    });
    
    test('应能删除数据', function() {
      // 先保存一些数据
      return manager.saveData('users', '2', { name: 'Delete Test', email: 'delete@example.com' })
        .then(function() {
          // 确认数据存在
          return manager.getData('users', '2');
        })
        .then(function(data) {
          expect(data).toBeDefined();
          expect(data.name).toBe('Delete Test');
          
          // 删除数据
          return manager.removeData('users', '2', { sync: true, softDelete: true });
        })
        .then(function(result) {
          expect(result).toBe(true);
          
          // 获取同步任务状态
          const syncStatus = manager.getSyncStatus();
          expect(syncStatus.scheduler.taskCount).toBeGreaterThan(0);
          
          // 验证数据已被标记为已删除
          return manager.getData('users', '2');
        })
        .then(function(data) {
          expect(data).toBeDefined();
          expect(data._meta).toBeDefined();
          expect(data._meta.deleted).toBe(true);
        });
    });
  });
  
  describe('同步操作', function() {
    let manager;
    
    beforeEach(function() {
      // 初始化SyncManager
      manager = SyncManager.init({
        container: mockContainer,
        config: {
          appId: 'test-app',
          autoStart: false
        }
      });
      
      // 添加测试数据
      return Promise.all([
        manager.saveData('users', '3', { name: 'Sync Test', email: 'sync@example.com' }),
        manager.saveData('tasks', '1', { title: 'Test Task', completed: false })
      ]);
    });
    
    test('应能启动和停止同步服务', function() {
      // 启动同步服务
      return manager.start()
        .then(function(result) {
          expect(result.success).toBe(true);
          expect(manager.scheduler.status.isRunning).toBe(true);
          
          // 停止同步服务
          return manager.stop();
        })
        .then(function(result) {
          expect(result.success).toBe(true);
          expect(manager.scheduler.status.isRunning).toBe(false);
        });
    });
    
    test('应能执行同步操作', function() {
      // 执行同步
      return manager.sync({
        collections: ['users', 'tasks'],
        force: true
      })
      .then(function(result) {
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        
        // 验证同步状态
        const syncStatus = manager.getSyncStatus();
        expect(syncStatus.service.lastSync).not.toBeNull();
      });
    });
    
    test('应能添加同步任务', function() {
      // 添加同步任务
      return manager.addSyncTask('users', '3', { name: 'Updated Name' }, { priority: 8 })
        .then(function(task) {
          expect(task).toBeDefined();
          expect(task.collection).toBe('users');
          expect(task.itemId).toBe('3');
          expect(task.priority).toBe(8);
          expect(task.status).toBe('pending');
          
          // 验证任务计数
          const syncStatus = manager.getSyncStatus();
          expect(syncStatus.scheduler.taskCount).toBeGreaterThan(0);
        });
    });
  });
  
  describe('事件处理', function() {
    let manager;
    
    beforeEach(function() {
      // 初始化SyncManager
      manager = SyncManager.init({
        container: mockContainer,
        config: {
          appId: 'test-app',
          autoStart: false
        }
      });
    });
    
    test('应正确处理同步完成事件', function() {
      // 监听管理器事件
      let eventFired = false;
      let eventData = null;
      
      MockEventBus.on('syncManager:sync:completed', function(data) {
        eventFired = true;
        eventData = data;
      });
      
      // 触发原始事件
      const timestamp = new Date().toISOString();
      MockEventBus.emit('sync:completed', {
        results: [{ success: true }],
        timestamp: timestamp
      });
      
      // 验证事件转发
      expect(eventFired).toBe(true);
      expect(eventData).toBeDefined();
      expect(eventData.timestamp).toBe(timestamp);
    });
    
    test('应正确处理网络状态变化事件', function() {
      // 监听管理器事件
      let eventFired = false;
      let eventData = null;
      
      MockEventBus.on('syncManager:network:changed', function(data) {
        eventFired = true;
        eventData = data;
      });
      
      // 触发原始事件
      MockEventBus.emit('network:status:changed', {
        isConnected: true,
        networkType: '4g'
      });
      
      // 验证事件转发
      expect(eventFired).toBe(true);
      expect(eventData).toBeDefined();
      expect(eventData.isConnected).toBe(true);
      expect(eventData.networkType).toBe('4g');
    });
  });
  
  describe('监控与日志', function() {
    let manager;
    
    beforeEach(function() {
      // 初始化SyncManager
      manager = SyncManager.init({
        container: mockContainer,
        config: {
          appId: 'test-app',
          autoStart: false
        }
      });
    });
    
    test('应能获取监控指标', function() {
      // 获取监控指标
      const metrics = manager.getMonitorMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.syncCount).toBeDefined();
      expect(metrics.successCount).toBeDefined();
      expect(metrics.failCount).toBeDefined();
    });
    
    test('应能获取日志', function() {
      // 获取日志
      const logs = manager.getLogs();
      
      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
    });
    
    test('应能设置调度策略', function() {
      // 设置调度策略
      return manager.setStrategy('power-saving')
        .then(function(result) {
          expect(result).toBe(true);
          
          const strategy = manager.scheduler.getStrategy();
          expect(strategy.name).toBe('power-saving');
        });
    });
  });
}); 