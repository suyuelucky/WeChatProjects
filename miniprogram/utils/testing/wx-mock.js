/**
 * 微信小程序API模拟文件
 * 用于Jest测试环境中模拟wx对象及其方法
 */

// 存储回调函数的对象
const callbacks = {
  success: {},
  fail: {},
  complete: {},
};

// 存储模拟数据的对象
const mockData = {
  storage: {},
  system: {
    windowWidth: 375,
    windowHeight: 667,
    pixelRatio: 2,
    platform: 'devtools',
    model: 'iPhone X',
    language: 'zh_CN',
    version: '8.0.0',
    SDKVersion: '2.20.2',
  },
  location: {
    latitude: 39.9042,
    longitude: 116.4074,
    speed: 0,
    accuracy: 10,
  },
  network: {
    networkType: 'wifi',
    isConnected: true,
  },
  camera: {
    status: 'normal',
  },
  user: {
    nickName: 'Test User',
    avatarUrl: 'https://example.com/avatar.png',
    gender: 1,
    province: 'Beijing',
    city: 'Beijing',
    country: 'China',
  }
};

// 基础模拟方法
const baseApiMock = (options = {}) => {
  if (typeof options.success === 'function') {
    options.success({});
  }
  if (typeof options.complete === 'function') {
    options.complete({});
  }
  return {};
};

// 重置所有模拟数据和回调
const _reset = () => {
  // 重置存储数据
  mockData.storage = {};
  
  // 重置回调函数
  Object.keys(callbacks).forEach(key => {
    callbacks[key] = {};
  });
};

// 创建基本的wx对象
const wx = {
  // 辅助方法用于测试
  _mockData: mockData,
  _callbacks: callbacks,
  _reset,
  
  // 常用API模拟
  request: jest.fn((options = {}) => {
    const { url, data, method = 'GET', header, success, fail, complete } = options;
    
    // 模拟成功响应
    if (typeof success === 'function') {
      success({
        data: { status: 'success', data: {} },
        statusCode: 200,
        header: { 'Content-Type': 'application/json' },
      });
    }
    
    if (typeof complete === 'function') {
      complete();
    }
  }),
  
  // 导航相关
  navigateTo: jest.fn(baseApiMock),
  redirectTo: jest.fn(baseApiMock),
  navigateBack: jest.fn(baseApiMock),
  switchTab: jest.fn(baseApiMock),
  
  // 界面相关
  showToast: jest.fn(baseApiMock),
  showLoading: jest.fn(baseApiMock),
  hideLoading: jest.fn(baseApiMock),
  showModal: jest.fn((options = {}) => {
    if (typeof options.success === 'function') {
      options.success({ confirm: true, cancel: false });
    }
    if (typeof options.complete === 'function') {
      options.complete();
    }
  }),
  
  // 存储相关
  setStorage: jest.fn((options = {}) => {
    if (options.key && options.data !== undefined) {
      mockData.storage[options.key] = options.data;
      if (typeof options.success === 'function') {
        options.success();
      }
    } else if (typeof options.fail === 'function') {
      options.fail({ errMsg: 'setStorage:fail parameter error' });
    }
    
    if (typeof options.complete === 'function') {
      options.complete();
    }
  }),
  
  setStorageSync: jest.fn((key, data) => {
    if (key && data !== undefined) {
      mockData.storage[key] = data;
    } else {
      throw new Error('setStorageSync:fail parameter error');
    }
  }),
  
  getStorage: jest.fn((options = {}) => {
    if (options.key && mockData.storage[options.key] !== undefined) {
      if (typeof options.success === 'function') {
        options.success({ data: mockData.storage[options.key] });
      }
    } else if (typeof options.fail === 'function') {
      options.fail({ errMsg: 'getStorage:fail data not found' });
    }
    
    if (typeof options.complete === 'function') {
      options.complete();
    }
  }),
  
  getStorageSync: jest.fn(key => {
    return key && mockData.storage[key] !== undefined ? mockData.storage[key] : '';
  }),
  
  removeStorage: jest.fn((options = {}) => {
    if (options.key) {
      delete mockData.storage[options.key];
      if (typeof options.success === 'function') {
        options.success();
      }
    } else if (typeof options.fail === 'function') {
      options.fail({ errMsg: 'removeStorage:fail parameter error' });
    }
    
    if (typeof options.complete === 'function') {
      options.complete();
    }
  }),
  
  removeStorageSync: jest.fn(key => {
    if (key) {
      delete mockData.storage[key];
    } else {
      throw new Error('removeStorageSync:fail parameter error');
    }
  }),
  
  clearStorage: jest.fn((options = {}) => {
    mockData.storage = {};
    if (typeof options.success === 'function') {
      options.success();
    }
    if (typeof options.complete === 'function') {
      options.complete();
    }
  }),
  
  clearStorageSync: jest.fn(() => {
    mockData.storage = {};
  }),
  
  // 系统相关
  getSystemInfo: jest.fn((options = {}) => {
    if (typeof options.success === 'function') {
      options.success(mockData.system);
    }
    if (typeof options.complete === 'function') {
      options.complete();
    }
  }),
  
  getSystemInfoSync: jest.fn(() => {
    return { ...mockData.system };
  }),
  
  // 网络相关
  getNetworkType: jest.fn((options = {}) => {
    if (typeof options.success === 'function') {
      options.success({ networkType: mockData.network.networkType });
    }
    if (typeof options.complete === 'function') {
      options.complete();
    }
  }),
  
  onNetworkStatusChange: jest.fn(callback => {
    callbacks.success.networkStatusChange = callback;
  }),
  
  // 位置相关
  getLocation: jest.fn((options = {}) => {
    if (typeof options.success === 'function') {
      options.success({ ...mockData.location });
    }
    if (typeof options.complete === 'function') {
      options.complete();
    }
  }),

  // 文件操作
  saveFile: jest.fn(baseApiMock),
  getFileInfo: jest.fn(baseApiMock),
  getSavedFileList: jest.fn((options = {}) => {
    if (typeof options.success === 'function') {
      options.success({ fileList: [] });
    }
    if (typeof options.complete === 'function') {
      options.complete();
    }
  }),
  
  // 相机相关
  createCameraContext: jest.fn(() => {
    return {
      takePhoto: jest.fn((options = {}) => {
        if (typeof options.success === 'function') {
          options.success({ tempImagePath: 'mock_image_path.jpg' });
        }
        if (typeof options.complete === 'function') {
          options.complete();
        }
      }),
      startRecord: jest.fn(baseApiMock),
      stopRecord: jest.fn(baseApiMock),
      onCameraFrame: jest.fn(callback => {
        callbacks.success.cameraFrame = callback;
        return {
          start: jest.fn(() => {}),
          stop: jest.fn(() => {}),
        };
      }),
    };
  }),
  
  // 用户信息
  getUserProfile: jest.fn((options = {}) => {
    if (typeof options.success === 'function') {
      options.success({
        userInfo: mockData.user,
        rawData: JSON.stringify(mockData.user),
        signature: 'mock_signature',
        encryptedData: 'mock_encrypted_data',
        iv: 'mock_iv',
      });
    }
    if (typeof options.complete === 'function') {
      options.complete();
    }
  }),
  
  // 登录相关
  login: jest.fn((options = {}) => {
    if (typeof options.success === 'function') {
      options.success({ code: 'mock_code_123456' });
    }
    if (typeof options.complete === 'function') {
      options.complete();
    }
  }),
  
  // 云函数
  cloud: {
    init: jest.fn(),
    callFunction: jest.fn((options = {}) => {
      if (typeof options.success === 'function') {
        options.success({ result: { data: {} } });
      }
      if (typeof options.complete === 'function') {
        options.complete();
      }
      return Promise.resolve({ result: { data: {} } });
    }),
    database: jest.fn(() => {
      return {
        collection: jest.fn(() => {
          return {
            doc: jest.fn(() => {
              return {
                get: jest.fn(() => Promise.resolve({ data: {} })),
                set: jest.fn(() => Promise.resolve({ _id: 'mock_id' })),
                update: jest.fn(() => Promise.resolve({})),
                remove: jest.fn(() => Promise.resolve({})),
              };
            }),
            where: jest.fn(() => {
              return {
                get: jest.fn(() => Promise.resolve({ data: [] })),
                count: jest.fn(() => Promise.resolve({ total: 0 })),
                orderBy: jest.fn(() => {
                  return {
                    limit: jest.fn(() => {
                      return {
                        get: jest.fn(() => Promise.resolve({ data: [] })),
                      };
                    }),
                  };
                }),
              };
            }),
            add: jest.fn(() => Promise.resolve({ _id: 'mock_id' })),
          };
        }),
      };
    }),
  },
};

module.exports = wx; 