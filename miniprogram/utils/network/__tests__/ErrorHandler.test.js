/**
 * ErrorHandler 组件单元测试
 * 错误处理器，提供统一的错误处理功能
 */

// 导入被测试模块
const ErrorHandler = require('../ErrorHandler');

describe('ErrorHandler 核心功能测试', () => {
  let errorHandler;
  
  beforeEach(() => {
    // 创建新的错误处理器实例
    errorHandler = new ErrorHandler();
  });
  
  test('初始化状态', () => {
    expect(errorHandler).toBeDefined();
    expect(typeof errorHandler.createError).toBe('function');
    expect(typeof errorHandler.handleError).toBe('function');
    expect(typeof errorHandler.wrapOperation).toBe('function');
    expect(typeof errorHandler.isRetryable).toBe('function');
  });
  
  test('创建标准错误对象 - 使用字符串', () => {
    const error = errorHandler.createError('测试错误', 'NETWORK-TIMEOUT-REQUEST', {
      url: 'https://api.example.com/data'
    });
    
    expect(error).toMatchObject({
      code: 'NETWORK-TIMEOUT-REQUEST',
      message: '网络请求超时',
      userMessage: expect.any(String),
      timestamp: expect.any(Number),
      context: expect.objectContaining({
        url: 'https://api.example.com/data'
      }),
    });
  });
  
  test('创建标准错误对象 - 使用Error对象', () => {
    const originalError = new Error('原始错误');
    const error = errorHandler.createError(originalError, 'SERVER-RESPONSE-5XX');
    
    expect(error).toMatchObject({
      code: 'SERVER-RESPONSE-5XX',
      message: '服务器内部错误',
      userMessage: expect.any(String),
      timestamp: expect.any(Number),
      originalError: originalError,
    });
  });
  
  test('创建标准错误对象 - 自动推断错误码', () => {
    const wxError = { errMsg: 'request:fail timeout' };
    const error = errorHandler.createError(wxError);
    
    // 应该自动推断为超时错误
    expect(error.code).toBe('NETWORK-TIMEOUT-REQUEST');
  });
  
  test('处理错误 - 基本处理流程', () => {
    // 模拟日志函数
    const logSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const originalError = { errMsg: 'request:fail' };
    const error = errorHandler.createError(originalError, 'NETWORK-CONNECTION-FAILED');
    
    const handledError = errorHandler.handleError(error);
    
    // 验证错误被记录
    expect(logSpy).toHaveBeenCalled();
    
    // 验证处理后的错误对象
    expect(handledError).toEqual(error);
    
    // 清理
    logSpy.mockRestore();
  });
  
  test('包装异步操作添加错误处理', async () => {
    // 模拟成功操作
    const successOperation = jest.fn().mockResolvedValue({ data: 'success' });
    const wrappedSuccess = errorHandler.wrapOperation(successOperation);
    
    const result = await wrappedSuccess();
    expect(result).toEqual({ data: 'success' });
    
    // 模拟失败操作
    const failOperation = jest.fn().mockRejectedValue(new Error('操作失败'));
    const wrappedFail = errorHandler.wrapOperation(failOperation);
    
    await expect(wrappedFail()).rejects.toMatchObject({
      code: expect.any(String),
      message: expect.any(String),
      timestamp: expect.any(Number)
    });
  });
  
  test('判断错误是否可重试', () => {
    // 创建可重试的错误
    const retryableError = errorHandler.createError('超时错误', 'NETWORK-TIMEOUT-REQUEST');
    expect(errorHandler.isRetryable(retryableError)).toBe(true);
    
    // 创建不可重试的错误
    const nonRetryableError = errorHandler.createError('参数错误', 'CLIENT-PARAMETER-INVALID');
    expect(errorHandler.isRetryable(nonRetryableError)).toBe(false);
    
    // 指定选项覆盖默认行为
    expect(errorHandler.isRetryable(nonRetryableError, { force: true })).toBe(true);
    expect(errorHandler.isRetryable(retryableError, { force: false })).toBe(false);
  });
});

describe('ErrorHandler 高级功能测试', () => {
  let errorHandler;
  
  beforeEach(() => {
    errorHandler = new ErrorHandler();
  });
  
  test('错误重试配置', () => {
    // 设置重试配置
    errorHandler.setRetryConfig({
      maxRetries: 3,
      retryDelay: 1000,
      retryableErrorCodes: ['NETWORK-TIMEOUT-REQUEST', 'SERVER-RESPONSE-5XX']
    });
    
    // 创建可重试错误
    const retryableError = errorHandler.createError('超时错误', 'NETWORK-TIMEOUT-REQUEST');
    
    // 获取重试信息
    const retryInfo = errorHandler.getRetryInfo(retryableError);
    
    expect(retryInfo).toMatchObject({
      canRetry: true,
      maxRetries: 3,
      retryDelay: 1000
    });
  });
  
  test('错误转换 - 自动转换wx错误', () => {
    const wxError = { errMsg: 'request:fail ssl hand shake error' };
    
    const standardError = errorHandler.handleError(wxError);
    
    expect(standardError).toMatchObject({
      code: 'NETWORK-SECURITY-SSL',
      message: expect.stringContaining('SSL'),
      originalError: wxError
    });
  });
  
  test('自定义错误映射', () => {
    // 添加自定义错误映射
    errorHandler.addErrorMapping(
      // 匹配函数
      function(err) {
        return err.type === 'custom' && err.status === 499;
      },
      // 映射函数
      function(err) {
        return {
          code: 'CUSTOM-ERROR-499',
          message: '自定义错误',
          userMessage: '发生了自定义错误',
          canRetry: false
        };
      }
    );
    
    // 处理匹配的错误
    const customError = { type: 'custom', status: 499 };
    const mappedError = errorHandler.handleError(customError);
    
    expect(mappedError).toMatchObject({
      code: 'CUSTOM-ERROR-499',
      message: '自定义错误',
      userMessage: '发生了自定义错误',
      canRetry: false
    });
  });
  
  test('创建带有请求和响应信息的错误', () => {
    const request = {
      url: 'https://api.example.com/data',
      method: 'GET',
      headers: { Authorization: 'Bearer token123' }
    };
    
    const response = {
      status: 403,
      data: { message: 'Forbidden' }
    };
    
    const error = errorHandler.createRequestError(
      'API请求被拒绝',
      'CLIENT-PERMISSION-DENIED',
      request,
      response
    );
    
    expect(error).toMatchObject({
      code: 'CLIENT-PERMISSION-DENIED',
      message: '权限不足',
      request: expect.objectContaining({
        url: 'https://api.example.com/data',
        method: 'GET'
      }),
      response: response
    });
    
    // 验证敏感信息已脱敏
    expect(error.request.headers.Authorization).toBe('**REMOVED**');
  });
  
  test('错误上报集成', () => {
    // 模拟错误上报函数
    const reportFn = jest.fn();
    errorHandler.setErrorReporter(reportFn);
    
    // 创建一个错误
    const error = errorHandler.createError('测试错误', 'SERVER-RESPONSE-5XX');
    
    // 处理错误，应该触发上报
    errorHandler.handleError(error, { report: true });
    
    // 验证上报被调用
    expect(reportFn).toHaveBeenCalledWith(expect.objectContaining({
      code: 'SERVER-RESPONSE-5XX',
      level: 'ERROR'
    }));
  });
}); 