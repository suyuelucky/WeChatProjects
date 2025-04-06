/**
 * 小程序核心服务模块测试套件
 * 用于验证修复后的服务模块是否正常工作
 * 
 * 测试内容：
 * 1. StorageService 初始化和基本功能
 * 2. ImageCacheManager 功能验证
 * 3. PhotoService 内存管理功能
 * 4. 服务容器注册和获取
 */

// 导入需要测试的模块
const ServiceContainer = require('../miniprogram/services/container');
const StorageService = require('../miniprogram/services/storageService');
const PhotoService = require('../miniprogram/services/photoService');
const ImageCacheManager = require('../miniprogram/utils/image-cache-manager');
const MemoryManager = require('../miniprogram/utils/memory-manager');

// 模拟wx对象
const mockWx = {
  getStorageSync: jest.fn(),
  setStorageSync: jest.fn(),
  getNetworkType: jest.fn().mockImplementation(options => {
    if (options && options.success) options.success({ networkType: 'wifi' });
  }),
  onNetworkStatusChange: jest.fn(),
  onMemoryWarning: jest.fn(),
  cloud: {
    init: jest.fn(),
    inited: false
  },
  getSystemInfoSync: jest.fn().mockReturnValue({
    platform: 'ios'
  }),
  env: {
    USER_DATA_PATH: '/user/data/path'
  },
  removeSavedFile: jest.fn()
};

// 记录原始的全局对象
const originalWx = global.wx;
const originalConsole = global.console;

// 重置模拟和设置
beforeAll(() => {
  // 设置模拟的wx全局对象
  global.wx = mockWx;
  
  // 静默console输出
  global.console = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  };
});

// 测试完成后恢复原始对象
afterAll(() => {
  global.wx = originalWx;
  global.console = originalConsole;
});

// 每个测试前重置
beforeEach(() => {
  jest.clearAllMocks();
});

describe('核心服务模块集成测试', () => {
  describe('服务容器测试', () => {
    test('服务容器应正确注册和获取服务', () => {
      // 重置容器
      ServiceContainer.reset();
      
      // 注册测试服务
      ServiceContainer.register('testService', (container) => {
        return { name: 'TestService', container };
      });
      
      // 获取服务
      const service = ServiceContainer.get('testService');
      
      // 验证
      expect(service).toBeDefined();
      expect(service.name).toBe('TestService');
    });
    
    test('服务容器应该正确处理依赖注入', () => {
      // 重置容器
      ServiceContainer.reset();
      
      // 注册依赖服务
      ServiceContainer.register('dependencyService', () => {
        return { name: 'DependencyService' };
      });
      
      // 注册依赖于其他服务的服务
      ServiceContainer.register('mainService', (container) => {
        const dependency = container.get('dependencyService');
        return { 
          name: 'MainService',
          dependency
        };
      });
      
      // 获取服务
      const service = ServiceContainer.get('mainService');
      
      // 验证
      expect(service).toBeDefined();
      expect(service.name).toBe('MainService');
      expect(service.dependency).toBeDefined();
      expect(service.dependency.name).toBe('DependencyService');
    });
  });
  
  describe('StorageService测试', () => {
    test('StorageService.init 函数应该正确初始化服务', () => {
      // 验证init函数存在
      expect(typeof StorageService.init).toBe('function');
      
      // 执行初始化
      const container = {};
      const storageService = StorageService.init(container);
      
      // 验证初始化后的实例
      expect(storageService).toBeDefined();
      expect(storageService.container).toBe(container);
      expect(storageService.isInitialized).toBe(true);
    });
    
    test('StorageService实例应该具有必要的方法', () => {
      const storageService = StorageService.init({});
      
      // 验证关键方法是否存在
      expect(typeof storageService.saveData).toBe('function');
      expect(typeof storageService.getData).toBe('function');
      expect(typeof storageService.removeData).toBe('function');
      expect(typeof storageService.clearCollection).toBe('function');
    });
  });
  
  describe('ImageCacheManager测试', () => {
    test('ImageCacheManager应该具有getLastCleanupTime方法', () => {
      // 验证方法存在
      expect(typeof ImageCacheManager.getLastCleanupTime).toBe('function');
      
      // 初始情况下，lastCleanupTime应该为null
      expect(ImageCacheManager.lastCleanupTime).toBeNull();
      expect(ImageCacheManager.getLastCleanupTime()).toBeNull();
    });
    
    test('清理缓存后应该更新lastCleanupTime', () => {
      // 模拟Date.now
      const mockNow = 1617638400000; // 2021-04-05T12:00:00Z
      const originalNow = Date.now;
      Date.now = jest.fn().mockReturnValue(mockNow);
      
      // 执行清理
      ImageCacheManager.cleanup();
      
      // 验证lastCleanupTime被更新
      expect(ImageCacheManager.lastCleanupTime).toBe(mockNow);
      expect(ImageCacheManager.getLastCleanupTime()).toBe(mockNow);
      
      // 恢复原始Date.now
      Date.now = originalNow;
    });
    
    test('clearCache应该清空缓存并更新lastCleanupTime', () => {
      // 模拟Date.now
      const mockNow = 1617638400000; // 2021-04-05T12:00:00Z
      const originalNow = Date.now;
      Date.now = jest.fn().mockReturnValue(mockNow);
      
      // 添加一些图片到缓存
      ImageCacheManager.addImage('test1', { path: 'path1', size: 1000 }, false);
      ImageCacheManager.addImage('test2', { path: 'path2', size: 2000 }, true);
      
      // 执行清空缓存
      ImageCacheManager.clearCache();
      
      // 验证缓存被清空
      expect(ImageCacheManager.getImage('test1', false)).toBeNull();
      expect(ImageCacheManager.getImage('test2', true)).toBeNull();
      expect(ImageCacheManager.estimatedMemoryUsage).toBe(0);
      
      // 验证lastCleanupTime被更新
      expect(ImageCacheManager.lastCleanupTime).toBe(mockNow);
      
      // 恢复原始Date.now
      Date.now = originalNow;
    });
  });
  
  describe('PhotoService测试', () => {
    test('PhotoService应该具有getMemoryStats方法', () => {
      // 验证方法存在
      expect(typeof PhotoService.getMemoryStats).toBe('function');
    });
    
    test('getMemoryStats应该返回包含cleared属性的对象', () => {
      // 模拟MemoryManager和ImageCacheManager
      const originalGetMemoryInfo = MemoryManager.getMemoryInfo;
      const originalGetStats = ImageCacheManager.getStats;
      
      MemoryManager.getMemoryInfo = jest.fn().mockReturnValue({
        jsHeapSizeMB: 100,
        totalMemoryMB: 200
      });
      
      ImageCacheManager.getStats = jest.fn().mockReturnValue({
        thumbnailCount: 5,
        originalCount: 3,
        memoryUsageMB: "10.50"
      });
      
      // 获取内存统计
      const stats = PhotoService.getMemoryStats();
      
      // 验证结果
      expect(stats).toBeDefined();
      expect(stats.cleared).toBe(true);
      expect(stats.jsHeapSizeMB).toBe(100);
      expect(stats.totalMemoryMB).toBe(200);
      expect(stats.thumbnailCount).toBe(5);
      expect(stats.originalCount).toBe(3);
      expect(stats.totalPhotoCacheMB).toBe("10.50");
      
      // 恢复原始方法
      MemoryManager.getMemoryInfo = originalGetMemoryInfo;
      ImageCacheManager.getStats = originalGetStats;
    });
    
    test('cleanupCache应该正确调用缓存清理方法', () => {
      // 模拟ImageCacheManager方法
      const originalCleanup = ImageCacheManager.cleanup;
      const originalClearCache = ImageCacheManager.clearCache;
      
      ImageCacheManager.cleanup = jest.fn();
      ImageCacheManager.clearCache = jest.fn();
      
      // 测试普通清理
      PhotoService.cleanupCache();
      expect(ImageCacheManager.cleanup).toHaveBeenCalled();
      expect(ImageCacheManager.clearCache).not.toHaveBeenCalled();
      
      // 重置模拟
      jest.clearAllMocks();
      
      // 测试强制清理
      PhotoService.cleanupCache({ force: true });
      expect(ImageCacheManager.clearCache).toHaveBeenCalled();
      expect(ImageCacheManager.cleanup).not.toHaveBeenCalled();
      
      // 恢复原始方法
      ImageCacheManager.cleanup = originalCleanup;
      ImageCacheManager.clearCache = originalClearCache;
    });
  });
  
  describe('服务容器集成测试', () => {
    test('应正确通过服务容器初始化和获取StorageService', () => {
      // 重置容器
      ServiceContainer.reset();
      
      // 注册存储服务
      ServiceContainer.register('storageService', (container) => {
        return StorageService.init(container);
      });
      
      // 获取服务
      const storageService = ServiceContainer.get('storageService');
      
      // 验证
      expect(storageService).toBeDefined();
      expect(storageService.isInitialized).toBe(true);
    });
    
    test('PhotoService应能通过容器获取StorageService', () => {
      // 重置容器
      ServiceContainer.reset();
      
      // 注册存储服务
      ServiceContainer.register('storageService', (container) => {
        return StorageService.init(container);
      });
      
      // 注册照片服务
      ServiceContainer.register('photoService', (container) => {
        return PhotoService.init(container);
      });
      
      // 获取服务
      const photoService = ServiceContainer.get('photoService');
      
      // 验证
      expect(photoService).toBeDefined();
      expect(photoService.container).toBeDefined();
      
      // 测试获取存储服务
      const storageService = photoService.container.get('storageService');
      expect(storageService).toBeDefined();
      expect(storageService.isInitialized).toBe(true);
    });
  });
});

// 执行测试
if (require.main === module) {
  console.log('开始执行核心服务模块测试...');
  
  // 这里可以添加手动执行逻辑，如果需要的话
  // 因为Jest通常会自动发现和执行测试
  
  console.log('测试完成！');
} 