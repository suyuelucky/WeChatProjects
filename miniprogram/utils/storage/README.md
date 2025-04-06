# 本地存储管理系统

本模块提供了微信小程序中本地存储的全面解决方案，包括数据存储、类型管理、存储空间管理和离线同步功能。

## 系统架构

本地存储管理系统由以下几个核心组件组成：

1. **基础存储工具 (storageUtils.js)**
   - 对wx.setStorage等API的封装
   - 提供统一的错误处理机制
   - 支持同步和异步操作模式

2. **数据类型管理 (storageDataManager.js)**
   - 基于键前缀的数据分类
   - 支持核心业务数据、用户数据、缓存数据等不同类型
   - 自动管理存储项的元数据

3. **存储空间管理 (storageManager.js)**
   - 监控存储空间使用情况
   - 自动清理策略（基于存储类型和优先级）
   - 存储使用情况分析和报告

4. **离线存储同步 (offlineStorageSync.js)**
   - 离线操作队列管理
   - 支持优先级同步
   - 冲突检测和解决
   - 断网重连后自动同步

5. **存储服务 (storageService.js)**
   - 统一的存储接口
   - 集成本地存储和云端存储
   - 事件通知机制

## 使用方法

### 基本使用

```javascript
// 引入存储服务单例
var storageService = require('../../services/storageService').getStorageServiceInstance();

// 保存数据
storageService.saveData('work', 'my_key', { 
  content: '这是要保存的数据内容', 
  timestamp: Date.now() 
}).then(function() {
  console.log('保存成功');
}).catch(function(error) {
  console.error('保存失败:', error);
});

// 读取数据
storageService.getData('work', 'my_key', null).then(function(data) {
  if (data) {
    console.log('读取到的数据:', data);
  } else {
    console.log('数据不存在');
  }
});

// 删除数据
storageService.removeData('work', 'my_key').then(function() {
  console.log('删除成功');
});
```

### 数据类型管理

```javascript
// 引入数据类型管理器
var dataManager = require('../../utils/storageDataManager').dataManager;

// 存储不同类型的数据
dataManager.saveCore('my_core_data', { name: '核心数据' });
dataManager.saveUser('user_profile', { name: '用户数据' });
dataManager.saveWork('work_item', { name: '工作数据' });
dataManager.saveCache('cache_data', { name: '缓存数据' });
dataManager.saveTemp('temp_data', { name: '临时数据' });

// 获取数据
dataManager.getUser('user_profile').then(function(data) {
  console.log('用户数据:', data);
});

// 清除特定类型数据
dataManager.clearCache().then(function() {
  console.log('所有缓存已清除');
});
```

### 存储空间管理

```javascript
// 引入存储空间管理器
var storageManager = require('../../utils/storageManager').getStorageManagerInstance();

// 获取存储空间信息
storageManager.getStorageSummary().then(function(info) {
  console.log('已使用空间:', info.currentSize, '总空间:', info.limitSize);
  console.log('使用率:', info.percentUsed + '%');
  console.log('存储状态:', info.status);
});

// 手动清理存储空间
storageManager.cleanupStorage(true).then(function(freedSpace) {
  console.log('释放了 ' + freedSpace + ' 字节空间');
});

// 添加存储状态监听
var removeListener = storageManager.addListener(function(event, data) {
  if (event === 'storageInfoUpdated') {
    console.log('存储信息已更新:', data);
  } else if (event === 'storageAutoCleanup') {
    console.log('自动清理释放了空间:', data.cleanedSize);
  }
});

// 移除监听
removeListener();
```

### 离线同步

```javascript
// 引入离线同步管理器
var offlineSync = require('../../utils/offlineStorageSync').getOfflineSyncInstance();
var SyncOperationType = offlineSync.SyncOperationType;
var SyncPriority = offlineSync.SyncPriority;

// 注册数据类型的同步处理器
offlineSync.registerHandler('work', {
  // 同步方法，处理数据与服务器同步
  sync: function(operationType, data) {
    return new Promise(function(resolve, reject) {
      // 实际项目中，这里应该调用网络API
      if (operationType === SyncOperationType.UPDATE) {
        console.log('模拟上传数据:', data);
        resolve({ success: true });
      } else if (operationType === SyncOperationType.DELETE) {
        console.log('模拟删除数据:', data);
        resolve({ success: true });
      } else {
        reject(new Error('不支持的操作类型'));
      }
    });
  },
  
  // 数据验证方法
  validateData: function(data, operationType) {
    return data && data.key;
  },
  
  // 冲突解决方法
  resolveConflict: function(clientData, serverData, strategy) {
    return new Promise(function(resolve) {
      // 根据策略解决冲突
      if (strategy === 'server-wins') {
        resolve(serverData);
      } else {
        resolve(clientData);
      }
    });
  }
});

// 添加同步操作
offlineSync.addToSyncQueue('work', SyncOperationType.UPDATE, {
  key: 'work_item',
  data: {
    content: '需要同步的内容',
    updatedAt: Date.now()
  }
}, {
  priority: SyncPriority.HIGH
}).then(function(operationId) {
  console.log('已添加同步操作:', operationId);
});

// 启动同步
offlineSync.startSync().then(function(result) {
  if (result) {
    console.log('同步已执行');
  } else {
    console.log('没有需要同步的数据或无法同步');
  }
});
```

## 事件监听

系统提供了事件监听机制，便于应用响应存储系统的各种状态变化：

```javascript
var eventBus = require('../../utils/eventBus');

// 监听数据变更事件
eventBus.on('storage:dataChanged', function(data) {
  console.log('数据变更:', data.type, data.collection, data.key);
});

// 监听同步事件
eventBus.on('offlineSync:syncCompleted', function(data) {
  console.log('同步完成:', data.successful, '成功,', data.failed, '失败');
});

// 监听存储空间警告
eventBus.on('storage:spaceWarning', function(data) {
  console.log('存储空间警告! 使用率:', data.percentUsed + '%');
});

// 监听网络状态变化
eventBus.on('storage:networkChanged', function(data) {
  console.log('网络状态变化:', data.isConnected ? '在线' : '离线');
});
```

## 系统限制与注意事项

1. **存储大小限制**
   - 微信小程序本地存储限制为10MB，请合理规划存储使用

2. **ES5兼容性**
   - 所有代码均遵循ES5标准，确保最大兼容性

3. **性能考虑**
   - 大数据量存储时应注意性能影响
   - 建议将大文件（如图片）使用FileSystem接口或云存储

4. **存储加密**
   - 敏感数据建议使用加密存储
   - 可使用wx.cloud.callFunction进行加解密操作

5. **数据备份**
   - 重要数据应定期同步到云端
   - 利用离线同步机制确保数据安全

## 演示页面

系统包含一个完整的演示页面，可通过以下路径访问：

```
/pages/storage-demo/storage-demo
```

演示页面提供了存储系统各功能的直观展示，包括：
- 基础存储操作
- 同步管理
- 空间管理
- 调试日志 