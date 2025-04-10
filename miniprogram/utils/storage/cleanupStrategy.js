/**
 * 存储清理策略模块(CleanupStrategy)
 * 实现多种存储清理策略，包括最近最少使用(LRU)、基于优先级和基于过期时间的清理
 * 遵循ES5标准，确保在微信小程序环境兼容
 * 
 * 作者：AI助手
 * 创建日期：2025-04-10
 */

/**
 * 按最近最少使用(LRU)算法选择要清理的项目
 * @param {Object} metadata 存储元数据
 * @param {number} targetBytes 目标释放的字节数
 * @returns {Array<string>} 要删除的键数组
 */
function lruCleanupStrategy(metadata, targetBytes) {
  if (!metadata || !targetBytes) return [];
  
  var items = [];
  var totalSize = 0;
  var keysToRemove = [];
  
  // 收集所有项目并按最后访问时间排序
  for (var key in metadata) {
    if (metadata.hasOwnProperty(key) && key !== '__metadata__') {
      var item = metadata[key];
      
      // 跳过关键数据
      if (item.metadata && item.metadata.priority === 'critical') {
        continue;
      }
      
      items.push({
        key: key,
        lastAccess: item.metadata && item.metadata.lastAccess || 0,
        size: item.metadata && item.metadata.size || 0
      });
    }
  }
  
  // 按最后访问时间升序排序(最早访问的在前面)
  items.sort(function(a, b) {
    return a.lastAccess - b.lastAccess;
  });
  
  // 选择要删除的项目，直到达到目标大小
  for (var i = 0; i < items.length; i++) {
    keysToRemove.push(items[i].key);
    totalSize += items[i].size;
    
    if (totalSize >= targetBytes) {
      break;
    }
  }
  
  return keysToRemove;
}

/**
 * 按优先级选择要清理的项目
 * @param {Object} metadata 存储元数据
 * @param {number} targetBytes 目标释放的字节数
 * @returns {Array<string>} 要删除的键数组
 */
function priorityCleanupStrategy(metadata, targetBytes) {
  if (!metadata || !targetBytes) return [];
  
  // 优先级权重(数字越小优先级越高)
  var priorityWeights = {
    'critical': 0,
    'high': 1,
    'medium': 2,
    'low': 3,
    'temp': 4
  };
  
  var items = [];
  var totalSize = 0;
  var keysToRemove = [];
  
  // 收集所有项目
  for (var key in metadata) {
    if (metadata.hasOwnProperty(key) && key !== '__metadata__') {
      var item = metadata[key];
      var priority = (item.metadata && item.metadata.priority) || 'medium';
      
      // 跳过关键数据
      if (priority === 'critical') {
        continue;
      }
      
      items.push({
        key: key,
        priority: priority,
        weight: priorityWeights[priority] || 2,
        lastAccess: item.metadata && item.metadata.lastAccess || 0,
        size: item.metadata && item.metadata.size || 0
      });
    }
  }
  
  // 先按优先级排序，再按最后访问时间排序
  items.sort(function(a, b) {
    if (a.weight !== b.weight) {
      return b.weight - a.weight; // 优先级低的先删除
    }
    return a.lastAccess - b.lastAccess; // 相同优先级，最早访问的先删除
  });
  
  // 选择要删除的项目，直到达到目标大小
  for (var i = 0; i < items.length; i++) {
    keysToRemove.push(items[i].key);
    totalSize += items[i].size;
    
    if (totalSize >= targetBytes) {
      break;
    }
  }
  
  return keysToRemove;
}

/**
 * 按过期时间选择要清理的项目
 * @param {Object} metadata 存储元数据
 * @param {number} [targetBytes] 目标释放的字节数(可选)
 * @param {number} [now] 当前时间(可选，默认为当前时间戳)
 * @returns {Array<string>} 要删除的键数组
 */
function expiryCleanupStrategy(metadata, targetBytes, now) {
  if (!metadata) return [];
  
  now = now || Date.now();
  var items = [];
  var totalSize = 0;
  var keysToRemove = [];
  
  // 收集所有项目
  for (var key in metadata) {
    if (metadata.hasOwnProperty(key) && key !== '__metadata__') {
      var item = metadata[key];
      var expiry = item.metadata && item.metadata.expiry;
      
      // 如果有过期时间且已过期，加入删除列表
      if (expiry && expiry < now) {
        items.push({
          key: key,
          expiry: expiry,
          size: item.metadata && item.metadata.size || 0
        });
      }
    }
  }
  
  // 按过期时间升序排序(最早过期的在前面)
  items.sort(function(a, b) {
    return a.expiry - b.expiry;
  });
  
  // 如果指定了目标大小，只删除到达目标大小的过期项
  if (targetBytes) {
    for (var i = 0; i < items.length; i++) {
      keysToRemove.push(items[i].key);
      totalSize += items[i].size;
      
      if (totalSize >= targetBytes) {
        break;
      }
    }
  } else {
    // 否则删除所有过期项
    keysToRemove = items.map(function(item) {
      return item.key;
    });
  }
  
  return keysToRemove;
}

/**
 * 复合清理策略：先清理过期数据，再按优先级清理未过期数据
 * @param {Object} metadata 存储元数据
 * @param {number} targetBytes 目标释放的字节数
 * @param {number} [now] 当前时间(可选，默认为当前时间戳)
 * @returns {Array<string>} 要删除的键数组
 */
function compositeCleanupStrategy(metadata, targetBytes, now) {
  if (!metadata || !targetBytes) return [];
  
  now = now || Date.now();
  
  // 第一步：清理过期数据
  var expiredKeys = expiryCleanupStrategy(metadata, null, now);
  var freedBytes = 0;
  
  // 计算已释放的空间
  for (var i = 0; i < expiredKeys.length; i++) {
    var key = expiredKeys[i];
    var item = metadata[key];
    if (item && item.metadata) {
      freedBytes += item.metadata.size || 0;
    }
  }
  
  // 如果已经达到目标，直接返回
  if (freedBytes >= targetBytes) {
    return expiredKeys;
  }
  
  // 第二步：根据优先级清理更多数据
  var remainingTarget = targetBytes - freedBytes;
  
  // 创建临时元数据副本，移除已选择的过期键
  var tempMetadata = {};
  for (var key in metadata) {
    if (metadata.hasOwnProperty(key) && expiredKeys.indexOf(key) === -1) {
      tempMetadata[key] = metadata[key];
    }
  }
  
  var priorityKeys = priorityCleanupStrategy(tempMetadata, remainingTarget);
  
  // 合并结果
  return expiredKeys.concat(priorityKeys);
}

// 导出所有策略
module.exports = {
  lru: lruCleanupStrategy,
  priority: priorityCleanupStrategy,
  expiry: expiryCleanupStrategy,
  composite: compositeCleanupStrategy
}; 