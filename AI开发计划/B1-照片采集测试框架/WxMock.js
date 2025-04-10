/**
 * 工作留痕系统 - 微信API模拟工具
 * 用于模拟微信小程序API，实现单元测试和自动化测试
 * 符合ES5标准，确保微信小程序兼容性
 */

var WxMock = {
  // 存储原始API
  _originalApis: {},
  
  /**
   * 模拟wx.request接口
   * @param {Object} mockResponse 模拟的响应数据
   */
  mockRequest: function(mockResponse) {
    this._saveOriginal('request');
    
    wx.request = function(options) {
      setTimeout(function() {
        if (mockResponse.success) {
          options.success && options.success(mockResponse.data);
        } else {
          options.fail && options.fail(mockResponse.error || { errMsg: '请求失败' });
        }
        options.complete && options.complete();
      }, mockResponse.delay || 0);
    };
  },
  
  /**
   * 模拟wx.createCameraContext接口
   * @param {Object} mockImplementation 模拟的实现
   */
  mockCameraContext: function(mockImplementation) {
    this._saveOriginal('createCameraContext');
    
    var defaultImpl = {
      takePhoto: function(options) {
        setTimeout(function() {
          options.success && options.success({
            tempImagePath: 'wxfile://temp/mockPhoto_' + Date.now() + '.jpg'
          });
          options.complete && options.complete();
        }, 50);
      },
      startRecord: function(options) {
        setTimeout(function() {
          options.success && options.success();
          options.complete && options.complete();
        }, 50);
      },
      stopRecord: function(options) {
        setTimeout(function() {
          options.success && options.success({
            tempVideoPath: 'wxfile://temp/mockVideo_' + Date.now() + '.mp4'
          });
          options.complete && options.complete();
        }, 50);
      },
      onCameraFrame: function(callback) {
        // 返回一个监听器ID，通常不会使用
        return 1;
      }
    };
    
    // 合并默认实现和自定义实现
    var implementation = mockImplementation || {};
    for (var key in defaultImpl) {
      if (defaultImpl.hasOwnProperty(key) && !implementation.hasOwnProperty(key)) {
        implementation[key] = defaultImpl[key];
      }
    }
    
    wx.createCameraContext = function() {
      return implementation;
    };
  },
  
  /**
   * 模拟wx.chooseMedia/chooseImage接口
   * @param {Object} mockResult 模拟的结果数据
   */
  mockMediaChooser: function(mockResult) {
    // 模拟新版API: chooseMedia
    if (wx.chooseMedia) {
      this._saveOriginal('chooseMedia');
      
      wx.chooseMedia = function(options) {
        setTimeout(function() {
          if (mockResult.success) {
            options.success && options.success(mockResult.data);
          } else {
            options.fail && options.fail(mockResult.error || { errMsg: '选择媒体失败' });
          }
          options.complete && options.complete();
        }, mockResult.delay || 0);
      };
    }
    
    // 模拟旧版API: chooseImage (兼容性考虑)
    this._saveOriginal('chooseImage');
    
    wx.chooseImage = function(options) {
      setTimeout(function() {
        if (mockResult.success) {
          // 转换为旧API格式
          var result = {
            tempFilePaths: mockResult.data.tempFiles.map(function(f) { return f.tempFilePath; }),
            tempFiles: mockResult.data.tempFiles
          };
          options.success && options.success(result);
        } else {
          options.fail && options.fail(mockResult.error || { errMsg: '选择图片失败' });
        }
        options.complete && options.complete();
      }, mockResult.delay || 0);
    };
  },
  
  /**
   * 模拟wx.compressImage接口
   * @param {Object} mockResult 模拟的结果数据
   */
  mockCompressImage: function(mockResult) {
    this._saveOriginal('compressImage');
    
    wx.compressImage = function(options) {
      setTimeout(function() {
        if (!mockResult || mockResult.success !== false) {
          var tempFilePath = options.src.replace('.jpg', '_compressed.jpg');
          options.success && options.success({ tempFilePath: tempFilePath });
        } else {
          options.fail && options.fail(mockResult.error || { errMsg: '压缩图片失败' });
        }
        options.complete && options.complete();
      }, mockResult && mockResult.delay || 100);
    };
  },
  
  /**
   * 模拟wx.getSystemInfo接口
   * @param {Object} mockSystemInfo 模拟的系统信息
   */
  mockSystemInfo: function(mockSystemInfo) {
    this._saveOriginal('getSystemInfo');
    this._saveOriginal('getSystemInfoSync');
    
    var systemInfo = mockSystemInfo || {
      brand: 'mock',
      model: 'mockPhone',
      pixelRatio: 2,
      screenWidth: 375,
      screenHeight: 667,
      windowWidth: 375,
      windowHeight: 667,
      statusBarHeight: 20,
      language: 'zh_CN',
      version: '8.0.0',
      system: 'iOS 14.0',
      platform: 'ios',
      SDKVersion: '2.16.0',
      batteryLevel: 100
    };
    
    wx.getSystemInfo = function(options) {
      setTimeout(function() {
        options.success && options.success(systemInfo);
        options.complete && options.complete();
      }, 0);
    };
    
    wx.getSystemInfoSync = function() {
      return systemInfo;
    };
  },
  
  /**
   * 模拟wx.setStorage/getStorage接口
   */
  mockStorage: function() {
    var memoryStorage = {};
    
    this._saveOriginal('setStorage');
    this._saveOriginal('getStorage');
    this._saveOriginal('removeStorage');
    this._saveOriginal('setStorageSync');
    this._saveOriginal('getStorageSync');
    this._saveOriginal('removeStorageSync');
    
    // 异步接口
    wx.setStorage = function(options) {
      memoryStorage[options.key] = options.data;
      setTimeout(function() {
        options.success && options.success();
        options.complete && options.complete();
      }, 0);
    };
    
    wx.getStorage = function(options) {
      setTimeout(function() {
        if (memoryStorage.hasOwnProperty(options.key)) {
          options.success && options.success({ data: memoryStorage[options.key] });
        } else {
          options.fail && options.fail({ errMsg: 'getStorage:fail data not found' });
        }
        options.complete && options.complete();
      }, 0);
    };
    
    wx.removeStorage = function(options) {
      delete memoryStorage[options.key];
      setTimeout(function() {
        options.success && options.success();
        options.complete && options.complete();
      }, 0);
    };
    
    // 同步接口
    wx.setStorageSync = function(key, data) {
      memoryStorage[key] = data;
    };
    
    wx.getStorageSync = function(key) {
      return memoryStorage.hasOwnProperty(key) ? memoryStorage[key] : '';
    };
    
    wx.removeStorageSync = function(key) {
      delete memoryStorage[key];
    };
  },
  
  /**
   * 保存原始API
   * @param {String} apiName API名称
   */
  _saveOriginal: function(apiName) {
    if (!this._originalApis[apiName]) {
      this._originalApis[apiName] = wx[apiName];
    }
  },
  
  /**
   * 恢复单个API
   * @param {String} apiName API名称
   */
  restoreApi: function(apiName) {
    if (this._originalApis[apiName]) {
      wx[apiName] = this._originalApis[apiName];
      delete this._originalApis[apiName];
    }
  },
  
  /**
   * 恢复所有被模拟的API
   */
  restoreAll: function() {
    for (var apiName in this._originalApis) {
      if (this._originalApis.hasOwnProperty(apiName)) {
        wx[apiName] = this._originalApis[apiName];
      }
    }
    this._originalApis = {};
  }
};

module.exports = WxMock; 