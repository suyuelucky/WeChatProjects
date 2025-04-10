/**
 * InterceptorManager 组件单元测试
 * 拦截器管理器，提供请求和响应拦截器的管理功能
 */

// 导入被测试模块
const InterceptorManager = require('../InterceptorManager');

describe('InterceptorManager 核心功能测试', () => {
  let interceptorManager;
  
  beforeEach(() => {
    // 创建新的拦截器管理器实例
    interceptorManager = new InterceptorManager();
  });
  
  test('初始化状态', () => {
    expect(interceptorManager).toBeDefined();
    expect(Array.isArray(interceptorManager.handlers)).toBe(true);
    expect(interceptorManager.handlers.length).toBe(0);
  });
  
  test('添加拦截器', () => {
    const fulfilledFn = jest.fn();
    const rejectedFn = jest.fn();
    
    const id = interceptorManager.use(fulfilledFn, rejectedFn);
    
    expect(id).toBe(0);
    expect(interceptorManager.handlers.length).toBe(1);
    expect(interceptorManager.handlers[0]).toEqual({
      fulfilled: fulfilledFn,
      rejected: rejectedFn
    });
  });
  
  test('移除拦截器', () => {
    const fulfilledFn = jest.fn();
    const rejectedFn = jest.fn();
    
    const id = interceptorManager.use(fulfilledFn, rejectedFn);
    interceptorManager.eject(id);
    
    expect(interceptorManager.handlers[id]).toBeNull();
  });
  
  test('移除不存在的拦截器', () => {
    // 不应该抛出错误
    expect(() => {
      interceptorManager.eject(99);
    }).not.toThrow();
  });
  
  test('遍历拦截器', () => {
    const fulfilled1 = jest.fn();
    const rejected1 = jest.fn();
    const fulfilled2 = jest.fn();
    const rejected2 = jest.fn();
    
    interceptorManager.use(fulfilled1, rejected1);
    interceptorManager.use(fulfilled2, rejected2);
    
    const mockCallback = jest.fn();
    interceptorManager.forEach(mockCallback);
    
    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenNthCalledWith(1, {
      fulfilled: fulfilled1,
      rejected: rejected1
    });
    expect(mockCallback).toHaveBeenNthCalledWith(2, {
      fulfilled: fulfilled2,
      rejected: rejected2
    });
  });
  
  test('遍历跳过null项', () => {
    const fulfilled1 = jest.fn();
    const rejected1 = jest.fn();
    const fulfilled2 = jest.fn();
    const rejected2 = jest.fn();
    
    interceptorManager.use(fulfilled1, rejected1);
    const id = interceptorManager.use(fulfilled2, rejected2);
    
    // 移除第二个拦截器
    interceptorManager.eject(id);
    
    const mockCallback = jest.fn();
    interceptorManager.forEach(mockCallback);
    
    // 回调应该只被调用一次，跳过null项
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith({
      fulfilled: fulfilled1,
      rejected: rejected1
    });
  });
});

describe('InterceptorManager 高级功能测试', () => {
  let interceptorManager;
  
  beforeEach(() => {
    interceptorManager = new InterceptorManager();
  });
  
  test('清空所有拦截器', () => {
    // 添加多个拦截器
    const fulfilled1 = jest.fn();
    const rejected1 = jest.fn();
    interceptorManager.use(fulfilled1, rejected1);
    
    const fulfilled2 = jest.fn();
    const rejected2 = jest.fn();
    interceptorManager.use(fulfilled2, rejected2);
    
    // 清空所有拦截器
    interceptorManager.clear();
    
    // 验证拦截器已被清空
    expect(interceptorManager.handlers.length).toBe(0);
    
    // forEach不应执行任何回调
    const mockCallback = jest.fn();
    interceptorManager.forEach(mockCallback);
    expect(mockCallback).not.toHaveBeenCalled();
  });
  
  test('添加只有成功处理器的拦截器', () => {
    const fulfilledFn = jest.fn();
    
    const id = interceptorManager.use(fulfilledFn);
    
    expect(interceptorManager.handlers[id].fulfilled).toBe(fulfilledFn);
    expect(interceptorManager.handlers[id].rejected).toBeUndefined();
  });
  
  test('添加只有失败处理器的拦截器', () => {
    const rejectedFn = jest.fn();
    
    const id = interceptorManager.use(null, rejectedFn);
    
    expect(interceptorManager.handlers[id].fulfilled).toBeNull();
    expect(interceptorManager.handlers[id].rejected).toBe(rejectedFn);
  });
  
  test('获取所有有效拦截器', () => {
    const fulfilled1 = jest.fn();
    const rejected1 = jest.fn();
    const fulfilled2 = jest.fn();
    const rejected2 = jest.fn();
    
    interceptorManager.use(fulfilled1, rejected1);
    const id = interceptorManager.use(fulfilled2, rejected2);
    
    // 移除一个拦截器
    interceptorManager.eject(id);
    
    // 获取所有有效拦截器
    const activeHandlers = interceptorManager.getHandlers();
    
    expect(activeHandlers.length).toBe(1);
    expect(activeHandlers[0]).toEqual({
      fulfilled: fulfilled1,
      rejected: rejected1
    });
  });
  
  test('禁用和启用拦截器', () => {
    const fulfilled = jest.fn();
    const rejected = jest.fn();
    
    const id = interceptorManager.use(fulfilled, rejected);
    
    // 禁用拦截器
    interceptorManager.disable(id);
    
    // 禁用后应该不执行回调
    const mockCallback = jest.fn();
    interceptorManager.forEach(mockCallback);
    expect(mockCallback).not.toHaveBeenCalled();
    
    // 启用拦截器
    interceptorManager.enable(id);
    
    // 启用后应该执行回调
    interceptorManager.forEach(mockCallback);
    expect(mockCallback).toHaveBeenCalledWith({
      fulfilled: fulfilled,
      rejected: rejected
    });
  });
}); 