/**
 * 数据同步框架性能基准测试
 * 
 * 创建时间: 2025年4月9日 10时48分28秒 CST
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

// 模拟存储对象
const mockStorage = {
  items: {},
  getItem: function(key) {
    return this.items[key];
  },
  setItem: function(key, value) {
    this.items[key] = value;
  },
  removeItem: function(key) {
    delete this.items[key];
  },
  clear: function() {
    this.items = {};
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

// 设置全局对象
global.wx = mockWx;

// 导入被测组件
jest.mock('../../utils/eventBus.js', () => MockEventBus);
const SyncManager = require('../../services/SyncManager.js');
const SyncService = require('../../services/syncService.js');
const SyncAdapter = require('../../services/SyncAdapter.js');
const SyncScheduler = require('../../services/SyncScheduler.js');

// 性能监控工具
const PerfMonitor = {
  // 存储时间点标记
  marks: {},
  
  // 存储测量结果
  measures: {},
  
  // 记录时间点
  mark: function(name) {
    this.marks[name] = Date.now();
    return this.marks[name];
  },
  
  // 测量时间差
  measure: function(name, startMark, endMark) {
    if (!this.marks[startMark] || !this.marks[endMark]) {
      console.error('起始或结束标记不存在');
      return -1;
    }
    
    const duration = this.marks[endMark] - this.marks[startMark];
    this.measures[name] = duration;
    return duration;
  },
  
  // 性能测试
  benchmark: function(name, fn, iterations) {
    iterations = iterations || 1;
    
    const startTime = Date.now();
    for (let i = 0; i < iterations; i++) {
      fn();
    }
    const endTime = Date.now();
    
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;
    
    this.measures[name] = {
      total: totalTime,
      iterations: iterations,
      average: avgTime
    };
    
    return this.measures[name];
  },
  
  // 异步性能测试
  benchmarkAsync: async function(name, fn, iterations) {
    iterations = iterations || 1;
    
    const startTime = Date.now();
    for (let i = 0; i < iterations; i++) {
      await fn();
    }
    const endTime = Date.now();
    
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;
    
    this.measures[name] = {
      total: totalTime,
      iterations: iterations,
      average: avgTime
    };
    
    return this.measures[name];
  },
  
  // 清空数据
  clear: function() {
    this.marks = {};
    this.measures = {};
  },
  
  // 获取所有测量结果
  getResults: function() {
    return this.measures;
  },
  
  // 打印性能报告
  printReport: function() {
    console.log('===== 性能测试报告 =====');
    for (const name in this.measures) {
      const measure = this.measures[name];
      if (typeof measure === 'object' && measure.average !== undefined) {
        console.log(`${name}: 总时间=${measure.total}ms, 平均时间=${measure.average.toFixed(2)}ms (${measure.iterations}次迭代)`);
      } else {
        console.log(`${name}: ${measure}ms`);
      }
    }
  }
};

// 性能基准
const PERFORMANCE_BENCHMARKS = {
  'init': 50,                      // 初始化时间 (ms)
  'data_save': 20,                 // 单条数据保存时间 (ms)
  'data_retrieve': 5,              // 单条数据读取时间 (ms)
  'data_delete': 10,               // 单条数据删除时间 (ms)
  'batch_save_100': 200,           // 100条数据批量保存时间 (ms)
  'batch_retrieve_100': 50,        // 100条数据批量读取时间 (ms)
  'sync_task_100': 500,            // 100条数据同步任务处理时间 (ms)
  'conflict_resolution': 30,       // 单次冲突解决时间 (ms)
};

describe('同步框架性能测试', function() {
  // 测试超时时间设置为10秒
  jest.setTimeout(10000);
  
  let manager;
  
  beforeEach(function() {
    // 重置所有模拟
    MockEventBus.clear();
    mockWx.clear();
    mockStorage.clear();
    PerfMonitor.clear();
    
    // 重置组件
    jest.clearAllMocks();
  });
  
  describe('初始化性能', function() {
    test('SyncManager初始化性能测试', function() {
      // 测量初始化时间
      PerfMonitor.mark('init_start');
      
      manager = SyncManager.init({
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
      
      PerfMonitor.mark('init_end');
      const initTime = PerfMonitor.measure('init', 'init_start', 'init_end');
      
      console.log(`SyncManager初始化时间: ${initTime}ms`);
      expect(initTime).toBeLessThanOrEqual(PERFORMANCE_BENCHMARKS.init);
    });
  });
  
  describe('数据操作性能', function() {
    beforeEach(function() {
      // 初始化SyncManager
      manager = SyncManager.init({
        container: mockContainer,
        config: {
          appId: 'test-app',
          autoStart: false,
          collections: ['users', 'tasks', 'settings']
        }
      });
    });
    
    test('单条数据保存性能测试', async function() {
      const result = await PerfMonitor.benchmarkAsync('data_save', async function() {
        await manager.saveData('users', '1', { name: 'Test User', email: 'test@example.com' });
      }, 10);
      
      console.log(`单条数据保存平均时间: ${result.average.toFixed(2)}ms`);
      expect(result.average).toBeLessThanOrEqual(PERFORMANCE_BENCHMARKS.data_save);
    });
    
    test('单条数据读取性能测试', async function() {
      // 先保存数据
      await manager.saveData('users', '1', { name: 'Test User', email: 'test@example.com' });
      
      const result = await PerfMonitor.benchmarkAsync('data_retrieve', async function() {
        await manager.getData('users', '1');
      }, 20);
      
      console.log(`单条数据读取平均时间: ${result.average.toFixed(2)}ms`);
      expect(result.average).toBeLessThanOrEqual(PERFORMANCE_BENCHMARKS.data_retrieve);
    });
    
    test('单条数据删除性能测试', async function() {
      // 先保存数据
      await manager.saveData('users', '1', { name: 'Test User', email: 'test@example.com' });
      
      const result = await PerfMonitor.benchmarkAsync('data_delete', async function() {
        await manager.removeData('users', '1');
      }, 10);
      
      console.log(`单条数据删除平均时间: ${result.average.toFixed(2)}ms`);
      expect(result.average).toBeLessThanOrEqual(PERFORMANCE_BENCHMARKS.data_delete);
    });
  });
  
  describe('批量操作性能', function() {
    beforeEach(function() {
      // 初始化SyncManager
      manager = SyncManager.init({
        container: mockContainer,
        config: {
          appId: 'test-app',
          autoStart: false,
          collections: ['users', 'tasks', 'settings']
        }
      });
    });
    
    test('批量数据保存性能测试(100条)', async function() {
      // 生成测试数据
      const testData = [];
      for (let i = 0; i < 100; i++) {
        testData.push({
          id: 'user_' + i,
          data: { name: 'User ' + i, email: `user${i}@example.com` }
        });
      }
      
      PerfMonitor.mark('batch_save_start');
      
      // 批量保存
      const promises = testData.map(item => 
        manager.saveData('users', item.id, item.data)
      );
      await Promise.all(promises);
      
      PerfMonitor.mark('batch_save_end');
      const batchSaveTime = PerfMonitor.measure('batch_save_100', 'batch_save_start', 'batch_save_end');
      
      console.log(`批量保存100条数据时间: ${batchSaveTime}ms`);
      expect(batchSaveTime).toBeLessThanOrEqual(PERFORMANCE_BENCHMARKS.batch_save_100);
    });
    
    test('批量数据查询性能测试(100条)', async function() {
      // 先保存测试数据
      for (let i = 0; i < 100; i++) {
        await manager.saveData('users', 'user_' + i, { 
          name: 'User ' + i, 
          email: `user${i}@example.com` 
        });
      }
      
      // 批量查询
      PerfMonitor.mark('batch_retrieve_start');
      
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(manager.getData('users', 'user_' + i));
      }
      await Promise.all(promises);
      
      PerfMonitor.mark('batch_retrieve_end');
      const batchRetrieveTime = PerfMonitor.measure('batch_retrieve_100', 'batch_retrieve_start', 'batch_retrieve_end');
      
      console.log(`批量读取100条数据时间: ${batchRetrieveTime}ms`);
      expect(batchRetrieveTime).toBeLessThanOrEqual(PERFORMANCE_BENCHMARKS.batch_retrieve_100);
    });
  });
  
  describe('同步任务性能', function() {
    beforeEach(function() {
      // 初始化SyncManager
      manager = SyncManager.init({
        container: mockContainer,
        config: {
          appId: 'test-app',
          autoStart: false,
          collections: ['users', 'tasks', 'settings'],
          maxConcurrent: 10 // 增加并发数以测试性能
        }
      });
    });
    
    test('同步任务队列性能测试(100条)', async function() {
      // 先批量保存数据并标记为需要同步
      for (let i = 0; i < 100; i++) {
        await manager.saveData('users', 'user_' + i, { 
          name: 'User ' + i, 
          email: `user${i}@example.com` 
        }, { sync: true });
      }
      
      // 获取初始同步任务状态
      const initialStatus = manager.getSyncStatus();
      expect(initialStatus.scheduler.taskCount).toBeGreaterThanOrEqual(100);
      
      // 执行同步 - 修改为使用正确的同步方法
      PerfMonitor.mark('sync_task_start');
      
      // 使用正确的同步方法，例如startSync或processSyncQueue
      await manager.startSync();
      
      PerfMonitor.mark('sync_task_end');
      const syncTaskTime = PerfMonitor.measure('sync_task_100', 'sync_task_start', 'sync_task_end');
      
      console.log(`处理100条同步任务时间: ${syncTaskTime}ms`);
      expect(syncTaskTime).toBeLessThanOrEqual(PERFORMANCE_BENCHMARKS.sync_task_100);
      
      // 验证同步任务是否已处理
      const finalStatus = manager.getSyncStatus();
      expect(finalStatus.scheduler.taskCount).toBe(0);
    });
  });
  
  describe('冲突解决性能', function() {
    beforeEach(function() {
      // 初始化SyncManager
      manager = SyncManager.init({
        container: mockContainer,
        config: {
          appId: 'test-app',
          autoStart: false,
          collections: ['users', 'tasks', 'settings']
        }
      });
    });
    
    test('数据冲突解决性能测试', async function() {
      // 先保存本地数据
      await manager.saveData('users', 'conflict_user', { 
        name: 'Local User', 
        email: 'local@example.com',
        age: 25
      });
      
      // 模拟冲突解决过程
      const result = await PerfMonitor.benchmarkAsync('conflict_resolution', async function() {
        // 创建冲突数据
        const localData = { 
          name: 'Local User', 
          email: 'local@example.com',
          age: 25,
          _meta: { 
            version: 1, 
            modified: Date.now() - 1000
          }
        };
        
        const remoteData = { 
          name: 'Remote User', 
          email: 'remote@example.com',
          phone: '123-456-7890',
          _meta: { 
            version: 2, 
            modified: Date.now()
          }
        };
        
        // 修正为正确的冲突解决方法
        await manager.resolveConflict('users', 'conflict_user', localData, remoteData);
      }, 10);
      
      console.log(`数据冲突解决平均时间: ${result.average.toFixed(2)}ms`);
      expect(result.average).toBeLessThanOrEqual(PERFORMANCE_BENCHMARKS.conflict_resolution);
    });
  });
  
  afterAll(function() {
    // 输出完整性能报告
    PerfMonitor.printReport();
  });
}); 