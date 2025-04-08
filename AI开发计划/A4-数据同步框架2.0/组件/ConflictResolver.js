/**
 * 冲突解决器
 * 
 * 创建时间: 2025-04-08 21:56:41
 * 创建者: Claude-3.7-Sonnet
 * 文档分类: 框架组件
 */

'use strict';

/**
 * 冲突解决器
 * 负责检测和解决数据同步过程中的冲突
 */
var ConflictResolver = {
  /**
   * 配置信息
   */
  _config: {
    defaultStrategy: 'server-wins',
    pathStrategies: {},
    autoResolveAll: false,
    manualResolveTypes: ['structure']
  },
  
  /**
   * 初始化冲突解决器
   * @param {Object} config 配置信息
   */
  init: function(config) {
    // 合并配置
    this._config = Object.assign({}, this._config, config);
    
    console.log('冲突解决器初始化完成，默认策略:', this._config.defaultStrategy);
    return Promise.resolve();
  },
  
  /**
   * 销毁冲突解决器
   */
  destroy: function() {
    // 清理资源
    this._config = null;
    return Promise.resolve();
  },
  
  /**
   * 检测是否存在冲突
   * @param {Object} localData 本地数据
   * @param {Object} serverData 服务器数据
   * @param {Object} baseData 基准数据
   * @returns {Promise<boolean>} 是否存在冲突
   */
  hasConflict: function(localData, serverData, baseData) {
    // 检查版本是否不同
    if (localData.version !== serverData.version) {
      return Promise.resolve(true);
    }
    
    // 检查数据内容是否相同
    var localJson = JSON.stringify(localData.value);
    var serverJson = JSON.stringify(serverData.value);
    
    return Promise.resolve(localJson !== serverJson);
  },
  
  /**
   * 解决单个冲突
   * @param {Object} conflict 冲突对象
   * @returns {Promise<Object>} 解决后的数据
   */
  resolveConflict: function(conflict) {
    // 获取路径对应的解决策略
    var strategy = this._getStrategyForPath(conflict.path);
    
    // 检查是否是需要手动解决的冲突类型
    if (this._needsManualResolution(conflict)) {
      return Promise.resolve({
        needsManualResolution: true,
        conflict: conflict
      });
    }
    
    // 根据策略解决冲突
    return this._applyStrategy(conflict, strategy);
  },
  
  /**
   * 批量检测冲突
   * @param {Array} localChanges 本地变更列表
   * @param {Array} serverChanges 服务器变更列表
   * @param {Object} baseData 基准数据
   * @returns {Promise<Object>} 冲突检测结果
   */
  detectBatchConflicts: function(localChanges, serverChanges, baseData) {
    var self = this;
    
    // 创建索引加速查找
    var localChangeIndex = this._createChangeIndex(localChanges);
    var serverChangeIndex = this._createChangeIndex(serverChanges);
    
    var nonConflictingLocal = [];
    var nonConflictingServer = [];
    var potentialConflicts = [];
    
    // 查找潜在冲突
    for (var id in localChangeIndex) {
      if (!serverChangeIndex[id]) {
        // 服务端无此ID的变更，无冲突
        nonConflictingLocal.push(localChangeIndex[id]);
      } else {
        // 双方都有此ID的变更，可能有冲突
        potentialConflicts.push({
          id: id,
          local: localChangeIndex[id],
          server: serverChangeIndex[id]
        });
      }
    }
    
    // 处理服务端独有的变更
    for (var id in serverChangeIndex) {
      if (!localChangeIndex[id]) {
        nonConflictingServer.push(serverChangeIndex[id]);
      }
    }
    
    // 详细分析潜在冲突
    var confirmedConflicts = [];
    
    // 对每个潜在冲突进行细粒度检测
    var conflictPromises = potentialConflicts.map(function(potential) {
      return self.hasConflict(
        potential.local,
        potential.server,
        baseData ? baseData[potential.id] : null
      ).then(function(isConflict) {
        if (isConflict) {
          // 创建冲突对象
          var conflict = {
            id: potential.id,
            type: 'update', // 默认为更新冲突
            path: 'records/' + potential.id,
            timestamp: Date.now(),
            clientData: potential.local,
            serverData: potential.server
          };
          
          // 根据数据判断冲突类型
          if (potential.local.deleted) {
            conflict.type = 'delete';
          } else if (self._isStructureConflict(potential.local, potential.server)) {
            conflict.type = 'structure';
          }
          
          confirmedConflicts.push(conflict);
        }
      });
    });
    
    return Promise.all(conflictPromises)
      .then(function() {
        return {
          nonConflicting: {
            local: nonConflictingLocal,
            server: nonConflictingServer
          },
          conflicts: confirmedConflicts
        };
      });
  },
  
  /**
   * 批量解决冲突
   * @param {Array} conflicts 冲突列表
   * @returns {Promise<Array>} 解决结果
   */
  batchResolveConflicts: function(conflicts) {
    var self = this;
    var batchSize = 100; // 批量处理大小
    
    return this._incrementalProcessConflicts(conflicts, batchSize);
  },
  
  /**
   * 版本兼容性冲突解决
   * @param {Object} conflict 冲突对象
   * @returns {Promise<Object>} 解决结果
   */
  resolveVersionConflict: function(conflict) {
    // 获取版本信息
    var clientVersion = conflict.clientData.metadata.schemaVersion;
    var serverVersion = conflict.serverData.metadata.schemaVersion;
    
    var result = {
      resolution: {
        strategy: 'version-aware',
        timestamp: Date.now(),
        automatic: true
      }
    };
    
    // 比较版本并选择更高版本的数据
    if (this._compareVersions(clientVersion, serverVersion) > 0) {
      // 本地版本更高，使用本地数据
      result.value = conflict.clientData.value;
    } else {
      // 服务器版本更高或相同，使用服务器数据
      result.value = conflict.serverData.value;
    }
    
    return Promise.resolve(result);
  },
  
  /**
   * 版本感知的冲突检测
   * @param {Object} localData 本地数据
   * @param {Object} serverData 服务器数据
   * @returns {Promise<boolean>} 是否存在冲突
   */
  detectConflictWithVersioning: function(localData, serverData) {
    // 获取版本信息
    var localVersion = localData.metadata && localData.metadata.schemaVersion;
    var serverVersion = serverData.metadata && serverData.metadata.schemaVersion;
    
    // 如果版本相同，使用标准冲突检测
    if (localVersion === serverVersion) {
      return this.hasConflict(localData, serverData, null);
    }
    
    // 版本不同，进行结构兼容性检查
    var isStructureCompatible = this._checkStructureCompatibility(
      localData.value,
      serverData.value,
      localVersion,
      serverVersion
    );
    
    return Promise.resolve(!isStructureCompatible);
  },
  
  /**
   * 根据路径获取解决策略
   * @private
   */
  _getStrategyForPath: function(path) {
    var pathStrategies = this._config.pathStrategies;
    var strategy = this._config.defaultStrategy;
    
    // 检查路径前缀匹配
    for (var prefix in pathStrategies) {
      if (path === prefix || (prefix.endsWith('/') && path.startsWith(prefix))) {
        strategy = pathStrategies[prefix];
        break;
      }
    }
    
    return strategy;
  },
  
  /**
   * 检查是否需要手动解决
   * @private
   */
  _needsManualResolution: function(conflict) {
    // 如果配置为自动解决所有，则不需要手动
    if (this._config.autoResolveAll) {
      return false;
    }
    
    // 检查冲突类型是否在需要手动解决的列表中
    return this._config.manualResolveTypes.indexOf(conflict.type) >= 0;
  },
  
  /**
   * 应用冲突解决策略
   * @private
   */
  _applyStrategy: function(conflict, strategy) {
    var result = {
      resolution: {
        strategy: strategy,
        timestamp: Date.now(),
        automatic: true
      }
    };
    
    switch (strategy) {
      case 'client-wins':
        // 使用客户端数据
        result.value = conflict.clientData.value;
        break;
        
      case 'server-wins':
        // 使用服务器数据
        result.value = conflict.serverData.value;
        break;
        
      case 'smart-merge':
        // 智能合并两侧数据
        result.value = this._smartMerge(
          conflict.clientData.value,
          conflict.serverData.value,
          conflict.baseData
        );
        break;
        
      case 'timestamp-wins':
        // 使用最新的数据
        if (conflict.clientData.timestamp > conflict.serverData.timestamp) {
          result.value = conflict.clientData.value;
        } else {
          result.value = conflict.serverData.value;
        }
        break;
        
      case 'version-aware':
        // 使用版本感知策略
        return this.resolveVersionConflict(conflict);
        
      default:
        // 默认使用服务器数据
        result.value = conflict.serverData.value;
        result.resolution.strategy = 'server-wins';
    }
    
    return Promise.resolve(result);
  },
  
  /**
   * 智能合并数据
   * @private
   */
  _smartMerge: function(clientData, serverData, baseData) {
    // 如果没有基准数据，默认使用服务器数据
    if (!baseData) {
      return Object.assign({}, clientData, serverData);
    }
    
    var result = {};
    var allFields = new Set();
    
    // 收集所有字段
    Object.keys(clientData).forEach(function(key) {
      allFields.add(key);
    });
    
    Object.keys(serverData).forEach(function(key) {
      allFields.add(key);
    });
    
    Object.keys(baseData).forEach(function(key) {
      allFields.add(key);
    });
    
    // 逐字段处理
    allFields.forEach(function(field) {
      // 客户端和服务器都修改了，需要解决冲突
      if (
        clientData.hasOwnProperty(field) && 
        serverData.hasOwnProperty(field) && 
        JSON.stringify(clientData[field]) !== JSON.stringify(serverData[field])
      ) {
        // 检查基准数据，看谁修改了
        if (
          baseData.hasOwnProperty(field) && 
          JSON.stringify(baseData[field]) === JSON.stringify(clientData[field])
        ) {
          // 客户端未修改，使用服务器值
          result[field] = serverData[field];
        } else if (
          baseData.hasOwnProperty(field) && 
          JSON.stringify(baseData[field]) === JSON.stringify(serverData[field])
        ) {
          // 服务器未修改，使用客户端值
          result[field] = clientData[field];
        } else {
          // 两边都修改了，使用服务器值
          result[field] = serverData[field];
        }
      } 
      // 客户端有此字段，服务器没有
      else if (clientData.hasOwnProperty(field) && !serverData.hasOwnProperty(field)) {
        result[field] = clientData[field];
      } 
      // 服务器有此字段，客户端没有
      else if (!clientData.hasOwnProperty(field) && serverData.hasOwnProperty(field)) {
        result[field] = serverData[field];
      }
      // 两边都有且相同
      else if (clientData.hasOwnProperty(field)) {
        result[field] = clientData[field];
      }
    });
    
    return result;
  },
  
  /**
   * 增量处理冲突
   * @private
   */
  _incrementalProcessConflicts: function(conflicts, batchSize) {
    var self = this;
    var results = [];
    var processed = 0;
    var totalCount = conflicts.length;
    
    // 处理一批冲突
    function processBatch() {
      var end = Math.min(processed + batchSize, totalCount);
      var currentBatch = conflicts.slice(processed, end);
      var batchPromises = currentBatch.map(function(conflict) {
        return self.resolveConflict(conflict);
      });
      
      return Promise.all(batchPromises)
        .then(function(batchResults) {
          results = results.concat(batchResults);
          processed = end;
          
          // 检查是否完成
          if (processed >= totalCount) {
            return results;
          }
          
          // 继续处理下一批
          return processBatch();
        });
    }
    
    return processBatch();
  },
  
  /**
   * 创建变更索引
   * @private
   */
  _createChangeIndex: function(changes) {
    var index = {};
    
    for (var i = 0; i < changes.length; i++) {
      var change = changes[i];
      index[change.id] = change;
    }
    
    return index;
  },
  
  /**
   * 检查是否是结构冲突
   * @private
   */
  _isStructureConflict: function(localData, serverData) {
    // 检查数据结构是否兼容
    if (typeof localData.value !== typeof serverData.value) {
      return true;
    }
    
    // 对象类型不同
    if (
      (Array.isArray(localData.value) && !Array.isArray(serverData.value)) || 
      (!Array.isArray(localData.value) && Array.isArray(serverData.value))
    ) {
      return true;
    }
    
    // 检查元数据中的结构版本
    if (
      localData.metadata && serverData.metadata && 
      localData.metadata.schemaVersion !== serverData.metadata.schemaVersion
    ) {
      return true;
    }
    
    return false;
  },
  
  /**
   * 比较版本号
   * @private
   */
  _compareVersions: function(version1, version2) {
    if (!version1) return -1;
    if (!version2) return 1;
    
    var v1parts = version1.split('.');
    var v2parts = version2.split('.');
    
    for (var i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      var v1part = parseInt(v1parts[i] || 0, 10);
      var v2part = parseInt(v2parts[i] || 0, 10);
      
      if (v1part > v2part) return 1;
      if (v1part < v2part) return -1;
    }
    
    return 0;
  },
  
  /**
   * 检查结构兼容性
   * @private
   */
  _checkStructureCompatibility: function(localValue, serverValue, localVersion, serverVersion) {
    // 简单类型直接认为兼容
    if (
      typeof localValue !== 'object' || 
      typeof serverValue !== 'object' || 
      localValue === null || 
      serverValue === null
    ) {
      return true;
    }
    
    // 类型不一致，不兼容
    if (Array.isArray(localValue) !== Array.isArray(serverValue)) {
      return false;
    }
    
    // 如果本地版本更高，认为可以处理旧版本的数据
    if (this._compareVersions(localVersion, serverVersion) > 0) {
      return true;
    }
    
    // 如果是数组，检查第一个元素的结构
    if (Array.isArray(localValue) && localValue.length > 0 && serverValue.length > 0) {
      return this._checkStructureCompatibility(
        localValue[0], 
        serverValue[0],
        localVersion,
        serverVersion
      );
    }
    
    // 检查对象的必要字段
    var localKeys = Object.keys(localValue);
    var serverKeys = Object.keys(serverValue);
    
    // 如果两边的字段集合完全不同，可能是结构冲突
    var commonKeys = localKeys.filter(function(key) {
      return serverKeys.indexOf(key) >= 0;
    });
    
    // 如果共同字段太少，认为不兼容
    return commonKeys.length >= Math.min(localKeys.length, serverKeys.length) * 0.5;
  }
};

// 导出冲突解决器
module.exports = ConflictResolver; 