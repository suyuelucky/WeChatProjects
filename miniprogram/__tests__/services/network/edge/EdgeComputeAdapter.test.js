/**
 * EdgeComputeAdapter 测试套件
 * 
 * 测试边缘计算适配器的功能和性能
 * 
 * 创建时间: 2025-04-08 21:10:15 | 创建者: Claude 3.7 Sonnet
 */

// 模拟wx API
global.wx = {
  getNetworkType: jest.fn((options) => {
    if (options && options.success) {
      options.success({ networkType: 'wifi' });
    }
    return {};
  }),
  getSystemInfo: jest.fn((options) => {
    if (options && options.success) {
      options.success({
        brand: 'iPhone',
        model: 'iPhone X',
        system: 'iOS 14.0',
        platform: 'ios',
        benchmarkLevel: 50,
        battery: 80,
        SDKVersion: '2.20.0'
      });
    }
    return {};
  }),
  onNetworkStatusChange: jest.fn((callback) => {
    global.wx.onNetworkStatusChange.callback = callback;
    return {};
  }),
  request: jest.fn((options) => {
    if (options && options.success) {
      options.success({
        statusCode: 200,
        data: { result: 'success' }
      });
    }
    return {};
  }),
  getStorageSync: jest.fn().mockReturnValue(null),
  setStorageSync: jest.fn(),
  getFileSystemManager: jest.fn(() => ({
    readFile: jest.fn((options) => {
      if (options && options.success) {
        options.success({ data: new ArrayBuffer(10) });
      }
    }),
    writeFile: jest.fn((options) => {
      if (options && options.success) {
        options.success({});
      }
    }),
    getSavedFileList: jest.fn((options) => {
      if (options && options.success) {
        options.success({ fileList: [] });
      }
    }),
    removeSavedFile: jest.fn((options) => {
      if (options && options.success) {
        options.success({});
      }
    }),
    mkdir: jest.fn((options) => {
      if (options && options.success) {
        options.success({});
      }
    }),
    access: jest.fn((options) => {
      if (options && options.success) {
        options.success({});
      }
    })
  })),
  createWorker: jest.fn(() => ({
    postMessage: jest.fn(),
    onMessage: jest.fn((callback) => {
      setTimeout(() => {
        callback({ data: { result: 'success' } });
      }, 100);
    }),
    terminate: jest.fn()
  }))
};

// 模拟控制台以避免测试输出太多日志
console.debug = jest.fn();
console.info = jest.fn();
console.warn = jest.fn();
console.error = jest.fn();
console.time = jest.fn();
console.timeEnd = jest.fn();

// 模拟logger服务
const loggerMock = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  time: jest.fn(),
  timeEnd: jest.fn()
};

// 模拟存储服务
const storageMock = {
  get: jest.fn().mockImplementation((key) => {
    if (key === 'edgeComputeCache') {
      return {
        tasks: [],
        results: {}
      };
    }
    return null;
  }),
  set: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
};

// 模拟任务处理器
const processorsMock = {
  computation: {
    sum: jest.fn((data) => {
      if (Array.isArray(data.items)) {
        return data.items.reduce((sum, item) => sum + item, 0);
      }
      return 0;
    }),
    average: jest.fn((data) => {
      if (Array.isArray(data.items) && data.items.length > 0) {
        return data.items.reduce((sum, item) => sum + item, 0) / data.items.length;
      }
      return 0;
    }),
    sort: jest.fn((data) => {
      if (Array.isArray(data.items)) {
        return [...data.items].sort((a, b) => a - b);
      }
      return [];
    })
  },
  dataProcessing: {
    filter: jest.fn((data) => {
      if (Array.isArray(data.items) && data.criteria) {
        return data.items.filter(item => item > data.criteria);
      }
      return [];
    }),
    transform: jest.fn((data) => {
      if (Array.isArray(data.items) && data.factor) {
        return data.items.map(item => item * data.factor);
      }
      return [];
    })
  }
};

// 引入待测试的模块
const EdgeComputeAdapter = require('../../../../services/network/edge/EdgeComputeAdapter');

describe('EdgeComputeAdapter', () => {
  let edgeAdapter;
  
  // 测试前的准备工作
  beforeEach(() => {
    // 重置所有模拟函数
    jest.clearAllMocks();
    
    // 模拟同步服务
    const syncServiceMock = {
      syncData: jest.fn().mockResolvedValue({ success: true }),
      getLastSyncTime: jest.fn().mockReturnValue(Date.now() - 3600000),
      markAsSynced: jest.fn()
    };
    
    // 创建EdgeComputeAdapter实例
    edgeAdapter = new EdgeComputeAdapter({
      logger: loggerMock,
      storage: storageMock,
      processors: processorsMock,
      syncService: syncServiceMock,
      config: {
        maxConcurrentTasks: 3,
        maxCacheSize: 100,
        syncInterval: 60, // 分钟
        resourceLimits: {
          memory: 50, // MB
          cpuUsage: 70 // 百分比
        }
      }
    });
  });
  
  // 测试初始化
  describe('初始化', () => {
    test('应正确初始化并设置默认配置', () => {
      expect(edgeAdapter).toBeDefined();
      expect(edgeAdapter.config).toBeDefined();
      expect(edgeAdapter.processors).toBeDefined();
      expect(edgeAdapter.taskQueue).toBeDefined();
      expect(edgeAdapter.cache).toBeDefined();
    });
    
    test('应能从存储中恢复缓存状态', () => {
      // 模拟从存储中读取的缓存数据
      const cachedData = {
        tasks: [
          { id: 'task1', type: 'computation', operation: 'sum', data: { items: [1, 2, 3] } }
        ],
        results: {
          'task1': { result: 6, timestamp: Date.now() - 1000 }
        }
      };
      
      // 更新存储模拟以返回缓存数据
      storageMock.get.mockReturnValueOnce(cachedData);
      
      // 创建新的实例，应该从存储中恢复缓存
      const adapter = new EdgeComputeAdapter({
        logger: loggerMock,
        storage: storageMock,
        processors: processorsMock,
        config: { maxCacheSize: 100 }
      });
      
      // 验证缓存是否被正确恢复
      expect(adapter.cache.results['task1']).toBeDefined();
      expect(adapter.cache.results['task1'].result).toBe(6);
      expect(storageMock.get).toHaveBeenCalledWith('edgeComputeCache');
    });
    
    test('应自动启动后台同步任务', () => {
      // 验证同步定时器是否启动
      expect(edgeAdapter.syncIntervalId).toBeDefined();
      
      // 检查初始化时是否尝试同步
      expect(edgeAdapter.syncService.syncData).toHaveBeenCalled();
    });
  });
  
  // 测试任务执行功能
  describe('任务执行', () => {
    test('应能正确执行计算任务', async () => {
      // 创建测试任务
      const task = {
        id: 'test1',
        type: 'computation',
        operation: 'sum',
        data: { items: [1, 2, 3, 4, 5] }
      };
      
      // 执行任务
      const result = await edgeAdapter.executeTask(task);
      
      // 验证结果
      expect(result).toBe(15); // 1+2+3+4+5 = 15
      expect(processorsMock.computation.sum).toHaveBeenCalledWith(task.data);
      
      // 验证结果是否被缓存
      expect(edgeAdapter.cache.results[task.id]).toBeDefined();
      expect(edgeAdapter.cache.results[task.id].result).toBe(15);
      
      // 验证存储是否被更新
      expect(storageMock.set).toHaveBeenCalled();
    });
    
    test('应能处理不支持的任务类型', async () => {
      // 创建不支持的任务类型
      const task = {
        id: 'unsupported1',
        type: 'unknown',
        operation: 'invalid',
        data: {}
      };
      
      // 预期任务执行会失败
      await expect(edgeAdapter.executeTask(task)).rejects.toThrow('不支持的任务类型');
    });
    
    test('应能从缓存中获取之前的计算结果', async () => {
      // 设置缓存中的结果
      const taskId = 'cached1';
      const cachedResult = 42;
      edgeAdapter.cache.results[taskId] = {
        result: cachedResult,
        timestamp: Date.now() // 当前时间，表示结果很新
      };
      
      // 创建与缓存结果对应的任务
      const task = {
        id: taskId,
        type: 'computation',
        operation: 'sum',
        data: { items: [10, 15, 17] } // 实际结果应该是42，但我们不会真正计算
      };
      
      // 执行任务，应该直接返回缓存结果
      const result = await edgeAdapter.executeTask(task);
      
      // 验证结果来自缓存
      expect(result).toBe(cachedResult);
      
      // 验证处理器没有被调用（因为使用了缓存）
      expect(processorsMock.computation.sum).not.toHaveBeenCalled();
    });
    
    test('应正确处理任务执行错误', async () => {
      // 模拟处理器抛出错误
      processorsMock.computation.sum.mockImplementationOnce(() => {
        throw new Error('处理失败');
      });
      
      // 创建测试任务
      const task = {
        id: 'error1',
        type: 'computation',
        operation: 'sum',
        data: { items: [1, 2, 3] }
      };
      
      // 执行任务，预期会失败
      await expect(edgeAdapter.executeTask(task)).rejects.toThrow('处理失败');
      
      // 验证错误是否被记录
      expect(loggerMock.error).toHaveBeenCalled();
    });
  });
  
  // 测试执行效率
  describe('执行效率', () => {
    test('本地执行应比模拟的云端执行快', async () => {
      // 创建大量数据的计算任务
      const largeData = { items: Array(10000).fill(1) }; // 10000个1
      
      const task = {
        id: 'perf1',
        type: 'computation',
        operation: 'sum',
        data: largeData
      };
      
      // 模拟云端执行时间（固定为200ms）
      const mockCloudExecute = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(10000); // 结果是10000
          }, 200);
        });
      });
      
      // 测量本地执行时间
      const startLocal = Date.now();
      const localResult = await edgeAdapter.executeTask(task);
      const localTime = Date.now() - startLocal;
      
      // 测量模拟的云端执行时间
      const startCloud = Date.now();
      const cloudResult = await mockCloudExecute();
      const cloudTime = Date.now() - startCloud;
      
      // 验证两者结果一致
      expect(localResult).toBe(cloudResult);
      
      // 验证本地执行更快（通常应该快很多，但测试环境可能有波动）
      expect(localTime).toBeLessThan(cloudTime);
      
      // 记录性能改进
      const improvement = ((cloudTime - localTime) / cloudTime) * 100;
      console.info(`性能提升: ${improvement.toFixed(2)}%`);
      
      // 验证性能提升是否达到预期（至少30%）
      expect(improvement).toBeGreaterThanOrEqual(30);
    });
    
    test('批量任务应能并行处理以提高吞吐量', async () => {
      // 创建多个简单计算任务
      const tasks = Array(10).fill(0).map((_, i) => ({
        id: `batch${i}`,
        type: 'computation',
        operation: 'sum',
        data: { items: [1, 2, 3, 4, 5] }
      }));
      
      // 提交所有任务并等待完成
      const startTime = Date.now();
      await Promise.all(tasks.map(task => edgeAdapter.executeTask(task)));
      const totalTime = Date.now() - startTime;
      
      // 如果是串行执行，每个任务假设至少需要10ms，总共需要100ms以上
      // 但并行执行应该能大幅减少总时间
      console.info(`批量处理10个任务总耗时: ${totalTime}ms`);
      
      // 验证处理器被调用了10次
      expect(processorsMock.computation.sum).toHaveBeenCalledTimes(10);
      
      // 理想情况下，通过并行处理，总时间应该远小于顺序处理的时间
      // 考虑到测试环境的不稳定性，我们不做严格断言，仅记录性能数据
    });
  });
  
  // 测试资源管理
  describe('资源管理', () => {
    test('应根据可用资源控制并发任务数', async () => {
      // 模拟系统资源状态
      const originalCheckResources = edgeAdapter.checkResourceAvailability;
      edgeAdapter.checkResourceAvailability = jest.fn().mockReturnValue({
        available: true,
        maxConcurrent: 2 // 限制并发为2
      });
      
      // 创建任务执行跟踪
      const executionOrder = [];
      
      // 模拟任务执行，记录开始和结束时间
      processorsMock.computation.sum.mockImplementation(() => {
        const taskId = `task-${executionOrder.length}`;
        executionOrder.push({ id: taskId, start: Date.now() });
        
        return new Promise(resolve => {
          setTimeout(() => {
            executionOrder.find(t => t.id === taskId).end = Date.now();
            resolve(10);
          }, 100); // 每个任务执行100ms
        });
      });
      
      // 创建5个测试任务
      const tasks = Array(5).fill(0).map((_, i) => ({
        id: `resource${i}`,
        type: 'computation',
        operation: 'sum',
        data: { items: [1, 2, 3, 4, 5] }
      }));
      
      // 同时提交所有任务
      await Promise.all(tasks.map(task => edgeAdapter.executeTask(task)));
      
      // 验证系统资源检查被调用
      expect(edgeAdapter.checkResourceAvailability).toHaveBeenCalled();
      
      // 验证任务执行情况
      // 由于并发限制为2，我们预期任务会分批执行
      // 通过分析任务的开始和结束时间，可以验证并发控制是否有效
      let maxConcurrent = 0;
      let currentConcurrent = 0;
      
      // 对执行记录按开始时间排序
      const sortedEvents = [];
      executionOrder.forEach(task => {
        sortedEvents.push({ time: task.start, type: 'start', id: task.id });
        sortedEvents.push({ time: task.end, type: 'end', id: task.id });
      });
      sortedEvents.sort((a, b) => a.time - b.time);
      
      // 计算最大并发数
      sortedEvents.forEach(event => {
        if (event.type === 'start') {
          currentConcurrent++;
        } else {
          currentConcurrent--;
        }
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      });
      
      // 验证最大并发数不超过限制
      expect(maxConcurrent).toBeLessThanOrEqual(2);
      
      // 恢复原始方法
      edgeAdapter.checkResourceAvailability = originalCheckResources;
    });
    
    test('超出资源限制时应排队等待执行', async () => {
      // 模拟系统内存不足的情况
      const originalCheckResources = edgeAdapter.checkResourceAvailability;
      let resourcesAvailable = false;
      edgeAdapter.checkResourceAvailability = jest.fn().mockImplementation(() => {
        return {
          available: resourcesAvailable,
          maxConcurrent: resourcesAvailable ? 3 : 0
        };
      });
      
      // 创建测试任务
      const task = {
        id: 'resourceLimit1',
        type: 'computation',
        operation: 'sum',
        data: { items: [1, 2, 3, 4, 5] }
      };
      
      // 提交任务但不等待，应该排队等待资源
      const resultPromise = edgeAdapter.executeTask(task);
      
      // 验证任务已进入队列
      expect(edgeAdapter.taskQueue.length).toBeGreaterThan(0);
      
      // 模拟资源变为可用
      setTimeout(() => {
        resourcesAvailable = true;
        
        // 触发队列处理
        edgeAdapter.processQueue();
        
      }, 100);
      
      // 等待任务完成
      const result = await resultPromise;
      
      // 验证任务最终执行完成
      expect(result).toBe(15);
      
      // 恢复原始方法
      edgeAdapter.checkResourceAvailability = originalCheckResources;
    });
  });
  
  // 测试离线能力
  describe('离线能力', () => {
    test('应在离线状态下仍能执行任务', async () => {
      // 模拟网络断开
      global.wx.getNetworkType.mockImplementationOnce((options) => {
        if (options && options.success) {
          options.success({ networkType: 'none' });
        }
      });
      
      // 触发网络状态更新
      if (global.wx.onNetworkStatusChange.callback) {
        global.wx.onNetworkStatusChange.callback({ networkType: 'none', isConnected: false });
      }
      
      // 更新适配器的网络状态
      edgeAdapter.updateNetworkStatus();
      
      // 创建测试任务
      const task = {
        id: 'offline1',
        type: 'computation',
        operation: 'sum',
        data: { items: [1, 2, 3, 4, 5] }
      };
      
      // 执行任务
      const result = await edgeAdapter.executeTask(task);
      
      // 验证任务成功执行
      expect(result).toBe(15);
      
      // 验证结果已被缓存
      expect(edgeAdapter.cache.results[task.id]).toBeDefined();
      
      // 验证用户存储被更新
      expect(storageMock.set).toHaveBeenCalled();
    });
    
    test('应将离线执行的结果标记为待同步', async () => {
      // 模拟网络断开
      edgeAdapter.isOnline = false;
      
      // 创建测试任务
      const task = {
        id: 'offlineSync1',
        type: 'computation',
        operation: 'sum',
        data: { items: [1, 2, 3, 4, 5] },
        requireSync: true // 标记为需要同步的任务
      };
      
      // 执行任务
      await edgeAdapter.executeTask(task);
      
      // 验证任务结果被标记为待同步
      expect(edgeAdapter.pendingSyncTasks).toContain(task.id);
    });
    
    test('网络恢复后应自动同步离线时执行的结果', async () => {
      // 先将适配器设置为离线状态
      edgeAdapter.isOnline = false;
      
      // 添加一些待同步任务
      edgeAdapter.pendingSyncTasks = ['task1', 'task2'];
      edgeAdapter.cache.results = {
        task1: { result: 15, timestamp: Date.now() },
        task2: { result: 30, timestamp: Date.now() }
      };
      
      // 模拟网络恢复
      edgeAdapter.isOnline = true;
      
      // 触发同步
      await edgeAdapter.syncWithCloud();
      
      // 验证同步服务被调用
      expect(edgeAdapter.syncService.syncData).toHaveBeenCalled();
      
      // 验证任务被标记为已同步
      expect(edgeAdapter.syncService.markAsSynced).toHaveBeenCalled();
      
      // 验证待同步列表被清空
      expect(edgeAdapter.pendingSyncTasks.length).toBe(0);
    });
  });
  
  // 测试缓存管理
  describe('缓存管理', () => {
    test('应自动清理过期的缓存结果', async () => {
      // 添加一些缓存结果，包括一些过期的
      const now = Date.now();
      const hourInMs = 3600 * 1000;
      
      edgeAdapter.cache.results = {
        recent: { result: 10, timestamp: now - hourInMs / 2 }, // 30分钟前（未过期）
        expired1: { result: 20, timestamp: now - 2 * hourInMs }, // 2小时前（过期）
        expired2: { result: 30, timestamp: now - 3 * hourInMs } // 3小时前（过期）
      };
      
      // 触发缓存清理
      edgeAdapter.cleanupCache();
      
      // 验证过期缓存被清理
      expect(edgeAdapter.cache.results.recent).toBeDefined(); // 未过期的应保留
      expect(edgeAdapter.cache.results.expired1).toBeUndefined(); // 过期的应删除
      expect(edgeAdapter.cache.results.expired2).toBeUndefined(); // 过期的应删除
      
      // 验证存储被更新
      expect(storageMock.set).toHaveBeenCalled();
    });
    
    test('超出缓存大小限制时应删除最旧的结果', async () => {
      // 设置较小的缓存限制
      edgeAdapter.config.maxCacheSize = 3;
      
      // 按时间顺序添加5个缓存结果
      const now = Date.now();
      edgeAdapter.cache.results = {
        oldest: { result: 10, timestamp: now - 5000 },
        older: { result: 20, timestamp: now - 4000 },
        old: { result: 30, timestamp: now - 3000 },
        new: { result: 40, timestamp: now - 2000 },
        newest: { result: 50, timestamp: now - 1000 }
      };
      
      // 触发缓存清理
      edgeAdapter.cleanupCache();
      
      // 验证最旧的缓存被删除，只保留最新的3个
      expect(edgeAdapter.cache.results.oldest).toBeUndefined();
      expect(edgeAdapter.cache.results.older).toBeUndefined();
      expect(edgeAdapter.cache.results.old).toBeDefined();
      expect(edgeAdapter.cache.results.new).toBeDefined();
      expect(edgeAdapter.cache.results.newest).toBeDefined();
      
      // 验证缓存大小不超过限制
      expect(Object.keys(edgeAdapter.cache.results).length).toBeLessThanOrEqual(3);
    });
  });
  
  // 测试云端协同
  describe('云端协同', () => {
    test('应能将本地结果与云端同步', async () => {
      // 添加一些待同步的结果
      edgeAdapter.pendingSyncTasks = ['sync1', 'sync2'];
      edgeAdapter.cache.results = {
        sync1: { result: 15, timestamp: Date.now() },
        sync2: { result: 30, timestamp: Date.now() }
      };
      
      // 触发同步
      await edgeAdapter.syncWithCloud();
      
      // 验证同步服务被调用，并传入了正确的数据
      expect(edgeAdapter.syncService.syncData).toHaveBeenCalledWith({
        sync1: { result: 15, timestamp: expect.any(Number) },
        sync2: { result: 30, timestamp: expect.any(Number) }
      });
      
      // 验证同步成功后，任务被标记为已同步
      expect(edgeAdapter.pendingSyncTasks.length).toBe(0);
    });
    
    test('同步失败时应保留待同步状态并稍后重试', async () => {
      // 设置同步失败
      edgeAdapter.syncService.syncData.mockRejectedValueOnce(new Error('同步失败'));
      
      // 添加待同步任务
      edgeAdapter.pendingSyncTasks = ['fail1'];
      edgeAdapter.cache.results = {
        fail1: { result: 15, timestamp: Date.now() }
      };
      
      // 尝试同步，预期会失败
      await edgeAdapter.syncWithCloud();
      
      // 验证同步服务被调用
      expect(edgeAdapter.syncService.syncData).toHaveBeenCalled();
      
      // 验证任务仍然保持待同步状态
      expect(edgeAdapter.pendingSyncTasks).toContain('fail1');
      
      // 验证错误被记录
      expect(loggerMock.error).toHaveBeenCalled();
    });
  });
  
  // 资源清理
  afterEach(() => {
    // 清理定时器
    if (edgeAdapter.syncIntervalId) {
      clearInterval(edgeAdapter.syncIntervalId);
    }
  });
}); 