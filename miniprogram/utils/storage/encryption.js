/**
 * 存储加密模块
 * 为存储管理器提供数据加密和解密功能
 * 
 * 作者：AI助手
 * 创建日期：2025-04-10
 */

// 引入依赖（使用微信小程序自带的加密API）
var crypto = require('./crypto');

// 默认加密配置
var DEFAULT_CONFIG = {
  // 是否启用加密
  enabled: true,
  
  // 加密算法类型: 'AES', 'AES-GCM', 'DES', '3DES'
  algorithm: 'AES',
  
  // 加密密钥管理
  keyMode: 'auto', // 可选: 'auto', 'fixed', 'user', 'hybrid'
  
  // 密钥轮转设置（仅在auto模式下有效）
  keyRotationEnabled: true,
  keyRotationInterval: 30 * 24 * 60 * 60 * 1000, // 30天
  
  // 加密算法参数
  params: {
    keyLength: 256, // 密钥长度，单位为位
    ivLength: 16,   // 初始化向量长度，单位为字节
    iterationCount: 10000, // PBKDF2迭代次数
    saltLength: 16  // 盐长度，单位为字节
  }
};

/**
 * 存储加密器
 * @param {Object} options 配置选项
 */
function StorageEncryption(options) {
  this.config = {};
  
  // 合并默认配置
  for (var key in DEFAULT_CONFIG) {
    if (DEFAULT_CONFIG.hasOwnProperty(key)) {
      this.config[key] = DEFAULT_CONFIG[key];
    }
  }
  
  // 合并用户配置
  if (options) {
    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        if (key === 'params' && this.config.params && options.params) {
          // 合并params对象
          for (var paramKey in options.params) {
            if (options.params.hasOwnProperty(paramKey)) {
              this.config.params[paramKey] = options.params[paramKey];
            }
          }
        } else {
          this.config[key] = options[key];
        }
      }
    }
  }
  
  // 内部状态
  this._encryptionKeys = {};
  this._defaultKey = null;
  
  // 暴露加密模块供测试使用
  this._crypto = crypto;
  
  // 初始化
  this._init();
}

/**
 * 初始化加密器
 * @private
 */
StorageEncryption.prototype._init = function() {
  // 初始化加密密钥
  this._initializeEncryptionKeys();
};

/**
 * 初始化加密密钥
 * @private
 */
StorageEncryption.prototype._initializeEncryptionKeys = function() {
  // 根据密钥管理模式初始化
  switch (this.config.keyMode) {
    case 'fixed':
      // 使用固定密钥
      this._defaultKey = this._generateFixedKey();
      break;
      
    case 'user':
      // 等待用户提供密钥
      this._defaultKey = null;
      break;
      
    case 'hybrid':
      // 混合模式，使用系统密钥和用户密钥
      this._defaultKey = this._generateFixedKey();
      break;
      
    case 'auto':
    default:
      // 自动生成密钥
      this._defaultKey = this._generateRandomKey();
      break;
  }
};

/**
 * 生成固定密钥
 * @private
 * @returns {Object} 密钥对象
 */
StorageEncryption.prototype._generateFixedKey = function() {
  // 使用应用特定的信息生成一个伪随机密钥
  var appInfo = this._getAppInfo();
  var saltData = 'fixed_key_salt_' + appInfo.appId;
  
  // 使用PBKDF2生成密钥
  var keyMaterial = this._crypto.stringToArrayBuffer(appInfo.seed);
  var salt = this._crypto.stringToArrayBuffer(saltData);
  
  var derivedKey = this._crypto.deriveKey(keyMaterial, salt, this.config.params.iterationCount, this.config.params.keyLength);
  
  return {
    key: derivedKey,
    createdAt: Date.now(),
    type: 'fixed',
    algorithm: this.config.algorithm
  };
};

/**
 * 生成随机密钥
 * @private
 * @returns {Object} 密钥对象
 */
StorageEncryption.prototype._generateRandomKey = function() {
  // 生成随机密钥
  var key = this._crypto.generateRandomBytes(this.config.params.keyLength / 8); // 字节数 = 位数 / 8
  
  return {
    key: key,
    createdAt: Date.now(),
    type: 'random',
    algorithm: this.config.algorithm
  };
};

/**
 * 获取应用信息（用于生成固定密钥）
 * @private
 * @returns {Object} 应用信息对象
 */
StorageEncryption.prototype._getAppInfo = function() {
  // 在实际应用中，应当获取真实的应用信息
  // 在此为了示例，使用模拟数据
  var wx = global.wx || {};
  
  try {
    // 尝试获取真实信息
    if (wx.getAccountInfoSync) {
      var accountInfo = wx.getAccountInfoSync();
      if (accountInfo && accountInfo.miniProgram) {
        return {
          appId: accountInfo.miniProgram.appId,
          version: accountInfo.miniProgram.version,
          seed: accountInfo.miniProgram.appId + '_' + accountInfo.miniProgram.version
        };
      }
    }
  } catch (e) {
    console.warn('[StorageEncryption] 获取应用信息失败', e);
  }
  
  // 使用默认信息
  return {
    appId: 'wx_default_appid',
    version: '1.0.0',
    seed: 'wx_default_appid_1.0.0'
  };
};

/**
 * 设置用户提供的密钥
 * @param {string} password 用户密码
 * @returns {boolean} 是否成功
 */
StorageEncryption.prototype.setUserKey = function(password) {
  if (!password) return false;
  
  try {
    // 从密码派生密钥
    var saltData = 'user_key_salt_' + this._getAppInfo().appId;
    var keyMaterial = this._crypto.stringToArrayBuffer(password);
    var salt = this._crypto.stringToArrayBuffer(saltData);
    
    var derivedKey = this._crypto.deriveKey(keyMaterial, salt, this.config.params.iterationCount, this.config.params.keyLength);
    
    // 使用密钥模式
    if (this.config.keyMode === 'user') {
      // 直接使用用户密钥
      this._defaultKey = {
        key: derivedKey,
        createdAt: Date.now(),
        type: 'user',
        algorithm: this.config.algorithm
      };
    } else if (this.config.keyMode === 'hybrid') {
      // 混合模式，保存用户密钥
      this._userKey = {
        key: derivedKey,
        createdAt: Date.now(),
        type: 'user',
        algorithm: this.config.algorithm
      };
    }
    
    return true;
  } catch (e) {
    console.error('[StorageEncryption] 设置用户密钥失败', e);
    return false;
  }
};

/**
 * 加密数据
 * @param {*} data 要加密的数据
 * @param {Object} options 加密选项
 * @returns {Object} 加密结果对象
 */
StorageEncryption.prototype.encrypt = function(data, options) {
  if (!this.config.enabled) {
    // 如果加密未启用，返回原始数据
    return {
      encryptionType: 'none',
      data: data
    };
  }
  
  options = options || {};
  
  try {
    // 将数据转换为字符串
    var dataStr = (typeof data === 'string') ? data : JSON.stringify(data);
    
    // 获取加密密钥
    var encryptionKey = this._getEncryptionKey(options.keyId);
    
    if (!encryptionKey) {
      console.error('[StorageEncryption] 加密失败: 无可用密钥');
      return {
        encryptionType: 'none',
        data: data
      };
    }
    
    // 生成初始化向量(IV)
    var iv = this._crypto.generateRandomBytes(this.config.params.ivLength);
    
    // 执行加密
    var algorithm = options.algorithm || this.config.algorithm;
    var ciphertext = this._crypto.encrypt(dataStr, encryptionKey.key, iv, algorithm);
    
    // 返回加密结果
    return {
      encryptionType: algorithm,
      keyId: encryptionKey.id || 'default',
      iv: this._crypto.arrayBufferToBase64(iv),
      data: this._crypto.arrayBufferToBase64(ciphertext),
      isEncrypted: true
    };
  } catch (e) {
    console.error('[StorageEncryption] 加密失败', e);
    
    // 加密失败时返回原始数据
    return {
      encryptionType: 'none',
      data: data
    };
  }
};

/**
 * 解密数据
 * @param {Object} encryptedData 加密的数据对象
 * @param {Object} options 解密选项
 * @returns {*} 解密后的数据
 */
StorageEncryption.prototype.decrypt = function(encryptedData, options) {
  options = options || {};
  
  // 检查是否为加密数据
  if (!encryptedData || encryptedData.encryptionType === 'none' || !encryptedData.isEncrypted) {
    return encryptedData.data;
  }
  
  try {
    // 获取密钥
    var keyId = encryptedData.keyId || 'default';
    var encryptionKey = this._getEncryptionKey(keyId);
    
    if (!encryptionKey) {
      console.error('[StorageEncryption] 解密失败: 密钥不可用', keyId);
      return null;
    }
    
    // 转换数据
    var ciphertext = this._crypto.base64ToArrayBuffer(encryptedData.data);
    var iv = this._crypto.base64ToArrayBuffer(encryptedData.iv);
    
    // 执行解密
    var decryptedText = this._crypto.decrypt(ciphertext, encryptionKey.key, iv, encryptedData.encryptionType);
    
    // 尝试解析为对象
    try {
      return JSON.parse(decryptedText);
    } catch (e) {
      // 如果不是有效的JSON，返回文本
      return decryptedText;
    }
  } catch (e) {
    console.error('[StorageEncryption] 解密失败', e);
    return null;
  }
};

/**
 * 获取加密密钥
 * @private
 * @param {string} keyId 密钥ID
 * @returns {Object} 密钥对象
 */
StorageEncryption.prototype._getEncryptionKey = function(keyId) {
  if (keyId && this._encryptionKeys[keyId]) {
    return this._encryptionKeys[keyId];
  }
  
  // 混合模式中优先使用用户密钥
  if (this.config.keyMode === 'hybrid' && this._userKey) {
    return this._userKey;
  }
  
  // 使用默认密钥
  return this._defaultKey;
};

/**
 * 测试加密可用性
 * @returns {boolean} 加密是否可用
 */
StorageEncryption.prototype.testEncryption = function() {
  try {
    // 准备测试数据
    var testData = { test: 'Encryption Test', timestamp: Date.now() };
    
    // 测试加密
    var encrypted = this.encrypt(testData);
    if (!encrypted || !encrypted.isEncrypted) {
      return false;
    }
    
    // 测试解密
    var decrypted = this.decrypt(encrypted);
    if (!decrypted || decrypted.test !== testData.test) {
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('[StorageEncryption] 加密测试失败', e);
    return false;
  }
};

/**
 * 创建加密器实例
 * @param {Object} options 配置选项
 * @returns {StorageEncryption} 加密器实例
 */
function createStorageEncryption(options) {
  return new StorageEncryption(options);
}

// 导出模块
module.exports = {
  StorageEncryption: StorageEncryption,
  createStorageEncryption: createStorageEncryption
}; 