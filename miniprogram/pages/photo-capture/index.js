// 照片采集页面逻辑
const app = getApp();

// 导入安全过滤器和照片元数据净化工具
const SecurityFilter = require('../../utils/security-filter.js');
// 导入内存管理器和图片缓存管理器
const MemoryManager = require('../../utils/memory-manager.js');
const EnhancedImageCacheManager = require('../../utils/enhanced-image-cache-manager.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 相机设置
    initialMode: 'normal', // normal, continuous, timer
    resolution: 'medium',  // low, medium, high
    timerDelay: 3,         // 定时器延迟秒数
    
    // 界面状态
    isPreviewMode: false,   // 是否处于预览模式
    showPreviewControls: true, // 是否显示预览控制区
    isLoading: false,       // 是否显示加载指示器
    loadingText: '处理中...', // 加载提示文字
    
    // 照片数据
    photoList: [],          // 照片列表
    currentIndex: 0,        // 当前预览的照片索引
    
    // 内存管理
    lowMemoryMode: false,   // 是否处于低内存模式
    imageQuality: 95        // 图片质量设置，可动态调整
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 获取页面参数
    if (options.mode) {
      this.setData({
        initialMode: options.mode
      });
    }
    
    if (options.resolution) {
      this.setData({
        resolution: options.resolution
      });
    }
    
    if (options.timerDelay) {
      this.setData({
        timerDelay: parseInt(options.timerDelay) || 3
      });
    }
    
    // 初始化内存管理器
    this._initMemoryManager();
    
    // 初始化图片缓存管理器
    this._initImageCacheManager();
    
    // 注册内存警告监听
    this._setupMemoryWarning();
  },

  /**
   * 初始化内存管理器
   * @private
   */
  _initMemoryManager: function() {
    // 初始化内存管理器
    this.memoryManager = MemoryManager.init({
      debugMode: false,
      monitorInterval: 15000, // 15秒检查一次
      warningThresholdMB: 120,
      criticalThresholdMB: 150,
      autoCleanup: true
    });
    
    // 注册内存清理事件
    wx.onAppHide(() => {
      this._releaseResources(false);
    });
    
    // 页面切换事件
    wx.onAppShow(() => {
      this._restoreResources();
    });
  },
  
  /**
   * 初始化图片缓存管理器
   * @private
   */
  _initImageCacheManager: function() {
    // 初始化增强版图片缓存管理器
    this.imageCacheManager = EnhancedImageCacheManager.init({
      maxMemoryCacheItems: 10, // 减少内存缓存最大项数
      maxDiskCacheItems: 50,  // 设置磁盘缓存项数
      cacheTTL: 24 * 60 * 60 * 1000, // 1天缓存有效期
      autoCleanup: true,
      logLevel: 1 // 仅输出错误
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    // 获取相机组件实例
    this.cameraManager = this.selectComponent('#cameraManager');
  },
  
  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {
    // 页面显示时恢复资源
    this._restoreResources();
  },
  
  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function() {
    // 页面隐藏时释放不必要的资源
    this._releaseResources(false);
  },
  
  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function() {
    // 页面卸载时彻底清理所有资源
    this._releaseResources(true);
    
    // 取消内存警告监听
    if (this._memoryWarningCallback) {
      wx.offMemoryWarning(this._memoryWarningCallback);
      this._memoryWarningCallback = null;
    }
    
    // 清空照片列表引用，防止在页面销毁后仍然占用内存
    this.setData({
      photoList: []
    }, () => {
      // 强制清理临时文件和内存
      this._cleanupTempPhotos(this.data.photoList);
      this.data.photoList = null;
    });
  },

  /**
   * 设置内存警告监听
   * @private
   */
  _setupMemoryWarning: function() {
    this._memoryWarningCallback = (res) => {
      console.warn(`[照片采集页面] 收到内存警告，级别: ${res.level}`);
      
      // 根据内存警告级别采取措施
      if (res.level >= 5) {
        // 严重内存不足，释放资源并进入低内存模式
        this._releaseResources(false);
        this._enterLowMemoryMode();
        
        wx.showToast({
          title: '内存不足，已释放部分资源',
          icon: 'none',
          duration: 2000
        });
      } else if (res.level >= 2) {
        // 中度内存不足，释放部分资源
        this._enterLowMemoryMode();
        // 主动触发垃圾回收
        this._forceGarbageCollection();
      }
    };
    
    // 注册内存警告监听
    wx.onMemoryWarning(this._memoryWarningCallback);
  },
  
  /**
   * 进入低内存模式
   * @private
   */
  _enterLowMemoryMode: function() {
    this.setData({
      lowMemoryMode: true,
      imageQuality: 80 // 降低图片质量
    });
    
    // 释放预览图和缓存
    if (this.data.photoList.length > 5) {
      // 仅保留最近的5张照片
      const keptPhotos = this.data.photoList.slice(-5);
      const removedPhotos = this.data.photoList.slice(0, -5);
      
      // 清理移除的照片临时文件
      this._cleanupTempPhotos(removedPhotos);
      
      // 更新列表
      this.setData({
        photoList: keptPhotos,
        currentIndex: Math.min(this.data.currentIndex, keptPhotos.length - 1)
      });
    }
  },
  
  /**
   * 离开低内存模式
   * @private
   */
  _exitLowMemoryMode: function() {
    this.setData({
      lowMemoryMode: false,
      imageQuality: 95
    });
  },
  
  /**
   * 强制触发垃圾回收（间接方法）
   * @private
   */
  _forceGarbageCollection: function() {
    // 微信小程序无法直接调用GC，这里使用间接方法
    
    // 1. 清理大对象引用
    this.tempObjects = null;
    
    // 2. 主动请求下次渲染
    this.setData({
      timestamp: Date.now()
    });
    
    // 3. 延迟执行，给予JS引擎GC的机会
    setTimeout(() => {
      console.log('[照片采集页面] 已尝试释放内存');
    }, 500);
  },
  
  /**
   * 恢复资源
   * @private
   */
  _restoreResources: function() {
    // 根据当前内存状态决定是否恢复完整功能
    const memoryInfo = MemoryManager.getMemoryInfo();
    
    if (memoryInfo && memoryInfo.jsHeapSizeMB < 100) {
      // 内存充足，退出低内存模式
      this._exitLowMemoryMode();
    }
  },
  
  /**
   * 释放资源
   * @param {Boolean} isComplete 是否完全释放
   * @private
   */
  _releaseResources: function(isComplete) {
    // 如果在预览模式，先退出预览模式
    if (this.data.isPreviewMode) {
      this.setData({
        isPreviewMode: false
      });
    }
    
    // 如果是彻底清理，则删除所有临时文件
    if (isComplete && this.data.photoList && this.data.photoList.length > 0) {
      try {
        // 清理不需要的临时文件
        this._cleanupTempPhotos(this.data.photoList.filter(photo => !photo.isSelected));
      } catch (err) {
        console.error('资源释放出错:', err);
      }
    } else if (!isComplete && this.data.photoList && this.data.photoList.length > 10) {
      // 部分清理，只保留最新的10张照片
      const keptPhotos = this.data.photoList.slice(-10);
      const removedPhotos = this.data.photoList.slice(0, -10);
      
      // 清理旧照片
      this._cleanupTempPhotos(removedPhotos);
      
      // 更新列表
      this.setData({
        photoList: keptPhotos,
        currentIndex: Math.min(this.data.currentIndex, keptPhotos.length - 1)
      });
    }
    
    // 强制垃圾回收
    this._forceGarbageCollection();
  },

  /**
   * 照片拍摄成功事件处理
   */
  onPhotoTaken: function (e) {
    const { photo } = e.detail;
    
    // 优化：根据内存模式限制照片列表最大数量
    const maxPhotos = this.data.lowMemoryMode ? 10 : 20;
    let photoList = this.data.photoList.concat(photo);
    
    if (photoList.length > maxPhotos) {
      // 移除最早的照片并清理其临时文件
      const removedPhotos = photoList.splice(0, photoList.length - maxPhotos);
      this._cleanupTempPhotos(removedPhotos);
    }
    
    this.setData({
      photoList: photoList
    });
    
    // 显示拍照成功提示
    wx.showToast({
      title: '拍照成功',
      icon: 'success',
      duration: 1000
    });
  },
  
  /**
   * 清理临时照片文件
   * @param {Array} photos 要清理的照片数组
   * @private
   */
  _cleanupTempPhotos: function(photos) {
    if (!photos || photos.length === 0) return;
    
    const fs = wx.getFileSystemManager();
    photos.forEach(photo => {
      if (photo && photo.path && photo.path.indexOf('tmp') !== -1) {
        try {
          fs.unlink({
            filePath: photo.path,
            fail: (err) => {
              console.warn('删除临时文件失败:', err);
            }
          });
        } catch (e) {
          console.error('清理临时文件出错:', e);
        }
      }
    });
  },

  /**
   * 权限被拒绝事件处理
   */
  onPermissionDenied: function () {
    wx.showModal({
      title: '无法使用相机',
      content: '您拒绝了相机权限，无法使用拍照功能。是否前往设置开启权限？',
      confirmText: '前往设置',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting();
        }
      }
    });
  },

  /**
   * 相机错误事件处理
   */
  onCameraError: function (e) {
    console.error('Camera error:', e.detail.error);
    
    wx.showToast({
      title: '相机出现错误',
      icon: 'error',
      duration: 2000
    });
  },

  /**
   * 打开预览模式
   */
  openPreview: function () {
    if (this.data.photoList.length === 0) {
      wx.showToast({
        title: '没有可预览的照片',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      isPreviewMode: true,
      currentIndex: 0,
      showPreviewControls: true
    });
  },

  /**
   * 关闭预览模式
   */
  closePreview: function () {
    this.setData({
      isPreviewMode: false
    });
    
    // 关闭预览模式后主动释放部分资源
    this._forceGarbageCollection();
  },

  /**
   * 切换预览控制区显示状态
   */
  toggleControls: function () {
    this.setData({
      showPreviewControls: !this.data.showPreviewControls
    });
  },

  /**
   * 滑动切换照片时的事件处理
   */
  onSwiperChange: function (e) {
    const newIndex = e.detail.current;
    
    // 使用缓存预加载相邻图片，提升性能
    if (this.data.photoList.length > 1) {
      // 预加载前后各一张图（如果存在）
      const prevIndex = (newIndex - 1 + this.data.photoList.length) % this.data.photoList.length;
      const nextIndex = (newIndex + 1) % this.data.photoList.length;
      
      // 使用增强型图片缓存管理器处理相邻图片
      const prevPhoto = this.data.photoList[prevIndex];
      const nextPhoto = this.data.photoList[nextIndex];
      
      if (prevPhoto) {
        this.imageCacheManager.set('preview_' + prevPhoto.path, prevPhoto.path);
      }
      
      if (nextPhoto) {
        this.imageCacheManager.set('preview_' + nextPhoto.path, nextPhoto.path);
      }
    }
    
    this.setData({
      currentIndex: newIndex,
      showPreviewControls: true
    });
  },

  /**
   * 删除当前照片
   */
  deleteCurrentPhoto: function () {
    const { photoList, currentIndex } = this.data;
    
    if (photoList.length === 0) {
      return;
    }
    
    wx.showModal({
      title: '删除照片',
      content: '确定要删除这张照片吗？',
      success: (res) => {
        if (res.confirm) {
          // 获取要删除的照片
          const photoToDelete = photoList[currentIndex];
          
          // 创建新数组，移除当前照片
          const newPhotoList = photoList.filter((_, index) => index !== currentIndex);
          
          // 调整当前索引
          let newIndex = currentIndex;
          if (newIndex >= newPhotoList.length) {
            newIndex = Math.max(0, newPhotoList.length - 1);
          }
          
          this.setData({
            photoList: newPhotoList,
            currentIndex: newIndex
          });
          
          // 清理被删除的照片临时文件
          this._cleanupTempPhotos([photoToDelete]);
          
          // 如果没有照片了，关闭预览模式
          if (newPhotoList.length === 0) {
            this.closePreview();
          }
          
          // 主动释放资源
          this._forceGarbageCollection();
        }
      }
    });
  },

  /**
   * 保存照片到相册
   */
  savePhoto: function () {
    const { photoList, currentIndex, imageQuality } = this.data;
    
    if (photoList.length === 0) return;
    
    const photo = photoList[currentIndex];
    
    this.setData({
      isLoading: true,
      loadingText: '保存到相册...'
    });
    
    // 使用安全过滤器清理图片元数据
    SecurityFilter.cleanImageMetadata(photo.path)
      .then(cleanedImagePath => {
        // 在低内存模式下，先压缩图片再保存
        if (this.data.lowMemoryMode) {
          return new Promise((resolve, reject) => {
            wx.compressImage({
              src: cleanedImagePath,
              quality: imageQuality,
              success: (res) => resolve(res.tempFilePath),
              fail: (err) => reject(err)
            });
          });
        }
        return cleanedImagePath;
      })
      .then(finalImagePath => {
        return new Promise((resolve, reject) => {
          wx.saveImageToPhotosAlbum({
            filePath: finalImagePath,
            success: () => resolve(),
            fail: (err) => reject(err)
          });
        });
      })
      .then(() => {
        wx.showToast({
          title: '已保存到相册',
          icon: 'success'
        });
      })
      .catch((err) => {
        console.error('保存照片失败:', err);
        
        let message = '保存失败';
        if (err.errMsg && err.errMsg.indexOf('auth deny') >= 0) {
          wx.showModal({
            title: '保存失败',
            content: '您拒绝了保存到相册的权限，是否前往设置开启？',
            confirmText: '前往设置',
            cancelText: '取消',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
          return;
        }
        
        wx.showToast({
          title: message,
          icon: 'none'
        });
      })
      .finally(() => {
        this.setData({
          isLoading: false
        });
        
        // 操作完成后主动释放资源
        this._forceGarbageCollection();
      });
  },

  /**
   * 使用当前照片
   * 返回上一页并传递选中的照片
   */
  usePhoto: function () {
    const { photoList, currentIndex, imageQuality } = this.data;
    
    if (photoList.length === 0) {
      return;
    }
    
    const photo = photoList[currentIndex];
    
    // 标记被选中的照片
    photo.isSelected = true;
    
    // 上传照片到云存储或处理照片
    const photoService = app.getService('photoService');
    if (photoService) {
      this.setData({
        isLoading: true,
        loadingText: '处理照片...'
      });
      
      // 在低内存模式下，先压缩照片
      let photoToProcess = photo;
      if (this.data.lowMemoryMode) {
        // 使用压缩照片
        const processPhotoPromise = new Promise((resolve, reject) => {
          wx.compressImage({
            src: photo.path,
            quality: imageQuality,
            success: (res) => {
              // 创建新的照片对象，使用压缩后的路径
              const compressedPhoto = { ...photo, path: res.tempFilePath };
              resolve([compressedPhoto]);
            },
            fail: (err) => {
              // 如果压缩失败，使用原图
              console.warn('照片压缩失败，使用原图:', err);
              resolve([photo]);
            }
          });
        });
        
        processPhotoPromise
          .then(photos => photoService.savePhotos(photos))
          .then((savedPhotos) => {
            // 返回上一页并传递照片信息
            const pages = getCurrentPages();
            const prevPage = pages[pages.length - 2];
            
            // 调用上一页的方法或设置数据
            if (prevPage && prevPage.onPhotoSelected) {
              prevPage.onPhotoSelected(savedPhotos);
            }
            
            wx.navigateBack();
          })
          .catch((err) => {
            console.error('处理照片失败:', err);
            
            wx.showToast({
              title: '处理照片失败',
              icon: 'none'
            });
            
            this.setData({
              isLoading: false
            });
          });
      } else {
        // 正常内存模式，直接处理
        photoService.savePhotos([photo])
          .then((savedPhotos) => {
            // 返回上一页并传递照片信息
            const pages = getCurrentPages();
            const prevPage = pages[pages.length - 2];
            
            // 调用上一页的方法或设置数据
            if (prevPage && prevPage.onPhotoSelected) {
              prevPage.onPhotoSelected(savedPhotos);
            }
            
            wx.navigateBack();
          })
          .catch((err) => {
            console.error('处理照片失败:', err);
            
            wx.showToast({
              title: '处理照片失败',
              icon: 'none'
            });
            
            this.setData({
              isLoading: false
            });
          });
      }
    } else {
      // 直接返回照片信息
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      
      // 调用上一页的方法或设置数据
      if (prevPage && prevPage.onPhotoSelected) {
        prevPage.onPhotoSelected([photo]);
      }
      
      wx.navigateBack();
    }
  },

  /**
   * 完成照片采集
   */
  completeCapture: function () {
    const { photoList, imageQuality, lowMemoryMode } = this.data;
    
    if (photoList.length === 0) {
      wx.showModal({
        title: '提示',
        content: '您还没有拍摄任何照片，确定要退出吗？',
        confirmText: '确定',
        cancelText: '继续拍照',
        success: (res) => {
          if (res.confirm) {
            this.navigateBack();
          }
        }
      });
      return;
    }
    
    // 优化：只处理最近拍摄的照片，避免一次处理过多
    const processLimit = lowMemoryMode ? 5 : 10;
    const processPhotos = photoList.length > processLimit ? photoList.slice(-processLimit) : photoList;
    
    // 标记被选中的照片，以便在资源释放时保留
    processPhotos.forEach(photo => {
      photo.isSelected = true;
    });
    
    this.setData({
      isLoading: true,
      loadingText: '处理照片...'
    });
    
    const photoService = app.getService('photoService');
    if (photoService) {
      // 低内存模式下需要先压缩照片
      if (lowMemoryMode) {
        // 逐个处理照片，避免内存峰值过高
        const processPromises = processPhotos.map((photo, index) => {
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              wx.compressImage({
                src: photo.path,
                quality: imageQuality,
                success: (res) => {
                  // 创建新照片对象
                  resolve({
                    ...photo,
                    path: res.tempFilePath,
                    compressed: true
                  });
                },
                fail: (err) => {
                  // 压缩失败返回原照片
                  console.warn('照片压缩失败:', err);
                  resolve(photo);
                }
              });
            }, index * 200); // 间隔处理，避免并发请求过多
          });
        });
        
        Promise.all(processPromises)
          .then(compressedPhotos => photoService.savePhotos(compressedPhotos))
          .then(savedPhotos => {
            // 返回上一页并传递照片信息
            const pages = getCurrentPages();
            const prevPage = pages[pages.length - 2];
            
            // 调用上一页的方法或设置数据
            if (prevPage && prevPage.onPhotosSelected) {
              prevPage.onPhotosSelected(savedPhotos);
            }
            
            wx.navigateBack();
          })
          .catch((err) => {
            console.error('处理照片失败:', err);
            
            wx.showToast({
              title: '处理照片失败',
              icon: 'none'
            });
            
            this.setData({
              isLoading: false
            });
          });
      } else {
        // 正常内存模式，直接处理
        photoService.savePhotos(processPhotos)
          .then((savedPhotos) => {
            // 返回上一页并传递照片信息
            const pages = getCurrentPages();
            const prevPage = pages[pages.length - 2];
            
            // 调用上一页的方法或设置数据
            if (prevPage && prevPage.onPhotosSelected) {
              prevPage.onPhotosSelected(savedPhotos);
            }
            
            wx.navigateBack();
          })
          .catch((err) => {
            console.error('处理照片失败:', err);
            
            wx.showToast({
              title: '处理照片失败',
              icon: 'none'
            });
            
            this.setData({
              isLoading: false
            });
          });
      }
    } else {
      // 直接返回照片信息
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      
      // 调用上一页的方法或设置数据
      if (prevPage && prevPage.onPhotosSelected) {
        prevPage.onPhotosSelected(processPhotos);
      }
      
      wx.navigateBack();
    }
  },
  
  /**
   * 返回上一页
   */
  navigateBack: function() {
    // 返回前清理资源
    this._releaseResources(true);
    wx.navigateBack();
  }
}); 