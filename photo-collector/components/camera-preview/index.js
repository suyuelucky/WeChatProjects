Component({
  /**
   * 组件属性
   */
  properties: {
    // 相机朝向，前置或后置
    devicePosition: {
      type: String,
      value: 'back'
    },
    // 闪光灯，auto, on, off
    flash: {
      type: String,
      value: 'auto'
    },
    // 分辨率，low, medium, high
    resolution: {
      type: String,
      value: 'medium'
    },
    // 相机比例，3:4, 9:16
    cameraRatio: {
      type: String,
      value: '4:3'
    }
  },

  /**
   * 组件初始数据
   */
  data: {
    // 相机上下文
    cameraContext: null,
    // 相机是否准备就绪
    cameraReady: false,
    // 相机是否可用
    cameraAvailable: true,
    // 错误信息
    errorMsg: '',
    // 支持的分辨率
    resolutionList: ['low', 'medium', 'high'],
    // 支持的闪光灯模式
    flashModeList: ['auto', 'on', 'off']
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    // 在组件实例进入页面节点树时执行
    attached: function() {
      this.initCamera();
    },
    // 在组件实例被从页面节点树移除时执行
    detached: function() {
      // 释放相机资源
      if (this.data.cameraContext) {
        console.log('相机组件销毁，释放资源');
      }
    }
  },

  /**
   * 组件方法
   */
  methods: {
    // 初始化相机
    initCamera: function() {
      // 检查相机是否可用
      if (!this.checkCameraAvailability()) {
        return;
      }
      
      try {
        // 创建相机上下文
        const cameraContext = wx.createCameraContext(this);
        
        this.setData({
          cameraContext: cameraContext,
          cameraReady: true,
          errorMsg: ''
        });
        
        console.log('相机初始化成功');
      } catch (e) {
        console.error('初始化相机失败:', e);
        this.setData({
          cameraReady: false,
          errorMsg: '初始化相机失败: ' + e.message
        });
        
        // 触发错误事件
        this.triggerEvent('error', {
          errMsg: '初始化相机失败: ' + e.message
        });
      }
    },
    
    // 检查相机是否可用
    checkCameraAvailability: function() {
      // 判断是否支持相机
      if (!wx.canIUse('camera')) {
        this.setData({
          cameraAvailable: false,
          errorMsg: '当前微信版本不支持相机功能'
        });
        
        // 触发错误事件
        this.triggerEvent('error', {
          errMsg: '当前微信版本不支持相机功能'
        });
        
        return false;
      }
      
      return true;
    },
    
    // 拍照
    takePhoto: function() {
      if (!this.data.cameraReady) {
        wx.showToast({
          title: '相机未就绪',
          icon: 'none'
        });
        return;
      }
      
      var that = this;
      var quality = this.mapResolutionToQuality(this.data.resolution);
      
      // 触发拍照开始事件
      this.triggerEvent('captureStart');
      
      this.data.cameraContext.takePhoto({
        quality: quality,
        success: function(res) {
          console.log('拍照成功:', res.tempImagePath);
          
          // 触发拍照成功事件
          that.triggerEvent('captureSuccess', {
            tempImagePath: res.tempImagePath
          });
        },
        fail: function(err) {
          console.error('拍照失败:', err);
          
          // 触发拍照失败事件
          that.triggerEvent('captureFail', {
            errMsg: '拍照失败: ' + err.errMsg
          });
          
          wx.showToast({
            title: '拍照失败',
            icon: 'none'
          });
        }
      });
    },
    
    // 切换相机前后置
    switchCamera: function() {
      var newPosition = this.data.devicePosition === 'back' ? 'front' : 'back';
      
      this.setData({
        devicePosition: newPosition
      });
      
      // 触发切换相机事件
      this.triggerEvent('switchCamera', {
        position: newPosition
      });
    },
    
    // 切换闪光灯
    switchFlash: function() {
      var currentIndex = this.data.flashModeList.indexOf(this.data.flash);
      var nextIndex = (currentIndex + 1) % this.data.flashModeList.length;
      var newFlashMode = this.data.flashModeList[nextIndex];
      
      this.setData({
        flash: newFlashMode
      });
      
      // 触发切换闪光灯事件
      this.triggerEvent('switchFlash', {
        mode: newFlashMode
      });
    },
    
    // 将分辨率映射到拍照质量
    mapResolutionToQuality: function(resolution) {
      var qualityMap = {
        'low': 'low',
        'medium': 'normal',
        'high': 'high'
      };
      
      return qualityMap[resolution] || 'normal';
    },
    
    // 相机加载错误
    handleCameraError: function(e) {
      console.error('相机加载错误:', e.detail);
      
      this.setData({
        cameraReady: false,
        errorMsg: '相机加载失败: ' + e.detail.errMsg
      });
      
      // 触发错误事件
      this.triggerEvent('error', {
        errMsg: '相机加载失败: ' + e.detail.errMsg
      });
    }
  }
}) 