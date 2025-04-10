/**
 * ErrorHandler
 * 错误处理器，提供统一的错误处理功能
 * 符合微信小程序环境的ES5语法标准
 */

'use strict';

/**
 * 标准错误码定义
 * @constant
 * @type {Object}
 */
var ERROR_CODES = {
  // 网络错误 (1000-1399)
  'NETWORK-TIMEOUT-REQUEST': {
    code: 1000,
    message: '网络请求超时',
    description: '请求在指定的超时时间内未收到响应',
    retry: true,
    level: 'ERROR',
    userMessage: '网络请求超时，请检查您的网络连接并重试'
  },
  'NETWORK-TIMEOUT-RESPONSE': {
    code: 1001,
    message: '网络响应超时',
    description: '收到响应头后，响应体传输超时',
    retry: true,
    level: 'ERROR',
    userMessage: '网络响应超时，请检查您的网络连接并重试'
  },
  'NETWORK-CONNECTION-FAILED': {
    code: 1100,
    message: '网络连接失败',
    description: '无法建立与服务器的连接',
    retry: true,
    level: 'ERROR',
    userMessage: '网络连接失败，请检查您的网络设置'
  },
  'NETWORK-CONNECTION-INTERRUPTED': {
    code: 1101,
    message: '网络连接中断',
    description: '已建立的网络连接意外中断',
    retry: true,
    level: 'ERROR',
    userMessage: '网络连接中断，请重试'
  },
  'NETWORK-SECURITY-SSL': {
    code: 1300,
    message: 'SSL安全连接失败',
    description: 'SSL握手或证书验证失败',
    retry: false,
    level: 'ERROR',
    userMessage: '网络安全连接失败，请检查您的网络设置'
  },
  
  // 服务端错误 (2000-2299)
  'SERVER-RESPONSE-5XX': {
    code: 2000,
    message: '服务器内部错误',
    description: '服务器返回5xx系列错误码',
    retry: true,
    level: 'ERROR',
    userMessage: '服务器暂时不可用，请稍后重试'
  },
  'SERVER-RESPONSE-INVALID': {
    code: 2001,
    message: '服务器响应无效',
    description: '服务器返回了无法解析的响应',
    retry: false,
    level: 'ERROR',
    userMessage: '服务器返回了无效数据，请联系客服'
  },
  
  // 客户端错误 (3000-3399)
  'CLIENT-PARAMETER-INVALID': {
    code: 3000,
    message: '无效的请求参数',
    description: '请求参数不符合API要求',
    retry: false,
    level: 'ERROR',
    userMessage: '请求参数无效，请检查输入'
  },
  'CLIENT-PARAMETER-MISSING': {
    code: 3001,
    message: '缺少必要参数',
    description: '请求中缺少必需的参数',
    retry: false,
    level: 'ERROR',
    userMessage: '请求缺少必要信息，请完善后重试'
  },
  'CLIENT-PERMISSION-DENIED': {
    code: 3300,
    message: '权限不足',
    description: '客户端权限不足，无法执行请求操作',
    retry: false,
    level: 'ERROR',
    userMessage: '您没有权限执行此操作'
  },
  
  // 数据错误 (4000-4299)
  'DATA-PARSE-RESPONSE': {
    code: 4000,
    message: '响应数据解析失败',
    description: '无法解析服务器返回的数据',
    retry: false,
    level: 'ERROR',
    userMessage: '处理服务器数据时出错，请稍后重试'
  },
  
  // 系统错误 (5000-5299)
  'SYSTEM-UNKNOWN-ERROR': {
    code: 5000,
    message: '未知系统错误',
    description: '发生了未知的系统错误',
    retry: false,
    level: 'ERROR',
    userMessage: '发生了未知错误，请稍后重试'
  }
};

/**
 * 错误处理器构造函数
 * @constructor
 */
function ErrorHandler() {
  // 配置初始化
  this._config = {
    retry: {
      maxRetries: 3,
      retryDelay: 1000,
      retryStrategy: 'exponential',
      retryableErrorCodes: []
    },
    reporting: {
      enabled: true,
      includeStack: true,
      sanitize: true
    }
  };
  
  // 自动设置可重试的错误码
  for (var code in ERROR_CODES) {
    if (ERROR_CODES.hasOwnProperty(code) && ERROR_CODES[code].retry) {
      this._config.retry.retryableErrorCodes.push(code);
    }
  }
  
  // 错误映射规则数组
  this._errorMappings = [];
  
  // 错误上报函数
  this._reporter = null;
}

/**
 * 创建标准错误对象
 * @param {string|Error} error - 错误对象或消息
 * @param {string} [errorCode] - 错误代码
 * @param {Object} [context] - 错误上下文
 * @returns {StandardError} 标准错误对象
 */
ErrorHandler.prototype.createError = function(error, errorCode, context) {
  var standardError = {};
  var errorInfo;
  var now = Date.now();
  
  // 自动推断错误码
  if (!errorCode) {
    errorCode = this._inferErrorCode(error);
  }
  
  // 获取错误码对应的详细信息
  errorInfo = ERROR_CODES[errorCode] || ERROR_CODES['SYSTEM-UNKNOWN-ERROR'];
  
  // 构建标准错误对象
  standardError.code = errorCode;
  standardError.message = errorInfo.message;
  standardError.userMessage = errorInfo.userMessage;
  standardError.timestamp = now;
  standardError.requestId = 'req_' + now + '_' + Math.floor(Math.random() * 1000);
  standardError.context = context || {};
  standardError.canRetry = errorInfo.retry;
  standardError.level = errorInfo.level;
  
  // 处理原始错误
  if (error) {
    // 如果是Error对象
    if (error instanceof Error) {
      standardError.originalError = error;
      standardError.stack = error.stack;
    } 
    // 如果是微信API返回的错误
    else if (typeof error === 'object' && error.errMsg) {
      standardError.originalError = error;
      standardError.wxErrMsg = error.errMsg;
    } 
    // 如果是字符串
    else if (typeof error === 'string') {
      standardError.originalMessage = error;
    } 
    // 其他情况
    else {
      standardError.originalError = error;
    }
  }
  
  return standardError;
};

/**
 * 根据错误信息推断错误码
 * @param {*} error - 错误对象
 * @returns {string} 推断的错误码
 * @private
 */
ErrorHandler.prototype._inferErrorCode = function(error) {
  // 处理微信API返回的错误
  if (error && typeof error === 'object' && error.errMsg) {
    var errMsg = error.errMsg.toLowerCase();
    
    // 超时错误
    if (errMsg.indexOf('timeout') !== -1) {
      return 'NETWORK-TIMEOUT-REQUEST';
    }
    
    // 连接失败
    if (errMsg.indexOf('fail') !== -1 && errMsg.indexOf('connect') !== -1) {
      return 'NETWORK-CONNECTION-FAILED';
    }
    
    // SSL错误
    if (errMsg.indexOf('ssl') !== -1) {
      return 'NETWORK-SECURITY-SSL';
    }
  }
  
  // 处理HTTP错误状态码
  if (error && typeof error === 'object' && error.status) {
    var status = error.status;
    
    // 5xx错误
    if (status >= 500 && status < 600) {
      return 'SERVER-RESPONSE-5XX';
    }
    
    // 403权限错误
    if (status === 403) {
      return 'CLIENT-PERMISSION-DENIED';
    }
  }
  
  // 默认为未知错误
  return 'SYSTEM-UNKNOWN-ERROR';
};

/**
 * 处理错误
 * @param {StandardError|Error} error - 错误对象
 * @param {Object} [options] - 处理选项
 * @returns {StandardError} 处理后的标准错误对象
 */
ErrorHandler.prototype.handleError = function(error, options) {
  options = options || {};
  var standardError;
  
  // 确保错误是标准格式
  if (error && error.code && error.message && error.timestamp) {
    standardError = error;
  } else {
    // 根据自定义映射转换错误
    for (var i = 0; i < this._errorMappings.length; i++) {
      var mapping = this._errorMappings[i];
      if (mapping.match(error)) {
        var mappedInfo = mapping.map(error);
        standardError = this.createError(
          error,
          mappedInfo.code,
          mappedInfo.context
        );
        
        // 应用自定义属性
        for (var key in mappedInfo) {
          if (mappedInfo.hasOwnProperty(key) && key !== 'code' && key !== 'context') {
            standardError[key] = mappedInfo[key];
          }
        }
        
        break;
      }
    }
    
    // 如果没有匹配的映射，使用默认转换
    if (!standardError) {
      standardError = this.createError(error);
    }
  }
  
  // 记录错误日志
  this._logError(standardError);
  
  // 执行错误上报
  if ((options.report || this._config.reporting.enabled) && this._reporter) {
    this._reporter(this._sanitizeError(standardError));
  }
  
  return standardError;
};

/**
 * 记录错误日志
 * @param {StandardError} error - 标准错误对象
 * @private
 */
ErrorHandler.prototype._logError = function(error) {
  // 根据错误级别选择日志级别
  switch (error.level) {
    case 'FATAL':
    case 'ERROR':
      console.error('[ErrorHandler]', error.code, error.message, error);
      break;
    case 'WARN':
      console.warn('[ErrorHandler]', error.code, error.message, error);
      break;
    default:
      console.log('[ErrorHandler]', error.code, error.message, error);
  }
};

/**
 * 判断错误是否可重试
 * @param {StandardError} error - 标准错误对象
 * @param {Object} [options] - 重试判断选项
 * @returns {boolean} 是否可重试
 */
ErrorHandler.prototype.isRetryable = function(error, options) {
  options = options || {};
  
  // 如果选项中明确指定了是否可重试，则使用该值
  if (typeof options.force === 'boolean') {
    return options.force;
  }
  
  // 检查错误对象中的canRetry标志
  if (error && typeof error.canRetry === 'boolean') {
    return error.canRetry;
  }
  
  // 根据错误码判断是否可重试
  if (error && error.code) {
    var retryableErrorCodes = this._config.retry.retryableErrorCodes;
    return retryableErrorCodes.indexOf(error.code) !== -1;
  }
  
  // 默认不可重试
  return false;
};

/**
 * 获取错误重试信息
 * @param {StandardError} error - 标准错误对象
 * @param {Object} [options] - 重试选项
 * @returns {Object} 重试信息
 */
ErrorHandler.prototype.getRetryInfo = function(error, options) {
  options = options || {};
  var retryInfo = {
    canRetry: this.isRetryable(error, options),
    maxRetries: options.maxRetries || this._config.retry.maxRetries,
    retryDelay: options.retryDelay || this._config.retry.retryDelay,
    retryStrategy: options.retryStrategy || this._config.retry.retryStrategy
  };
  
  return retryInfo;
};

/**
 * 脱敏错误对象，移除敏感信息
 * @param {StandardError} error - 标准错误对象
 * @returns {StandardError} 脱敏后的错误对象
 * @private
 */
ErrorHandler.prototype._sanitizeError = function(error) {
  if (!this._config.reporting.sanitize) {
    return error;
  }
  
  var sanitizedError = JSON.parse(JSON.stringify(error));
  
  // 移除堆栈信息
  if (!this._config.reporting.includeStack) {
    delete sanitizedError.stack;
  }
  
  // 脱敏请求信息中的敏感数据
  if (sanitizedError.request) {
    // 脱敏请求头中的认证信息
    if (sanitizedError.request.headers) {
      var headers = sanitizedError.request.headers;
      if (headers.Authorization) {
        headers.Authorization = '**REMOVED**';
      }
      if (headers.authorization) {
        headers.authorization = '**REMOVED**';
      }
      if (headers['x-api-key']) {
        headers['x-api-key'] = '**REMOVED**';
      }
    }
    
    // 脱敏请求体中的敏感字段
    if (sanitizedError.request.data) {
      var sensitiveFields = ['password', 'token', 'secret', 'creditCard', 'cardNumber'];
      var data = sanitizedError.request.data;
      
      for (var field in data) {
        if (data.hasOwnProperty(field) && sensitiveFields.indexOf(field.toLowerCase()) !== -1) {
          data[field] = '**REMOVED**';
        }
      }
    }
  }
  
  return sanitizedError;
};

/**
 * 包装异步操作添加错误处理
 * @param {Function} operation - 异步操作函数
 * @param {Object} [options] - 错误处理选项
 * @returns {Function} 包装后的函数
 */
ErrorHandler.prototype.wrapOperation = function(operation, options) {
  var self = this;
  options = options || {};
  
  return function() {
    var args = Array.prototype.slice.call(arguments);
    
    try {
      var result = operation.apply(this, args);
      
      // 如果结果是Promise，添加错误处理
      if (result && typeof result.then === 'function') {
        return result.catch(function(error) {
          var standardError = self.handleError(error, options);
          return Promise.reject(standardError);
        });
      }
      
      return result;
    } catch (error) {
      var standardError = self.handleError(error, options);
      
      // 如果是同步操作，重新抛出标准化后的错误
      throw standardError;
    }
  };
};

/**
 * 创建包含请求和响应信息的错误
 * @param {string|Error} error - 错误对象或消息
 * @param {string} errorCode - 错误代码
 * @param {Object} request - 请求信息
 * @param {Object} [response] - 响应信息
 * @returns {StandardError} 标准错误对象
 */
ErrorHandler.prototype.createRequestError = function(error, errorCode, request, response) {
  var context = {
    requestUrl: request ? request.url : undefined,
    requestMethod: request ? request.method : undefined,
    responseStatus: response ? response.status : undefined
  };
  
  var standardError = this.createError(error, errorCode, context);
  
  // 添加完整的请求和响应信息
  if (request) {
    standardError.request = this._sanitizeError({ request: request }).request;
  }
  
  if (response) {
    standardError.response = response;
  }
  
  return standardError;
};

/**
 * 添加自定义错误映射
 * @param {Function} matchFn - 匹配函数，判断错误是否符合特定条件
 * @param {Function} mapFn - 映射函数，将原始错误映射为标准错误信息
 * @returns {Object} 映射对象，包含id字段用于后续移除
 */
ErrorHandler.prototype.addErrorMapping = function(matchFn, mapFn) {
  var mapping = {
    id: Date.now() + '_' + Math.floor(Math.random() * 1000),
    match: matchFn,
    map: mapFn
  };
  
  this._errorMappings.push(mapping);
  
  return mapping;
};

/**
 * 移除自定义错误映射
 * @param {string} mappingId - 映射ID
 * @returns {boolean} 是否成功移除
 */
ErrorHandler.prototype.removeErrorMapping = function(mappingId) {
  for (var i = 0; i < this._errorMappings.length; i++) {
    if (this._errorMappings[i].id === mappingId) {
      this._errorMappings.splice(i, 1);
      return true;
    }
  }
  
  return false;
};

/**
 * 设置重试配置
 * @param {Object} config - 重试配置
 * @returns {ErrorHandler} 错误处理器实例，支持链式调用
 */
ErrorHandler.prototype.setRetryConfig = function(config) {
  if (config) {
    for (var key in config) {
      if (config.hasOwnProperty(key) && this._config.retry.hasOwnProperty(key)) {
        this._config.retry[key] = config[key];
      }
    }
  }
  
  return this;
};

/**
 * 设置错误上报函数
 * @param {Function} reporter - 错误上报函数
 * @returns {ErrorHandler} 错误处理器实例，支持链式调用
 */
ErrorHandler.prototype.setErrorReporter = function(reporter) {
  if (typeof reporter === 'function') {
    this._reporter = reporter;
  }
  
  return this;
};

module.exports = ErrorHandler; 