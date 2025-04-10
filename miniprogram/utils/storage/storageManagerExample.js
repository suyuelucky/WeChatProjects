/**
 * 存储管理器(StorageManager)使用示例
 * 
 * 本文件展示存储管理器的常见使用场景和最佳实践
 * 遵循ES5标准，确保在微信小程序环境兼容
 * 
 * 作者：AI助手
 * 创建日期：2025-04-08
 */

// 导入依赖
var storageManager = require('./storageManager');

/**
 * 示例1: 基本用法
 * 演示存储管理器的基本读写操作
 */
function 基本用法示例() {
  console.log('===== 基本用法示例 =====');
  
  // 创建存储管理器实例
  var manager = storageManager.createStorageManager();
  
  // 存储数据
  var userProfile = {
    userId: 'user_123',
    name: '张三',
    age: 28,
    preferences: {
      theme: 'dark',
      fontSize: 'medium'
    }
  };
  
  // 将用户配置存储为用户数据类型
  manager.setItem('user_profile', userProfile, { type: 'user' });
  console.log('用户配置已存储');
  
  // 读取数据
  var storedProfile = manager.getItem('user_profile');
  console.log('读取的用户配置:', storedProfile);
  
  // 更新数据
  storedProfile.preferences.theme = 'light';
  manager.setItem('user_profile', storedProfile, { type: 'user' });
  console.log('用户配置已更新');
  
  // 删除数据
  manager.removeItem('user_profile');
  console.log('用户配置已删除');
  
  // 验证删除
  var checkProfile = manager.getItem('user_profile');
  console.log('删除后读取:', checkProfile); // 应为null
}

/**
 * 示例2: 分级存储
 * 演示存储管理器的数据分级存储功能
 */
function 分级存储示例() {
  console.log('===== 分级存储示例 =====');
  
  // 创建存储管理器实例
  var manager = storageManager.createStorageManager();
  
  // 存储不同类型的数据
  
  // 1. 核心数据(高优先级，永不自动清理)
  var appConfig = {
    version: '1.0.0',
    apiEndpoint: 'https://api.example.com',
    lastUpdate: Date.now()
  };
  manager.setItem('app_config', appConfig, { type: 'core' });
  
  // 2. 用户数据(中高优先级，很少自动清理)
  var userData = {
    id: 'user_123',
    name: '李四',
    loginTime: Date.now()
  };
  manager.setItem('current_user', userData, { type: 'user' });
  
  // 3. 工作数据(中优先级，可能被清理)
  var workData = {
    taskId: 'task_456',
    progress: 75,
    updatedAt: Date.now()
  };
  manager.setItem('current_task', workData, { type: 'work' });
  
  // 4. 缓存数据(低优先级，经常被清理)
  var cacheData = {
    queryId: 'query_789',
    results: ['结果1', '结果2', '结果3'],
    timestamp: Date.now()
  };
  manager.setItem('search_results', cacheData, { type: 'cache' });
  
  // 5. 临时数据(最低优先级，随时可能被清理)
  var tempData = {
    id: 'temp_987',
    value: '临时值',
    createdAt: Date.now()
  };
  manager.setItem('temp_value', tempData, { type: 'temp' });
  
  // 按类型获取数据
  var coreItems = manager.getItemsByType('core');
  console.log('核心数据项:', coreItems.length);
  
  var userItems = manager.getItemsByType('user');
  console.log('用户数据项:', userItems.length);
  
  var cacheItems = manager.getItemsByType('cache');
  console.log('缓存数据项:', cacheItems.length);
  
  // 存储信息
  var storageInfo = manager.getStorageInfo();
  console.log('存储项数量:', storageInfo.keys.length);
  console.log('存储使用量:', storageInfo.currentSize, '字节');
  console.log('存储限制:', storageInfo.limitSize, '字节');
  
  // 存储分析
  var analytics = manager.getStorageAnalytics();
  console.log('存储分析:', analytics);
}

/**
 * 示例3: 存储监控与清理
 * 演示存储管理器的配额监控和智能清理功能
 */
function 存储监控与清理示例() {
  console.log('===== 存储监控与清理示例 =====');
  
  // 创建存储管理器实例
  var manager = storageManager.createStorageManager({
    // 设置较小的阈值便于演示
    warningThreshold: 0.3,  // 30%
    criticalThreshold: 0.5  // 50%
  });
  
  // 注册监控回调
  manager.onStorageWarning = function(info) {
    console.log('存储警告: 已使用', (info.currentSize / info.limitSize * 100).toFixed(2) + '%');
    console.log('建议清理一些低优先级数据');
  };
  
  manager.onStorageCritical = function(info) {
    console.log('存储临界警告: 已使用', (info.currentSize / info.limitSize * 100).toFixed(2) + '%');
    console.log('正在自动清理...');
  };
  
  // 添加一些测试数据
  for (var i = 0; i < 20; i++) {
    var data = {
      id: 'temp_' + i,
      value: '临时数据 ' + i,
      size: new Array(1024).join('X') // 约1KB数据
    };
    manager.setItem('temp_data_' + i, data, { type: 'temp' });
  }
  
  // 检查存储状态
  var hasWarning = manager.hasQuotaWarning();
  console.log('存储警告状态:', hasWarning);
  
  if (hasWarning) {
    // 手动清理部分数据
    console.log('手动清理临时数据...');
    manager.cleanupByType('temp');
    
    // 再次检查存储状态
    console.log('清理后警告状态:', manager.hasQuotaWarning());
  }
  
  // 按年龄清理数据
  var oneDayMs = 24 * 60 * 60 * 1000;
  manager.cleanupByAge(oneDayMs);
  console.log('已清理一天前的数据');
  
  // LRU清理
  var freedBytes = manager.cleanupLRU(1024 * 5); // 清理5KB
  console.log('LRU清理释放:', freedBytes, '字节');
}

/**
 * 示例4: 命名空间管理
 * 演示存储管理器的命名空间功能
 */
function 命名空间管理示例() {
  console.log('===== 命名空间管理示例 =====');
  
  // 创建存储管理器实例
  var manager = storageManager.createStorageManager();
  
  // 创建不同的命名空间
  var userNamespace = manager.createNamespace('user');
  var appNamespace = manager.createNamespace('app');
  var cacheNamespace = manager.createNamespace('cache');
  
  // 在不同命名空间存储数据
  userNamespace.setItem('profile', { name: '王五', age: 35 });
  appNamespace.setItem('settings', { theme: 'dark', volume: 80 });
  cacheNamespace.setItem('recent_searches', ['微信小程序', '存储管理', 'JavaScript']);
  
  // 读取命名空间数据
  console.log('用户命名空间数据:', userNamespace.getItem('profile'));
  console.log('应用命名空间数据:', appNamespace.getItem('settings'));
  console.log('缓存命名空间数据:', cacheNamespace.getItem('recent_searches'));
  
  // 获取命名空间列表
  var namespaces = manager.getNamespaces();
  console.log('已创建的命名空间:', namespaces);
  
  // 命名空间存储信息
  var userStorageInfo = userNamespace.getStorageInfo();
  console.log('用户命名空间存储使用:', userStorageInfo.keys.length, '项');
  
  // 清理指定命名空间
  cacheNamespace.clear();
  console.log('缓存命名空间已清理');
  console.log('清理后缓存项:', cacheNamespace.getItem('recent_searches')); // 应为null
  
  // 删除命名空间
  manager.removeNamespace('app');
  console.log('应用命名空间已删除');
  console.log('剩余命名空间:', manager.getNamespaces());
}

/**
 * 示例5: 数据过期与验证
 * 演示存储管理器的数据过期和验证功能
 */
function 数据过期与验证示例() {
  console.log('===== 数据过期与验证示例 =====');
  
  // 创建存储管理器实例
  var manager = storageManager.createStorageManager();
  
  // 注册数据验证器
  manager.registerValidator('positiveNumber', function(value) {
    return typeof value === 'number' && value > 0;
  });
  
  manager.registerValidator('validUser', function(value) {
    return value && 
           typeof value === 'object' && 
           typeof value.name === 'string' && 
           value.name.length > 0 &&
           typeof value.age === 'number' &&
           value.age > 0;
  });
  
  // 使用验证器存储数据
  var validScore = 85;
  var invalidScore = -10;
  
  console.log('存储有效分数:', manager.setItem('valid_score', validScore, { validator: 'positiveNumber' }));
  console.log('存储无效分数:', manager.setItem('invalid_score', invalidScore, { validator: 'positiveNumber' }));
  
  console.log('读取有效分数:', manager.getItem('valid_score'));
  console.log('读取无效分数:', manager.getItem('invalid_score')); // 应为null
  
  // 存储带过期时间的数据
  var now = Date.now();
  var fiveSeconds = 5 * 1000;
  var oneMinute = 60 * 1000;
  
  // 1. 绝对时间过期
  manager.setItem('absolute_expiry', { value: '5秒后过期' }, {
    expiry: {
      strategy: 'absolute',
      time: now + fiveSeconds
    }
  });
  
  // 2. 相对时间过期
  manager.setItem('relative_expiry', { value: '60秒后过期' }, {
    expiry: {
      strategy: 'relative',
      duration: oneMinute
    }
  });
  
  // 3. 滑动窗口过期
  manager.setItem('sliding_expiry', { value: '最后访问后10秒过期' }, {
    expiry: {
      strategy: 'sliding',
      duration: 10 * 1000
    }
  });
  
  console.log('设置了过期时间的数据已存储');
  
  // 注意：实际使用中，过期检查会由定时器自动执行
  // 这里可以通过延时模拟过期检查
  console.log('请等待5秒钟来验证过期...');
  
  // 在实际应用中，可以使用setTimeout模拟过期
  /*
  setTimeout(function() {
    console.log('5秒后检查:');
    console.log('绝对过期项:', manager.getItem('absolute_expiry')); // 应为null
    console.log('相对过期项:', manager.getItem('relative_expiry')); // 应仍存在
    console.log('滑动过期项:', manager.getItem('sliding_expiry')); // 应仍存在
  }, 6000);
  */
}

/**
 * 示例6: 事件通知
 * 演示存储管理器的事件通知系统
 */
function 事件通知示例() {
  console.log('===== 事件通知示例 =====');
  
  // 创建存储管理器实例
  var manager = storageManager.createStorageManager();
  
  // 注册事件监听器
  manager.on('itemAdded', function(key, value) {
    console.log('数据项已添加:', key);
  });
  
  manager.on('itemUpdated', function(key, newValue, oldValue) {
    console.log('数据项已更新:', key);
    console.log('  旧值:', oldValue);
    console.log('  新值:', newValue);
  });
  
  manager.on('itemRemoved', function(key, value) {
    console.log('数据项已删除:', key);
  });
  
  manager.on('storageCleared', function() {
    console.log('存储已清空');
  });
  
  // 执行操作触发事件
  manager.setItem('event_test', { value: '原始值' });
  manager.setItem('event_test', { value: '更新值' });
  manager.removeItem('event_test');
  manager.clear();
  
  // 取消事件监听
  manager.off('itemAdded');
  console.log('已取消itemAdded事件监听');
  
  // 不再触发事件
  manager.setItem('silent_test', { value: '无事件通知' });
  console.log('添加了新项目，但没有事件通知');
}

/**
 * 示例7: 批量操作
 * 演示存储管理器的批量操作功能
 */
function 批量操作示例() {
  console.log('===== 批量操作示例 =====');
  
  // 创建存储管理器实例
  var manager = storageManager.createStorageManager();
  
  // 准备批量数据
  var batchData = {};
  for (var i = 1; i <= 10; i++) {
    batchData['item_' + i] = {
      id: i,
      name: '项目 ' + i,
      value: Math.random() * 100
    };
  }
  
  // 批量设置
  console.log('批量设置10个项目');
  var setResult = manager.setItems(batchData);
  console.log('批量设置结果:', setResult);
  
  // 准备批量获取键列表
  var keysToGet = [];
  for (var i = 1; i <= 5; i++) {
    keysToGet.push('item_' + i);
  }
  
  // 批量获取
  console.log('批量获取5个项目');
  var getResult = manager.getItems(keysToGet);
  console.log('获取的项目数:', Object.keys(getResult).length);
  
  // 准备批量删除键列表
  var keysToRemove = [];
  for (var i = 6; i <= 10; i++) {
    keysToRemove.push('item_' + i);
  }
  
  // 批量删除
  console.log('批量删除5个项目');
  var removeResult = manager.removeItems(keysToRemove);
  console.log('批量删除结果:', removeResult);
  
  // 验证结果
  var remainingKeys = manager.keys();
  console.log('剩余项目数:', remainingKeys.length);
}

// 导出示例函数
module.exports = {
  基本用法示例: 基本用法示例,
  分级存储示例: 分级存储示例,
  存储监控与清理示例: 存储监控与清理示例,
  命名空间管理示例: 命名空间管理示例,
  数据过期与验证示例: 数据过期与验证示例,
  事件通知示例: 事件通知示例,
  批量操作示例: 批量操作示例
}; 