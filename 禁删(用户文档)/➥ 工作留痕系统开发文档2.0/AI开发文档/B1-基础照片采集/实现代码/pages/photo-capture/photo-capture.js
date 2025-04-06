// 照片采集页面逻辑
const app = getApp();

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
    currentIndex: 0         // 当前预览的照片索引
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
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    // 获取相机组件实例
    this.cameraManager = this.selectComponent('#cameraManager');
  },

  /**
   * 照片拍摄成功事件处理
   */
  onPhotoTaken: function (e) {
    const { photo } = e.detail;
    
    // 更新照片列表
    const photoList = this.data.photoList.concat(photo);
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
    this.setData({
      currentIndex: e.detail.current,
      showPreviewControls: true
    });
  },

  /**
   * 删除当前预览的照片
   */
  deleteCurrentPhoto: function () {
    const { photoList, currentIndex } = this.data;
    
    if (photoList.length === 0) return;
    
    wx.showModal({
      title: '删除照片',
      content: '确定要删除这张照片吗？',
      success: (res) => {
        if (res.confirm) {
          const newPhotoList = [...photoList];
          newPhotoList.splice(currentIndex, 1);
          
          if (newPhotoList.length === 0) {
            // 如果删除后没有照片了，关闭预览模式
            this.setData({
              photoList: newPhotoList,
              isPreviewMode: false
            });
          } else {
            // 否则调整当前索引
            const newIndex = currentIndex >= newPhotoList.length ? 
              newPhotoList.length - 1 : currentIndex;
            
            this.setData({
              photoList: newPhotoList,
              currentIndex: newIndex
            });
          }
        }
      }
    });
  },

  /**
   * 保存照片到相册
   */
  savePhoto: function () {
    const { photoList, currentIndex } = this.data;
    
    if (photoList.length === 0) return;
    
    const photo = photoList[currentIndex];
    
    this.setData({
      isLoading: true,
      loadingText: '正在保存...'
    });
    
    wx.saveImageToPhotosAlbum({
      filePath: photo.path,
      success: () => {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      },
      fail: (err) => {
        console.error('Save photo failed:', err);
        
        if (err.errMsg.includes('auth deny')) {
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
        } else {
          wx.showToast({
            title: '保存失败',
            icon: 'error'
          });
        }
      },
      complete: () => {
        this.setData({
          isLoading: false
        });
      }
    });
  },

  /**
   * 使用当前照片
   */
  usePhoto: function () {
    const { photoList, currentIndex } = this.data;
    
    if (photoList.length === 0) return;
    
    const selectedPhoto = photoList[currentIndex];
    
    // 上传照片到云存储
    this.uploadPhotoToCloud(selectedPhoto);
  },

  /**
   * 完成照片采集
   */
  completeCapture: function () {
    const { photoList } = this.data;
    
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
    
    // 批量上传照片
    this.batchUploadPhotos();
  },

  /**
   * 上传单张照片到云存储
   */
  uploadPhotoToCloud: function (photo) {
    this.setData({
      isLoading: true,
      loadingText: '正在上传...'
    });
    
    // 这里使用微信小程序云开发能力
    // 实际项目中需要配置云开发环境
    const uploadTask = wx.cloud.uploadFile({
      cloudPath: `photos/${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`,
      filePath: photo.path,
      success: res => {
        // 上传成功，获取云文件ID
        const fileID = res.fileID;
        console.log('Upload success, fileID:', fileID);
        
        // 在这里可以将fileID保存到数据库或传给上一个页面
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];
        
        if (prevPage) {
          // 如果有上一页，将照片信息传回
          prevPage.setData({
            selectedPhoto: {
              path: photo.path,
              cloudPath: fileID,
              timestamp: photo.timestamp
            }
          });
        }
        
        wx.showToast({
          title: '上传成功',
          icon: 'success',
          duration: 1500,
          complete: () => {
            // 延迟返回上一页
            setTimeout(() => {
              this.navigateBack();
            }, 1500);
          }
        });
      },
      fail: err => {
        console.error('Upload failed:', err);
        wx.showToast({
          title: '上传失败',
          icon: 'error'
        });
      },
      complete: () => {
        this.setData({
          isLoading: false
        });
      }
    });
    
    // 监听上传进度变化
    uploadTask.onProgressUpdate(res => {
      this.setData({
        loadingText: `上传中... ${res.progress}%`
      });
    });
  },

  /**
   * 批量上传照片
   */
  batchUploadPhotos: function () {
    const { photoList } = this.data;
    
    if (photoList.length === 0) return;
    
    this.setData({
      isLoading: true,
      loadingText: '准备上传...'
    });
    
    // 记录已完成的上传数量
    let completed = 0;
    let successCount = 0;
    let cloudFileIDs = [];
    
    // 更新进度显示
    const updateProgress = () => {
      this.setData({
        loadingText: `上传中... (${completed}/${photoList.length})`
      });
    };
    
    // 检查是否全部完成
    const checkCompletion = () => {
      completed++;
      updateProgress();
      
      if (completed === photoList.length) {
        // 全部上传完成
        this.setData({
          isLoading: false
        });
        
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];
        
        if (prevPage) {
          // 将照片信息传回上一页
          prevPage.setData({
            uploadedPhotos: cloudFileIDs.map((fileID, index) => ({
              cloudPath: fileID,
              timestamp: photoList[index].timestamp
            }))
          });
        }
        
        wx.showToast({
          title: `上传完成 ${successCount}/${photoList.length}`,
          icon: 'success',
          duration: 2000,
          complete: () => {
            // 延迟返回上一页
            setTimeout(() => {
              this.navigateBack();
            }, 2000);
          }
        });
      }
    };
    
    // 为每张照片创建上传任务
    photoList.forEach((photo, index) => {
      // 构建云存储路径
      const cloudPath = `photos/${Date.now()}-${index}-${Math.random().toString(36).substring(2)}.jpg`;
      
      // 延迟启动每个上传任务，避免并发过高
      setTimeout(() => {
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: photo.path,
          success: res => {
            successCount++;
            cloudFileIDs.push(res.fileID);
          },
          fail: err => {
            console.error(`Upload failed for photo ${index}:`, err);
            cloudFileIDs.push(null); // 保持索引一致
          },
          complete: checkCompletion
        });
      }, index * 200); // 每个任务间隔200ms
    });
    
    updateProgress();
  },

  /**
   * 返回上一页
   */
  navigateBack: function () {
    wx.navigateBack({
      delta: 1
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '照片采集工具',
      path: '/pages/index/index'
    };
  }
}); 