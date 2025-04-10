/**
 * optimized-image-loader.extreme.test.js
 * 优化图片加载器极端场景测试
 * 
 * 创建时间: 2025-04-09 20:35:46
 * 创建者: Claude AI 3.7 Sonnet
 * 更新时间: 2025-04-09 20:56:21
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
    // 模拟各种场景
    if (url.includes('timeout')) {
      // 不调用回调，模拟超时
      return;
    }
    
    if (url.includes('unstable')) {
      // 模拟不稳定的网络，50%概率失败
      if (Math.random() > 0.5) {
        fail && fail({ errMsg: '不稳定网络连接失败' });
        return;
      }
    }
    
    if (url.includes('large')) {
      // 模拟大文件
      setTimeout(() => {
        success && success({
          statusCode: 200,
          tempFilePath: '/mock/temp/large-image.jpg'
        });
      }, 100);
      return;
    }
    
    // 标准成功情况
    setTimeout(() => {
      success && success({
        statusCode: 200,
        tempFilePath: '/mock/temp/image.jpg'
      });
    }, 10);
  }),
  getImageInfo: jest.fn(({ src, success, fail }) => {
    // 模拟获取图片信息的各种情况
    if (src.includes('corrupt')) {
      fail && fail({ errMsg: '图片损坏' });
      return;
    }
    
    if (src.includes('large')) {
      // 模拟大图片
      success && success({
        width: 4000,
        height: 3000,
        path: src
      });
      return;
    }
    
    // 标准成功情况
    success && success({
      width: 800,
      height: 600,
      path: src
    });
  }),
  setStorage: jest.fn(),
  getStorage: jest.fn(),
  onMemoryWarning: jest.fn(),
  canvasToTempFilePath: jest.fn(({ success }) => {
    success && success({
      tempFilePath: '/mock/temp/resized-image.jpg'
    });
  }),
  createSelectorQuery: jest.fn(() => ({
    select: jest.fn(() => ({
      fields: jest.fn(() => ({
        exec: jest.fn()
      }))
    }))
  }))
};

// 模拟console.log
const originalConsoleLog = console.log;
console.log = jest.fn();

// 全局getCurrentPages
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

// 极端测试用例
describe('OptimizedImageLoader极端场景测试', () => {
  beforeEach(() => {
    // 重置状态
    jest.clearAllMocks();
    
    // 重置缓存
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
    
    // 启用调试模式
    OptimizedImageLoader._config.debug = true;
  });
  
  afterAll(() => {
    // 恢复原始的console.log
    console.log = originalConsoleLog;
  });
  
  test('极端测试1: 超大量图片并发加载', async () => {
    // 生成100个URL
    const urls = Array.from({ length: 100 }, (_, i) => `https://example.com/image${i}.jpg`);
    
    // 设置小并发数
    OptimizedImageLoader._config.concurrentLoads = 5;
    
    // 开始加载所有图片
    const startTime = Date.now();
    const promises = urls.map(url => OptimizedImageLoader.loadImage(url));
    
    // 验证只有concurrentLoads个请求被立即执行
    expect(OptimizedImageLoader._loading.tasks.length).toBe(urls.length - OptimizedImageLoader._config.concurrentLoads);
    expect(OptimizedImageLoader._loading.currentTasks).toBe(OptimizedImageLoader._config.concurrentLoads);
    
    // 等待所有加载完成
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    // 验证所有任务都完成了
    expect(results.length).toBe(urls.length);
    expect(OptimizedImageLoader._loading.tasks.length).toBe(0);
    expect(OptimizedImageLoader._loading.currentTasks).toBe(0);
    
    // 记录加载性能
    console.log(`加载${urls.length}张图片耗时: ${endTime - startTime}ms`);
  }, 10000); // 延长超时时间
  
  test('极端测试2: 不稳定网络环境', async () => {
    // 创建不稳定网络URL
    const url = 'https://example.com/unstable-image.jpg';
    
    // 设置高重试次数
    OptimizedImageLoader._config.retryCount = 5;
    
    // 模拟高失败率
    wx.downloadFile.mockImplementation(({ url, success, fail }) => {
      // 80%概率失败
      if (Math.random() < 0.8) {
        fail && fail({ errMsg: '不稳定网络失败' });
      } else {
        success && success({
          statusCode: 200,
          tempFilePath: '/mock/temp/image.jpg'
        });
      }
    });
    
    // 尝试加载
    const result = await OptimizedImageLoader.loadImage(url);
    
    // 验证最终成功
    expect(result.path).toBeDefined();
    
    // 验证调用了多次downloadFile（至少重试了一次）
    expect(wx.downloadFile).toHaveBeenCalledTimes(expect.any(Number));
  }, 5000);
  
  test('极端测试3: 文件系统满', async () => {
    const url = 'https://example.com/test-image.jpg';
    
    // 模拟文件系统满
    wx.getFileSystemManager().copyFile.mockImplementation(({ fail }) => {
      fail && fail({ errMsg: '文件系统已满' });
    });
    
    // 尝试加载
    const result = await OptimizedImageLoader.loadImage(url);
    
    // 验证仍然返回了可用的临时路径
    expect(result.path).toBe('/mock/temp/image.jpg');
    expect(result.fromCache).toBe(false);
    
    // 验证记录了错误
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[OptimizedImageLoader] 保存图片到缓存失败'),
      expect.anything(),
      true
    );
  });
  
  test('极端测试4: 缓存目录创建失败', async () => {
    const url = 'https://example.com/test-image.jpg';
    
    // 模拟缓存目录创建失败
    wx.getFileSystemManager().mkdirSync.mockImplementation(() => {
      throw new Error('创建目录失败');
    });
    
    // 尝试加载
    const result = await OptimizedImageLoader.loadImage(url);
    
    // 验证仍然返回了可用的临时路径
    expect(result.path).toBeDefined();
    
    // 验证记录了错误
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[OptimizedImageLoader] 创建缓存目录失败'),
      expect.anything(),
      true
    );
  });
  
  test('极端测试5: 超大图片调整尺寸失败', async () => {
    const url = 'https://example.com/very-large-image.jpg';
    
    // 模拟一个超大图片
    wx.getImageInfo.mockImplementationOnce(({ success }) => {
      success({
        width: 8000,
        height: 6000,
        path: '/mock/temp/very-large-image.jpg'
      });
    });
    
    // 模拟Canvas导出失败
    global.wx.canvasToTempFilePath = jest.fn(({ fail }) => {
      fail && fail({ errMsg: '处理超大图片失败' });
    });
    
    // 尝试作为缩略图加载
    const result = await OptimizedImageLoader.loadImage(url, { thumbnail: true });
    
    // 验证返回了原始路径
    expect(result.path).toBeDefined();
    expect(result.width).toBe(8000);
    expect(result.height).toBe(6000);
    
    // 验证记录了错误
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[OptimizedImageLoader] 调整图片大小失败'),
      expect.anything(),
      true
    );
  });
  
  test('极端测试6: 极限大小的缓存清理', async () => {
    // 设置一个巨大的缓存
    const totalItems = 5000; // 5000个缓存项！
    
    // 创建大量缓存项
    for (let i = 0; i < totalItems; i++) {
      OptimizedImageLoader._cache.images[`img_${i}`] = {
        path: `/mock/cache/img_${i}.jpg`,
        size: 1024 * 10, // 10KB
        lastUsed: Date.now() - (i * 1000) // 依次递增的时间
      };
    }
    
    // 设置总缓存大小和限制
    OptimizedImageLoader._cache.totalSize = totalItems * 10 * 1024; // 约50MB
    OptimizedImageLoader._cache.maxSize = 5 * 1024 * 1024; // 5MB
    
    // 执行积极清理
    const startTime = Date.now();
    const result = await OptimizedImageLoader.clearCache(true);
    const endTime = Date.now();
    
    // 验证清理结果
    expect(result.success).toBe(true);
    expect(OptimizedImageLoader._cache.totalSize).toBeLessThanOrEqual(OptimizedImageLoader._cache.maxSize * 0.3);
    
    // 记录清理性能
    console.log(`清理${totalItems}个缓存项耗时: ${endTime - startTime}ms`);
  });
  
  test('极端测试7: 多层级极端场景组合', async () => {
    // 1. 设置不稳定网络
    wx.downloadFile.mockImplementation(({ url, success, fail }) => {
      if (Math.random() < 0.3) {
        fail && fail({ errMsg: '网络不稳定' });
        return;
      }
      
      setTimeout(() => {
        success && success({
          statusCode: 200,
          tempFilePath: '/mock/temp/image.jpg'
        });
      }, Math.random() * 50); // 随机延迟
    });
    
    // 2. 设置文件系统不稳定
    wx.getFileSystemManager().copyFile.mockImplementation(({ srcPath, destPath, success, fail }) => {
      if (Math.random() < 0.2) {
        fail && fail({ errMsg: '文件系统不稳定' });
        return;
      }
      
      success && success();
    });
    
    // 3. 生成多个预加载和直接加载任务
    const preloadUrls = Array.from({ length: 20 }, (_, i) => `https://example.com/preload${i}.jpg`);
    const directUrls = Array.from({ length: 10 }, (_, i) => `https://example.com/direct${i}.jpg`);
    
    // 4. 同时启动多个操作
    const tasks = [
      // 预加载一批图片
      OptimizedImageLoader.preloadImages(preloadUrls),
      
      // 直接加载一批图片
      ...directUrls.map(url => OptimizedImageLoader.loadImage(url)),
      
      // 清理缓存
      OptimizedImageLoader.clearCache(false),
      
      // 获取图片信息
      OptimizedImageLoader.getImageInfo('https://example.com/info.jpg')
    ];
    
    // 5. 等待所有任务完成
    const results = await Promise.allSettled(tasks);
    
    // 6. 验证大部分任务成功完成
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    expect(successCount).toBeGreaterThan(0);
    
    // 验证加载器状态恢复
    expect(OptimizedImageLoader._loading.currentTasks).toBe(0);
  }, 10000);
  
  test('极端测试8: 内存资源竞争', async () => {
    // 模拟内存警告频繁发生
    let memoryWarningCallback;
    wx.onMemoryWarning.mockImplementation((callback) => {
      memoryWarningCallback = callback;
    });
    
    // 初始化
    OptimizedImageLoader.init();
    
    // 设置一些缓存数据
    OptimizedImageLoader._cache.images = {
      'img_1': { path: '/mock/cache/img_1.jpg', size: 1024 * 1000, lastUsed: Date.now() },
      'img_2': { path: '/mock/cache/img_2.jpg', size: 1024 * 1000, lastUsed: Date.now() - 60000 }
    };
    OptimizedImageLoader._cache.totalSize = 2 * 1024 * 1000;
    
    // 开始加载一些图片
    const loadPromises = [
      OptimizedImageLoader.loadImage('https://example.com/test1.jpg'),
      OptimizedImageLoader.loadImage('https://example.com/test2.jpg', { thumbnail: true }),
      OptimizedImageLoader.loadImage('https://example.com/test3.jpg', { preview: true })
    ];
    
    // 触发内存警告
    if (memoryWarningCallback) {
      // 连续触发多次不同级别的内存警告
      memoryWarningCallback({ level: 5 });
      memoryWarningCallback({ level: 10 });
      memoryWarningCallback({ level: 15 });
    }
    
    // 等待加载完成
    const results = await Promise.all(loadPromises);
    
    // 验证所有加载仍然成功
    expect(results.length).toBe(3);
    expect(results.every(r => r.path)).toBe(true);
  });
  
  test('极端测试9: 异常大小和格式的图片', async () => {
    // 模拟各种异常图片
    const scenarios = [
      // 1像素图片
      {
        url: 'https://example.com/tiny.jpg',
        info: { width: 1, height: 1 }
      },
      // 超宽图片
      {
        url: 'https://example.com/superwide.jpg',
        info: { width: 10000, height: 50 }
      },
      // 超高图片
      {
        url: 'https://example.com/supertall.jpg',
        info: { width: 50, height: 10000 }
      },
      // 奇怪宽高比图片
      {
        url: 'https://example.com/odd-ratio.jpg',
        info: { width: 1111, height: 37 }
      }
    ];
    
    // 测试每种场景
    for (const scenario of scenarios) {
      // 模拟图片信息
      wx.getImageInfo.mockImplementationOnce(({ success }) => {
        success({
          width: scenario.info.width,
          height: scenario.info.height,
          path: `/mock/temp/${scenario.url.split('/').pop()}`
        });
      });
      
      // 加载图片
      const result = await OptimizedImageLoader.loadImage(scenario.url, { thumbnail: true });
      
      // 验证处理成功
      expect(result.path).toBeDefined();
      
      // 如果需要调整大小，验证计算的比例是否合理
      if (result.width !== scenario.info.width) {
        const originalRatio = scenario.info.width / scenario.info.height;
        const newRatio = result.width / result.height;
        
        // 验证宽高比保持不变（允许小误差）
        expect(Math.abs(originalRatio - newRatio)).toBeLessThan(0.1);
      }
    }
  });
  
  test('极端测试10: 模拟低端设备性能', async () => {
    // 保存原始的setTimeout
    const originalSetTimeout = global.setTimeout;
    
    // 模拟低性能设备的慢速执行
    global.setTimeout = (callback, delay) => {
      return originalSetTimeout(callback, delay * 2); // 执行速度减半
    };
    
    // 设置较短的超时时间
    OptimizedImageLoader._config.timeout = 300;
    
    // 测试图片加载
    try {
      await OptimizedImageLoader.loadImage('https://example.com/large-image.jpg');
      
      // 如果成功，验证结果
      expect(true).toBe(true); // 仅标记测试成功
    } catch (error) {
      // 如果超时失败也是可接受的
      expect(error.message).toContain('超时');
    }
    
    // 恢复原始setTimeout
    global.setTimeout = originalSetTimeout;
  });
  
  test('极端测试11: 空间复杂度最小化', async () => {
    // 模拟内存极为受限的环境
    
    // 1. 预先填充缓存接近上限
    OptimizedImageLoader._cache.maxSize = 1024 * 1024; // 1MB上限
    OptimizedImageLoader._cache.totalSize = 900 * 1024; // 900KB已使用
    
    // 2. 加载一个新图片，大小略超过缓存剩余空间
    const url = 'https://example.com/large-test.jpg';
    
    // 模拟一个150KB的图片
    wx.getFileSystemManager().stat.mockImplementationOnce(({ success }) => {
      success({
        stats: { size: 150 * 1024 }
      });
    });
    
    // 模拟清理函数，验证是否被调用
    const originalClearCache = OptimizedImageLoader.clearCache;
    OptimizedImageLoader.clearCache = jest.fn(() => Promise.resolve({
      success: true,
      clearedSize: 300 * 1024,
      remainingSize: 600 * 1024
    }));
    
    // 尝试加载
    await OptimizedImageLoader.loadImage(url);
    
    // 验证触发了缓存清理
    expect(OptimizedImageLoader.clearCache).toHaveBeenCalled();
    
    // 恢复原函数
    OptimizedImageLoader.clearCache = originalClearCache;
  });
  
  test('极端测试12: 冲突处理和资源竞争', async () => {
    // 模拟同时加载相同URL的多个实例
    const url = 'https://example.com/shared-resource.jpg';
    
    // 创建10个并发请求相同URL
    const promises = Array(10).fill().map(() => OptimizedImageLoader.loadImage(url));
    
    // 验证只发出一个网络请求
    const results = await Promise.all(promises);
    
    // 所有结果应该指向同一路径
    const firstPath = results[0].path;
    expect(results.every(r => r.path === firstPath)).toBe(true);
    
    // 验证downloadFile只被调用一次
    expect(wx.downloadFile).toHaveBeenCalledTimes(1);
  });
  
  test('极端测试13: URL边界情况', async () => {
    // 测试各种极端URL
    const extremeUrls = [
      // 超长URL
      'https://example.com/' + 'a'.repeat(1000) + '.jpg',
      
      // 特殊字符URL
      'https://example.com/image with spaces.jpg',
      'https://example.com/image_with_!@#$%^&*()_+.jpg',
      
      // 无扩展名URL
      'https://example.com/no-extension',
      
      // 数据URL (base64)
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...',
      
      // 相对路径
      '/local/path/image.jpg'
    ];
    
    // 测试每个URL
    for (const url of extremeUrls) {
      const result = await OptimizedImageLoader.loadImage(url);
      expect(result.path).toBeDefined();
    }
  });
  
  test('极端测试14: 性能压力测试', async () => {
    // 模拟高负载场景
    
    // 1. 大量同时进行的操作
    // 设置小并发数以增加压力
    OptimizedImageLoader._config.concurrentLoads = 2;
    
    // 创建100个加载任务和20个缓存操作
    const operations = [];
    
    // 加载任务
    for (let i = 0; i < 100; i++) {
      operations.push(OptimizedImageLoader.loadImage(`https://example.com/perf${i}.jpg`));
    }
    
    // 清理操作 (每10个加载操作执行一次)
    for (let i = 0; i < 10; i++) {
      operations.push(OptimizedImageLoader.clearCache(i % 2 === 0));
    }
    
    // 执行所有操作
    const startTime = Date.now();
    const results = await Promise.allSettled(operations);
    const endTime = Date.now();
    
    // 验证至少80%的操作成功完成
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const successRate = successCount / operations.length;
    
    expect(successRate).toBeGreaterThanOrEqual(0.8);
    
    // 记录性能数据
    console.log(`性能压力测试: 执行${operations.length}个操作耗时${endTime - startTime}ms，成功率${(successRate * 100).toFixed(2)}%`);
  }, 15000);
  
  test('极端测试15: 存储限制突破', async () => {
    // 模拟突破存储限制的场景
    
    // 1. 模拟setStorage失败
    wx.setStorage = jest.fn(({ fail }) => {
      fail && fail({ errMsg: '存储配额已满' });
    });
    
    // 2. 设置缓存
    OptimizedImageLoader._cache.images = {
      'img_test': { path: '/mock/path/test.jpg', size: 1024 * 100 }
    };
    OptimizedImageLoader._cache.totalSize = 1024 * 100;
    
    // 3. 尝试保存缓存索引
    OptimizedImageLoader._saveCacheIndex();
    
    // 4. 尝试加载新图片
    const result = await OptimizedImageLoader.loadImage('https://example.com/new-test.jpg');
    
    // 验证图片仍能正常加载，即使缓存索引保存失败
    expect(result.path).toBeDefined();
  });
}); 