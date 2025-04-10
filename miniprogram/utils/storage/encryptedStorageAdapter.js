/**
 * 加密存储适配器
 * 提供数据加密存储能力，确保敏感数据安全
 * 遵循ES5标准，确保微信小程序兼容性
 */

var StorageConfig = require('./storageConfig');
var crypto = require('./crypto');

/**
 * 加密存储适配器构造函数
 * @param {Object} options 配置选项
 * @param {string} options.password 加密密码
 * @param {string} options.algorithm 加密算法（默认：AES-256-CBC）
 * @param {number} options.quota 存储配额（可选）
 */
function EncryptedStorageAdapter(options) {
    if (!options || !options.password) {
        throw new Error('必须提供加密密码');
    }

    this.validatePassword(options.password);
    
    this._password = options.password;
    this._algorithm = options.algorithm || 'AES-256-CBC';
    this._quota = options.quota || StorageConfig.DEFAULT_QUOTA;
    this._storage = wx.getStorageSync('encrypted_storage') || {};
    this._usedSpace = this._calculateUsedSpace();
    this._addKeyHistory();

    // 版本控制配置
    this._versionConfig = {
        maxVersions: 10,
        maxAge: 7 * 24 * 60 * 60 * 1000  // 默认7天
    };

    // 版本元数据存储键
    this._VERSION_META_KEY = '_version_meta';
    
    // 初始化版本元数据
    this._initVersionMeta();

    // 操作队列配置
    this._operationQueue = [];
    this._writeDelay = 0;
    this._writeTimer = null;
    this._pendingOperations = {};
}

/**
 * 验证密码强度
 * @param {string} password 待验证的密码
 * @throws {Error} 当密码强度不足时抛出错误
 */
EncryptedStorageAdapter.prototype.validatePassword = function(password) {
    if (typeof password !== 'string') {
        throw new Error('密码必须是字符串');
    }
    if (password.length < 8) {
        throw new Error('密码长度必须至少为8个字符');
    }
    if (!/[A-Z]/.test(password)) {
        throw new Error('密码必须包含至少一个大写字母');
    }
    if (!/[a-z]/.test(password)) {
        throw new Error('密码必须包含至少一个小写字母');
    }
    if (!/[0-9]/.test(password)) {
        throw new Error('密码必须包含至少一个数字');
    }
};

/**
 * 计算已使用的存储空间
 * @returns {number} 已使用的字节数
 * @private
 */
EncryptedStorageAdapter.prototype._calculateUsedSpace = function() {
    var total = 0;
    for (var key in this._storage) {
        if (this._storage.hasOwnProperty(key)) {
            total += this._getDataSize(this._storage[key]);
        }
    }
    return total;
};

/**
 * 获取存储项
 * @param {string} key 键名
 * @returns {*} 解密后的数据，不存在时返回null
 */
EncryptedStorageAdapter.prototype.get = function(key) {
    var encrypted = this._getRawData(key);
    if (encrypted === null) {
        return null;
    }
    try {
        return crypto.decrypt(encrypted, this._password);
    } catch (e) {
        throw new Error('数据解密失败：' + e.message);
    }
};

/**
 * 设置存储项
 * @param {string} key 键名
 * @param {*} value 要存储的值
 * @throws {Error} 当超出配额时抛出错误
 */
EncryptedStorageAdapter.prototype.set = function(key, value, options) {
    options = options || {};
    
    // 检查版本冲突
    if (options.baseVersion) {
        var currentVersion = this.getVersion(key);
        if (currentVersion && currentVersion !== options.baseVersion) {
            throw new Error('版本冲突：数据已被其他操作更新');
        }
    }
    
    // 创建新版本
    var versionId = this._addVersion(key, value, options);
    
    // 调用原始set方法存储最新值
    return originalSet.call(this, key, value);
};

/**
 * 删除存储项
 * @param {string} key 键名
 */
EncryptedStorageAdapter.prototype.remove = function(key) {
    var size = this._getDataSize(this._getRawData(key)) || 0;
    delete this._storage[key];
    this._usedSpace -= size;
    this._persistStorage();
};

/**
 * 清空所有存储
 */
EncryptedStorageAdapter.prototype.clear = function() {
    this._storage = {};
    this._usedSpace = 0;
    this._persistStorage();
};

/**
 * 获取原始加密数据
 * @param {string} key 键名
 * @returns {Object|null} 加密的数据对象
 * @private
 */
EncryptedStorageAdapter.prototype._getRawData = function(key) {
    return this._storage[key] || null;
};

/**
 * 设置原始加密数据
 * @param {string} key 键名
 * @param {Object} value 加密的数据对象
 * @private
 */
EncryptedStorageAdapter.prototype._setRawData = function(key, value) {
    this._storage[key] = value;
};

/**
 * 持久化存储数据
 * @private
 */
EncryptedStorageAdapter.prototype._persistStorage = function() {
    try {
        wx.setStorageSync('encrypted_storage', this._storage);
    } catch (e) {
        throw new Error('存储持久化失败：' + e.message);
    }
};

/**
 * 获取数据大小
 * @param {*} data 要计算大小的数据
 * @returns {number} 数据大小（字节）
 * @private
 */
EncryptedStorageAdapter.prototype._getDataSize = function(data) {
    if (data === null || data === undefined) {
        return 0;
    }
    return typeof data === 'string' ? data.length : JSON.stringify(data).length;
};

/**
 * 设置存储配额
 * @param {number} quota 配额大小（字节）
 */
EncryptedStorageAdapter.prototype.setQuota = function(quota) {
    if (typeof quota !== 'number' || quota <= 0) {
        throw new Error('配额必须是正数');
    }
    this._quota = quota;
};

/**
 * 获取当前存储使用量
 * @returns {number} 已使用的存储空间（字节）
 */
EncryptedStorageAdapter.prototype.getStorageUsage = function() {
    return this._usedSpace;
};

/**
 * 获取存储配额
 * @returns {number} 存储配额（字节）
 */
EncryptedStorageAdapter.prototype.getQuota = function() {
    return this._quota;
};

/**
 * 执行密钥轮换
 * @param {string} newPassword 新密码
 * @throws {Error} 当密码强度不足或轮换失败时抛出错误
 */
EncryptedStorageAdapter.prototype.rotateKey = function(newPassword) {
    // 验证新密码强度
    this.validatePassword(newPassword);
    
    // 备份当前存储状态
    var backupStorage = JSON.parse(JSON.stringify(this._storage));
    var backupPassword = this._password;
    
    try {
        // 获取所有存储的数据
        var allData = {};
        for (var key in this._storage) {
            if (this._storage.hasOwnProperty(key)) {
                allData[key] = this.get(key);
            }
        }
        
        // 更新密码
        this._password = newPassword;
        
        // 清空存储
        this._storage = {};
        this._usedSpace = 0;
        
        // 使用新密码重新加密所有数据
        for (var dataKey in allData) {
            if (allData.hasOwnProperty(dataKey)) {
                this.set(dataKey, allData[dataKey]);
            }
        }
        
        // 持久化更新后的存储
        this._persistStorage();
        
    } catch (error) {
        // 发生错误时回滚更改
        this._storage = backupStorage;
        this._password = backupPassword;
        this._usedSpace = this._calculateUsedSpace();
        this._persistStorage();
        
        throw new Error('密钥轮换失败：' + error.message);
    }
};

/**
 * 获取密码历史记录
 * @returns {Array} 密码更改历史记录
 */
EncryptedStorageAdapter.prototype.getKeyHistory = function() {
    try {
        return JSON.parse(wx.getStorageSync('encrypted_storage_key_history') || '[]');
    } catch (e) {
        return [];
    }
};

/**
 * 添加密码历史记录
 * @private
 */
EncryptedStorageAdapter.prototype._addKeyHistory = function() {
    var history = this.getKeyHistory();
    var record = {
        timestamp: Date.now(),
        keyHash: crypto.generateHMAC(this._password, 'key_history')
    };
    
    history.push(record);
    
    // 只保留最近的10条记录
    if (history.length > 10) {
        history = history.slice(-10);
    }
    
    try {
        wx.setStorageSync('encrypted_storage_key_history', JSON.stringify(history));
    } catch (e) {
        console.error('保存密钥历史记录失败：', e);
    }
};

/**
 * 初始化版本元数据存储
 * @private
 */
EncryptedStorageAdapter.prototype._initVersionMeta = function() {
    var meta = this._storage.get(this._VERSION_META_KEY);
    if (!meta) {
        meta = {
            versions: {},  // 存储每个键的版本信息
            tags: {}      // 存储标签到版本的映射
        };
        this._storage.set(this._VERSION_META_KEY, meta);
    }
};

/**
 * 生成新的版本ID
 * @private
 * @returns {string} 版本ID
 */
EncryptedStorageAdapter.prototype._generateVersionId = function() {
    return 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

/**
 * 获取键的所有版本信息
 * @private
 * @param {string} key - 存储键
 * @returns {Array} 版本信息数组
 */
EncryptedStorageAdapter.prototype._getVersionsForKey = function(key) {
    var meta = this._storage.get(this._VERSION_META_KEY);
    return meta.versions[key] || [];
};

/**
 * 添加新版本
 * @private
 * @param {string} key - 存储键
 * @param {*} value - 存储值
 * @param {Object} options - 版本选项
 * @returns {string} 新版本ID
 */
EncryptedStorageAdapter.prototype._addVersion = function(key, value, options) {
    options = options || {};
    var versionId = this._generateVersionId();
    var meta = this._storage.get(this._VERSION_META_KEY);
    
    if (!meta.versions[key]) {
        meta.versions[key] = [];
    }
    
    var versionInfo = {
        id: versionId,
        timestamp: Date.now(),
        tag: options.tag || null
    };
    
    meta.versions[key].push(versionInfo);
    
    // 如果指定了标签，更新标签映射
    if (options.tag) {
        if (!meta.tags[key]) {
            meta.tags[key] = {};
        }
        meta.tags[key][options.tag] = versionId;
    }
    
    // 应用版本保留策略
    this._applyRetentionPolicy(key);
    
    // 保存元数据
    this._storage.set(this._VERSION_META_KEY, meta);
    
    // 保存版本化的数据
    this._storage.set(this._getVersionKey(key, versionId), value);
    
    return versionId;
};

/**
 * 获取版本化的存储键
 * @private
 * @param {string} key - 原始键
 * @param {string} versionId - 版本ID
 * @returns {string} 版本化的存储键
 */
EncryptedStorageAdapter.prototype._getVersionKey = function(key, versionId) {
    return key + '@' + versionId;
};

/**
 * 应用版本保留策略
 * @private
 * @param {string} key - 存储键
 */
EncryptedStorageAdapter.prototype._applyRetentionPolicy = function(key) {
    var meta = this._storage.get(this._VERSION_META_KEY);
    var versions = meta.versions[key];
    
    if (!versions) return;
    
    // 按时间戳排序
    versions.sort(function(a, b) {
        return b.timestamp - a.timestamp;
    });
    
    // 应用最大版本数限制
    if (versions.length > this._versionConfig.maxVersions) {
        var versionsToRemove = versions.splice(this._versionConfig.maxVersions);
        versionsToRemove.forEach(function(version) {
            // 删除版本数据
            this._storage.remove(this._getVersionKey(key, version.id));
            // 清理标签引用
            if (meta.tags[key]) {
                Object.keys(meta.tags[key]).forEach(function(tag) {
                    if (meta.tags[key][tag] === version.id) {
                        delete meta.tags[key][tag];
                    }
                });
            }
        }, this);
    }
    
    // 应用最大年龄限制
    var now = Date.now();
    versions = versions.filter(function(version) {
        if (now - version.timestamp > this._versionConfig.maxAge) {
            // 删除过期版本
            this._storage.remove(this._getVersionKey(key, version.id));
            return false;
        }
        return true;
    }, this);
    
    meta.versions[key] = versions;
    this._storage.set(this._VERSION_META_KEY, meta);
};

/**
 * 获取键的当前版本ID
 * @param {string} key - 存储键
 * @returns {string|null} 版本ID
 */
EncryptedStorageAdapter.prototype.getVersion = function(key) {
    var versions = this._getVersionsForKey(key);
    return versions.length > 0 ? versions[versions.length - 1].id : null;
};

/**
 * 获取指定版本的数据
 * @param {string} key - 存储键
 * @param {string} versionId - 版本ID
 * @returns {*} 存储的值
 */
EncryptedStorageAdapter.prototype.getByVersion = function(key, versionId) {
    var versions = this._getVersionsForKey(key);
    var versionExists = versions.some(function(v) {
        return v.id === versionId;
    });
    
    if (!versionExists) {
        throw new Error('指定版本不存在');
    }
    
    return this._storage.get(this._getVersionKey(key, versionId));
};

/**
 * 通过标签获取数据
 * @param {string} key - 存储键
 * @param {string} tag - 标签名
 * @returns {*} 存储的值
 */
EncryptedStorageAdapter.prototype.getByTag = function(key, tag) {
    var meta = this._storage.get(this._VERSION_META_KEY);
    if (!meta.tags[key] || !meta.tags[key][tag]) {
        throw new Error('指定标签不存在');
    }
    
    var versionId = meta.tags[key][tag];
    return this.getByVersion(key, versionId);
};

/**
 * 列出键的所有版本
 * @param {string} key - 存储键
 * @returns {Array} 版本信息数组
 */
EncryptedStorageAdapter.prototype.listVersions = function(key) {
    return this._getVersionsForKey(key).slice().sort(function(a, b) {
        return a.timestamp - b.timestamp;
    });
};

/**
 * 回滚到指定版本
 * @param {string} key - 存储键
 * @param {string} versionId - 目标版本ID
 */
EncryptedStorageAdapter.prototype.rollback = function(key, versionId) {
    var value = this.getByVersion(key, versionId);
    this.set(key, value, { tag: 'rollback_' + Date.now() });
};

/**
 * 设置版本保留策略
 * @param {Object} config - 配置对象
 * @param {number} config.maxVersions - 每个键保留的最大版本数
 * @param {number} config.maxAge - 版本的最大保留时间（毫秒）
 */
EncryptedStorageAdapter.prototype.setVersionRetention = function(config) {
    this._versionConfig = Object.assign({}, this._versionConfig, config);
    
    // 立即应用新的保留策略
    var meta = this._storage.get(this._VERSION_META_KEY);
    Object.keys(meta.versions).forEach(function(key) {
        this._applyRetentionPolicy(key);
    }, this);
};

/**
 * 批量获取多个键的值
 * @param {Array<string>} keys 要获取的键数组
 * @returns {Object} 键值对对象
 */
EncryptedStorageAdapter.prototype.batchGet = function(keys) {
    var result = {};
    keys.forEach(function(key) {
        try {
            result[key] = this.get(key);
        } catch (error) {
            result[key] = null;
        }
    }, this);
    return result;
};

/**
 * 批量获取指定版本的值
 * @param {Object} keyVersions 键到版本的映射
 * @returns {Object} 键值对对象
 */
EncryptedStorageAdapter.prototype.batchGetByVersion = function(keyVersions) {
    var result = {};
    Object.keys(keyVersions).forEach(function(key) {
        try {
            result[key] = this.getByVersion(key, keyVersions[key]);
        } catch (error) {
            result[key] = null;
        }
    }, this);
    return result;
};

/**
 * 批量设置多个键的值
 * @param {Object} data 键值对对象
 * @throws {Error} 当任何操作失败时抛出错误
 */
EncryptedStorageAdapter.prototype.batchSet = function(data) {
    var backup = this._createBackup();
    var successfulWrites = [];

    try {
        Object.keys(data).forEach(function(key) {
            var value = data[key];
            var options = {};

            // 处理带标签的值
            if (value && typeof value === 'object' && 'value' in value) {
                options.tag = value.tag;
                value = value.value;
            }

            this.set(key, value, options);
            successfulWrites.push(key);
        }, this);
    } catch (error) {
        // 发生错误时回滚已写入的数据
        successfulWrites.forEach(function(key) {
            if (backup.data[key]) {
                this._setRawData(key, backup.data[key]);
            } else {
                this.remove(key);
            }
        }, this);

        // 恢复版本元数据
        this._storage.set(this._VERSION_META_KEY, backup.meta);
        
        throw error;
    }
};

/**
 * 批量删除多个键
 * @param {Array<string>} keys 要删除的键数组
 * @throws {Error} 当任何操作失败时抛出错误
 */
EncryptedStorageAdapter.prototype.batchRemove = function(keys) {
    var backup = this._createBackup();
    var successfulDeletes = [];

    try {
        keys.forEach(function(key) {
            this.remove(key);
            successfulDeletes.push(key);
        }, this);
    } catch (error) {
        // 发生错误时恢复已删除的数据
        successfulDeletes.forEach(function(key) {
            if (backup.data[key]) {
                this._setRawData(key, backup.data[key]);
            }
        }, this);

        // 恢复版本元数据
        this._storage.set(this._VERSION_META_KEY, backup.meta);
        
        throw error;
    }
};

/**
 * 设置写入延迟时间
 * @param {number} delay 延迟时间（毫秒）
 */
EncryptedStorageAdapter.prototype.setWriteDelay = function(delay) {
    this._writeDelay = delay;
};

/**
 * 将操作添加到队列
 * @param {Object} operation 操作对象
 */
EncryptedStorageAdapter.prototype.queueOperation = function(operation) {
    var key = operation.key;
    
    // 如果已有相同键的待处理操作，取消它
    if (this._pendingOperations[key]) {
        clearTimeout(this._pendingOperations[key]);
        delete this._pendingOperations[key];
    }

    // 创建新的延迟操作
    this._pendingOperations[key] = setTimeout(function() {
        this._executeOperation(operation);
        delete this._pendingOperations[key];
    }.bind(this), this._writeDelay);
};

/**
 * 执行单个操作
 * @private
 * @param {Object} operation 操作对象
 */
EncryptedStorageAdapter.prototype._executeOperation = function(operation) {
    switch (operation.type) {
        case 'set':
            this.set(operation.key, operation.value, operation.options);
            break;
        case 'remove':
            this.remove(operation.key);
            break;
        default:
            throw new Error('未知的操作类型：' + operation.type);
    }
};

/**
 * 执行一系列操作
 * @param {Array<Object>} operations 操作数组
 */
EncryptedStorageAdapter.prototype.executeOperations = function(operations) {
    var backup = this._createBackup();
    var executedOperations = [];

    try {
        operations.forEach(function(operation) {
            this._executeOperation(operation);
            executedOperations.push(operation);
        }, this);
    } catch (error) {
        // 发生错误时回滚所有操作
        this._restoreFromBackup(backup);
        throw error;
    }
};

module.exports = EncryptedStorageAdapter; 