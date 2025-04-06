/**
 * 照片批处理器
 * 用于高效处理大量照片的批量操作，包括内存优化、分批处理和缓存机制
 * 遵循ES5语法，确保在微信小程序环境兼容
 */

// 使用模块适配器导入
var moduleAdapter = require('./moduleAdapter');
var imageProcessor = moduleAdapter.getImageProcessor();

/**
 * 照片批处理器
 */
var photoBatchProcessor = (function() {
  // 私有变量
  var processingQueue = [];
  var isProcessing = false;
  var processingStats = {
    total: 0,
    completed: 0,
    failed: 0,
    cached: 0
  };
  
  // 处理缓存
  var processCache = {};
  
  // 默认配置
  var defaultOptions = {
    batchSize: 5,            // 每批次处理的照片数量
    processDelay: 100,       // 批次间延迟时间(ms)
    optimizeMemory: true,    // 是否优化内存使用
    useCache: true,          // 是否使用缓存
    compressionQuality: 80,  // 压缩质量(0-100)
    maxConcurrent: 2,        // 最大并发处理数
    timeout: 30000,          // 单张照片处理超时时间
    retryCount: 1,           // 失败重试次数
    cacheExpiry: 3600000     // 缓存过期时间(ms)，默认1小时
  };
  
  /**
   * 合并配置选项
   * @param {Object} userOptions - 用户提供的选项
   * @returns {Object} 合并后的选项
   */
  function mergeOptions(userOptions) {
    var options = {};
    
    // 复制默认选项
    for (var key in defaultOptions) {
      if (defaultOptions.hasOwnProperty(key)) {
        options[key] = defaultOptions[key];
      }
    }
    
    // 合并用户选项
    if (userOptions) {
      for (var key in userOptions) {
        if (userOptions.hasOwnProperty(key)) {
          options[key] = userOptions[key];
        }
      }
    }
    
    return options;
  }
  
  /**
   * 批量处理照片
   * @param {Array} photos - 待处理照片数组
   * @param {Object} options - 处理选项
   * @returns {Promise} 处理完成的Promise，解析为处理后的照片数组
   */
  function processBatch(photos, options) {
    if (!Array.isArray(photos) || photos.length === 0) {
      return Promise.resolve([]);
    }
    
    var mergedOptions = mergeOptions(options);
    
    // 重置处理统计
    processingStats = {
      total: photos.length,
      completed: 0,
      failed: 0,
      cached: 0,
      startTime: Date.now()
    };
    
    console.log('[PhotoBatchProcessor] 开始批量处理', photos.length, '张照片');
    
    return new Promise(function(resolve, reject) {
      try {
        // 将照片分批
        var batches = splitIntoBatches(photos, mergedOptions.batchSize);
        var processedPhotos = [];
        
        // 按批次顺序处理
        processBatches(batches, 0, processedPhotos, mergedOptions)
          .then(function(result) {
            console.log('[PhotoBatchProcessor] 批量处理完成', 
                        processingStats.completed, '/', processingStats.total,
                        '张照片，用时', (Date.now() - processingStats.startTime), 'ms',
                        '缓存命中:', processingStats.cached);
            resolve(result);
          })
          .catch(function(error) {
            console.error('[PhotoBatchProcessor] 批量处理失败', error);
            reject(error);
          });
      } catch (error) {
        console.error('[PhotoBatchProcessor] 初始化批处理失败', error);
        reject(error);
      }
    });
  }
  
  /**
   * 将照片数组分割成多个批次
   * @param {Array} photos - 照片数组
   * @param {Number} batchSize - 每批次的大小
   * @returns {Array} 批次数组
   */
  function splitIntoBatches(photos, batchSize) {
    var batches = [];
    var totalPhotos = photos.length;
    
    for (var i = 0; i < totalPhotos; i += batchSize) {
      batches.push(photos.slice(i, Math.min(i + batchSize, totalPhotos)));
    }
    
    return batches;
  }
  
  /**
   * 按顺序处理批次
   * @param {Array} batches - 批次数组
   * @param {Number} index - 当前处理的批次索引
   * @param {Array} processedPhotos - 已处理的照片数组
   * @param {Object} options - 处理选项
   * @returns {Promise} 处理完成的Promise
   */
  function processBatches(batches, index, processedPhotos, options) {
    // 所有批次处理完成
    if (index >= batches.length) {
      return Promise.resolve(processedPhotos);
    }
    
    var currentBatch = batches[index];
    console.log('[PhotoBatchProcessor] 处理批次', index + 1, '/', batches.length,
                '(', currentBatch.length, '张照片)');
    
    // 处理当前批次
    return processPhotoBatch(currentBatch, options)
      .then(function(batchResults) {
        // 添加到已处理照片数组
        processedPhotos = processedPhotos.concat(batchResults);
        
        // 如果需要优化内存，手动触发垃圾回收
        if (options.optimizeMemory && typeof gc !== 'undefined') {
          console.log('[PhotoBatchProcessor] 触发垃圾回收');
          gc();
        }
        
        // 批次间延迟
        return wait(options.processDelay);
      })
      .then(function() {
        // 处理下一批次
        return processBatches(batches, index + 1, processedPhotos, options);
      });
  }
  
  /**
   * 处理单个批次的照片
   * @param {Array} batch - 照片批次
   * @param {Object} options - 处理选项
   * @returns {Promise} 处理完成的Promise
   */
  function processPhotoBatch(batch, options) {
    // 使用Promise.all并行处理批次中的照片
    var processPromises = batch.map(function(photo) {
      return processPhoto(photo, options);
    });
    
    return Promise.all(processPromises);
  }
  
  /**
   * 处理单张照片
   * @param {Object} photo - 照片对象
   * @param {Object} options - 处理选项
   * @returns {Promise} 处理完成的Promise
   */
  function processPhoto(photo, options) {
    // 检查缓存
    if (options.useCache) {
      var cacheKey = generateCacheKey(photo);
      var cachedResult = getFromCache(cacheKey);
      
      if (cachedResult) {
        processingStats.cached++;
        processingStats.completed++;
        return Promise.resolve(cachedResult);
      }
    }
    
    // 设置超时
    var timeoutPromise = new Promise(function(resolve, reject) {
      setTimeout(function() {
        reject(new Error('处理照片超时: ' + photo.id));
      }, options.timeout);
    });
    
    // 实际处理照片的Promise
    var processPromise = new Promise(function(resolve, reject) {
      // 根据照片类型选择处理方式
      var processor;
      
      if (photo.type && photo.type.indexOf('image') === 0) {
        processor = processImagePhoto;
      } else {
        // 默认作为图片处理
        processor = processImagePhoto;
      }
      
      processor(photo, options)
        .then(function(processedPhoto) {
          processingStats.completed++;
          
          // 缓存处理结果
          if (options.useCache) {
            var cacheKey = generateCacheKey(photo);
            saveToCache(cacheKey, processedPhoto);
          }
          
          resolve(processedPhoto);
        })
        .catch(function(error) {
          processingStats.failed++;
          console.error('[PhotoBatchProcessor] 处理照片失败:', error);
          
          // 添加错误标记但仍返回原照片
          var errorPhoto = Object.assign({}, photo, {
            processingError: error.message || '处理失败',
            processed: false
          });
          
          resolve(errorPhoto);
        });
    });
    
    // 返回两个Promise中先完成的
    return Promise.race([processPromise, timeoutPromise]);
  }
  
  /**
   * 处理图片类型的照片
   * @param {Object} photo - 照片对象
   * @param {Object} options - 处理选项
   * @returns {Promise} 处理完成的Promise
   */
  function processImagePhoto(photo, options) {
    return new Promise(function(resolve, reject) {
      try {
        // 使用imageProcessor处理图片
        imageProcessor.optimizeImage({
          src: photo.path,
          quality: options.compressionQuality,
          maxWidth: photo.width || 1920,
          maxHeight: photo.height || 1080
        })
        .then(function(result) {
          // 构建处理后的照片对象
          var processedPhoto = Object.assign({}, photo, {
            processedPath: result.path,
            processedSize: result.size,
            compressionRatio: photo.size > 0 ? (result.size / photo.size) : 1,
            processed: true,
            processedAt: new Date().toISOString()
          });
          
          resolve(processedPhoto);
        })
        .catch(function(error) {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * 生成缓存键
   * @param {Object} photo - 照片对象
   * @returns {String} 缓存键
   */
  function generateCacheKey(photo) {
    return [
      photo.id || '',
      photo.path || '',
      photo.size || 0,
      photo.lastModified || 0
    ].join('_');
  }
  
  /**
   * 从缓存获取处理结果
   * @param {String} key - 缓存键
   * @returns {Object|null} 缓存的照片对象或null
   */
  function getFromCache(key) {
    var cachedItem = processCache[key];
    
    if (cachedItem && Date.now() < cachedItem.expiry) {
      return cachedItem.data;
    }
    
    return null;
  }
  
  /**
   * 保存处理结果到缓存
   * @param {String} key - 缓存键
   * @param {Object} data - 照片对象
   */
  function saveToCache(key, data) {
    processCache[key] = {
      data: data,
      expiry: Date.now() + defaultOptions.cacheExpiry
    };
  }
  
  /**
   * 清理过期缓存
   */
  function cleanupCache() {
    var now = Date.now();
    var keys = Object.keys(processCache);
    var removedCount = 0;
    
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (processCache[key].expiry < now) {
        delete processCache[key];
        removedCount++;
      }
    }
    
    return {
      total: keys.length,
      removed: removedCount,
      remaining: keys.length - removedCount
    };
  }
  
  /**
   * 等待指定时间
   * @param {Number} ms - 等待毫秒数
   * @returns {Promise} 等待完成的Promise
   */
  function wait(ms) {
    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  }
  
  /**
   * 获取处理统计信息
   * @returns {Object} 统计信息
   */
  function getProcessingStats() {
    var endTime = processingStats.endTime || Date.now();
    var duration = endTime - (processingStats.startTime || endTime);
    
    return Object.assign({}, processingStats, {
      duration: duration,
      averageTimePerPhoto: processingStats.completed > 0 ? 
                          (duration / processingStats.completed) : 0,
      cacheHitRate: processingStats.total > 0 ? 
                   (processingStats.cached / processingStats.total) : 0
    });
  }
  
  /**
   * 获取内存使用情况
   * @returns {Object} 内存使用统计
   */
  function getMemoryUsage() {
    // 在支持的环境中获取内存使用情况
    if (typeof wx !== 'undefined' && wx.getPerformance) {
      var performance = wx.getPerformance();
      var memory = performance && performance.memory;
      
      if (memory) {
        return {
          totalJSHeapSize: memory.totalJSHeapSize,
          usedJSHeapSize: memory.usedJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        };
      }
    }
    
    // 返回缓存相关信息作为替代
    var cacheKeys = Object.keys(processCache);
    var cacheSize = cacheKeys.length;
    
    return {
      cacheEntries: cacheSize,
      processedItems: processingStats.completed,
      failedItems: processingStats.failed
    };
  }
  
  // 导出公共API
  return {
    processBatch: processBatch,
    getProcessingStats: getProcessingStats,
    getMemoryUsage: getMemoryUsage,
    cleanupCache: cleanupCache
  };
})();

module.exports = photoBatchProcessor; 