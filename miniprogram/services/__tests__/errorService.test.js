const ErrorService = require('../errorService');
const EventBus = require('../../utils/eventBus');

// 模拟微信API
global.wx = {
  getSystemInfo: jest.fn().mockImplementation(options => {
    options.success({
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
      SDKVersion: '2.10.3',
    });
  }),
  onError: jest.fn(),
  onPageNotFound: jest.fn(),
  onMemoryWarning: jest.fn(),
  request: jest.fn().mockImplementation(options => {
    if (options.success) {
      options.success({ statusCode: 200, data: { success: true } });
    }
  })
};

// 模拟console方法
global.console = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  _originalLog: console.log,
  _originalInfo: console.info,
  _originalWarn: console.warn,
  _originalError: console.error,
  _originalDebug: console.debug
};

describe('ErrorService', () => {
  let errorService;
  let container;
  let mockDate;

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 模拟日期
    mockDate = new Date('2023-01-01T12:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    
    // 模拟容器
    container = {
      get: jest.fn().mockImplementation(service => {
        if (service === 'storageService') {
          return {
            saveItem: jest.fn().mockResolvedValue(true),
            getItem: jest.fn().mockImplementation((collection, id) => {
              if (collection === 'errorLogs') {
                return Promise.resolve([]);
              } else if (collection === 'appLogs') {
                return Promise.resolve([]);
              } else if (collection === 'errorConfig') {
                return Promise.resolve(null);
              }
              return Promise.resolve(null);
            }),
            getCollection: jest.fn().mockResolvedValue([]),
            clearCollection: jest.fn().mockResolvedValue(true)
          };
        }
        return null;
      })
    };
    
    // 监听事件总线
    jest.spyOn(EventBus, 'on');
    jest.spyOn(EventBus, 'emit');
    
    // 初始化服务
    errorService = ErrorService.init(container);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('init', () => {
    it('should initialize with default config', () => {
      expect(errorService).toBeDefined();
      expect(errorService.config).toEqual({
        maxLogCount: 200,
        maxErrorCount: 50,
        logLevel: 'info',
        reportErrors: true,
        reportUrl: '',
        collectConsole: true
      });
      expect(wx.onError).toHaveBeenCalled();
      expect(wx.onPageNotFound).toHaveBeenCalled();
      expect(wx.onMemoryWarning).toHaveBeenCalled();
    });

    it('should initialize with custom config', () => {
      const customConfig = {
        maxLogCount: 100,
        maxErrorCount: 30,
        logLevel: 'warn',
        reportErrors: false
      };
      
      const customService = ErrorService.init(container, customConfig);
      
      expect(customService.config).toEqual({
        maxLogCount: 100,
        maxErrorCount: 30,
        logLevel: 'warn',
        reportErrors: false,
        reportUrl: '',
        collectConsole: true
      });
    });
  });

  describe('logging methods', () => {
    it('should log debug messages', () => {
      errorService.debug('Test debug message', { data: 'test' });
      
      expect(EventBus.emit).toHaveBeenCalledWith('log:added', {
        level: 'debug',
        message: 'Test debug message',
        data: { data: 'test' },
        timestamp: mockDate.getTime()
      });
    });

    it('should log info messages', () => {
      errorService.info('Test info message', { data: 'test' });
      
      expect(EventBus.emit).toHaveBeenCalledWith('log:added', {
        level: 'info',
        message: 'Test info message',
        data: { data: 'test' },
        timestamp: mockDate.getTime()
      });
    });

    it('should log warning messages', () => {
      errorService.warn('Test warning message', { data: 'test' });
      
      expect(EventBus.emit).toHaveBeenCalledWith('log:added', {
        level: 'warn',
        message: 'Test warning message',
        data: { data: 'test' },
        timestamp: mockDate.getTime()
      });
    });

    it('should log error messages', () => {
      errorService.error('Test error message', { data: 'test' });
      
      expect(EventBus.emit).toHaveBeenCalledWith('log:added', {
        level: 'error',
        message: 'Test error message',
        data: { data: 'test' },
        timestamp: mockDate.getTime()
      });
    });

    it('should not log messages below configured level', () => {
      // 设置日志级别为warn
      errorService.updateConfig({ logLevel: 'warn' });
      
      // debug和info级别不应该被记录
      errorService.debug('Debug message');
      errorService.info('Info message');
      
      // 获取storageService
      const storageService = container.get('storageService');
      
      // 验证低于warn级别的日志不会保存
      expect(storageService.saveItem).not.toHaveBeenCalledWith(
        'appLogs',
        expect.objectContaining({ 
          level: 'debug',
          message: 'Debug message'
        })
      );
      
      expect(storageService.saveItem).not.toHaveBeenCalledWith(
        'appLogs',
        expect.objectContaining({ 
          level: 'info',
          message: 'Info message'
        })
      );
      
      // warn和error级别应该被记录
      errorService.warn('Warning message');
      errorService.error('Error message');
      
      // 确认EventBus被触发
      expect(EventBus.emit).toHaveBeenCalledWith(
        'log:added',
        expect.objectContaining({ 
          level: 'warn',
          message: 'Warning message'
        })
      );
      
      expect(EventBus.emit).toHaveBeenCalledWith(
        'log:added',
        expect.objectContaining({ 
          level: 'error',
          message: 'Error message'
        })
      );
    });
  });

  describe('error reporting', () => {
    it('should report an error', () => {
      const error = new Error('Test error');
      const context = { page: 'test-page', action: 'test-action' };
      
      errorService.reportError('component', error, context);
      
      expect(EventBus.emit).toHaveBeenCalledWith('error:reported', 
        expect.objectContaining({
          source: 'component',
          message: 'Test error',
          context: context,
          timestamp: mockDate.getTime()
        })
      );
    });

    it('should handle string errors', () => {
      errorService.reportError('component', 'String error message');
      
      expect(EventBus.emit).toHaveBeenCalledWith('error:reported', 
        expect.objectContaining({
          source: 'component',
          message: 'String error message',
          timestamp: mockDate.getTime()
        })
      );
    });

    it('should not send reports when reporting is disabled', () => {
      // 禁用错误报告
      errorService.updateConfig({ reportErrors: false });
      
      const error = new Error('Test error');
      errorService.reportError('component', error);
      
      // 检查是否仍然发出事件
      expect(EventBus.emit).toHaveBeenCalledWith('error:reported', 
        expect.any(Object)
      );
      
      // 但不应该尝试发送请求
      expect(wx.request).not.toHaveBeenCalled();
    });

    it('should attempt to upload errors when reporting URL is set', () => {
      // 设置报告URL
      errorService.updateConfig({ 
        reportErrors: true,
        reportUrl: 'https://example.com/errors' 
      });
      
      const error = new Error('Test error');
      errorService.reportError('component', error);
      
      // 应该尝试发送请求
      expect(wx.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://example.com/errors',
          method: 'POST',
          data: expect.objectContaining({
            source: 'component',
            message: 'Test error'
          })
        })
      );
    });
  });

  describe('retrieving logs and errors', () => {
    it('should retrieve logs with filters', async () => {
      // 模拟存储服务返回一些日志
      const mockLogs = [
        { id: '1', level: 'info', message: 'Info message', timestamp: Date.now() - 3600000 },
        { id: '2', level: 'warn', message: 'Warning message', timestamp: Date.now() - 1800000 },
        { id: '3', level: 'error', message: 'Error with data', timestamp: Date.now() - 900000, data: { type: 'auth' } }
      ];
      
      container.get('storageService').getCollection.mockResolvedValueOnce(mockLogs);
      
      // 获取所有日志
      const allLogs = await errorService.getLogs();
      expect(allLogs).toEqual(mockLogs);
      
      // 按级别过滤
      container.get('storageService').getCollection.mockResolvedValueOnce(mockLogs);
      const errorLogs = await errorService.getLogs({ level: 'error' });
      expect(errorLogs).toEqual([mockLogs[2]]);
      
      // 按时间范围过滤
      container.get('storageService').getCollection.mockResolvedValueOnce(mockLogs);
      const recentLogs = await errorService.getLogs({ 
        startTime: Date.now() - 2000000,
        endTime: Date.now()
      });
      expect(recentLogs).toEqual([mockLogs[1], mockLogs[2]]);
      
      // 按搜索词过滤
      container.get('storageService').getCollection.mockResolvedValueOnce(mockLogs);
      const searchLogs = await errorService.getLogs({ search: 'data' });
      expect(searchLogs).toEqual([mockLogs[2]]);
    });

    it('should retrieve errors with filters', async () => {
      // 模拟存储服务返回一些错误
      const mockErrors = [
        { id: '1', source: 'app', message: 'App error', timestamp: Date.now() - 3600000 },
        { id: '2', source: 'component', message: 'Component error', timestamp: Date.now() - 1800000 },
        { id: '3', source: 'network', message: 'Network failure', timestamp: Date.now() - 900000, context: { url: '/api/data' } }
      ];
      
      container.get('storageService').getCollection.mockResolvedValueOnce(mockErrors);
      
      // 获取所有错误
      const allErrors = await errorService.getErrors();
      expect(allErrors).toEqual(mockErrors);
      
      // 按来源过滤
      container.get('storageService').getCollection.mockResolvedValueOnce(mockErrors);
      const componentErrors = await errorService.getErrors({ source: 'component' });
      expect(componentErrors).toEqual([mockErrors[1]]);
      
      // 按时间范围过滤
      container.get('storageService').getCollection.mockResolvedValueOnce(mockErrors);
      const recentErrors = await errorService.getErrors({ 
        startTime: Date.now() - 2000000,
        endTime: Date.now()
      });
      expect(recentErrors).toEqual([mockErrors[1], mockErrors[2]]);
      
      // 按搜索词过滤
      container.get('storageService').getCollection.mockResolvedValueOnce(mockErrors);
      const searchErrors = await errorService.getErrors({ search: 'Network' });
      expect(searchErrors).toEqual([mockErrors[2]]);
    });
  });

  describe('clearing logs and errors', () => {
    it('should clear all logs', async () => {
      await errorService.clearLogs();
      
      expect(container.get('storageService').clearCollection).toHaveBeenCalledWith('appLogs');
      expect(EventBus.emit).toHaveBeenCalledWith('logs:cleared');
    });

    it('should clear all errors', async () => {
      await errorService.clearErrors();
      
      expect(container.get('storageService').clearCollection).toHaveBeenCalledWith('errorLogs');
      expect(EventBus.emit).toHaveBeenCalledWith('errors:cleared');
    });
  });

  describe('config management', () => {
    it('should update configuration', () => {
      const newConfig = {
        maxLogCount: 500,
        logLevel: 'error',
        reportErrors: false
      };
      
      errorService.updateConfig(newConfig);
      
      expect(errorService.config).toEqual({
        maxLogCount: 500,
        maxErrorCount: 50, // 未更改的值保持原样
        logLevel: 'error',
        reportErrors: false,
        reportUrl: '',
        collectConsole: true
      });
      
      expect(EventBus.emit).toHaveBeenCalledWith('errorService:configUpdated', errorService.config);
    });

    it('should get current configuration', () => {
      const config = errorService.getConfig();
      
      expect(config).toEqual({
        maxLogCount: 200,
        maxErrorCount: 50,
        logLevel: 'info',
        reportErrors: true,
        reportUrl: '',
        collectConsole: true
      });
    });
  });

  describe('console interception', () => {
    it('should intercept console methods when enabled', () => {
      // 重新初始化服务以便捕获控制台方法的覆盖
      jest.clearAllMocks();
      
      // 保存原始console方法引用
      const originalConsole = { ...console };
      
      // 初始化服务开启控制台拦截
      errorService = ErrorService.init(container, { 
        collectConsole: true 
      });
      
      // 验证console方法被拦截
      expect(console.log).not.toBe(originalConsole.log);
      expect(console.info).not.toBe(originalConsole.info);
      expect(console.warn).not.toBe(originalConsole.warn);
      expect(console.error).not.toBe(originalConsole.error);
      
      // 禁用控制台拦截
      errorService.updateConfig({ collectConsole: false });
      
      // 记录控制台消息应该使用对应的日志级别
      console.log('Console log message');
      console.info('Console info message');
      console.warn('Console warning message');
      console.error('Console error message');
      
      // 当禁用时，不应该调用日志记录方法
      expect(EventBus.emit).not.toHaveBeenCalledWith(
        'log:added',
        expect.objectContaining({ message: 'Console log message' })
      );
    });
  });

  describe('event handling', () => {
    it('should handle uncaught errors', () => {
      // 模拟调用onError回调
      const errorCallback = wx.onError.mock.calls[0][0];
      const errorMsg = 'Uncaught SyntaxError: Unexpected token';
      
      errorCallback(errorMsg);
      
      expect(EventBus.emit).toHaveBeenCalledWith(
        'error:reported',
        expect.objectContaining({
          source: 'uncaught',
          message: 'Uncaught SyntaxError: Unexpected token',
          timestamp: mockDate.getTime()
        })
      );
    });

    it('should handle page not found errors', () => {
      // 模拟调用onPageNotFound回调
      const pageNotFoundCallback = wx.onPageNotFound.mock.calls[0][0];
      const pageNotFoundEvent = {
        path: '/pages/nonexistent/index',
        query: { id: '123' },
        isEntryPage: false
      };
      
      pageNotFoundCallback(pageNotFoundEvent);
      
      expect(EventBus.emit).toHaveBeenCalledWith(
        'error:reported',
        expect.objectContaining({
          source: 'navigation',
          message: 'Page not found',
          context: pageNotFoundEvent,
          timestamp: mockDate.getTime()
        })
      );
    });

    it('should handle memory warning', () => {
      // 模拟调用onMemoryWarning回调
      const memoryWarningCallback = wx.onMemoryWarning.mock.calls[0][0];
      const memoryEvent = { level: 10 }; // 内存告警级别
      
      memoryWarningCallback(memoryEvent);
      
      expect(EventBus.emit).toHaveBeenCalledWith(
        'log:added',
        expect.objectContaining({
          level: 'warn',
          message: 'Memory warning',
          data: memoryEvent,
          timestamp: mockDate.getTime()
        })
      );
    });
  });
}); 