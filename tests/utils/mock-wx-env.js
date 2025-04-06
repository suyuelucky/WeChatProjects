/**
 * 微信小程序环境模拟
 * 提供在Node.js环境下模拟微信小程序API的功能
 */

// 模拟wx对象和API
global.wx = {
  // 基础
  env: {
    USER_DATA_PATH: '/tmp/wx_user_data'
  },
  
  // 存储API
  getStorageSync: function(key) {
    console.log('[Mock] wx.getStorageSync 被调用', key);
    return null;
  },
  setStorageSync: function(key, data) {
    console.log('[Mock] wx.setStorageSync 被调用', key);
    return true;
  },
  getStorage: function(options) {
    console.log('[Mock] wx.getStorage 被调用', options);
    if (typeof options.fail === 'function') {
      options.fail({ errMsg: 'getStorage:fail' });
    }
  },
  setStorage: function(options) {
    console.log('[Mock] wx.setStorage 被调用', options);
    if (typeof options.success === 'function') {
      options.success({});
    }
  },
  removeStorage: function(options) {
    console.log('[Mock] wx.removeStorage 被调用', options);
    if (typeof options.success === 'function') {
      options.success({});
    }
  },
  
  // 文件API
  getFileSystemManager: function() {
    return {
      access: function(options) {
        console.log('[Mock] FileSystemManager.access 被调用', options);
        if (typeof options.fail === 'function') {
          options.fail({ errMsg: 'access:fail' });
        }
      },
      accessSync: function(path) {
        console.log('[Mock] FileSystemManager.accessSync 被调用', path);
        throw new Error('accessSync:fail');
      },
      mkdir: function(options) {
        console.log('[Mock] FileSystemManager.mkdir 被调用', options);
        if (typeof options.success === 'function') {
          options.success({});
        }
      },
      mkdirSync: function(path) {
        console.log('[Mock] FileSystemManager.mkdirSync 被调用', path);
      },
      readFile: function(options) {
        console.log('[Mock] FileSystemManager.readFile 被调用', options);
        if (typeof options.fail === 'function') {
          options.fail({ errMsg: 'readFile:fail' });
        }
      },
      writeFile: function(options) {
        console.log('[Mock] FileSystemManager.writeFile 被调用', options);
        if (typeof options.success === 'function') {
          options.success({});
        }
      }
    };
  },
  
  // 媒体API
  chooseMedia: function(options) {
    console.log('[Mock] wx.chooseMedia 被调用', options);
    if (typeof options.success === 'function') {
      options.success({
        tempFiles: [
          {
            tempFilePath: '/tmp/mock_image_1.jpg',
            size: 102400
          }
        ]
      });
    }
  },
  
  // 图片API
  compressImage: function(options) {
    console.log('[Mock] wx.compressImage 被调用', options);
    if (typeof options.success === 'function') {
      options.success({
        tempFilePath: options.src.replace('.jpg', '_compressed.jpg')
      });
    }
  },
  
  copyFile: function(options) {
    console.log('[Mock] wx.copyFile 被调用', options);
    if (typeof options.success === 'function') {
      options.success({});
    }
  },
  
  // 网络API
  request: function(options) {
    console.log('[Mock] wx.request 被调用', options);
    if (typeof options.fail === 'function') {
      options.fail({ errMsg: 'request:fail' });
    }
  },
  
  uploadFile: function(options) {
    console.log('[Mock] wx.uploadFile 被调用', options);
    if (typeof options.success === 'function') {
      setTimeout(function() {
        options.success({
          statusCode: 200,
          data: JSON.stringify({ url: 'https://example.com/uploaded.jpg' })
        });
      }, 100);
    }
    
    // 返回一个上传任务对象
    return {
      onProgressUpdate: function(callback) {
        // 模拟进度更新
        setTimeout(function() {
          callback({ progress: 30, totalBytesSent: 30720, totalBytesExpectedToSend: 102400 });
        }, 100);
        
        setTimeout(function() {
          callback({ progress: 60, totalBytesSent: 61440, totalBytesExpectedToSend: 102400 });
        }, 200);
        
        setTimeout(function() {
          callback({ progress: 100, totalBytesSent: 102400, totalBytesExpectedToSend: 102400 });
        }, 300);
      },
      offProgressUpdate: function() {},
      abort: function() {
        console.log('[Mock] 上传任务已中止');
      }
    };
  },
  
  // UI API
  showToast: function(options) {
    console.log('[Mock] wx.showToast 被调用', options);
  },
  
  showLoading: function(options) {
    console.log('[Mock] wx.showLoading 被调用', options);
  },
  
  hideLoading: function() {
    console.log('[Mock] wx.hideLoading 被调用');
  },
  
  showModal: function(options) {
    console.log('[Mock] wx.showModal 被调用', options);
    if (typeof options.success === 'function') {
      options.success({ confirm: true });
    }
  },
  
  // 系统API
  getSystemInfoSync: function() {
    return {
      brand: 'mock',
      model: 'mock',
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
      SDKVersion: '2.16.0'
    };
  }
};

// 模拟Page和Component API
global.Page = function(options) {
  console.log('[Mock] Page 被调用', Object.keys(options));
  return options;
};

global.Component = function(options) {
  console.log('[Mock] Component 被调用', Object.keys(options));
  return options;
};

global.App = function(options) {
  console.log('[Mock] App 被调用', Object.keys(options));
  return options;
};

// 模拟getCurrentPages API
global.getCurrentPages = function() {
  return [{
    route: 'pages/index/index',
    data: {
      photoList: []
    },
    setData: function(data) {
      console.log('[Mock] Page.setData 被调用', data);
      Object.assign(this.data, data);
    }
  }];
};

// 模拟getApp API
global.getApp = function() {
  return {
    globalData: {},
    getService: function(name) {
      console.log('[Mock] App.getService 被调用', name);
      return null;
    }
  };
};

console.log('[Mock] 微信小程序环境模拟已加载');

module.exports = global.wx; 