# 微信小程序云开发

## 目录结构

```
cloudfunctions/         云函数目录
├── getOpenId/          获取用户OpenID的云函数
├── initDatabase/       初始化数据库结构的云函数
├── manageUser/         用户信息管理云函数
├── manageFile/         文件管理云函数
└── README.md           本文档
```

## 已接入的云开发功能

1. **云函数**
   - `getOpenId`: 获取用户的OpenID
   - `initDatabase`: 初始化数据库集合结构
   - `manageUser`: 用户信息管理（查询、创建、更新）
   - `manageFile`: 文件信息管理（上传、下载、查询、删除）

2. **云数据库**
   - `users`: 用户信息集合
   - `photos`: 照片文件集合
   - `diaries`: 日记集合
   - `traces`: 轨迹记录集合
   - `settings`: 应用设置集合
   - `feedback`: 用户反馈集合

3. **云存储**
   - `user-photos/`: 用户上传的照片存储目录

## 如何使用

### 云函数调用

```javascript
// 方式一：直接调用
wx.cloud.callFunction({
  name: 'getOpenId',
  data: {},
  success: res => {
    console.log('OpenID:', res.result.openid);
  },
  fail: err => {
    console.error('调用失败:', err);
  }
});

// 方式二：使用封装的CloudService（推荐）
const cloudService = getApp().services.cloudService;
cloudService.callFunction('getOpenId')
  .then(result => {
    console.log('OpenID:', result.openid);
  })
  .catch(err => {
    console.error('调用失败:', err);
  });
```

### 用户管理

```javascript
// 获取当前用户信息
cloudService.callFunction('manageUser', {
  action: 'get'
})
  .then(result => {
    console.log('用户信息:', result.data);
  })
  .catch(err => {
    console.error('获取用户信息失败:', err);
  });

// 更新用户信息
cloudService.callFunction('manageUser', {
  action: 'update',
  data: {
    nickName: '测试用户',
    avatarUrl: 'https://example.com/avatar.png'
  }
})
  .then(result => {
    console.log('更新成功:', result);
  })
  .catch(err => {
    console.error('更新失败:', err);
  });
```

### 文件管理

```javascript
// 上传文件
cloudService.uploadFile(
  tempFilePath,                                      // 本地文件路径
  `user-photos/${openid}/${Date.now()}.jpg`,         // 云端存储路径
  { showLoading: true }                              // 选项
)
  .then(res => {
    // 保存文件信息到数据库
    return cloudService.callFunction('manageFile', {
      action: 'save',
      fileID: res.fileID,
      fileInfo: {
        name: '文件名',
        type: 'image',
        size: fileSize
      }
    });
  })
  .then(result => {
    console.log('文件上传并保存成功:', result);
  })
  .catch(err => {
    console.error('上传失败:', err);
  });

// 获取文件列表
cloudService.callFunction('manageFile', {
  action: 'list',
  type: 'image',
  page: 1,
  pageSize: 10
})
  .then(result => {
    console.log('文件列表:', result.data);
  })
  .catch(err => {
    console.error('获取文件列表失败:', err);
  });
```

### 数据库初始化

```javascript
// 初始化数据库结构
cloudService.callFunction('initDatabase', {})
  .then(result => {
    console.log('数据库初始化结果:', result);
  })
  .catch(err => {
    console.error('数据库初始化失败:', err);
  });
```

## 部署云函数

1. 在微信开发者工具中，右键点击云函数目录
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成

## 注意事项

1. 云函数默认超时时间为20秒，对于复杂操作请考虑优化
2. 云函数中的npm包需要遵循CommonJS规范
3. 建议统一使用封装好的CloudService来操作云开发功能
4. 云开发资源有限，请合理使用 