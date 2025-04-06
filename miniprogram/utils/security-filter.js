/**
 * 安全过滤器
 * 负责输入验证与过滤，防止XSS攻击和SQL注入
 */

/**
 * 安全过滤器
 */
const SecurityFilter = {
  /**
   * HTML转义：防止XSS攻击
   * @param {String} input 输入字符串
   * @returns {String} 转义后的字符串
   */
  escapeHTML(input) {
    if (typeof input !== 'string') return input;
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  },
  
  /**
   * 安全处理文件名，移除不安全字符
   * @param {String} fileName 原始文件名
   * @returns {String} 处理后的安全文件名
   */
  sanitizeFileName(fileName) {
    if (!fileName) {
      return `file_${Date.now()}`;
    }
    
    // 移除路径分隔符和非法字符
    let safe = fileName.replace(/[\\\/\:\*\?\"\<\>\|]/g, '_');
    
    // 处理特殊字符
    safe = safe.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    
    // 限制长度，避免文件名过长
    if (safe.length > 50) {
      const ext = safe.lastIndexOf('.') > 0 ? safe.slice(safe.lastIndexOf('.')) : '';
      safe = safe.slice(0, 50 - ext.length) + ext;
    }
    
    // 确保文件名不为空
    if (!safe || safe.trim() === '') {
      return `file_${Date.now()}`;
    }
    
    return safe;
  },
  
  /**
   * 生成安全的临时文件名
   * @param {String} prefix 文件名前缀
   * @param {String} extension 文件扩展名（不含点）
   * @returns {String} 安全的临时文件名
   */
  generateSafeTempFileName(prefix = 'temp', extension = 'jpg') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const safePrefix = this.sanitizeFileName(prefix);
    const safeExtension = extension.replace(/[^a-zA-Z0-9]/g, '');
    
    return `${safePrefix}_${timestamp}_${random}.${safeExtension}`;
  },
  
  /**
   * 清理图片元数据
   * 移除敏感信息，如GPS位置等
   * @param {String} imagePath 图片路径
   * @returns {Promise<String>} 处理后的图片路径
   */
  cleanImageMetadata(imagePath) {
    return new Promise((resolve, reject) => {
      // 微信小程序环境不支持直接清理图片元数据
      // 使用图片压缩API可以达到类似效果，因为压缩会移除大部分元数据
      wx.compressImage({
        src: imagePath,
        quality: 95, // 保持较高质量
        success: (res) => {
          console.log('[SecurityFilter] 图片元数据清理完成');
          resolve(res.tempFilePath);
        },
        fail: (err) => {
          console.error('[SecurityFilter] 图片元数据清理失败:', err);
          // 如果失败，返回原始路径
          resolve(imagePath);
        }
      });
    });
  },
  
  /**
   * 验证文件类型是否安全
   * @param {String} fileName 文件名
   * @param {Array<String>} allowedTypes 允许的文件类型数组 (如 ['jpg', 'png', 'jpeg'])
   * @returns {Boolean} 文件类型是否安全
   */
  isFileTypeAllowed(fileName, allowedTypes = []) {
    if (!fileName || !allowedTypes || !allowedTypes.length) {
      return false;
    }
    
    const ext = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase();
    return allowedTypes.includes(ext);
  },
  
  /**
   * 验证文件类型是否为图片
   * @param {String} fileName 文件名
   * @returns {Boolean} 是否为图片文件
   */
  isImageFile(fileName) {
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    return this.isFileTypeAllowed(fileName, imageTypes);
  },
  
  /**
   * 验证文件大小是否在允许范围内
   * @param {Number} fileSize 文件大小（字节）
   * @param {Number} maxSize 最大允许大小（字节）
   * @returns {Boolean} 文件大小是否合法
   */
  isFileSizeAllowed(fileSize, maxSize) {
    return typeof fileSize === 'number' && 
           typeof maxSize === 'number' && 
           fileSize > 0 && 
           fileSize <= maxSize;
  },
  
  /**
   * 检验图片内容是否安全（大小和尺寸）
   * @param {String} imagePath 图片路径
   * @param {Object} options 选项 {maxSize, maxWidth, maxHeight}
   * @returns {Promise<Object>} 验证结果 {safe, reason, info}
   */
  validateImageContent(imagePath, options = {}) {
    const maxSize = options.maxSize || 10 * 1024 * 1024; // 默认10MB
    const maxWidth = options.maxWidth || 4096; // 默认最大宽度
    const maxHeight = options.maxHeight || 4096; // 默认最大高度
    
    return new Promise((resolve) => {
      // 获取文件信息
      wx.getFileInfo({
        filePath: imagePath,
        success: (fileInfo) => {
          // 检查文件大小
          if (!this.isFileSizeAllowed(fileInfo.size, maxSize)) {
            resolve({
              safe: false,
              reason: 'size_exceeded',
              info: {
                size: fileInfo.size,
                maxSize: maxSize
              }
            });
            return;
          }
          
          // 获取图片信息
          wx.getImageInfo({
            src: imagePath,
            success: (imgInfo) => {
              // 检查图片尺寸
              if (imgInfo.width > maxWidth || imgInfo.height > maxHeight) {
                resolve({
                  safe: false,
                  reason: 'dimensions_exceeded',
                  info: {
                    width: imgInfo.width,
                    height: imgInfo.height,
                    maxWidth: maxWidth,
                    maxHeight: maxHeight
                  }
                });
                return;
              }
              
              // 一切正常
              resolve({
                safe: true,
                info: {
                  size: fileInfo.size,
                  width: imgInfo.width,
                  height: imgInfo.height,
                  type: imgInfo.type
                }
              });
            },
            fail: (err) => {
              console.error('[SecurityFilter] 获取图片信息失败:', err);
              resolve({
                safe: false,
                reason: 'invalid_image',
                info: {
                  error: err
                }
              });
            }
          });
        },
        fail: (err) => {
          console.error('[SecurityFilter] 获取文件信息失败:', err);
          resolve({
            safe: false,
            reason: 'file_access_error',
            info: {
              error: err
            }
          });
        }
      });
    });
  },
  
  /**
   * 过滤HTML和JavaScript等潜在危险内容
   * @param {String} content 原始内容
   * @returns {String} 过滤后的安全内容
   */
  sanitizeContent(content) {
    if (!content) return '';
    
    // 把HTML标签转换为实体
    let safe = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // 过滤JavaScript相关
    safe = safe.replace(/javascript:/gi, '');
    safe = safe.replace(/on\w+=/gi, '');
    
    return safe;
  },
  
  /**
   * 生成随机的安全令牌
   * @param {Number} length 令牌长度
   * @returns {String} 随机令牌
   */
  generateSecureToken(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    // 使用当前时间增加随机性
    const randomValues = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(randomValues[i] % chars.length);
    }
    
    return result;
  },
  
  /**
   * SQL注入防护：转义SQL特殊字符
   * @param {String} input 输入字符串
   * @returns {String} 转义后的字符串
   */
  escapeSQLString(input) {
    if (typeof input !== 'string') return input;
    return input
      .replace(/'/g, "''")
      .replace(/\\/g, "\\\\")
      .replace(/\0/g, "\\0")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t")
      .replace(/\x1a/g, "\\Z");
  },
  
  /**
   * 参数合法性验证
   * @param {*} param 要验证的参数
   * @param {Object} rules 验证规则
   * @returns {Boolean} 是否合法
   */
  validateParam(param, rules) {
    if (!rules) return true;
    
    // 类型检查
    if (rules.type && typeof param !== rules.type) {
      return false;
    }
    
    // 字符串长度检查
    if (typeof param === 'string') {
      if (rules.maxLength && param.length > rules.maxLength) {
        return false;
      }
      if (rules.minLength && param.length < rules.minLength) {
        return false;
      }
    }
    
    // 数值范围检查
    if (typeof param === 'number') {
      if (rules.max !== undefined && param > rules.max) {
        return false;
      }
      if (rules.min !== undefined && param < rules.min) {
        return false;
      }
    }
    
    // 正则表达式验证
    if (rules.pattern && typeof param === 'string') {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(param)) {
        return false;
      }
    }
    
    return true;
  },
  
  /**
   * 过滤所有用户输入对象的字段
   * @param {Object} inputObject 用户输入对象
   * @returns {Object} 过滤后的对象
   */
  filterUserInput(inputObject) {
    if (!inputObject || typeof inputObject !== 'object') {
      return inputObject;
    }
    
    const result = {};
    for (const key in inputObject) {
      if (inputObject.hasOwnProperty(key)) {
        const value = inputObject[key];
        
        if (typeof value === 'string') {
          // 字符串类型进行HTML转义
          result[key] = this.escapeHTML(value);
        } else if (Array.isArray(value)) {
          // 数组递归过滤
          result[key] = value.map(item => 
            typeof item === 'string' ? this.escapeHTML(item) : item
          );
        } else if (value && typeof value === 'object') {
          // 对象递归过滤
          result[key] = this.filterUserInput(value);
        } else {
          // 其他类型保持不变
          result[key] = value;
        }
      }
    }
    
    return result;
  },
  
  /**
   * 专门处理前端展示的安全文本
   * @param {String} text 原始文本
   * @param {Number} maxLength 最大长度
   * @returns {String} 安全处理后的文本
   */
  sanitizeDisplayText(text, maxLength = 100) {
    if (!text) return '';
    
    // 截断长文本
    let sanitized = typeof text === 'string' ? text : String(text);
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength) + '...';
    }
    
    // HTML转义
    return this.escapeHTML(sanitized);
  },
  
  /**
   * 验证数据合法性
   * @param {Object} data 要验证的数据
   * @param {Object} schema 验证模式
   * @returns {Object} 验证结果 {valid: Boolean, errors: Array}
   */
  validateData(data, schema) {
    const result = { valid: true, errors: [] };
    
    if (!schema || !data) {
      return result;
    }
    
    // 遍历所有字段验证
    for (const key in schema) {
      if (schema.hasOwnProperty(key)) {
        const rules = schema[key];
        const value = data[key];
        
        // 必填字段检查
        if (rules.required && (value === undefined || value === null || value === '')) {
          result.valid = false;
          result.errors.push(`字段 ${key} 是必填的`);
          continue;
        }
        
        // 如果字段存在且有规则，验证其合法性
        if (value !== undefined && value !== null) {
          if (!this.validateParam(value, rules)) {
            result.valid = false;
            result.errors.push(`字段 ${key} 不符合验证规则`);
          }
        }
      }
    }
    
    return result;
  }
};

module.exports = SecurityFilter; 