/**
 * 相机管理组件
 * 负责处理相机调用、权限管理、拍照逻辑和模式切换等功能
 */
var EventBus = require('../../utils/eventBus.js');

// 导入安全过滤器和照片元数据净化工具
const SecurityFilter = require('../../utils/security-filter.js');
const PhotoMetadataCleaner = require('../../utils/photo-metadata-cleaner.js');
const SystemUtils = require('../../utils/systemUtils.js'); // 导入系统工具
const ErrorCollector = require('../../utils/error-collector.js'); // 导入错误收集器

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 初始模式: normal(普通), continuous(连拍), timer(定时)
    initialMode: {
      type: String,
      value: 'normal'
    },
    // 照片分辨率: low, medium, high
    resolution: {
      type: String,
      value: 'medium'
    },
    // 是否显示控制按钮
    showControls: {
      type: Boolean,
      value: true
    },
    // 定时器延迟(秒)
    timerDelay: {
      type: Number,
      value: 3
    },
    // 是否启用诊断模式
    enableDiagnostics: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 相机状态
    isReady: false,
    hasPermission: false,
    devicePosition: 'back', // front或back
    flashMode: 'auto',      // auto, on, off
    currentMode: 'normal',  // normal, continuous, timer
    
    // 拍照状态
    isTakingPhoto: false,
    isCountingDown: false,
    countdownNumber: 0,
    
    // 连拍状态
    isContinuous: false,
    continuousCount: 0,
    
    // 照片管理
    photoList: [],
    
    // 诊断信息
    diagnostics: {
      errors: 0,
      lastError: null,
      storageAvailable: true,
      cameraAvailable: false,
      lastDiagnosticRun: null
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached: function() {
      // 设置初始模式
      this.setData({
        currentMode: this.properties.initialMode
      });
      
      // 初始设备检查
      this._runDiagnostics();
      
      // 检查相机权限
      this.checkCameraPermission();
      
      // 注册内存警告监听
      this._setupMemoryWarning();
    },
    
    ready: function() {
      // 组件完全初始化时记录状态
      ErrorCollector.reportWarning('camera-manager', '相机组件已加载', {
        initialMode: this.properties.initialMode,
        resolution: this.properties.resolution
      });
    },
    
    detached: function() {
      // 清理资源
      this.stopContinuousCapture();
      this.stopCountdown();
      
      // 取消内存警告监听
      if (this._memoryWarningCallback) {
        wx.offMemoryWarning(this._memoryWarningCallback);
        this._memoryWarningCallback = null;
      }
      
      // 清理临时文件
      this._cleanupTempFiles();
      
      // 释放相机资源
      if (this.cameraContext) {
        this.cameraContext = null;
      }
      
      // 记录组件卸载
      ErrorCollector.reportWarning('camera-manager', '相机组件已卸载');
    }
  },

  /**
   * 组件方法列表
   */
  methods: {
    /**
     * 检查相机权限
     * @private
     */
    checkCameraPermission: function() {
      var that = this;
      
      try {
        wx.getSetting({
          success: function(res) {
            if (res.authSetting['scope.camera']) {
              // 已授权
              that.setData({
                hasPermission: true,
                'diagnostics.cameraAvailable': true
              });
              
              // 初始化相机
              that.initCamera();
            } else if (res.authSetting['scope.camera'] === false) {
              // 已拒绝授权
              that.setData({
                hasPermission: false,
                'diagnostics.cameraAvailable': false
              });
              
              // 记录权限拒绝
              ErrorCollector.reportFeatureUnavailable('camera', '用户拒绝相机权限');
              
              // 触发权限拒绝事件
              that.triggerEvent('permissionDenied');
            } else {
              // 首次使用，请求授权
              wx.authorize({
                scope: 'scope.camera',
                success: function() {
                  that.setData({
                    hasPermission: true,
                    'diagnostics.cameraAvailable': true
                  });
                  
                  // 初始化相机
                  that.initCamera();
                },
                fail: function(err) {
                  that.setData({
                    hasPermission: false,
                    'diagnostics.cameraAvailable': false
                  });
                  
                  // 记录权限拒绝
                  ErrorCollector.reportFeatureUnavailable('camera', '用户拒绝相机权限', { error: err });
                  
                  // 触发权限拒绝事件
                  that.triggerEvent('permissionDenied');
                }
              });
            }
          },
          fail: function(err) {
            ErrorCollector.reportError('camera-auth', '获取设置失败', { error: err });
            that.setData({
              hasPermission: false,
              'diagnostics.cameraAvailable': false
            });
          }
        });
      } catch (err) {
        ErrorCollector.reportError('camera-auth', '检查相机权限异常', { error: err });
        this.setData({
          hasPermission: false,
          'diagnostics.cameraAvailable': false,
          'diagnostics.lastError': '检查相机权限异常: ' + err.message
        });
      }
    },
    
    /**
     * 运行相机诊断
     * @private
     */
    _runDiagnostics: function() {
      try {
        // 检查存储空间
        wx.getStorageInfo({
          success: (res) => {
            const availableSize = res.limitSize - res.currentSize;
            const isStorageAvailable = availableSize > 20 * 1024; // 至少20MB可用空间
            
            this.setData({
              'diagnostics.storageAvailable': isStorageAvailable,
              'diagnostics.lastDiagnosticRun': Date.now()
            });
            
            // 记录诊断结果
            if (!isStorageAvailable) {
              ErrorCollector.reportWarning('storage', '存储空间不足', {
                available: availableSize / 1024,
                limitSize: res.limitSize / 1024,
                currentSize: res.currentSize / 1024
              });
            }
          },
          fail: (err) => {
            ErrorCollector.reportError('storage-check', '获取存储信息失败', { error: err });
            this.setData({
              'diagnostics.storageAvailable': false,
              'diagnostics.lastDiagnosticRun': Date.now(),
              'diagnostics.lastError': '获取存储信息失败: ' + err.errMsg
            });
          }
        });
        
        // 检查设备信息
        const systemInfo = wx.getSystemInfoSync();
        
        // 记录设备信息
        ErrorCollector.reportWarning('device-info', '设备信息', {
          brand: systemInfo.brand,
          model: systemInfo.model,
          system: systemInfo.system,
          SDKVersion: systemInfo.SDKVersion,
          benchmarkLevel: systemInfo.benchmarkLevel || '未知'
        });
        
      } catch (err) {
        ErrorCollector.reportError('diagnostics', '运行诊断失败', { error: err });
        this.setData({
          'diagnostics.errors': this.data.diagnostics.errors + 1,
          'diagnostics.lastError': '运行诊断失败: ' + err.message
        });
      }
    },
    
    /**
     * 初始化相机
     * @private
     */
    initCamera: function() {
      if (!this.data.hasPermission) {
        return;
      }
      
      try {
        // 初始化相机上下文
        this.cameraContext = wx.createCameraContext(this);
        
        if (!this.cameraContext) {
          throw new Error('创建相机上下文失败');
        }
        
        // 标记相机就绪
        this.setData({
          isReady: true,
          'diagnostics.cameraAvailable': true
        });
        
        // 触发相机就绪事件
        this.triggerEvent('cameraReady');
      } catch (err) {
        ErrorCollector.reportError('camera-init', '初始化相机失败', { error: err });
        this.setData({
          isReady: false,
          'diagnostics.cameraAvailable': false,
          'diagnostics.errors': this.data.diagnostics.errors + 1,
          'diagnostics.lastError': '初始化相机失败: ' + err.message
        });
      }
    },
    
    /**
     * 切换前后摄像头
     */
    switchCamera: function() {
      if (!this.data.isReady || this.data.isTakingPhoto) {
        return;
      }
      
      this.setData({
        devicePosition: this.data.devicePosition === 'back' ? 'front' : 'back'
      });
    },
    
    /**
     * 切换闪光灯模式
     */
    switchFlash: function() {
      if (!this.data.isReady || this.data.isTakingPhoto) {
        return;
      }
      
      // 循环切换闪光灯模式
      var modes = ['auto', 'on', 'off'];
      var currentIndex = modes.indexOf(this.data.flashMode);
      var nextIndex = (currentIndex + 1) % modes.length;
      
      this.setData({
        flashMode: modes[nextIndex]
      });
    },
    
    /**
     * 切换拍照模式
     * @param {string} mode 模式名称
     */
    switchMode: function(mode) {
      if (!this.data.isReady || this.data.isTakingPhoto) {
        return;
      }
      
      // 停止当前模式的相关操作
      this.stopContinuousCapture();
      this.stopCountdown();
      
      // 设置新模式
      var newMode = mode;
      if (typeof mode === 'object') {
        // 事件对象处理
        newMode = mode.currentTarget.dataset.mode;
      }
      
      this.setData({
        currentMode: newMode
      });
    },
    
    /**
     * 处理拍照按钮点击
     */
    handleCaptureClick: function() {
      if (!this.data.isReady || this.data.isTakingPhoto) {
        return;
      }
      
      switch (this.data.currentMode) {
        case 'normal':
          this.takePhoto();
          break;
        case 'continuous':
          if (this.data.isContinuous) {
            this.stopContinuousCapture();
          } else {
            this.startContinuousCapture();
          }
          break;
        case 'timer':
          if (this.data.isCountingDown) {
            this.stopCountdown();
          } else {
            this.startCountdown();
          }
          break;
      }
    },
    
    /**
     * 拍照核心方法 - 已优化以解决内存问题
     */
    takePhoto: function() {
      if (this.data.isTakingPhoto) return;
      
      this.setData({ isTakingPhoto: true });
      
      // 记录开始拍照
      const startTime = Date.now();
      
      // 获取照片质量级别 - 根据分辨率正确设置
      const qualityMapping = {
        low: 'low',
        medium: 'medium',
        high: 'high'
      };
      const quality = qualityMapping[this.properties.resolution] || 'medium';

      // 拍照前检查内存状态      
      this._checkMemoryBeforeCapture()
        .then(() => {
          // 调用相机接口
          if (!this.cameraContext) {
            this.initCamera();
            if (!this.cameraContext) {
              throw new Error('相机未初始化');
            }
          }
          
          this.cameraContext.takePhoto({
            quality: quality,
            success: (res) => {
              try {
                const processingTime = Date.now() - startTime;
                console.log('拍照成功:', res.tempImagePath, '耗时:', processingTime + 'ms');
                
                // 记录拍照成功信息
                ErrorCollector.reportWarning('camera-photo', '拍照成功', {
                  quality: quality, 
                  processingTime: processingTime,
                  tempPath: res.tempImagePath
                });
                
                // 处理照片（安全清理和添加元数据）
                this._processPhoto(res.tempImagePath)
                  .then((photoInfo) => {
                    // 触发拍照成功事件
                    this.triggerEvent('photoTaken', { photo: photoInfo });
                    
                    // 添加到本地照片列表 - 最多保留最近10张照片
                    const updatedList = this.data.photoList.concat(photoInfo);
                    const limitedList = updatedList.length > 10 ? updatedList.slice(-10) : updatedList;
                    
                    this.setData({ 
                      photoList: limitedList,
                      isTakingPhoto: false 
                    });
                  })
                  .catch((err) => {
                    ErrorCollector.reportError('photo-process', '处理照片失败', { error: err });
                    console.error('处理照片失败:', err);
                    wx.showToast({
                      title: '照片处理失败',
                      icon: 'none'
                    });
                    this.setData({ isTakingPhoto: false });
                  });
              } catch (error) {
                ErrorCollector.reportError('photo-handling', '拍照处理异常', { error: error });
                console.error('拍照处理异常:', error);
                this.setData({ isTakingPhoto: false });
              }
            },
            fail: (err) => {
              ErrorCollector.reportError('camera-capture', '拍照失败', { error: err });
              console.error('拍照失败:', err);
              this.triggerEvent('error', { error: err });
              
              // 更新诊断信息
              this.setData({
                isTakingPhoto: false,
                'diagnostics.errors': this.data.diagnostics.errors + 1,
                'diagnostics.lastError': '拍照失败: ' + (err.errMsg || JSON.stringify(err))
              });
              
              wx.showToast({
                title: '拍照失败',
                icon: 'none'
              });
            }
          });
        })
        .catch(err => {
          ErrorCollector.reportError('memory-check', '拍照前内存检查失败', { error: err });
          console.error('拍照前内存检查失败:', err);
          this.setData({ 
            isTakingPhoto: false,
            'diagnostics.errors': this.data.diagnostics.errors + 1,
            'diagnostics.lastError': '内存检查失败: ' + err.message
          });
          
          wx.showToast({
            title: err.message || '内存不足',
            icon: 'none'
          });
        });
    },
    
    /**
     * 重试拍照
     * 在拍照失败后，尝试恢复相机状态并重新拍照
     */
    retryPhoto: function() {
      try {
        // 重置相机状态
        this.setData({ isTakingPhoto: false });
        
        // 记录重试操作
        ErrorCollector.reportWarning('camera-retry', '重试拍照');
        
        // 运行诊断
        this._runDiagnostics();
        
        // 重新初始化相机
        if (!this.cameraContext) {
          this.initCamera();
        }
        
        // 延迟一点时间再重试拍照
        setTimeout(() => {
          this.takePhoto();
        }, 500);
      } catch (err) {
        ErrorCollector.reportError('camera-retry', '重试拍照失败', { error: err });
      }
    },
    
    /**
     * 获取诊断报告
     * 收集相机组件当前的状态和错误信息
     */
    getDiagnosticReport: function() {
      try {
        // 再次运行诊断
        this._runDiagnostics();
        
        // 收集日志
        const logs = ErrorCollector.getLogs();
        const cameraLogs = logs.filter(log => 
          log.category === 'camera-capture' || 
          log.category === 'camera-init' ||
          log.category === 'camera-auth' ||
          log.category === 'photo-process' ||
          log.feature === 'camera'
        );
        
        // 构建报告
        const report = {
          timestamp: Date.now(),
          camera: {
            isReady: this.data.isReady,
            hasPermission: this.data.hasPermission,
            devicePosition: this.data.devicePosition,
            flashMode: this.data.flashMode,
            currentMode: this.data.currentMode,
            photoCount: this.data.photoList.length
          },
          diagnostics: this.data.diagnostics,
          recentLogs: cameraLogs.slice(-10)
        };
        
        return report;
      } catch (err) {
        ErrorCollector.reportError('diagnostics', '获取诊断报告失败', { error: err });
        return {
          error: true,
          message: '获取诊断报告失败: ' + err.message,
          timestamp: Date.now()
        };
      }
    },
    
    /**
     * 收集调试信息并尝试自我修复
     */
    selfRepair: function() {
      try {
        // 记录自修复尝试
        ErrorCollector.reportWarning('camera-repair', '尝试自修复相机');
        
        // 清理资源
        this._cleanupTempFiles();
        
        // 释放相机上下文
        this.cameraContext = null;
        
        // 重置状态
        this.setData({
          isReady: false,
          isTakingPhoto: false
        });
        
        // 重新初始化相机
        setTimeout(() => {
          this.initCamera();
          
          // 检查初始化结果
          if (this.data.isReady) {
            ErrorCollector.reportWarning('camera-repair', '相机自修复成功');
            wx.showToast({
              title: '相机已重置',
              icon: 'success'
            });
          } else {
            ErrorCollector.reportFeatureUnavailable('camera', '相机重置后仍不可用');
            wx.showToast({
              title: '相机重置失败',
              icon: 'none'
            });
          }
        }, 1000);
        
        return true;
      } catch (err) {
        ErrorCollector.reportError('camera-repair', '相机自修复失败', { error: err });
        this.setData({
          'diagnostics.errors': this.data.diagnostics.errors + 1,
          'diagnostics.lastError': '自修复失败: ' + err.message
        });
        return false;
      }
    },
    
    /**
     * 处理拍摄的照片
     * @param {String} tempImagePath 临时图片路径
     * @returns {Promise<Object>} 处理后的照片信息
     * @private
     */
    _processPhoto: function(tempImagePath) {
      return new Promise((resolve, reject) => {
        // 获取图片信息
        wx.getImageInfo({
          src: tempImagePath,
          success: (imageInfo) => {
            // 创建照片对象
            var photo = {
              id: 'photo_' + Date.now(),
              path: tempImagePath,
              width: imageInfo.width,
              height: imageInfo.height,
              orientation: imageInfo.orientation,
              type: 'image',
              size: 0, // 先默认为0，后续可能会更新
              createdAt: new Date().toISOString(),
              status: 'temp'
            };
            
            // 使用PhotoMetadataCleaner清理元数据
            photo = PhotoMetadataCleaner.cleanMetadata(photo);
            
            // 安全处理文件名
            photo.fileName = PhotoMetadataCleaner.generateSafeFileName(photo);
            
            resolve(photo);
          },
          fail: (err) => {
            console.error('获取图片信息失败:', err);
            reject(err);
          }
        });
      });
    },
    
    /**
     * 拍照前检查内存状态
     * @returns {Promise<void>}
     * @private
     */
    _checkMemoryBeforeCapture: function() {
      return new Promise((resolve, reject) => {
        // 先尝试清理临时文件以释放空间
        this._partialCleanup();

        // 检查微信小程序本地存储空间
        try {
          const fs = wx.getFileSystemManager();
          
          // 判断是否能写入文件作为检查存储空间的方法
          const testFilePath = wx.env.USER_DATA_PATH + '/test_write_' + Date.now() + '.tmp';
          
          try {
            // 创建一个1KB的测试文件
            const testData = new ArrayBuffer(1024);
            fs.writeFileSync(testFilePath, testData);
            
            // 成功写入，说明有足够空间，删除测试文件
            try {
              fs.unlinkSync(testFilePath);
            } catch(e) {
              // 忽略删除错误
            }
            
            // 可以进行拍照
            resolve();
          } catch(writeErr) {
            console.warn('测试写入失败，可能存储空间不足:', writeErr);
            
            // 尝试清理小程序存储
            this._emergencyDirectCleanup().then(() => {
              // 清理后再尝试写入
              try {
                const testData = new ArrayBuffer(1024);
                fs.writeFileSync(testFilePath, testData);
                
                // 成功写入，删除测试文件
                try {
                  fs.unlinkSync(testFilePath);
                } catch(e) {
                  // 忽略删除错误
                }
                
                // 清理成功，可以拍照
                resolve();
              } catch(e) {
                // 如果仍然失败，提示用户
                console.error('存储空间严重不足:', e);
                
                // 此处修改为继续允许拍照，只是显示警告
                wx.showToast({
                  title: '存储空间偏低，可能影响照片存储',
                  icon: 'none',
                  duration: 2000
                });
                
                // 即使空间不足，也允许用户尝试拍照
                resolve();
              }
            });
          }
        } catch (e) {
          console.error('检查存储空间出错:', e);
          // 发生异常也尝试继续
          resolve();
        }
      });
    },
    
    /**
     * 紧急直接清理 - 最后的清理方法
     * @private
     */
    _emergencyDirectCleanup: function() {
      return new Promise((resolve) => {
        try {
          // 清理所有临时文件
          this._cleanupTempFiles();
          
          // 直接清理wx.env.USER_DATA_PATH目录
          const fs = wx.getFileSystemManager();
          const userDir = wx.env.USER_DATA_PATH;
          
          // 尝试清理常见临时目录
          const dirsToClean = [
            userDir + '/temp',
            userDir + '/tmp',
            userDir + '/cache',
            userDir + '/wxafiles',
            userDir
          ];
          
          // 尝试清理每个目录
          let cleaned = 0;
          let toClean = dirsToClean.length;
          
          const checkComplete = () => {
            cleaned++;
            if (cleaned >= toClean) {
              resolve();
            }
          };
          
          // 尝试清理每个目录
          dirsToClean.forEach((dir) => {
            try {
              fs.readdir({
                dirPath: dir,
                success: (res) => {
                  const files = res.files || [];
                  
                  // 检查每个文件是否可以删除
                  files.forEach((file) => {
                    // 跳过关键文件和目录
                    if (file === '.' || 
                        file === '..' || 
                        file === 'miniprogramRoot' || 
                        file === 'appservice') {
                      return;
                    }
                    
                    // 尝试获取文件信息
                    try {
                      fs.stat({
                        path: dir + '/' + file,
                        success: (stat) => {
                          // 如果是临时文件则删除
                          if (stat.isFile() && 
                              (file.endsWith('.tmp') || 
                               file.endsWith('.jpg') || 
                               file.endsWith('.png') || 
                               file.indexOf('temp') !== -1)) {
                            try {
                              fs.unlinkSync(dir + '/' + file);
                            } catch (e) {
                              // 忽略删除错误
                            }
                          }
                        }
                      });
                    } catch (e) {
                      // 忽略文件操作错误
                    }
                  });
                },
                complete: checkComplete
              });
            } catch (e) {
              // 目录操作失败，继续下一个
              checkComplete();
            }
          });
          
          // 尝试同步清理存储
          try {
            const res = wx.getStorageInfoSync();
            const keys = res.keys || [];
            
            // 清理所有临时数据
            for (let i = 0; i < keys.length; i++) {
              const key = keys[i];
              try {
                if (key !== 'logs') { 
                  wx.removeStorageSync(key);
                }
              } catch (e) {
                // 忽略清理错误
              }
            }
          } catch (e) {
            // 忽略清理错误
          }
        } catch (err) {
          console.error('紧急清理失败:', err);
        }
        
        // 无论成功失败都继续
        resolve();
      });
    },
    
    /**
     * 深度清理资源
     * @returns {Promise<void>}
     * @private
     */
    _deepCleanup: function() {
      return new Promise((resolve) => {
        try {
          // 1. 清除所有临时照片
          this._cleanupTempFiles();
          
          // 2. 使用SystemUtils清理系统存储
          SystemUtils.cleanupSystemStorage()
            .then(() => {
              resolve();
            })
            .catch((err) => {
              console.error('系统存储清理失败:', err);
              resolve();
            });
        } catch (e) {
          console.error('深度清理过程出错:', e);
          resolve(); // 出错也继续执行
        }
      });
    },
    
    /**
     * 清理存储
     * @private
     */
    _clearStorage: function() {
      try {
        const res = wx.getStorageInfoSync();
        const keys = res.keys || [];
        
        // 临时数据和日志优先清理
        const tempKeys = [];
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          if (key.startsWith('temp_') || key.startsWith('log_') || key.startsWith('cache_')) {
            tempKeys.push(key);
          }
        }
        
        // 清理临时数据
        for (let i = 0; i < tempKeys.length; i++) {
          const key = tempKeys[i];
          try {
            wx.removeStorageSync(key);
            console.log('已清理存储项:', key);
          } catch (e) {
            console.warn('清理存储项失败:', e);
          }
        }
      } catch (err) {
        console.error('清理存储失败:', err);
      }
    },
    
    /**
     * 清理临时文件 - 增强版
     * @private
     */
    _cleanupTempFiles: function() {
      try {
        // 获取所有照片的临时路径
        const tempFilePaths = this.data.photoList
          .filter(photo => photo.path && photo.path.indexOf('tmp') !== -1)
          .map(photo => photo.path);
        
        if (tempFilePaths.length === 0) return;
        
        // 获取文件系统管理器
        const fs = wx.getFileSystemManager();
        
        // 删除所有临时文件
        tempFilePaths.forEach(path => {
          try {
            fs.unlink({
              filePath: path,
              fail: (err) => {
                console.warn('删除临时文件失败:', err);
              }
            });
          } catch (e) {
            console.error('清理临时文件出错:', e);
          }
        });
        
        // 清空照片列表
        this.setData({
          photoList: []
        });
        
        console.log('临时文件清理完成');
      } catch (err) {
        console.error('清理临时文件过程出错:', err);
      }
    },
    
    /**
     * 开始倒计时拍照
     */
    startCountdown: function() {
      if (this.data.isCountingDown) return;
      
      this.setData({
        isCountingDown: true,
        countdownNumber: this.properties.timerDelay
      });
      
      var that = this;
      this._countdownTimer = setInterval(function() {
        var newCount = that.data.countdownNumber - 1;
        
        if (newCount <= 0) {
          // 倒计时结束，拍照
          that.stopCountdown();
          that.takePhoto();
        } else {
          that.setData({
            countdownNumber: newCount
          });
        }
      }, 1000);
      
      // 触发倒计时开始事件
      this.triggerEvent('timerStarted');
    },
    
    /**
     * 停止倒计时
     */
    stopCountdown: function() {
      if (this._countdownTimer) {
        clearInterval(this._countdownTimer);
        this._countdownTimer = null;
      }
      
      this.setData({
        isCountingDown: false,
        countdownNumber: 0
      });
      
      // 触发倒计时结束事件
      this.triggerEvent('timerStopped');
    },
    
    /**
     * 开始连拍
     */
    startContinuousCapture: function() {
      if (this._continuousInterval) return;
      
      this.setData({
        isContinuous: true,
        continuousCount: 0
      });
      
      var that = this;
      // 每0.8秒拍一张照片
      this._continuousInterval = setInterval(function() {
        that.takePhoto();
        that.setData({
          continuousCount: that.data.continuousCount + 1
        });
        
        // 如果连拍超过10张，自动停止
        if (that.data.continuousCount >= 10) {
          that.stopContinuousCapture();
        }
      }, 800);
      
      // 触发连拍开始事件
      this.triggerEvent('continuousStarted');
    },
    
    /**
     * 停止连拍
     */
    stopContinuousCapture: function() {
      if (this._continuousInterval) {
        clearInterval(this._continuousInterval);
        this._continuousInterval = null;
      }
      
      this.setData({
        isContinuous: false
      });
      
      // 触发连拍结束事件
      this.triggerEvent('continuousStopped', {
        count: this.data.continuousCount
      });
    },
    
    /**
     * 处理相机错误
     */
    handleCameraError: function(e) {
      console.error('Camera error:', e.detail);
      this.triggerEvent('cameraError', {
        error: e.detail
      });
    },
    
    /**
     * 获取所有拍摄的照片
     */
    getPhotoList: function() {
      return this.data.photoList;
    },
    
    /**
     * 清空照片列表
     */
    clearPhotoList: function() {
      this.setData({
        photoList: []
      });
    },
    
    /**
     * 设置内存警告监听 - 改进版
     * @private
     */
    _setupMemoryWarning: function() {
      this._memoryWarningCallback = (res) => {
        console.warn(`[相机组件] 收到内存警告，级别: ${res.level}`);
        
        // 按内存警告级别采取不同措施
        if (res.level >= 10) {
          // 严重内存不足，停止所有相机活动
          this.stopContinuousCapture();
          this.stopCountdown();
          this._cleanupTempFiles();
          
          wx.showToast({
            title: '内存严重不足，已释放资源',
            icon: 'none',
            duration: 2000
          });
        } else if (res.level >= 5) {
          // 中度内存不足，停止连拍等高内存消耗操作
          if (this.data.isContinuous) {
            this.stopContinuousCapture();
            wx.showToast({
              title: '内存不足，已停止连拍',
              icon: 'none'
            });
          }
          
          // 清理部分临时资源
          this._partialCleanup();
        } else {
          // 轻度内存警告，清理不必要的缓存
          this._partialCleanup();
        }
      };
      
      // 注册内存警告监听
      wx.onMemoryWarning(this._memoryWarningCallback);
    },
    
    /**
     * 部分清理资源
     * @private
     */
    _partialCleanup: function() {
      // 仅保留最近3张照片
      if (this.data.photoList.length > 3) {
        const oldPhotos = this.data.photoList.slice(0, this.data.photoList.length - 3);
        
        // 删除旧的临时文件
        oldPhotos.forEach(photo => {
          if (photo.path && photo.path.indexOf('tmp') !== -1) {
            try {
              wx.getFileSystemManager().unlink({
                filePath: photo.path,
                fail: (err) => {
                  console.warn('删除临时文件失败:', err);
                }
              });
            } catch (e) {
              console.error('清理临时文件出错:', e);
            }
          }
        });
        
        // 更新照片列表，只保留最近3张
        this.setData({
          photoList: this.data.photoList.slice(-3)
        });
        
        console.log('已清理部分临时文件，保留最近3张');
      }
    }
  }
}); 