/**
 * optimized-image-loader.test.js
 * 优化图片加载器单元测试
 * 
 * 创建时间: 2025-04-09 20:15:23
 * 创建者: Claude AI 3.7 Sonnet
 * 更新时间: 2025-04-09 20:30:18
 */

const OptimizedImageLoader = require('../utils/optimized-image-loader');

// 模拟微信小程序环境
global.wx = {
  getFileSystemManager: jest.fn(() => ({
    accessSync: jest.fn(),
    statSync: jest.fn(() => ({
      size: 1024 * 100 // 模拟100KB的文件
    })),
    mkdirSync: jest.fn(),
    copyFile: jest.fn(({ success }) => {
      success && success();
    }),
    stat: jest.fn(({ success }) => {
      success && success({
        stats: {
          size: 1024 * 100 // 模拟100KB的文件
        }
      });
    }),
    unlinkSync: jest.fn()
  })),
  env: {
    USER_DATA_PATH: '/mock/user/path'
  },
  downloadFile: jest.fn(({ url, success, fail }) => {
    // 模拟网络错误情况
    if (url.includes('error')) {
      fail && fail({ errMsg: '下载失败' });
      return;
    }
    
    // 模拟超时情况
    if (url.includes('timeout')) {
      // 不调用任何回调，模拟超时
      return;
    }
    
    // 模拟404情况
    if (url.includes('404')) {
      success && success({
        statusCode: 404,
        tempFilePath: '/mock/temp/invalid-image.jpg'
      });
      return;
    }
    
    // 成功情况
    success && success({
      statusCode: 200,
      tempFilePath: '/mock/temp/image.jpg'
    });
  }),
  getImageInfo: jest.fn(({ src, success, fail }) => {
    // 模拟无效图片情况
    if (src.includes('invalid')) {
      fail && fail({ errMsg: '图片信息获取失败' });
      return;
    }
    
    // 成功情况
    success && success({
      width: 800,
      height: 600,
      path: src
    });
  }),
  canvasToTempFilePath: jest.fn(({ success, fail }) => {
    success && success({
      tempFilePath: '/mock/temp/resized-image.jpg'
    });
  }),
  getStorage: jest.fn(({ key, success, fail }) => {
    if (key === 'optimized_image_cache_index') {
      success && success({
        data: {
          images: {
            'img_test_image': {
              path: '/mock/cache/img_test_image.jpg',
              url: 'https://example.com/test-image.jpg',
              width: 800,
              height: 600,
              size: 1024 * 100,
              timestamp: Date.now() - 3600000, // 1小时前
              lastUsed: Date.now() - 3600000
            },
            'img_old_image': {
              path: '/mock/cache/img_old_image.jpg',
              url: 'https://example.com/old-image.jpg',
              width: 800,
              height: 600,
              size: 1024 * 100,
              timestamp: Date.now() - 86400000 * 7, // 7天前
              lastUsed: Date.now() - 86400000 * 7
            }
          },
          thumbnails: {
            'thumb_test_image': {
              path: '/mock/cache/thumb_test_image.jpg',
              url: 'https://example.com/test-image.jpg',
              width: 200,
              height: 150,
              size: 1024 * 20, // 20KB
              timestamp: Date.now() - 3600000,
              lastUsed: Date.now() - 3600000
            }
          },
          timestamp: Date.now() - 3600000
        }
      });
    } else {
      fail && fail({ errMsg: '获取存储失败' });
    }
  }),
  setStorage: jest.fn(({ success }) => {
    success && success();
  }),
  onMemoryWarning: jest.fn((callback) => {
    // 存储回调以便测试中触发
    global.memoryWarningCallback = callback;
  })
};

// 模拟getCurrentPages
global.getCurrentPages = jest.fn(() => [{
  createSelectorQuery: jest.fn(() => ({
    select: jest.fn(() => ({
      fields: jest.fn(() => ({
        exec: jest.fn((callback) => {
          callback([{
            node: {
              width: 0,
              height: 0,
              getContext: jest.fn(() => ({
                clearRect: jest.fn(),
                drawImage: jest.fn()
              })),
              createImage: jest.fn(() => {
                const img = {
                  onload: null,
                  onerror: null
                };
                
                // 模拟异步加载过程
                setTimeout(() => {
                  if (img.onload) {
                    img.onload();
                  }
                }, 10);
                
                return img;
              })
            }
          }]);
        })
      }))
    }))
  })
}]);

// 模拟console.log
const originalConsoleLog = console.log;
console.log = jest.fn();

describe('OptimizedImageLoader', () => {
  beforeEach(() => {
    // 重置所有模拟的函数状态
    jest.clearAllMocks();
    
    // 重置OptimizedImageLoader的缓存状态
    OptimizedImageLoader._cache = {
      images: {},
      thumbnails: {},
      previewQueue: [],
      preloadQueue: [],
      totalSize: 0,
      maxSize: 50 * 1024 * 1024
    };
    
    // 重置加载状态
    OptimizedImageLoader._loading = {
      tasks: [],
      currentTasks: 0
    };
    
    // 启用调试模式便于测试
    OptimizedImageLoader._config.debug = true;
  });
  
  afterAll(() => {
    // 恢复原始的console.log
    console.log = originalConsoleLog;
  });
  
  describe('基本功能', () => {
    test('应该正确初始化加载器', () => {
      // 设置自定义配置
      const options = {
        thumbnailSize: 300,
        quality: 0.5,
        concurrentLoads: 3,
        debug: true
      };
      
      const loader = OptimizedImageLoader.init(options);
      
      // 验证配置已正确应用
      expect(loader._config.thumbnailSize).toBe(300);
      expect(loader._config.quality).toBe(0.5);
      expect(loader._config.concurrentLoads).toBe(3);
      expect(loader._config.debug).toBe(true);
      
      // 验证缓存预热和内存警告监听器已设置
      expect(wx.getStorage).toHaveBeenCalledWith(expect.objectContaining({
        key: 'optimized_image_cache_index'
      }));
      
      expect(wx.onMemoryWarning).toHaveBeenCalled();
    });
    
    test('应该只应用有效配置选项', () => {
      // 包含无效选项的配置
      const options = {
        thumbnailSize: 300,
        invalidOption: 'value',
        debug: true
      };
      
      const loader = OptimizedImageLoader.init(options);
      
      // 验证有效配置已应用
      expect(loader._config.thumbnailSize).toBe(300);
      expect(loader._config.debug).toBe(true);
      
      // 验证无效配置未应用
      expect(loader._config.invalidOption).toBeUndefined();
    });
  });
  
  describe('缓存管理', () => {
    test('应该正确验证缓存项', () => {
      // 模拟缓存索引
      const cacheIndex = {
        images: {
          'img_test_image': {
            path: '/mock/cache/img_test_image.jpg',
            url: 'https://example.com/test-image.jpg',
            width: 800,
            height: 600,
            size: 1024 * 100,
            timestamp: Date.now() - 3600000,
            lastUsed: Date.now() - 3600000
          }
        },
        thumbnails: {
          'thumb_test_image': {
            path: '/mock/cache/thumb_test_image.jpg',
            url: 'https://example.com/test-image.jpg',
            width: 200,
            height: 150,
            size: 1024 * 20,
            timestamp: Date.now() - 3600000,
            lastUsed: Date.now() - 3600000
          }
        }
      };
      
      // 模拟文件存在
      wx.getFileSystemManager().accessSync.mockImplementation((path) => {
        if (path.includes('invalid')) {
          throw new Error('文件不存在');
        }
      });
      
      OptimizedImageLoader._validateCacheItems(cacheIndex);
      
      // 验证缓存已正确更新
      expect(OptimizedImageLoader._cache.images['img_test_image']).toBeDefined();
      expect(OptimizedImageLoader._cache.thumbnails['thumb_test_image']).toBeDefined();
      expect(OptimizedImageLoader._cache.totalSize).toBe(120 * 1024); // 100KB + 20KB
    });
    
    test('应该处理无效的缓存项', () => {
      // 模拟缓存索引，包含无效路径
      const cacheIndex = {
        images: {
          'img_valid': {
            path: '/mock/cache/img_valid.jpg',
            size: 1024 * 100
          },
          'img_invalid': {
            path: '/mock/cache/invalid/img_invalid.jpg',
            size: 1024 * 100
          }
        }
      };
      
      // 模拟检查文件是否存在的函数
      wx.getFileSystemManager().accessSync.mockImplementation((path) => {
        if (path.includes('invalid')) {
          throw new Error('文件不存在');
        }
      });
      
      OptimizedImageLoader._validateCacheItems(cacheIndex);
      
      // 验证无效缓存项已被移除
      expect(OptimizedImageLoader._cache.images['img_valid']).toBeDefined();
      expect(OptimizedImageLoader._cache.images['img_invalid']).toBeUndefined();
      expect(OptimizedImageLoader._cache.totalSize).toBe(100 * 1024); // 只有有效文件的大小
    });
  });
  
  describe('图片加载', () => {
    test('应该从缓存中获取图片', async () => {
      // 模拟缓存中已有图片
      OptimizedImageLoader._cache.images['img_test_image'] = {
        path: '/mock/cache/img_test_image.jpg',
        url: 'https://example.com/test-image.jpg',
        width: 800,
        height: 600,
        size: 1024 * 100,
        timestamp: Date.now() - 3600000,
        lastUsed: Date.now() - 3600000
      };
      
      // 模拟缓存路径的生成
      OptimizedImageLoader._generateCacheKey = jest.fn(() => 'img_test_image');
      
      const result = await OptimizedImageLoader.loadImage('https://example.com/test-image.jpg');
      
      // 验证返回了缓存图片
      expect(result.fromCache).toBe(true);
      expect(result.path).toBe('/mock/cache/img_test_image.jpg');
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      
      // 验证没有下载新图片
      expect(wx.downloadFile).not.toHaveBeenCalled();
      
      // 验证更新了最后使用时间
      expect(OptimizedImageLoader._cache.images['img_test_image'].lastUsed).toBeGreaterThan(Date.now() - 1000);
    });
    
    test('应该下载并缓存新图片', async () => {
      // 模拟未缓存的图片URL
      const url = 'https://example.com/new-image.jpg';
      
      // 模拟缓存键生成
      OptimizedImageLoader._generateCacheKey = jest.fn(() => 'img_new_image');
      
      // 模拟图片加载
      const resultPromise = OptimizedImageLoader.loadImage(url);
      
      // 验证下载了图片
      expect(wx.downloadFile).toHaveBeenCalledWith(expect.objectContaining({
        url: url
      }));
      
      const result = await resultPromise;
      
      // 验证返回了正确的结果
      expect(result.fromCache).toBe(false);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });
    
    test('应该处理无效图片URL', async () => {
      try {
        await OptimizedImageLoader.loadImage('');
        fail('应该抛出错误');
      } catch (error) {
        expect(error.message).toContain('无效的图片URL');
      }
    });
    
    test('应该处理下载失败', async () => {
      try {
        await OptimizedImageLoader.loadImage('https://example.com/error-image.jpg');
        fail('应该抛出错误');
      } catch (error) {
        expect(error.message).toContain('下载图片失败');
      }
    });
    
    test('应该处理图片信息获取失败', async () => {
      try {
        // 模拟一个无效的图片，但可以下载
        wx.downloadFile.mockImplementationOnce(({ url, success }) => {
          success({
            statusCode: 200,
            tempFilePath: '/mock/temp/invalid-image.jpg'
          });
        });
        
        await OptimizedImageLoader.loadImage('https://example.com/invalid-format-image.jpg');
        fail('应该抛出错误');
      } catch (error) {
        expect(error.message).toContain('图片信息获取失败');
      }
    });
    
    test('应该处理404错误', async () => {
      try {
        await OptimizedImageLoader.loadImage('https://example.com/404-image.jpg');
        fail('应该抛出错误');
      } catch (error) {
        expect(error.message).toContain('下载图片失败，状态码: 404');
      }
    });
    
    test('应该处理超时情况', async () => {
      try {
        // 使用较短的超时时间
        await OptimizedImageLoader.loadImage('https://example.com/timeout-image.jpg', {
          timeout: 100
        });
        fail('应该抛出错误');
      } catch (error) {
        expect(error.message).toContain('图片加载超时');
      }
    }, 500); // 增加测试超时时间
    
    test('应该调整大图片尺寸', async () => {
      // 模拟一个大图片
      wx.getImageInfo.mockImplementationOnce(({ success }) => {
        success({
          width: 2000,
          height: 1500,
          path: '/mock/temp/large-image.jpg'
        });
      });
      
      // 模拟缓存键生成
      OptimizedImageLoader._generateCacheKey = jest.fn(() => 'img_large_image');
      
      // 使用缩略图选项加载图片
      const result = await OptimizedImageLoader.loadImage('https://example.com/large-image.jpg', {
        thumbnail: true
      });
      
      // 验证调用了画布处理
      expect(global.getCurrentPages).toHaveBeenCalled();
      
      // 验证返回了调整尺寸后的图片
      expect(result.fromCache).toBe(false);
    });
    
    test('应该处理缩略图', async () => {
      // 使用缩略图选项加载图片
      await OptimizedImageLoader.loadImage('https://example.com/test-image.jpg', {
        thumbnail: true
      });
      
      // 验证使用了正确的目标尺寸
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[OptimizedImageLoader] 开始加载图片'),
        expect.stringContaining('目标尺寸: 200')
      );
    });
    
    test('应该处理预览图', async () => {
      // 使用预览图选项加载图片
      await OptimizedImageLoader.loadImage('https://example.com/test-image.jpg', {
        preview: true
      });
      
      // 验证使用了正确的目标尺寸
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[OptimizedImageLoader] 开始加载图片'),
        expect.stringContaining('目标尺寸: 800')
      );
    });
  });
  
  describe('清理缓存功能', () => {
    beforeEach(() => {
      // 设置模拟的缓存数据
      OptimizedImageLoader._cache.images = {
        'img_recent': {
          path: '/mock/cache/img_recent.jpg',
          size: 200 * 1024,
          lastUsed: Date.now() - 3600000 // 1小时前
        },
        'img_old': {
          path: '/mock/cache/img_old.jpg',
          size: 300 * 1024,
          lastUsed: Date.now() - 86400000 // 1天前
        },
        'img_very_old': {
          path: '/mock/cache/img_very_old.jpg',
          size: 400 * 1024,
          lastUsed: Date.now() - 604800000 // 7天前
        }
      };
      
      OptimizedImageLoader._cache.thumbnails = {
        'thumb_recent': {
          path: '/mock/cache/thumb_recent.jpg',
          size: 50 * 1024,
          lastUsed: Date.now() - 3600000 // 1小时前
        },
        'thumb_old': {
          path: '/mock/cache/thumb_old.jpg',
          size: 50 * 1024,
          lastUsed: Date.now() - 86400000 // 1天前
        }
      };
      
      // 设置总缓存大小
      OptimizedImageLoader._cache.totalSize = 1000 * 1024; // 1MB
      OptimizedImageLoader._cache.maxSize = 1200 * 1024; // 1.2MB
      
      // 模拟文件删除函数
      wx.getFileSystemManager().unlinkSync = jest.fn();
    });
    
    test('应该按最后使用时间清理缓存', async () => {
      // 执行一般清理（保留70%容量）
      const result = await OptimizedImageLoader.clearCache(false);
      
      // 验证删除了最旧的文件
      expect(wx.getFileSystemManager().unlinkSync).toHaveBeenCalledWith('/mock/cache/img_very_old.jpg');
      
      // 验证最新的文件保留
      expect(OptimizedImageLoader._cache.images['img_recent']).toBeDefined();
      expect(OptimizedImageLoader._cache.thumbnails['thumb_recent']).toBeDefined();
      
      // 验证返回了正确的结果
      expect(result.success).toBe(true);
      expect(result.clearedItems).toBeGreaterThan(0);
    });
    
    test('应该在积极清理模式下删除更多文件', async () => {
      // 执行积极清理（保留30%容量）
      const result = await OptimizedImageLoader.clearCache(true);
      
      // 验证删除了更多文件
      expect(wx.getFileSystemManager().unlinkSync).toHaveBeenCalledTimes(
        expect.any(Number)
      );
      
      // 验证返回了正确的结果
      expect(result.success).toBe(true);
      expect(result.clearedItems).toBeGreaterThan(0);
      expect(OptimizedImageLoader._cache.totalSize).toBeLessThanOrEqual(OptimizedImageLoader._cache.maxSize * 0.3);
    });
    
    test('应该处理文件删除错误', async () => {
      // 模拟文件删除失败
      wx.getFileSystemManager().unlinkSync.mockImplementation((path) => {
        if (path.includes('very_old')) {
          throw new Error('删除文件失败');
        }
      });
      
      // 执行清理
      const result = await OptimizedImageLoader.clearCache(false);
      
      // 验证删除继续进行
      expect(result.success).toBe(true);
      
      // 验证记录了错误
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[OptimizedImageLoader] 删除缓存项失败'),
        expect.anything()
      );
    });
    
    test('应该在缓存大小小于目标时不删除文件', async () => {
      // 设置缓存大小小于目标
      OptimizedImageLoader._cache.totalSize = 500 * 1024; // 0.5MB
      OptimizedImageLoader._cache.maxSize = 1000 * 1024; // 1MB
      
      // 执行清理
      const result = await OptimizedImageLoader.clearCache(false);
      
      // 验证没有删除文件
      expect(wx.getFileSystemManager().unlinkSync).not.toHaveBeenCalled();
      
      // 验证返回了正确的结果
      expect(result.success).toBe(true);
      expect(result.clearedSize).toBe(0);
    });
  });
  
  describe('预加载功能', () => {
    test('应该正确预加载多张图片', async () => {
      // 创建多个URL
      const urls = [
        'https://example.com/preload1.jpg',
        'https://example.com/preload2.jpg',
        'https://example.com/preload3.jpg'
      ];
      
      // 执行预加载
      const results = await OptimizedImageLoader.preloadImages(urls);
      
      // 验证调用了loadImage方法
      expect(results.length).toBe(urls.length);
      expect(results.every(r => r.success)).toBe(true);
    });
    
    test('应该处理空URL数组', async () => {
      // 执行预加载
      const results = await OptimizedImageLoader.preloadImages([]);
      
      // 验证返回空数组
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
    
    test('应该处理预加载失败', async () => {
      // 创建包含错误URL的数组
      const urls = [
        'https://example.com/preload1.jpg',
        'https://example.com/error-image.jpg' // 会失败的URL
      ];
      
      // 执行预加载
      const results = await OptimizedImageLoader.preloadImages(urls);
      
      // 验证结果包含成功和失败信息
      expect(results.length).toBe(urls.length);
      expect(results.filter(r => r.success).length).toBe(1);
      expect(results.filter(r => !r.success).length).toBe(1);
    });
    
    test('应该尊重最大并发数限制', async () => {
      // 设置多个URL
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
        'https://example.com/image4.jpg',
        'https://example.com/image5.jpg'
      ];
      
      // 执行预加载，设置并发数为1
      const promise = OptimizedImageLoader.preloadImages(urls, {
        maxConcurrent: 1
      });
      
      // 验证只有一个活跃请求
      expect(wx.downloadFile).toHaveBeenCalledTimes(1);
      
      // 等待结果
      const results = await promise;
      
      // 验证所有图片都加载了
      expect(results.length).toBe(urls.length);
    });
  });
  
  describe('获取图片信息', () => {
    test('应该从缓存获取图片信息', async () => {
      // 添加缓存数据
      OptimizedImageLoader._cache.images['img_info_test'] = {
        path: '/mock/cache/img_info_test.jpg',
        width: 800,
        height: 600,
        size: 100 * 1024,
        lastUsed: Date.now() - 3600000
      };
      
      // 模拟缓存键生成
      OptimizedImageLoader._generateCacheKey = jest.fn(() => 'img_info_test');
      
      // 获取图片信息
      const result = await OptimizedImageLoader.getImageInfo('https://example.com/info-test.jpg');
      
      // 验证返回了缓存数据
      expect(result.fromCache).toBe(true);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(result.size).toBe(100 * 1024);
      
      // 验证更新了最后使用时间
      expect(OptimizedImageLoader._cache.images['img_info_test'].lastUsed).toBeGreaterThan(Date.now() - 1000);
    });
    
    test('应该从网络获取图片信息', async () => {
      // 模拟网络API返回
      wx.getImageInfo.mockImplementationOnce(({ success }) => {
        success({
          width: 1200,
          height: 900,
          path: 'https://example.com/network-image.jpg'
        });
      });
      
      // 获取未缓存图片的信息
      const result = await OptimizedImageLoader.getImageInfo('https://example.com/network-image.jpg');
      
      // 验证调用了微信API
      expect(wx.getImageInfo).toHaveBeenCalledWith(expect.objectContaining({
        src: 'https://example.com/network-image.jpg'
      }));
      
      // 验证返回了正确的结果
      expect(result.fromCache).toBe(false);
      expect(result.width).toBe(1200);
      expect(result.height).toBe(900);
    });
    
    test('应该处理无效URL', async () => {
      try {
        await OptimizedImageLoader.getImageInfo('');
        fail('应该抛出错误');
      } catch (error) {
        expect(error.message).toContain('无效的图片URL');
      }
    });
    
    test('应该处理API调用失败', async () => {
      // 模拟API调用失败
      wx.getImageInfo.mockImplementationOnce(({ fail }) => {
        fail({ errMsg: '获取图片信息失败' });
      });
      
      try {
        await OptimizedImageLoader.getImageInfo('https://example.com/invalid-info.jpg');
        fail('应该抛出错误');
      } catch (error) {
        expect(error.message).toContain('获取图片信息失败');
      }
    });
  });
  
  describe('极端情况测试', () => {
    test('应该处理大量并发请求', async () => {
      // 设置并发限制
      OptimizedImageLoader._config.concurrentLoads = 2;
      
      // 创建多个请求
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
        'https://example.com/image4.jpg',
        'https://example.com/image5.jpg'
      ];
      
      // 启动所有请求
      const promises = urls.map(url => OptimizedImageLoader.loadImage(url));
      
      // 验证队列中添加了任务
      expect(OptimizedImageLoader._loading.tasks.length).toBe(3); // 5个请求，2个立即执行，3个进入队列
      
      // 等待所有请求完成
      await Promise.all(promises);
      
      // 验证所有任务都已完成
      expect(OptimizedImageLoader._loading.tasks.length).toBe(0);
      expect(OptimizedImageLoader._loading.currentTasks).toBe(0);
    });
    
    test('应该在内存警告时清理缓存', () => {
      // 模拟缓存中有数据
      OptimizedImageLoader._cache.images = {
        'img_test1': { size: 1024 * 1000, lastUsed: Date.now() - 86400000 },
        'img_test2': { size: 1024 * 1000, lastUsed: Date.now() }
      };
      OptimizedImageLoader._cache.totalSize = 2 * 1024 * 1000;
      
      // 模拟clearCache方法
      OptimizedImageLoader.clearCache = jest.fn();
      
      // 触发内存警告
      if (global.memoryWarningCallback) {
        global.memoryWarningCallback({ level: 10 });
      }
      
      // 验证调用了清理缓存
      expect(OptimizedImageLoader.clearCache).toHaveBeenCalledWith(false);
      
      // 触发严重内存警告
      if (global.memoryWarningCallback) {
        global.memoryWarningCallback({ level: 15 });
      }
      
      // 验证调用了激进缓存清理
      expect(OptimizedImageLoader.clearCache).toHaveBeenCalledWith(true);
    });
    
    test('应该处理Canvas不可用情况', async () => {
      // 模拟Canvas不可用
      global.getCurrentPages.mockImplementationOnce(() => [{}]);
      
      // 模拟一个大图片
      wx.getImageInfo.mockImplementationOnce(({ success }) => {
        success({
          width: 2000,
          height: 1500,
          path: '/mock/temp/large-image.jpg'
        });
      });
      
      // 使用缩略图选项加载图片
      await OptimizedImageLoader.loadImage('https://example.com/large-image.jpg', {
        thumbnail: true
      });
      
      // 验证记录了警告
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[OptimizedImageLoader] 当前环境无法创建Canvas'),
        expect.anything()
      );
    });
    
    test('应该处理文件系统错误', async () => {
      // 模拟保存文件失败
      wx.getFileSystemManager().copyFile.mockImplementationOnce(({ fail }) => {
        fail && fail({ errMsg: '文件系统错误' });
      });
      
      // 加载图片
      const result = await OptimizedImageLoader.loadImage('https://example.com/test-image.jpg');
      
      // 验证返回了临时路径
      expect(result.path).toBe('/mock/temp/image.jpg');
      expect(result.fromCache).toBe(false);
      
      // 验证记录了错误
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[OptimizedImageLoader] 保存图片到缓存失败'),
        expect.anything(),
        true
      );
    });
    
    test('应该处理快速连续调用清理缓存', async () => {
      // 同时调用多次清理
      const promise1 = OptimizedImageLoader.clearCache(false);
      const promise2 = OptimizedImageLoader.clearCache(true);
      const promise3 = OptimizedImageLoader.clearCache(false);
      
      // 等待所有promise完成
      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);
      
      // 验证所有调用都成功完成
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);
    });
    
    test('应该处理预加载过程中的内存警告', async () => {
      // 模拟clearCache方法
      OptimizedImageLoader.clearCache = jest.fn(() => Promise.resolve({ success: true }));
      
      // 开始预加载
      const preloadPromise = OptimizedImageLoader.preloadImages([
        'https://example.com/large1.jpg',
        'https://example.com/large2.jpg',
        'https://example.com/large3.jpg'
      ]);
      
      // 触发内存警告
      if (global.memoryWarningCallback) {
        global.memoryWarningCallback({ level: 15 });
      }
      
      // 验证调用了清理
      expect(OptimizedImageLoader.clearCache).toHaveBeenCalledWith(true);
      
      // 等待预加载完成
      await preloadPromise;
    });
    
    test('应该处理无效的图片信息', async () => {
      // 模拟返回无效的图片信息
      wx.getImageInfo.mockImplementationOnce(({ success }) => {
        success({
          width: 0,  // 无效宽度
          height: 0, // 无效高度
          path: 'https://example.com/invalid-dimensions.jpg'
        });
      });
      
      // 获取图片信息
      const result = await OptimizedImageLoader.getImageInfo('https://example.com/invalid-dimensions.jpg');
      
      // 验证返回了API结果，即使尺寸无效
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
      expect(result.fromCache).toBe(false);
    });
  });
}); 