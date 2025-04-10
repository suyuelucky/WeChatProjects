// 错误收集器单元测试
// 创建模拟wx对象
const mockWx = {
  getStorageSync: jest.fn(),
  setStorageSync: jest.fn(),
  removeStorageSync: jest.fn(),
  getSystemInfoSync: jest.fn(),
  onError: jest.fn(),
  onMemoryWarning: jest.fn(),
  onNetworkStatusChange: jest.fn(),
  request: jest.fn()
};

// 在导入错误收集器前，将mockWx设置为全局wx对象
global.wx = mockWx;

// 模拟error-collector.js中的模块缓存
jest.mock('../utils/error-collector', () => {
  mockWx.getStorageSync.mockReturnValue('[]');
  
  const originalModule = jest.requireActual('../utils/error-collector');
  
  // 初始化期间拦截init函数的调用
  const init = () => originalModule;
  
  return {
    ...originalModule,
    init,
    // 直接测试这些函数
    reportError: originalModule.reportError,
    reportWarning: originalModule.reportWarning,
    reportFeatureUnavailable: originalModule.reportFeatureUnavailable,
    getLogs: originalModule.getLogs,
    clearLogs: originalModule.clearLogs,
    wrapWithErrorHandler: originalModule.wrapWithErrorHandler,
    uploadLogs: originalModule.uploadLogs
  };
});

// 导入错误收集器
const ErrorCollector = require('../utils/error-collector');

describe('ErrorCollector', () => {
  // 每个测试前重置模拟
  beforeEach(() => {
    jest.clearAllMocks();
    mockWx.getStorageSync.mockReturnValue('[]');
  });

  test('reportError 应正确记录错误', () => {
    // 模拟系统信息
    mockWx.getSystemInfoSync.mockReturnValue({
      brand: 'test-brand',
      model: 'test-model',
      system: 'test-system',
      platform: 'test-platform',
      SDKVersion: '1.0.0'
    });
    
    // 调用被测函数
    const error = new Error('测试错误');
    const result = ErrorCollector.reportError('test-category', error);
    
    // 验证结果
    expect(result).toBeTruthy();
    expect(mockWx.setStorageSync).toHaveBeenCalled();
    
    // 验证传递给setStorageSync的参数
    const callArgs = mockWx.setStorageSync.mock.calls[0];
    expect(callArgs[0]).toBe('error_collector_logs');
    
    // 解析存储的日志数据
    const storedLogs = JSON.parse(callArgs[1]);
    expect(storedLogs.length).toBe(1);
    expect(storedLogs[0].type).toBe('error');
    expect(storedLogs[0].category).toBe('test-category');
    expect(storedLogs[0].message).toBe('测试错误');
  });

  test('reportWarning 应正确记录警告', () => {
    // 调用被测函数
    const result = ErrorCollector.reportWarning('test-warning', '测试警告', { extra: 'data' });
    
    // 验证结果
    expect(result).toBeTruthy();
    expect(mockWx.setStorageSync).toHaveBeenCalled();
    
    // 验证传递给setStorageSync的参数
    const callArgs = mockWx.setStorageSync.mock.calls[0];
    
    // 解析存储的日志数据
    const storedLogs = JSON.parse(callArgs[1]);
    expect(storedLogs.length).toBe(1);
    expect(storedLogs[0].type).toBe('warning');
    expect(storedLogs[0].category).toBe('test-warning');
    expect(storedLogs[0].message).toBe('测试警告');
    expect(storedLogs[0].extra).toEqual({ extra: 'data' });
  });

  test('reportFeatureUnavailable 应正确记录功能不可用', () => {
    // 调用被测函数
    const result = ErrorCollector.reportFeatureUnavailable('test-feature', '测试功能不可用', { reason: 'test' });
    
    // 验证结果
    expect(result).toBeTruthy();
    expect(mockWx.setStorageSync).toHaveBeenCalled();
    
    // 验证传递给setStorageSync的参数
    const callArgs = mockWx.setStorageSync.mock.calls[0];
    
    // 解析存储的日志数据
    const storedLogs = JSON.parse(callArgs[1]);
    expect(storedLogs.length).toBe(1);
    expect(storedLogs[0].type).toBe('feature_unavailable');
    expect(storedLogs[0].feature).toBe('test-feature');
    expect(storedLogs[0].reason).toBe('测试功能不可用');
    expect(storedLogs[0].details).toEqual({ reason: 'test' });
  });

  test('getLogs 应返回存储的日志', () => {
    // 模拟存储中有数据
    const mockLogs = [
      { type: 'error', message: '错误1' },
      { type: 'warning', message: '警告1' }
    ];
    mockWx.getStorageSync.mockReturnValue(JSON.stringify(mockLogs));
    
    // 调用被测函数
    const logs = ErrorCollector.getLogs();
    
    // 验证结果
    expect(logs).toEqual(mockLogs);
    expect(mockWx.getStorageSync).toHaveBeenCalledWith('error_collector_logs');
  });

  test('clearLogs 应清除所有日志', () => {
    // 调用被测函数
    const result = ErrorCollector.clearLogs();
    
    // 验证结果
    expect(result).toBe(true);
    expect(mockWx.setStorageSync).toHaveBeenCalledWith('error_collector_logs', '[]');
  });

  test('wrapWithErrorHandler 应正确包装函数并捕获错误', () => {
    // 创建一个会抛出错误的函数
    const errorFn = () => {
      throw new Error('包装函数错误');
    };
    
    // 包装这个函数
    const wrappedFn = ErrorCollector.wrapWithErrorHandler(errorFn, 'test-wrap');
    
    // 调用包装函数
    expect(() => wrappedFn()).toThrow('包装函数错误');
    
    // 验证错误被记录
    expect(mockWx.setStorageSync).toHaveBeenCalled();
    const callArgs = mockWx.setStorageSync.mock.calls[0];
    const storedLogs = JSON.parse(callArgs[1]);
    expect(storedLogs[0].category).toBe('test-wrap');
    expect(storedLogs[0].message).toBe('包装函数错误');
  });

  test('wrapWithErrorHandler 应处理异步函数和Promise', async () => {
    // 创建一个会返回失败Promise的函数
    const failingPromiseFn = () => {
      return Promise.reject(new Error('异步错误'));
    };
    
    // 包装这个函数
    const wrappedFn = ErrorCollector.wrapWithErrorHandler(failingPromiseFn, 'test-async');
    
    // 调用包装函数并捕获异常
    await expect(wrappedFn()).rejects.toThrow('异步错误');
    
    // 验证错误被记录
    expect(mockWx.setStorageSync).toHaveBeenCalled();
    const callArgs = mockWx.setStorageSync.mock.calls[0];
    const storedLogs = JSON.parse(callArgs[1]);
    expect(storedLogs[0].category).toBe('test-async');
    expect(storedLogs[0].message).toBe('异步错误');
  });

  test('uploadLogs 应正确上传日志', () => {
    // 模拟存储中有数据
    const mockLogs = [
      { type: 'error', message: '错误1' },
      { type: 'warning', message: '警告1' }
    ];
    mockWx.getStorageSync.mockReturnValue(JSON.stringify(mockLogs));
    
    // 模拟请求成功
    mockWx.request.mockImplementation(options => {
      options.success({ data: { success: true } });
    });
    
    // 调用被测函数
    return ErrorCollector.uploadLogs('https://test-url.com').then(result => {
      // 验证结果
      expect(result).toEqual({ success: true });
      expect(mockWx.request).toHaveBeenCalled();
      
      // 验证传递给request的参数
      const requestOptions = mockWx.request.mock.calls[0][0];
      expect(requestOptions.url).toBe('https://test-url.com');
      expect(requestOptions.method).toBe('POST');
      expect(requestOptions.data.logs).toEqual(mockLogs);
    });
  });

  test('处理存储访问错误', () => {
    // 模拟存储访问失败
    mockWx.getStorageSync.mockImplementation(() => {
      throw new Error('存储访问失败');
    });
    
    // 调用被测函数
    const logs = ErrorCollector.getLogs();
    
    // 验证结果
    expect(logs).toEqual([]);
    expect(mockWx.getStorageSync).toHaveBeenCalled();
  });
}); 