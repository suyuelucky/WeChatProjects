/**
 * 数据同步框架集成测试套件
 * 测试SyncService、SyncAdapter和SyncScheduler三个组件之间的协作
 * 
 * 创建时间: 2025年4月9日 10时03分12秒 CST
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
const SyncService = require('../../services/syncService.js');
const SyncAdapter = require('../../services/SyncAdapter.js');
const SyncScheduler = require('../../services/SyncScheduler.js');

describe('同步框架集成测试', function() {
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
  
  describe('组件初始化与注册', function() {
    test('应正确初始化全部组件并注册依赖', function() {
      // 初始化SyncAdapter
      const localAdapter = SyncAdapter.create();
      localAdapter.init({
        type: 'local',
        config: {}
      });
      
      const cloudAdapter = SyncAdapter.create();
      cloudAdapter.init({
        type: 'cloud',
        config: {}
      });
      
      // 注册适配器
      mockContainer.register('localAdapter', localAdapter);
      mockContainer.register('cloudAdapter', cloudAdapter);
      
      // 初始化SyncService
      SyncService.init(mockContainer);
      
      // 注册同步服务
      mockContainer.register('syncService', SyncService);
      
      // 初始化SyncScheduler
      const scheduler = SyncScheduler.init({
        syncService: SyncService,
        config: {
          maxConcurrent: 3,
          retryLimit: 3,
          retryDelay: 1000
        }
      });
      
      // 注册调度器
      mockContainer.register('syncScheduler', scheduler);
      
      // 验证组件是否正确初始化
      expect(localAdapter).toBeDefined();
      expect(cloudAdapter).toBeDefined();
      expect(SyncService).toBeDefined();
      expect(scheduler).toBeDefined();
      
      // 验证依赖注册
      expect(mockContainer.get('localAdapter')).toBe(localAdapter);
      expect(mockContainer.get('cloudAdapter')).toBe(cloudAdapter);
      expect(mockContainer.get('syncService')).toBe(SyncService);
      expect(mockContainer.get('syncScheduler')).toBe(scheduler);
    });
  });
  
  describe('基本同步流程', function() {
    let localAdapter, cloudAdapter, scheduler;
    
    beforeEach(function() {
      // 初始化组件
      localAdapter = SyncAdapter.create();
      localAdapter.init({
        type: 'local',
        config: {}
      });
      
      cloudAdapter = SyncAdapter.create();
      cloudAdapter.init({
        type: 'cloud',
        config: {}
      });
      
      // 注册适配器
      mockContainer.register('localAdapter', localAdapter);
      mockContainer.register('cloudAdapter', cloudAdapter);
      
      // 初始化SyncService
      SyncService.init(mockContainer);
      
      // 注册同步服务
      mockContainer.register('syncService', SyncService);
      
      // 初始化SyncScheduler
      scheduler = SyncScheduler.init({
        syncService: SyncService,
        config: {
          maxConcurrent: 3,
          retryLimit: 3,
          retryDelay: 1000
        }
      });
      
      // 注册调度器
      mockContainer.register('syncScheduler', scheduler);
    });
    
    test('应能通过SyncService添加数据并同步', function() {
      // 添加测试数据
      return SyncService.addToSyncQueue('test', '1', { name: 'Test Item' })
        .then(function(task) {
          expect(task).toBeDefined();
          expect(task.collection).toBe('test');
          expect(task.itemId).toBe('1');
          expect(task.data).toEqual({ name: 'Test Item' });
          
          // 验证队列长度
          expect(SyncService.syncStatus.queue.length).toBe(1);
          
          // 执行同步
          return SyncService.processSyncQueue();
        })
        .then(function(results) {
          expect(results.length).toBe(1);
          expect(results[0].success).toBe(true);
          
          // 验证同步状态
          expect(SyncService.syncStatus.inProgress).toBe(false);
          expect(SyncService.syncStatus.lastSync).not.toBeNull();
          
          // 查询本地存储确认数据存在
          return mockStorageService.getItem('test', '1');
        })
        .then(function(item) {
          expect(item).toBeDefined();
          expect(item.syncStatus).toBe('synced');
        });
    });
    
    test('应能通过调度器调度同步任务', function() {
      // 添加任务到调度器
      return scheduler.addTask({
        id: 'task_1',
        collection: 'test',
        itemId: '2',
        data: { name: 'Scheduled Item' },
        priority: 5
      })
      .then(function(task) {
        expect(task).toBeDefined();
        expect(task.id).toBe('task_1');
        expect(task.status).toBe('pending');
        
        // 启动调度器
        return scheduler.start();
      })
      .then(function() {
        expect(scheduler.status.isRunning).toBe(true);
        
        // 等待调度器执行任务
        return new Promise(function(resolve) {
          setTimeout(resolve, 100);
        });
      })
      .then(function() {
        // 验证任务状态
        return scheduler.getTaskStatus('task_1');
      })
      .then(function(status) {
        // 在实际环境可能为done，但在测试环境中可能仍在执行中
        expect(['done', 'syncing'].indexOf(status.status) >= 0).toBe(true);
        
        // 停止调度器
        return scheduler.stop();
      })
      .then(function() {
        expect(scheduler.status.isRunning).toBe(false);
      });
    });
  });
  
  describe('错误处理与恢复', function() {
    let localAdapter, cloudAdapter, scheduler;
    
    beforeEach(function() {
      // 初始化组件
      localAdapter = SyncAdapter.create();
      localAdapter.init({
        type: 'local',
        config: {}
      });
      
      cloudAdapter = SyncAdapter.create();
      cloudAdapter.init({
        type: 'cloud',
        config: {}
      });
      
      // 注册适配器
      mockContainer.register('localAdapter', localAdapter);
      mockContainer.register('cloudAdapter', cloudAdapter);
      
      // 初始化SyncService
      SyncService.init(mockContainer);
      
      // 注册同步服务
      mockContainer.register('syncService', SyncService);
      
      // 初始化SyncScheduler
      scheduler = SyncScheduler.init({
        syncService: SyncService,
        config: {
          maxConcurrent: 3,
          retryLimit: 3,
          retryDelay: 1000
        }
      });
      
      // 注册调度器
      mockContainer.register('syncScheduler', scheduler);
    });
    
    test('应能正确处理同步错误并重试', function() {
      // 修改SyncService.processTask以模拟错误
      const originalProcessTask = SyncService.processTask;
      SyncService.processTask = jest.fn().mockImplementationOnce(function() {
        return Promise.reject(new Error('模拟同步错误'));
      }).mockImplementation(originalProcessTask);
      
      // 添加测试数据
      return SyncService.addToSyncQueue('test', '3', { name: 'Error Test Item' })
        .then(function(task) {
          // 执行同步，预期失败
          return SyncService.processSyncQueue()
            .then(function() {
              fail('应该抛出错误');
            })
            .catch(function(error) {
              expect(error).toBeDefined();
              expect(error.message).toBe('模拟同步错误');
              
              // 验证事件触发
              expect(MockEventBus.events['sync:failed']).toBeDefined();
              
              // 恢复原始方法
              SyncService.processTask = originalProcessTask;
              
              // 重新执行同步，应该成功
              return SyncService.processSyncQueue();
            });
        })
        .then(function(results) {
          expect(results.length).toBe(1);
          expect(results[0].success).toBe(true);
        });
    });
    
    test('调度器应能处理网络状态变化', function() {
      // 模拟网络状态变化
      const pause = jest.spyOn(scheduler, 'pause');
      const resume = jest.spyOn(scheduler, 'resume');
      
      // 启动调度器
      return scheduler.start()
        .then(function() {
          expect(scheduler.status.isRunning).toBe(true);
          
          // 模拟网络断开
          MockEventBus.emit('network:status:changed', {
            isConnected: false,
            wasConnected: true,
            networkType: 'none'
          });
          
          // 验证调度器暂停
          expect(pause).toHaveBeenCalled();
          expect(scheduler.status.isPaused).toBe(true);
          
          // 模拟网络恢复
          MockEventBus.emit('network:status:changed', {
            isConnected: true,
            wasConnected: false,
            networkType: 'wifi'
          });
          
          // 验证调度器恢复
          expect(resume).toHaveBeenCalled();
          expect(scheduler.status.isPaused).toBe(false);
          
          // 停止调度器
          return scheduler.stop();
        });
    });
  });
  
  describe('策略适应与优化', function() {
    let scheduler;
    
    beforeEach(function() {
      // 初始化组件
      const localAdapter = SyncAdapter.create();
      localAdapter.init({
        type: 'local',
        config: {}
      });
      
      const cloudAdapter = SyncAdapter.create();
      cloudAdapter.init({
        type: 'cloud',
        config: {}
      });
      
      // 注册适配器
      mockContainer.register('localAdapter', localAdapter);
      mockContainer.register('cloudAdapter', cloudAdapter);
      
      // 初始化SyncService
      SyncService.init(mockContainer);
      
      // 注册同步服务
      mockContainer.register('syncService', SyncService);
      
      // 初始化SyncScheduler
      scheduler = SyncScheduler.init({
        syncService: SyncService,
        config: {
          maxConcurrent: 3,
          retryLimit: 3,
          retryDelay: 1000,
          networkAware: true
        }
      });
      
      // 注册调度器
      mockContainer.register('syncScheduler', scheduler);
    });
    
    test('应能根据网络类型选择最佳同步策略', function() {
      // 启动调度器
      return scheduler.start()
        .then(function() {
          expect(scheduler.status.isRunning).toBe(true);
          
          // 获取当前策略
          const defaultStrategy = scheduler.getStrategy();
          expect(defaultStrategy.name).toBe('default');
          
          // 模拟网络变化为4G
          MockEventBus.emit('network:status:changed', {
            isConnected: true,
            wasConnected: true,
            networkType: '4g'
          });
          
          // 验证策略变更为网络感知
          const newStrategy = scheduler.getStrategy();
          expect(newStrategy.name).toBe('network-aware');
          
          // 模拟电量不足情况
          return scheduler.setStrategy('power-saving');
        })
        .then(function() {
          // 验证策略变更为节能模式
          const powerSavingStrategy = scheduler.getStrategy();
          expect(powerSavingStrategy.name).toBe('power-saving');
          expect(powerSavingStrategy.maxConcurrent).toBeLessThan(scheduler.config.maxConcurrent);
          
          // 停止调度器
          return scheduler.stop();
        });
    });
  });
}); 