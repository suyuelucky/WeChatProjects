/**
 * 博客发布页
 * 创建时间：2025年04月10日 21:10:59
 * 创建者：Claude助手
 * 编辑时间：2025年04月10日 22:18:15
 * 编辑内容：修复导航路径格式
 */

const app = getApp();

Page({
  data: {
    content: '',
    images: [],
    locationName: '',
    location: null,
    isPublic: true,
    canPublish: false,
    tempImagePaths: [] // 临时图片路径，用于上传
  },

  onLoad: function (options) {
    // 检查是否有草稿
    const draft = wx.getStorageSync('blog_draft');
    if (draft) {
      this.setData({
        content: draft.content || '',
        images: draft.images || [],
        locationName: draft.locationName || '',
        location: draft.location || null,
        isPublic: draft.isPublic !== undefined ? draft.isPublic : true
      });
      this.checkCanPublish();
    }
  },

  onUnload: function () {
    // 离开页面时保存草稿
    this.saveDraft();
  },

  /**
   * 保存草稿
   */
  saveDraft: function () {
    if (this.data.content || this.data.images.length > 0) {
      wx.setStorageSync('blog_draft', {
        content: this.data.content,
        images: this.data.images,
        locationName: this.data.locationName,
        location: this.data.location,
        isPublic: this.data.isPublic
      });
    }
  },

  /**
   * 检查是否可以发布
   */
  checkCanPublish: function () {
    const canPublish = this.data.content.trim() !== '' || this.data.images.length > 0;
    this.setData({ canPublish });
  },

  /**
   * 内容输入事件
   */
  onContentInput: function (e) {
    this.setData({
      content: e.detail.value
    });
    this.checkCanPublish();
  },

  /**
   * 添加图片
   */
  onAddImage: function () {
    const that = this;
    wx.chooseMedia({
      count: 9 - that.data.images.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 这里是一个模拟实现，真实情况需要上传到云存储
        const tempFiles = res.tempFiles;
        const tempPaths = tempFiles.map(file => file.tempFilePath);
        
        // 模拟上传图片
        wx.showLoading({
          title: '上传中...',
        });
        
        // 使用setTimeout模拟上传过程
        setTimeout(() => {
          const currentImages = that.data.images;
          const newImages = [...currentImages, ...tempPaths];
          
          that.setData({
            images: newImages,
            tempImagePaths: [...that.data.tempImagePaths, ...tempPaths]
          });
          
          that.checkCanPublish();
          wx.hideLoading();
        }, 1000);
      }
    });
  },

  /**
   * 删除图片
   */
  onDeleteImage: function (e) {
    const { index } = e.currentTarget.dataset;
    const images = this.data.images;
    const tempImagePaths = this.data.tempImagePaths;
    
    images.splice(index, 1);
    tempImagePaths.splice(index, 1);
    
    this.setData({
      images,
      tempImagePaths
    });
    
    this.checkCanPublish();
  },

  /**
   * 预览图片
   */
  onPreviewImage: function (e) {
    const { index } = e.currentTarget.dataset;
    const images = this.data.images;
    
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },

  /**
   * 选择位置
   */
  onTapLocation: function () {
    const that = this;
    wx.chooseLocation({
      success: function (res) {
        that.setData({
          locationName: res.name,
          location: {
            name: res.name,
            address: res.address,
            latitude: res.latitude,
            longitude: res.longitude
          }
        });
      }
    });
  },

  /**
   * 切换公开/私密状态
   */
  onTapPrivacy: function () {
    this.setData({
      isPublic: !this.data.isPublic
    });
  },

  /**
   * 点击取消
   */
  onTapCancel: function () {
    const that = this;
    
    // 如果有内容，提示是否保存
    if (that.data.content || that.data.images.length > 0) {
      wx.showModal({
        title: '提示',
        content: '是否保存为草稿？',
        cancelText: '不保存',
        confirmText: '保存',
        success: function (res) {
          if (res.confirm) {
            that.saveDraft();
          } else if (res.cancel) {
            wx.removeStorageSync('blog_draft');
          }
          wx.navigateBack();
        }
      });
    } else {
      wx.navigateBack();
    }
  },

  /**
   * 点击发布
   */
  onTapPublish: function () {
    if (!this.data.canPublish) return;
    
    wx.showLoading({
      title: '发布中...',
    });
    
    // 模拟发布过程
    setTimeout(() => {
      wx.hideLoading();
      
      // 清除草稿
      wx.removeStorageSync('blog_draft');
      
      // 设置需要刷新博客列表的标记
      app.globalData.needRefreshBlogList = true;
      
      // 发布成功提示
      wx.showToast({
        title: '发布成功',
        icon: 'success',
        duration: 1500
      });
      
      // 延迟返回，让用户看到提示
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }, 1500);
  }
}); 