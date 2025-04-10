/**
 * GraphQLQueryBuilder.js
 * 
 * GraphQL查询构建器，用于构建符合规范的GraphQL查询
 * 
 * 创建时间: 2025-04-08 21:00:22
 * 创建者: Claude 3.7 Sonnet
 * 更新时间: 2025-04-08 21:39:52
 * 更新者: Claude 3.7 Sonnet
 */

var VALID_OPERATIONS = ['query', 'mutation', 'subscription'];
var VALID_TYPES = ['Int', 'Float', 'String', 'Boolean', 'ID'];
var FIELD_NAME_REGEX = /^[_A-Za-z][_0-9A-Za-z]*$/;

/**
 * GraphQLQueryBuilder构造函数
 * @constructor
 */
function GraphQLQueryBuilder() {
  // 重置查询构建器状态
  this._reset();
}

/**
 * 重置构建器状态
 * @private
 */
GraphQLQueryBuilder.prototype._reset = function() {
  this._fields = [];
  this._variables = {};
  this._fragments = {};
  this._nestedFields = {};
  this._operation = 'query';
  this._operationName = '';
  this._queryParams = {};
  this._directives = {};
  this._errors = [];
  this._currentBatch = null;
  this._aliases = {};
};

/**
 * 验证字段名是否符合GraphQL规范
 * @param {string} fieldName - 待验证的字段名
 * @return {boolean} 是否有效
 * @private
 */
GraphQLQueryBuilder.prototype._validateFieldName = function(fieldName) {
  // 处理嵌套字段和片段引用
  if (fieldName.indexOf('{') !== -1 || fieldName.indexOf('...') === 0) {
    return true;
  }
  
  // 处理带指令的字段
  if (fieldName.indexOf('@') !== -1) {
    // 提取字段名部分
    var parts = fieldName.split('@')[0].trim();
    return FIELD_NAME_REGEX.test(parts);
  }
  
  return FIELD_NAME_REGEX.test(fieldName);
};

/**
 * 验证GraphQL类型是否有效
 * @param {string} type - 待验证的类型
 * @return {boolean} 是否有效
 * @private
 */
GraphQLQueryBuilder.prototype._validateType = function(type) {
  // 移除非空标记和列表标记
  var baseType = type
    .replace(/!$/, '')
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .replace(/!$/, '');
  
  // 检查是否为基本类型或自定义类型（首字母大写）
  return VALID_TYPES.indexOf(baseType) !== -1 || 
         (baseType.charAt(0) === baseType.charAt(0).toUpperCase() && 
          baseType.charAt(0) !== '[' && 
          baseType.charAt(0) !== ']');
};

/**
 * 序列化查询参数
 * @param {*} value - 参数值
 * @return {string} 序列化后的值
 * @private
 */
GraphQLQueryBuilder.prototype._serializeValue = function(value) {
  if (value === undefined || value === null) {
    return 'null';
  }
  
  // 处理变量引用
  if (typeof value === 'string' && value.charAt(0) === '$') {
    return value;
  }
  
  // 处理对象
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      var result = '[';
      for (var i = 0; i < value.length; i++) {
        if (i > 0) result += ', ';
        result += this._serializeValue(value[i]);
      }
      result += ']';
      return result;
    } else {
      // 对象不是有效的GraphQL值，除非是通过变量传递的
      this._errors.push('GraphQL不支持直接传递对象，请使用变量替代');
      throw new Error('GraphQL值错误: 对象不是有效的GraphQL值，除非是通过变量传递的');
    }
  }
  
  // 处理字符串、数字和布尔值
  return JSON.stringify(value);
};

/**
 * 设置操作类型为查询
 * @param {string=} operationName - 可选的操作名称
 * @return {GraphQLQueryBuilder} this - 便于链式调用
 */
GraphQLQueryBuilder.prototype.query = function(operationName) {
  this._operation = 'query';
  this._operationName = operationName || '';
  return this;
};

/**
 * 设置操作类型为变更
 * @param {string=} operationName - 可选的操作名称
 * @return {GraphQLQueryBuilder} this - 便于链式调用
 */
GraphQLQueryBuilder.prototype.mutation = function(operationName) {
  this._operation = 'mutation';
  this._operationName = operationName || '';
  return this;
};

/**
 * 设置操作类型为订阅
 * @param {string=} operationName - 可选的操作名称
 * @return {GraphQLQueryBuilder} this - 便于链式调用
 */
GraphQLQueryBuilder.prototype.subscription = function(operationName) {
  this._operation = 'subscription';
  this._operationName = operationName || '';
  return this;
};

/**
 * 选择查询的字段
 * @param {Array<string>|string} fields - 要选择的字段
 * @return {GraphQLQueryBuilder} this - 便于链式调用
 */
GraphQLQueryBuilder.prototype.select = function(fields) {
  if (!fields) {
    this._errors.push('字段选择错误: select方法需要提供字段参数');
    throw new Error('字段选择错误: select方法需要提供字段参数');
  }
  
  if (typeof fields === 'string') {
    if (!this._validateFieldName(fields)) {
      this._errors.push('字段名错误: ' + fields + ' 不是有效的GraphQL字段名');
      throw new Error('字段名错误: ' + fields + ' 不是有效的GraphQL字段名');
    }
    this._fields.push(fields);
  } else if (Array.isArray(fields)) {
    for (var i = 0; i < fields.length; i++) {
      if (!this._validateFieldName(fields[i])) {
        this._errors.push('字段名错误: ' + fields[i] + ' 不是有效的GraphQL字段名');
        throw new Error('字段名错误: ' + fields[i] + ' 不是有效的GraphQL字段名');
      }
    }
    this._fields = this._fields.concat(fields);
  } else {
    this._errors.push('字段选择错误: 参数必须是字符串或字符串数组');
    throw new Error('字段选择错误: 参数必须是字符串或字符串数组');
  }
  
  return this;
};

/**
 * 添加单个字段
 * @param {string} fieldName - 字段名
 * @param {Function=} builderFn - 可选的嵌套字段构建函数
 * @return {GraphQLQueryBuilder} this - 便于链式调用
 */
GraphQLQueryBuilder.prototype.field = function(fieldName, builderFn) {
  if (!fieldName || typeof fieldName !== 'string') {
    this._errors.push('字段错误: 字段名必须是有效的字符串');
    throw new Error('字段错误: 字段名必须是有效的字符串');
  }
  
  if (!this._validateFieldName(fieldName)) {
    this._errors.push('字段名错误: ' + fieldName + ' 不是有效的GraphQL字段名');
    throw new Error('字段名错误: ' + fieldName + ' 不是有效的GraphQL字段名');
  }
  
  if (builderFn && typeof builderFn === 'function') {
    // 处理嵌套字段
    var nestedBuilder = new GraphQLQueryBuilder();
    var result = builderFn(nestedBuilder);
    
    // 如果回调返回了构建器，使用它；否则使用传入的构建器
    var builder = result instanceof GraphQLQueryBuilder ? result : nestedBuilder;
    
    // 构建嵌套字段字符串
    var nestedFields = builder._fields;
    var nestedParams = builder._queryParams;
    
    var fieldString = fieldName;
    
    // 添加参数
    if (Object.keys(nestedParams).length > 0) {
      fieldString += '(';
      var paramStrings = [];
      
      for (var paramName in nestedParams) {
        if (nestedParams.hasOwnProperty(paramName)) {
          try {
            var serializedValue = this._serializeValue(nestedParams[paramName]);
            paramStrings.push(paramName + ': ' + serializedValue);
          } catch (e) {
            this._errors.push('参数序列化错误: ' + e.message);
            throw new Error('参数序列化错误: ' + e.message + '，参数名: ' + paramName);
          }
        }
      }
      
      fieldString += paramStrings.join(', ') + ')';
    }
    
    // 添加嵌套字段
    if (nestedFields.length > 0) {
      fieldString += ' { ' + nestedFields.join(' ') + ' }';
    }
    
    this._fields.push(fieldString);
  } else {
    // 简单字段
    this._fields.push(fieldName);
  }
  
  return this;
};

/**
 * 添加多个字段
 * @param {Array<string>} fieldNames - 字段名数组
 * @return {GraphQLQueryBuilder} this - 便于链式调用
 */
GraphQLQueryBuilder.prototype.fields = function(fieldNames) {
  if (!fieldNames || !Array.isArray(fieldNames)) {
    this._errors.push('字段错误: fields方法需要提供字段名数组');
    throw new Error('字段错误: fields方法需要提供字段名数组');
  }
  
  return this.select(fieldNames);
};

/**
 * 添加查询参数
 * @param {string} param - 参数名
 * @param {*} value - 参数值
 * @return {GraphQLQueryBuilder} this - 便于链式调用
 */
GraphQLQueryBuilder.prototype.where = function(param, value) {
  if (!param || typeof param !== 'string') {
    this._errors.push('参数错误: where方法的第一个参数必须是字符串');
    throw new Error('参数错误: where方法的第一个参数必须是字符串');
  }
  
  try {
    this._queryParams[param] = value;
  } catch (e) {
    this._errors.push('参数错误: ' + e.message);
    throw new Error('参数错误: ' + e.message);
  }
  
  return this;
};

/**
 * 添加变量
 * @param {string} name - 变量名
 * @param {string} type - 变量类型
 * @param {*=} defaultValue - 可选的默认值
 * @return {GraphQLQueryBuilder} this - 便于链式调用
 */
GraphQLQueryBuilder.prototype.variable = function(name, type, defaultValue) {
  if (!name || typeof name !== 'string') {
    this._errors.push('变量错误: 变量名必须是有效的字符串');
    throw new Error('变量错误: 变量名必须是有效的字符串');
  }
  
  if (!type || typeof type !== 'string') {
    this._errors.push('变量错误: 变量类型必须是有效的字符串');
    throw new Error('变量错误: 变量类型必须是有效的字符串');
  }
  
  if (!this._validateType(type)) {
    this._errors.push('变量错误: ' + type + ' 不是有效的GraphQL类型');
    throw new Error('变量错误: ' + type + ' 不是有效的GraphQL类型');
  }
  
  this._variables[name] = {
    type: type,
    defaultValue: defaultValue
  };
  
  return this;
};

/**
 * 创建片段
 * @param {string} name - 片段名
 * @param {string} typeName - 类型名
 * @param {Array<string>} fields - 片段中的字段
 * @return {GraphQLQueryBuilder} this - 便于链式调用
 */
GraphQLQueryBuilder.prototype.fragment = function(name, typeName, fields) {
  if (!name || typeof name !== 'string') {
    this._errors.push('片段错误: 片段名必须是有效的字符串');
    throw new Error('片段错误: 片段名必须是有效的字符串');
  }
  
  if (!typeName || typeof typeName !== 'string') {
    this._errors.push('片段错误: 类型名必须是有效的字符串');
    throw new Error('片段错误: 类型名必须是有效的字符串');
  }
  
  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    this._errors.push('片段错误: 字段必须是非空字符串数组');
    throw new Error('片段错误: 字段必须是非空字符串数组');
  }
  
  this._fragments[name] = {
    typeName: typeName,
    fields: fields
  };
  
  return this;
};

/**
 * 添加指令
 * @param {string} fieldName - 字段名
 * @param {string} directive - 指令名
 * @param {Object=} args - 指令参数
 * @return {GraphQLQueryBuilder} this - 便于链式调用
 */
GraphQLQueryBuilder.prototype.directive = function(fieldName, directive, args) {
  if (!fieldName || !directive) {
    this._errors.push('指令错误: 字段名和指令名不能为空');
    throw new Error('指令错误: 字段名和指令名不能为空');
  }
  
  if (!this._directives[fieldName]) {
    this._directives[fieldName] = [];
  }
  
  this._directives[fieldName].push({
    name: directive,
    args: args || {}
  });
  
  return this;
};

/**
 * 构建查询字符串
 * @return {string} 构建的GraphQL查询字符串
 */
GraphQLQueryBuilder.prototype.build = function() {
  // 重置错误
  this._errors = [];
  
  // 检查是否有选择字段
  if (this._fields.length === 0) {
    this._errors.push('构建错误: 没有选择任何字段');
    throw new Error('构建错误: 没有选择任何字段');
  }
  
  var query = '';
  
  // 添加操作类型和名称
  query += this._operation;
  if (this._operationName) {
    query += ' ' + this._operationName;
  }
  
  // 添加变量
  var hasVariables = Object.keys(this._variables).length > 0;
  if (hasVariables) {
    query += '(';
    var variableStrings = [];
    
    for (var varName in this._variables) {
      if (this._variables.hasOwnProperty(varName)) {
        var variable = this._variables[varName];
        var variableStr = '$' + varName + ': ' + variable.type;
        
        if (variable.defaultValue !== undefined) {
          variableStr += ' = ' + this._serializeValue(variable.defaultValue);
        }
        
        variableStrings.push(variableStr);
      }
    }
    
    query += variableStrings.join(', ') + ')';
  }
  
  // 开始查询主体
  query += ' {';
  
  // 添加字段
  var startTime = Date.now();
  for (var i = 0; i < this._fields.length; i++) {
    query += ' ' + this._fields[i];
    
    // 添加字段指令
    if (this._directives[this._fields[i]]) {
      for (var j = 0; j < this._directives[this._fields[i]].length; j++) {
        var directive = this._directives[this._fields[i]][j];
        query += ' @' + directive.name;
        
        if (Object.keys(directive.args).length > 0) {
          query += '(';
          var argStrings = [];
          
          for (var argName in directive.args) {
            if (directive.args.hasOwnProperty(argName)) {
              argStrings.push(argName + ': ' + this._serializeValue(directive.args[argName]));
            }
          }
          
          query += argStrings.join(', ') + ')';
        }
      }
    }
  }
  
  // 添加查询参数
  var hasParams = Object.keys(this._queryParams).length > 0;
  if (hasParams) {
    query += '(';
    var paramStrings = [];
    
    for (var paramName in this._queryParams) {
      if (this._queryParams.hasOwnProperty(paramName)) {
        try {
          var serializedValue = this._serializeValue(this._queryParams[paramName]);
          paramStrings.push(paramName + ': ' + serializedValue);
        } catch (e) {
          this._errors.push('参数序列化错误: ' + e.message);
          throw new Error('参数序列化错误: ' + e.message + '，参数名: ' + paramName);
        }
      }
    }
    
    query += paramStrings.join(', ') + ')';
  }
  
  // 关闭查询主体
  query += ' }';
  
  // 添加片段
  for (var fragName in this._fragments) {
    if (this._fragments.hasOwnProperty(fragName)) {
      var fragment = this._fragments[fragName];
      query += ' fragment ' + fragName + ' on ' + fragment.typeName + ' {';
      
      for (var k = 0; k < fragment.fields.length; k++) {
        query += ' ' + fragment.fields[k];
      }
      
      query += ' }';
    }
  }
  
  var endTime = Date.now();
  var buildTime = endTime - startTime;
  
  // 检查性能
  if (buildTime > 30) {
    console.warn('GraphQL查询构建性能警告: 构建查询耗时 ' + buildTime + 'ms，超过了30ms的阈值');
  }
  
  return query;
};

/**
 * 获取累积的错误
 * @return {Array<string>} 错误消息数组
 */
GraphQLQueryBuilder.prototype.getErrors = function() {
  return this._errors.slice();
};

/**
 * 清除当前错误
 */
GraphQLQueryBuilder.prototype.clearErrors = function() {
  this._errors = [];
};

/**
 * 添加参数
 * @param {string} name - 参数名
 * @param {*} value - 参数值
 * @return {GraphQLQueryBuilder} this - 便于链式调用
 */
GraphQLQueryBuilder.prototype.argument = function(name, value) {
  if (!name || typeof name !== 'string') {
    this._errors.push('参数错误: 参数名必须是有效的字符串');
    throw new Error('参数错误: 参数名必须是有效的字符串');
  }
  
  this._queryParams[name] = value;
  return this;
};

/**
 * 创建批量查询构建器
 * @return {BatchQueryBuilder} 批量查询构建器实例
 */
GraphQLQueryBuilder.prototype.batch = function() {
  return new BatchQueryBuilder(this);
};

/**
 * 批量查询构建器
 * @param {GraphQLQueryBuilder} parent - 父构建器实例
 * @constructor
 */
function BatchQueryBuilder(parent) {
  this._parent = parent;
  this._queries = [];
  this._variables = {};
}

/**
 * 向批量查询添加一个命名查询
 * @param {string} alias - 查询别名
 * @param {Function} builderFn - 查询构建函数
 * @return {BatchQueryBuilder} this - 便于链式调用
 */
BatchQueryBuilder.prototype.add = function(alias, builderFn) {
  if (!alias || typeof alias !== 'string') {
    throw new Error('批量查询错误: 查询别名必须是有效的字符串');
  }
  
  if (!builderFn || typeof builderFn !== 'function') {
    throw new Error('批量查询错误: 必须提供查询构建函数');
  }
  
  // 创建新的构建器
  var queryBuilder = new GraphQLQueryBuilder();
  var result = builderFn(queryBuilder);
  
  // 使用函数返回的构建器或传入的构建器
  var builder = result instanceof GraphQLQueryBuilder ? result : queryBuilder;
  
  // 收集变量
  for (var varName in builder._variables) {
    if (builder._variables.hasOwnProperty(varName)) {
      this._variables[varName] = builder._variables[varName];
    }
  }
  
  // 保存查询信息
  this._queries.push({
    alias: alias,
    fields: builder._fields,
    queryParams: builder._queryParams
  });
  
  return this;
};

/**
 * 构建最终的批量查询
 * @return {string} 构建的GraphQL查询字符串
 */
BatchQueryBuilder.prototype.build = function() {
  if (this._queries.length === 0) {
    throw new Error('批量查询错误: 没有添加任何查询');
  }
  
  var query = 'query';
  
  // 添加变量
  var hasVariables = Object.keys(this._variables).length > 0;
  if (hasVariables) {
    query += '(';
    var variableStrings = [];
    
    for (var varName in this._variables) {
      if (this._variables.hasOwnProperty(varName)) {
        var variable = this._variables[varName];
        var variableStr = '$' + varName + ': ' + variable.type;
        
        if (variable.defaultValue !== undefined) {
          variableStr += ' = ' + this._parent._serializeValue(variable.defaultValue);
        }
        
        variableStrings.push(variableStr);
      }
    }
    
    query += variableStrings.join(', ') + ')';
  }
  
  // 添加批量查询主体
  query += ' {';
  
  // 添加各个命名查询
  for (var i = 0; i < this._queries.length; i++) {
    var q = this._queries[i];
    
    // 添加别名和字段
    query += ' ' + q.alias + ': ';
    
    // 处理字段（如果第一个字段包含操作，则使用它，否则创建一个新字段）
    var fields = q.fields;
    if (fields.length > 0) {
      // 添加参数
      var hasParams = Object.keys(q.queryParams).length > 0;
      if (hasParams) {
        query += fields[0] + '(';
        var paramStrings = [];
        
        for (var paramName in q.queryParams) {
          if (q.queryParams.hasOwnProperty(paramName)) {
            try {
              var serializedValue = this._parent._serializeValue(q.queryParams[paramName]);
              paramStrings.push(paramName + ': ' + serializedValue);
            } catch (e) {
              throw new Error('参数序列化错误: ' + e.message + '，参数名: ' + paramName);
            }
          }
        }
        
        query += paramStrings.join(', ') + ')';
        
        // 添加其余字段
        if (fields.length > 1) {
          query += ' { ' + fields.slice(1).join(' ') + ' }';
        }
      } else {
        // 没有参数，直接添加字段
        query += fields.join(' ');
      }
    }
  }
  
  query += ' }';
  
  return query;
};

/**
 * 批量查询构建器也支持片段
 * @param {string} name - 片段名
 * @param {string} typeName - 类型名
 * @param {Array<string>} fields - 片段中的字段
 * @return {BatchQueryBuilder} this - 便于链式调用
 */
BatchQueryBuilder.prototype.fragment = function(name, typeName, fields) {
  this._parent.fragment(name, typeName, fields);
  return this;
};

module.exports = GraphQLQueryBuilder; 