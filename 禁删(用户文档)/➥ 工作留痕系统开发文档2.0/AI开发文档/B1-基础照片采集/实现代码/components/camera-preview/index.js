/**
 * 相机预览组件
 * 负责相机的初始化、预览、拍照等基础功能
 */

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 相机设备位置，front前置，back后置
    devicePosition: {
      type: String,
      value: 'back'
    },
    // 闪光灯模式，auto/on/off
    flash: {
      type: String,
      value: 'auto'
    },
    // 相机分辨率
    resolution: {
      type: String,
      value: 'medium'
    },
    // 相机尺寸，长宽比例
    cameraRatio: {
      type: String, 
      value: '4:3'
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 相机上下文对象
    cameraContext: null,
    // 相机是否初始化完成
    isReady: false,
    // 相机是否正在拍照
    isTaking: false,
    // 相机是否有错误
    hasError: false,
    // 错误信息
    errorMsg: '',
    // 当前设备支持的分辨率列表
    resolutionList: [],
    // 当前设备支持的闪光灯列表
    flashList: []
  },

  /**
   * 组件的生命周期
   */
  lifetimes: {
    // 组件被挂载
    attached: function() {
      this.init();
    },
    // 组件被移除
    detached: function() {
      // 释放相机资源
      this.release();
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 初始化相机
     */
    init: function() {
      // 检查相机权限和设备是否支持
      this.checkCameraAvailable();
      
      // 创建相机上下文对象
      const cameraContext = wx.createCameraContext(this);
      this.setData({
        cameraContext: cameraContext,
        isReady: true
      });
      
      // 获取设备支持的能力
      this._checkCameraCapabilities();
      
      // 通知相机已就绪
      this.triggerEvent('ready', { ready: true });
    },
    
    /**
     * 检查相机是否可用
     */
    checkCameraAvailable: function() {
      // 检查设备是否支持相机
      if (!wx.canIUse('camera')) {
        this.setData({
          hasError: true,
          errorMsg: '当前设备不支持相机功能'
        });
        this.triggerEvent('error', { 
          errCode: 'CAMERA_NOT_SUPPORTED',
          errMsg: '当前设备不支持相机功能' 
        });
        return false;
      }
      
      // 这里无法直接检查权限，通过监听错误事件处理权限问题
      return true;
    },
    
    /**
     * 检查相机能力
     * 获取设备支持的分辨率和闪光灯等功能
     */
    _checkCameraCapabilities: function() {
      // 设置支持的分辨率和闪光灯模式
      // 这里由于微信小程序API限制，无法动态获取，使用预设值
      this.setData({
        resolutionList: ['low', 'medium', 'high'],
        flashList: ['auto', 'on', 'off']
      });
    },
    
    /**
     * 拍照方法
     */
    takePhoto: function() {
      if (!this.data.isReady || this.data.isTaking || this.data.hasError) {
        // 相机未就绪或正在拍照或有错误，不执行拍照
        this.triggerEvent('error', { 
          errCode: 'CAMERA_NOT_READY',
          errMsg: '相机未就绪或正在拍照中' 
        });
        return;
      }
      
      this.setData({ isTaking: true });
      
      const that = this;
      try {
        this.data.cameraContext.takePhoto({
          quality: this._mapResolutionToQuality(this.data.resolution),
          success: function(res) {
            // 拍照成功
            that.triggerEvent('capture', { 
              tempImagePath: res.tempImagePath,
              width: res.width || 0,
              height: res.height || 0,
              size: res.size || 0
            });
          },
          fail: function(err) {
            // 拍照失败
            that.setData({
              hasError: true,
              errorMsg: err.errMsg || '拍照失败'
            });
            that.triggerEvent('error', { 
              errCode: 'TAKE_PHOTO_FAILED',
              errMsg: err.errMsg || '拍照失败' 
            });
          },
          complete: function() {
            // 无论成功失败，都标记拍照完成
            that.setData({ isTaking: false });
          }
        });
      } catch (error) {
        // 捕获可能的异常
        this.setData({ 
          isTaking: false,
          hasError: true,
          errorMsg: error.message || '拍照出现异常'
        });
        this.triggerEvent('error', { 
          errCode: 'TAKE_PHOTO_EXCEPTION',
          errMsg: error.message || '拍照出现异常' 
        });
      }
    },
    
    /**
     * 将分辨率映射到拍照质量
     */
    _mapResolutionToQuality: function(resolution) {
      const qualityMap = {
        'low': 'low',
        'medium': 'normal',
        'high': 'high'
      };
      return qualityMap[resolution] || 'normal';
    },
    
    /**
     * 切换相机前后置
     */
    switchCamera: function() {
      const position = this.data.devicePosition === 'front' ? 'back' : 'front';
      this.setData({
        devicePosition: position
      });
      
      // 通知外部相机位置已切换
      this.triggerEvent('switch', { position: position });
    },
    
    /**
     * 切换闪光灯模式
     */
    switchFlash: function(mode) {
      if (this.data.flashList.indexOf(mode) === -1) {
        // 不支持该闪光灯模式
        return;
      }
      this.setData({
        flash: mode
      });
      
      // 通知外部闪光灯模式已切换
      this.triggerEvent('flashchange', { mode: mode });
    },
    
    /**
     * 处理相机错误事件
     */
    handleCameraError: function(e) {
      // 相机错误通常是由于权限问题或硬件问题
      this.setData({
        hasError: true,
        errorMsg: e.detail.errMsg || '相机发生错误'
      });
      
      this.triggerEvent('error', { 
        errCode: 'CAMERA_ERROR',
        errMsg: e.detail.errMsg || '相机发生错误' 
      });
    },
    
    /**
     * 释放相机资源
     */
    release: function() {
      // 目前微信小程序API没有提供明确的相机资源释放方法
      // 这里主要是清理组件内部状态
      this.setData({
        cameraContext: null,
        isReady: false,
        isTaking: false
      });
    }
  }
}) 