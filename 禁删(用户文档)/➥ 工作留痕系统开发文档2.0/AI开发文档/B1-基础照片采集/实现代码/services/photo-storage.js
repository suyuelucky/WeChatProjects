/**
 * 照片存储服务
 * 负责照片的本地存储和云端上传
 */

// 存储键名
const STORAGE_KEYS = {
  PHOTOS: 'photo_list_storage',
  PENDING_UPLOADS: 'pending_photo_uploads'
};

// 照片状态枚举
const PhotoStatus = {
  LOCAL: 'local',         // 仅本地存储
  UPLOADING: 'uploading', // 上传中
  UPLOADED: 'uploaded',   // 已上传到云端
  FAILED: 'failed'        // 上传失败
};

/**
 * 照片存储服务类
 */
class PhotoStorageService {
  constructor() {
    // 初始化
    this.pendingUploads = this._getPendingUploads();
  }

  /**
   * 保存照片到本地存储
   * @param {Object} photo 照片信息对象
   * @returns {Promise<String>} 照片ID
   */
  async savePhoto(photo) {
    try {
      // 获取现有照片列表
      const photoList = await this.getPhotoList();
      
      // 为照片生成唯一ID
      const photoId = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      
      // 构建照片存储对象
      const photoData = {
        id: photoId,
        path: photo.path,
        timestamp: photo.timestamp || Date.now(),
        status: PhotoStatus.LOCAL,
        cloudPath: null,
        metadata: {
          mode: photo.mode || 'normal',
          position: photo.position || 'back',
          size: photo.size || null,
          width: photo.width || null,
          height: photo.height || null
        }
      };
      
      // 添加到照片列表
      photoList.push(photoData);
      
      // 保存更新后的照片列表
      await this._savePhotoList(photoList);
      
      return photoId;
    } catch (err) {
      console.error('Save photo failed:', err);
      throw err;
    }
  }

  /**
   * 获取照片列表
   * @returns {Promise<Array>} 照片列表数组
   */
  async getPhotoList() {
    return new Promise((resolve, reject) => {
      wx.getStorage({
        key: STORAGE_KEYS.PHOTOS,
        success: res => {
          resolve(res.data || []);
        },
        fail: () => {
          // 如果不存在，返回空数组
          resolve([]);
        }
      });
    });
  }

  /**
   * 获取照片详情
   * @param {String} photoId 照片ID
   * @returns {Promise<Object>} 照片信息对象
   */
  async getPhotoById(photoId) {
    const photoList = await this.getPhotoList();
    return photoList.find(photo => photo.id === photoId) || null;
  }

  /**
   * 删除照片
   * @param {String} photoId 照片ID
   * @returns {Promise<Boolean>} 是否删除成功
   */
  async deletePhoto(photoId) {
    try {
      // 获取照片列表
      const photoList = await this.getPhotoList();
      
      // 查找照片索引
      const index = photoList.findIndex(photo => photo.id === photoId);
      
      if (index === -1) {
        return false;
      }
      
      // 获取照片信息
      const photo = photoList[index];
      
      // 如果已上传到云端，则同时删除云端文件
      if (photo.status === PhotoStatus.UPLOADED && photo.cloudPath) {
        try {
          await wx.cloud.deleteFile({
            fileList: [photo.cloudPath]
          });
        } catch (err) {
          console.error('Delete cloud file failed:', err);
          // 不影响本地删除流程，只记录错误
        }
      }
      
      // 从列表中移除照片
      photoList.splice(index, 1);
      
      // 保存更新后的照片列表
      await this._savePhotoList(photoList);
      
      // 删除对应的临时文件（如果可能）
      try {
        await wx.removeSavedFile({
          filePath: photo.path
        });
      } catch (err) {
        console.error('Remove saved file failed:', err);
        // 不影响删除流程，只记录错误
      }
      
      return true;
    } catch (err) {
      console.error('Delete photo failed:', err);
      throw err;
    }
  }

  /**
   * 上传照片到云端
   * @param {String} photoId 照片ID
   * @param {Object} options 上传选项
   * @returns {Promise<Object>} 上传结果
   */
  async uploadPhoto(photoId, options = {}) {
    try {
      // 获取照片信息
      const photo = await this.getPhotoById(photoId);
      
      if (!photo) {
        throw new Error('Photo not found');
      }
      
      // 更新照片状态为上传中
      await this._updatePhotoStatus(photoId, PhotoStatus.UPLOADING);
      
      // 添加到待上传队列
      this._addToPendingUploads(photoId);
      
      // 构建云存储路径
      const cloudPath = options.cloudPath || 
        `photos/${photo.timestamp}-${Math.random().toString(36).substring(2)}.jpg`;
      
      // 执行上传
      const uploadTask = wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: photo.path,
        success: async res => {
          // 上传成功，更新照片信息
          const fileID = res.fileID;
          
          await this._updatePhotoCloud(photoId, {
            status: PhotoStatus.UPLOADED,
            cloudPath: fileID
          });
          
          // 从待上传队列中移除
          this._removeFromPendingUploads(photoId);
          
          if (options.success) {
            options.success(res);
          }
        },
        fail: async err => {
          // 上传失败，更新状态
          await this._updatePhotoStatus(photoId, PhotoStatus.FAILED);
          
          console.error('Upload photo failed:', err);
          
          if (options.fail) {
            options.fail(err);
          }
        }
      });
      
      // 监听上传进度
      if (options.onProgressUpdate) {
        uploadTask.onProgressUpdate(options.onProgressUpdate);
      }
      
      return uploadTask;
    } catch (err) {
      console.error('Upload photo error:', err);
      throw err;
    }
  }

  /**
   * 批量上传照片
   * @param {Array<String>} photoIds 照片ID数组
   * @param {Object} options 上传选项
   * @returns {Promise<Array>} 上传结果数组
   */
  async batchUploadPhotos(photoIds, options = {}) {
    // 记录上传任务和结果
    const uploadTasks = [];
    const results = [];
    
    // 最大并发数
    const maxConcurrent = options.maxConcurrent || 3;
    let activeUploads = 0;
    let nextIndex = 0;
    
    return new Promise((resolve, reject) => {
      // 开始上传函数
      const startNextUpload = () => {
        if (nextIndex >= photoIds.length) {
          // 所有任务已启动
          if (activeUploads === 0) {
            // 并且所有上传已完成
            resolve(results);
          }
          return;
        }
        
        const photoId = photoIds[nextIndex++];
        activeUploads++;
        
        // 上传单个照片
        this.uploadPhoto(photoId, {
          onProgressUpdate: res => {
            if (options.onProgressUpdate) {
              options.onProgressUpdate({
                photoId,
                progress: res.progress,
                totalBytesSent: res.totalBytesSent,
                totalBytesExpectedToSend: res.totalBytesExpectedToSend
              });
            }
          },
          success: res => {
            results.push({
              photoId,
              success: true,
              fileID: res.fileID
            });
          },
          fail: err => {
            results.push({
              photoId,
              success: false,
              error: err
            });
          }
        }).then(uploadTask => {
          uploadTasks.push(uploadTask);
          
          // 监听上传完成事件
          uploadTask.then(() => {
            activeUploads--;
            startNextUpload();
          }).catch(() => {
            activeUploads--;
            startNextUpload();
          });
        }).catch(err => {
          results.push({
            photoId,
            success: false,
            error: err
          });
          
          activeUploads--;
          startNextUpload();
        });
        
        // 如果并发数未达到最大值，继续启动下一个上传
        if (activeUploads < maxConcurrent) {
          startNextUpload();
        }
      };
      
      // 开始首批上传
      for (let i = 0; i < Math.min(maxConcurrent, photoIds.length); i++) {
        startNextUpload();
      }
    });
  }

  /**
   * 重试失败的上传
   * @param {String} photoId 照片ID
   * @param {Object} options 上传选项
   * @returns {Promise<Object>} 上传结果
   */
  async retryUpload(photoId, options = {}) {
    try {
      const photo = await this.getPhotoById(photoId);
      
      if (!photo) {
        throw new Error('Photo not found');
      }
      
      if (photo.status !== PhotoStatus.FAILED) {
        throw new Error('Photo is not in failed status');
      }
      
      return this.uploadPhoto(photoId, options);
    } catch (err) {
      console.error('Retry upload failed:', err);
      throw err;
    }
  }

  /**
   * 重试所有失败的上传
   * @param {Object} options 上传选项
   * @returns {Promise<Array>} 上传结果数组
   */
  async retryAllFailedUploads(options = {}) {
    try {
      // 获取照片列表
      const photoList = await this.getPhotoList();
      
      // 筛选出状态为失败的照片
      const failedPhotoIds = photoList
        .filter(photo => photo.status === PhotoStatus.FAILED)
        .map(photo => photo.id);
      
      if (failedPhotoIds.length === 0) {
        return [];
      }
      
      return this.batchUploadPhotos(failedPhotoIds, options);
    } catch (err) {
      console.error('Retry all failed uploads error:', err);
      throw err;
    }
  }

  /**
   * 检查是否有待上传的照片
   * @returns {Promise<Boolean>} 是否有待上传的照片
   */
  async hasPendingUploads() {
    return this.pendingUploads.length > 0;
  }

  /**
   * 继续上传所有待上传的照片
   * @param {Object} options 上传选项
   * @returns {Promise<Array>} 上传结果数组
   */
  async resumePendingUploads(options = {}) {
    try {
      if (this.pendingUploads.length === 0) {
        return [];
      }
      
      // 复制一份待上传队列
      const pendingIds = [...this.pendingUploads];
      
      return this.batchUploadPhotos(pendingIds, options);
    } catch (err) {
      console.error('Resume pending uploads error:', err);
      throw err;
    }
  }

  /**
   * 清理临时文件
   * @returns {Promise<Number>} 清理的文件数量
   */
  async cleanupTempFiles() {
    try {
      // 获取照片列表
      const photoList = await this.getPhotoList();
      
      // 标记为已上传成功的照片
      const uploadedPhotos = photoList.filter(
        photo => photo.status === PhotoStatus.UPLOADED
      );
      
      let cleanedCount = 0;
      
      // 删除已上传成功的临时文件
      for (const photo of uploadedPhotos) {
        try {
          await wx.removeSavedFile({
            filePath: photo.path
          });
          cleanedCount++;
        } catch (err) {
          console.error('Remove temp file failed:', err, photo.path);
          // 继续处理下一个文件
        }
      }
      
      return cleanedCount;
    } catch (err) {
      console.error('Cleanup temp files error:', err);
      throw err;
    }
  }

  /**
   * 保存照片列表到存储
   * @private
   * @param {Array} photoList 照片列表
   * @returns {Promise<void>}
   */
  async _savePhotoList(photoList) {
    return new Promise((resolve, reject) => {
      wx.setStorage({
        key: STORAGE_KEYS.PHOTOS,
        data: photoList,
        success: () => resolve(),
        fail: err => reject(err)
      });
    });
  }

  /**
   * 更新照片状态
   * @private
   * @param {String} photoId 照片ID
   * @param {String} status 新状态
   * @returns {Promise<void>}
   */
  async _updatePhotoStatus(photoId, status) {
    // 获取照片列表
    const photoList = await this.getPhotoList();
    
    // 查找并更新照片状态
    const photo = photoList.find(p => p.id === photoId);
    
    if (photo) {
      photo.status = status;
      await this._savePhotoList(photoList);
    }
  }

  /**
   * 更新照片云端信息
   * @private
   * @param {String} photoId 照片ID
   * @param {Object} cloudInfo 云端信息对象
   * @returns {Promise<void>}
   */
  async _updatePhotoCloud(photoId, cloudInfo) {
    // 获取照片列表
    const photoList = await this.getPhotoList();
    
    // 查找并更新照片信息
    const photo = photoList.find(p => p.id === photoId);
    
    if (photo) {
      Object.assign(photo, cloudInfo);
      await this._savePhotoList(photoList);
    }
  }

  /**
   * 获取待上传队列
   * @private
   * @returns {Array<String>} 待上传的照片ID数组
   */
  _getPendingUploads() {
    try {
      const pendingUploads = wx.getStorageSync(STORAGE_KEYS.PENDING_UPLOADS);
      return pendingUploads || [];
    } catch (err) {
      console.error('Get pending uploads failed:', err);
      return [];
    }
  }

  /**
   * 保存待上传队列
   * @private
   * @returns {void}
   */
  _savePendingUploads() {
    try {
      wx.setStorageSync(STORAGE_KEYS.PENDING_UPLOADS, this.pendingUploads);
    } catch (err) {
      console.error('Save pending uploads failed:', err);
    }
  }

  /**
   * 添加到待上传队列
   * @private
   * @param {String} photoId 照片ID
   * @returns {void}
   */
  _addToPendingUploads(photoId) {
    if (!this.pendingUploads.includes(photoId)) {
      this.pendingUploads.push(photoId);
      this._savePendingUploads();
    }
  }

  /**
   * 从待上传队列中移除
   * @private
   * @param {String} photoId 照片ID
   * @returns {void}
   */
  _removeFromPendingUploads(photoId) {
    const index = this.pendingUploads.indexOf(photoId);
    if (index !== -1) {
      this.pendingUploads.splice(index, 1);
      this._savePendingUploads();
    }
  }
}

// 导出单例
let instance = null;
export default function getPhotoStorageService() {
  if (!instance) {
    instance = new PhotoStorageService();
  }
  return instance;
} 