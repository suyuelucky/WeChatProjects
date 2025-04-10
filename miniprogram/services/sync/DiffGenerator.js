/**
 * DiffGenerator组件 - 生成数据差异，支持高效的差量同步
 * 
 * 创建时间: 2025年04月09日 10:36:53 CST
 * 创建者: Claude 3.7 Sonnet
 * 编辑时间: 2025年04月09日 10:37:26 CST
 * 编辑时间: 2025年04月09日 10:39:57 CST
 * 编辑时间: 2025年04月09日 10:42:53 CST
 * 编辑时间: 2025年04月09日 10:44:54 CST
 * 编辑时间: 2025年04月09日 10:45:37 CST
 */

'use strict';

/**
 * 差异生成器
 * 用于比较数据对象，生成差异和应用差异
 * 
 * @class DiffGenerator
 */
function DiffGenerator(options) {
  // 默认选项
  this.options = {
    maxDepth: 10, // 最大嵌套深度
    detectArrayMove: true, // 是否检测数组元素移动
    ignoreCase: false, // 是否忽略字符串大小写
    includeStats: false, // 是否包括统计信息
    format: 'compact' // 差异格式
  };
  
  // 合并选项
  if (options) {
    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        this.options[key] = options[key];
      }
    }
  }
}

/**
 * 生成两个数据对象之间的差异
 * 
 * @param {*} oldData - 原始数据
 * @param {*} newData - 新数据
 * @param {Object} options - 比较选项
 * @returns {Object} 差异对象
 */
DiffGenerator.prototype.generateDiff = function(oldData, newData, options) {
  options = this._mergeOptions(options);
  
  // 检查类型是否相同
  var oldType = this._getType(oldData);
  var newType = this._getType(newData);
  
  // 如果类型不同，则整体替换
  if (oldType !== newType) {
    return {
      type: newType,
      changes: {
        '': { // 空路径表示整体替换
          oldValue: oldData,
          newValue: newData
        }
      }
    };
  }
  
  // 根据数据类型调用不同的差异生成方法
  if (oldType === 'object') {
    return this._generateObjectDiff(oldData, newData, '', 0, options);
  } else if (oldType === 'array') {
    return this._generateArrayDiff(oldData, newData, '', 0, options);
  } else {
    // 基本类型比较
    if (this._areValuesEqual(oldData, newData, options)) {
      return {
        type: newType,
        changes: {}
      };
    } else {
      return {
        type: newType,
        changes: {
          '': {
            oldValue: oldData,
            newValue: newData
          }
        }
      };
    }
  }
};

/**
 * 合并选项
 * @param {Object} customOptions - 自定义选项
 * @returns {Object} 合并后的选项
 * @private
 */
DiffGenerator.prototype._mergeOptions = function(customOptions) {
  var result = {};
  
  // 复制默认选项
  for (var key in this.options) {
    if (this.options.hasOwnProperty(key)) {
      result[key] = this.options[key];
    }
  }
  
  // 合并自定义选项
  if (customOptions) {
    for (var key in customOptions) {
      if (customOptions.hasOwnProperty(key)) {
        result[key] = customOptions[key];
      }
    }
  }
  
  return result;
};

/**
 * 获取值的类型
 * @param {*} value - 要检查的值
 * @returns {string} 值的类型
 * @private
 */
DiffGenerator.prototype._getType = function(value) {
  if (value === null) {
    return 'null';
  }
  
  if (value === undefined) {
    return 'undefined';
  }
  
  if (Array.isArray(value)) {
    return 'array';
  }
  
  return typeof value;
};

/**
 * 比较两个值是否相等
 * @param {*} value1 - 第一个值
 * @param {*} value2 - 第二个值
 * @param {Object} options - 比较选项
 * @returns {boolean} 是否相等
 * @private
 */
DiffGenerator.prototype._areValuesEqual = function(value1, value2, options) {
  // 类型不同，不相等
  var type1 = this._getType(value1);
  var type2 = this._getType(value2);
  
  if (type1 !== type2) {
    return false;
  }
  
  // 对于基本类型，直接比较
  if (type1 === 'string') {
    // 忽略大小写比较
    if (options.ignoreCase) {
      return value1.toLowerCase() === value2.toLowerCase();
    }
  }
  
  // 基本类型直接比较
  return value1 === value2;
};

/**
 * 生成对象差异
 * @param {Object} oldObj - 原始对象
 * @param {Object} newObj - 新对象
 * @param {string} path - 当前路径
 * @param {number} depth - 当前深度
 * @param {Object} options - 比较选项
 * @returns {Object} 差异对象
 * @private
 */
DiffGenerator.prototype._generateObjectDiff = function(oldObj, newObj, path, depth, options) {
  if (depth > options.maxDepth) {
    return {
      type: 'object',
      changes: {
        '': {
          oldValue: oldObj,
          newValue: newObj
        }
      }
    };
  }
  
  var diff = {
    type: 'object',
    changes: {}
  };
  
  // 如果需要统计信息
  if (options.includeStats) {
    diff.stats = {
      changedProperties: 0,
      addedProperties: 0,
      removedProperties: 0,
      totalChanges: 0
    };
  }
  
  // 处理旧对象中的属性
  for (var key in oldObj) {
    if (oldObj.hasOwnProperty(key)) {
      var oldValue = oldObj[key];
      var newPath = path ? path + '.' + key : key;
      
      // 如果新对象中不存在该属性，则添加删除操作
      if (!newObj.hasOwnProperty(key)) {
        diff.changes[newPath] = {
          action: 'remove',
          oldValue: oldValue
        };
        
        if (diff.stats) {
          diff.stats.removedProperties++;
          diff.stats.totalChanges++;
        }
      } else {
        var newValue = newObj[key];
        var oldType = this._getType(oldValue);
        var newType = this._getType(newValue);
        
        // 如果类型不同，则整体替换
        if (oldType !== newType) {
          diff.changes[newPath] = {
            oldValue: oldValue,
            newValue: newValue
          };
          
          if (diff.stats) {
            diff.stats.changedProperties++;
            diff.stats.totalChanges++;
          }
        } 
        // 对于对象和数组，递归比较
        else if (oldType === 'object') {
          var nestedDiff = this._generateObjectDiff(oldValue, newValue, newPath, depth + 1, options);
          this._mergeNestedDiff(diff, nestedDiff);
        } else if (oldType === 'array') {
          var nestedDiff = this._generateArrayDiff(oldValue, newValue, newPath, depth + 1, options);
          this._mergeNestedDiff(diff, nestedDiff);
        } 
        // 基本类型比较
        else if (!this._areValuesEqual(oldValue, newValue, options)) {
          diff.changes[newPath] = {
            oldValue: oldValue,
            newValue: newValue
          };
          
          if (diff.stats) {
            diff.stats.changedProperties++;
            diff.stats.totalChanges++;
          }
        }
      }
    }
  }
  
  // 处理新对象中新增的属性
  for (var key in newObj) {
    if (newObj.hasOwnProperty(key) && !oldObj.hasOwnProperty(key)) {
      var newPath = path ? path + '.' + key : key;
      
      diff.changes[newPath] = {
        action: 'add',
        newValue: newObj[key]
      };
      
      if (diff.stats) {
        diff.stats.addedProperties++;
        diff.stats.totalChanges++;
      }
    }
  }
  
  // 优化差异格式
  if (options.format === 'compact') {
    delete diff.type;
    delete diff.stats;
  }
  
  return diff;
};

/**
 * 生成数组差异
 * @param {Array} oldArray - 原始数组
 * @param {Array} newArray - 新数组
 * @param {string} path - 当前路径
 * @param {number} depth - 当前深度
 * @param {Object} options - 比较选项
 * @returns {Object} 差异对象
 * @private
 */
DiffGenerator.prototype._generateArrayDiff = function(oldArray, newArray, path, depth, options) {
  if (depth > options.maxDepth) {
    return {
      type: 'array',
      changes: {
        '': {
          oldValue: oldArray,
          newValue: newArray
        }
      }
    };
  }
  
  var diff = {
    type: 'array',
    changes: {}
  };
  
  // 记录数组长度变化
  if (oldArray.length !== newArray.length) {
    diff.lengthChanged = true;
    diff.oldLength = oldArray.length;
    diff.newLength = newArray.length;
  }
  
  // 如果需要统计信息
  if (options.includeStats) {
    diff.stats = {
      changedElements: 0,
      addedElements: 0,
      removedElements: 0,
      totalChanges: 0
    };
  }
  
  // 如果有提供objectIdentifier选项，使用基于ID的比较
  if (options.objectIdentifier && typeof options.objectIdentifier === 'string') {
    return this._generateArrayDiffById(oldArray, newArray, path, depth, options);
  }
  
  // 基于索引的比较
  var maxLength = Math.max(oldArray.length, newArray.length);
  
  for (var i = 0; i < maxLength; i++) {
    var newPath = path ? path + '.' + i : i.toString();
    
    // 处理新数组中不存在的元素（被删除）
    if (i >= newArray.length) {
      diff.changes[newPath] = {
        action: 'remove',
        oldValue: oldArray[i]
      };
      
      if (diff.stats) {
        diff.stats.removedElements++;
        diff.stats.totalChanges++;
      }
      continue;
    }
    
    // 处理旧数组中不存在的元素（被添加）
    if (i >= oldArray.length) {
      diff.changes[newPath] = {
        action: 'add',
        newValue: newArray[i]
      };
      
      if (diff.stats) {
        diff.stats.addedElements++;
        diff.stats.totalChanges++;
      }
      continue;
    }
    
    // 处理有更改的元素
    var oldValue = oldArray[i];
    var newValue = newArray[i];
    var oldType = this._getType(oldValue);
    var newType = this._getType(newValue);
    
    // 类型不同，则整体替换
    if (oldType !== newType) {
      diff.changes[newPath] = {
        oldValue: oldValue,
        newValue: newValue
      };
      
      if (diff.stats) {
        diff.stats.changedElements++;
        diff.stats.totalChanges++;
      }
    } 
    // 对于对象和数组，递归比较
    else if (oldType === 'object') {
      var nestedDiff = this._generateObjectDiff(oldValue, newValue, newPath, depth + 1, options);
      this._mergeNestedDiff(diff, nestedDiff);
    } else if (oldType === 'array') {
      var nestedDiff = this._generateArrayDiff(oldValue, newValue, newPath, depth + 1, options);
      this._mergeNestedDiff(diff, nestedDiff);
    } 
    // 基本类型比较
    else if (!this._areValuesEqual(oldValue, newValue, options)) {
      diff.changes[newPath] = {
        oldValue: oldValue,
        newValue: newValue
      };
      
      if (diff.stats) {
        diff.stats.changedElements++;
        diff.stats.totalChanges++;
      }
    }
  }
  
  // 如果开启数组移动检测
  if (options.detectArrayMove && oldArray.length > 0 && newArray.length > 0) {
    var moves = this._detectArrayMoves(oldArray, newArray, options);
    if (moves.length > 0) {
      diff.moves = moves;
    }
  }
  
  // 优化差异格式
  if (options.format === 'compact') {
    delete diff.type;
    delete diff.stats;
  }
  
  return diff;
};

/**
 * 合并嵌套差异到父差异中
 * @param {Object} parentDiff - 父差异对象
 * @param {Object} nestedDiff - 嵌套差异对象
 * @private
 */
DiffGenerator.prototype._mergeNestedDiff = function(parentDiff, nestedDiff) {
  // 合并变更
  for (var path in nestedDiff.changes) {
    if (nestedDiff.changes.hasOwnProperty(path)) {
      parentDiff.changes[path] = nestedDiff.changes[path];
    }
  }
  
  // 合并统计信息
  if (parentDiff.stats && nestedDiff.stats) {
    // 针对对象差异
    if (nestedDiff.stats.changedProperties !== undefined) {
      parentDiff.stats.changedProperties = (parentDiff.stats.changedProperties || 0) + nestedDiff.stats.changedProperties;
      parentDiff.stats.addedProperties = (parentDiff.stats.addedProperties || 0) + nestedDiff.stats.addedProperties;
      parentDiff.stats.removedProperties = (parentDiff.stats.removedProperties || 0) + nestedDiff.stats.removedProperties;
    }
    
    // 针对数组差异
    if (nestedDiff.stats.changedElements !== undefined) {
      parentDiff.stats.changedElements = (parentDiff.stats.changedElements || 0) + nestedDiff.stats.changedElements;
      parentDiff.stats.addedElements = (parentDiff.stats.addedElements || 0) + nestedDiff.stats.addedElements;
      parentDiff.stats.removedElements = (parentDiff.stats.removedElements || 0) + nestedDiff.stats.removedElements;
    }
    
    // 总变更数
    parentDiff.stats.totalChanges += nestedDiff.stats.totalChanges;
  }
};

/**
 * 基于ID的数组差异比较
 * @param {Array} oldArray - 原始数组
 * @param {Array} newArray - 新数组
 * @param {string} path - 当前路径
 * @param {number} depth - 当前深度
 * @param {Object} options - 比较选项
 * @returns {Object} 差异对象
 * @private
 */
DiffGenerator.prototype._generateArrayDiffById = function(oldArray, newArray, path, depth, options) {
  var idField = options.objectIdentifier;
  var diff = {
    type: 'array',
    changes: {}
  };
  
  // 记录数组长度变化
  if (oldArray.length !== newArray.length) {
    diff.lengthChanged = true;
    diff.oldLength = oldArray.length;
    diff.newLength = newArray.length;
  }
  
  // 如果需要统计信息
  if (options.includeStats) {
    diff.stats = {
      changedElements: 0,
      addedElements: 0,
      removedElements: 0,
      totalChanges: 0
    };
  }
  
  // 创建ID到索引的映射
  var oldIdMap = {};
  var newIdMap = {};
  
  // 构建ID到索引的映射
  for (var i = 0; i < oldArray.length; i++) {
    var item = oldArray[i];
    if (item && typeof item === 'object' && item[idField] !== undefined) {
      oldIdMap[item[idField]] = i;
    }
  }
  
  for (var i = 0; i < newArray.length; i++) {
    var item = newArray[i];
    if (item && typeof item === 'object' && item[idField] !== undefined) {
      newIdMap[item[idField]] = i;
    }
  }
  
  // 处理新增、删除和移动的元素
  var processedOldIndices = {};
  
  // 遍历新数组，查找新增和修改的元素
  for (var i = 0; i < newArray.length; i++) {
    var newItem = newArray[i];
    var newPath = path ? path + '.' + i : i.toString();
    
    // 如果元素不是对象或没有ID字段，使用基于索引的比较
    if (!newItem || typeof newItem !== 'object' || newItem[idField] === undefined) {
      if (i < oldArray.length) {
        var oldItem = oldArray[i];
        var oldType = this._getType(oldItem);
        var newType = this._getType(newItem);
        
        if (oldType !== newType || !this._areValuesEqual(oldItem, newItem, options)) {
          diff.changes[newPath] = {
            oldValue: oldItem,
            newValue: newItem
          };
          
          if (diff.stats) {
            diff.stats.changedElements++;
            diff.stats.totalChanges++;
          }
        }
      } else {
        // 新增元素
        diff.changes[newPath] = {
          action: 'add',
          newValue: newItem
        };
        
        if (diff.stats) {
          diff.stats.addedElements++;
          diff.stats.totalChanges++;
        }
      }
      continue;
    }
    
    var id = newItem[idField];
    var oldIndex = oldIdMap[id];
    
    // 如果在旧数组中找不到对应ID的元素，则是新增的
    if (oldIndex === undefined) {
      diff.changes[newPath] = {
        action: 'add',
        newValue: newItem
      };
      
      if (diff.stats) {
        diff.stats.addedElements++;
        diff.stats.totalChanges++;
      }
    } else {
      // 标记这个旧索引已处理
      processedOldIndices[oldIndex] = true;
      
      // 获取旧元素
      var oldItem = oldArray[oldIndex];
      
      // 如果位置发生变化，记录移动
      if (oldIndex !== i && options.detectArrayMove) {
        if (!diff.moves) {
          diff.moves = [];
        }
        diff.moves.push({
          from: oldIndex,
          to: i,
          value: newItem
        });
      }
      
      // 比较元素内容是否有变化
      if (typeof oldItem === 'object' && typeof newItem === 'object') {
        // 递归比较对象
        var itemDiff = this._generateObjectDiff(oldItem, newItem, newPath, depth + 1, options);
        this._mergeNestedDiff(diff, itemDiff);
      } else if (!this._areValuesEqual(oldItem, newItem, options)) {
        // 基本类型比较
        diff.changes[newPath] = {
          oldValue: oldItem,
          newValue: newItem
        };
        
        if (diff.stats) {
          diff.stats.changedElements++;
          diff.stats.totalChanges++;
        }
      }
    }
  }
  
  // 找出删除的元素
  for (var i = 0; i < oldArray.length; i++) {
    if (!processedOldIndices[i]) {
      var oldItem = oldArray[i];
      var oldPath = path ? path + '.' + i : i.toString();
      
      diff.changes[oldPath] = {
        action: 'remove',
        oldValue: oldItem
      };
      
      if (diff.stats) {
        diff.stats.removedElements++;
        diff.stats.totalChanges++;
      }
    }
  }
  
  return diff;
};

/**
 * 检测数组中元素的移动
 * @param {Array} oldArray - 原始数组
 * @param {Array} newArray - 新数组
 * @param {Object} options - 比较选项
 * @returns {Array} 移动操作数组
 * @private
 */
DiffGenerator.prototype._detectArrayMoves = function(oldArray, newArray, options) {
  var moves = [];
  var compareFunc = options.compareFunc;
  
  // 如果没有自定义比较函数，创建一个基本的相等比较
  if (!compareFunc) {
    compareFunc = function(a, b) {
      return this._areValuesEqual(a, b, options);
    }.bind(this);
  }
  
  // 创建元素到索引的映射
  var oldElementMap = {};
  
  // 只处理基本类型和简单对象
  for (var i = 0; i < oldArray.length; i++) {
    var item = oldArray[i];
    var type = this._getType(item);
    
    if (type !== 'object' && type !== 'array') {
      var key = String(item);
      if (!oldElementMap[key]) {
        oldElementMap[key] = [];
      }
      oldElementMap[key].push(i);
    }
  }
  
  // 跟踪已处理的源索引
  var processed = {};
  
  // 检测移动
  for (var i = 0; i < newArray.length; i++) {
    var item = newArray[i];
    var type = this._getType(item);
    
    if (type !== 'object' && type !== 'array') {
      var key = String(item);
      var indices = oldElementMap[key];
      
      if (indices && indices.length > 0) {
        // 找到第一个未处理的匹配索引
        var foundIndex = -1;
        for (var j = 0; j < indices.length; j++) {
          if (!processed[indices[j]]) {
            foundIndex = indices[j];
            break;
          }
        }
        
        if (foundIndex !== -1 && foundIndex !== i) {
          moves.push({
            from: foundIndex,
            to: i,
            value: item
          });
          processed[foundIndex] = true;
        } else if (foundIndex !== -1) {
          processed[foundIndex] = true;
        }
      }
    }
  }
  
  return moves;
};

/**
 * 应用差异到数据对象
 * @param {*} target - 需要应用差异的目标数据
 * @param {Object} diff - 差异对象
 * @returns {*} 应用差异后的数据
 */
DiffGenerator.prototype.applyDiff = function(target, diff) {
  // 如果差异为空或无效，直接返回原对象
  if (!diff || !diff.changes || Object.keys(diff.changes).length === 0) {
    return target;
  }
  
  // 复制目标对象，避免修改原对象
  var result = this._deepClone(target);
  
  // 应用变更
  for (var path in diff.changes) {
    if (diff.changes.hasOwnProperty(path)) {
      var change = diff.changes[path];
      
      // 处理空路径（整体替换）
      if (path === '') {
        return change.newValue;
      }
      
      // 解析路径
      var pathParts = path.split('.');
      var current = result;
      var parent = null;
      var lastKey = null;
      
      // 遍历路径找到需要修改的位置
      for (var i = 0; i < pathParts.length - 1; i++) {
        var key = pathParts[i];
        parent = current;
        
        // 如果路径上的对象不存在，则创建
        if (current[key] === undefined) {
          // 判断下一个路径部分是数字还是字符串，以决定创建数组还是对象
          var nextKey = pathParts[i + 1];
          var isNextKeyNumeric = !isNaN(parseInt(nextKey, 10));
          current[key] = isNextKeyNumeric ? [] : {};
        }
        
        current = current[key];
      }
      
      // 最后一个路径部分
      lastKey = pathParts[pathParts.length - 1];
      
      // 根据变更类型应用变更
      if (change.action === 'add') {
        // 添加属性
        current[lastKey] = change.newValue;
      } else if (change.action === 'remove') {
        // 删除属性
        if (Array.isArray(current)) {
          // 对于数组，我们需要特殊处理
          // 注意：删除数组元素后需要处理数组长度变化
          var index = parseInt(lastKey, 10);
          if (!isNaN(index)) {
            current.splice(index, 1);
          }
        } else {
          // 对于对象，直接删除属性
          delete current[lastKey];
        }
      } else {
        // 修改属性
        current[lastKey] = change.newValue;
      }
    }
  }
  
  // 处理数组元素移动
  if (diff.moves && diff.moves.length > 0 && diff.type === 'array' && Array.isArray(result)) {
    // 先按"to"索引排序，从后向前处理，避免索引混乱
    diff.moves.sort(function(a, b) {
      return b.to - a.to;
    });
    
    // 应用移动操作
    for (var i = 0; i < diff.moves.length; i++) {
      var move = diff.moves[i];
      // 由于我们已经复制了数组，这里的操作是安全的
      var element = result.splice(move.from, 1)[0];
      result.splice(move.to, 0, element);
    }
  }
  
  return result;
};

/**
 * 深度克隆对象
 * @param {*} obj - 需要克隆的对象
 * @returns {*} 克隆后的对象
 * @private
 */
DiffGenerator.prototype._deepClone = function(obj) {
  // 处理null和undefined
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // 处理基本类型
  if (typeof obj !== 'object') {
    return obj;
  }
  
  // 处理数组
  if (Array.isArray(obj)) {
    var cloneArr = [];
    for (var i = 0; i < obj.length; i++) {
      cloneArr[i] = this._deepClone(obj[i]);
    }
    return cloneArr;
  }
  
  // 处理对象
  var cloneObj = {};
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloneObj[key] = this._deepClone(obj[key]);
    }
  }
  return cloneObj;
};

module.exports = DiffGenerator; 