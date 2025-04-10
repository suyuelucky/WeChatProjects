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
    // 创建一个小测试文件以检查存储空间
    try {
      const fs = wx.getFileSystemManager();
      const testPath = wx.env.USER_DATA_PATH + '/test_photo_' + Date.now() + '.tmp';
      
      try {
        // 创建临时测试文件
        const buffer = new ArrayBuffer(1024); // 1KB测试文件
        fs.writeFileSync(testPath, buffer);
        
        // 删除测试文件
        try {
          fs.unlinkSync(testPath);
        } catch(e) {
          // 忽略删除失败
        }
        
        // 如果能够成功写入文件，说明存储空间充足，可以继续拍照
        this._doTakePhoto();
      } catch(writeErr) {
        console.warn('写入测试文件失败，可能存储空间不足', writeErr);
        
        // 尝试清理临时文件
        this._cleanupTempFiles().then(() => {
          // 清理后再次尝试
          this._doTakePhoto();
        }).catch(err => {
          console.error('清理和拍照失败:', err);
          wx.showToast({
            title: '拍照失败',
            icon: 'none'
          });
        });
      }
    } catch(err) {
      console.error('存储检查失败:', err);
      // 尝试直接拍照
      this._doTakePhoto();
    }
  },
  
  /**
   * 执行实际拍照操作
   * @private
   */
  _doTakePhoto: function() {
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
   * 清理临时文件
   * @private
   * @returns {Promise}
   */
  _cleanupTempFiles: function() {
    return new Promise((resolve, reject) => {
      try {
        const fs = wx.getFileSystemManager();
        const userDataPath = wx.env.USER_DATA_PATH;
        
        // 尝试清理目录
        fs.readdir({
          dirPath: userDataPath,
          success: (res) => {
            const files = res.files || [];
            let cleaned = 0;
            
            if (files.length === 0) {
              // 没有文件可清理
              resolve();
              return;
            }
            
            // 清理临时图片文件
            files.forEach(file => {
              if (file.endsWith('.jpg') || 
                  file.endsWith('.png') || 
                  file.endsWith('.tmp') || 
                  file.indexOf('temp') !== -1) {
                try {
                  fs.unlinkSync(userDataPath + '/' + file);
                  cleaned++;
                } catch(e) {
                  // 忽略删除错误
                }
              }
            });
            
            console.log('已清理', cleaned, '个临时文件');
            resolve();
          },
          fail: (err) => {
            console.error('读取目录失败:', err);
            // 尝试继续
            resolve();
          }
        });
      } catch(err) {
        console.error('清理临时文件失败:', err);
        // 返回成功以继续流程
        resolve();
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