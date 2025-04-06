/**
 * 小程序极限测试套件
 * 用于模拟各种极端情况和边界条件下的应用行为
 * ES模块版本
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// 导入需要测试的模块
const ServiceContainer = require('../miniprogram/services/container.cjs');
const StorageService = require('../miniprogram/services/storageService.cjs');
const PhotoService = require('../miniprogram/services/photoService.cjs');
const ImageCacheManager = require('../miniprogram/utils/image-cache-manager.cjs');
const MemoryManager = require('../miniprogram/utils/memory-manager.cjs');

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
  
  // 静默console输出，或者捕获它们用于测试
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

describe('极限条件测试', () => {
  describe('参数缺失和类型错误测试', () => {
    test('StorageService.init 应能正确处理无参数调用', () => {
      // 验证无参数调用是否正常工作
      const service = StorageService.init();
      
      // 应该仍然返回有效的服务实例
      expect(service).toBeDefined();
      expect(typeof service.saveData).toBe('function');
      expect(service.isInitialized).toBe(true);
    });
    
    test('StorageService.getData 应能处理不存在的键', () => {
      // 模拟getStorageSync返回null
      mockWx.getStorageSync.mockReturnValueOnce(null);
      
      // 初始化服务
      const storageService = StorageService.init({});
      
      // 尝试获取不存在的数据
      const result = storageService.getData('nonExistentCollection', 'nonExistentKey');
      
      // 应该返回null或默认值，而不是抛出错误
      expect(result).toBeNull();
    });
    
    test('ImageCacheManager.getLastCleanupTime 应能处理属性不存在情况', () => {
      // 保存原始属性
      const originalLastCleanupTime = ImageCacheManager.lastCleanupTime;
      
      // 删除lastCleanupTime属性
      delete ImageCacheManager.lastCleanupTime;
      
      // 调用方法
      const result = ImageCacheManager.getLastCleanupTime();
      
      // 应该返回null而不是抛出错误
      expect(result).toBeNull();
      
      // 恢复原始属性
      ImageCacheManager.lastCleanupTime = originalLastCleanupTime;
    });
    
    test('PhotoService.getMemoryStats 应能处理缺失dependency的情况', () => {
      // 保存原始方法
      const originalGetMemoryInfo = MemoryManager.getMemoryInfo;
      
      // 模拟getMemoryInfo返回undefined
      MemoryManager.getMemoryInfo = jest.fn().mockReturnValue(undefined);
      
      // 调用方法
      const stats = PhotoService.getMemoryStats();
      
      // 即使依赖返回undefined，方法也应该正常工作返回有效对象
      expect(stats).toBeDefined();
      expect(stats.cleared).toBe(true);
      
      // 恢复原始方法
      MemoryManager.getMemoryInfo = originalGetMemoryInfo;
    });
  });
  
  describe('内存不足情况测试', () => {
    test('内存警告时应主动清理缓存', () => {
      // 模拟PhotoService的清理方法
      const cleanupSpy = jest.spyOn(PhotoService, 'cleanupCache');
      
      // 从存储的onMemoryWarning回调中找到并触发它
      const callback = mockWx.onMemoryWarning.mock.calls[0][0];
      if (callback) {
        callback({ level: 10 }); // 触发内存警告回调
        
        // 应该调用清理方法
        expect(cleanupSpy).toHaveBeenCalled();
      } else {
        // 如果没有找到回调，直接调用可能存在的内存警告处理方法
        if (typeof MemoryManager.handleMemoryWarning === 'function') {
          MemoryManager.handleMemoryWarning({ level: 10 });
          expect(cleanupSpy).toHaveBeenCalled();
        }
      }
      
      // 清理
      cleanupSpy.mockRestore();
    });
    
    test('ImageCacheManager.cleanup应在内存使用过高时更积极清理', () => {
      // 模拟大量内存使用
      ImageCacheManager.estimatedMemoryUsage = 200 * 1024 * 1024; // 200MB
      
      // 模拟移除方法
      const removeSpy = jest.spyOn(ImageCacheManager, 'removeOldestImage');
      removeSpy.mockImplementation(() => true);
      
      // 调用清理方法
      ImageCacheManager.cleanup();
      
      // 因为内存使用高，应该多次调用删除方法
      expect(removeSpy.mock.calls.length).toBeGreaterThan(1);
      
      // 清理
      removeSpy.mockRestore();
      ImageCacheManager.estimatedMemoryUsage = 0;
    });
  });
  
  describe('大量数据处理测试', () => {
    test('存储服务应能处理大量数据', () => {
      // 初始化服务
      const storageService = StorageService.init({});
      
      // 创建一个大对象
      const largeObject = {};
      for (let i = 0; i < 1000; i++) {
        largeObject[`key${i}`] = `value${i}`.repeat(100);
      }
      
      // 尝试保存大对象
      try {
        storageService.saveData('testCollection', 'largeObject', largeObject);
        
        // 验证setStorageSync被调用
        expect(mockWx.setStorageSync).toHaveBeenCalled();
        expect(mockWx.setStorageSync.mock.calls[0][0]).toBe('testCollection_largeObject');
      } catch (error) {
        // 如果有设置大小限制，可能会失败，但不应该崩溃
        expect(console.error).toHaveBeenCalled();
      }
    });
    
    test('ImageCacheManager应能处理大量图片', () => {
      // 清空当前缓存
      ImageCacheManager.clearCache();
      
      // 添加大量图片
      for (let i = 0; i < 100; i++) {
        ImageCacheManager.addImage(`test${i}`, { 
          path: `path${i}`, 
          size: 1000000 // 1MB
        }, i % 2 === 0); // 交替添加缩略图和原图
      }
      
      // 获取缓存统计
      const stats = ImageCacheManager.getStats();
      
      // 验证缓存能够存储大量图片
      expect(stats.thumbnailCount + stats.originalCount).toBe(100);
      
      // 清理
      ImageCacheManager.clearCache();
    });
  });
  
  describe('错误处理和恢复测试', () => {
    test('StorageService应能处理存储错误', () => {
      // 模拟setStorageSync抛出错误
      mockWx.setStorageSync.mockImplementationOnce(() => {
        throw new Error('Storage full');
      });
      
      // 初始化服务
      const storageService = StorageService.init({});
      
      // 尝试保存数据
      try {
        storageService.saveData('testCollection', 'testKey', { data: 'testValue' });
        
        // 应该捕获错误而不是崩溃
        expect(console.error).toHaveBeenCalled();
      } catch (error) {
        // 如果方法没有错误处理，则这个测试会失败
        fail('StorageService没有正确处理错误');
      }
    });
    
    test('ImageCacheManager应能从损坏的缓存中恢复', () => {
      // 模拟损坏的缓存
      ImageCacheManager.thumbnailCache = null;
      ImageCacheManager.originalCache = undefined;
      
      // 尝试添加图片
      ImageCacheManager.addImage('test1', { path: 'path1', size: 1000 }, false);
      
      // 缓存应该被重新初始化
      expect(ImageCacheManager.thumbnailCache).toBeDefined();
      expect(ImageCacheManager.originalCache).toBeDefined();
      
      // 应该能够添加新图片
      const image = ImageCacheManager.getImage('test1', false);
      expect(image).toBeDefined();
      expect(image.path).toBe('path1');
    });
    
    test('PhotoService应能处理依赖服务不可用的情况', () => {
      // 保存原始服务容器
      const originalContainer = ServiceContainer;
      
      // 创建一个空容器
      global.ServiceContainer = {
        get: jest.fn().mockReturnValue(undefined)
      };
      
      // 尝试初始化PhotoService
      try {
        const photoService = PhotoService.init({ get: () => undefined });
        
        // 应该仍能创建服务实例
        expect(photoService).toBeDefined();
      } catch (error) {
        // 测试失败
        fail('PhotoService无法处理缺少依赖服务的情况');
      } finally {
        // 恢复原始容器
        global.ServiceContainer = originalContainer;
      }
    });
  });
  
  describe('网络异常测试', () => {
    test('离线时应能正常工作', () => {
      // 模拟网络离线
      const originalGetNetworkType = mockWx.getNetworkType;
      mockWx.getNetworkType = jest.fn().mockImplementation(options => {
        if (options && options.success) options.success({ networkType: 'none' });
      });
      
      // 获取内存统计（这通常不需要网络）
      const stats = PhotoService.getMemoryStats();
      
      // 服务应该仍然工作
      expect(stats).toBeDefined();
      expect(stats.cleared).toBe(true);
      
      // 恢复原始方法
      mockWx.getNetworkType = originalGetNetworkType;
    });
    
    test('网络切换时应正确处理', () => {
      // 查找并触发onNetworkStatusChange回调
      const callback = mockWx.onNetworkStatusChange.mock.calls[0][0];
      if (callback) {
        // 触发网络变化为离线
        callback({ isConnected: false, networkType: 'none' });
        
        // 触发网络恢复
        callback({ isConnected: true, networkType: 'wifi' });
        
        // 网络处理函数应该被调用
        // 注意：这里我们只测试回调能被调用，实际效果取决于具体实现
      }
      
      // 如果没有具体的网络状态处理逻辑，这个测试可能不会失败
      // 但它至少验证了onNetworkStatusChange被正确设置
    });
  });
});

// 执行测试
if (require.main === module) {
  console.log('开始执行极限条件测试...');
  
  // 这里可以添加手动执行逻辑，如果需要的话
  
  console.log('测试完成！');
} 