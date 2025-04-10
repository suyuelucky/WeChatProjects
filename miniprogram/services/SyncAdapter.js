/**
 * SyncAdapter - 同步适配器
 * 负责与具体数据源的通信和转换，隔离同步逻辑与数据源实现细节
 * 
 * 创建时间: 2025年4月9日 08时59分52秒 CST
 * 创建者: Claude 3.7 Sonnet
 * 编辑时间: 2025年4月9日 10时15分37秒 CST
 */

var EventBus = require('../utils/eventBus.js');

/**
 * 同步适配器
 * @namespace SyncAdapter
 */
var SyncAdapter = {
  /**
   * 创建新的同步适配器实例
   * @return {Object} 适配器实例
   */
  create: function() {
    // 创建新实例
    var adapter = Object.create(this);
    
    // 初始化实例
    adapter.type = null;
    adapter.config = {};
    adapter.lastSyncMarkers = {};
    
    return adapter;
  },
  
  /**
   * 初始化同步适配器
   * @param {Object} options 初始化选项
   * @param {String} options.type 适配器类型('local'|'cloud')
   * @param {Object} options.config 配置选项
   * @return {Object} 当前实例
   */
  init: function(options) {
    // 处理参数
    options = options || {};
    this.type = options.type || 'local';
    this.config = options.config || {};
    
    // 初始化存储
    this._initStorage();
    
    // 初始化同步标记
    this._initSyncMarkers();
    
    console.log('同步适配器初始化完成，类型:', this.type);
    
    // 触发事件
    EventBus.emit('adapter:connected', {
      type: this.type,
      timestamp: new Date().toISOString()
    });
    
    return this;
  },
  
  /**
   * 初始化存储
   * @private
   */
  _initStorage: function() {
    if (this.type === 'local') {
      // 本地存储
      this.storage = {
        get: function(key) {
          try {
            return Promise.resolve(wx.getStorageSync(key));
          } catch (err) {
            return Promise.reject(err);
          }
        },
        set: function(key, value) {
          try {
            wx.setStorageSync(key, value);
            return Promise.resolve(true);
          } catch (err) {
            return Promise.reject(err);
          }
        },
        remove: function(key) {
          try {
            wx.removeStorageSync(key);
            return Promise.resolve(true);
          } catch (err) {
            return Promise.reject(err);
          }
        }
      };
    } else if (this.type === 'cloud') {
      // 云端存储实现
      this.storage = {
        get: function(key) {
          return new Promise(function(resolve, reject) {
            // 使用微信云开发API获取数据
            wx.cloud.callFunction({
              name: 'dataSync',
              data: {
                action: 'get',
                key: key
              }
            })
            .then(function(res) {
              // 检查响应状态
              if (res.result && res.result.success) {
                resolve(res.result.data);
              } else {
                resolve(null); // 数据不存在返回null
              }
            })
            .catch(function(err) {
              console.error('云端数据获取失败:', err);
              reject(err);
            });
          });
        },
        set: function(key, value) {
          return new Promise(function(resolve, reject) {
            // 使用微信云开发API保存数据
            wx.cloud.callFunction({
              name: 'dataSync',
              data: {
                action: 'set',
                key: key,
                value: value
              }
            })
            .then(function(res) {
              if (res.result && res.result.success) {
                resolve(true);
              } else {
                reject(new Error(res.result ? res.result.message : '云端保存失败'));
              }
            })
            .catch(function(err) {
              console.error('云端数据保存失败:', err);
              reject(err);
            });
          });
        },
        remove: function(key) {
          return new Promise(function(resolve, reject) {
            // 使用微信云开发API删除数据
            wx.cloud.callFunction({
              name: 'dataSync',
              data: {
                action: 'remove',
                key: key
              }
            })
            .then(function(res) {
              if (res.result && res.result.success) {
                resolve(true);
              } else {
                reject(new Error(res.result ? res.result.message : '云端删除失败'));
              }
            })
            .catch(function(err) {
              console.error('云端数据删除失败:', err);
              reject(err);
            });
          });
        },
        query: function(collection, query) {
          return new Promise(function(resolve, reject) {
            // 使用微信云开发API查询数据
            wx.cloud.callFunction({
              name: 'dataSync',
              data: {
                action: 'query',
                collection: collection,
                query: query
              }
            })
            .then(function(res) {
              if (res.result && res.result.success) {
                resolve(res.result.data || []);
              } else {
                resolve([]); // 查询失败返回空数组
              }
            })
            .catch(function(err) {
              console.error('云端数据查询失败:', err);
              reject(err);
            });
          });
        }
      };
    } else {
      throw new Error('不支持的适配器类型: ' + this.type);
    }
  },
  
  /**
   * 初始化同步标记
   * @private
   */
  _initSyncMarkers: function() {
    var self = this;
    
    try {
      // 从存储加载同步标记
      var key = 'sync_markers_' + this.type;
      this.storage.get(key)
        .then(function(markers) {
          if (markers) {
            self.lastSyncMarkers = markers;
            console.log('已加载同步标记:', markers);
          } else {
            self.lastSyncMarkers = {};
            self.storage.set(key, self.lastSyncMarkers);
          }
        })
        .catch(function(err) {
          console.error('加载同步标记失败:', err);
          self.lastSyncMarkers = {};
        });
    } catch (err) {
      console.error('初始化同步标记失败:', err);
      this.lastSyncMarkers = {};
    }
  },
  
  /**
   * 保存同步标记
   * @private
   */
  _saveSyncMarkers: function() {
    var key = 'sync_markers_' + this.type;
    return this.storage.set(key, this.lastSyncMarkers)
      .catch(function(err) {
        console.error('保存同步标记失败:', err);
        return Promise.reject(err);
      });
  },
  
  /**
   * 获取数据
   * @param {String} collection 集合名称
   * @param {String} id 数据ID
   * @param {Object} options 可选参数
   * @return {Promise<Object>} 数据对象
   */
  get: function(collection, id, options) {
    var key = this._getItemKey(collection, id);
    return this.storage.get(key);
  },
  
  /**
   * 保存数据
   * @param {String} collection 集合名称
   * @param {String} id 数据ID
   * @param {Object} data 数据对象
   * @param {Object} options 可选参数
   * @return {Promise<Object>} 保存结果
   */
  save: function(collection, id, data, options) {
    var self = this;
    var key = this._getItemKey(collection, id);
    
    // 添加元数据
    var now = new Date().toISOString();
    data._meta = data._meta || {};
    data._meta.updatedAt = now;
    data._meta.collection = collection;
    data._meta.id = id;
    
    if (!data._meta.createdAt) {
      data._meta.createdAt = now;
    }
    
    if (this.type === 'local') {
      // 标记为本地修改
      data._meta.localModified = true;
    }
    
    return this.storage.set(key, data)
      .then(function() {
        // 触发事件
        EventBus.emit('adapter:data:changed', {
          type: self.type,
          collection: collection,
          id: id,
          operation: 'save',
          timestamp: now,
          data: data
        });
        
        return data;
      });
  },
  
  /**
   * 删除数据
   * @param {String} collection 集合名称
   * @param {String} id 数据ID
   * @param {Object} options 可选参数
   * @return {Promise<Boolean>} 删除结果
   */
  remove: function(collection, id, options) {
    var self = this;
    var key = this._getItemKey(collection, id);
    options = options || {};
    
    // 软删除逻辑
    if (options.softDelete) {
      return this.get(collection, id)
        .then(function(data) {
          if (data) {
            data._meta = data._meta || {};
            data._meta.deleted = true;
            data._meta.deletedAt = new Date().toISOString();
            
            return self.save(collection, id, data);
          }
          return true;
        })
        .then(function() {
          // 触发事件
          EventBus.emit('adapter:data:changed', {
            type: self.type,
            collection: collection,
            id: id,
            operation: 'softDelete',
            timestamp: new Date().toISOString()
          });
          
          return true;
        });
    }
    
    // 硬删除逻辑
    return this.storage.remove(key)
      .then(function() {
        // 触发事件
        EventBus.emit('adapter:data:changed', {
          type: self.type,
          collection: collection,
          id: id,
          operation: 'remove',
          timestamp: new Date().toISOString()
        });
        
        return true;
      });
  },
  
  /**
   * 查询数据
   * @param {String} collection 集合名称
   * @param {Object} query 查询条件
   * @param {Object} options 可选参数
   * @return {Promise<Array>} 查询结果
   */
  query: function(collection, query, options) {
    if (this.type === 'cloud' && this.storage.query) {
      // 云端存储支持直接查询
      return this.storage.query(collection, query, options);
    }
    
    // 本地实现的简单查询逻辑
    var self = this;
    var results = [];
    var prefix = collection + '_';
    
    // 不支持直接查询，需要加载所有keys
    return this._getAllKeys()
      .then(function(keys) {
        // 筛选相关的keys
        var collectionKeys = keys.filter(function(key) {
          return key.indexOf(prefix) === 0;
        });
        
        // 构建批量获取Promise
        var promises = collectionKeys.map(function(key) {
          return self.storage.get(key)
            .then(function(item) {
              if (item && self._matchQuery(item, query)) {
                results.push(item);
              }
            })
            .catch(function(err) {
              console.error('获取项目失败:', key, err);
            });
        });
        
        // 执行所有获取操作
        return Promise.all(promises);
      })
      .then(function() {
        return results;
      });
  },
  
  /**
   * 获取所有存储键
   * @private
   * @return {Promise<Array>} 键数组
   */
  _getAllKeys: function() {
    // 这个方法需要适配器具体实现
    // 微信小程序API不直接支持获取所有键
    return Promise.resolve([]);
  },
  
  /**
   * 判断数据是否匹配查询条件
   * @private
   * @param {Object} item 数据项
   * @param {Object} query 查询条件
   * @return {Boolean} 是否匹配
   */
  _matchQuery: function(item, query) {
    // 简单实现，实际可能需要更复杂的查询语法支持
    if (!query) {
      return true;
    }
    
    for (var key in query) {
      if (item[key] !== query[key]) {
        return false;
      }
    }
    
    return true;
  },
  
  /**
   * 获取项目键名
   * @private
   * @param {String} collection 集合名称
   * @param {String} id 数据ID
   * @return {String} 完整键名
   */
  _getItemKey: function(collection, id) {
    return collection + '_' + id;
  },
  
  /**
   * 获取最后同步标记
   * @param {String} collection 集合名称
   * @return {String} 同步标记
   */
  getLastSyncMarker: function(collection) {
    return this.lastSyncMarkers[collection] || null;
  },
  
  /**
   * 设置最后同步标记
   * @param {String} collection 集合名称
   * @param {String} marker 同步标记
   * @return {Promise} 保存结果
   */
  setLastSyncMarker: function(collection, marker) {
    this.lastSyncMarkers[collection] = marker;
    return this._saveSyncMarkers();
  },
  
  /**
   * 获取更改数据
   * @param {String} collection 集合名称
   * @param {String} since 起始时间戳
   * @return {Promise<Array>} 更改数据
   */
  getChanges: function(collection, since) {
    var self = this;
    
    // 构建查询条件
    var query = {
      '_meta.collection': collection
    };
    
    if (since) {
      query['_meta.updatedAt'] = {
        $gt: since
      };
    }
    
    if (this.type === 'local') {
      // 本地存储只获取已修改的数据
      query['_meta.localModified'] = true;
    }
    
    // 执行查询
    return this.query(collection, query)
      .then(function(items) {
        // 如果是云端存储并且支持直接查询删除的数据
        if (self.type === 'cloud' && self.storage.queryDeleted) {
          return self.storage.queryDeleted(collection, since)
            .then(function(deletedItems) {
              return items.concat(deletedItems);
            });
        }
        
        return items;
      });
  },
  
  /**
   * 应用更改数据
   * @param {String} collection 集合名称
   * @param {Array} changes 更改数据数组
   * @return {Promise<Object>} 应用结果统计
   */
  applyChanges: function(collection, changes) {
    var self = this;
    var stats = {
      total: changes.length,
      success: 0,
      failed: 0,
      details: []
    };
    
    // 处理每个变更
    var promises = changes.map(function(change) {
      var id = change._meta && change._meta.id;
      var operation = change._meta && change._meta.deleted ? 'remove' : 'save';
      
      if (!id) {
        stats.failed++;
        stats.details.push({
          operation: 'unknown',
          id: 'unknown',
          success: false,
          error: 'Invalid change object'
        });
        return Promise.resolve();
      }
      
      // 执行操作
      var promise;
      if (operation === 'remove') {
        promise = self.remove(collection, id);
      } else {
        promise = self.save(collection, id, change);
      }
      
      return promise
        .then(function() {
          stats.success++;
          stats.details.push({
            operation: operation,
            id: id,
            success: true
          });
        })
        .catch(function(err) {
          stats.failed++;
          stats.details.push({
            operation: operation,
            id: id,
            success: false,
            error: err.message || 'Unknown error'
          });
        });
    });
    
    return Promise.all(promises)
      .then(function() {
        return stats;
      });
  },
  
  /**
   * 在本地应用云端变更后，清除本地修改标记
   * @param {String} collection 集合名称
   * @param {Array} ids 数据ID数组
   * @return {Promise<Object>} 清除结果统计
   */
  clearLocalModifiedFlags: function(collection, ids) {
    var self = this;
    var stats = {
      total: ids.length,
      success: 0,
      failed: 0
    };
    
    if (this.type !== 'local') {
      return Promise.resolve(stats);
    }
    
    var promises = ids.map(function(id) {
      return self.get(collection, id)
        .then(function(item) {
          if (item && item._meta) {
            item._meta.localModified = false;
            return self.save(collection, id, item);
          }
          return null;
        })
        .then(function() {
          stats.success++;
        })
        .catch(function() {
          stats.failed++;
        });
    });
    
    return Promise.all(promises)
      .then(function() {
        return stats;
      });
  }
};

module.exports = SyncAdapter; 