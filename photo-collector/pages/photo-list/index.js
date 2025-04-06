var photoStorage = require('../../utils/photo-storage');

Page({
  data: {
    // 筛选条件
    projectId: '',
    projectName: '',
    locationId: '',
    locationName: '',
    
    // 照片列表
    photos: [],
    
    // 加载状态
    loading: true,
    
    // 操作相关
    selectedPhoto: null,
    showActionSheet: false,
    actions: [
      { name: '查看大图', color: '#07c160' },
      { name: '删除', color: '#ff4d4f' }
    ]
  },

  onLoad: function(options) {
    // 获取传入的项目和位置信息
    var projectId = options.projectId || '';
    var locationId = options.locationId || '';
    
    this.setData({
      projectId: projectId,
      locationId: locationId
    });
    
    // 加载项目名称和位置名称
    this.loadProjectAndLocationInfo(projectId, locationId);
    
    // 加载照片列表
    this.loadPhotos();
  },
  
  onShow: function() {
    // 重新加载照片列表
    this.loadPhotos();
  },
  
  // 加载项目和位置信息
  loadProjectAndLocationInfo: function(projectId, locationId) {
    if (!projectId) {
      return;
    }
    
    var that = this;
    
    // 获取项目列表
    photoStorage.getProjects(function(projects) {
      // 查找当前项目
      var project = projects.find(function(p) {
        return p.id === projectId;
      });
      
      if (project) {
        that.setData({
          projectName: project.name
        });
        
        // 如果有位置ID，获取位置名称
        if (locationId && project.locations) {
          var location = project.locations.find(function(loc) {
            return loc.id === locationId;
          });
          
          if (location) {
            that.setData({
              locationName: location.name
            });
          }
        }
      }
    });
  },
  
  // 加载照片列表
  loadPhotos: function() {
    var that = this;
    
    // 构建过滤条件
    var filter = {};
    if (this.data.projectId) {
      filter.projectId = this.data.projectId;
    }
    if (this.data.locationId) {
      filter.locationId = this.data.locationId;
    }
    
    // 获取照片
    photoStorage.getPhotos(filter, function(photos) {
      that.setData({
        photos: photos,
        loading: false
      });
    });
  },
  
  // 处理照片点击
  handlePhotoTap: function(e) {
    var photoId = e.currentTarget.dataset.id;
    var photo = this.data.photos.find(function(p) {
      return p.id === photoId;
    });
    
    if (photo) {
      this.setData({
        selectedPhoto: photo,
        showActionSheet: true
      });
    }
  },
  
  // 处理操作选择
  handleActionSelect: function(e) {
    var index = e.detail.index;
    var action = this.data.actions[index];
    
    if (!action || !this.data.selectedPhoto) {
      return;
    }
    
    switch (action.name) {
      case '查看大图':
        this.viewFullImage(this.data.selectedPhoto);
        break;
      case '删除':
        this.confirmDeletePhoto(this.data.selectedPhoto);
        break;
    }
    
    this.closeActionSheet();
  },
  
  // 关闭操作菜单
  closeActionSheet: function() {
    this.setData({
      showActionSheet: false,
      selectedPhoto: null
    });
  },
  
  // 查看大图
  viewFullImage: function(photo) {
    wx.previewImage({
      urls: [photo.filePath],
      current: photo.filePath
    });
  },
  
  // 确认删除照片
  confirmDeletePhoto: function(photo) {
    var that = this;
    
    wx.showModal({
      title: '删除确认',
      content: '确定要删除这张照片吗？',
      success: function(res) {
        if (res.confirm) {
          that.deletePhoto(photo);
        }
      }
    });
  },
  
  // 删除照片
  deletePhoto: function(photo) {
    var that = this;
    
    wx.showLoading({
      title: '正在删除'
    });
    
    photoStorage.deletePhoto(photo.id, function(success) {
      wx.hideLoading();
      
      if (success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        
        // 重新加载照片列表
        that.loadPhotos();
      } else {
        wx.showToast({
          title: '删除失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 返回上一页
  navigateBack: function() {
    wx.navigateBack();
  },
  
  // 前往拍照页面
  goToCamera: function() {
    if (!this.data.projectId || !this.data.locationId) {
      wx.showToast({
        title: '请先选择项目和位置',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/camera-page/index?projectId=' + this.data.projectId + 
           '&projectName=' + encodeURIComponent(this.data.projectName) + 
           '&locationId=' + this.data.locationId + 
           '&locationName=' + encodeURIComponent(this.data.locationName)
    });
  }
}) 