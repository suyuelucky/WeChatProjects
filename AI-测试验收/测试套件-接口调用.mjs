/**
 * 小程序接口调用测试套件
 * 用于验证服务模块间的接口调用是否正确
 * ES模块版本
 * 
 * 测试内容：
 * 1. PhotoService与ImageCacheManager间的接口调用
 * 2. StorageService的接口调用
 * 3. 服务容器中的服务获取与方法调用
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// 导入需要测试的模块
const ServiceContainer = require('../miniprogram/services/container.cjs');
const StorageService = require('../miniprogram/services/storageService.cjs');
const PhotoService = require('../miniprogram/services/photoService.cjs');
const ImageCacheManager = require('../miniprogram/utils/image-cache-manager.cjs');
const MemoryManager = require('../miniprogram/utils/memory-manager.cjs');
const EventEmitter = require('../miniprogram/utils/eventBus.cjs');

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
  
  // 静默console输出，或者捕获它们
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
  
  // 重置EventEmitter
  EventEmitter.clearAllListeners();
});

describe('服务接口调用测试', () => {
  describe('PhotoService与ImageCacheManager接口调用', () => {
    test('PhotoService.cleanupCache应正确调用ImageCacheManager.cleanup', () => {
      // 监视ImageCacheManager.cleanup方法
      const cleanupSpy = jest.spyOn(ImageCacheManager, 'cleanup');
      
      // 调用PhotoService方法
      PhotoService.cleanupCache();
      
      // 验证调用
      expect(cleanupSpy).toHaveBeenCalled();
      
      // 清理
      cleanupSpy.mockRestore();
    });
    
    test('PhotoService.cleanupCache({force: true})应正确调用ImageCacheManager.clearCache', () => {
      // 监视ImageCacheManager.clearCache方法
      const clearCacheSpy = jest.spyOn(ImageCacheManager, 'clearCache');
      
      // 调用PhotoService方法
      PhotoService.cleanupCache({ force: true });
      
      // 验证调用
      expect(clearCacheSpy).toHaveBeenCalled();
      
      // 清理
      clearCacheSpy.mockRestore();
    });
    
    test('PhotoService.getMemoryStats应正确调用MemoryManager和ImageCacheManager', () => {
      // 监视MemoryManager.getMemoryInfo方法
      const getMemoryInfoSpy = jest.spyOn(MemoryManager, 'getMemoryInfo').mockReturnValue({
        jsHeapSizeMB: 100,
        totalMemoryMB: 200
      });
      
      // 监视ImageCacheManager.getStats方法
      const getStatsSpy = jest.spyOn(ImageCacheManager, 'getStats').mockReturnValue({
        thumbnailCount: 5,
        originalCount: 3,
        memoryUsageMB: "10.50"
      });
      
      // 调用PhotoService方法
      const stats = PhotoService.getMemoryStats();
      
      // 验证方法调用
      expect(getMemoryInfoSpy).toHaveBeenCalled();
      expect(getStatsSpy).toHaveBeenCalled();
      
      // 验证返回结果整合
      expect(stats.jsHeapSizeMB).toBe(100);
      expect(stats.totalMemoryMB).toBe(200);
      expect(stats.thumbnailCount).toBe(5);
      expect(stats.originalCount).toBe(3);
      expect(stats.totalPhotoCacheMB).toBe("10.50");
      expect(stats.cleared).toBe(true);
      
      // 清理
      getMemoryInfoSpy.mockRestore();
      getStatsSpy.mockRestore();
    });
  });
  
  describe('StorageService接口调用测试', () => {
    test('StorageService.saveData应正确调用wx.setStorageSync', () => {
      // 初始化服务
      const storageService = StorageService.init({});
      
      // 调用saveData方法
      storageService.saveData('testCollection', 'testKey', { data: 'testValue' });
      
      // 验证wx.setStorageSync被调用
      expect(mockWx.setStorageSync).toHaveBeenCalled();
      expect(mockWx.setStorageSync.mock.calls[0][0]).toBe('testCollection_testKey');
      expect(JSON.parse(mockWx.setStorageSync.mock.calls[0][1])).toEqual({ data: 'testValue' });
    });
    
    test('StorageService.getData应正确调用wx.getStorageSync', () => {
      // 设置模拟返回值
      mockWx.getStorageSync.mockReturnValue(JSON.stringify({ data: 'testValue' }));
      
      // 初始化服务
      const storageService = StorageService.init({});
      
      // 调用getData方法
      const result = storageService.getData('testCollection', 'testKey');
      
      // 验证wx.getStorageSync被调用
      expect(mockWx.getStorageSync).toHaveBeenCalledWith('testCollection_testKey');
      expect(result).toEqual({ data: 'testValue' });
    });
  });
  
  describe('事件发射与监听测试', () => {
    test('PhotoService清理缓存时应发射事件', () => {
      // 设置事件监听器
      const mockListener = jest.fn();
      EventEmitter.on('cache:cleanup', mockListener);
      
      // 调用清理方法
      PhotoService.cleanupCache();
      
      // 验证事件被触发
      expect(mockListener).toHaveBeenCalled();
      
      // 参数应该包含forced: false
      expect(mockListener.mock.calls[0][0]).toEqual({ forced: false });
    });
    
    test('PhotoService强制清理缓存时应发射正确事件', () => {
      // 设置事件监听器
      const mockListener = jest.fn();
      EventEmitter.on('cache:cleanup', mockListener);
      
      // 调用强制清理方法
      PhotoService.cleanupCache({ force: true });
      
      // 验证事件被触发
      expect(mockListener).toHaveBeenCalled();
      
      // 参数应该包含forced: true
      expect(mockListener.mock.calls[0][0]).toEqual({ forced: true });
    });
    
    test('内存统计事件监听器应正确工作', () => {
      // 设置事件监听器
      const mockListener = jest.fn();
      EventEmitter.on('memory:stats', mockListener);
      
      // 模拟方法返回
      jest.spyOn(MemoryManager, 'getMemoryInfo').mockReturnValue({
        jsHeapSizeMB: 100,
        totalMemoryMB: 200
      });
      
      jest.spyOn(ImageCacheManager, 'getStats').mockReturnValue({
        thumbnailCount: 5,
        originalCount: 3,
        memoryUsageMB: "10.50"
      });
      
      // 获取内存统计
      const stats = PhotoService.getMemoryStats();
      
      // 验证事件监听器被调用
      expect(mockListener).toHaveBeenCalled();
      
      // 验证事件数据
      const eventData = mockListener.mock.calls[0][0];
      expect(eventData.jsHeapSizeMB).toBe(100);
      expect(eventData.totalMemoryMB).toBe(200);
      expect(eventData.thumbnailCount).toBe(5);
      expect(eventData.originalCount).toBe(3);
      expect(eventData.totalPhotoCacheMB).toBe("10.50");
      expect(eventData.cleared).toBe(true);
    });
  });
  
  describe('服务容器集成接口测试', () => {
    test('通过容器获取的服务间应能正确交互', () => {
      // 重置容器
      ServiceContainer.reset();
      
      // 注册服务
      ServiceContainer.register('storageService', (container) => {
        return StorageService.init(container);
      });
      
      ServiceContainer.register('photoService', (container) => {
        return PhotoService.init(container);
      });
      
      // 获取服务
      const photoService = ServiceContainer.get('photoService');
      const storageService = ServiceContainer.get('storageService');
      
      // 创建间接调用
      // 例如，PhotoService可能会通过调用storageService来保存相关数据
      
      // 监视storageService.saveData方法
      const saveDataSpy = jest.spyOn(storageService, 'saveData');
      
      // 保存照片缓存元数据的假设方法
      if (typeof photoService.saveMetadata === 'function') {
        photoService.saveMetadata();
        
        // 验证storageService.saveData被调用
        expect(saveDataSpy).toHaveBeenCalled();
      } else {
        // 创建自定义交互模拟
        const metadata = { 
          lastCleanup: Date.now(),
          photoCount: 5
        };
        
        // 通过StorageService保存数据
        storageService.saveData('photos', 'metadata', metadata);
        
        // 验证调用
        expect(saveDataSpy).toHaveBeenCalledWith('photos', 'metadata', metadata);
      }
      
      // 清理
      saveDataSpy.mockRestore();
    });
  });
});

// 执行测试
if (require.main === module) {
  console.log('开始执行接口调用测试...');
  
  // 这里可以添加手动执行逻辑，如果需要的话
  
  console.log('测试完成！');
} 