'use strict';

/**
 * 文档自动索引生成组件
 * 用于解析Markdown文档中的标题结构，生成内部链接索引
 * @version 1.0.0
 * @author Claude-3.7-Sonnet
 * @date 2025-04-08
 */

/**
 * 文档索引生成器构造函数
 * @param {Object} options - 配置选项
 * @param {number} options.maxDepth - 索引最大深度，默认为3
 * @param {boolean} options.updateInPlace - 是否在文档中更新索引，默认为true
 * @param {string} options.indexMarker - 索引标记，用于定位索引位置，默认为"## 内部索引"
 * @param {boolean} options.includeIntro - 是否在索引前包含介绍文本，默认为false
 * @param {string} options.bulletStyle - 索引项的列表样式，可选"-"、"*"、"+"，默认为"-"
 * @constructor
 */
function DocIndexer(options) {
  // 默认配置
  this.options = {
    maxDepth: 3,
    updateInPlace: true,
    indexMarker: '## 内部索引',
    includeIntro: false,
    bulletStyle: '-'
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
}

/**
 * 初始化组件
 * @returns {Promise} 初始化完成的Promise
 */
DocIndexer.prototype.init = function() {
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
        message: '初始化索引生成器失败',
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
DocIndexer.prototype.destroy = function() {
  var self = this;
  
  return new Promise(function(resolve) {
    self._initialized = false;
    self._initPromise = null;
    self._events = {};
    resolve();
  });
};

/**
 * 解析文档并生成内部索引
 * @param {string} docContent - 文档内容
 * @param {Object} options - 可选的配置选项，会覆盖实例配置
 * @returns {string} 更新后的文档内容或只有索引的内容
 * @throws {Error} 解析错误或索引生成错误
 */
DocIndexer.prototype.generateIndex = function(docContent, options) {
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
    // 解析标题结构
    var headings = this.parseHeadings(docContent, mergedOptions.maxDepth);
    
    // 生成索引内容
    var indexContent = this.createIndexContent(headings, mergedOptions);
    
    // 触发索引生成事件
    this._triggerEvent('onIndexGenerated', {
      indexContent: indexContent
    });
    
    // 如果需要更新文档
    if (mergedOptions.updateInPlace) {
      return this.updateDocumentIndex(docContent, indexContent, mergedOptions.indexMarker);
    } else {
      return indexContent;
    }
  } catch (error) {
    this._triggerEvent('onError', {
      error: error
    });
    throw error;
  }
};

/**
 * 解析文档中的标题结构
 * @param {string} docContent - 文档内容
 * @param {number} maxDepth - 最大解析深度，默认为6
 * @returns {Array} 标题结构数组
 * @throws {Error} 解析错误
 */
DocIndexer.prototype.parseHeadings = function(docContent, maxDepth) {
  maxDepth = maxDepth || 6;
  
  var lines = docContent.split('\n');
  var headings = [];
  var headingRegex = /^(#{1,6})\s+(.+)$/;
  
  // 顶层标题栈
  var rootHeadings = [];
  // 当前处理级别的标题栈
  var headingStack = [rootHeadings];
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var match = line.match(headingRegex);
    
    if (match) {
      var level = match[1].length;
      var text = match[2].trim();
      
      // 只处理指定深度内的标题
      if (level <= maxDepth) {
        var slug = this._createSlug(text);
        var heading = {
          level: level,
          text: text,
          slug: slug,
          line: i + 1,
          children: []
        };
        
        // 调整堆栈深度以匹配当前标题级别
        while (headingStack.length > level) {
          headingStack.pop();
        }
        
        // 如果需要更深的级别，添加数组到堆栈
        while (headingStack.length < level) {
          var lastHeading = headingStack[headingStack.length - 1];
          var lastItem = lastHeading[lastHeading.length - 1];
          if (!lastItem) {
            // 如果没有上一级标题，创建一个虚拟标题
            lastItem = {
              level: headingStack.length,
              text: '',
              slug: '',
              line: i,
              children: []
            };
            lastHeading.push(lastItem);
          }
          headingStack.push(lastItem.children);
        }
        
        // 将标题添加到当前级别
        headingStack[level - 1].push(heading);
      }
    }
  }
  
  return rootHeadings;
};

/**
 * 根据标题结构创建索引内容
 * @param {Array} headings - 标题结构数组
 * @param {Object} options - 配置选项
 * @returns {string} 索引内容
 */
DocIndexer.prototype.createIndexContent = function(headings, options) {
  var bulletStyle = options.bulletStyle || '-';
  var maxDepth = options.maxDepth || 3;
  var result = options.indexMarker + '\n';
  
  if (options.includeIntro) {
    result += '文档内容索引：\n\n';
  }
  
  /**
   * 递归生成索引项
   * @param {Array} items - 标题数组
   * @param {number} depth - 当前深度
   * @param {string} prefix - 缩进前缀
   */
  function generateItems(items, depth, prefix) {
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      
      // 跳过空标题
      if (!item.text) continue;
      
      // 添加索引项
      result += prefix + bulletStyle + ' [' + item.text + '](#' + item.slug + ')\n';
      
      // 递归处理子标题，但限制深度
      if (item.children && item.children.length && depth < maxDepth) {
        generateItems(item.children, depth + 1, prefix + '  ');
      }
    }
  }
  
  generateItems(headings, 1, '');
  
  return result;
};

/**
 * 在文档中更新索引
 * @param {string} docContent - 文档内容
 * @param {string} indexContent - 索引内容
 * @param {string} indexMarker - 索引标记
 * @returns {string} 更新后的文档内容
 */
DocIndexer.prototype.updateDocumentIndex = function(docContent, indexContent, indexMarker) {
  var markerRegex = new RegExp('(' + this._escapeRegExp(indexMarker) + ')([\\s\\S]*?)(?=##|$)', 'g');
  var match = markerRegex.exec(docContent);
  
  if (match) {
    // 找到现有索引，替换它
    var start = match.index;
    var end = start + match[0].length;
    return docContent.substring(0, start) + indexContent + docContent.substring(end);
  } else {
    // 没有找到索引，尝试在文档标题之后插入
    var titleRegex = /^#\s+(.+)$/m;
    var titleMatch = titleRegex.exec(docContent);
    
    if (titleMatch) {
      var titleEnd = titleMatch.index + titleMatch[0].length;
      return docContent.substring(0, titleEnd) + '\n\n' + indexContent + docContent.substring(titleEnd);
    } else {
      // 没有找到标题，插入到文档开头
      return indexContent + '\n\n' + docContent;
    }
  }
};

/**
 * 根据文本创建slug（用于锚点链接）
 * @private
 * @param {string} text - 标题文本
 * @returns {string} 生成的slug
 */
DocIndexer.prototype._createSlug = function(text) {
  return text
    .toLowerCase()
    .replace(/[\s\.\:\/\\]/g, '-') // 替换空格和标点为连字符
    .replace(/[^\w\-]/g, '') // 移除非单词字符
    .replace(/\-+/g, '-') // 替换多个连字符为单个连字符
    .replace(/^\-+|\-+$/g, ''); // 移除开头和结尾的连字符
};

/**
 * 为正则表达式转义特殊字符
 * @private
 * @param {string} string - 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
DocIndexer.prototype._escapeRegExp = function(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * 注册事件监听器
 * @param {string} eventName - 事件名称
 * @param {Function} handler - 事件处理函数
 */
DocIndexer.prototype.on = function(eventName, handler) {
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
DocIndexer.prototype.off = function(eventName, handler) {
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
DocIndexer.prototype._triggerEvent = function(eventName, data) {
  if (!this._events[eventName]) return;
  
  for (var i = 0; i < this._events[eventName].length; i++) {
    this._events[eventName][i](data);
  }
};

// 导出组件
module.exports = DocIndexer; 