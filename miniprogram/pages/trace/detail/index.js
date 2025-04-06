const app = getApp();
const EventBus = require('../../../utils/eventBus');

Page({
  data: {
    trace: null,
    traceId: '',
    photos: [],
    loading: true,
    error: null,
    typeName: ''
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
  },

  onShow: function() {
    // 如果有ID，每次显示页面时刷新数据
    if (this.data.traceId) {
      this.loadTrace(this.data.traceId);
    }
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
        
        // 获取留痕类型名称
        const traceTypes = this.traceService.getTraceTypes();
        const typeObj = traceTypes.find(type => type.id === trace.type);
        
        this.setData({
          trace: trace,
          loading: false,
          typeName: typeObj ? typeObj.name : trace.type
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

  // 预览照片
  handlePreviewPhoto: function(e) {
    const index = e.currentTarget.dataset.index;
    const photos = this.data.photos;
    
    wx.previewImage({
      current: photos[index].path,
      urls: photos.map(photo => photo.path)
    });
  },

  // 编辑留痕
  handleEdit: function() {
    wx.navigateTo({
      url: `../edit/index?id=${this.data.traceId}`
    });
  },

  // 分享留痕
  handleShare: function() {
    // 显示分享菜单
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  // 返回列表
  handleBack: function() {
    wx.navigateBack();
  },

  // 删除留痕
  handleDelete: function() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除此留痕记录吗？删除后无法恢复。',
      success: (res) => {
        if (res.confirm) {
          this.deleteTrace();
        }
      }
    });
  },

  // 执行删除
  deleteTrace: function() {
    const traceId = this.data.traceId;
    
    wx.showLoading({
      title: '删除中...'
    });
    
    // 先删除照片
    const photoIds = this.data.trace.photos || [];
    
    this.photoService.deletePhotos(photoIds)
      .then(() => {
        // 再删除留痕记录
        return this.traceService.removeTrace(traceId);
      })
      .then(() => {
        wx.hideLoading();
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        
        // 返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      })
      .catch(err => {
        wx.hideLoading();
        console.error('删除留痕记录失败:', err);
        
        wx.showToast({
          title: '删除失败',
          icon: 'none'
        });
      });
  },

  // 分享给朋友
  onShareAppMessage: function() {
    const trace = this.data.trace;
    
    return {
      title: trace.title || '工作留痕',
      path: `/pages/trace/detail/index?id=${this.data.traceId}`,
      imageUrl: this.data.photos.length > 0 ? this.data.photos[0].path : ''
    };
  }
}); 