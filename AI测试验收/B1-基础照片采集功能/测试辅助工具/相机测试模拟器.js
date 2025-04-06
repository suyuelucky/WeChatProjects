/**
 * B1基础照片采集功能 - 相机测试模拟器
 * 
 * 该工具用于模拟各种相机状态和错误情况，辅助进行极端测试
 * 使用方法：将此文件导入测试项目，替换原相机实现进行测试
 * 
 * 版本: 1.0
 * 创建日期: 2024-04-06
 * 创建者: 资方测试团队
 */

// 模拟相机状态枚举
const CameraState = {
  NORMAL: 'normal',           // 正常状态
  PERMISSION_DENIED: 'denied', // 权限被拒绝
  HARDWARE_ERROR: 'hardware',  // 硬件错误
  INIT_TIMEOUT: 'timeout',     // 初始化超时
  MEMORY_LIMIT: 'memory',      // 内存受限
  UNSTABLE: 'unstable'         // 不稳定状态(随机错误)
};

// 错误类型枚举
const ErrorType = {
  PERMISSION: 'permission',    // 权限错误
  HARDWARE: 'hardware',        // 硬件错误
  TIMEOUT: 'timeout',          // 超时错误
  MEMORY: 'memory',            // 内存错误
  UNKNOWN: 'unknown'           // 未知错误
};

/**
 * 相机测试模拟器组件
 * 替代原有的camera-manager组件用于测试
 */
Component({
  /**
   * 组件属性
   */
  properties: {
    // 继承原组件属性
    initialMode: {
      type: String,
      value: 'normal'
    },
    resolution: {
      type: String,
      value: 'medium'
    },
    showControls: {
      type: Boolean,
      value: true
    },
    timerDelay: {
      type: Number,
      value: 3
    },
    // 测试专用属性
    mockState: {
      type: String,
      value: CameraState.NORMAL // 默认为正常状态
    },
    errorProbability: {
      type: Number,
      value: 0   // 错误概率: 0-100
    },
    memoryUsage: {
      type: Number,
      value: 50  // 模拟内存占用百分比: 0-100
    },
    responseDelay: {
      type: Number,
      value: 0   // 操作响应延迟(毫秒)
    }
  },

  /**
   * 组件内部数据
   */
  data: {
    isInitialized: false,      // 相机是否初始化
    isCameraPreviewing: false, // 是否正在预览
    errorMessage: '',          // 错误信息
    mockPhotoPaths: [          // 模拟照片路径
      'mock-photo-1.jpg',
      'mock-photo-2.jpg',
      'mock-photo-3.jpg'
    ],
    photoIndex: 0,             // 当前使用的模拟照片索引
    timerActive: false,        // 定时器是否激活
    timerRemaining: 0          // 定时器剩余时间
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 组件挂载时初始化
      this._simulateInitialization();
    },
    detached() {
      // 组件卸载时清理资源
      this._clearTimers();
    }
  },

  /**
   * 属性监听器
   */
  observers: {
    'mockState': function(newState) {
      // 模拟状态变更时重新初始化
      this._simulateInitialization();
    }
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 模拟相机初始化过程
     * 根据mockState模拟不同的初始化结果
     */
    _simulateInitialization() {
      this._clearTimers();
      
      this.setData({
        isInitialized: false,
        isCameraPreviewing: false,
        errorMessage: ''
      });
      
      // 根据状态模拟初始化过程
      switch (this.data.mockState) {
        case CameraState.PERMISSION_DENIED:
          // 模拟权限被拒绝
          setTimeout(() => {
            this._triggerPermissionDenied();
          }, 500);
          break;
          
        case CameraState.HARDWARE_ERROR:
          // 模拟硬件错误
          setTimeout(() => {
            this.setData({ isInitialized: true });
            this._triggerCameraError(ErrorType.HARDWARE, '相机硬件错误');
          }, 1000);
          break;
          
        case CameraState.INIT_TIMEOUT:
          // 模拟初始化超时
          setTimeout(() => {
            this._triggerCameraError(ErrorType.TIMEOUT, '相机初始化超时');
          }, 5000);
          break;
          
        case CameraState.MEMORY_LIMIT:
          // 模拟内存限制
          setTimeout(() => {
            this.setData({ isInitialized: true });
            if (this.data.memoryUsage > 80) {
              this._triggerCameraError(ErrorType.MEMORY, '设备内存不足');
            } else {
              this.setData({ isCameraPreviewing: true });
            }
          }, 800);
          break;
          
        case CameraState.UNSTABLE:
          // 模拟不稳定状态，随机成功或失败
          setTimeout(() => {
            this.setData({ isInitialized: true });
            
            if (Math.random() * 100 < this.data.errorProbability) {
              const errorTypes = [ErrorType.HARDWARE, ErrorType.TIMEOUT, ErrorType.UNKNOWN];
              const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
              this._triggerCameraError(randomError, '相机出现随机错误');
            } else {
              this.setData({ isCameraPreviewing: true });
            }
          }, this.data.responseDelay + 500);
          break;
          
        case CameraState.NORMAL:
        default:
          // 模拟正常初始化
          setTimeout(() => {
            this.setData({
              isInitialized: true,
              isCameraPreviewing: true
            });
          }, this.data.responseDelay + 500);
          break;
      }
    },

    /**
     * 模拟拍照
     */
    takePhoto() {
      if (!this.data.isInitialized || !this.data.isCameraPreviewing) {
        this._triggerCameraError(ErrorType.UNKNOWN, '相机未准备好');
        return;
      }
      
      // 模拟随机错误
      if (Math.random() * 100 < this.data.errorProbability) {
        this._triggerCameraError(ErrorType.UNKNOWN, '拍照过程中出现随机错误');
        return;
      }
      
      // 添加模拟延迟
      setTimeout(() => {
        // 获取模拟照片路径
        const photoPath = this.data.mockPhotoPaths[this.data.photoIndex];
        
        // 更新索引，循环使用模拟照片
        this.setData({
          photoIndex: (this.data.photoIndex + 1) % this.data.mockPhotoPaths.length
        });
        
        // 触发拍照成功事件
        this.triggerEvent('photoTaken', {
          photo: {
            path: photoPath,
            size: this._getRandomSize(),
            timestamp: Date.now(),
            width: 1080,
            height: 1920
          }
        });
        
        // 模拟内存增加
        this.setData({
          memoryUsage: Math.min(100, this.data.memoryUsage + 5)
        });
        
        // 如果内存超过阈值，触发内存错误
        if (this.data.memoryUsage > 90) {
          this._triggerCameraError(ErrorType.MEMORY, '内存不足，无法继续拍照');
        }
      }, this.data.responseDelay);
    },

    /**
     * 模拟开始定时拍照
     */
    startTimerCapture() {
      if (!this.data.isInitialized) {
        this._triggerCameraError(ErrorType.UNKNOWN, '相机未初始化');
        return;
      }
      
      // 设置定时器
      this.setData({
        timerActive: true,
        timerRemaining: this.data.timerDelay
      });
      
      this._timer = setInterval(() => {
        if (this.data.timerRemaining <= 1) {
          clearInterval(this._timer);
          this.setData({
            timerActive: false,
            timerRemaining: 0
          });
          this.takePhoto();
        } else {
          this.setData({
            timerRemaining: this.data.timerRemaining - 1
          });
        }
      }, 1000);
    },

    /**
     * 切换相机（前后摄像头）
     */
    switchCamera() {
      if (!this.data.isInitialized) {
        this._triggerCameraError(ErrorType.UNKNOWN, '相机未初始化');
        return;
      }
      
      // 模拟切换过程
      this.setData({
        isCameraPreviewing: false
      });
      
      // 添加延迟和可能的随机错误
      setTimeout(() => {
        if (Math.random() * 100 < this.data.errorProbability) {
          this._triggerCameraError(ErrorType.HARDWARE, '切换相机失败');
        } else {
          this.setData({
            isCameraPreviewing: true
          });
        }
      }, this.data.responseDelay + 800);
    },

    /**
     * 触发权限被拒绝事件
     */
    _triggerPermissionDenied() {
      this.triggerEvent('permissionDenied');
    },

    /**
     * 触发相机错误事件
     */
    _triggerCameraError(errorType, errorMessage) {
      this.setData({
        errorMessage: errorMessage
      });
      
      this.triggerEvent('cameraError', {
        error: {
          type: errorType,
          message: errorMessage
        }
      });
    },

    /**
     * 清理所有定时器
     */
    _clearTimers() {
      if (this._timer) {
        clearInterval(this._timer);
        this._timer = null;
      }
    },

    /**
     * 获取随机文件大小(KB)
     */
    _getRandomSize() {
      // 返回500KB-5MB的随机大小
      return Math.floor(500 + Math.random() * 4500);
    },

    /**
     * 测试专用：模拟相机状态改变
     * 可通过页面调用改变模拟状态
     */
    simulateCameraStateChange(newState) {
      this.setData({
        mockState: newState
      });
    },

    /**
     * 测试专用：模拟内存变化
     */
    simulateMemoryChange(percentage) {
      this.setData({
        memoryUsage: Math.max(0, Math.min(100, percentage))
      });
    },

    /**
     * 测试专用：模拟错误概率变化
     */
    simulateErrorProbabilityChange(probability) {
      this.setData({
        errorProbability: Math.max(0, Math.min(100, probability))
      });
    }
  }
}); 