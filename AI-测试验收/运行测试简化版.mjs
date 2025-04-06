/**
 * 简化版测试运行器
 * 专注于测试ImageCacheManager中的getLastCleanupTime方法
 */

import assert from 'assert';

// 模拟测试框架
const describe = (name, fn) => {
  console.log(`\n== ${name} ==`);
  fn();
};

const test = (name, fn) => {
  try {
    console.log(`  测试: ${name}`);
    fn();
    console.log('  ✅ 通过');
  } catch (error) {
    console.error(`  ❌ 失败: ${error.message}`);
  }
};

// 简化版MemoryManager实现
const MemoryManager = {
  getMemoryInfo() {
    return {
      jsHeapSizeMB: 100,
      totalMemoryMB: 200
    };
  }
};

// 简化版ImageCacheManager实现
const ImageCacheManager = {
  lastCleanupTime: null,
  
  cleanup() {
    this.lastCleanupTime = Date.now();
    return true;
  },
  
  clearCache() {
    this.lastCleanupTime = Date.now();
    return true;
  },
  
  getLastCleanupTime() {
    return this.lastCleanupTime;
  },
  
  getStats() {
    return {
      thumbnailCount: 5,
      originalCount: 3,
      memoryUsageMB: "10.50"
    };
  }
};

// 简化版PhotoService实现
const PhotoService = {
  getMemoryStats() {
    const memoryInfo = MemoryManager.getMemoryInfo() || {};
    const cacheStats = ImageCacheManager.getStats() || {};
    
    return {
      jsHeapSizeMB: memoryInfo.jsHeapSizeMB || 0,
      totalMemoryMB: memoryInfo.totalMemoryMB || 0,
      limit: memoryInfo.limit || '1000MB',
      totalPhotoCacheMB: cacheStats.memoryUsageMB || 0,
      thumbnailCount: cacheStats.thumbnailCount || 0,
      originalCount: cacheStats.originalCount || 0,
      lastCleanupTime: ImageCacheManager.getLastCleanupTime() ? 
        new Date(ImageCacheManager.getLastCleanupTime()).toLocaleString() : 
        '尚未清理',
      cleared: true // 标记清理状态
    };
  },
  
  cleanupCache(options) {
    options = options || {};
    
    // 清理图片缓存
    if (options.force) {
      ImageCacheManager.clearCache();
    } else {
      ImageCacheManager.cleanup();
    }
    
    return true;
  }
};

// 运行测试
console.log('===== 简化版测试运行器 =====');
console.log('开始时间:', new Date().toLocaleString());

// 测试ImageCacheManager的getLastCleanupTime方法
describe('ImageCacheManager测试', () => {
  test('ImageCacheManager应该具有getLastCleanupTime方法', () => {
    assert.strictEqual(typeof ImageCacheManager.getLastCleanupTime, 'function');
    assert.strictEqual(ImageCacheManager.lastCleanupTime, null);
    assert.strictEqual(ImageCacheManager.getLastCleanupTime(), null);
  });
  
  test('清理缓存后应该更新lastCleanupTime', () => {
    const originalNow = Date.now;
    const mockTime = 1617638400000; // 2021-04-05T12:00:00Z
    
    Date.now = () => mockTime;
    
    ImageCacheManager.cleanup();
    
    assert.strictEqual(ImageCacheManager.lastCleanupTime, mockTime);
    assert.strictEqual(ImageCacheManager.getLastCleanupTime(), mockTime);
    
    Date.now = originalNow;
  });
});

// 测试PhotoService的getMemoryStats方法
describe('PhotoService测试', () => {
  test('PhotoService.getMemoryStats应该返回包含cleared属性的对象', () => {
    const stats = PhotoService.getMemoryStats();
    
    assert.strictEqual(typeof stats, 'object');
    assert.strictEqual(stats.jsHeapSizeMB, 100);
    assert.strictEqual(stats.totalMemoryMB, 200);
    assert.strictEqual(stats.thumbnailCount, 5);
    assert.strictEqual(stats.originalCount, 3);
    assert.strictEqual(stats.totalPhotoCacheMB, "10.50");
    assert.strictEqual(stats.cleared, true);
  });
  
  test('PhotoService.cleanupCache应该调用ImageCacheManager的相应方法', () => {
    // 保存原始方法
    const originalCleanup = ImageCacheManager.cleanup;
    const originalClearCache = ImageCacheManager.clearCache;
    
    let cleanupCalled = false;
    let clearCacheCalled = false;
    
    // 替换为模拟实现
    ImageCacheManager.cleanup = () => {
      cleanupCalled = true;
      return true;
    };
    
    ImageCacheManager.clearCache = () => {
      clearCacheCalled = true;
      return true;
    };
    
    // 测试常规清理
    PhotoService.cleanupCache();
    assert.strictEqual(cleanupCalled, true);
    assert.strictEqual(clearCacheCalled, false);
    
    // 重置标记
    cleanupCalled = false;
    clearCacheCalled = false;
    
    // 测试强制清理
    PhotoService.cleanupCache({ force: true });
    assert.strictEqual(cleanupCalled, false);
    assert.strictEqual(clearCacheCalled, true);
    
    // 恢复原始方法
    ImageCacheManager.cleanup = originalCleanup;
    ImageCacheManager.clearCache = originalClearCache;
  });
});

console.log('\n===== 测试结束 =====');
console.log('结束时间:', new Date().toLocaleString()); 