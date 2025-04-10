/**
 * NetworkEdgeService 测试套件
 * 
 * 测试网络边缘计算服务的集成功能
 * 
 * 创建时间: 2025-04-08 21:50:19 | 创建者: Claude 3.7 Sonnet
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
  getStorageSync: jest.fn().mockReturnValue(null),
  setStorageSync: jest.fn()
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
    switch (key) {
      case 'edgeComputeCache':
        return {
          tasks: [],
          results: {}
        };
      case 'edgeComputeSyncInfo':
        return {
          lastSyncTime: Date.now() - 3600000,
          syncedTasks: []
        };
      default:
        return null;
    }
  }),
  set: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
};

// 模拟HTTP客户端
const httpClientMock = {
  post: jest.fn().mockResolvedValue({
    statusCode: 200,
    data: { status: 'success' }
  }),
  get: jest.fn().mockResolvedValue({
    statusCode: 200,
    data: { status: 'success' }
  })
};

// 引入待测试的模块
const NetworkEdgeService = require('../../../services/network/NetworkEdgeService');

describe('NetworkEdgeService', () => {
  let edgeService;
  
  // 测试前的准备工作
  beforeEach(() => {
    // 重置所有模拟函数
    jest.clearAllMocks();
    
    // 创建NetworkEdgeService实例
    edgeService = new NetworkEdgeService({
      logger: loggerMock,
      storage: storageMock,
      httpClient: httpClientMock,
      dispatcherConfig: {
        thresholds: {
          networkSpeed: 1000,
          batteryLevel: 20,
          cpuThreshold: 80,
          memoryThreshold: 70
        }
      },
      adapterConfig: {
        maxConcurrentTasks: 3,
        maxCacheSize: 100,
        syncInterval: 60
      }
    });
  });
  
  // 测试初始化
  describe('初始化', () => {
    test('应正确初始化并创建子组件', () => {
      expect(edgeService).toBeDefined();
      expect(edgeService.taskDispatcher).toBeDefined();
      expect(edgeService.edgeAdapter).toBeDefined();
      expect(edgeService.syncService).toBeDefined();
      
      // 验证日志输出初始化完成
      expect(loggerMock.info).toHaveBeenCalledWith('NetworkEdgeService 初始化完成');
    });
  });
  
  // 测试任务执行
  describe('任务执行', () => {
    test('应能成功执行计算任务', async () => {
      // 创建测试任务
      const task = {
        id: 'test1',
        type: 'computation',
        operation: 'sum',
        data: { items: [1, 2, 3, 4, 5] },
        complexity: 'low',
        priority: 'medium'
      };
      
      // 执行任务
      const result = await edgeService.executeTask(task);
      
      // 验证结果
      expect(result).toBe(15); // 1+2+3+4+5 = 15
    });
    
    test('应自动预估数据大小', async () => {
      // 创建测试任务(不包含dataSize)
      const task = {
        id: 'dataSize1',
        type: 'computation',
        operation: 'sum',
        data: { items: new Array(1000).fill(1) } // 预期会生成一个大数组
      };
      
      // 执行任务
      await edgeService.executeTask(task);
      
      // 验证任务被处理器正确处理
      expect(task.dataSize).toBeDefined();
      expect(task.dataSize).toBeGreaterThan(0);
    });
  });
  
  // 测试任务路由
  describe('任务路由', () => {
    test('简单计算任务应在本地执行', async () => {
      // 创建测试任务
      const task = {
        id: 'localTest1',
        type: 'computation',
        operation: 'sum',
        data: { items: [1, 2, 3, 4, 5] },
        complexity: 'low'
      };
      
      // 监视任务分发管理器的shouldProcessLocally方法
      const spy = jest.spyOn(edgeService.taskDispatcher, 'shouldProcessLocally');
      
      // 执行任务
      await edgeService.executeTask(task);
      
      // 验证路由决策
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.results[0].value).toBe(true);
    });
    
    test('复杂计算任务应在云端执行', async () => {
      // 创建测试任务
      const task = {
        id: 'cloudTest1',
        type: 'computation',
        operation: 'sum',
        data: { items: new Array(10000).fill(1) },
        complexity: 'high',
        dataSize: 5000 // 5MB
      };
      
      // 模拟发送到云端的方法
      const spy = jest.spyOn(edgeService.taskDispatcher, 'shouldProcessLocally');
      edgeService.taskDispatcher.sendTaskToCloud = jest.fn().mockResolvedValue(10000);
      
      // 执行任务
      const result = await edgeService.executeTask(task);
      
      // 验证路由决策
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.results[0].value).toBe(false);
      
      // 验证云端调用
      expect(edgeService.taskDispatcher.sendTaskToCloud).toHaveBeenCalled();
      
      // 验证返回结果
      expect(result).toBe(10000);
    });
  });
  
  // 测试离线能力
  describe('离线能力', () => {
    test('在离线状态下应能执行任务', async () => {
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
      
      // 创建测试任务
      const task = {
        id: 'offline1',
        type: 'computation',
        operation: 'sum',
        data: { items: [1, 2, 3, 4, 5] },
        requireSync: true
      };
      
      // 执行任务
      const result = await edgeService.executeTask(task);
      
      // 验证任务成功执行
      expect(result).toBe(15);
    });
  });
  
  // 测试同步功能
  describe('同步功能', () => {
    test('应能强制同步数据到云端', async () => {
      // 模拟待同步任务
      edgeService.edgeAdapter.pendingSyncTasks = ['sync1', 'sync2'];
      edgeService.edgeAdapter.cache.results = {
        sync1: { result: 15, timestamp: Date.now() },
        sync2: { result: 30, timestamp: Date.now() }
      };
      
      // 强制同步
      const success = await edgeService.forceSyncData();
      
      // 验证同步成功
      expect(success).toBe(true);
      
      // 验证HTTP请求被调用
      expect(httpClientMock.post).toHaveBeenCalled();
    });
    
    test('网络恢复后应自动同步', async () => {
      // 设置离线状态
      edgeService.edgeAdapter.isOnline = false;
      
      // 添加待同步任务
      edgeService.edgeAdapter.pendingSyncTasks = ['autoSync1'];
      edgeService.edgeAdapter.cache.results = {
        autoSync1: { result: 42, timestamp: Date.now() }
      };
      
      // 模拟网络恢复
      edgeService.edgeAdapter.isOnline = true;
      
      // 触发网络状态变化事件
      if (global.wx.onNetworkStatusChange.callback) {
        global.wx.onNetworkStatusChange.callback({ 
          networkType: 'wifi', 
          isConnected: true 
        });
      }
      
      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 验证同步被调用
      expect(httpClientMock.post).toHaveBeenCalled();
    });
  });
  
  // 测试状态获取
  describe('状态获取', () => {
    test('应能获取服务状态信息', () => {
      // 获取状态
      const status = edgeService.getStatus();
      
      // 验证状态结构
      expect(status).toBeDefined();
      expect(status.dispatcher).toBeDefined();
      expect(status.deviceInfo).toBeDefined();
      expect(status.pendingSyncTasks).toBeDefined();
      
      // 验证设备信息
      expect(status.deviceInfo.networkType).toBeDefined();
      expect(status.deviceInfo.batteryLevel).toBeDefined();
    });
  });
  
  // 测试资源清理
  describe('资源清理', () => {
    test('应能清理服务资源', () => {
      // 设置定时器ID模拟
      edgeService.edgeAdapter.syncIntervalId = setInterval(() => {}, 60000);
      
      // 销毁服务
      edgeService.destroy();
      
      // 验证适配器的destroy方法被调用
      expect(loggerMock.info).toHaveBeenCalledWith('NetworkEdgeService 已销毁');
    });
  });
  
  // 资源清理
  afterEach(() => {
    // 清理定时器
    if (edgeService.edgeAdapter.syncIntervalId) {
      clearInterval(edgeService.edgeAdapter.syncIntervalId);
    }
  });
}); 