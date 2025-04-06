/**
 * 模块适配器
 * 用于解决不同环境（如微信小程序、H5等）下的模块导入差异问题
 * 提供统一的模块访问接口
 */

var moduleCache = {};

/**
 * 根据路径获取模块
 * @param {String} modulePath - 模块路径
 * @returns {Object} 模块对象
 */
function getModule(modulePath) {
  // 如果已缓存，则直接返回
  if (moduleCache[modulePath]) {
    return moduleCache[modulePath];
  }
  
  var module;
  
  try {
    // 首先尝试直接引入（相对路径）
    module = require(modulePath);
  } catch (e1) {
    try {
      // 尝试使用绝对路径引入
      if (modulePath.startsWith('./')) {
        var absolutePath = '../' + modulePath.substring(2);
        module = require(absolutePath);
      } else if (modulePath.startsWith('../')) {
        module = require(modulePath);
      } else {
        // 尝试添加前缀
        module = require('./' + modulePath);
      }
    } catch (e2) {
      // 两种方式都失败，则抛出错误
      console.error('[ModuleAdapter] 模块导入失败:', modulePath);
      console.error('[ModuleAdapter] 错误详情:', e1, e2);
      throw new Error('模块导入失败: ' + modulePath);
    }
  }
  
  // 缓存模块
  moduleCache[modulePath] = module;
  
  return module;
}

/**
 * 安全导入模块，发生错误时返回备用模块
 * @param {String} modulePath - 模块路径
 * @param {Object} fallback - 备用模块
 * @returns {Object} 模块对象或备用模块
 */
function safeRequire(modulePath, fallback) {
  try {
    return getModule(modulePath);
  } catch (error) {
    console.warn('[ModuleAdapter] 使用备用模块:', modulePath);
    return fallback || {};
  }
}

/**
 * 加载模块并增强其功能
 * @param {String} modulePath - 模块路径
 * @param {Object} enhancers - 增强功能对象
 * @returns {Object} 增强后的模块对象
 */
function enhanceModule(modulePath, enhancers) {
  var module = getModule(modulePath);
  
  if (!module) {
    return enhancers || {};
  }
  
  if (!enhancers) {
    return module;
  }
  
  // 合并原始模块和增强功能
  var enhanced = {};
  
  // 复制原始模块属性
  for (var key in module) {
    if (module.hasOwnProperty(key)) {
      enhanced[key] = module[key];
    }
  }
  
  // 添加增强功能
  for (var key in enhancers) {
    if (enhancers.hasOwnProperty(key)) {
      enhanced[key] = enhancers[key];
    }
  }
  
  return enhanced;
}

/**
 * 获取图像处理器模块
 * @returns {Object} 图像处理器模块
 */
function getImageProcessor() {
  return safeRequire('./imageProcessor', {
    // 提供基本的降级功能
    compressImage: function() {
      return Promise.reject(new Error('图像处理模块未加载'));
    },
    resizeImage: function() {
      return Promise.reject(new Error('图像处理模块未加载'));
    },
    batchProcess: function() {
      return Promise.reject(new Error('图像处理模块未加载'));
    }
  });
}

/**
 * 获取照片批处理器模块
 * @returns {Object} 照片批处理器模块
 */
function getPhotoBatchProcessor() {
  return safeRequire('./photoBatchProcessor', {
    // 提供基本的降级功能
    processBatch: function() {
      return Promise.reject(new Error('照片批处理模块未加载'));
    },
    getProcessingStats: function() {
      return {};
    },
    cleanupCache: function() {
      return {};
    }
  });
}

module.exports = {
  getModule: getModule,
  safeRequire: safeRequire,
  enhanceModule: enhanceModule,
  getImageProcessor: getImageProcessor,
  getPhotoBatchProcessor: getPhotoBatchProcessor
}; 