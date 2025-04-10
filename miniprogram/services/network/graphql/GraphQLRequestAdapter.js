/**
 * GraphQLRequestAdapter.js
 * 
 * GraphQL请求适配器，用于将GraphQL查询转换为网络请求
 * 
 * 创建时间: 2025-04-08 21:00:22
 * 创建者: Claude 3.7 Sonnet
 * 更新时间: 2025-04-08 21:44:59
 * 更新者: Claude 3.7 Sonnet
 */

var GraphQLQueryBuilder = require('./GraphQLQueryBuilder');
var GraphQLCache = require('./GraphQLCache');

/**
 * GraphQLRequestAdapter构造函数
 * @param {Object} config - 配置对象
 * @constructor
 */
function GraphQLRequestAdapter(config) {
  this.config = config || {};
  this.endpoint = this.config.endpoint || '/graphql';
  this.headers = this.config.headers || {};
  this.timeout = this.config.timeout || 30000;
  this.queryBuilder = new GraphQLQueryBuilder();
  
  // 缓存配置和初始化
  this.cacheConfig = this.config.cache || { enabled: false };
  if (this.cacheConfig.enabled) {
    // 使用提供的缓存实例或创建新实例
    this.cache = this.cacheConfig.instance || new GraphQLCache({
      maxSize: this.cacheConfig.maxSize || 100,
      ttl: this.cacheConfig.ttl || 300000, // 5分钟
      normalizeQueries: this.cacheConfig.normalizeQueries !== false,
      enablePersistence: this.cacheConfig.enablePersistence || false
    });
  }
  
  // 批处理配置
  this.batchConfig = this.config.batch || { enabled: false };
  this.batchConfig.maxBatchSize = this.batchConfig.maxBatchSize || 10;
  this.batchConfig.batchInterval = this.batchConfig.batchInterval || 10;
  this.pendingQueries = [];
  this._batchTimeoutId = null;
  
  // 优化配置
  this.optimizationConfig = this.config.optimization || { enabled: false };
  
  // 调试配置
  this.debugEnabled = this.config.debug || false;
}

/**
 * 清理缓存
 * @param {string=} cacheKey - 可选的特定缓存键，不提供则清除所有缓存
 */
GraphQLRequestAdapter.prototype.clearCache = function(cacheKey) {
  if (!this.cacheConfig.enabled || !this.cache) {
    return;
  }
  
  if (cacheKey) {
    this.cache.delete(cacheKey);
  } else {
    this.cache.clearAll();
  }
};

/**
 * 发送GraphQL请求
 * @param {Object} requestConfig - 请求配置
 * @return {Promise} 返回Promise，解析为请求响应
 */
GraphQLRequestAdapter.prototype.send = function(requestConfig) {
  var self = this;
  var startTime = Date.now();
  
  // 提取GraphQL相关数据
  var query = requestConfig.data && requestConfig.data.query;
  var variables = requestConfig.data && requestConfig.data.variables;
  var operationName = requestConfig.data && requestConfig.data.operationName;
  
  // 验证请求
  if (!query) {
    return Promise.reject(new Error('GraphQL请求错误: 查询不能为空'));
  }
  
  // 检查是否为GraphQL查询类型
  var isQuery = query.trim().indexOf('query') === 0 || 
                !query.trim().match(/^(mutation|subscription)/);
  
  // 检查缓存
  if (this.cacheConfig.enabled && this.cache && isQuery && requestConfig.method !== 'POST') {
    var cacheKey = {
      query: query,
      variables: variables,
      operationName: operationName
    };
    
    if (this.cache.has(cacheKey)) {
      var cachedResponse = this.cache.get(cacheKey);
      if (cachedResponse) {
        this._logDebug('从缓存获取响应:', cacheKey);
        return Promise.resolve(cachedResponse);
      }
    }
  }
  
  // 处理批处理
  if (this.batchConfig.enabled && isQuery && !requestConfig.noBatch) {
    return this._batchQuery(query, variables, operationName);
  }
  
  // 应用查询优化(如果启用)
  if (this.optimizationConfig.enabled && isQuery) {
    query = this._optimizeQuery(query);
  }
  
  // 标准请求处理
  return this._sendRequest(query, variables, operationName, requestConfig)
    .then(function(response) {
      var processingTime = Date.now() - startTime;
      
      if (processingTime > 20) {
        console.warn('GraphQL请求处理性能警告: 处理耗时 ' + processingTime + 'ms，超过了20ms的阈值');
      }
      
      // 缓存结果(如果启用了缓存且是查询请求)
      if (self.cacheConfig.enabled && self.cache && isQuery && response && !response.errors) {
        self.cache.set({
          query: query,
          variables: variables,
          operationName: operationName
        }, response);
      }
      
      return response;
    });
};

/**
 * 批量处理查询
 * @param {string} query - GraphQL查询
 * @param {Object} variables - 查询变量
 * @param {string} operationName - 操作名称
 * @return {Promise} 返回Promise，解析为请求响应
 * @private
 */
GraphQLRequestAdapter.prototype._batchQuery = function(query, variables, operationName) {
  var self = this;
  
  return new Promise(function(resolve, reject) {
    // 添加到待处理查询
    self.pendingQueries.push({
      query: query,
      variables: variables,
      operationName: operationName,
      resolve: resolve,
      reject: reject
    });
    
    // 如果达到批处理大小上限，立即执行批处理
    if (self.pendingQueries.length >= self.batchConfig.maxBatchSize) {
      self._executeBatch();
    } else if (!self._batchTimeoutId) {
      // 否则设置定时器，延迟执行批处理
      self._batchTimeoutId = setTimeout(function() {
        self._batchTimeoutId = null;
        self._executeBatch();
      }, self.batchConfig.batchInterval);
    }
  });
};

/**
 * 执行批处理请求
 * @private
 */
GraphQLRequestAdapter.prototype._executeBatch = function() {
  var self = this;
  var queries = this.pendingQueries.slice();
  this.pendingQueries = [];
  
  if (queries.length === 0) {
    return;
  }
  
  var batchQuery = this._createBatchQuery(queries);
  
  // 发送批处理请求
  this._sendRequest(
    batchQuery.query,
    batchQuery.variables,
    'BatchQuery',
    { method: 'POST', noBatch: true }
  ).then(function(result) {
    // 分发结果给每个查询
    self._distributeBatchResults(queries, result);
  }).catch(function(error) {
    // 批处理失败，所有查询都失败
    queries.forEach(function(q) {
      q.reject(error);
    });
  });
};

/**
 * 创建批处理查询
 * @param {Array<Object>} queries - 待处理的查询
 * @return {Object} 批处理查询对象
 * @private
 */
GraphQLRequestAdapter.prototype._createBatchQuery = function(queries) {
  var batchedQuery = 'query BatchQuery {';
  var batchedVariables = {};
  
  for (var i = 0; i < queries.length; i++) {
    var alias = 'q' + i;
    var q = queries[i];
    
    // 提取查询内容部分(去掉查询声明和外层大括号)
    var queryContent = q.query
      .replace(/^\s*query\s+\w*\s*(\(\s*.*?\s*\))?\s*{/, '')
      .replace(/}\s*$/, '')
      .trim();
    
    batchedQuery += ' ' + alias + ': ' + queryContent;
    
    // 合并变量
    if (q.variables) {
      for (var key in q.variables) {
        if (q.variables.hasOwnProperty(key)) {
          batchedVariables[alias + '_' + key] = q.variables[key];
        }
      }
    }
  }
  
  batchedQuery += ' }';
  
  return {
    query: batchedQuery,
    variables: batchedVariables
  };
};

/**
 * 分发批处理结果给各个查询
 * @param {Array<Object>} queries - 原始查询列表
 * @param {Object} batchResult - 批处理响应
 * @private
 */
GraphQLRequestAdapter.prototype._distributeBatchResults = function(queries, batchResult) {
  if (!batchResult || !batchResult.data) {
    // 批处理请求失败，所有查询都失败
    var errorMsg = batchResult && batchResult.errors ? batchResult.errors : '批处理请求失败';
    queries.forEach(function(q) {
      q.reject(new Error(errorMsg));
    });
    return;
  }
  
  // 将结果分发给每个查询
  for (var i = 0; i < queries.length; i++) {
    var alias = 'q' + i;
    var query = queries[i];
    
    if (batchResult.data[alias]) {
      // 创建单独的结果对象
      var individualResult = {
        data: batchResult.data[alias]
      };
      
      // 缓存结果(如果启用了缓存)
      if (this.cacheConfig.enabled && this.cache) {
        this.cache.set({
          query: query.query,
          variables: query.variables,
          operationName: query.operationName
        }, individualResult);
      }
      
      query.resolve(individualResult);
    } else {
      // 该查询在批处理中失败
      var error = new Error('在批处理响应中未找到该查询的结果');
      query.reject(error);
    }
  }
};

/**
 * 优化GraphQL查询
 * @param {string} query - 原始查询
 * @return {string} 优化后的查询
 * @private
 */
GraphQLRequestAdapter.prototype._optimizeQuery = function(query) {
  if (!this.optimizationConfig.enabled) {
    return query;
  }
  
  // 去除所有注释
  query = query.replace(/#.*$/gm, '');
  
  // 压缩空白字符
  query = query.replace(/\s+/g, ' ').trim();
  
  // 应用自定义优化
  if (this.optimizationConfig.customOptimizer && typeof this.optimizationConfig.customOptimizer === 'function') {
    query = this.optimizationConfig.customOptimizer(query);
  }
  
  return query;
};

/**
 * 打印调试日志(如果启用了调试)
 * @param {...*} args - 要打印的参数
 * @private
 */
GraphQLRequestAdapter.prototype._logDebug = function() {
  if (this.debugEnabled) {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[GraphQLRequestAdapter]');
    console.log.apply(console, args);
  }
};

/**
 * 发送请求
 * @param {string} query - GraphQL查询
 * @param {Object=} variables - 查询变量
 * @param {string=} operationName - 操作名称
 * @param {Object=} requestConfig - 额外的请求配置
 * @return {Promise} 返回Promise，解析为请求响应
 * @private
 */
GraphQLRequestAdapter.prototype._sendRequest = function(query, variables, operationName, requestConfig) {
  var self = this;
  requestConfig = requestConfig || {};
  
  var isQuery = query.trim().indexOf('query') === 0 || 
                !query.trim().match(/^(mutation|subscription)/);
  
  var cacheKey = isQuery ? {
    query: query,
    variables: variables,
    operationName: operationName
  } : null;
  
  // 创建请求数据
  var requestData = {
    query: query
  };
  
  if (variables) {
    requestData.variables = variables;
  }
  
  if (operationName) {
    requestData.operationName = operationName;
  }
  
  // 合并headers
  var headers = Object.assign({
    'Content-Type': 'application/json'
  }, this.headers);
  
  // 添加自定义headers
  if (requestConfig.headers) {
    Object.assign(headers, requestConfig.headers);
  }
  
  this._logDebug('发送GraphQL请求:', {
    endpoint: this.endpoint,
    method: requestConfig.method || 'POST',
    operationName: operationName
  });
  
  // 执行请求
  return new Promise(function(resolve, reject) {
    wx.request({
      url: self.endpoint,
      method: requestConfig.method || 'POST',
      data: JSON.stringify(requestData),
      header: headers,
      timeout: requestConfig.timeout || self.timeout,
      success: function(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          var result = response.data;
          
          // 检查GraphQL错误
          if (result.errors && result.errors.length) {
            reject({
              status: response.statusCode,
              message: 'GraphQL错误',
              errors: result.errors,
              response: response
            });
            return;
          }
          
          self._logDebug('GraphQL请求成功:', {
            operationName: operationName,
            responseSize: JSON.stringify(result).length
          });
          
          resolve(result);
        } else {
          self._logDebug('GraphQL请求HTTP错误:', response.statusCode);
          
          reject({
            status: response.statusCode,
            message: 'HTTP请求失败',
            response: response
          });
        }
      },
      fail: function(error) {
        self._logDebug('GraphQL请求失败:', error);
        
        reject({
          message: error.errMsg || '网络请求失败'
        });
      }
    });
  });
};

/**
 * 执行GraphQL查询
 * @param {string} query - GraphQL查询字符串
 * @param {Object=} variables - 查询变量
 * @param {Object=} options - 请求选项
 * @return {Promise} 返回Promise，解析为请求响应
 */
GraphQLRequestAdapter.prototype.execute = function(query, variables, options) {
  options = options || {};
  
  return this.send({
    method: options.method || 'POST',
    data: {
      query: query,
      variables: variables,
      operationName: options.operationName
    },
    headers: options.headers,
    timeout: options.timeout,
    noBatch: options.noBatch
  });
};

/**
 * 设置缓存策略
 * @param {Object} policy - 缓存策略配置
 */
GraphQLRequestAdapter.prototype.setCachePolicy = function(policy) {
  this.cacheConfig = Object.assign({}, this.cacheConfig, policy);
  
  // 如果启用缓存但未创建缓存实例，则创建一个
  if (this.cacheConfig.enabled && !this.cache) {
    this.cache = new GraphQLCache({
      maxSize: this.cacheConfig.maxSize || 100,
      ttl: this.cacheConfig.ttl || 300000,
      normalizeQueries: this.cacheConfig.normalizeQueries !== false,
      enablePersistence: this.cacheConfig.enablePersistence || false
    });
  }
};

/**
 * 使特定查询缓存失效
 * @param {string} name - 查询名称
 * @param {Object=} variables - 变量值
 */
GraphQLRequestAdapter.prototype.invalidateQuery = function(name, variables) {
  if (!this.cacheConfig.enabled || !this.cache) {
    return;
  }
  
  // 创建一个简单的查询模式，用于匹配缓存项
  var queryPattern = 'query ' + name;
  
  // 查询所有缓存键，删除匹配的项
  var cacheStats = this.cache.getStatistics();
  var self = this;
  
  // 注意：这是一个简化的实现，实际上需要更复杂的机制来精确匹配查询
  this.cache.cache.forEach(function(value, key) {
    try {
      var keyObj = JSON.parse(key);
      var queryMatches = keyObj.query && keyObj.query.includes(queryPattern);
      var variablesMatch = !variables || JSON.stringify(keyObj.variables) === JSON.stringify(variables);
      
      if (queryMatches && variablesMatch) {
        self.cache.delete({ _cacheKey: key });
      }
    } catch (e) {
      // 忽略解析错误
    }
  });
};

/**
 * 启用查询优化
 * @param {Object} options - 优化选项
 */
GraphQLRequestAdapter.prototype.enableOptimization = function(options) {
  this.optimizationConfig = Object.assign({
    enabled: true,
    skipRepeatedFields: true,
    skipTypenameFields: false,
    customOptimizer: null
  }, options || {});
};

/**
 * 启用调试模式
 * @param {boolean} enabled - 是否启用
 */
GraphQLRequestAdapter.prototype.enableDebug = function(enabled) {
  this.debugEnabled = enabled !== false;
};

/**
 * 设置批处理策略
 * @param {Object} strategy - 批处理策略配置
 */
GraphQLRequestAdapter.prototype.setBatchingStrategy = function(strategy) {
  this.batchConfig = Object.assign({}, this.batchConfig, strategy);
};

/**
 * 构建并发送查询
 * @param {Object} options - 构建选项
 * @param {string} options.operation - 操作类型(query/mutation/subscription)
 * @param {string=} options.operationName - 操作名称
 * @param {Array<string>} options.fields - 查询字段
 * @param {Object=} options.variables - 查询变量
 * @param {Object=} options.requestConfig - 额外的请求配置
 * @return {Promise} 返回Promise，解析为请求响应
 */
GraphQLRequestAdapter.prototype.buildAndSend = function(options) {
  // 使用GraphQLQueryBuilder构建查询
  this.queryBuilder._reset();
  
  var builder = this.queryBuilder;
  
  // 设置操作类型
  if (options.operation === 'mutation') {
    builder.mutation(options.operationName);
  } else if (options.operation === 'subscription') {
    builder.subscription(options.operationName);
  } else {
    builder.query(options.operationName);
  }
  
  // 添加变量
  if (options.variables) {
    for (var varName in options.variables) {
      if (options.variables.hasOwnProperty(varName)) {
        var variable = options.variables[varName];
        builder.variable(varName, variable.type, variable.defaultValue);
      }
    }
  }
  
  // 添加字段
  if (Array.isArray(options.fields)) {
    builder.fields(options.fields);
  } else {
    // 如果提供的是嵌套字段构建函数
    options.fields(builder);
  }
  
  // 添加查询参数
  if (options.params) {
    for (var paramName in options.params) {
      if (options.params.hasOwnProperty(paramName)) {
        builder.where(paramName, options.params[paramName]);
      }
    }
  }
  
  // 构建查询
  var query = builder.build();
  
  // 准备变量值
  var variableValues = {};
  if (options.variables) {
    for (var name in options.variables) {
      if (options.variables.hasOwnProperty(name) && options.variables[name].value !== undefined) {
        variableValues[name] = options.variables[name].value;
      }
    }
  }
  
  // 发送查询
  return this.send({
    method: 'POST',
    data: {
      query: query,
      variables: Object.keys(variableValues).length > 0 ? variableValues : undefined,
      operationName: options.operationName
    },
    noBatch: options.noBatch
  });
};

module.exports = GraphQLRequestAdapter;