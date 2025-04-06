const app = getApp();
const EventBus = require('../../../utils/eventBus');

Page({
  data: {
    trace: null,
    traceId: '',
    loading: true,
    saving: false,
    title: '',
    content: '',
    photos: [],
    error: null,
    autoSaveTimer: null,
    lastSaved: null
  },

  onLoad: function(options) {
    // 获取服务
    this.traceService = app.getService('traceService');
    this.photoService = app.getService('photoService');
    
    if (options.id) {
      this.setData({
        traceId: options.id
      });
      this.loadTrace(options.id);
    } else {
      this.setData({
        error: '未指定留痕ID',
        loading: false
      });
    }
    
    // 设置自动保存
    this.startAutoSave();
  },
  
  onUnload: function() {
    // 清除自动保存定时器
    this.clearAutoSave();
  },

  // 加载留痕记录
  loadTrace: function(id) {
    this.setData({
      loading: true,
      error: null
    });
    
    this.traceService.getTraceById(id)
      .then(trace => {
        if (!trace) {
          this.setData({
            error: '未找到留痕记录',
            loading: false
          });
          return;
        }
        
        this.setData({
          trace: trace,
          title: trace.title || '',
          content: trace.content || '',
          loading: false,
          lastSaved: trace.updatedAt ? new Date(trace.updatedAt).toLocaleString() : '未保存'
        });
        
        // 加载照片
        if (trace.photos && trace.photos.length > 0) {
          this.loadPhotos(trace.photos);
        }
      })
      .catch(err => {
        console.error('加载留痕记录失败:', err);
        this.setData({
          error: '加载留痕记录失败',
          loading: false
        });
      });
  },

  // 加载照片
  loadPhotos: function(photoIds) {
    this.photoService.getPhotos({
      ids: photoIds
    })
      .then(photos => {
        this.setData({
          photos: photos
        });
      })
      .catch(err => {
        console.error('加载照片失败:', err);
      });
  },

  // 保存留痕记录
  saveTrace: function(showToast = true) {
    if (!this.data.trace) {
      return Promise.reject(new Error('无效的留痕记录'));
    }
    
    this.setData({
      saving: true
    });
    
    // 更新数据
    const updatedTrace = {
      ...this.data.trace,
      title: this.data.title,
      content: this.data.content,
      photos: this.data.photos.map(photo => photo.id),
      updatedAt: new Date().toISOString()
    };
    
    return this.traceService.saveTrace(updatedTrace)
      .then(trace => {
        this.setData({
          trace: trace,
          saving: false,
          lastSaved: new Date().toLocaleString()
        });
        
        if (showToast) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          });
        }
        
        return trace;
      })
      .catch(err => {
        console.error('保存留痕记录失败:', err);
        this.setData({
          saving: false
        });
        
        if (showToast) {
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          });
        }
        
        return Promise.reject(err);
      });
  },

  // 标题输入
  handleTitleInput: function(e) {
    this.setData({
      title: e.detail.value
    });
  },

  // 内容输入
  handleContentInput: function(e) {
    this.setData({
      content: e.detail.value
    });
  },

  // 手动保存
  handleSave: function() {
    this.saveTrace();
  },

  // 开始自动保存
  startAutoSave: function() {
    // 每30秒自动保存一次
    const autoSaveTimer = setInterval(() => {
      if (this.data.trace && (this.data.title || this.data.content)) {
        this.saveTrace(false)
          .then(() => {
            console.log('自动保存成功');
          })
          .catch(err => {
            console.error('自动保存失败:', err);
          });
      }
    }, 30000); // 30秒
    
    this.setData({
      autoSaveTimer: autoSaveTimer
    });
  },

  // 清除自动保存
  clearAutoSave: function() {
    if (this.data.autoSaveTimer) {
      clearInterval(this.data.autoSaveTimer);
    }
  },

  // 拍摄照片
  handleTakePhoto: function() {
    this.photoService.takePhoto({
      count: 1
    })
      .then(photos => {
        if (photos && photos.length > 0) {
          // 添加到照片列表
          const newPhotos = [...this.data.photos, ...photos];
          this.setData({
            photos: newPhotos
          });
          
          // 保存留痕记录
          this.saveTrace(false);
        }
      })
      .catch(err => {
        console.error('拍照失败:', err);
        wx.showToast({
          title: '拍照失败',
          icon: 'none'
        });
      });
  },

  // 从相册选择
  handleChooseFromAlbum: function() {
    this.photoService.chooseFromAlbum({
      count: 9 - this.data.photos.length
    })
      .then(photos => {
        if (photos && photos.length > 0) {
          // 添加到照片列表
          const newPhotos = [...this.data.photos, ...photos];
          this.setData({
            photos: newPhotos
          });
          
          // 保存留痕记录
          this.saveTrace(false);
        }
      })
      .catch(err => {
        console.error('选择照片失败:', err);
        wx.showToast({
          title: '选择照片失败',
          icon: 'none'
        });
      });
  },

  // 删除照片
  handleDeletePhoto: function(e) {
    const index = e.currentTarget.dataset.index;
    const photos = [...this.data.photos];
    const removedPhoto = photos.splice(index, 1)[0];
    
    this.setData({
      photos: photos
    });
    
    // 保存留痕记录
    this.saveTrace(false);
    
    // 删除照片文件
    this.photoService.deletePhotos(removedPhoto.id)
      .catch(err => {
        console.error('删除照片失败:', err);
      });
  },

  // 预览照片
  handlePreviewPhoto: function(e) {
    const index = e.currentTarget.dataset.index;
    const photos = this.data.photos;
    
    wx.previewImage({
      current: photos[index].path,
      urls: photos.map(photo => photo.path)
    });
  },

  // 完成编辑
  handleComplete: function() {
    // 先保存
    this.saveTrace(false)
      .then(() => {
        // 返回上一页
        wx.navigateBack();
      })
      .catch(() => {
        wx.showModal({
          title: '提示',
          content: '保存失败，确定要离开吗？',
          success: (res) => {
            if (res.confirm) {
              wx.navigateBack();
            }
          }
        });
      });
  }
}); 