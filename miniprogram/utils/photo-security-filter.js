/**
 * 照片安全过滤器
 * 解决B1模块安全漏洞问题，防止XSS注入和SQL注入
 * 
 * 创建时间: 2025-04-09 19:42:00
 * 创建者: Claude AI 3.7 Sonnet
 */

/**
 * 照片安全过滤器
 */
const PhotoSecurityFilter = {
  /**
   * 初始化安全过滤器
   * @param {Object} options 配置选项
   * @returns {Object} 当前实例
   */
  init: function(options) {
    this.options = options || {};
    return this;
  },
  
  /**
   * 过滤照片元数据，移除潜在危险数据
   * @param {Object} metadata 照片元数据
   * @returns {Object} 安全的元数据
   */
  sanitizeMetadata: function(metadata) {
    if (!metadata) {
      return {};
    }
    
    var safeMetadata = {};
    
    // 白名单安全字段
    var safeFields = [
      'width', 'height', 'size', 'timestamp', 'orientation', 
      'format', 'path', 'localPath', 'name', 'type'
    ];
    
    // 复制安全字段
    safeFields.forEach(function(field) {
      if (metadata.hasOwnProperty(field)) {
        safeMetadata[field] = metadata[field];
      }
    });
    
    // 安全处理描述字段
    if (metadata.description) {
      safeMetadata.description = this.sanitizeDescription(metadata.description);
    }
    
    // 安全处理位置信息
    if (metadata.location) {
      safeMetadata.location = this._sanitizeLocation(metadata.location);
    }
    
    // 安全处理标签
    if (metadata.tags && Array.isArray(metadata.tags)) {
      safeMetadata.tags = metadata.tags.map(function(tag) {
        return typeof tag === 'string' ? 
               this._escapeHTML(tag).substring(0, 50) : '';
      }.bind(this)).filter(function(tag) { return tag.length > 0; });
    }
    
    return safeMetadata;
  },
  
  /**
   * 安全处理位置信息
   * @param {Object} location 位置信息
   * @returns {Object} 安全的位置信息
   * @private
   */
  _sanitizeLocation: function(location) {
    if (!location || typeof location !== 'object') {
      return null;
    }
    
    var safeLocation = {};
    
    // 只保留安全字段
    if (location.hasOwnProperty('latitude') && typeof location.latitude === 'number') {
      safeLocation.latitude = location.latitude;
    }
    
    if (location.hasOwnProperty('longitude') && typeof location.longitude === 'number') {
      safeLocation.longitude = location.longitude;
    }
    
    if (location.hasOwnProperty('name') && typeof location.name === 'string') {
      safeLocation.name = this._escapeHTML(location.name).substring(0, 100);
    }
    
    if (location.hasOwnProperty('address') && typeof location.address === 'string') {
      safeLocation.address = this._escapeHTML(location.address).substring(0, 200);
    }
    
    return safeLocation;
  },
  
  /**
   * 验证照片路径的安全性
   * @param {String} path 照片路径
   * @returns {Boolean} 是否安全
   */
  validatePhotoPath: function(path) {
    if (!path || typeof path !== 'string') {
      return false;
    }
    
    // 验证路径格式
    var isValidPath = /^[a-zA-Z0-9_\-\.\/]+$/.test(path) || 
                      path.startsWith('wxfile://') || 
                      path.startsWith('http://') || 
                      path.startsWith('https://');
    
    // 检查常见的路径穿越攻击模式
    var hasTraversalAttack = path.includes('../') || 
                            path.includes('..\\') || 
                            path.includes('/..') || 
                            path.includes('\\..');
    
    return isValidPath && !hasTraversalAttack;
  },
  
  /**
   * 过滤照片描述文本，防止XSS
   * @param {String} description 照片描述
   * @returns {String} 安全的描述文本
   */
  sanitizeDescription: function(description) {
    if (!description || typeof description !== 'string') {
      return '';
    }
    
    // HTML实体转义
    var safeText = this._escapeHTML(description);
    
    // 限制长度
    safeText = safeText.substring(0, 1000);
    
    return safeText;
  },
  
  /**
   * HTML实体转义，防止XSS
   * @param {String} input 输入字符串
   * @returns {String} 转义后的字符串
   * @private
   */
  _escapeHTML: function(input) {
    if (typeof input !== 'string') {
      return '';
    }
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },
  
  /**
   * 过滤照片相关的SQL查询参数
   * @param {Object} params SQL查询参数
   * @returns {Object} 安全的查询参数
   */
  sanitizeSQLParams: function(params) {
    if (!params || typeof params !== 'object') {
      return {};
    }
    
    var safeParams = {};
    
    // 处理每个参数
    for (var key in params) {
      if (params.hasOwnProperty(key)) {
        var value = params[key];
        
        // 根据值类型进行安全处理
        if (typeof value === 'string') {
          // 字符串参数进行SQL注入防护
          safeParams[key] = this._escapeSQLString(value);
        } else if (typeof value === 'number') {
          // 数值类型直接使用
          safeParams[key] = value;
        } else if (typeof value === 'boolean') {
          // 布尔类型直接使用
          safeParams[key] = value;
        } else if (Array.isArray(value)) {
          // 数组类型递归处理每个元素
          safeParams[key] = value.map(function(item) {
            if (typeof item === 'string') {
              return this._escapeSQLString(item);
            } else if (typeof item === 'number' || typeof item === 'boolean') {
              return item;
            } else {
              return null;
            }
          }.bind(this)).filter(function(item) { return item !== null; });
        } 
        // 忽略其他类型的参数
      }
    }
    
    return safeParams;
  },
  
  /**
   * 转义SQL字符串，防止SQL注入
   * @param {String} input 输入字符串
   * @returns {String} 安全的SQL字符串
   * @private
   */
  _escapeSQLString: function(input) {
    if (typeof input !== 'string') {
      return '';
    }
    
    // 基本SQL注入防护
    return input
      .replace(/'/g, "''")
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/;/g, "\\;")
      .replace(/--/g, "\\--")
      .replace(/\/\*/g, "\\/\\*")
      .replace(/\*\//g, "\\*\\/");
  },
  
  /**
   * 验证照片格式安全性
   * @param {String} filePath 照片文件路径
   * @returns {Promise} 验证结果
   */
  validatePhotoSecurity: function(filePath) {
    var that = this;
    
    return new Promise(function(resolve, reject) {
      if (!filePath || typeof filePath !== 'string') {
        resolve({
          safe: false,
          reason: 'invalid_path',
          detail: '文件路径无效'
        });
        return;
      }
      
      // 验证路径安全性
      if (!that.validatePhotoPath(filePath)) {
        resolve({
          safe: false,
          reason: 'unsafe_path',
          detail: '文件路径不安全'
        });
        return;
      }
      
      // 获取文件信息
      wx.getFileInfo({
        filePath: filePath,
        success: function(res) {
          // 验证文件类型
          var fileType = that._getFileTypeFromPath(filePath);
          var fileSize = res.size;
          
          // 安全的图片类型
          var safeImageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
          
          // 验证文件类型
          if (safeImageTypes.indexOf(fileType) === -1) {
            resolve({
              safe: false,
              reason: 'invalid_type',
              detail: '文件类型不安全: ' + fileType,
              fileType: fileType
            });
            return;
          }
          
          // 验证文件大小（最大10MB）
          if (fileSize > 10 * 1024 * 1024) {
            resolve({
              safe: false,
              reason: 'file_too_large',
              detail: '文件太大: ' + (fileSize / (1024 * 1024)).toFixed(2) + 'MB',
              fileSize: fileSize
            });
            return;
          }
          
          // 获取图片信息进一步验证
          wx.getImageInfo({
            src: filePath,
            success: function(imgInfo) {
              // 验证图片尺寸（最大8000x8000）
              if (imgInfo.width > 8000 || imgInfo.height > 8000) {
                resolve({
                  safe: false,
                  reason: 'image_too_large',
                  detail: '图片尺寸过大: ' + imgInfo.width + 'x' + imgInfo.height,
                  width: imgInfo.width,
                  height: imgInfo.height
                });
                return;
              }
              
              // 通过安全验证
              resolve({
                safe: true,
                fileType: fileType,
                fileSize: fileSize,
                width: imgInfo.width,
                height: imgInfo.height,
                path: filePath
              });
            },
            fail: function(err) {
              resolve({
                safe: false,
                reason: 'invalid_image',
                detail: '无法读取图片信息: ' + err.errMsg,
                error: err
              });
            }
          });
        },
        fail: function(err) {
          resolve({
            safe: false,
            reason: 'file_access_error',
            detail: '无法访问文件: ' + err.errMsg,
            error: err
          });
        }
      });
    });
  },
  
  /**
   * 从路径获取文件类型
   * @param {String} path 文件路径
   * @returns {String} 文件类型
   * @private
   */
  _getFileTypeFromPath: function(path) {
    if (!path || typeof path !== 'string') {
      return '';
    }
    
    var match = path.match(/\.([^.]+)$/);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
    
    return '';
  }
};

module.exports = PhotoSecurityFilter; 
 * 照片安全过滤器
 * 解决B1模块安全漏洞问题，防止XSS注入和SQL注入
 * 
 * 创建时间: 2025-04-09 19:42:00
 * 创建者: Claude AI 3.7 Sonnet
 */

/**
 * 照片安全过滤器
 */
const PhotoSecurityFilter = {
  /**
   * 初始化安全过滤器
   * @param {Object} options 配置选项
   * @returns {Object} 当前实例
   */
  init: function(options) {
    this.options = options || {};
    return this;
  },
  
  /**
   * 过滤照片元数据，移除潜在危险数据
   * @param {Object} metadata 照片元数据
   * @returns {Object} 安全的元数据
   */
  sanitizeMetadata: function(metadata) {
    if (!metadata) {
      return {};
    }
    
    var safeMetadata = {};
    
    // 白名单安全字段
    var safeFields = [
      'width', 'height', 'size', 'timestamp', 'orientation', 
      'format', 'path', 'localPath', 'name', 'type'
    ];
    
    // 复制安全字段
    safeFields.forEach(function(field) {
      if (metadata.hasOwnProperty(field)) {
        safeMetadata[field] = metadata[field];
      }
    });
    
    // 安全处理描述字段
    if (metadata.description) {
      safeMetadata.description = this.sanitizeDescription(metadata.description);
    }
    
    // 安全处理位置信息
    if (metadata.location) {
      safeMetadata.location = this._sanitizeLocation(metadata.location);
    }
    
    // 安全处理标签
    if (metadata.tags && Array.isArray(metadata.tags)) {
      safeMetadata.tags = metadata.tags.map(function(tag) {
        return typeof tag === 'string' ? 
               this._escapeHTML(tag).substring(0, 50) : '';
      }.bind(this)).filter(function(tag) { return tag.length > 0; });
    }
    
    return safeMetadata;
  },
  
  /**
   * 安全处理位置信息
   * @param {Object} location 位置信息
   * @returns {Object} 安全的位置信息
   * @private
   */
  _sanitizeLocation: function(location) {
    if (!location || typeof location !== 'object') {
      return null;
    }
    
    var safeLocation = {};
    
    // 只保留安全字段
    if (location.hasOwnProperty('latitude') && typeof location.latitude === 'number') {
      safeLocation.latitude = location.latitude;
    }
    
    if (location.hasOwnProperty('longitude') && typeof location.longitude === 'number') {
      safeLocation.longitude = location.longitude;
    }
    
    if (location.hasOwnProperty('name') && typeof location.name === 'string') {
      safeLocation.name = this._escapeHTML(location.name).substring(0, 100);
    }
    
    if (location.hasOwnProperty('address') && typeof location.address === 'string') {
      safeLocation.address = this._escapeHTML(location.address).substring(0, 200);
    }
    
    return safeLocation;
  },
  
  /**
   * 验证照片路径的安全性
   * @param {String} path 照片路径
   * @returns {Boolean} 是否安全
   */
  validatePhotoPath: function(path) {
    if (!path || typeof path !== 'string') {
      return false;
    }
    
    // 验证路径格式
    var isValidPath = /^[a-zA-Z0-9_\-\.\/]+$/.test(path) || 
                      path.startsWith('wxfile://') || 
                      path.startsWith('http://') || 
                      path.startsWith('https://');
    
    // 检查常见的路径穿越攻击模式
    var hasTraversalAttack = path.includes('../') || 
                            path.includes('..\\') || 
                            path.includes('/..') || 
                            path.includes('\\..');
    
    return isValidPath && !hasTraversalAttack;
  },
  
  /**
   * 过滤照片描述文本，防止XSS
   * @param {String} description 照片描述
   * @returns {String} 安全的描述文本
   */
  sanitizeDescription: function(description) {
    if (!description || typeof description !== 'string') {
      return '';
    }
    
    // HTML实体转义
    var safeText = this._escapeHTML(description);
    
    // 限制长度
    safeText = safeText.substring(0, 1000);
    
    return safeText;
  },
  
  /**
   * HTML实体转义，防止XSS
   * @param {String} input 输入字符串
   * @returns {String} 转义后的字符串
   * @private
   */
  _escapeHTML: function(input) {
    if (typeof input !== 'string') {
      return '';
    }
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },
  
  /**
   * 过滤照片相关的SQL查询参数
   * @param {Object} params SQL查询参数
   * @returns {Object} 安全的查询参数
   */
  sanitizeSQLParams: function(params) {
    if (!params || typeof params !== 'object') {
      return {};
    }
    
    var safeParams = {};
    
    // 处理每个参数
    for (var key in params) {
      if (params.hasOwnProperty(key)) {
        var value = params[key];
        
        // 根据值类型进行安全处理
        if (typeof value === 'string') {
          // 字符串参数进行SQL注入防护
          safeParams[key] = this._escapeSQLString(value);
        } else if (typeof value === 'number') {
          // 数值类型直接使用
          safeParams[key] = value;
        } else if (typeof value === 'boolean') {
          // 布尔类型直接使用
          safeParams[key] = value;
        } else if (Array.isArray(value)) {
          // 数组类型递归处理每个元素
          safeParams[key] = value.map(function(item) {
            if (typeof item === 'string') {
              return this._escapeSQLString(item);
            } else if (typeof item === 'number' || typeof item === 'boolean') {
              return item;
            } else {
              return null;
            }
          }.bind(this)).filter(function(item) { return item !== null; });
        } 
        // 忽略其他类型的参数
      }
    }
    
    return safeParams;
  },
  
  /**
   * 转义SQL字符串，防止SQL注入
   * @param {String} input 输入字符串
   * @returns {String} 安全的SQL字符串
   * @private
   */
  _escapeSQLString: function(input) {
    if (typeof input !== 'string') {
      return '';
    }
    
    // 基本SQL注入防护
    return input
      .replace(/'/g, "''")
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/;/g, "\\;")
      .replace(/--/g, "\\--")
      .replace(/\/\*/g, "\\/\\*")
      .replace(/\*\//g, "\\*\\/");
  },
  
  /**
   * 验证照片格式安全性
   * @param {String} filePath 照片文件路径
   * @returns {Promise} 验证结果
   */
  validatePhotoSecurity: function(filePath) {
    var that = this;
    
    return new Promise(function(resolve, reject) {
      if (!filePath || typeof filePath !== 'string') {
        resolve({
          safe: false,
          reason: 'invalid_path',
          detail: '文件路径无效'
        });
        return;
      }
      
      // 验证路径安全性
      if (!that.validatePhotoPath(filePath)) {
        resolve({
          safe: false,
          reason: 'unsafe_path',
          detail: '文件路径不安全'
        });
        return;
      }
      
      // 获取文件信息
      wx.getFileInfo({
        filePath: filePath,
        success: function(res) {
          // 验证文件类型
          var fileType = that._getFileTypeFromPath(filePath);
          var fileSize = res.size;
          
          // 安全的图片类型
          var safeImageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
          
          // 验证文件类型
          if (safeImageTypes.indexOf(fileType) === -1) {
            resolve({
              safe: false,
              reason: 'invalid_type',
              detail: '文件类型不安全: ' + fileType,
              fileType: fileType
            });
            return;
          }
          
          // 验证文件大小（最大10MB）
          if (fileSize > 10 * 1024 * 1024) {
            resolve({
              safe: false,
              reason: 'file_too_large',
              detail: '文件太大: ' + (fileSize / (1024 * 1024)).toFixed(2) + 'MB',
              fileSize: fileSize
            });
            return;
          }
          
          // 获取图片信息进一步验证
          wx.getImageInfo({
            src: filePath,
            success: function(imgInfo) {
              // 验证图片尺寸（最大8000x8000）
              if (imgInfo.width > 8000 || imgInfo.height > 8000) {
                resolve({
                  safe: false,
                  reason: 'image_too_large',
                  detail: '图片尺寸过大: ' + imgInfo.width + 'x' + imgInfo.height,
                  width: imgInfo.width,
                  height: imgInfo.height
                });
                return;
              }
              
              // 通过安全验证
              resolve({
                safe: true,
                fileType: fileType,
                fileSize: fileSize,
                width: imgInfo.width,
                height: imgInfo.height,
                path: filePath
              });
            },
            fail: function(err) {
              resolve({
                safe: false,
                reason: 'invalid_image',
                detail: '无法读取图片信息: ' + err.errMsg,
                error: err
              });
            }
          });
        },
        fail: function(err) {
          resolve({
            safe: false,
            reason: 'file_access_error',
            detail: '无法访问文件: ' + err.errMsg,
            error: err
          });
        }
      });
    });
  },
  
  /**
   * 从路径获取文件类型
   * @param {String} path 文件路径
   * @returns {String} 文件类型
   * @private
   */
  _getFileTypeFromPath: function(path) {
    if (!path || typeof path !== 'string') {
      return '';
    }
    
    var match = path.match(/\.([^.]+)$/);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
    
    return '';
  }
};

module.exports = PhotoSecurityFilter; 