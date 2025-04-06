/**
 * 工作跟踪系统 - Jest测试环境设置
 * 
 * 此文件为Jest测试框架提供全局设置，包括：
 * 1. 模拟微信小程序API
 * 2. 添加全局测试辅助方法
 * 3. 设置测试环境变量
 */

// 模拟微信小程序API
global.wx = {
  // 存储API
  getStorage: jest.fn(),
  getStorageSync: jest.fn(),
  setStorage: jest.fn(),
  setStorageSync: jest.fn(),
  removeStorage: jest.fn(),
  removeStorageSync: jest.fn(),
  clearStorage: jest.fn(),
  clearStorageSync: jest.fn(),
  getStorageInfo: jest.fn().mockImplementation(options => {
    if (options && options.success) {
      options.success({
        keys: [],
        currentSize: 0,
        limitSize: 10240
      });
    }
    return {
      keys: [],
      currentSize: 0,
      limitSize: 10240
    };
  }),
  getStorageInfoSync: jest.fn().mockReturnValue({
    keys: [],
    currentSize: 0,
    limitSize: 10240
  }),
  
  // 网络API
  request: jest.fn(),
  downloadFile: jest.fn(),
  uploadFile: jest.fn(),
  connectSocket: jest.fn(),
  onSocketOpen: jest.fn(),
  onSocketError: jest.fn(),
  onSocketMessage: jest.fn(),
  onSocketClose: jest.fn(),
  sendSocketMessage: jest.fn(),
  closeSocket: jest.fn(),
  getNetworkType: jest.fn().mockImplementation(options => {
    if (options && options.success) {
      options.success({ networkType: 'wifi' });
    }
    return { networkType: 'wifi' };
  }),
  onNetworkStatusChange: jest.fn(),
  
  // 媒体API
  chooseImage: jest.fn().mockImplementation(options => {
    if (options && options.success) {
      options.success({
        tempFilePaths: ['/tmp/wxfile123456.jpg'],
        tempFiles: [
          {
            path: '/tmp/wxfile123456.jpg',
            size: 12345
          }
        ]
      });
    }
  }),
  previewImage: jest.fn(),
  getImageInfo: jest.fn(),
  saveImageToPhotosAlbum: jest.fn(),
  
  // 文件API
  saveFile: jest.fn().mockImplementation(options => {
    if (options && options.success) {
      options.success({ savedFilePath: options.tempFilePath });
    }
  }),
  getFileInfo: jest.fn().mockImplementation(options => {
    if (options && options.success) {
      options.success({ size: 12345 });
    }
  }),
  getSavedFileList: jest.fn().mockImplementation(options => {
    if (options && options.success) {
      options.success({ fileList: [] });
    }
  }),
  removeSavedFile: jest.fn().mockImplementation(options => {
    if (options && options.success) {
      options.success({});
    }
  }),
  
  // 设备API
  getSystemInfo: jest.fn().mockImplementation(options => {
    const info = {
      brand: 'iPhone',
      model: 'iPhone X',
      pixelRatio: 3,
      screenWidth: 375,
      screenHeight: 812,
      windowWidth: 375,
      windowHeight: 729,
      statusBarHeight: 44,
      language: 'zh_CN',
      version: '7.0.4',
      system: 'iOS 12.0',
      platform: 'ios',
      SDKVersion: '2.10.3'
    };
    
    if (options && options.success) {
      options.success(info);
    }
    
    return info;
  }),
  getSystemInfoSync: jest.fn().mockReturnValue({
    brand: 'iPhone',
    model: 'iPhone X',
    pixelRatio: 3,
    screenWidth: 375,
    screenHeight: 812,
    windowWidth: 375,
    windowHeight: 729,
    statusBarHeight: 44,
    language: 'zh_CN',
    version: '7.0.4',
    system: 'iOS 12.0',
    platform: 'ios',
    SDKVersion: '2.10.3'
  }),
  
  // 界面API
  showToast: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  showModal: jest.fn().mockImplementation(options => {
    if (options && options.success) {
      options.success({ confirm: true });
    }
  }),
  showActionSheet: jest.fn(),
  setNavigationBarTitle: jest.fn(),
  setNavigationBarColor: jest.fn(),
  
  // 生命周期API
  onError: jest.fn(),
  onPageNotFound: jest.fn(),
  onMemoryWarning: jest.fn(),
  
  // 路由API
  navigateTo: jest.fn(),
  redirectTo: jest.fn(),
  navigateBack: jest.fn(),
  switchTab: jest.fn(),
  reLaunch: jest.fn(),
  
  // 其他API
  nextTick: jest.fn(callback => {
    setTimeout(callback, 0);
  }),
  reportAnalytics: jest.fn(),
  getClipboardData: jest.fn(),
  setClipboardData: jest.fn(),
  authorize: jest.fn(),
  getSetting: jest.fn().mockImplementation(options => {
    if (options && options.success) {
      options.success({ authSetting: {} });
    }
  }),
  openSetting: jest.fn(),
  getUpdateManager: jest.fn().mockReturnValue({
    onCheckForUpdate: jest.fn(),
    onUpdateReady: jest.fn(),
    onUpdateFailed: jest.fn(),
    applyUpdate: jest.fn()
  })
};

// 模拟Page和App全局函数
global.Page = jest.fn();
global.App = jest.fn();
global.Component = jest.fn();
global.getApp = jest.fn().mockReturnValue({
  globalData: {
    userInfo: null,
    networkType: 'wifi',
    isConnected: true
  },
  getService: jest.fn()
});
global.getCurrentPages = jest.fn().mockReturnValue([]);

// 模拟console方法
const originalConsole = { ...console };
global.console = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  _originalLog: originalConsole.log,
  _originalInfo: originalConsole.info,
  _originalWarn: originalConsole.warn,
  _originalError: originalConsole.error,
  _originalDebug: originalConsole.debug
};

// 添加测试辅助函数
global.sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// 设置测试环境变量
process.env.NODE_ENV = 'test';

// 在所有测试开始前执行
beforeAll(() => {
  // 设置随机种子，使得随机值在测试中保持一致
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
  
  // 模拟当前时间
  const mockDate = new Date('2023-01-01T12:00:00Z');
  jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
  
  console._originalLog('🚀 Jest测试环境已设置');
});

// 在每个测试开始前执行
beforeEach(() => {
  // 清除所有模拟的调用记录
  jest.clearAllMocks();
});

// 在所有测试结束后执行
afterAll(() => {
  // 恢复所有模拟
  jest.restoreAllMocks();
  
  console._originalLog('�� Jest测试已完成');
}); 