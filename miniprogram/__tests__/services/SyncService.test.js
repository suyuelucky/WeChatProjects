/**
 * SyncService 测试套件
 * 创建时间: 2025年4月9日 08时45分58秒 CST
 * 创建者: Claude 3.7 Sonnet
 */

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

// 模拟依赖
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

// 模拟存储服务
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
  query: function(collection, query) {
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

// 模拟网络状态
const mockNetworkState = {
  isConnected: true,
  type: 'wifi'
};

// 模拟 wx API
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
        networkType: mockNetworkState.isConnected ? mockNetworkState.type : 'none'
      });
    }, 0);
  },
  clear: function() {
    this.storage = {};
  }
};

// 模拟全局对象
global.wx = mockWx;

// 导入被测组件
const SyncService = require('../../services/syncService.js');

// 模拟 EventBus
jest.mock('../../utils/eventBus.js', () => MockEventBus);

describe('SyncService', function() {
  
  beforeEach(function() {
    // 重置所有模拟
    MockEventBus.clear();
    mockStorageService.clear();
    mockWx.clear();
    
    // 注册服务
    mockContainer.register('storageService', mockStorageService);
    
    // 初始化服务
    SyncService.init(mockContainer);
  });
  
  describe('初始化', function() {
    test('应正确初始化服务', function() {
      expect(SyncService).toBeDefined();
      expect(SyncService.container).toBe(mockContainer);
      expect(SyncService.syncStatus).toBeDefined();
      expect(SyncService.syncStatus.inProgress).toBe(false);
      expect(SyncService.syncStatus.lastSync).toBeNull();
      expect(Array.isArray(SyncService.syncStatus.queue)).toBe(true);
    });
    
    test('应从本地存储恢复同步队列', function() {
      // 设置模拟存储数据
      const mockQueue = [
        {
          id: 'sync_1',
          collection: 'test',
          itemId: '1',
          data: { name: 'Test 1' },
          status: 'pending'
        }
      ];
      mockWx.setStorageSync('syncQueue', mockQueue);
      
      // 重新初始化
      SyncService.init(mockContainer);
      
      // 验证
      expect(SyncService.syncStatus.queue).toEqual(mockQueue);
    });
    
    test('应注册网络状态变化监听', function() {
      expect(MockEventBus.events['network:status:changed']).toBeDefined();
      expect(MockEventBus.events['network:status:changed'].length).toBe(1);
    });
  });
  
  describe('添加同步任务', function() {
    test('应成功添加任务到同步队列', function() {
      return SyncService.addToSyncQueue('test', '1', { name: 'Test 1' })
        .then(function(task) {
          expect(task).toBeDefined();
          expect(task.collection).toBe('test');
          expect(task.itemId).toBe('1');
          expect(task.data).toEqual({ name: 'Test 1' });
          expect(task.status).toBe('pending');
          
          // 验证队列
          expect(SyncService.syncStatus.queue.length).toBe(1);
          expect(SyncService.syncStatus.queue[0]).toEqual(task);
          
          // 验证存储
          expect(mockWx.storage.syncQueue).toBeDefined();
          expect(mockWx.storage.syncQueue.length).toBe(1);
        });
    });
    
    test('应触发同步队列更新事件', function() {
      // 注册事件监听
      let eventFired = false;
      let eventData = null;
      
      MockEventBus.on('sync:queue:updated', function(data) {
        eventFired = true;
        eventData = data;
      });
      
      return SyncService.addToSyncQueue('test', '1', { name: 'Test 1' })
        .then(function(task) {
          expect(eventFired).toBe(true);
          expect(eventData).toBeDefined();
          expect(eventData.queue).toEqual(SyncService.syncStatus.queue);
          expect(eventData.task).toEqual(task);
        });
    });
    
    test('在有网络时应尝试处理同步队列', function() {
      // 模拟 processSyncQueue
      const originalProcessSyncQueue = SyncService.processSyncQueue;
      SyncService.processSyncQueue = jest.fn().mockReturnValue(Promise.resolve([]));
      
      // 设置有网络
      mockNetworkState.isConnected = true;
      
      return SyncService.addToSyncQueue('test', '1', { name: 'Test 1' })
        .then(function() {
          expect(SyncService.processSyncQueue).toHaveBeenCalled();
          
          // 恢复原始方法
          SyncService.processSyncQueue = originalProcessSyncQueue;
        });
    });
    
    test('在无网络时不应尝试处理同步队列', function() {
      // 模拟 processSyncQueue
      const originalProcessSyncQueue = SyncService.processSyncQueue;
      SyncService.processSyncQueue = jest.fn().mockReturnValue(Promise.resolve([]));
      
      // 模拟网络状态
      const originalGetNetworkState = SyncService.getNetworkState;
      SyncService.getNetworkState = jest.fn().mockReturnValue(false);
      
      return SyncService.addToSyncQueue('test', '1', { name: 'Test 1' })
        .then(function() {
          expect(SyncService.processSyncQueue).not.toHaveBeenCalled();
          
          // 恢复原始方法
          SyncService.processSyncQueue = originalProcessSyncQueue;
          SyncService.getNetworkState = originalGetNetworkState;
        });
    });
    
    test('应处理添加任务时的错误', function() {
      // 模拟 saveSyncQueue 抛出错误
      const originalSaveSyncQueue = SyncService.saveSyncQueue;
      SyncService.saveSyncQueue = jest.fn().mockImplementation(function() {
        throw new Error('保存失败');
      });
      
      return SyncService.addToSyncQueue('test', '1', { name: 'Test 1' })
        .then(function() {
          fail('应该抛出错误');
        })
        .catch(function(error) {
          expect(error).toBeDefined();
          expect(error.message).toBe('保存失败');
          
          // 恢复原始方法
          SyncService.saveSyncQueue = originalSaveSyncQueue;
        });
    });
  });
  
  describe('处理同步队列', function() {
    test('无网络时不应处理队列', function() {
      // 添加任务
      SyncService.syncStatus.queue.push({
        id: 'sync_1',
        collection: 'test',
        itemId: '1',
        data: { name: 'Test 1' },
        status: 'pending'
      });
      
      // 模拟网络状态
      const originalGetNetworkState = SyncService.getNetworkState;
      SyncService.getNetworkState = jest.fn().mockReturnValue(false);
      
      return SyncService.processSyncQueue()
        .then(function(results) {
          expect(results).toEqual([]);
          expect(SyncService.syncStatus.inProgress).toBe(false);
          
          // 恢复原始方法
          SyncService.getNetworkState = originalGetNetworkState;
        });
    });
    
    test('同步进行中不应重复处理队列', function() {
      // 添加任务
      SyncService.syncStatus.queue.push({
        id: 'sync_1',
        collection: 'test',
        itemId: '1',
        data: { name: 'Test 1' },
        status: 'pending'
      });
      
      // 模拟同步进行中
      SyncService.syncStatus.inProgress = true;
      
      return SyncService.processSyncQueue()
        .then(function(results) {
          expect(results).toEqual([]);
          expect(SyncService.syncStatus.inProgress).toBe(true);
        });
    });
    
    test('空队列时应直接返回', function() {
      // 确保队列为空
      SyncService.syncStatus.queue = [];
      
      return SyncService.processSyncQueue()
        .then(function(results) {
          expect(results).toEqual([]);
          expect(SyncService.syncStatus.inProgress).toBe(false);
        });
    });
    
    test('应正确处理队列中的任务', function() {
      // 添加任务
      SyncService.syncStatus.queue.push({
        id: 'sync_1',
        collection: 'test',
        itemId: '1',
        data: { name: 'Test 1' },
        status: 'pending'
      });
      
      // 模拟 processTask
      const originalProcessTask = SyncService.processTask;
      SyncService.processTask = jest.fn().mockImplementation(function(task) {
        return Promise.resolve({
          task: task,
          success: true
        });
      });
      
      return SyncService.processSyncQueue()
        .then(function(results) {
          expect(results).toBeDefined();
          expect(results.length).toBe(1);
          expect(results[0].task.id).toBe('sync_1');
          expect(results[0].success).toBe(true);
          
          // 验证状态更新
          expect(SyncService.syncStatus.inProgress).toBe(false);
          expect(SyncService.syncStatus.lastSync).not.toBeNull();
          
          // 验证事件触发
          expect(MockEventBus.events['sync:completed']).toBeDefined();
          
          // 恢复原始方法
          SyncService.processTask = originalProcessTask;
        });
    });
    
    test('应处理同步过程中的错误', function() {
      // 添加任务
      SyncService.syncStatus.queue.push({
        id: 'sync_1',
        collection: 'test',
        itemId: '1',
        data: { name: 'Test 1' },
        status: 'pending'
      });
      
      // 模拟 processTask 抛出错误
      const originalProcessTask = SyncService.processTask;
      SyncService.processTask = jest.fn().mockImplementation(function() {
        return Promise.reject(new Error('处理失败'));
      });
      
      return SyncService.processSyncQueue()
        .then(function() {
          fail('应该抛出错误');
        })
        .catch(function(error) {
          expect(error).toBeDefined();
          expect(error.message).toBe('处理失败');
          
          // 验证状态更新
          expect(SyncService.syncStatus.inProgress).toBe(false);
          
          // 验证事件触发
          expect(MockEventBus.events['sync:failed']).toBeDefined();
          
          // 恢复原始方法
          SyncService.processTask = originalProcessTask;
        });
    });
  });
  
  describe('处理单个同步任务', function() {
    test('应正确处理同步任务', function() {
      const task = {
        id: 'sync_1',
        collection: 'test',
        itemId: '1',
        data: { name: 'Test 1' },
        status: 'pending'
      };
      
      // 添加任务到队列
      SyncService.syncStatus.queue.push(task);
      
      // 模拟数据
      mockStorageService.items['test/1'] = { id: '1', name: 'Test 1' };
      
      return SyncService.processTask(task)
        .then(function(result) {
          expect(result).toBeDefined();
          expect(result.task).toEqual(task);
          expect(result.success).toBe(true);
          
          // 验证任务状态更新
          const taskIndex = SyncService.syncStatus.queue.findIndex(function(t) {
            return t.id === task.id;
          });
          expect(taskIndex).toBeGreaterThanOrEqual(0);
          expect(SyncService.syncStatus.queue[taskIndex].status).toBe('done');
          
          // 验证数据状态更新
          return mockStorageService.getItem('test', '1');
        })
        .then(function(item) {
          expect(item).toBeDefined();
          expect(item.syncStatus).toBe('synced');
        });
    });
    
    test('应处理项目不存在的情况', function() {
      const task = {
        id: 'sync_1',
        collection: 'test',
        itemId: '2', // 不存在的ID
        data: { name: 'Test 2' },
        status: 'pending'
      };
      
      // 添加任务到队列
      SyncService.syncStatus.queue.push(task);
      
      return SyncService.processTask(task)
        .then(function(result) {
          expect(result).toBeDefined();
          expect(result.task).toEqual(task);
          expect(result.success).toBe(true);
          
          // 验证任务状态更新
          const taskIndex = SyncService.syncStatus.queue.findIndex(function(t) {
            return t.id === task.id;
          });
          expect(taskIndex).toBeGreaterThanOrEqual(0);
          expect(SyncService.syncStatus.queue[taskIndex].status).toBe('done');
        });
    });
  });
  
  describe('同步队列管理', function() {
    test('保存同步队列应清理过多的已完成任务', function() {
      // 创建超过100个已完成任务
      for (let i = 1; i <= 150; i++) {
        SyncService.syncStatus.queue.push({
          id: 'sync_' + i,
          collection: 'test',
          itemId: i.toString(),
          data: { name: 'Test ' + i },
          status: 'done',
          createdAt: new Date(2025, 0, i).toISOString()
        });
      }
      
      SyncService.saveSyncQueue();
      
      // 验证队列长度
      expect(SyncService.syncStatus.queue.length).toBe(100);
      
      // 验证保留的是最新的任务
      const taskIds = SyncService.syncStatus.queue.map(function(task) {
        return task.id;
      });
      
      for (let i = 51; i <= 150; i++) {
        expect(taskIds).toContain('sync_' + i);
      }
    });
    
    test('恢复同步队列应处理存储错误', function() {
      // 模拟 getStorageSync 抛出错误
      const originalGetStorageSync = mockWx.getStorageSync;
      mockWx.getStorageSync = jest.fn().mockImplementation(function() {
        throw new Error('读取失败');
      });
      
      SyncService.restoreSyncQueue();
      
      // 验证队列为空
      expect(SyncService.syncStatus.queue).toEqual([]);
      
      // 恢复原始方法
      mockWx.getStorageSync = originalGetStorageSync;
    });
  });
  
  describe('同步状态管理', function() {
    test('获取同步状态应返回正确的信息', function() {
      // 设置状态
      SyncService.syncStatus.inProgress = true;
      SyncService.syncStatus.lastSync = '2025-04-09T08:00:00.000Z';
      SyncService.syncStatus.queue = [
        { id: 'sync_1', status: 'pending' },
        { id: 'sync_2', status: 'done' },
        { id: 'sync_3', status: 'pending' }
      ];
      
      const status = SyncService.getSyncStatus();
      
      expect(status).toBeDefined();
      expect(status.inProgress).toBe(true);
      expect(status.lastSync).toBe('2025-04-09T08:00:00.000Z');
      expect(status.queueLength).toBe(3);
      expect(status.pendingCount).toBe(2);
    });
  });
  
  describe('网络状态处理', function() {
    test('网络恢复连接时应尝试同步', function() {
      // 模拟 processSyncQueue
      const originalProcessSyncQueue = SyncService.processSyncQueue;
      SyncService.processSyncQueue = jest.fn().mockReturnValue(Promise.resolve([]));
      
      // 触发网络恢复事件
      MockEventBus.emit('network:status:changed', {
        isConnected: true,
        wasConnected: false
      });
      
      expect(SyncService.processSyncQueue).toHaveBeenCalled();
      
      // 恢复原始方法
      SyncService.processSyncQueue = originalProcessSyncQueue;
    });
    
    test('网络断开时不应尝试同步', function() {
      // 模拟 processSyncQueue
      const originalProcessSyncQueue = SyncService.processSyncQueue;
      SyncService.processSyncQueue = jest.fn().mockReturnValue(Promise.resolve([]));
      
      // 触发网络断开事件
      MockEventBus.emit('network:status:changed', {
        isConnected: false,
        wasConnected: true
      });
      
      expect(SyncService.processSyncQueue).not.toHaveBeenCalled();
      
      // 恢复原始方法
      SyncService.processSyncQueue = originalProcessSyncQueue;
    });
  });
}); 