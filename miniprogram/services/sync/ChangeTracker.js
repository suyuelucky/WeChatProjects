/**
 * ChangeTracker组件 - 跟踪本地数据变化，为差量同步提供支持
 * 
 * 创建时间: 2025年04月09日 10:46:25 CST
 * 创建者: Claude 3.7 Sonnet
 * 编辑时间: 2025年04月09日 10:46:59 CST
 * 编辑时间: 2025年04月09日 10:47:47 CST
 */

'use strict';

// 导入依赖
var LocalStorageManager = require('./LocalStorageManager');
var DiffGenerator = require('./DiffGenerator');

/**
 * 变更跟踪器
 * 用于跟踪本地数据的变化，支持增量同步
 * 
 * @class ChangeTracker
 */
function ChangeTracker(options) {
  // 默认选项
  this.options = {
    namespace: 'changes',  // 变更存储命名空间
    maxChanges: 1000,      // 最大变更数量
    includeTimestamp: true, // 是否包含时间戳
    includeOriginalData: false, // 是否包含原始数据（可能增加存储空间）
    trimDiffs: true        // 是否精简差异对象（减少存储体积）
  };
  
  // 合并传入的选项
  if (options) {
    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        this.options[key] = options[key];
      }
    }
  }
  
  // 初始化存储管理器
  this.storageManager = options && options.storageManager || new LocalStorageManager({
    prefix: this.options.namespace + '_'
  });
  
  // 初始化差异生成器
  this.diffGenerator = options && options.diffGenerator || new DiffGenerator();
  
  // 变更存储键
  this.changesKey = this.options.namespace;
}

/**
 * 跟踪数据变更
 * @param {string} collection - 数据集合名称
 * @param {string} id - 数据ID
 * @param {Object} newData - 新数据
 * @param {Object} oldData - 旧数据
 * @param {string} [type] - 变更类型（'create'|'update'|'delete'）
 * @returns {boolean} 是否记录了变更
 */
ChangeTracker.prototype.trackChange = function(collection, id, newData, oldData, type) {
  // 根据数据状态推断变更类型
  if (!type) {
    if (!oldData && newData) {
      type = 'create';
    } else if (oldData && newData) {
      type = 'update';
    } else if (oldData && !newData) {
      type = 'delete';
    } else {
      // 既没有旧数据也没有新数据，无法跟踪变更
      return false;
    }
  }
  
  // 获取现有变更
  var changes = this.storageManager.get(this.changesKey, {});
  
  // 确保集合对象存在
  if (!changes[collection]) {
    changes[collection] = {};
  }
  
  // 构造变更对象
  var change = {
    type: type,
  };
  
  // 添加时间戳
  if (this.options.includeTimestamp) {
    change.timestamp = Date.now();
  }
  
  // 根据变更类型处理数据
  if (type === 'create' || type === 'update') {
    change.data = newData;
    
    // 对于更新，生成数据差异
    if (type === 'update' && oldData) {
      // 生成差异
      var diff = this.diffGenerator.generateDiff(oldData, newData);
      
      // 如果没有实际变化，不记录变更
      if (!diff.changes || Object.keys(diff.changes).length === 0) {
        return false;
      }
      
      // 存储差异
      change.diff = diff;
    }
  } else if (type === 'delete') {
    // 对于删除，可能需要保存原始数据以便恢复
    if (this.options.includeOriginalData) {
      change.originalData = oldData;
    }
  }
  
  // 存储变更
  changes[collection][id] = change;
  
  // 如果变更数量超过限制，移除最早的变更
  this._trimChangesIfNeeded(changes);
  
  // 保存变更
  this.storageManager.set(this.changesKey, changes);
  
  return true;
};

/**
 * 获取变更数据
 * @param {string} [collection] - 数据集合名称，不提供则返回所有集合的变更
 * @param {string} [id] - 数据ID，不提供则返回集合中所有数据的变更
 * @param {Object} [options] - 查询选项
 * @param {number} [options.since] - 开始时间戳，只返回此时间之后的变更
 * @param {number} [options.until] - 截止时间戳，只返回此时间之前的变更
 * @param {Array<string>} [options.types] - 变更类型过滤，如 ['create', 'update']
 * @returns {Object} 符合条件的变更数据
 */
ChangeTracker.prototype.getChanges = function(collection, id, options) {
  // 获取所有变更
  var allChanges = this.storageManager.get(this.changesKey, {});
  var result = {};
  
  // 默认选项
  options = options || {};
  
  // 如果指定集合和ID，直接返回特定变更
  if (collection && id) {
    return (allChanges[collection] && allChanges[collection][id]) || null;
  }
  
  // 如果指定了集合，只返回该集合的变更
  if (collection) {
    var collectionChanges = allChanges[collection] || {};
    
    // 如果没有其他过滤条件，直接返回
    if (!options.since && !options.until && !options.types) {
      return collectionChanges;
    }
    
    // 应用过滤条件
    result[collection] = this._filterChanges(collectionChanges, options);
    return result[collection];
  }
  
  // 处理所有集合
  for (var coll in allChanges) {
    if (allChanges.hasOwnProperty(coll)) {
      // 应用过滤条件
      var filteredChanges = this._filterChanges(allChanges[coll], options);
      
      // 只添加有变更的集合
      if (Object.keys(filteredChanges).length > 0) {
        result[coll] = filteredChanges;
      }
    }
  }
  
  return result;
};

/**
 * 根据条件过滤变更
 * @param {Object} changes - 变更对象
 * @param {Object} options - 过滤选项
 * @returns {Object} 过滤后的变更对象
 * @private
 */
ChangeTracker.prototype._filterChanges = function(changes, options) {
  var result = {};
  
  // 遍历所有变更
  for (var id in changes) {
    if (changes.hasOwnProperty(id)) {
      var change = changes[id];
      var shouldInclude = true;
      
      // 时间过滤
      if (options.since && change.timestamp && change.timestamp < options.since) {
        shouldInclude = false;
      }
      
      if (options.until && change.timestamp && change.timestamp > options.until) {
        shouldInclude = false;
      }
      
      // 类型过滤
      if (options.types && options.types.length > 0 && !options.types.includes(change.type)) {
        shouldInclude = false;
      }
      
      // 如果通过所有过滤条件，添加到结果
      if (shouldInclude) {
        result[id] = change;
      }
    }
  }
  
  return result;
};

/**
 * 清除变更
 * @param {string} [collection] - 数据集合名称，不提供则清除所有集合的变更
 * @param {string} [id] - 数据ID，不提供则清除集合中所有数据的变更
 * @returns {boolean} 是否成功清除
 */
ChangeTracker.prototype.clearChanges = function(collection, id) {
  // 获取所有变更
  var changes = this.storageManager.get(this.changesKey, {});
  
  // 清除特定ID的变更
  if (collection && id) {
    if (changes[collection] && changes[collection][id]) {
      delete changes[collection][id];
      
      // 如果集合为空，删除集合对象
      if (Object.keys(changes[collection]).length === 0) {
        delete changes[collection];
      }
      
      this.storageManager.set(this.changesKey, changes);
      return true;
    }
    return false;
  }
  
  // 清除特定集合的所有变更
  if (collection) {
    if (changes[collection]) {
      delete changes[collection];
      this.storageManager.set(this.changesKey, changes);
      return true;
    }
    return false;
  }
  
  // 清除所有变更
  this.storageManager.set(this.changesKey, {});
  return true;
};

/**
 * 如果变更数量超过限制，移除最早的变更
 * @param {Object} changes - 变更对象
 * @private
 */
ChangeTracker.prototype._trimChangesIfNeeded = function(changes) {
  var count = 0;
  var timestamps = [];
  
  // 计算变更总数并收集时间戳信息
  for (var collection in changes) {
    if (changes.hasOwnProperty(collection)) {
      for (var id in changes[collection]) {
        if (changes[collection].hasOwnProperty(id)) {
          count++;
          var change = changes[collection][id];
          if (change.timestamp) {
            timestamps.push({
              collection: collection,
              id: id,
              timestamp: change.timestamp
            });
          }
        }
      }
    }
  }
  
  // 如果超出限制，删除最早的变更
  if (count > this.options.maxChanges) {
    // 按时间戳排序
    timestamps.sort(function(a, b) {
      return a.timestamp - b.timestamp;
    });
    
    // 需要删除的数量
    var removeCount = count - this.options.maxChanges;
    
    // 删除最早的变更
    for (var i = 0; i < removeCount; i++) {
      var item = timestamps[i];
      delete changes[item.collection][item.id];
      
      // 如果集合为空，删除集合对象
      if (Object.keys(changes[item.collection]).length === 0) {
        delete changes[item.collection];
      }
    }
  }
};

/**
 * 生成变更批次
 * 用于将本地跟踪的变更打包成可以发送到服务器的格式
 * 
 * @param {Object} [options] - 生成选项
 * @param {number} [options.since] - 只包含此时间戳之后的变更
 * @param {Array<string>} [options.collections] - 只包含指定集合的变更
 * @param {boolean} [options.clearAfterGenerate] - 生成后是否清除本地变更
 * @returns {Object} 变更批次对象
 */
ChangeTracker.prototype.generateChangeBatch = function(options) {
  options = options || {};
  
  // 获取变更数据
  var changes = this.getChanges(null, null, {
    since: options.since,
    types: options.types
  });
  
  // 如果指定了集合，只保留这些集合
  if (options.collections && options.collections.length > 0) {
    var filteredChanges = {};
    for (var i = 0; i < options.collections.length; i++) {
      var collection = options.collections[i];
      if (changes[collection]) {
        filteredChanges[collection] = changes[collection];
      }
    }
    changes = filteredChanges;
  }
  
  // 创建变更批次
  var batch = {
    changes: changes,
    timestamp: Date.now(),
    collections: Object.keys(changes)
  };
  
  // 如果没有变更，返回null
  if (batch.collections.length === 0) {
    return null;
  }
  
  // 如果需要，生成后清除本地变更
  if (options.clearAfterGenerate) {
    // 对于每个集合
    for (var collection in changes) {
      if (changes.hasOwnProperty(collection)) {
        // 对于集合中的每个ID
        for (var id in changes[collection]) {
          if (changes[collection].hasOwnProperty(id)) {
            this.clearChanges(collection, id);
          }
        }
      }
    }
  }
  
  return batch;
};

/**
 * 应用变更批次
 * 将变更批次应用到本地数据
 * 
 * @param {Object} batch - 变更批次对象
 * @param {Object} dataService - 数据服务对象，用于存储和获取数据
 * @returns {Object} 应用结果统计
 */
ChangeTracker.prototype.applyChangeBatch = function(batch, dataService) {
  if (!batch || !batch.changes || !dataService) {
    return {
      success: false,
      reason: 'Invalid batch or data service'
    };
  }
  
  var stats = {
    success: true,
    total: 0,
    applied: 0,
    failed: 0,
    details: {}
  };
  
  // 处理每个集合
  for (var collection in batch.changes) {
    if (batch.changes.hasOwnProperty(collection)) {
      // 初始化集合统计
      stats.details[collection] = {
        total: 0,
        applied: 0,
        failed: 0
      };
      
      // 处理集合中的每个数据项
      for (var id in batch.changes[collection]) {
        if (batch.changes[collection].hasOwnProperty(id)) {
          stats.total++;
          stats.details[collection].total++;
          
          var change = batch.changes[collection][id];
          var result = this._applySingleChange(collection, id, change, dataService);
          
          if (result.success) {
            stats.applied++;
            stats.details[collection].applied++;
          } else {
            stats.failed++;
            stats.details[collection].failed++;
            stats.success = false;
          }
        }
      }
    }
  }
  
  return stats;
};

/**
 * 应用单个变更
 * @param {string} collection - 集合名称
 * @param {string} id - 数据ID
 * @param {Object} change - 变更对象
 * @param {Object} dataService - 数据服务对象
 * @returns {Object} 应用结果
 * @private
 */
ChangeTracker.prototype._applySingleChange = function(collection, id, change, dataService) {
  try {
    switch (change.type) {
      case 'create':
      case 'update':
        if (change.data) {
          // 对于创建和更新，直接保存数据
          dataService.set(collection, id, change.data);
          return { success: true };
        }
        break;
        
      case 'delete':
        // 对于删除，从数据服务中移除数据
        dataService.remove(collection, id);
        return { success: true };
        
      default:
        return {
          success: false,
          reason: 'Unknown change type: ' + change.type
        };
    }
    
    return {
      success: false,
      reason: 'Invalid change data'
    };
  } catch (error) {
    return {
      success: false,
      reason: error.message || 'Error applying change',
      error: error
    };
  }
};

module.exports = ChangeTracker; 