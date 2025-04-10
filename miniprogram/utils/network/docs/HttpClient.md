# HttpClient 网络请求客户端

## 简介

HttpClient是基于RequestAdapter封装的网络请求客户端，提供了更高级别的抽象和便捷的API接口，用于处理小程序中的HTTP请求。它简化了网络请求的调用方式，并集成了常用的功能，如统一错误处理、接口签名、请求队列等。

## 特性

- 简化的API接口
- 统一的错误处理
- 自动化的接口签名
- 请求队列管理
- 请求/响应日志
- 状态码处理
- 业务状态统一处理
- 全局loading控制

## API参考

### 创建实例

```javascript
import { HttpClient } from 'utils/network/HttpClient';

const httpClient = new HttpClient({
  baseURL: 'https://api.example.com',
  showLoading: true
});
```

#### 配置选项

| 参数 | 类型 | 默认值 | 说明 |
| ---- | ---- | ------ | ---- |
| baseURL | String | '' | 请求的基础URL |
| timeout | Number | 30000 | 请求超时时间（毫秒） |
| headers | Object | {} | 请求头 |
| showLoading | Boolean | false | 是否显示loading |
| loadingText | String | '加载中...' | loading提示文字 |
| autoErrorMsg | Boolean | true | 是否自动处理错误消息 |
| businessCodeKey | String | 'code' | 业务状态码字段名 |
| businessCodeSuccess | Number/String | 0 | 业务成功状态码 |
| businessDataKey | String | 'data' | 业务数据字段名 |
| businessMsgKey | String | 'msg' | 业务消息字段名 |
| enableLog | Boolean | false | 是否启用日志 |
| mockBaseURL | String | '' | 模拟数据的基础URL |
| useMock | Boolean | false | 是否使用模拟数据 |

### 请求方法

#### 通用请求方法

```javascript
httpClient.request(config)
```

#### 便捷请求方法

```javascript
httpClient.get(url, params, config)
httpClient.post(url, data, config)
httpClient.put(url, data, config)
httpClient.delete(url, params, config)
```

### 全局设置

```javascript
// 设置请求头
httpClient.setHeader(key, value);
httpClient.setHeaders(headers);

// 设置Token
httpClient.setToken(token);

// 移除请求头
httpClient.removeHeader(key);

// 获取适配器实例（如需使用低级API）
const adapter = httpClient.getAdapter();
```

### 拦截器配置

HttpClient内部已经为RequestAdapter配置了基础拦截器，但您仍可以添加自定义拦截器：

```javascript
// 获取适配器后添加自定义拦截器
const adapter = httpClient.getAdapter();

adapter.interceptors.request.use(
  config => {
    // 自定义请求拦截逻辑
    return config;
  }
);

adapter.interceptors.response.use(
  response => {
    // 自定义响应拦截逻辑
    return response;
  }
);
```

## 使用示例

### 基本用法

```javascript
// 创建HttpClient实例
const http = new HttpClient({
  baseURL: 'https://api.example.com',
  showLoading: true,
  loadingText: '请求中...',
  autoErrorMsg: true
});

// GET请求
http.get('/users', { page: 1, limit: 10 })
  .then(data => {
    console.log('用户列表:', data);
  })
  .catch(error => {
    console.error('获取用户列表失败:', error);
  });

// POST请求
http.post('/users', {
  name: '李四',
  age: 25,
  email: 'lisi@example.com'
})
  .then(data => {
    console.log('创建成功:', data);
  })
  .catch(error => {
    console.error('创建失败:', error);
  });

// PUT请求
http.put('/users/123', {
  name: '李四(已更新)',
  age: 26
})
  .then(data => {
    console.log('更新成功:', data);
  })
  .catch(error => {
    console.error('更新失败:', error);
  });

// DELETE请求
http.delete('/users/123')
  .then(data => {
    console.log('删除成功:', data);
  })
  .catch(error => {
    console.error('删除失败:', error);
  });
```

### 配置请求选项

```javascript
// 单次请求配置
http.post('/login', {
  username: 'user123',
  password: 'pass123'
}, {
  showLoading: true,
  loadingText: '登录中...',
  headers: {
    'X-Device-ID': 'miniprogram-123'
  },
  timeout: 5000
})
  .then(data => {
    // 登录成功后保存token
    const token = data.token;
    wx.setStorageSync('token', token);
    http.setToken(token);
    
    wx.showToast({
      title: '登录成功',
      icon: 'success'
    });
  })
  .catch(error => {
    wx.showToast({
      title: '登录失败',
      icon: 'none'
    });
  });
```

### 处理文件上传

```javascript
// 上传文件
wx.chooseImage({
  count: 1,
  success: res => {
    const tempFilePath = res.tempFilePaths[0];
    
    http.post('/upload', {
      file: {
        path: tempFilePath,
        name: 'file',
        type: 'image'
      }
    }, {
      isUpload: true, // 指定为上传请求
      showLoading: true,
      loadingText: '上传中...',
      // 上传进度回调
      onUploadProgress: progress => {
        console.log(`上传进度: ${progress.progress}%`);
      }
    })
      .then(data => {
        console.log('上传成功:', data);
        // 显示上传的图片
        this.setData({
          imageUrl: data.url
        });
      })
      .catch(error => {
        console.error('上传失败:', error);
      });
  }
});
```

### 多个并发请求

```javascript
// 并发请求
const requests = [
  http.get('/users'),
  http.get('/products'),
  http.get('/categories')
];

Promise.all(requests)
  .then(([users, products, categories]) => {
    console.log('用户数据:', users);
    console.log('产品数据:', products);
    console.log('分类数据:', categories);
    
    // 更新页面数据
    this.setData({
      users,
      products,
      categories,
      isLoaded: true
    });
  })
  .catch(error => {
    console.error('获取数据失败:', error);
  });
```

### 设置全局请求头

```javascript
// 设置单个请求头
http.setHeader('X-API-Version', '1.0.0');

// 设置多个请求头
http.setHeaders({
  'X-Platform': 'MiniProgram',
  'X-App-Version': '2.3.0'
});

// 设置认证Token
http.setToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');

// 移除请求头
http.removeHeader('X-Temp-Header');
```

## 最佳实践

### 创建API服务层

为了更好地组织代码，推荐创建统一的API服务层：

```javascript
// api/index.js
import { HttpClient } from 'utils/network/HttpClient';

// 创建共享的HttpClient实例
const http = new HttpClient({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  showLoading: true,
  enableLog: true
});

// 可以在此配置全局拦截器
const adapter = http.getAdapter();
adapter.interceptors.request.use(config => {
  // 添加设备信息
  config.headers['X-Device-Info'] = JSON.stringify(wx.getSystemInfoSync());
  return config;
});

export default http;
```

### 封装业务模块API

```javascript
// api/user.js
import http from './index';

export const userApi = {
  // 获取用户列表
  getUsers(params) {
    return http.get('/users', params);
  },
  
  // 获取用户详情
  getUserDetail(id) {
    return http.get(`/users/${id}`);
  },
  
  // 创建用户
  createUser(data) {
    return http.post('/users', data);
  },
  
  // 更新用户
  updateUser(id, data) {
    return http.put(`/users/${id}`, data);
  },
  
  // 删除用户
  deleteUser(id) {
    return http.delete(`/users/${id}`);
  },
  
  // 用户登录
  login(username, password) {
    return http.post('/login', { username, password });
  }
};
```

### 在页面中使用

```javascript
// pages/user/list.js
import { userApi } from '../../api/user';

Page({
  data: {
    users: [],
    loading: false,
    page: 1,
    limit: 20,
    hasMore: true
  },
  
  onLoad() {
    this.loadUsers();
  },
  
  loadUsers() {
    if (this.data.loading || !this.data.hasMore) return;
    
    this.setData({ loading: true });
    
    userApi.getUsers({
      page: this.data.page,
      limit: this.data.limit
    })
      .then(data => {
        const newUsers = [...this.data.users, ...data.list];
        
        this.setData({
          users: newUsers,
          page: this.data.page + 1,
          hasMore: data.list.length === this.data.limit,
          loading: false
        });
      })
      .catch(error => {
        this.setData({ loading: false });
        wx.showToast({
          title: '加载用户失败',
          icon: 'none'
        });
      });
  },
  
  onReachBottom() {
    this.loadUsers();
  }
});
```

## 注意事项

1. HttpClient 是对 RequestAdapter 的封装，底层仍然使用微信小程序的 `wx.request` API。
2. 为了避免请求冲突，建议在应用中使用单例的 HttpClient 实例。
3. 合理设置 `showLoading` 和 `autoErrorMsg` 参数，避免过多的交互提示影响用户体验。
4. 对于大量并发请求，注意微信小程序的并发请求数限制（通常为10个）。
5. HttpClient 已默认处理常见的HTTP错误（如网络错误、超时等），但仍需在业务逻辑中处理特定的业务错误。
6. 建议在API服务层中集中管理所有接口，便于统一维护和管理。 