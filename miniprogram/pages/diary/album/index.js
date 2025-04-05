// 相册页面脚本
Page({
  /**
   * 页面的初始数据
   */
  data: {
    images: [],
    selectedCount: 0,
    maxCount: 9
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 获取已选择的图片数量（从日记编辑页传递过来）
    const selectedCount = options.selectedCount ? parseInt(options.selectedCount) : 0;
    const maxCount = 9 - selectedCount;
    
    this.setData({
      maxCount
    });
    
    this.loadImages();
  },

  /**
   * 加载手机相册图片
   */
  loadImages: function () {
    wx.chooseMedia({
      count: 100,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const tempFiles = res.tempFiles;
        const images = tempFiles.map(file => ({
          path: file.tempFilePath,
          selected: false
        }));
        
        this.setData({
          images
        });
      },
      fail: (error) => {
        console.error('获取相册图片失败:', error);
        wx.navigateBack();
      }
    });
  },

  /**
   * 切换选择状态
   */
  toggleSelect: function (e) {
    const index = e.currentTarget.dataset.index;
    const { images, selectedCount, maxCount } = this.data;
    const selected = !images[index].selected;
    
    // 如果已经达到最大选择数量，且尝试再选择一个
    if (selectedCount >= maxCount && selected) {
      wx.showToast({
        title: `最多选择${maxCount}张图片`,
        icon: 'none'
      });
      return;
    }
    
    // 更新选择状态
    const newImages = [...images];
    newImages[index].selected = selected;
    
    // 计算已选择数量
    const newSelectedCount = selectedCount + (selected ? 1 : -1);
    
    this.setData({
      images: newImages,
      selectedCount: newSelectedCount
    });
  },

  /**
   * 取消选择
   */
  cancel: function () {
    wx.navigateBack();
  },

  /**
   * 确认选择
   */
  confirm: function () {
    const { images, selectedCount } = this.data;
    
    if (selectedCount === 0) {
      return;
    }
    
    // 获取已选择的图片路径
    const selectedImages = images
      .filter(image => image.selected)
      .map(image => image.path);
    
    // 返回图片路径给日记编辑页
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    
    if (prevPage) {
      // 将选择的图片添加到已有图片中
      const existingImages = prevPage.data.images || [];
      prevPage.setData({
        images: [...existingImages, ...selectedImages]
      });
    }
    
    wx.navigateBack();
  }
}); 