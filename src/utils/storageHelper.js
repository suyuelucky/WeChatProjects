/**
 * 存储管理工具类
 * 提供照片存储和管理功能
 */

const { log, reportError } = require('./logger');

// 照片存储根目录
const PHOTOS_DIR = 'photo_capture';
// 元数据存储键
const PHOTO_META_KEY = 'photo_metadata';

/**
 * 确保存储目录存在
 * @private
 * @return {Promise} 操作结果Promise
 */
const _ensureDirectoryExists = function() {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager();
    
    // 检查目录是否存在
    fs.access({
      path: `${wx.env.USER_DATA_PATH}/${PHOTOS_DIR}`,
      success: () => {
        // 目录已存在
        resolve();
      },
      fail: () => {
        // 目录不存在，创建目录
        fs.mkdir({
          dirPath: `${wx.env.USER_DATA_PATH}/${PHOTOS_DIR}`,
          recursive: true,
          success: () => {
            resolve();
          },
          fail: (error) => {
            reportError('创建存储目录失败', error);
            reject(error);
          }
        });
      }
    });
  });
};

/**
 * 检查存储空间
 * @return {Promise<Object>} 存储空间信息
 */
const checkStorageSpace = function() {
  return new Promise((resolve, reject) => {
    try {
      wx.getStorageInfo({
        success: (res) => {
          const spaceInfo = {
            currentSize: res.currentSize, // 当前占用空间，单位KB
            limitSize: res.limitSize,     // 限制空间，单位KB
            freeSize: res.limitSize - res.currentSize,
            percentUsed: (res.currentSize / res.limitSize * 100).toFixed(2)
          };
          resolve(spaceInfo);
        },
        fail: (error) => {
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * 保存照片到本地存储
 * @param {string} tempFilePath - 临时文件路径
 * @param {Object} [metadata={}] - 照片元数据
 * @return {Promise<string>} 永久存储路径
 */
const savePhotoToStorage = function(tempFilePath, metadata = {}) {
  return new Promise((resolve, reject) => {
    if (!tempFilePath) {
      reject(new Error('临时文件路径不能为空'));
      return;
    }
    
    // 确保存储目录存在
    _ensureDirectoryExists()
      .then(() => {
        const fs = wx.getFileSystemManager();
        
        // 生成唯一文件名
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const fileName = `photo_${timestamp}_${randomStr}.jpg`;
        const savedFilePath = `${wx.env.USER_DATA_PATH}/${PHOTOS_DIR}/${fileName}`;
        
        // 保存文件
        fs.saveFile({
          tempFilePath: tempFilePath,
          filePath: savedFilePath,
          success: (res) => {
            // 更新元数据
            const photoData = {
              id: `${timestamp}_${randomStr}`,
              path: savedFilePath,
              createTime: timestamp,
              ...metadata
            };
            
            // 保存元数据
            savePhotoMetadata(photoData)
              .then(() => {
                log('照片保存成功：' + savedFilePath);
                resolve(savedFilePath);
              })
              .catch((error) => {
                reportError('保存照片元数据失败', error);
                reject(error);
              });
          },
          fail: (error) => {
            reportError('保存照片失败', error);
            reject(error);
          }
        });
      })
      .catch(reject);
  });
};

/**
 * 保存照片元数据
 * @private
 * @param {Object} photoData - 照片数据
 * @return {Promise} 操作结果Promise
 */
const savePhotoMetadata = function(photoData) {
  return new Promise((resolve, reject) => {
    try {
      // 获取现有元数据
      wx.getStorage({
        key: PHOTO_META_KEY,
        success: (res) => {
          let metadata = res.data || [];
          
          // 检查照片ID是否已存在
          const existingIndex = metadata.findIndex(item => item.id === photoData.id);
          if (existingIndex >= 0) {
            // 更新现有记录
            metadata[existingIndex] = photoData;
          } else {
            // 添加新记录
            metadata.push(photoData);
          }
          
          // 保存更新后的元数据
          wx.setStorage({
            key: PHOTO_META_KEY,
            data: metadata,
            success: resolve,
            fail: reject
          });
        },
        fail: () => {
          // 元数据不存在，创建新的元数据数组
          wx.setStorage({
            key: PHOTO_META_KEY,
            data: [photoData],
            success: resolve,
            fail: reject
          });
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * 获取照片列表
 * @param {Object} [filter={}] - 过滤条件
 * @param {number} [limit=50] - 返回数量限制
 * @param {string} [order='desc'] - 排序方式: 'asc'或'desc'
 * @return {Promise<Array>} 照片列表
 */
const getPhotoList = function(filter = {}, limit = 50, order = 'desc') {
  return new Promise((resolve, reject) => {
    try {
      wx.getStorage({
        key: PHOTO_META_KEY,
        success: (res) => {
          let photos = res.data || [];
          
          // 应用过滤条件
          if (Object.keys(filter).length > 0) {
            photos = photos.filter(photo => {
              return Object.keys(filter).every(key => {
                // 简单的相等比较
                return photo[key] === filter[key];
              });
            });
          }
          
          // 按创建时间排序
          photos.sort((a, b) => {
            return order === 'desc' 
              ? b.createTime - a.createTime 
              : a.createTime - b.createTime;
          });
          
          // 应用数量限制
          if (photos.length > limit) {
            photos = photos.slice(0, limit);
          }
          
          resolve(photos);
        },
        fail: () => {
          // 没有元数据，返回空数组
          resolve([]);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * 删除照片
 * @param {string} photoId - 照片ID
 * @return {Promise} 操作结果Promise
 */
const deletePhoto = function(photoId) {
  return new Promise((resolve, reject) => {
    if (!photoId) {
      reject(new Error('照片ID不能为空'));
      return;
    }
    
    // 获取照片元数据
    getPhotoList()
      .then(photos => {
        const photoIndex = photos.findIndex(photo => photo.id === photoId);
        
        if (photoIndex < 0) {
          reject(new Error('照片不存在'));
          return;
        }
        
        const photoToDelete = photos[photoIndex];
        const fs = wx.getFileSystemManager();
        
        // 删除文件
        fs.unlink({
          filePath: photoToDelete.path,
          success: () => {
            // 从元数据中移除
            photos.splice(photoIndex, 1);
            
            // 更新元数据
            wx.setStorage({
              key: PHOTO_META_KEY,
              data: photos,
              success: () => {
                log('成功删除照片：' + photoId);
                resolve();
              },
              fail: (error) => {
                reportError('更新元数据失败', error);
                reject(error);
              }
            });
          },
          fail: (error) => {
            reportError('删除照片文件失败', error);
            reject(error);
          }
        });
      })
      .catch(reject);
  });
};

/**
 * 批量删除照片
 * @param {Array<string>} photoIds - 照片ID数组
 * @return {Promise<Object>} 操作结果Promise
 */
const batchDeletePhotos = function(photoIds) {
  if (!Array.isArray(photoIds) || photoIds.length === 0) {
    return Promise.resolve({ success: 0, failed: 0, total: 0 });
  }
  
  return new Promise((resolve) => {
    const results = {
      success: 0,
      failed: 0,
      total: photoIds.length,
      errors: []
    };
    
    let completed = 0;
    
    // 处理单个删除操作
    const processDelete = (index) => {
      if (index >= photoIds.length) {
        return;
      }
      
      deletePhoto(photoIds[index])
        .then(() => {
          results.success++;
        })
        .catch((error) => {
          results.failed++;
          results.errors.push({
            id: photoIds[index],
            error: error.message
          });
        })
        .finally(() => {
          completed++;
          
          if (completed === photoIds.length) {
            resolve(results);
          } else {
            processDelete(index + 1);
          }
        });
    };
    
    // 开始处理
    processDelete(0);
  });
};

/**
 * 清理临时缓存
 * @return {Promise} 操作结果Promise
 */
const clearTempCache = function() {
  return new Promise((resolve, reject) => {
    try {
      const fs = wx.getFileSystemManager();
      
      // 移除临时文件
      fs.readdir({
        dirPath: wx.env.USER_DATA_PATH,
        success: (res) => {
          const tempFiles = res.files.filter(file => 
            file.startsWith('compressed_') || file.startsWith('tmp_')
          );
          
          if (tempFiles.length === 0) {
            resolve();
            return;
          }
          
          let deletedCount = 0;
          let errorCount = 0;
          
          tempFiles.forEach(file => {
            fs.unlink({
              filePath: `${wx.env.USER_DATA_PATH}/${file}`,
              success: () => {
                deletedCount++;
                if (deletedCount + errorCount === tempFiles.length) {
                  log(`清理缓存完成：成功 ${deletedCount}，失败 ${errorCount}`);
                  resolve();
                }
              },
              fail: () => {
                errorCount++;
                if (deletedCount + errorCount === tempFiles.length) {
                  log(`清理缓存完成：成功 ${deletedCount}，失败 ${errorCount}`);
                  resolve();
                }
              }
            });
          });
        },
        fail: (error) => {
          reportError('读取临时目录失败', error);
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  savePhotoToStorage,
  getPhotoList,
  deletePhoto,
  batchDeletePhotos,
  checkStorageSpace,
  clearTempCache
}; 