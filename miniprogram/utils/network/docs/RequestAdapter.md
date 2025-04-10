# RequestAdapter 网络请求适配器

## 简介

RequestAdapter是一个用于小程序网络请求的适配层，提供统一的请求接口，支持多种请求处理方式，并具备拦截器、中间件等高级功能。本组件旨在提升应用的网络请求管理能力，优化请求流程，提高代码可维护性。

## 特性

- 统一的请求接口
- 灵活的配置选项
- 拦截器机制（请求前处理和响应后处理）
- 中间件支持
- 错误处理机制
- 超时控制
- 自动重试
- URL参数处理

## API参考

### 创建实例

```javascript
const adapter = new RequestAdapter(config);
```

#### 配置选项

| 参数 | 类型 | 默认值 | 说明 |
| ---- | ---- | ------ | ---- |
| baseURL | String | '' | 请求的基础URL |
| timeout | Number | 30000 | 请求超时时间（毫秒） |
| headers | Object | {} | 请求头 |
| method | String | 'GET' | 默认请求方法 |
| dataType | String | 'json' | 数据返回格式 |
| responseType | String | 'text' | 响应类型 |
| enableHttp2 | Boolean | false | 是否开启HTTP2 |
| enableQuic | Boolean | false | 是否开启QUIC |
| enableCache | Boolean | false | 是否开启缓存 |
| maxRetries | Number | 3 | 最大重试次数 |
| retryDelay | Number | 1000 | 重试间隔时间 |

### 请求方法

#### 通用请求方法

```javascript
adapter.request(config)
```

#### 便捷请求方法

```javascript
adapter.get(url, config)
adapter.post(url, data, config)
adapter.put(url, data, config)
adapter.delete(url, config)
adapter.head(url, config)
adapter.options(url, config)
```

### 拦截器

#### 添加请求拦截器

```javascript
const requestInterceptor = adapter.interceptors.request.use(
  function(config) {
    // 请求发送前处理
    return config;
  },
  function(error) {
    // 请求错误处理
    return Promise.reject(error);
  }
);
```

#### 添加响应拦截器

```javascript
const responseInterceptor = adapter.interceptors.response.use(
  function(response) {
    // 响应数据处理
    return response;
  },
  function(error) {
    // 响应错误处理
    return Promise.reject(error);
  }
);
```

#### 移除拦截器

```javascript
adapter.interceptors.request.eject(requestInterceptor);
adapter.interceptors.response.eject(responseInterceptor);
```

## 使用示例

### 基本用法

```javascript
// 创建请求适配器实例
const adapter = new RequestAdapter({
  baseURL: 'https://api.example.com/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 发起GET请求
adapter.get('/users')
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.error('请求失败:', error);
  });

// 发起POST请求
adapter.post('/users', {
  name: '张三',
  age: 30
})
  .then(response => {
    console.log('用户创建成功:', response.data);
  })
  .catch(error => {
    console.error('创建用户失败:', error);
  });
```

### 使用拦截器

```javascript
// 添加请求拦截器
adapter.interceptors.request.use(
  config => {
    // 在请求发送前添加认证信息
    const token = wx.getStorageSync('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 添加响应拦截器
adapter.interceptors.response.use(
  response => {
    // 统一处理响应
    if (response.statusCode === 200 && response.data) {
      return response.data;
    }
    return response;
  },
  error => {
    // 处理错误响应
    if (error.statusCode === 401) {
      // 处理登录失效
      wx.navigateTo({
        url: '/pages/login/login'
      });
    }
    return Promise.reject(error);
  }
);
```

### 取消请求

```javascript
const source = adapter.cancelToken.source();

adapter.get('/users', {
  cancelToken: source.token
});

// 取消请求
source.cancel('用户取消请求');
```

### 全局默认配置

```javascript
// 设置全局配置
adapter.defaults.baseURL = 'https://api.example.com/v2';
adapter.defaults.headers.common['Authorization'] = `Bearer ${wx.getStorageSync('token')}`;
adapter.defaults.headers.post['Content-Type'] = 'application/json';
```

## 最佳实践

1. **创建API服务实例**
   
   ```javascript
   // api.js
   import RequestAdapter from './network/RequestAdapter';
   
   const api = new RequestAdapter({
     baseURL: 'https://api.example.com',
     timeout: 15000
   });
   
   // 添加全局拦截器
   api.interceptors.request.use(config => {
     console.log('请求配置:', config);
     return config;
   });
   
   api.interceptors.response.use(
     response => {
       return response.data;
     },
     error => {
       console.error('请求错误:', error);
       return Promise.reject(error);
     }
   );
   
   export default api;
   ```

2. **模块化API调用**
   
   ```javascript
   // userApi.js
   import api from './api';
   
   export const userApi = {
     getUsers(params) {
       return api.get('/users', { params });
     },
     
     getUserById(id) {
       return api.get(`/users/${id}`);
     },
     
     createUser(data) {
       return api.post('/users', data);
     },
     
     updateUser(id, data) {
       return api.put(`/users/${id}`, data);
     },
     
     deleteUser(id) {
       return api.delete(`/users/${id}`);
     }
   };
   ```

## 注意事项

1. RequestAdapter 依赖于微信小程序的 `wx.request` API，确保在小程序环境中使用。
2. 对于请求失败，建议设置合理的重试策略，避免过多的重试导致服务器压力过大。
3. 在处理敏感数据时，确保使用HTTPS协议并正确设置安全头部信息。
4. 大量并发请求可能会受到微信小程序的并发限制，请合理控制请求数量。
5. 对于大型应用，建议结合离线存储和数据同步机制，提高应用在弱网环境下的用户体验。 