/**
 * 增强版图片缓存管理器
 * 负责管理小程序环境中的图片缓存，优化内存使用
 */

/**
 * 增强版图片缓存管理器
 */
const EnhancedImageCacheManager = {
  // 内存中的缓存数据
  _memoryCache: {},
  
  // 持久化缓存信息
  _diskCacheInfo: null,
  
  // 缓存配置
  _config: {
    // 内存缓存最大项数
    maxMemoryCacheItems: 20,
    
    // 磁盘缓存最大项数
    maxDiskCacheItems: 100,
    
    // 缓存有效期（毫秒）
    cacheTTL: 7 * 24 * 60 * 60 * 1000, // 7天
    
    // 缓存存储键名
    cacheStorageKey: 'enhanced_image_cache_info',
    
    // 自动清理
    autoCleanup: true,
    
    // 日志级别：0-不输出，1-错误，2-警告，3-信息
    logLevel: 2
  },
  
  /**
   * 初始化缓存管理器
   * @param {Object} options 配置选项
   * @returns {Object} 当前实例
   */
  init(options = {}) {
    // 合并配置
    this._config = {
      ...this._config,
      ...options
    };
    
    // 加载缓存信息
    this._loadCacheInfo();
    
    // 自动清理过期缓存
    if (this._config.autoCleanup) {
      this._cleanupExpiredCache();
    }
    
    this._log(3, '[EnhancedImageCacheManager] 缓存管理器初始化完成');
    
    return this;
  },
  
  /**
   * 记录日志
   * @param {Number} level 日志级别
   * @param {String} message 日志消息
   * @param {Object} data 附加数据
   * @private
   */
  _log(level, message, data) {
    if (level <= this._config.logLevel) {
      switch (level) {
        case 1:
          console.error(message, data || '');
          break;
        case 2:
          console.warn(message, data || '');
          break;
        case 3:
          console.log(message, data || '');
          break;
      }
    }
  },
  
  /**
   * 加载缓存信息
   * @private
   */
  _loadCacheInfo() {
    try {
      const cacheInfo = wx.getStorageSync(this._config.cacheStorageKey);
      this._diskCacheInfo = cacheInfo || { items: {}, stats: { hits: 0, misses: 0 } };
    } catch (err) {
      this._log(1, '[EnhancedImageCacheManager] 加载缓存信息失败:', err);
      this._diskCacheInfo = { items: {}, stats: { hits: 0, misses: 0 } };
    }
  },
  
  /**
   * 保存缓存信息
   * @private
   */
  _saveCacheInfo() {
    try {
      // 移除实际图片数据，只存储元数据
      const saveInfo = {
        items: this._diskCacheInfo.items,
        stats: this._diskCacheInfo.stats,
        lastUpdate: Date.now()
      };
      
      wx.setStorageSync(this._config.cacheStorageKey, saveInfo);
    } catch (err) {
      this._log(1, '[EnhancedImageCacheManager] 保存缓存信息失败:', err);
    }
  },
  
  /**
   * 从缓存获取图片
   * @param {String} key 缓存键
   * @returns {Object|null} 缓存的图片对象或null
   */
  get(key) {
    // 检查内存缓存
    if (this._memoryCache[key]) {
      // 更新访问时间
      this._memoryCache[key].lastAccess = Date.now();
      
      // 记录命中次数
      this._diskCacheInfo.stats.hits = (this._diskCacheInfo.stats.hits || 0) + 1;
      
      this._log(3, `[EnhancedImageCacheManager] 内存缓存命中: ${key}`);
      return this._memoryCache[key].data;
    }
    
    // 检查磁盘缓存
    if (this._diskCacheInfo.items[key]) {
      const item = this._diskCacheInfo.items[key];
      
      // 检查是否过期
      if (this._isExpired(item)) {
        this._log(3, `[EnhancedImageCacheManager] 缓存已过期: ${key}`);
        
        // 异步清理过期项
        this._removeItem(key);
        
        // 记录未命中
        this._diskCacheInfo.stats.misses = (this._diskCacheInfo.stats.misses || 0) + 1;
        
        return null;
      }
      
      try {
        // 从文件系统读取
        const cacheFile = item.path;
        
        try {
          // 尝试获取文件信息，确认文件存在
          wx.getFileInfo({
            filePath: cacheFile,
            success: (res) => {
              // 更新缓存项大小信息
              item.size = res.size;
            },
            fail: () => {
              // 文件不存在，从缓存中移除
              this._removeItem(key);
            }
          });
          
          // 更新访问时间并移动到内存缓存
          item.lastAccess = Date.now();
          const dataObj = { src: cacheFile, meta: item.meta || {} };
          
          // 将项目加入内存缓存
          this._addToMemoryCache(key, dataObj);
          
          // 保存更新
          this._saveCacheInfo();
          
          // 记录命中
          this._diskCacheInfo.stats.hits = (this._diskCacheInfo.stats.hits || 0) + 1;
          
          this._log(3, `[EnhancedImageCacheManager] 磁盘缓存命中: ${key}`);
          return dataObj;
        } catch (err) {
          this._log(1, `[EnhancedImageCacheManager] 读取缓存文件失败: ${key}`, err);
          
          // 移除问题项
          this._removeItem(key);
          
          // 记录未命中
          this._diskCacheInfo.stats.misses = (this._diskCacheInfo.stats.misses || 0) + 1;
          
          return null;
        }
      } catch (err) {
        this._log(1, `[EnhancedImageCacheManager] 缓存获取错误: ${key}`, err);
        
        // 记录未命中
        this._diskCacheInfo.stats.misses = (this._diskCacheInfo.stats.misses || 0) + 1;
        
        return null;
      }
    }
    
    // 未命中缓存
    this._diskCacheInfo.stats.misses = (this._diskCacheInfo.stats.misses || 0) + 1;
    return null;
  },
  
  /**
   * 将图片添加到缓存
   * @param {String} key 缓存键
   * @param {String} imagePath 图片路径
   * @param {Object} metadata 图片元数据
   * @returns {Promise<Object>} 缓存操作结果
   */
  set(key, imagePath, metadata = {}) {
    return new Promise((resolve, reject) => {
      if (!key || !imagePath) {
        reject(new Error('缓存键和图片路径不能为空'));
        return;
      }
      
      // 如果是临时文件，需要保存到缓存目录
      if (imagePath.indexOf('http://tmp/') === 0 || 
          imagePath.indexOf('wxfile://tmp_') === 0) {
        
        this._saveTempImageToCache(key, imagePath, metadata)
          .then(resolve)
          .catch(reject);
      } else {
        // 网络图片或其他持久路径直接添加引用
        const cacheItem = {
          key: key,
          path: imagePath,
          created: Date.now(),
          lastAccess: Date.now(),
          meta: metadata
        };
        
        // 添加到缓存
        this._addToDiskCache(key, cacheItem);
        
        // 添加到内存缓存
        this._addToMemoryCache(key, { src: imagePath, meta: metadata });
        
        resolve({ key, path: imagePath, fromCache: false });
      }
    });
  },
  
  /**
   * 将临时图片保存到缓存
   * @param {String} key 缓存键
   * @param {String} tempPath 临时图片路径
   * @param {Object} metadata 图片元数据
   * @returns {Promise<Object>} 操作结果
   * @private
   */
  _saveTempImageToCache(key, tempPath, metadata) {
    return new Promise((resolve, reject) => {
      // 生成缓存文件路径
      const fileName = `img_cache_${key.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${this._getImageExtension(tempPath)}`;
      const cachePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
      
      // 复制文件到持久存储
      wx.getFileSystemManager().copyFile({
        srcPath: tempPath,
        destPath: cachePath,
        success: () => {
          // 获取文件信息
          wx.getFileInfo({
            filePath: cachePath,
            success: (res) => {
              // 创建缓存项
              const cacheItem = {
                key: key,
                path: cachePath,
                size: res.size,
                created: Date.now(),
                lastAccess: Date.now(),
                meta: metadata
              };
              
              // 添加到缓存
              this._addToDiskCache(key, cacheItem);
              
              // 添加到内存缓存
              this._addToMemoryCache(key, { src: cachePath, meta: metadata });
              
              resolve({ key, path: cachePath, fromCache: false });
            },
            fail: (err) => {
              this._log(1, `[EnhancedImageCacheManager] 获取缓存文件信息失败: ${key}`, err);
              reject(err);
            }
          });
        },
        fail: (err) => {
          this._log(1, `[EnhancedImageCacheManager] 保存图片到缓存失败: ${key}`, err);
          reject(err);
        }
      });
    });
  },
  
  /**
   * 从缓存中删除项目
   * @param {String} key 缓存键
   * @returns {Boolean} 是否成功删除
   */
  remove(key) {
    // 从内存缓存中删除
    if (this._memoryCache[key]) {
      delete this._memoryCache[key];
    }
    
    // 从磁盘缓存中删除
    return this._removeItem(key);
  },
  
  /**
   * 清空所有缓存
   * @returns {Promise<Boolean>} 操作是否成功
   */
  clearCache() {
    return new Promise((resolve) => {
      // 清空内存缓存
      this._memoryCache = {};
      
      // 删除所有缓存文件
      const promises = [];
      Object.keys(this._diskCacheInfo.items).forEach(key => {
        const item = this._diskCacheInfo.items[key];
        if (item && item.path) {
          promises.push(this._deleteFile(item.path));
        }
      });
      
      // 重置缓存信息
      this._diskCacheInfo = { items: {}, stats: { hits: 0, misses: 0 } };
      this._saveCacheInfo();
      
      // 等待所有文件删除操作完成
      Promise.all(promises)
        .then(() => {
          this._log(3, '[EnhancedImageCacheManager] 缓存已全部清空');
          resolve(true);
        })
        .catch(err => {
          this._log(1, '[EnhancedImageCacheManager] 清空缓存过程中出错:', err);
          resolve(false);
        });
    });
  },
  
  /**
   * 获取缓存状态信息
   * @returns {Object} 缓存状态信息
   */
  getStats() {
    const memoryItems = Object.keys(this._memoryCache).length;
    const diskItems = Object.keys(this._diskCacheInfo.items).length;
    
    return {
      memory: {
        items: memoryItems,
        maxItems: this._config.maxMemoryCacheItems
      },
      disk: {
        items: diskItems,
        maxItems: this._config.maxDiskCacheItems
      },
      hits: this._diskCacheInfo.stats.hits || 0,
      misses: this._diskCacheInfo.stats.misses || 0,
      hitRatio: this._calculateHitRatio()
    };
  },
  
  /**
   * 计算缓存命中率
   * @returns {Number} 命中率（0-1之间）
   * @private
   */
  _calculateHitRatio() {
    const hits = this._diskCacheInfo.stats.hits || 0;
    const misses = this._diskCacheInfo.stats.misses || 0;
    const total = hits + misses;
    
    if (total === 0) return 0;
    return hits / total;
  },
  
  /**
   * 检查缓存项是否过期
   * @param {Object} item 缓存项
   * @returns {Boolean} 是否过期
   * @private
   */
  _isExpired(item) {
    if (!item || !item.created) return true;
    
    const now = Date.now();
    const age = now - item.created;
    
    return age > this._config.cacheTTL;
  },
  
  /**
   * 从磁盘缓存中删除项
   * @param {String} key 缓存键
   * @returns {Boolean} 是否成功删除
   * @private
   */
  _removeItem(key) {
    const item = this._diskCacheInfo.items[key];
    if (!item) return false;
    
    // 删除缓存文件
    if (item.path) {
      this._deleteFile(item.path).catch(err => {
        this._log(1, `[EnhancedImageCacheManager] 删除缓存文件失败: ${key}`, err);
      });
    }
    
    // 从缓存信息中删除
    delete this._diskCacheInfo.items[key];
    this._saveCacheInfo();
    
    return true;
  },
  
  /**
   * 删除文件
   * @param {String} filePath 文件路径
   * @returns {Promise<Boolean>} 操作是否成功
   * @private
   */
  _deleteFile(filePath) {
    return new Promise((resolve, reject) => {
      if (!filePath || filePath.indexOf(wx.env.USER_DATA_PATH) !== 0) {
        // 不删除非缓存目录下的文件
        resolve(false);
        return;
      }
      
      wx.getFileSystemManager().unlink({
        filePath: filePath,
        success: () => {
          resolve(true);
        },
        fail: (err) => {
          // 如果是文件不存在错误，视为成功
          if (err.errMsg && err.errMsg.indexOf('no such file or directory') !== -1) {
            resolve(true);
          } else {
            reject(err);
          }
        }
      });
    });
  },
  
  /**
   * 添加项目到内存缓存
   * @param {String} key 缓存键
   * @param {Object} data 缓存数据
   * @private
   */
  _addToMemoryCache(key, data) {
    // 检查内存缓存是否已满
    const memoryKeys = Object.keys(this._memoryCache);
    
    if (memoryKeys.length >= this._config.maxMemoryCacheItems) {
      // 移除最久未访问的项
      this._evictMemoryCache();
    }
    
    // 添加到内存缓存
    this._memoryCache[key] = {
      data: data,
      lastAccess: Date.now()
    };
  },
  
  /**
   * 添加项目到磁盘缓存
   * @param {String} key 缓存键
   * @param {Object} item 缓存项
   * @private
   */
  _addToDiskCache(key, item) {
    // 检查是否需要清理缓存
    const diskKeys = Object.keys(this._diskCacheInfo.items);
    
    if (diskKeys.length >= this._config.maxDiskCacheItems) {
      // 移除最久未访问的项
      this._evictDiskCache();
    }
    
    // 添加项目
    this._diskCacheInfo.items[key] = item;
    
    // 保存缓存信息
    this._saveCacheInfo();
  },
  
  /**
   * 清理内存缓存
   * @private
   */
  _evictMemoryCache() {
    // 按最后访问时间排序
    const sortedKeys = Object.keys(this._memoryCache).sort((a, b) => {
      return this._memoryCache[a].lastAccess - this._memoryCache[b].lastAccess;
    });
    
    // 移除最早的25%项目
    const removeCount = Math.max(1, Math.floor(sortedKeys.length * 0.25));
    for (let i = 0; i < removeCount; i++) {
      delete this._memoryCache[sortedKeys[i]];
    }
    
    this._log(3, `[EnhancedImageCacheManager] 已清理内存缓存 ${removeCount} 项`);
  },
  
  /**
   * 清理磁盘缓存
   * @private
   */
  _evictDiskCache() {
    // 获取所有项目
    const items = Object.keys(this._diskCacheInfo.items).map(key => {
      return {
        key: key,
        ...this._diskCacheInfo.items[key]
      };
    });
    
    // 按最后访问时间排序
    items.sort((a, b) => {
      return a.lastAccess - b.lastAccess;
    });
    
    // 移除最早的25%项目
    const removeCount = Math.max(1, Math.floor(items.length * 0.25));
    for (let i = 0; i < removeCount; i++) {
      this._removeItem(items[i].key);
    }
    
    this._log(3, `[EnhancedImageCacheManager] 已清理磁盘缓存 ${removeCount} 项`);
  },
  
  /**
   * 清理过期缓存
   * @private
   */
  _cleanupExpiredCache() {
    // 获取所有项目
    const keys = Object.keys(this._diskCacheInfo.items);
    let expiredCount = 0;
    
    keys.forEach(key => {
      const item = this._diskCacheInfo.items[key];
      if (this._isExpired(item)) {
        this._removeItem(key);
        expiredCount++;
      }
    });
    
    if (expiredCount > 0) {
      this._log(3, `[EnhancedImageCacheManager] 已清理过期缓存 ${expiredCount} 项`);
    }
  },
  
  /**
   * 获取图片文件扩展名
   * @param {String} path 图片路径
   * @returns {String} 文件扩展名
   * @private
   */
  _getImageExtension(path) {
    if (!path) return 'jpg';
    
    // 检查路径是否包含扩展名
    const match = path.match(/\.([a-z0-9]+)(\?|$)/i);
    if (match && match[1]) {
      const ext = match[1].toLowerCase();
      // 只允许常见图片格式
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        return ext;
      }
    }
    
    // 默认返回jpg
    return 'jpg';
  }
};

module.exports = EnhancedImageCacheManager; 