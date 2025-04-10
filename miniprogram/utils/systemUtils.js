/**
 * 系统工具函数
 * 提供系统存储清理、资源管理等通用功能
 */

/**
 * 清理系统存储
 * @returns {Promise<number>} 清理的字节数
 */
function cleanupSystemStorage() {
  return new Promise((resolve) => {
    try {
      // 1. 清理本地缓存
      const storageResult = cleanupLocalStorage();
      
      // 2. 清理文件系统
      cleanupFileSystem().then((fsBytes) => {
        resolve(storageResult + fsBytes);
      });
    } catch (err) {
      console.error('[系统工具] 清理系统存储失败:', err);
      resolve(0);
    }
  });
}

/**
 * 清理本地缓存
 * @returns {number} 清理的字节数
 */
function cleanupLocalStorage() {
  try {
    const res = wx.getStorageInfoSync();
    const keys = res.keys || [];
    
    // 临时数据和日志优先清理
    const tempKeys = [];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key.startsWith('temp_') || 
          key.startsWith('log_') || 
          key.startsWith('cache_') ||
          key.indexOf('temp') !== -1 ||
          key.indexOf('cache') !== -1) {
        tempKeys.push(key);
      }
    }
    
    let bytesCleared = 0;
    
    // 清理临时数据
    for (let i = 0; i < tempKeys.length; i++) {
      const key = tempKeys[i];
      try {
        // 估算数据大小
        const data = wx.getStorageSync(key);
        let size = 0;
        try {
          size = JSON.stringify(data).length;
        } catch (e) {
          // 忽略序列化错误
        }
        
        // 删除数据
        wx.removeStorageSync(key);
        bytesCleared += size;
        
        console.log('[系统工具] 已清理存储项:', key);
      } catch (e) {
        console.warn('[系统工具] 清理存储项失败:', e);
      }
    }
    
    return bytesCleared;
  } catch (err) {
    console.error('[系统工具] 清理本地缓存失败:', err);
    return 0;
  }
}

/**
 * 清理文件系统
 * @returns {Promise<number>} 清理的字节数
 */
function cleanupFileSystem() {
  return new Promise((resolve) => {
    try {
      const fs = wx.getFileSystemManager();
      const tmpDir = wx.env.USER_DATA_PATH + '/temp';
      
      fs.readdir({
        dirPath: tmpDir,
        success: function(res) {
          const files = res.files || [];
          let count = 0;
          let bytesCleared = 0;
          
          // 创建一个Promise数组来处理文件删除
          const deletePromises = [];
          
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.endsWith('.jpg') || 
                file.endsWith('.png') || 
                file.endsWith('.tmp') || 
                file.endsWith('.temp') ||
                file.indexOf('temp') !== -1) {
              
              // 使用Promise处理每个文件删除
              const deletePromise = new Promise((resolveFile) => {
                // 先获取文件信息以获取文件大小
                fs.getFileInfo({
                  filePath: tmpDir + '/' + file,
                  success: function(fileInfo) {
                    bytesCleared += fileInfo.size || 0;
                    
                    // 删除文件
                    fs.unlink({
                      filePath: tmpDir + '/' + file,
                      success: function() {
                        count++;
                        resolveFile();
                      },
                      fail: function(err) {
                        console.warn('[系统工具] 删除临时文件失败:', file, err);
                        resolveFile();
                      }
                    });
                  },
                  fail: function() {
                    // 无法获取文件信息，仍然尝试删除
                    fs.unlink({
                      filePath: tmpDir + '/' + file,
                      success: function() {
                        count++;
                        resolveFile();
                      },
                      fail: function() {
                        resolveFile();
                      }
                    });
                  }
                });
              });
              
              deletePromises.push(deletePromise);
            }
          }
          
          // 等待所有文件删除完成
          Promise.all(deletePromises).then(() => {
            console.log('[系统工具] 已清理临时文件', count, '个，释放空间约', (bytesCleared / 1024).toFixed(2), 'KB');
            resolve(bytesCleared);
          });
        },
        fail: function(err) {
          console.warn('[系统工具] 读取临时目录失败:', err);
          resolve(0);
        }
      });
    } catch (e) {
      console.error('[系统工具] 清理文件系统失败:', e);
      resolve(0);
    }
  });
}

/**
 * 获取系统存储状态
 * @returns {Promise<Object>} 存储状态信息
 */
function getSystemStorageStatus() {
  return new Promise((resolve) => {
    try {
      // 获取存储信息
      const storageInfo = wx.getStorageInfoSync();
      
      // 获取文件系统信息(仅为模拟数据，微信小程序暂不支持直接获取)
      const result = {
        storage: {
          currentSize: storageInfo.currentSize || 0,
          limitSize: storageInfo.limitSize || 0,
          usage: storageInfo.limitSize ? (storageInfo.currentSize / storageInfo.limitSize) : 0,
          keys: storageInfo.keys || []
        },
        filesystem: {
          // 目前微信小程序无法直接获取文件系统使用情况，这些值是估算的
          available: true,
          estimatedUsage: 0
        },
        systemInfo: wx.getSystemInfoSync()
      };
      
      resolve(result);
    } catch (err) {
      console.error('[系统工具] 获取存储状态失败:', err);
      resolve({
        storage: { currentSize: 0, limitSize: 0, usage: 0, keys: [] },
        filesystem: { available: false },
        error: err.message
      });
    }
  });
}

// 导出工具函数
module.exports = {
  cleanupSystemStorage,
  cleanupLocalStorage,
  cleanupFileSystem,
  getSystemStorageStatus
}; 