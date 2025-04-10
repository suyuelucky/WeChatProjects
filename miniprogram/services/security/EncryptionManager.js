/**
 * 数据加密管理器
 * 
 * 创建时间: 2025-04-09 12:55:32 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 服务类
 * 
 * 负责数据加密、解密、密钥管理和数据签名验证
 */

// 导入依赖库
var CryptoJS = require('../../utils/storage/crypto-js.min.js');

/**
 * 数据加密管理器
 * 负责数据加密、解密、密钥管理和数据签名验证
 */
var EncryptionManager = {
  // 默认配置
  config: {
    defaultAlgorithm: 'AES-256-CTR',
    useCompression: false,
    securityLevel: 'medium',
    keyPrefix: 'secure_key_',
    storagePrefix: 'secure_data_',
    iterations: 10000
  },
  
  // 缓存数据
  cache: {
    keys: {},
    derivedKeys: {}
  },
  
  // 存储引用
  storage: null,
  
  /**
   * 初始化加密管理器
   * @param {Object} options 配置选项
   * @returns {Boolean} 初始化是否成功
   */
  init: function(options) {
    try {
      // 合并配置
      if (options) {
        for (var key in options) {
          if (options.hasOwnProperty(key)) {
            this.config[key] = options[key];
          }
        }
      }
      
      // 设置存储引用
      this.storage = this.config.storage || wx.getStorageSync;
      
      // 如果未初始化主密钥，则生成一个
      if (!this._hasMasterKey()) {
        this._generateMasterKey();
      }
      
      return true;
    } catch (error) {
      console.error('EncryptionManager初始化失败:', error);
      return false;
    }
  },
  
  /**
   * 检查是否已初始化主密钥
   * @private
   * @returns {Boolean} 是否存在主密钥
   */
  _hasMasterKey: function() {
    try {
      var masterKeyData = this.storage('master_key_info');
      return !!masterKeyData;
    } catch (error) {
      return false;
    }
  },
  
  /**
   * 生成并安全存储主密钥
   * @private
   * @returns {String} 生成的主密钥
   */
  _generateMasterKey: function() {
    // 生成随机盐值
    var salt = CryptoJS.lib.WordArray.random(16).toString();
    
    // 从设备信息派生一个设备标识符
    var deviceInfo = this._getDeviceInfo();
    
    // 使用设备信息和随机盐值派生主密钥
    var masterKey = CryptoJS.PBKDF2(
      deviceInfo, 
      salt, 
      { 
        keySize: 256 / 32, 
        iterations: this.config.iterations 
      }
    ).toString();
    
    // 存储主密钥信息（不是明文主密钥）
    var masterKeyInfo = {
      salt: salt,
      created: Date.now(),
      version: 1
    };
    
    this.storage('master_key_info', masterKeyInfo);
    
    // 将主密钥缓存在内存中（仅会话期间）
    this.cache.masterKey = masterKey;
    
    return masterKey;
  },
  
  /**
   * 获取设备信息作为密钥派生因子
   * @private
   * @returns {String} 设备信息字符串
   */
  _getDeviceInfo: function() {
    try {
      // 尝试获取系统信息
      var systemInfo = '';
      try {
        var info = wx.getSystemInfoSync();
        systemInfo = info.model + info.system + info.platform;
      } catch (e) {
        systemInfo = 'fallback_system_info';
      }
      
      // 获取当前小程序账号信息
      var accountInfo = '';
      try {
        var account = wx.getAccountInfoSync();
        accountInfo = account.miniProgram.appId;
      } catch (e) {
        accountInfo = 'fallback_account_info';
      }
      
      // 组合设备特征信息
      return systemInfo + accountInfo + 'device_salt_v1';
    } catch (error) {
      console.error('获取设备信息失败:', error);
      // 返回一个备用标识符
      return 'fallback_device_identifier_v1';
    }
  },
  
  /**
   * 获取主密钥（优先从缓存获取）
   * @private
   * @returns {String} 主密钥
   */
  _getMasterKey: function() {
    // 如果缓存中有主密钥，直接返回
    if (this.cache.masterKey) {
      return this.cache.masterKey;
    }
    
    try {
      // 获取主密钥信息
      var keyInfo = this.storage('master_key_info');
      if (!keyInfo) {
        throw new Error('主密钥未初始化');
      }
      
      // 从设备信息和存储的盐值重新派生主密钥
      var deviceInfo = this._getDeviceInfo();
      var masterKey = CryptoJS.PBKDF2(
        deviceInfo,
        keyInfo.salt,
        {
          keySize: 256 / 32,
          iterations: this.config.iterations
        }
      ).toString();
      
      // 缓存主密钥
      this.cache.masterKey = masterKey;
      
      return masterKey;
    } catch (error) {
      console.error('获取主密钥失败:', error);
      throw error;
    }
  },
  
  /**
   * 生成随机盐值
   * @returns {String} 生成的盐值
   */
  generateSalt: function() {
    return CryptoJS.lib.WordArray.random(16).toString();
  },
  
  /**
   * 生成新密钥
   * @param {String} type 密钥类型 ('symmetric'|'asymmetric')
   * @param {Number} strength 密钥强度
   * @returns {String|Object} 生成的密钥(symmetric)或密钥对(asymmetric)
   */
  generateKey: function(type, strength) {
    try {
      if (type === 'symmetric') {
        // 对称密钥：直接生成随机字节
        var keySize = (strength || 256) / 8;
        return CryptoJS.lib.WordArray.random(keySize).toString();
      } else if (type === 'asymmetric') {
        // 为了微信小程序的兼容性，暂时使用模拟的非对称密钥
        var publicKey = CryptoJS.lib.WordArray.random(32).toString();
        var privateKey = CryptoJS.lib.WordArray.random(64).toString();
        
        return {
          publicKey: publicKey,
          privateKey: privateKey
        };
      } else {
        throw new Error('无效的密钥类型: ' + type);
      }
    } catch (error) {
      console.error('生成密钥失败:', error);
      throw error;
    }
  },
  
  /**
   * 从密码派生密钥
   * @param {String} password 用户密码
   * @param {String} salt 盐值
   * @returns {String} 派生的密钥
   */
  deriveKeyFromPassword: function(password, salt) {
    if (!password) {
      throw new Error('密码不能为空');
    }
    
    if (!salt) {
      throw new Error('盐值不能为空');
    }
    
    // 基于密码和盐值派生密钥
    return CryptoJS.PBKDF2(
      password,
      salt,
      {
        keySize: 256 / 32,
        iterations: this.config.iterations
      }
    ).toString();
  },
  
  /**
   * 安全存储密钥
   * @param {String} key 要存储的密钥
   * @param {String} alias 密钥别名
   * @returns {Boolean} 存储是否成功
   */
  storeKey: function(key, alias) {
    if (!key) {
      throw new Error('无效的密钥');
    }
    
    if (!alias) {
      throw new Error('密钥别名不能为空');
    }
    
    try {
      // 获取主密钥
      var masterKey = this._getMasterKey();
      
      // 使用主密钥加密目标密钥
      var encryptedKey = this._encryptWithKey(key, masterKey);
      
      // 存储加密后的密钥
      var keyData = {
        encrypted: encryptedKey,
        created: Date.now(),
        updated: Date.now(),
        algorithm: this.config.defaultAlgorithm
      };
      
      // 使用指定前缀和别名作为存储键
      var storageKey = this.config.keyPrefix + alias;
      this.storage(storageKey, keyData);
      
      // 同时缓存在内存中
      this.cache.keys[alias] = key;
      
      return true;
    } catch (error) {
      console.error('存储密钥失败:', error);
      throw error;
    }
  },
  
  /**
   * 检索存储的密钥
   * @param {String} alias 密钥别名
   * @returns {String} 检索到的密钥
   */
  retrieveKey: function(alias) {
    if (!alias) {
      throw new Error('密钥别名不能为空');
    }
    
    // 首先尝试从缓存获取
    if (this.cache.keys[alias]) {
      return this.cache.keys[alias];
    }
    
    try {
      // 从存储中获取加密的密钥数据
      var storageKey = this.config.keyPrefix + alias;
      var keyData = this.storage(storageKey);
      
      if (!keyData) {
        throw new Error('密钥不存在: ' + alias);
      }
      
      // 获取主密钥
      var masterKey = this._getMasterKey();
      
      // 使用主密钥解密目标密钥
      var decryptedKey = this._decryptWithKey(keyData.encrypted, masterKey);
      
      // 缓存解密后的密钥
      this.cache.keys[alias] = decryptedKey;
      
      return decryptedKey;
    } catch (error) {
      console.error('检索密钥失败:', error);
      throw error;
    }
  },
  
  /**
   * 轮换密钥
   * @param {String} alias 要轮换的密钥别名
   * @returns {String} 新密钥
   */
  rotateKey: function(alias) {
    try {
      // 首先检索旧密钥以确保它存在
      var oldKey = this.retrieveKey(alias);
      
      // 获取旧密钥的存储信息
      var storageKey = this.config.keyPrefix + alias;
      var keyData = this.storage(storageKey);
      
      // 生成新密钥
      var algorithm = keyData.algorithm || this.config.defaultAlgorithm;
      var newKey = this.generateKey('symmetric', 256);
      
      // 存储新密钥，覆盖旧密钥
      this.storeKey(newKey, alias);
      
      // 记录历史版本（在实际应用中可能需要处理旧数据解密问题）
      var historyKey = this.config.keyPrefix + alias + '_history';
      var history = this.storage(historyKey) || [];
      history.push({
        keyId: keyData.keyId || Date.now().toString(),
        rotatedAt: Date.now()
      });
      this.storage(historyKey, history);
      
      return newKey;
    } catch (error) {
      console.error('轮换密钥失败:', error);
      throw error;
    }
  },
  
  /**
   * 使用指定密钥加密数据
   * @private
   * @param {String} data 要加密的数据
   * @param {String} key 加密密钥
   * @returns {String} 加密后的数据
   */
  _encryptWithKey: function(data, key) {
    try {
      // 转换密钥为WordArray
      var keyWA = CryptoJS.enc.Hex.parse(key);
      
      // 生成随机IV
      var iv = CryptoJS.lib.WordArray.random(16);
      
      // 转换数据为字符串
      var dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
      
      // 执行加密
      var encrypted = CryptoJS.AES.encrypt(dataStr, keyWA, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      // 组合IV和密文
      var result = {
        iv: iv.toString(),
        ciphertext: encrypted.toString()
      };
      
      return JSON.stringify(result);
    } catch (error) {
      console.error('加密数据失败:', error);
      throw error;
    }
  },
  
  /**
   * 使用指定密钥解密数据
   * @private
   * @param {String} encryptedData 加密的数据
   * @param {String} key 解密密钥
   * @returns {String} 解密后的数据
   */
  _decryptWithKey: function(encryptedData, key) {
    try {
      // 解析加密数据
      var encData = JSON.parse(encryptedData);
      var iv = CryptoJS.enc.Hex.parse(encData.iv);
      var ciphertext = encData.ciphertext;
      
      // 转换密钥为WordArray
      var keyWA = CryptoJS.enc.Hex.parse(key);
      
      // 执行解密
      var decrypted = CryptoJS.AES.decrypt(ciphertext, keyWA, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      // 转换为UTF-8字符串
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('解密数据失败:', error);
      throw error;
    }
  },
  
  /**
   * 获取或创建加密密钥
   * @private
   * @param {Object} options 加密选项
   * @returns {String} 加密密钥
   */
  _getEncryptionKey: function(options) {
    try {
      // 如果提供了密钥，直接使用
      if (options && options.encryptionKey) {
        return options.encryptionKey;
      }
      
      // 如果提供了密钥别名，尝试检索
      if (options && options.keyAlias) {
        return this.retrieveKey(options.keyAlias);
      }
      
      // 使用默认加密密钥
      var defaultKeyAlias = 'default_encryption_key';
      try {
        // 尝试检索默认密钥
        return this.retrieveKey(defaultKeyAlias);
      } catch (e) {
        // 如果默认密钥不存在，创建一个
        var newKey = this.generateKey('symmetric', 256);
        this.storeKey(newKey, defaultKeyAlias);
        return newKey;
      }
    } catch (error) {
      console.error('获取加密密钥失败:', error);
      throw error;
    }
  },
  
  /**
   * 对数据进行签名
   * @param {Object|String} data 要签名的数据
   * @param {Object} options 签名选项
   * @returns {String} 签名
   */
  signData: function(data, options) {
    if (data === null || data === undefined) {
      throw new Error('无法对null或undefined数据进行签名');
    }
    
    try {
      options = options || {};
      var algorithm = options.algorithm || 'SHA256';
      
      // 将对象转换为规范化的JSON字符串（确保字段顺序一致）
      var message = typeof data === 'string' ? data : JSON.stringify(this._sortObjectKeys(data));
      
      // 使用私钥进行签名
      var privateKey = options.privateKey;
      if (!privateKey) {
        // 使用默认签名密钥
        var signKeyAlias = 'default_signature_key';
        try {
          privateKey = this.retrieveKey(signKeyAlias);
        } catch (e) {
          // 如果默认签名密钥不存在，创建一个
          var keyPair = this.generateKey('asymmetric', 2048);
          this.storeKey(keyPair.privateKey, signKeyAlias);
          this.storeKey(keyPair.publicKey, signKeyAlias + '_public');
          privateKey = keyPair.privateKey;
        }
      }
      
      // 创建HMAC签名（由于微信小程序环境限制，使用HMAC替代真正的非对称签名）
      var signature = CryptoJS.HmacSHA256(message, privateKey).toString();
      
      return signature;
    } catch (error) {
      console.error('数据签名失败:', error);
      throw error;
    }
  },
  
  /**
   * 验证数据签名
   * @param {Object|String} data 原始数据
   * @param {String} signature 签名
   * @param {Object} options 验证选项
   * @returns {Boolean} 签名是否有效
   */
  verifySignature: function(data, signature, options) {
    if (data === null || data === undefined) {
      throw new Error('无法验证null或undefined数据的签名');
    }
    
    if (!signature) {
      throw new Error('签名不能为空');
    }
    
    try {
      options = options || {};
      var algorithm = options.algorithm || 'SHA256';
      
      // 将对象转换为规范化的JSON字符串（确保字段顺序一致）
      var message = typeof data === 'string' ? data : JSON.stringify(this._sortObjectKeys(data));
      
      // 获取验证密钥
      var verifyKey = options.publicKey;
      if (!verifyKey) {
        // 使用默认签名公钥
        var signKeyAlias = 'default_signature_key_public';
        try {
          verifyKey = this.retrieveKey(signKeyAlias);
        } catch (e) {
          // 如果找不到公钥，使用私钥（在HMAC情况下是相同的）
          verifyKey = this.retrieveKey('default_signature_key');
        }
      }
      
      // 使用公钥验证HMAC签名
      var expectedSignature = CryptoJS.HmacSHA256(message, verifyKey).toString();
      
      // 常量时间比较以防止时序攻击
      return this._secureCompare(signature, expectedSignature);
    } catch (error) {
      console.error('验证签名失败:', error);
      return false;
    }
  },
  
  /**
   * 安全比较两个字符串，防止时序攻击
   * @private
   * @param {String} a 第一个字符串
   * @param {String} b 第二个字符串
   * @returns {Boolean} 两个字符串是否相等
   */
  _secureCompare: function(a, b) {
    if (a.length !== b.length) {
      return false;
    }
    
    var result = 0;
    for (var i = 0; i < a.length; i++) {
      result |= (a.charCodeAt(i) ^ b.charCodeAt(i));
    }
    
    return result === 0;
  },
  
  /**
   * 对象键排序，确保签名一致性
   * @private
   * @param {Object} obj 要排序键的对象
   * @returns {Object} 排序后的对象
   */
  _sortObjectKeys: function(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this._sortObjectKeys(item));
    }
    
    var sortedObj = {};
    var keys = Object.keys(obj).sort();
    
    for (var i = 0; i < keys.length; i++) {
      sortedObj[keys[i]] = this._sortObjectKeys(obj[keys[i]]);
    }
    
    return sortedObj;
  },
  
  /**
   * 加密数据
   * @param {Object|String} data 要加密的数据
   * @param {Object} options 加密选项
   * @returns {String} 加密后的数据
   */
  encrypt: function(data, options) {
    if (data === null || data === undefined) {
      throw new Error('无法加密null或undefined数据');
    }
    
    try {
      options = options || {};
      
      // 获取加密密钥
      var encryptionKey = options.key || this._getEncryptionKey(options);
      
      // 转换数据为字符串
      var dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
      
      // 数据压缩（可选）
      if (this.config.useCompression || options.useCompression) {
        // 在实际实现中应添加压缩逻辑
        // dataStr = compress(dataStr);
      }
      
      // 如果需要，添加附加认证数据(AAD)支持
      var aad = options.additionalAuthenticatedData;
      var result;
      
      // 根据算法选择加密模式
      var algorithm = options.algorithm || this.config.defaultAlgorithm;
      
      if (algorithm.indexOf('GCM') > -1 && aad) {
        // GCM模式支持AAD，但由于微信小程序兼容性问题，
        // 这里我们不直接使用GCM，而是模拟其行为
        var iv = CryptoJS.lib.WordArray.random(16);
        var keyWA = CryptoJS.enc.Hex.parse(encryptionKey);
        
        // 加密主数据
        var encrypted = CryptoJS.AES.encrypt(dataStr, keyWA, {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        });
        
        // 创建包含AAD的认证标签
        var authTag = CryptoJS.HmacSHA256(
          aad + iv.toString() + encrypted.toString(),
          keyWA
        ).toString();
        
        result = {
          iv: iv.toString(),
          ciphertext: encrypted.toString(),
          authTag: authTag,
          aad: aad
        };
      } else {
        // 标准CBC模式
        var iv = CryptoJS.lib.WordArray.random(16);
        var keyWA = CryptoJS.enc.Hex.parse(encryptionKey);
        
        var encrypted = CryptoJS.AES.encrypt(dataStr, keyWA, {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        });
        
        result = {
          iv: iv.toString(),
          ciphertext: encrypted.toString()
        };
      }
      
      return JSON.stringify(result);
    } catch (error) {
      console.error('加密数据失败:', error);
      throw error;
    }
  },
  
  /**
   * 解密数据
   * @param {String} encryptedData 加密的数据
   * @param {Object} options 解密选项
   * @returns {Object|String} 解密后的数据
   */
  decrypt: function(encryptedData, options) {
    if (!encryptedData) {
      throw new Error('加密数据不能为空');
    }
    
    try {
      options = options || {};
      
      // 解析加密数据
      var encData = JSON.parse(encryptedData);
      
      // 获取解密密钥
      var decryptionKey = options.key || this._getEncryptionKey(options);
      
      // 根据算法选择解密模式
      var algorithm = options.algorithm || this.config.defaultAlgorithm;
      var decrypted;
      
      if (encData.authTag && encData.aad) {
        // 处理带有AAD的GCM模式模拟
        var iv = CryptoJS.enc.Hex.parse(encData.iv);
        var keyWA = CryptoJS.enc.Hex.parse(decryptionKey);
        
        // 验证认证标签
        var expectedAuthTag = CryptoJS.HmacSHA256(
          encData.aad + encData.iv + encData.ciphertext,
          keyWA
        ).toString();
        
        // 验证认证标签是否匹配
        if (!this._secureCompare(encData.authTag, expectedAuthTag)) {
          throw new Error('认证标签验证失败，数据可能被篡改');
        }
        
        // 解密主数据
        decrypted = CryptoJS.AES.decrypt(encData.ciphertext, keyWA, {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        });
      } else {
        // 标准CBC模式
        var iv = CryptoJS.enc.Hex.parse(encData.iv);
        var keyWA = CryptoJS.enc.Hex.parse(decryptionKey);
        
        decrypted = CryptoJS.AES.decrypt(encData.ciphertext, keyWA, {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        });
      }
      
      // 转换为UTF-8字符串
      var decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
      
      // 数据解压缩（如果已压缩）
      if (this.config.useCompression || options.useCompression) {
        // 在实际实现中应添加解压缩逻辑
        // decryptedStr = decompress(decryptedStr);
      }
      
      // 尝试解析为JSON，如果失败则返回原始字符串
      try {
        return JSON.parse(decryptedStr);
      } catch (e) {
        return decryptedStr;
      }
    } catch (error) {
      console.error('解密数据失败:', error);
      throw error;
    }
  },
  
  /**
   * 安全存储数据
   * @param {String} key 存储键
   * @param {Object|String} data 要存储的数据
   * @param {Object} options 存储选项
   * @returns {Boolean} 存储是否成功
   */
  secureStore: function(key, data, options) {
    if (!key) {
      throw new Error('存储键不能为空');
    }
    
    if (data === null || data === undefined) {
      throw new Error('无法存储null或undefined数据');
    }
    
    try {
      options = options || {};
      var securityLevel = options.securityLevel || this.config.securityLevel;
      
      // 如果安全级别是"高"或"最高"，为关键数据添加额外保护
      if (securityLevel === 'high' || securityLevel === 'highest') {
        // 对数据先进行签名，确保完整性
        var signature = this.signData(data);
        var dataWithSig = {
          data: data,
          signature: signature,
          timestamp: Date.now()
        };
        
        // 加密数据
        var encryptedData = this.encrypt(dataWithSig, options);
        
        // 使用存储前缀
        var storageKey = this.config.storagePrefix + key;
        
        // 存储加密数据
        if (typeof this.storage === 'function') {
          // 兼容wx.setStorageSync
          this.storage(storageKey, encryptedData);
        } else if (this.storage && typeof this.storage.setItem === 'function') {
          // 兼容localStorage
          this.storage.setItem(storageKey, encryptedData);
        } else {
          throw new Error('存储适配器不可用');
        }
      } else {
        // 中低级别安全只进行简单加密
        var encryptedData = this.encrypt(data, options);
        var storageKey = this.config.storagePrefix + key;
        
        if (typeof this.storage === 'function') {
          this.storage(storageKey, encryptedData);
        } else if (this.storage && typeof this.storage.setItem === 'function') {
          this.storage.setItem(storageKey, encryptedData);
        } else {
          throw new Error('存储适配器不可用');
        }
      }
      
      return true;
    } catch (error) {
      console.error('安全存储数据失败:', error);
      throw error;
    }
  },
  
  /**
   * 安全检索数据
   * @param {String} key 存储键
   * @param {Object} options 检索选项
   * @returns {Object|String} 检索到的数据
   */
  secureRetrieve: function(key, options) {
    if (!key) {
      throw new Error('存储键不能为空');
    }
    
    try {
      options = options || {};
      
      // 使用存储前缀
      var storageKey = this.config.storagePrefix + key;
      
      // 检索加密数据
      var encryptedData;
      if (typeof this.storage === 'function') {
        // 兼容wx.getStorageSync
        encryptedData = this.storage(storageKey);
      } else if (this.storage && typeof this.storage.getItem === 'function') {
        // 兼容localStorage
        encryptedData = this.storage.getItem(storageKey);
      } else {
        throw new Error('存储适配器不可用');
      }
      
      if (!encryptedData) {
        return null;
      }
      
      // 解密数据
      var decryptedData = this.decrypt(encryptedData, options);
      
      // 检查是否包含签名（高安全级别的数据）
      if (decryptedData && decryptedData.data && decryptedData.signature) {
        // 验证签名
        var isValid = this.verifySignature(decryptedData.data, decryptedData.signature);
        if (!isValid) {
          throw new Error('数据签名验证失败，数据可能被篡改');
        }
        
        // 返回实际数据
        return decryptedData.data;
      }
      
      // 返回直接解密的数据
      return decryptedData;
    } catch (error) {
      console.error('安全检索数据失败:', error);
      throw error;
    }
  },
  
  /**
   * 安全删除数据
   * @param {String} key 存储键
   * @returns {Boolean} 删除是否成功
   */
  secureDelete: function(key) {
    if (!key) {
      throw new Error('存储键不能为空');
    }
    
    try {
      // 使用存储前缀
      var storageKey = this.config.storagePrefix + key;
      
      // 删除存储的数据
      if (typeof this.storage === 'function') {
        // 对于wx.removeStorageSync，我们需要模拟移除
        try {
          this.storage(storageKey, '');
          return true;
        } catch (e) {
          // 微信API可能没有提供removeStorageSync，这里使用空字符串替代
          this.storage(storageKey, '');
          return true;
        }
      } else if (this.storage && typeof this.storage.removeItem === 'function') {
        // 兼容localStorage
        this.storage.removeItem(storageKey);
        return true;
      } else {
        throw new Error('存储适配器不可用');
      }
    } catch (error) {
      console.error('安全删除数据失败:', error);
      throw error;
    }
  },
  
  /**
   * 检查安全存储的数据是否存在
   * @param {String} key 存储键
   * @returns {Boolean} 数据是否存在
   */
  secureExists: function(key) {
    if (!key) {
      return false;
    }
    
    try {
      // 使用存储前缀
      var storageKey = this.config.storagePrefix + key;
      
      // 检查存储中是否存在数据
      var data;
      if (typeof this.storage === 'function') {
        // 兼容wx.getStorageSync
        data = this.storage(storageKey);
      } else if (this.storage && typeof this.storage.getItem === 'function') {
        // 兼容localStorage
        data = this.storage.getItem(storageKey);
      } else {
        throw new Error('存储适配器不可用');
      }
      
      return !!data;
    } catch (error) {
      console.error('检查安全存储数据失败:', error);
      return false;
    }
  },
  
  /**
   * 获取内部存储对象（仅用于测试）
   * @private
   * @returns {Object} 内部存储对象
   */
  _getInternalStorage: function() {
    return this.storage;
  }
};

module.exports = EncryptionManager; 