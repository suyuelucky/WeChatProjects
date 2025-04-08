'use strict';

/**
 * 文档时间戳管理组件
 * 用于为文档自动添加创建时间和修改时间的时间戳，并在文档更新时智能维护这些时间信息
 * @version 1.0.0
 * @author Claude-3.7-Sonnet
 * @date 2025-04-08
 */

/**
 * 时间戳管理器构造函数
 * @param {Object} options - 配置选项
 * @param {string} options.dateFormat - 时间戳的日期格式，默认为"YYYY-MM-DD HH:mm:ss"
 * @param {string} options.timestampHeader - 创建时间的标头文本，默认为"> **创建时间**: "
 * @param {string} options.modifiedHeader - 修改时间的标头文本，默认为"> **最后修改**: "
 * @param {string} options.authorHeader - 创建者的标头文本，默认为"> **创建者**: "
 * @param {boolean} options.historyEnabled - 是否启用修改历史记录功能，默认为true
 * @param {number} options.minChangeInterval - 最小允许修改时间间隔（毫秒），默认为60000（1分钟）
 * @constructor
 */
function TimestampManager(options) {
  // 默认配置
  this.options = {
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    timestampHeader: '> **创建时间**: ',
    modifiedHeader: '> **最后修改**: ',
    authorHeader: '> **创建者**: ',
    historyEnabled: true,
    minChangeInterval: 60000
  };

  // 合并用户配置
  if (options) {
    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        this.options[key] = options[key];
      }
    }
  }

  // 内部状态
  this._initialized = false;
  this._events = {};
  this._docCache = {};
}

/**
 * 初始化组件
 * @returns {Promise} 初始化完成的Promise
 */
TimestampManager.prototype.init = function() {
  var self = this;
  
  if (this._initPromise) {
    return this._initPromise;
  }
  
  this._initPromise = new Promise(function(resolve, reject) {
    try {
      self._initialized = true;
      resolve();
    } catch (error) {
      reject({
        code: 'INIT_ERROR',
        message: '初始化时间戳管理器失败',
        details: error
      });
    }
  });
  
  return this._initPromise;
};

/**
 * 清理资源
 * @returns {Promise} 清理完成的Promise
 */
TimestampManager.prototype.destroy = function() {
  var self = this;
  
  return new Promise(function(resolve) {
    self._initialized = false;
    self._initPromise = null;
    self._events = {};
    self._docCache = {};
    resolve();
  });
};

/**
 * 处理文档时间戳
 * @param {string} docContent - 文档内容
 * @param {Object} options - 配置选项
 * @param {string} options.authorName - 作者名称，用于新文档
 * @param {string} options.dateFormat - 日期格式，默认为"YYYY-MM-DD HH:mm:ss"
 * @param {boolean} options.forceUpdate - 是否强制更新修改时间，默认为false
 * @returns {string} 更新后的文档内容
 * @throws {Error} 时间戳处理错误
 */
TimestampManager.prototype.processDocument = function(docContent, options) {
  if (!this._initialized) {
    throw new Error('组件未初始化，请先调用init()方法');
  }
  
  // 合并选项
  var mergedOptions = {};
  for (var key in this.options) {
    if (this.options.hasOwnProperty(key)) {
      mergedOptions[key] = this.options[key];
    }
  }
  if (options) {
    for (var optKey in options) {
      if (options.hasOwnProperty(optKey)) {
        mergedOptions[optKey] = options[optKey];
      }
    }
  }
  
  try {
    // 提取现有时间戳
    var existingTimestamps = this.extractTimestamps(docContent);
    
    // 计算文档哈希，用于变更检测
    var docHash = this._calculateHash(docContent);
    
    // 确定是新文档还是更新文档
    var isNewDocument = !existingTimestamps.created.date;
    var needsUpdate = false;
    
    if (isNewDocument) {
      // 新文档，生成完整时间戳
      var now = new Date();
      var author = mergedOptions.authorName || 'Unknown';
      var timestamps = this.generateTimestamps(now, author, mergedOptions);
      
      this._triggerEvent('onNewDocumentCreated', {
        author: author,
        timestamp: now
      });
      
      return this.updateDocumentTimestamps(docContent, timestamps, mergedOptions);
    } else {
      // 已有文档，检查是否需要更新修改时间
      if (mergedOptions.forceUpdate) {
        needsUpdate = true;
      } else if (existingTimestamps.docHash && existingTimestamps.docHash !== docHash) {
        // 检查文档内容是否有实质性变更
        var lastModified = this._parseDate(existingTimestamps.modified.date);
        var now = new Date();
        
        // 检查时间间隔
        if (now - lastModified > mergedOptions.minChangeInterval) {
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        // 更新修改时间
        var modifiedTimestamp = this.generateModifiedTimestamp(new Date(), mergedOptions);
        existingTimestamps.modified = modifiedTimestamp;
        existingTimestamps.docHash = docHash;
        
        this._triggerEvent('onTimestampUpdated', {
          oldTimestamps: existingTimestamps,
          newTimestamps: existingTimestamps
        });
        
        return this.updateDocumentTimestamps(docContent, existingTimestamps, mergedOptions);
      } else {
        // 不需要更新
        return docContent;
      }
    }
  } catch (error) {
    this._triggerEvent('onError', {
      error: error
    });
    throw error;
  }
};

/**
 * 从文档中提取时间戳信息
 * @param {string} docContent - 文档内容
 * @returns {Object} 时间戳信息对象，包含创建时间、修改时间、创建者等
 * @throws {Error} 解析错误
 */
TimestampManager.prototype.extractTimestamps = function(docContent) {
  var result = {
    created: { date: '', line: -1 },
    modified: { date: '', line: -1 },
    author: { name: '', line: -1 },
    history: [],
    docHash: ''
  };
  
  // 缓存检查，避免重复解析
  var docHash = this._calculateHash(docContent);
  if (this._docCache[docHash]) {
    return JSON.parse(JSON.stringify(this._docCache[docHash]));
  }
  
  var lines = docContent.split('\n');
  
  // 定义正则表达式匹配模式
  var createdRegex = new RegExp('^' + this._escapeRegExp(this.options.timestampHeader) + '(.+)$');
  var modifiedRegex = new RegExp('^' + this._escapeRegExp(this.options.modifiedHeader) + '(.+)$');
  var authorRegex = new RegExp('^' + this._escapeRegExp(this.options.authorHeader) + '(.+)$');
  
  // 查找时间戳行
  for (var i = 0; i < Math.min(lines.length, 20); i++) { // 只检查前20行
    var line = lines[i];
    
    var createdMatch = line.match(createdRegex);
    if (createdMatch) {
      result.created.date = createdMatch[1].trim();
      result.created.line = i;
      continue;
    }
    
    var modifiedMatch = line.match(modifiedRegex);
    if (modifiedMatch) {
      result.modified.date = modifiedMatch[1].trim();
      result.modified.line = i;
      continue;
    }
    
    var authorMatch = line.match(authorRegex);
    if (authorMatch) {
      result.author.name = authorMatch[1].trim();
      result.author.line = i;
      continue;
    }
  }
  
  // 尝试解析修改历史（如果有）
  if (this.options.historyEnabled) {
    var historyStartIndex = docContent.indexOf('## 修订历史');
    if (historyStartIndex !== -1) {
      var historySection = docContent.substring(historyStartIndex);
      var historyLines = historySection.split('\n');
      
      // 跳过标题和表头
      for (var j = 2; j < historyLines.length; j++) {
        var historyLine = historyLines[j];
        if (historyLine.indexOf('|') !== -1) {
          var parts = historyLine.split('|').map(function(part) {
            return part.trim();
          }).filter(function(part) {
            return part.length > 0;
          });
          
          if (parts.length >= 4) {
            result.history.push({
              date: parts[0],
              version: parts[1],
              description: parts[2],
              author: parts[3]
            });
          }
        }
      }
    }
  }
  
  // 缓存解析结果
  result.docHash = docHash;
  this._docCache[docHash] = JSON.parse(JSON.stringify(result));
  
  return result;
};

/**
 * 生成完整的时间戳信息
 * @param {Date} timestamp - 时间戳时间，默认为当前时间
 * @param {string} author - 作者名称
 * @param {Object} options - 配置选项
 * @returns {Object} 生成的时间戳信息对象
 */
TimestampManager.prototype.generateTimestamps = function(timestamp, author, options) {
  timestamp = timestamp || new Date();
  var formattedDate = this._formatDate(timestamp, options.dateFormat);
  
  return {
    created: {
      date: formattedDate,
      line: -1
    },
    modified: {
      date: formattedDate,
      line: -1
    },
    author: {
      name: author,
      line: -1
    },
    history: [
      {
        date: formattedDate,
        version: '1.0',
        description: '初始版本',
        author: author
      }
    ],
    docHash: ''
  };
};

/**
 * 生成修改时间戳
 * @param {Date} timestamp - 修改时间，默认为当前时间
 * @param {Object} options - 配置选项
 * @returns {Object} 修改时间对象
 */
TimestampManager.prototype.generateModifiedTimestamp = function(timestamp, options) {
  timestamp = timestamp || new Date();
  var formattedDate = this._formatDate(timestamp, options.dateFormat);
  
  return {
    date: formattedDate,
    line: -1
  };
};

/**
 * 在文档中更新时间戳
 * @param {string} docContent - 文档内容
 * @param {Object} timestamps - 时间戳信息对象
 * @param {Object} options - 配置选项
 * @returns {string} 更新后的文档内容
 */
TimestampManager.prototype.updateDocumentTimestamps = function(docContent, timestamps, options) {
  var lines = docContent.split('\n');
  var updatedLines = lines.slice();
  
  // 如果是新文档或者找不到时间戳，则插入在文档开头
  if (timestamps.created.line === -1 && timestamps.modified.line === -1 && timestamps.author.line === -1) {
    // 寻找合适的插入位置
    var insertPosition = 0;
    
    // 查找文档标题
    for (var i = 0; i < Math.min(lines.length, 5); i++) {
      if (lines[i].match(/^#\s+/)) {
        insertPosition = i + 1;
        break;
      }
    }
    
    // 插入时间戳
    var timestampLines = [
      '',
      options.timestampHeader + timestamps.created.date,
      options.modifiedHeader + timestamps.modified.date,
      options.authorHeader + timestamps.author.name,
      ''
    ];
    
    updatedLines.splice(insertPosition, 0, ...timestampLines);
  } else {
    // 更新现有时间戳
    if (timestamps.created.line !== -1) {
      updatedLines[timestamps.created.line] = options.timestampHeader + timestamps.created.date;
    }
    
    if (timestamps.modified.line !== -1) {
      updatedLines[timestamps.modified.line] = options.modifiedHeader + timestamps.modified.date;
    } else if (timestamps.created.line !== -1) {
      // 如果没有修改时间行但有创建时间行，在创建时间后插入修改时间
      updatedLines.splice(timestamps.created.line + 1, 0, options.modifiedHeader + timestamps.modified.date);
    }
    
    if (timestamps.author.line !== -1) {
      updatedLines[timestamps.author.line] = options.authorHeader + timestamps.author.name;
    }
  }
  
  // 如果启用了历史记录并有修改历史
  if (options.historyEnabled && timestamps.history && timestamps.history.length > 0) {
    this._updateDocumentHistory(updatedLines, timestamps.history);
  }
  
  return updatedLines.join('\n');
};

/**
 * 更新文档的修改历史记录
 * @param {Array} docLines - 文档行数组
 * @param {Array} history - 历史记录数组
 * @returns {Array} 更新后的文档行数组
 * @private
 */
TimestampManager.prototype._updateDocumentHistory = function(docLines, history) {
  // 查找修订历史部分
  var historyStartIndex = -1;
  var historyEndIndex = -1;
  
  for (var i = 0; i < docLines.length; i++) {
    if (docLines[i].match(/^##\s+修订历史/)) {
      historyStartIndex = i;
      
      // 查找历史部分结束位置（下一个同级或更高级标题）
      for (var j = i + 1; j < docLines.length; j++) {
        if (docLines[j].match(/^#{1,2}\s+/)) {
          historyEndIndex = j;
          break;
        }
      }
      
      if (historyEndIndex === -1) {
        historyEndIndex = docLines.length;
      }
      
      break;
    }
  }
  
  // 构建历史表格
  var historyTable = [
    '## 修订历史',
    '',
    '| 日期 | 版本 | 修改内容 | 修改人 |',
    '|------|------|---------|-------|'
  ];
  
  // 添加历史记录行
  for (var k = 0; k < history.length; k++) {
    var record = history[k];
    historyTable.push('| ' + record.date + ' | ' + record.version + ' | ' + record.description + ' | ' + record.author + ' |');
  }
  
  // 插入或替换历史部分
  if (historyStartIndex === -1) {
    // 在文档末尾添加
    docLines.push('');
    docLines.push(...historyTable);
  } else {
    // 替换现有历史部分
    docLines.splice(historyStartIndex, historyEndIndex - historyStartIndex, ...historyTable);
  }
  
  return docLines;
};

/**
 * 更新文档的修改历史记录
 * @param {string} docContent - 文档内容
 * @param {Object} changeInfo - 变更信息
 * @returns {string} 更新后的文档内容
 */
TimestampManager.prototype.updateDocumentHistory = function(docContent, changeInfo) {
  if (!this._initialized) {
    throw new Error('组件未初始化，请先调用init()方法');
  }
  
  var timestamps = this.extractTimestamps(docContent);
  
  // 添加新的历史记录
  timestamps.history.unshift({
    date: this._formatDate(new Date(), this.options.dateFormat),
    version: changeInfo.version || this._incrementVersion(timestamps.history[0].version),
    description: changeInfo.description || '更新文档',
    author: changeInfo.author || timestamps.author.name
  });
  
  // 更新文档
  return this.updateDocumentTimestamps(docContent, timestamps, this.options);
};

/**
 * 计算文档内容的哈希值
 * @param {string} content - 文档内容
 * @returns {string} 哈希值
 * @private
 */
TimestampManager.prototype._calculateHash = function(content) {
  // 简单哈希实现，用于变更检测
  var hash = 0;
  if (content.length === 0) return hash.toString();
  
  // 移除时间戳行再计算哈希
  var processedContent = content.replace(
    new RegExp('^' + this._escapeRegExp(this.options.timestampHeader) + '.+$', 'gm'), ''
  ).replace(
    new RegExp('^' + this._escapeRegExp(this.options.modifiedHeader) + '.+$', 'gm'), ''
  );
  
  for (var i = 0; i < processedContent.length; i++) {
    var char = processedContent.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  return hash.toString();
};

/**
 * 解析日期字符串
 * @param {string} dateStr - 日期字符串
 * @returns {Date} 解析后的Date对象
 * @private
 */
TimestampManager.prototype._parseDate = function(dateStr) {
  // 尝试解析多种日期格式
  var formats = [
    'YYYY-MM-DD HH:mm:ss',
    'YYYY/MM/DD HH:mm:ss',
    'YYYY-MM-DD HH:mm',
    'YYYY/MM/DD HH:mm',
    'YYYY-MM-DD',
    'YYYY/MM/DD'
  ];
  
  for (var i = 0; i < formats.length; i++) {
    var date = this._tryParseDate(dateStr, formats[i]);
    if (date) return date;
  }
  
  // 如果无法解析，返回当前时间
  return new Date();
};

/**
 * 尝试按指定格式解析日期
 * @param {string} dateStr - 日期字符串
 * @param {string} format - 日期格式
 * @returns {Date|null} 解析后的Date对象，解析失败返回null
 * @private
 */
TimestampManager.prototype._tryParseDate = function(dateStr, format) {
  // 简单日期解析实现
  var date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // 更复杂的格式需要手动解析
  // 这里仅作为示例，实际应用中可能需要更复杂的解析逻辑
  var regex = format
    .replace('YYYY', '(\\d{4})')
    .replace('MM', '(\\d{2})')
    .replace('DD', '(\\d{2})')
    .replace('HH', '(\\d{2})')
    .replace('mm', '(\\d{2})')
    .replace('ss', '(\\d{2})');
  
  var match = dateStr.match(new RegExp(regex));
  if (!match) return null;
  
  // 根据格式提取年月日时分秒
  var parts = {
    year: 0, month: 0, day: 0,
    hour: 0, minute: 0, second: 0
  };
  
  var positions = [];
  var pos = 1;
  
  if (format.indexOf('YYYY') !== -1) positions.push({ name: 'year', pos: format.indexOf('YYYY') });
  if (format.indexOf('MM') !== -1) positions.push({ name: 'month', pos: format.indexOf('MM') });
  if (format.indexOf('DD') !== -1) positions.push({ name: 'day', pos: format.indexOf('DD') });
  if (format.indexOf('HH') !== -1) positions.push({ name: 'hour', pos: format.indexOf('HH') });
  if (format.indexOf('mm') !== -1) positions.push({ name: 'minute', pos: format.indexOf('mm') });
  if (format.indexOf('ss') !== -1) positions.push({ name: 'second', pos: format.indexOf('ss') });
  
  positions.sort(function(a, b) { return a.pos - b.pos; });
  
  for (var i = 0; i < positions.length; i++) {
    parts[positions[i].name] = parseInt(match[pos++], 10);
  }
  
  var result = new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  
  return isNaN(result.getTime()) ? null : result;
};

/**
 * 格式化日期
 * @param {Date} date - 日期对象
 * @param {string} format - 日期格式
 * @returns {string} 格式化后的日期字符串
 * @private
 */
TimestampManager.prototype._formatDate = function(date, format) {
  format = format || this.options.dateFormat;
  
  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  var day = date.getDate();
  var hour = date.getHours();
  var minute = date.getMinutes();
  var second = date.getSeconds();
  
  // 补零
  var pad = function(num) {
    return (num < 10 ? '0' : '') + num;
  };
  
  return format
    .replace('YYYY', year)
    .replace('MM', pad(month))
    .replace('DD', pad(day))
    .replace('HH', pad(hour))
    .replace('mm', pad(minute))
    .replace('ss', pad(second));
};

/**
 * 增加版本号
 * @param {string} version - 当前版本号
 * @returns {string} 增加后的版本号
 * @private
 */
TimestampManager.prototype._incrementVersion = function(version) {
  var parts = version.split('.');
  if (parts.length === 1) {
    return (parseInt(parts[0], 10) + 1).toString();
  }
  
  var lastPart = parseInt(parts[parts.length - 1], 10) + 1;
  parts[parts.length - 1] = lastPart.toString();
  return parts.join('.');
};

/**
 * 为正则表达式转义特殊字符
 * @private
 * @param {string} string - 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
TimestampManager.prototype._escapeRegExp = function(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * 注册事件监听器
 * @param {string} eventName - 事件名称
 * @param {Function} handler - 事件处理函数
 */
TimestampManager.prototype.on = function(eventName, handler) {
  if (!this._events[eventName]) {
    this._events[eventName] = [];
  }
  this._events[eventName].push(handler);
};

/**
 * 移除事件监听器
 * @param {string} eventName - 事件名称
 * @param {Function} handler - 事件处理函数
 */
TimestampManager.prototype.off = function(eventName, handler) {
  if (!this._events[eventName]) return;
  
  var index = this._events[eventName].indexOf(handler);
  if (index !== -1) {
    this._events[eventName].splice(index, 1);
  }
};

/**
 * 触发事件
 * @private
 * @param {string} eventName - 事件名称
 * @param {Object} data - 事件数据
 */
TimestampManager.prototype._triggerEvent = function(eventName, data) {
  if (!this._events[eventName]) return;
  
  for (var i = 0; i < this._events[eventName].length; i++) {
    this._events[eventName][i](data);
  }
};

// 导出组件
module.exports = TimestampManager; 