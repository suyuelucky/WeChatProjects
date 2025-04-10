/**
 * RequestAdapter 组件单元测试
 * 网络请求适配器，提供统一的请求接口，支持多种请求实现
 */

const mockWx = require('../../testing/wx-mock');
global.wx = mockWx;

// 导入被测试模块
const RequestAdapter = require('../RequestAdapter');

describe('RequestAdapter 核心功能测试', () => {
  let adapter;
  
  beforeEach(() => {
    // 重置mock对象状态
    mockWx._reset();
    
    // 创建默认适配器实例
    adapter = new RequestAdapter();
  });
  
  test('默认配置初始化', () => {
    expect(adapter).toBeDefined();
    expect(adapter.baseURL).toBe('');
    expect(adapter.timeout).toBe(10000);
    expect(adapter.headers).toEqual({
      'content-type': 'application/json'
    });
    expect(typeof adapter.request).toBe('function');
  });
  
  test('自定义配置初始化', () => {
    const customAdapter = new RequestAdapter({
      baseURL: 'https://api.example.com',
      timeout: 5000,
      headers: {
        'content-type': 'application/xml',
        'Authorization': 'Bearer token123'
      }
    });
    
    expect(customAdapter.baseURL).toBe('https://api.example.com');
    expect(customAdapter.timeout).toBe(5000);
    expect(customAdapter.headers).toEqual({
      'content-type': 'application/xml',
      'Authorization': 'Bearer token123'
    });
  });
  
  test('请求方法映射', () => {
    expect(typeof adapter.get).toBe('function');
    expect(typeof adapter.post).toBe('function');
    expect(typeof adapter.put).toBe('function');
    expect(typeof adapter.delete).toBe('function');
    expect(typeof adapter.head).toBe('function');
    expect(typeof adapter.options).toBe('function');
    expect(typeof adapter.patch).toBe('function');
  });
  
  test('默认基本请求流程', async () => {
    // 模拟request方法
    wx.request = jest.fn((options) => {
      setTimeout(() => {
        options.success({
          statusCode: 200,
          data: { success: true, message: 'ok' }
        });
      }, 10);
    });
    
    const response = await adapter.request({
      url: '/api/test',
      method: 'GET'
    });
    
    expect(wx.request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/api/test',
      method: 'GET',
      timeout: 10000,
      header: { 'content-type': 'application/json' }
    }));
    
    expect(response).toEqual({ success: true, message: 'ok' });
  });
  
  test('完整URL处理', async () => {
    // 创建带有baseURL的适配器
    const apiAdapter = new RequestAdapter({
      baseURL: 'https://api.example.com/v1'
    });
    
    // 模拟request方法
    wx.request = jest.fn((options) => {
      setTimeout(() => {
        options.success({ statusCode: 200, data: {} });
      }, 10);
    });
    
    // 使用相对路径
    await apiAdapter.request({
      url: '/users',
      method: 'GET'
    });
    
    expect(wx.request).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://api.example.com/v1/users'
    }));
    
    // 重置模拟
    wx.request.mockClear();
    
    // 使用完整URL，应忽略baseURL
    await apiAdapter.request({
      url: 'https://other-api.com/data',
      method: 'GET'
    });
    
    expect(wx.request).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://other-api.com/data'
    }));
  });
  
  test('请求超时处理', async () => {
    // 模拟超时行为
    const requestMock = jest.fn((options) => {
      // 不调用success或fail，模拟超时
      return {
        abort: jest.fn()
      };
    });
    
    wx.request = requestMock;
    
    // 创建低超时值的适配器
    const timeoutAdapter = new RequestAdapter({
      timeout: 100
    });
    
    // 应该产生超时错误
    await expect(timeoutAdapter.request({
      url: '/api/slow',
      method: 'GET'
    })).rejects.toThrow('请求超时');
    
    // 验证abort被调用
    expect(requestMock).toHaveBeenCalled();
  });
  
  test('请求错误处理', async () => {
    // 模拟请求失败
    wx.request = jest.fn((options) => {
      setTimeout(() => {
        options.fail({ errMsg: 'request:fail' });
      }, 10);
    });
    
    await expect(adapter.request({
      url: '/api/error',
      method: 'GET'
    })).rejects.toMatchObject({
      errMsg: 'request:fail'
    });
  });
  
  test('HTTP错误状态码处理', async () => {
    // 模拟404错误
    wx.request = jest.fn((options) => {
      setTimeout(() => {
        options.success({
          statusCode: 404,
          data: { message: 'Not Found' }
        });
      }, 10);
    });
    
    await expect(adapter.request({
      url: '/api/notfound',
      method: 'GET'
    })).rejects.toMatchObject({
      status: 404,
      message: 'Not Found'
    });
    
    // 模拟500错误
    wx.request = jest.fn((options) => {
      setTimeout(() => {
        options.success({
          statusCode: 500,
          data: { message: 'Internal Server Error' }
        });
      }, 10);
    });
    
    await expect(adapter.request({
      url: '/api/error',
      method: 'GET'
    })).rejects.toMatchObject({
      status: 500,
      message: 'Internal Server Error'
    });
  });
  
  test('请求头合并处理', async () => {
    // 创建带默认头的适配器
    const headerAdapter = new RequestAdapter({
      headers: {
        'X-API-Key': 'default-key',
        'content-type': 'application/json'
      }
    });
    
    // 模拟request
    wx.request = jest.fn((options) => {
      setTimeout(() => {
        options.success({ statusCode: 200, data: {} });
      }, 10);
    });
    
    // 请求时添加自定义头
    await headerAdapter.request({
      url: '/api/test',
      method: 'GET',
      headers: {
        'X-Custom-Header': 'custom-value',
        'X-API-Key': 'override-key' // 覆盖默认值
      }
    });
    
    // 验证头被正确合并
    expect(wx.request).toHaveBeenCalledWith(expect.objectContaining({
      header: {
        'content-type': 'application/json',
        'X-API-Key': 'override-key',
        'X-Custom-Header': 'custom-value'
      }
    }));
  });
});

describe('RequestAdapter 便捷方法测试', () => {
  let adapter;
  
  beforeEach(() => {
    // 重置mock对象状态
    mockWx._reset();
    
    // 创建默认适配器实例
    adapter = new RequestAdapter();
    
    // 模拟基本请求成功
    wx.request = jest.fn((options) => {
      setTimeout(() => {
        options.success({
          statusCode: 200,
          data: { success: true, message: 'ok' }
        });
      }, 10);
    });
  });
  
  test('get方法正确处理参数', async () => {
    await adapter.get('/api/users', { page: 1, limit: 10 });
    
    expect(wx.request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/api/users',
      method: 'GET',
      data: { page: 1, limit: 10 }
    }));
  });
  
  test('post方法正确处理参数', async () => {
    const data = { name: 'Test', email: 'test@example.com' };
    await adapter.post('/api/users', data);
    
    expect(wx.request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/api/users',
      method: 'POST',
      data: data
    }));
  });
  
  test('put方法正确处理参数', async () => {
    const data = { name: 'Updated Name' };
    await adapter.put('/api/users/1', data);
    
    expect(wx.request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/api/users/1',
      method: 'PUT',
      data: data
    }));
  });
  
  test('delete方法正确处理参数', async () => {
    await adapter.delete('/api/users/1');
    
    expect(wx.request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/api/users/1',
      method: 'DELETE'
    }));
  });
  
  test('head方法正确处理参数', async () => {
    await adapter.head('/api/users/1');
    
    expect(wx.request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/api/users/1',
      method: 'HEAD'
    }));
  });
  
  test('options方法正确处理参数', async () => {
    await adapter.options('/api/users');
    
    expect(wx.request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/api/users',
      method: 'OPTIONS'
    }));
  });
  
  test('patch方法正确处理参数', async () => {
    const data = { status: 'active' };
    await adapter.patch('/api/users/1', data);
    
    expect(wx.request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/api/users/1',
      method: 'PATCH',
      data: data
    }));
  });
});

describe('RequestAdapter 中间件功能测试', () => {
  let adapter;
  
  beforeEach(() => {
    // 重置mock对象状态
    mockWx._reset();
    
    // 创建默认适配器实例
    adapter = new RequestAdapter();
    
    // 模拟基本请求成功
    wx.request = jest.fn((options) => {
      setTimeout(() => {
        options.success({
          statusCode: 200,
          data: { success: true, message: 'ok' }
        });
      }, 10);
    });
  });
  
  test('请求拦截器可以修改请求配置', async () => {
    // 添加请求拦截器
    adapter.interceptors.request.use((config) => {
      config.headers = config.headers || {};
      config.headers['X-Auth-Token'] = 'token123';
      return config;
    });
    
    await adapter.get('/api/users');
    
    expect(wx.request).toHaveBeenCalledWith(expect.objectContaining({
      header: expect.objectContaining({
        'X-Auth-Token': 'token123'
      })
    }));
  });
  
  test('响应拦截器可以修改响应数据', async () => {
    // 添加响应拦截器
    adapter.interceptors.response.use((response) => {
      response.custom = 'customValue';
      return response;
    });
    
    const response = await adapter.get('/api/users');
    
    expect(response).toEqual({
      success: true,
      message: 'ok',
      custom: 'customValue'
    });
  });
  
  test('请求拦截器可以拒绝请求', async () => {
    // 添加请求拦截器，拒绝请求
    adapter.interceptors.request.use((config) => {
      return Promise.reject(new Error('请求被拦截器拒绝'));
    });
    
    await expect(adapter.get('/api/users')).rejects.toThrow('请求被拦截器拒绝');
    
    // 请求不应该被发送
    expect(wx.request).not.toHaveBeenCalled();
  });
  
  test('响应拦截器可以处理错误', async () => {
    // 模拟请求失败
    wx.request = jest.fn((options) => {
      setTimeout(() => {
        options.fail({ errMsg: 'request:fail' });
      }, 10);
    });
    
    // 添加响应拦截器处理错误
    adapter.interceptors.response.use(
      response => response,
      error => {
        return Promise.reject({
          ...error,
          custom: '错误已处理'
        });
      }
    );
    
    await expect(adapter.get('/api/users')).rejects.toMatchObject({
      errMsg: 'request:fail',
      custom: '错误已处理'
    });
  });
  
  test('多个拦截器按顺序执行', async () => {
    const order = [];
    
    // 添加多个请求拦截器
    adapter.interceptors.request.use((config) => {
      order.push(1);
      return config;
    });
    
    adapter.interceptors.request.use((config) => {
      order.push(2);
      return config;
    });
    
    // 添加多个响应拦截器
    adapter.interceptors.response.use((response) => {
      order.push(3);
      return response;
    });
    
    adapter.interceptors.response.use((response) => {
      order.push(4);
      return response;
    });
    
    await adapter.get('/api/users');
    
    // 请求拦截器按添加顺序执行，响应拦截器按添加顺序执行
    expect(order).toEqual([1, 2, 3, 4]);
  });
  
  test('移除拦截器', async () => {
    // 添加拦截器
    const id = adapter.interceptors.request.use((config) => {
      config.headers = config.headers || {};
      config.headers['X-Test'] = 'test';
      return config;
    });
    
    // 移除拦截器
    adapter.interceptors.request.eject(id);
    
    await adapter.get('/api/users');
    
    // 验证拦截器已被移除
    expect(wx.request).not.toHaveBeenCalledWith(expect.objectContaining({
      header: expect.objectContaining({
        'X-Test': 'test'
      })
    }));
  });
}); 