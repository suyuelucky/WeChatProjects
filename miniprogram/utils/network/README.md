# ConfigManager 组件

> 配置管理器组件，为网络请求提供灵活、高效的配置管理功能，支持多层配置继承和动态配置更新。

## 功能概述

ConfigManager 是一个专为微信小程序设计的配置管理组件，提供了强大的配置管理能力，包括全局配置、请求组配置和单次请求配置的三层继承结构。该组件采用测试先行的开发模式，确保性能稳定和功能可靠。

## 核心特性

- **三层配置继承结构**：全局配置 → 请求组配置 → 单次请求配置
- **智能配置合并**：深度合并策略，支持复杂嵌套对象
- **配置路径访问**：便捷的配置路径访问和修改API
- **配置变更通知**：灵活的配置变更订阅机制
- **配置预设**：内置多种场景配置预设
- **配置持久化**：支持配置存储和版本管理
- **配置校验**：全面的配置有效性验证
- **高性能设计**：经过优化的性能表现，适合高频操作
- **ES5语法兼容**：确保在所有小程序环境中可靠运行

## 安装与引入

```js
// 引入ConfigManager
const ConfigManager = require('./utils/network/ConfigManager');

// 创建实例
const configManager = new ConfigManager({
  // 可选的初始全局配置
  core: {
    baseURL: 'https://api.example.com',
    timeout: 10000
  }
});
```

## 基本使用

### 全局配置管理

```js
// 获取全局配置
const globalConfig = configManager.getGlobalConfig();

// 更新全局配置
configManager.updateGlobalConfig({
  core: {
    timeout: 15000,
    headers: {
      'Authorization': 'Bearer token123'
    }
  }
});

// 重置全局配置
configManager.resetGlobalConfig();
```

### 请求组配置管理

```js
// 创建请求组
configManager.createRequestGroup('userAPI', {
  core: {
    baseURL: 'https://api.example.com/users',
    headers: {
      'X-API-Key': 'group-specific-key'
    }
  }
});

// 获取请求组配置
const groupConfig = configManager.getGroupConfig('userAPI');

// 更新请求组配置
configManager.updateGroupConfig('userAPI', {
  retry: {
    maxRetryTimes: 5
  }
});
```

### 单次请求配置

```js
// 创建完整请求配置（合并三层配置）
const requestConfig = configManager.createRequestConfig({
  core: {
    url: '/profile',
    method: 'POST',
    data: { userId: 123 }
  }
}, 'userAPI'); // 可选的请求组ID
```

### 配置路径访问

```js
// 获取特定配置路径的值
const timeout = configManager.getConfigValue('core.timeout');
const retryEnabled = configManager.getConfigValue('retry.enableRetry', 'userAPI');

// 设置特定配置路径的值
configManager.setConfigValue('core.timeout', 20000);
configManager.setConfigValue('cache.enableCache', true, 'userAPI');
```

### 配置变更订阅

```js
// 订阅配置变更
const subId = configManager.subscribeToConfigChanges('core.timeout', function(newValue, changes) {
  console.log('超时设置已更改为:', newValue);
});

// 取消订阅
configManager.unsubscribeFromConfigChanges(subId);
```

### 配置持久化

```js
// 持久化全局配置
configManager.persistConfig('myApp_NetworkConfig');

// 加载持久化配置
configManager.loadPersistedConfig('myApp_NetworkConfig');

// 保存配置版本
configManager.saveConfigVersion('生产环境配置_v1');

// 加载配置版本
configManager.loadConfigVersion('v_1620000000000');
```

## API参考

### 构造函数

```js
new ConfigManager(globalConfig)
```

- **参数**
  - `globalConfig` (Object, 可选): 初始全局配置

### 全局配置方法

- **getGlobalConfig()**: 获取全局配置的深拷贝
- **updateGlobalConfig(configUpdates)**: 更新全局配置
- **resetGlobalConfig(configPaths)**: 重置全局配置

### 请求组方法

- **createRequestGroup(groupId, groupConfig)**: 创建请求组
- **getGroupConfig(groupId)**: 获取请求组配置
- **updateGroupConfig(groupId, configUpdates)**: 更新请求组配置
- **deleteRequestGroup(groupId)**: 删除请求组
- **listRequestGroups()**: 列出所有请求组

### 请求配置方法

- **createRequestConfig(requestConfig, groupId)**: 创建请求配置
- **validateRequestConfig(config)**: 验证请求配置有效性
- **applyConfigPreset(presetName)**: 应用配置预设

### 配置路径访问

- **getConfigValue(path, groupId, defaultValue)**: 获取配置值
- **setConfigValue(path, value, groupId)**: 设置配置值

### 配置变更通知

- **subscribeToConfigChanges(path, callback, options)**: 订阅配置变更
- **unsubscribeFromConfigChanges(subscriptionId)**: 取消订阅

### 配置持久化

- **persistConfig(storageKey, includePaths, excludePaths)**: 持久化配置
- **loadPersistedConfig(storageKey, merge)**: 加载持久化配置
- **saveConfigVersion(versionName, metadata)**: 保存配置版本
- **loadConfigVersion(versionId, apply)**: 加载配置版本
- **listConfigVersions()**: 列出配置版本

## 配置结构参考

ConfigManager 支持以下配置结构：

```js
{
  core: {
    baseURL: '',              // 基础URL
    timeout: 30000,           // 请求超时时间
    method: 'GET',            // 请求方法
    headers: {                // 请求头
      'Content-Type': 'application/json'
    },
    dataType: 'json',         // 响应数据类型
    responseEncoding: 'utf8'  // 响应编码
  },
  retry: {
    enableRetry: true,        // 启用重试
    maxRetryTimes: 3,         // 最大重试次数
    retryDelay: 1000,         // 重试延迟
    retryMode: 'exponential'  // 重试模式
  },
  cache: {
    enableCache: false,       // 启用缓存
    cacheMaxAge: 300,         // 缓存最大有效期
    cacheMode: 'memory'       // 缓存模式
  },
  interceptor: {
    enableGlobalInterceptors: true // 启用全局拦截器
  },
  security: {
    validateSSL: true,        // 验证SSL
    enableCSRF: false         // 启用CSRF保护
  },
  performance: {
    enableCompression: false, // 启用压缩
    maxConcurrentRequests: 5  // 最大并发请求数
  }
}
```

## 内置配置预设

组件提供了以下内置配置预设：

- **DEFAULT**: 默认预设，平衡性能和可靠性
- **HIGH_PERFORMANCE**: 高性能预设，优化缓存和并发
- **HIGH_RELIABILITY**: 高可靠性预设，增强重试和容错能力
- **LOW_POWER**: 低功耗预设，优化电量消耗

## 性能优化设计

本组件遵循"体验优化与极致性能"原则，采用以下优化策略：

1. **配置深拷贝优化**：智能判断对象类型，避免不必要的递归
2. **合并策略优化**：针对不同数据类型采用不同合并策略
3. **内存管理**：避免闭包陷阱，及时清理不再使用的引用
4. **计算复杂度控制**：关键方法复杂度控制在O(n)以内
5. **测试验证**：全面单元测试覆盖，验证处理性能满足要求

## 最佳实践

1. **合理使用配置层级**：将通用配置放在全局，特定配置放在请求组或单次请求
2. **避免频繁更新全局配置**：全局配置变更会触发订阅回调，影响性能
3. **使用配置路径访问**：优先使用路径访问而非完整配置对象操作
4. **合理设计请求组**：按业务域或功能模块划分请求组
5. **配置验证**：在开发阶段开启严格验证，生产环境可适当放宽

## 常见问题解答

**Q: 如何处理多环境配置?**  
A: 可以利用配置版本功能，为每个环境保存单独的配置版本，或使用外部环境变量动态构建配置。

**Q: 配置更新是否是响应式的?**  
A: 不是自动响应式的，但可以通过订阅机制实现类似效果，在配置变更时收到通知。

**Q: 组件性能如何?**  
A: 组件经过性能优化，单次配置处理操作通常在1ms以内完成，适合高频调用场景。

## 版本历史

- **1.0.0**: 初始版本，完整实现基础功能 