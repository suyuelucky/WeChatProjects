const photoStorage = require('../../utils/photo-storage');

Page({
  data: {
    projectId: '',
    locationName: '',
    photoList: [],
    isLoading: true,
    isEmpty: false,
    loadError: false,
    
    // 分页数据
    pageSize: 20,
    currentPage: 1,
    hasMore: false,
    
    // 选择模式
    isSelectMode: false,
    selectedPhotos: [],
    
    // 操作栏信息
    actionBarInfo: {
      total: 0,
      selected: 0,
      pendingCount: 0
    }
  },

  onLoad(options) {
    if (options) {
      const { projectId, locationName = 'default' } = options;
      
      this.setData({
        projectId,
        locationName
      });
      
      // 加载照片列表
      this.loadPhotoList();
    } else {
      wx.showToast({
        title: '缺少项目信息',
        icon: 'none'
      });
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },
  
  onPullDownRefresh() {
    // 下拉刷新
    this.resetList();
    this.loadPhotoList().then(() => {
      wx.stopPullDownRefresh();
    });
  },
  
  onReachBottom() {
    // 上拉加载更多
    if (this.data.hasMore && !this.data.isLoading) {
      this.loadMorePhotos();
    }
  },
  
  // 重置列表
  resetList() {
    this.setData({
      photoList: [],
      currentPage: 1,
      hasMore: false,
      isLoading: true,
      isEmpty: false,
      loadError: false,
      isSelectMode: false,
      selectedPhotos: [],
      actionBarInfo: {
        total: 0,
        selected: 0,
        pendingCount: 0
      }
    });
  },
  
  // 加载照片列表
  async loadPhotoList() {
    this.setData({ isLoading: true, loadError: false });
    
    try {
      const photos = await photoStorage.getPhotos(
        this.data.projectId,
        this.data.locationName,
        {
          page: this.data.currentPage,
          pageSize: this.data.pageSize,
          sortBy: 'createTime',
          order: 'desc'
        }
      );
      
      // 检查是否有更多照片
      const hasMore = photos.length === this.data.pageSize;
      
      // 计算待上传照片数量
      const pendingCount = photos.filter(photo => photo.uploadStatus === 'pending').length;
      
      // 更新状态
      this.setData({
        photoList: photos,
        hasMore,
        isEmpty: photos.length === 0,
        isLoading: false,
        'actionBarInfo.total': photos.length,
        'actionBarInfo.pendingCount': pendingCount
      });
    } catch (err) {
      console.error('加载照片列表失败:', err);
      this.setData({
        isLoading: false,
        loadError: true
      });
      
      wx.showToast({
        title: '加载照片失败',
        icon: 'none'
      });
    }
  },
  
  // 加载更多照片
  async loadMorePhotos() {
    if (this.data.isLoading || !this.data.hasMore) {
      return;
    }
    
    this.setData({
      isLoading: true,
      currentPage: this.data.currentPage + 1
    });
    
    try {
      const morePhotos = await photoStorage.getPhotos(
        this.data.projectId,
        this.data.locationName,
        {
          page: this.data.currentPage,
          pageSize: this.data.pageSize,
          sortBy: 'createTime',
          order: 'desc'
        }
      );
      
      // 检查是否有更多照片
      const hasMore = morePhotos.length === this.data.pageSize;
      
      // 合并照片列表
      const newPhotoList = [...this.data.photoList, ...morePhotos];
      
      // 计算待上传照片数量
      const pendingCount = newPhotoList.filter(photo => photo.uploadStatus === 'pending').length;
      
      // 更新状态
      this.setData({
        photoList: newPhotoList,
        hasMore,
        isLoading: false,
        'actionBarInfo.total': newPhotoList.length,
        'actionBarInfo.pendingCount': pendingCount
      });
    } catch (err) {
      console.error('加载更多照片失败:', err);
      
      // 恢复页码
      this.setData({
        isLoading: false,
        currentPage: this.data.currentPage - 1
      });
      
      wx.showToast({
        title: '加载更多照片失败',
        icon: 'none'
      });
    }
  },
  
  // 查看照片大图
  viewPhotoDetail(e) {
    if (this.data.isSelectMode) {
      // 选择模式下点击是选择照片
      this.toggleSelectPhoto(e);
      return;
    }
    
    const { index } = e.currentTarget.dataset;
    const photo = this.data.photoList[index];
    
    if (!photo) {
      return;
    }
    
    // 获取所有照片路径
    const imageUrls = this.data.photoList.map(p => p.filePath);
    
    wx.previewImage({
      current: photo.filePath,
      urls: imageUrls
    });
  },
  
  // 进入选择模式
  enterSelectMode() {
    this.setData({
      isSelectMode: true,
      selectedPhotos: []
    });
  },
  
  // 退出选择模式
  exitSelectMode() {
    this.setData({
      isSelectMode: false,
      selectedPhotos: []
    });
  },
  
  // 切换照片选择状态
  toggleSelectPhoto(e) {
    const { index } = e.currentTarget.dataset;
    const photo = this.data.photoList[index];
    
    if (!photo) {
      return;
    }
    
    const selectedIndex = this.data.selectedPhotos.findIndex(
      id => id === photo.id
    );
    
    let selectedPhotos = [...this.data.selectedPhotos];
    
    if (selectedIndex >= 0) {
      // 取消选择
      selectedPhotos.splice(selectedIndex, 1);
    } else {
      // 添加选择
      selectedPhotos.push(photo.id);
    }
    
    this.setData({
      selectedPhotos,
      'actionBarInfo.selected': selectedPhotos.length
    });
  },
  
  // 全选/取消全选
  toggleSelectAll() {
    if (this.data.selectedPhotos.length === this.data.photoList.length) {
      // 取消全选
      this.setData({
        selectedPhotos: [],
        'actionBarInfo.selected': 0
      });
    } else {
      // 全选
      const allPhotoIds = this.data.photoList.map(photo => photo.id);
      this.setData({
        selectedPhotos: allPhotoIds,
        'actionBarInfo.selected': allPhotoIds.length
      });
    }
  },
  
  // 删除选中的照片
  async deleteSelectedPhotos() {
    if (this.data.selectedPhotos.length === 0) {
      wx.showToast({
        title: '请先选择照片',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '删除照片',
      content: `确定要删除选中的${this.data.selectedPhotos.length}张照片吗？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          
          try {
            const promises = this.data.selectedPhotos.map(photoId => 
              photoStorage.deletePhoto(this.data.projectId, this.data.locationName, photoId)
            );
            
            const results = await Promise.all(promises);
            const successCount = results.filter(Boolean).length;
            
            wx.hideLoading();
            
            if (successCount > 0) {
              wx.showToast({
                title: `成功删除${successCount}张照片`,
                icon: 'success'
              });
              
              // 重新加载照片列表
              this.resetList();
              this.loadPhotoList();
            } else {
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              });
            }
          } catch (err) {
            wx.hideLoading();
            console.error('删除照片失败:', err);
            
            wx.showToast({
              title: '删除照片失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },
  
  // 上传选中的照片
  uploadSelectedPhotos() {
    if (this.data.selectedPhotos.length === 0) {
      wx.showToast({
        title: '请先选择照片',
        icon: 'none'
      });
      return;
    }
    
    wx.showToast({
      title: '上传功能尚未实现',
      icon: 'none'
    });
    
    // TODO: 实现照片上传功能
  },
  
  // 返回相机页面
  goBackToCamera() {
    wx.navigateBack();
  }
}); 