// 相机页面脚本
Page({
  /**
   * 页面的初始数据
   */
  data: {
    devicePosition: 'back', // 前置或后置摄像头
    flash: 'auto', // 闪光灯模式
    type: 'photo' // 拍照或录音
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    if (options.type) {
      this.setData({
        type: options.type
      });
    }
  },

  /**
   * 摄像头错误事件
   */
  error: function (e) {
    console.error('相机错误:', e.detail);
    wx.showToast({
      title: '相机启动失败',
      icon: 'error'
    });
  },

  /**
   * 切换前后摄像头
   */
  toggleDevice: function () {
    const newPosition = this.data.devicePosition === 'back' ? 'front' : 'back';
    this.setData({
      devicePosition: newPosition
    });
  },

  /**
   * 切换闪光灯
   */
  toggleFlash: function () {
    const modes = ['auto', 'on', 'off'];
    const currentIndex = modes.indexOf(this.data.flash);
    const nextIndex = (currentIndex + 1) % modes.length;
    
    this.setData({
      flash: modes[nextIndex]
    });
    
    wx.showToast({
      title: `闪光灯: ${modes[nextIndex]}`,
      icon: 'none'
    });
  },

  /**
   * 拍照
   */
  takePhoto: function () {
    const ctx = wx.createCameraContext();
    
    ctx.takePhoto({
      quality: 'high',
      success: (res) => {
        const tempImagePath = res.tempImagePath;
        
        if (this.data.type === 'photo') {
          // 返回图片路径给日记编辑页
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 2];
          if (prevPage) {
            // 将图片传递给上一页
            const images = prevPage.data.images || [];
            prevPage.setData({
              images: [...images, tempImagePath]
            });
          }
        }
        
        wx.navigateBack();
      },
      fail: (error) => {
        console.error('拍照失败:', error);
        wx.showToast({
          title: '拍照失败',
          icon: 'error'
        });
      }
    });
  },

  /**
   * 返回上一页
   */
  back: function () {
    wx.navigateBack();
  }
}); 