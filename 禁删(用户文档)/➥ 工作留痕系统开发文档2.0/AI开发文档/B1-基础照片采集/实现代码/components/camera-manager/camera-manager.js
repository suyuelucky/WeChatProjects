/**
 * 相机管理组件 - 业务逻辑
 * 负责相机初始化、权限管理、拍照功能和照片存储
 */

// 相机模式枚举
const CameraModes = {
  NORMAL: 'normal',   // 普通模式
  CONTINUOUS: 'continuous', // 连拍模式
  TIMER: 'timer'     // 定时模式
};

// 权限状态枚举
const PermissionStatus = {
  UNKNOWN: 'unknown',
  AUTHORIZED: 'authorized',
  DENIED: 'denied',
  REQUESTING: 'requesting'
};

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 相机初始模式
    initialMode: {
      type: String,
      value: CameraModes.NORMAL
    },
    // 是否显示控制面板
    showControls: {
      type: Boolean,
      value: true
    },
    // 预设分辨率
    resolution: {
      type: String,
      value: 'medium' // low, medium, high
    },
    // 定时拍照延迟(秒)
    timerDelay: {
      type: Number,
      value: 3
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 相机权限状态
    permissionStatus: PermissionStatus.UNKNOWN,
    // 当前相机模式
    currentMode: CameraModes.NORMAL,
    // 相机设备方向 (front/back)
    devicePosition: 'back',
    // 闪光灯模式 (auto/on/off)
    flash: 'auto',
    // 定时器计时
    timerCount: 0,
    // 是否正在拍照
    isTakingPhoto: false,
    // 连拍计数
    continuousCount: 0,
    // 相机上下文
    cameraContext: null,
    // 拍摄的照片列表
    photoList: []
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.setData({
        currentMode: this.properties.initialMode
      });
      // 初始化相机上下文
      this.initCameraContext();
      // 检查相机权限
      this.checkCameraPermission();
    },
    detached() {
      // 停止定时器
      if (this._timerInterval) {
        clearInterval(this._timerInterval);
      }
      // 停止连拍
      this.stopContinuousCapture();
    }
  },

  /**
   * 组件方法列表
   */
  methods: {
    /**
     * 初始化相机上下文
     */
    initCameraContext() {
      this.cameraContext = wx.createCameraContext(this);
    },

    /**
     * 检查相机权限
     */
    checkCameraPermission() {
      this.setData({
        permissionStatus: PermissionStatus.REQUESTING
      });

      wx.authorize({
        scope: 'scope.camera',
        success: () => {
          this.setData({
            permissionStatus: PermissionStatus.AUTHORIZED
          });
        },
        fail: () => {
          // 用户拒绝权限
          this.setData({
            permissionStatus: PermissionStatus.DENIED
          });
          // 触发权限被拒绝事件
          this.triggerEvent('permissionDenied');
        }
      });
    },

    /**
     * 打开系统设置页面
     * 当用户拒绝相机权限时，提供跳转到设置页面重新授权的选项
     */
    openSettings() {
      wx.openSetting({
        success: (res) => {
          if (res.authSetting['scope.camera']) {
            this.setData({
              permissionStatus: PermissionStatus.AUTHORIZED
            });
          }
        }
      });
    },

    /**
     * 切换摄像头
     */
    switchCamera() {
      const newPosition = this.data.devicePosition === 'back' ? 'front' : 'back';
      this.setData({
        devicePosition: newPosition
      });
    },

    /**
     * 切换闪光灯模式
     */
    switchFlash() {
      const flashModes = ['auto', 'on', 'off'];
      const currentIndex = flashModes.indexOf(this.data.flash);
      const nextIndex = (currentIndex + 1) % flashModes.length;
      
      this.setData({
        flash: flashModes[nextIndex]
      });
    },

    /**
     * 切换相机模式
     * @param {Object} e 事件对象
     */
    switchMode(e) {
      const mode = e.currentTarget.dataset.mode || this.properties.initialMode;
      
      // 如果切换模式，需要停止当前模式下的进行中操作
      if (this.data.currentMode === CameraModes.TIMER && this._timerInterval) {
        clearInterval(this._timerInterval);
        this.setData({ timerCount: 0 });
      } else if (this.data.currentMode === CameraModes.CONTINUOUS) {
        this.stopContinuousCapture();
      }
      
      this.setData({
        currentMode: mode
      });
      
      // 触发模式切换事件
      this.triggerEvent('modeChanged', { mode });
    },

    /**
     * 拍照核心方法
     */
    takePhoto() {
      if (this.data.isTakingPhoto) return;
      
      this.setData({ isTakingPhoto: true });
      
      // 获取照片质量级别
      const qualityMapping = {
        low: 'low',
        medium: 'normal',
        high: 'high'
      };
      const quality = qualityMapping[this.properties.resolution] || 'normal';
      
      this.cameraContext.takePhoto({
        quality: quality,
        success: (res) => {
          // 照片拍摄成功
          const photoInfo = {
            path: res.tempImagePath,
            timestamp: Date.now(),
            mode: this.data.currentMode,
            position: this.data.devicePosition
          };
          
          // 添加到照片列表
          const updatedList = this.data.photoList.concat(photoInfo);
          this.setData({
            photoList: updatedList
          });
          
          // 触发拍照成功事件
          this.triggerEvent('photoTaken', { photo: photoInfo });
        },
        fail: (err) => {
          // 触发拍照失败事件
          this.triggerEvent('photoError', { error: err });
        },
        complete: () => {
          this.setData({ isTakingPhoto: false });
        }
      });
    },

    /**
     * 照相按钮点击处理
     */
    handleTakePhotoTap() {
      switch (this.data.currentMode) {
        case CameraModes.NORMAL:
          this.takePhoto();
          break;
        case CameraModes.CONTINUOUS:
          this.toggleContinuousCapture();
          break;
        case CameraModes.TIMER:
          this.startTimerCapture();
          break;
      }
    },

    /**
     * 开始/停止连拍模式
     */
    toggleContinuousCapture() {
      if (this._continuousInterval) {
        this.stopContinuousCapture();
      } else {
        this.startContinuousCapture();
      }
    },

    /**
     * 开始连拍
     */
    startContinuousCapture() {
      if (this._continuousInterval) return;
      
      this.setData({
        continuousCount: 0
      });
      
      // 每0.8秒拍一张照片
      this._continuousInterval = setInterval(() => {
        this.takePhoto();
        this.setData({
          continuousCount: this.data.continuousCount + 1
        });
        
        // 如果连拍超过10张，自动停止
        if (this.data.continuousCount >= 10) {
          this.stopContinuousCapture();
        }
      }, 800);
      
      this.triggerEvent('continuousStarted');
    },

    /**
     * 停止连拍
     */
    stopContinuousCapture() {
      if (this._continuousInterval) {
        clearInterval(this._continuousInterval);
        this._continuousInterval = null;
        
        this.triggerEvent('continuousStopped', {
          count: this.data.continuousCount
        });
      }
    },

    /**
     * 开始定时拍照
     */
    startTimerCapture() {
      // 如果定时器已经在运行，就不要重新开始
      if (this._timerInterval) return;
      
      // 设置初始倒计时
      this.setData({
        timerCount: this.properties.timerDelay
      });
      
      // 每秒递减计时
      this._timerInterval = setInterval(() => {
        const newCount = this.data.timerCount - 1;
        this.setData({
          timerCount: newCount
        });
        
        // 播放倒计时提示音
        if (newCount > 0) {
          this.playTimerSound();
        }
        
        // 计时结束，拍照
        if (newCount <= 0) {
          clearInterval(this._timerInterval);
          this._timerInterval = null;
          this.takePhoto();
        }
      }, 1000);
    },

    /**
     * 播放定时器提示音
     */
    playTimerSound() {
      // 简单使用系统声音反馈
      wx.vibrateShort();
    },

    /**
     * 获取照片列表
     */
    getPhotoList() {
      return this.data.photoList;
    },

    /**
     * 清空照片列表
     */
    clearPhotoList() {
      this.setData({
        photoList: []
      });
    },

    /**
     * 相机错误处理
     */
    onCameraError(e) {
      const error = e.detail;
      console.error('Camera error:', error);
      
      this.triggerEvent('cameraError', { error });
    },

    /**
     * 加载相机事件
     */
    onCameraReady() {
      this.triggerEvent('cameraReady');
    }
  }
}); 