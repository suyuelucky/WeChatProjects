/**
 * 相机管理器组件单元测试
 * 测试camera-manager组件的功能和生命周期管理
 */

const EventBus = require('../../../utils/eventBus');

// 模拟原生组件
jest.mock('../../../utils/component-bridge', () => ({
  createBridgedComponent: jest.fn(options => options)
}));

// 存储原始的Component函数
const originalComponent = global.Component;

describe('CameraManager组件', () => {
  // 组件实例
  let component;
  // 组件配置
  let componentOptions;
  
  beforeEach(() => {
    // 重置模拟
    jest.clearAllMocks();
    
    // 监听EventBus
    jest.spyOn(EventBus, 'on');
    jest.spyOn(EventBus, 'off');
    jest.spyOn(EventBus, 'emit');
    
    // 模拟微信API
    global.wx = {
      createCameraContext: jest.fn().mockReturnValue({
        takePhoto: jest.fn().mockImplementation(options => {
          setTimeout(() => {
            options.success && options.success({
              tempImagePath: '/tmp/camera_photo_123.jpg'
            });
          }, 10);
        }),
        startRecord: jest.fn(),
        stopRecord: jest.fn(),
        onCameraFrame: jest.fn().mockReturnValue({
          start: jest.fn(),
          stop: jest.fn()
        })
      }),
      showToast: jest.fn(),
      showLoading: jest.fn(),
      hideLoading: jest.fn(),
      getSystemInfoSync: jest.fn().mockReturnValue({
        brand: 'iPhone',
        platform: 'ios',
        system: 'iOS 14.0'
      }),
      setStorage: jest.fn(),
      setStorageSync: jest.fn(),
      getSetting: jest.fn().mockImplementation(options => {
        options.success && options.success({
          authSetting: {
            'scope.camera': true
          }
        });
      }),
      authorize: jest.fn().mockImplementation(options => {
        options.success && options.success({});
      })
    };
    
    // 模拟Component函数以捕获组件配置
    global.Component = jest.fn(options => {
      componentOptions = options;
      
      // 创建模拟的组件实例
      component = createMockComponent(options);
      
      return component;
    });
    
    // 加载组件
    require('../index');
  });
  
  afterEach(() => {
    // 恢复原始的Component函数
    global.Component = originalComponent;
    jest.resetModules();
  });
  
  describe('组件生命周期', () => {
    test('attached应该正确初始化相机组件', () => {
      // 调用attached钩子
      component._attached();
      
      // 验证初始化逻辑
      expect(component.data.ready).toBe(false);
      expect(component.data.hasPermission).toBe(false);
      expect(component._eventListeners).toEqual([]);
      
      // 应该检查相机权限
      expect(wx.getSetting).toHaveBeenCalled();
    });
    
    test('detached应该正确清理资源', () => {
      // 设置一些需要清理的资源
      component._eventListeners = [
        { event: 'test:event', callback: jest.fn() }
      ];
      component.cameraContext = {};
      
      // 模拟计时器
      component._countdownTimer = 123;
      
      // 调用detached钩子
      component._detached();
      
      // 验证资源清理
      expect(EventBus.off).toHaveBeenCalled();
      expect(component._eventListeners).toEqual([]);
      expect(component.cameraContext).toBeNull();
    });
  });
  
  describe('相机权限管理', () => {
    test('checkCameraPermission应该正确处理已授权情况', () => {
      // 调用权限检查
      component.checkCameraPermission();
      
      // 已授权情况下应该设置权限状态并初始化相机
      expect(component.data.hasPermission).toBe(true);
      expect(wx.setStorageSync).toHaveBeenCalledWith('camera_permission_status', 'granted');
      
      // 应该初始化相机
      expect(component.initCamera).toHaveBeenCalled();
    });
    
    test('checkCameraPermission应该处理拒绝授权情况', () => {
      // 模拟权限被拒绝
      wx.getSetting = jest.fn().mockImplementation(options => {
        options.success && options.success({
          authSetting: {
            'scope.camera': false
          }
        });
      });
      
      // 调用权限检查
      component.checkCameraPermission();
      
      // 权限被拒绝情况下应该设置权限状态
      expect(component.data.hasPermission).toBe(false);
      expect(wx.setStorageSync).toHaveBeenCalledWith('camera_permission_status', 'permanently_denied');
      
      // 应该显示权限引导
      expect(component.showPermissionGuide).toHaveBeenCalledWith(true);
    });
  });
  
  describe('相机操作', () => {
    beforeEach(() => {
      // 模拟相机已初始化
      component._attached();
      component.data.hasPermission = true;
      component.initCamera();
    });
    
    test('takePhoto应该正确拍摄照片并触发事件', async () => {
      // 调用拍照
      const photoPromise = component.takePhoto();
      
      // 等待异步操作完成
      const photo = await photoPromise;
      
      // 验证拍照功能
      expect(component.cameraContext.takePhoto).toHaveBeenCalled();
      expect(photo).toEqual({
        path: '/tmp/camera_photo_123.jpg',
        timestamp: expect.any(Number)
      });
      
      // 应该触发照片拍摄事件
      expect(EventBus.emit).toHaveBeenCalledWith('camera:photo:taken', expect.objectContaining({
        photo: expect.objectContaining({
          path: '/tmp/camera_photo_123.jpg'
        })
      }));
    });
    
    test('startContinuousCapture应该开始连续拍摄', () => {
      jest.useFakeTimers();
      
      // 调用连续拍摄
      component.startContinuousCapture({
        interval: 500,
        count: 3
      });
      
      // 验证初始状态
      expect(component.data.isContinuousCapturing).toBe(true);
      expect(component.data.captureRemaining).toBe(3);
      
      // 第一次拍照应该立即执行
      expect(component.cameraContext.takePhoto).toHaveBeenCalledTimes(1);
      
      // 前进500毫秒
      jest.advanceTimersByTime(500);
      
      // 应该触发第二次拍照
      expect(component.cameraContext.takePhoto).toHaveBeenCalledTimes(2);
      expect(component.data.captureRemaining).toBe(2);
      
      // 前进500毫秒
      jest.advanceTimersByTime(500);
      
      // 应该触发第三次拍照
      expect(component.cameraContext.takePhoto).toHaveBeenCalledTimes(3);
      expect(component.data.captureRemaining).toBe(1);
      
      // 前进500毫秒
      jest.advanceTimersByTime(500);
      
      // 拍摄完成，应该停止
      expect(component.data.isContinuousCapturing).toBe(false);
      
      jest.useRealTimers();
    });
    
    test('stopContinuousCapture应该停止连续拍摄', () => {
      // 设置连续拍摄状态
      component.data.isContinuousCapturing = true;
      component._captureTimer = 123;
      
      // 调用停止拍摄
      component.stopContinuousCapture();
      
      // 验证状态
      expect(component.data.isContinuousCapturing).toBe(false);
      expect(component._captureTimer).toBeNull();
    });
  });
  
  describe('相机错误处理', () => {
    test('handleCameraError应该正确处理相机错误', () => {
      // 调用错误处理
      component.handleCameraError({
        detail: {
          errCode: 10001,
          errMsg: '相机硬件错误'
        }
      });
      
      // 应该根据错误类型调用适当的处理方法
      expect(component._handleHardwareError).toHaveBeenCalledWith('相机硬件错误');
      
      // 应该触发错误事件
      expect(EventBus.emit).toHaveBeenCalledWith('camera:error', expect.any(Object));
    });
  });
});

/**
 * 创建模拟的组件实例
 * @param {Object} options 组件配置
 * @return {Object} 模拟的组件实例
 */
function createMockComponent(options) {
  const component = {
    data: { ...options.data },
    properties: { ...options.properties },
    _eventListeners: []
  };
  
  // 添加生命周期方法
  component._attached = function() {
    if (options.lifetimes && options.lifetimes.attached) {
      options.lifetimes.attached.call(this);
    } else if (options.attached) {
      options.attached.call(this);
    }
  };
  
  component._detached = function() {
    if (options.lifetimes && options.lifetimes.detached) {
      options.lifetimes.detached.call(this);
    } else if (options.detached) {
      options.detached.call(this);
    }
  };
  
  // 添加setData方法
  component.setData = function(data, callback) {
    Object.assign(this.data, data);
    callback && callback();
  };
  
  // 添加triggerEvent方法
  component.triggerEvent = jest.fn();
  
  // 添加所有方法
  Object.keys(options.methods || {}).forEach(key => {
    component[key] = options.methods[key];
  });
  
  // 模拟observers
  if (options.observers) {
    component._observers = options.observers;
  }
  
  // 初始化时添加一些通用的模拟
  component.initCamera = jest.fn();
  component.showPermissionGuide = jest.fn();
  component._addEventListenerWithCleanup = function(event, callback) {
    EventBus.on(event, callback);
    this._eventListeners.push({ event, callback });
  };
  component._handleHardwareError = jest.fn();
  component._handleCameraOccupiedError = jest.fn();
  component._handleInitializationError = jest.fn();
  component._handleGeneralError = jest.fn();
  
  // 返回模拟的组件实例
  return component;
} 