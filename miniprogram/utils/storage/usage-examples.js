/**
 * 离线存储适配器使用示例
 * 
 * 本文件展示离线存储适配器的常见使用场景和最佳实践
 * 遵循ES5标准，确保在微信小程序环境兼容
 * 
 * 作者：AI助手
 * 创建日期：2025-04-07
 */

// 导入依赖
var storageAdapterFactory = require('./storageAdapterFactory');

/**
 * 示例1：基本用法
 * 演示离线存储适配器的基本读写操作
 */
function 基本用法示例() {
  console.log('===== 基本用法示例 =====');
  
  // 获取存储适配器工厂实例
  var factory = storageAdapterFactory.getStorageAdapterFactoryInstance();
  
  // 获取离线存储适配器
  var adapter = factory.getAdapter('offline', {
    prefix: 'example_',
    maxRetryCount: 3
  });
  
  // 存储数据
  var userData = {
    userId: 'user_123',
    name: '张三',
    lastLogin: Date.now(),
    preferences: {
      theme: 'dark',
      fontSize: 'medium'
    }
  };
  
  adapter.setItem('user_profile', userData);
  console.log('数据已存储');
  
  // 读取数据
  var storedData = adapter.getItem('user_profile');
  console.log('读取的数据:', storedData);
  
  // 删除数据
  adapter.removeItem('user_profile');
  console.log('数据已删除');
  
  // 验证删除
  var checkData = adapter.getItem('user_profile');
  console.log('删除后读取:', checkData); // 应为null
}

/**
 * 示例2：离线操作
 * 演示在离线状态下的数据操作及同步
 */
function 离线操作示例() {
  console.log('===== 离线操作示例 =====');
  
  var factory = storageAdapterFactory.getStorageAdapterFactoryInstance();
  var adapter = factory.getAdapter('offline');
  
  // 注册网络状态变化监听
  adapter.onNetworkStateChange = function(state) {
    console.log('网络状态变化:', state);
    
    // 当网络恢复时自动同步
    if (state === 'online') {
      console.log('网络已恢复，开始同步数据...');
      adapter.sync();
    }
  };
  
  // 模拟网络断开
  adapter.simulateNetworkState('offline');
  console.log('当前网络状态:', adapter.getNetworkState());
  
  // 离线状态下存储数据
  var offlineData = {
    id: 'offline_' + Date.now(),
    content: '离线创建的内容',
    createdAt: Date.now()
  };
  
  adapter.setItem('offline_doc', offlineData);
  console.log('离线数据已存储');
  
  // 查看同步队列
  var queue = adapter.getSyncQueue();
  console.log('同步队列:', queue);
  
  // 模拟网络恢复
  adapter.simulateNetworkState('online');
  
  // 手动触发同步
  var syncResult = adapter.sync();
  console.log('同步结果:', syncResult);
  
  // 查看同步后的队列
  queue = adapter.getSyncQueue();
  console.log('同步后队列:', queue);
}

/**
 * 示例3：存储管理
 * 演示存储空间管理和清理
 */
function 存储管理示例() {
  console.log('===== 存储管理示例 =====');
  
  var factory = storageAdapterFactory.getStorageAdapterFactoryInstance();
  var adapter = factory.getAdapter('offline');
  
  // 获取存储信息
  var storageInfo = adapter.getStorageInfo();
  console.log('当前存储信息:', storageInfo);
  
  // 模拟存储配额告警
  if (storageInfo.currentSize > storageInfo.limitSize * 0.8) {
    console.log('存储空间告警: 已使用', 
                Math.round(storageInfo.currentSize / storageInfo.limitSize * 100) + '%');
    
    // 清理最近最少使用的数据
    var bytesToFree = Math.round(storageInfo.limitSize * 0.2); // 清理20%的空间
    var freedBytes = adapter.cleanLeastRecentlyUsed(bytesToFree);
    
    console.log('已清理', freedBytes, '字节存储空间');
    
    // 再次获取存储信息
    storageInfo = adapter.getStorageInfo();
    console.log('清理后存储信息:', storageInfo);
  }
  
  // 获取所有存储的键
  var keys = adapter.keys();
  console.log('存储的所有键:', keys);
}

/**
 * 示例4：数据冲突处理
 * 演示离线同步时的数据冲突解决
 */
function 数据冲突处理示例() {
  console.log('===== 数据冲突处理示例 =====');
  
  var factory = storageAdapterFactory.getStorageAdapterFactoryInstance();
  
  // 创建使用客户端优先策略的适配器
  var adapter = factory.getAdapter('offline', {
    conflictStrategy: 'client-wins'
  });
  
  // 模拟数据冲突场景
  // 1. 先创建一个本地数据
  var localData = {
    id: 'doc_123',
    title: '本地标题',
    content: '本地内容',
    updatedAt: Date.now() - 1000 // 一秒前更新
  };
  
  adapter.setItem('conflicting_doc', localData);
  console.log('已保存本地版本');
  
  // 2. 模拟服务器上有更新的版本
  var serverData = {
    id: 'doc_123',
    title: '服务器标题',
    content: '服务器内容',
    updatedAt: Date.now() // 最新更新
  };
  
  // 模拟网络断开
  adapter.simulateNetworkState('offline');
  
  // 3. 在离线状态下修改本地数据
  var updatedLocalData = {
    id: 'doc_123',
    title: '修改后的标题',
    content: '修改后的内容',
    updatedAt: Date.now() + 1000 // 未来更新（确保时间戳更新）
  };
  
  adapter.setItem('conflicting_doc', updatedLocalData);
  console.log('已在离线状态更新本地数据');
  
  // 4. 模拟网络恢复，并且服务器上有冲突数据
  adapter.simulateNetworkState('online');
  
  // 设置冲突监听器
  adapter.onConflict = function(localData, serverData, key) {
    console.log('检测到数据冲突:', key);
    console.log('- 本地数据:', localData);
    console.log('- 服务器数据:', serverData);
    
    // 根据策略返回要保留的数据
    // 这里我们使用合并策略
    var mergedData = {
      id: localData.id,
      title: localData.title, // 保留本地标题
      content: serverData.content, // 使用服务器内容
      updatedAt: Math.max(localData.updatedAt, serverData.updatedAt)
    };
    
    console.log('合并后的数据:', mergedData);
    return mergedData;
  };
  
  // 5. 同步并处理冲突
  adapter.sync();
  
  // 6. 查看同步后的结果
  var finalData = adapter.getItem('conflicting_doc');
  console.log('同步后的数据:', finalData);
}

/**
 * 示例5：批量操作
 * 演示批量数据操作和性能优化
 */
function 批量操作示例() {
  console.log('===== 批量操作示例 =====');
  
  var factory = storageAdapterFactory.getStorageAdapterFactoryInstance();
  var adapter = factory.getAdapter('offline');
  
  // 批量存储
  console.log('开始批量存储测试...');
  var batchSize = 100;
  var startTime = Date.now();
  
  for (var i = 0; i < batchSize; i++) {
    var item = {
      id: 'batch_item_' + i,
      value: '批量测试项 #' + i,
      timestamp: startTime + i
    };
    
    adapter.setItem('batch_' + i, item);
  }
  
  var endTime = Date.now();
  console.log('批量存储完成，共', batchSize, '项，耗时', (endTime - startTime), 'ms');
  
  // 批量读取
  console.log('开始批量读取测试...');
  startTime = Date.now();
  var readCount = 0;
  
  for (var i = 0; i < batchSize; i++) {
    var item = adapter.getItem('batch_' + i);
    if (item) readCount++;
  }
  
  endTime = Date.now();
  console.log('批量读取完成，成功读取', readCount, '项，耗时', (endTime - startTime), 'ms');
  
  // 清理测试数据
  adapter.clear();
  console.log('测试数据已清理');
}

// 导出示例函数
module.exports = {
  基本用法示例: 基本用法示例,
  离线操作示例: 离线操作示例,
  存储管理示例: 存储管理示例,
  数据冲突处理示例: 数据冲突处理示例,
  批量操作示例: 批量操作示例
}; 