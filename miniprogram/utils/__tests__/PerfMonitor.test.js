const PerfMonitor = require('../PerfMonitor');
const wx = require('../testing/wx-mock');

// 全局注入wx对象，模拟小程序环境
global.wx = wx;

// 模拟延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('PerfMonitor 基础功能测试', () => {
  beforeEach(() => {
    // 每个测试前重置PerfMonitor状态
    PerfMonitor.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('mark方法应正确记录时间点', () => {
    const timestamp = PerfMonitor.mark('test.start');
    
    expect(timestamp).toBeGreaterThan(0);
    expect(PerfMonitor.marks['test.start']).toBe(timestamp);
  });

  test('mark方法对于无效名称应返回false', () => {
    expect(PerfMonitor.mark()).toBe(false);
    expect(PerfMonitor.mark('')).toBe(false);
  });

  test('measure方法应正确计算时间差', () => {
    // 模拟时间点
    PerfMonitor.marks = {
      'test.start': 1000,
      'test.end': 1500
    };
    
    const duration = PerfMonitor.measure('test.duration', 'test.start', 'test.end');
    
    expect(duration).toBe(500);
    expect(PerfMonitor.measures['test.duration']).toBe(500);
    expect(PerfMonitor.performanceData.timings['test.duration']).toBe(500);
  });

  test('measure方法对于不存在的标记应返回-1', () => {
    expect(PerfMonitor.measure('test', 'not.exist1', 'not.exist2')).toBe(-1);
    
    // 只有开始标记存在
    PerfMonitor.mark('start');
    expect(PerfMonitor.measure('test', 'start', 'end')).toBe(-1);
  });

  test('startAction应返回一个能记录耗时的函数', () => {
    const stopTimer = PerfMonitor.startAction('testAction');
    
    jest.advanceTimersByTime(100);
    const duration = stopTimer();
    
    expect(duration).toBeGreaterThanOrEqual(100);
    expect(PerfMonitor.actionTimes['testAction']).toBe(duration);
    expect(PerfMonitor.performanceData.actions['testAction']).toBe(duration);
  });

  test('timeAction应执行操作并记录耗时', () => {
    const mockFn = jest.fn();
    
    const duration = PerfMonitor.timeAction('testOperation', () => {
      jest.advanceTimersByTime(200);
      mockFn();
    });
    
    expect(mockFn).toHaveBeenCalled();
    expect(duration).toBeGreaterThanOrEqual(200);
    expect(PerfMonitor.actionTimes['testOperation']).toBe(duration);
    expect(PerfMonitor.performanceData.actions['testOperation']).toBe(duration);
  });
});

describe('PerfMonitor 页面生命周期监控', () => {
  beforeEach(() => {
    PerfMonitor.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('monitorPageLifecycle应正确记录页面生命周期', () => {
    // 模拟页面实例
    const mockPage = {
      route: 'pages/index/index',
      onLoad: jest.fn(),
      onReady: jest.fn(),
      onShow: jest.fn(),
      onHide: jest.fn(),
      onUnload: jest.fn()
    };
    
    // 应用监控
    const monitoredPage = PerfMonitor.monitorPageLifecycle(mockPage);
    
    // 触发生命周期函数
    monitoredPage.onLoad({});
    jest.advanceTimersByTime(50);
    monitoredPage.onReady();
    jest.advanceTimersByTime(30);
    monitoredPage.onShow();
    jest.advanceTimersByTime(20);
    monitoredPage.onHide();
    jest.advanceTimersByTime(10);
    monitoredPage.onUnload();
    
    // 验证原始方法被调用
    expect(mockPage.onLoad).toHaveBeenCalled();
    expect(mockPage.onReady).toHaveBeenCalled();
    expect(mockPage.onShow).toHaveBeenCalled();
    expect(mockPage.onHide).toHaveBeenCalled();
    expect(mockPage.onUnload).toHaveBeenCalled();
    
    // 验证性能数据被记录
    const pagePath = 'pages/index/index';
    expect(PerfMonitor.measures[pagePath + '.onLoad']).toBeGreaterThanOrEqual(0);
    expect(PerfMonitor.measures[pagePath + '.onReady']).toBeGreaterThanOrEqual(0);
    expect(PerfMonitor.measures[pagePath + '.onShow']).toBeGreaterThanOrEqual(0);
    expect(PerfMonitor.measures[pagePath + '.onHide']).toBeGreaterThanOrEqual(0);
    expect(PerfMonitor.measures[pagePath + '.onUnload']).toBeGreaterThanOrEqual(0);
    expect(PerfMonitor.measures[pagePath + '.totalReady']).toBeGreaterThanOrEqual(50);
  });

  test('monitorPageLifecycle对于无效页面实例应返回undefined', () => {
    console.error = jest.fn(); // 静默错误日志
    expect(PerfMonitor.monitorPageLifecycle()).toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});

describe('PerfMonitor 网络请求监控', () => {
  beforeEach(() => {
    PerfMonitor.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('monitorRequest应正确监控成功的请求', () => {
    // 模拟请求参数
    const mockRequestOptions = {
      url: 'https://api.example.com/data',
      method: 'GET',
      success: jest.fn(),
      fail: jest.fn(),
      complete: jest.fn()
    };
    
    // 监控请求
    const monitoredOptions = PerfMonitor.monitorRequest(mockRequestOptions);
    
    // 模拟请求成功
    const mockResponse = { data: 'test data' };
    jest.advanceTimersByTime(100);
    monitoredOptions.success(mockResponse);
    
    // 验证原始回调被调用
    expect(mockRequestOptions.success).toHaveBeenCalledWith(mockResponse);
    expect(mockRequestOptions.complete).not.toHaveBeenCalled(); // complete在原始实现中需分开调用
    
    // 验证性能数据被记录
    expect(PerfMonitor.performanceData.requests.length).toBe(1);
    expect(PerfMonitor.performanceData.requests[0].url).toBe('https://api.example.com/data');
    expect(PerfMonitor.performanceData.requests[0].method).toBe('GET');
    expect(PerfMonitor.performanceData.requests[0].status).toBe('success');
    expect(PerfMonitor.performanceData.requests[0].time).toBeGreaterThanOrEqual(100);
  });

  test('monitorRequest应正确监控失败的请求', () => {
    // 模拟请求参数
    const mockRequestOptions = {
      url: 'https://api.example.com/error',
      method: 'POST',
      success: jest.fn(),
      fail: jest.fn(),
      complete: jest.fn()
    };
    
    // 监控请求
    const monitoredOptions = PerfMonitor.monitorRequest(mockRequestOptions);
    
    // 模拟请求失败
    const mockError = { errMsg: 'request:fail' };
    jest.advanceTimersByTime(50);
    monitoredOptions.fail(mockError);
    
    // 验证原始回调被调用
    expect(mockRequestOptions.fail).toHaveBeenCalledWith(mockError);
    expect(mockRequestOptions.success).not.toHaveBeenCalled();
    
    // 验证性能数据被记录
    expect(PerfMonitor.performanceData.requests.length).toBe(1);
    expect(PerfMonitor.performanceData.requests[0].url).toBe('https://api.example.com/error');
    expect(PerfMonitor.performanceData.requests[0].method).toBe('POST');
    expect(PerfMonitor.performanceData.requests[0].status).toBe('fail');
    expect(PerfMonitor.performanceData.requests[0].time).toBeGreaterThanOrEqual(50);
    expect(PerfMonitor.performanceData.requests[0].error).toEqual(mockError);
  });

  test('monitorRequest对于空参数应不变地返回', () => {
    expect(PerfMonitor.monitorRequest()).toBeUndefined();
    expect(PerfMonitor.monitorRequest(null)).toBeNull();
  });
});

describe('PerfMonitor 报告生成与数据收集', () => {
  beforeEach(() => {
    PerfMonitor.clear();
  });

  test('generateReport应生成格式化的性能报告', () => {
    // 准备测试数据
    PerfMonitor.measures = {
      'test.load': 100,
      'test.render': 50
    };
    
    PerfMonitor.actionTimes = {
      'action1': 200,
      'action2': 150
    };
    
    PerfMonitor.performanceData = {
      setData: [
        { name: 'update1', time: 30, size: 1024, timestamp: Date.now() }
      ],
      requests: [
        { 
          url: 'https://api.example.com/data', 
          method: 'GET', 
          time: 80, 
          status: 'success',
          timestamp: Date.now()
        }
      ]
    };
    
    // 生成报告
    const report = PerfMonitor.generateReport();
    
    // 验证报告内容
    expect(report).toContain('性能监控报告');
    expect(report).toContain('test.load: 100ms');
    expect(report).toContain('test.render: 50ms');
    expect(report).toContain('action1: 200ms');
    expect(report).toContain('action2: 150ms');
    expect(report).toContain('update1: 30ms');
    expect(report).toContain('https://api.example.com/data (GET): 80ms');
  });

  test('getAllMetrics应返回所有性能数据', () => {
    // 准备测试数据
    PerfMonitor.measures = { 'test': 100 };
    PerfMonitor.marks = { 'mark': Date.now() };
    PerfMonitor.actionTimes = { 'action': 200 };
    PerfMonitor.performanceData = { timings: { 'test': 100 } };
    PerfMonitor.memoryData = [{ timestamp: Date.now() }];
    
    // 获取数据
    const metrics = PerfMonitor.getAllMetrics();
    
    // 验证数据完整性
    expect(metrics.measures).toEqual(PerfMonitor.measures);
    expect(metrics.marks).toEqual(PerfMonitor.marks);
    expect(metrics.actionTimes).toEqual(PerfMonitor.actionTimes);
    expect(metrics.performanceData).toEqual(PerfMonitor.performanceData);
    expect(metrics.memoryData).toEqual(PerfMonitor.memoryData);
  });

  test('uploadMetrics应正确发送数据到服务器', () => {
    // 模拟wx对象
    const mockWx = {
      request: jest.fn(),
      getSystemInfoSync: jest.fn().mockReturnValue({ model: 'iPhone X' })
    };
    
    // 临时替换全局wx对象
    const originalWx = global.wx;
    global.wx = mockWx;
    
    // 准备测试数据
    PerfMonitor.performanceData = { timings: { 'test': 100 } };
    
    // 调用上报方法
    PerfMonitor.uploadMetrics('https://performance.example.com/report');
    
    // 验证请求是否正确发送
    expect(mockWx.request).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://performance.example.com/report',
      method: 'POST',
      data: expect.objectContaining({
        performanceData: PerfMonitor.performanceData,
        deviceInfo: { model: 'iPhone X' }
      })
    }));
    
    // 恢复全局wx对象
    global.wx = originalWx;
  });

  test('uploadMetrics对于无效URL应不发送请求', () => {
    // 模拟console.error
    console.error = jest.fn();
    
    // 模拟wx对象
    const mockWx = {
      request: jest.fn()
    };
    
    // 临时替换全局wx对象
    const originalWx = global.wx;
    global.wx = mockWx;
    
    // 调用上报方法但不提供URL
    PerfMonitor.uploadMetrics();
    
    // 验证结果
    expect(console.error).toHaveBeenCalled();
    expect(mockWx.request).not.toHaveBeenCalled();
    
    // 恢复全局wx对象
    global.wx = originalWx;
  });
});

describe('PerfMonitor 内存监控', () => {
  beforeEach(() => {
    PerfMonitor.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('recordMemoryUsage应正确记录内存数据', () => {
    // 模拟wx性能API
    const mockPerformance = {
      getMemoryStats: jest.fn().mockReturnValue({
        jsHeapSizeLimit: 100 * 1024 * 1024,
        totalJSHeapSize: 50 * 1024 * 1024,
        usedJSHeapSize: 30 * 1024 * 1024
      })
    };
    
    const mockWx = {
      getPerformance: jest.fn().mockReturnValue(mockPerformance)
    };
    
    // 临时替换全局wx对象
    const originalWx = global.wx;
    global.wx = mockWx;
    
    // 记录内存数据
    PerfMonitor.recordMemoryUsage();
    
    // 验证内存数据被记录
    expect(PerfMonitor.memoryData.length).toBe(1);
    expect(PerfMonitor.memoryData[0].jsHeapSizeLimit).toBe(100 * 1024 * 1024);
    expect(PerfMonitor.memoryData[0].totalJSHeapSize).toBe(50 * 1024 * 1024);
    expect(PerfMonitor.memoryData[0].usedJSHeapSize).toBe(30 * 1024 * 1024);
    
    // 恢复全局wx对象
    global.wx = originalWx;
  });

  test('recordMemoryUsage应在API不支持时优雅处理', () => {
    // 模拟console.warn
    console.warn = jest.fn();
    
    // 模拟不支持性能API的wx对象
    const mockWx = {
      getPerformance: undefined
    };
    
    // 临时替换全局wx对象
    const originalWx = global.wx;
    global.wx = mockWx;
    
    // 记录内存数据
    PerfMonitor.recordMemoryUsage();
    
    // 验证内存数据未被记录，但也未抛出错误
    expect(PerfMonitor.memoryData.length).toBe(0);
    expect(console.warn).toHaveBeenCalled();
    
    // 恢复全局wx对象
    global.wx = originalWx;
  });

  test('startMemoryMonitor应启动定时记录', () => {
    // 模拟recordMemoryUsage方法
    PerfMonitor.recordMemoryUsage = jest.fn();
    
    // 启动监控，指定间隔时间
    const monitor = PerfMonitor.startMemoryMonitor(1000);
    
    // 立即调用一次
    expect(PerfMonitor.recordMemoryUsage).toHaveBeenCalledTimes(1);
    PerfMonitor.recordMemoryUsage.mockClear();
    
    // 推进定时器1000ms
    jest.advanceTimersByTime(1000);
    expect(PerfMonitor.recordMemoryUsage).toHaveBeenCalledTimes(1);
    
    // 再推进定时器1000ms
    jest.advanceTimersByTime(1000);
    expect(PerfMonitor.recordMemoryUsage).toHaveBeenCalledTimes(2);
    
    // 停止监控
    monitor.stop();
    PerfMonitor.recordMemoryUsage.mockClear();
    
    // 再推进定时器，确认已停止
    jest.advanceTimersByTime(2000);
    expect(PerfMonitor.recordMemoryUsage).not.toHaveBeenCalled();
  });
});

describe('PerfMonitor 启动与停止', () => {
  beforeEach(() => {
    PerfMonitor.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('start应正确初始化并启动监控', () => {
    // 模拟方法
    PerfMonitor.startMemoryMonitor = jest.fn().mockReturnValue({ stop: jest.fn() });
    PerfMonitor.uploadMetrics = jest.fn();
    
    // 保存原始wx.request
    const originalRequest = wx.request;
    
    // 启动性能监控
    PerfMonitor.start({
      reportInterval: 5000,
      reportUrl: 'https://report.example.com',
      enableMemoryMonitor: true,
      enableNetworkMonitor: true
    });
    
    // 验证初始化
    expect(PerfMonitor.marks['perfMonitor.start']).toBeDefined();
    expect(PerfMonitor.startMemoryMonitor).toHaveBeenCalled();
    
    // 验证自动上报定时器
    jest.advanceTimersByTime(5000);
    expect(PerfMonitor.uploadMetrics).toHaveBeenCalledWith('https://report.example.com');
    
    // 验证网络监控是否被启用
    expect(wx.request).not.toBe(originalRequest);
    
    // 停止监控
    PerfMonitor.stop();
  });

  test('stop应正确停止所有监控', () => {
    // 模拟memoryMonitor
    const mockStop = jest.fn();
    PerfMonitor.memoryMonitor = { stop: mockStop };
    
    // 模拟reportTimer
    PerfMonitor.reportTimer = 123;
    
    // 停止监控
    PerfMonitor.stop();
    
    // 验证停止
    expect(mockStop).toHaveBeenCalled();
    expect(PerfMonitor.memoryMonitor).toBeNull();
    expect(PerfMonitor.reportTimer).toBeNull();
    expect(PerfMonitor.marks['perfMonitor.stop']).toBeDefined();
    expect(PerfMonitor.measures['perfMonitor.duration']).toBeDefined();
  });

  test('clear应重置所有数据', () => {
    // 准备测试数据
    PerfMonitor.marks = { 'test': Date.now() };
    PerfMonitor.measures = { 'test': 100 };
    PerfMonitor.actionTimes = { 'test': 200 };
    PerfMonitor.performanceData = { timings: { 'test': 100 } };
    PerfMonitor.memoryData = [{ timestamp: Date.now() }];
    
    // 清空数据
    PerfMonitor.clear();
    
    // 验证数据已清空
    expect(Object.keys(PerfMonitor.marks).length).toBe(0);
    expect(Object.keys(PerfMonitor.measures).length).toBe(0);
    expect(Object.keys(PerfMonitor.actionTimes).length).toBe(0);
    expect(Object.keys(PerfMonitor.performanceData).length).toBe(0);
    expect(PerfMonitor.memoryData.length).toBe(0);
  });
}); 