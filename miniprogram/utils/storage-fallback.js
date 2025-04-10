/**
 * 存储管理器回退实现
 * 当无法导入主存储管理器时使用此简化版本
 */

class SimpleStorageManager {
  constructor(options = {}) {
    this.options = {
      maxStorageSize: 50 * 1024 * 1024, // 默认50MB
      warningThreshold: 0.8,
      criticalThreshold: 0.9,
      ...options
    };
    
    this.initialized = true;
    console.log('已初始化简化版存储管理器');
  }
  
  /**
   * 获取存储配额信息
   * @returns {Object} 配额信息
   */
  getQuotaInfo() {
    try {
      const res = wx.getStorageInfoSync();
      return {
        currentSize: res.currentSize || 0,
        maxSize: res.limitSize || this.options.maxStorageSize,
        usageRatio: res.limitSize ? (res.currentSize / res.limitSize) : 0,
        freeSpace: res.limitSize ? (res.limitSize - res.currentSize) : this.options.maxStorageSize,
        keys: res.keys || []
      };
    } catch (err) {
      console.error('获取存储信息失败:', err);
      return {
        currentSize: 0,
        maxSize: this.options.maxStorageSize,
        usageRatio: 0,
        freeSpace: this.options.maxStorageSize,
        keys: []
      };
    }
  }
  
  /**
   * 清理存储空间
   * @returns {Promise<number>} 已清理的字节数
   */
  async cleanupCache() {
    try {
      const res = wx.getStorageInfoSync();
      const keys = res.keys || [];
      
      // 临时数据和日志优先清理
      const tempKeys = keys.filter(key => 
        key.startsWith('temp_') || 
        key.startsWith('log_') || 
        key.startsWith('cache_'));
      
      let bytesCleared = 0;
      
      // 清理临时数据
      for (const key of tempKeys) {
        try {
          // 估算数据大小
          const data = wx.getStorageSync(key);
          const size = JSON.stringify(data).length;
          
          // 删除数据
          wx.removeStorageSync(key);
          bytesCleared += size;
          
          console.log(`已清理存储项: ${key}, 大小: ${(size/1024).toFixed(2)}KB`);
        } catch (e) {
          console.warn(`清理存储项失败: ${key}`, e);
        }
      }
      
      // 清理文件系统临时目录
      await this._cleanupTempFiles();
      
      return bytesCleared;
    } catch (err) {
      console.error('清理缓存失败:', err);
      return 0;
    }
  }
  
  /**
   * 按策略清理存储
   * @param {string} strategy 清理策略
   * @returns {Promise<number>} 已清理的字节数
   */
  async cleanupByStrategy(strategy) {
    console.log(`按策略清理存储: ${strategy}`);
    return this.cleanupCache();
  }
  
  /**
   * 清理临时文件
   * @private
   */
  async _cleanupTempFiles() {
    return new Promise((resolve) => {
      try {
        const fs = wx.getFileSystemManager();
        const tmpDir = `${wx.env.USER_DATA_PATH}/temp`;
        
        fs.readdir({
          dirPath: tmpDir,
          success: (res) => {
            const files = res.files || [];
            let count = 0;
            
            for (const file of files) {
              if (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.tmp')) {
                try {
                  fs.unlinkSync(`${tmpDir}/${file}`);
                  count++;
                } catch (e) {
                  console.warn(`删除临时文件失败: ${file}`, e);
                }
              }
            }
            
            console.log(`已清理临时文件 ${count} 个`);
            resolve(count);
          },
          fail: (err) => {
            console.warn('读取临时目录失败:', err);
            resolve(0);
          }
        });
      } catch (e) {
        console.error('清理临时文件失败:', e);
        resolve(0);
      }
    });
  }
}

module.exports = SimpleStorageManager; 