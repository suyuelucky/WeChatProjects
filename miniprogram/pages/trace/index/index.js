const app = getApp();

Page({
  data: {
    traceTypes: [],
    traces: [],
    loading: true,
    error: null
  },

  onLoad: function() {
    // 获取服务
    this.traceService = app.getService('traceService');
    
    // 加载数据
    this.loadTraceTypes();
    this.loadTraces();
  },

  onShow: function() {
    // 每次页面显示时刷新数据
    this.loadTraces();
  },

  // 加载留痕类型
  loadTraceTypes: function() {
    try {
      const traceTypes = this.traceService.getTraceTypes();
      this.setData({
        traceTypes: traceTypes
      });
    } catch (err) {
      console.error('加载留痕类型失败:', err);
      this.setData({
        error: '加载留痕类型失败'
      });
    }
  },

  // 加载留痕记录
  loadTraces: function() {
    this.setData({
      loading: true,
      error: null
    });
    
    this.traceService.getAllTraces()
      .then(traces => {
        this.setData({
          traces: traces,
          loading: false
        });
      })
      .catch(err => {
        console.error('加载留痕记录失败:', err);
        this.setData({
          error: '加载留痕记录失败',
          loading: false
        });
      });
  },

  // 创建新留痕
  handleCreateTrace: function(e) {
    const type = e.currentTarget.dataset.type;
    
    wx.showLoading({
      title: '创建中...'
    });
    
    this.traceService.createTrace(type)
      .then(trace => {
        wx.hideLoading();
        
        // 跳转到编辑页
        wx.navigateTo({
          url: `../edit/index?id=${trace.id}`
        });
      })
      .catch(err => {
        wx.hideLoading();
        console.error('创建留痕失败:', err);
        
        wx.showToast({
          title: '创建失败',
          icon: 'none'
        });
      });
  },

  // 查看留痕记录详情
  handleViewTrace: function(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.navigateTo({
      url: `../detail/index?id=${id}`
    });
  },

  // 刷新数据
  handleRefresh: function() {
    this.loadTraces();
  }
}); 