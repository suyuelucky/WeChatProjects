/**
 * 存储同步管理器
 * 负责管理加密存储适配器之间的数据同步
 */

/**
 * @class StorageSyncManager
 * @param {Object} options 配置选项
 * @param {EncryptedStorageAdapter} options.source 源存储适配器
 * @param {EncryptedStorageAdapter} options.target 目标存储适配器
 */
function StorageSyncManager(options) {
    if (!options || !options.source || !options.target) {
        throw new Error('必须提供源和目标存储适配器');
    }

    this._source = options.source;
    this._target = options.target;
    this._conflictResolutions = {};
    this._syncLog = [];
    this._lastSyncTimestamp = 0;
}

/**
 * 检测源和目标之间的数据变更
 * @returns {Object} 变更信息
 */
StorageSyncManager.prototype.detectChanges = function() {
    var sourceKeys = this._getAllKeys(this._source);
    var targetKeys = this._getAllKeys(this._target);
    var changes = {
        added: [],
        modified: [],
        deleted: []
    };

    // 检测新增和修改的数据
    sourceKeys.forEach(function(key) {
        if (targetKeys.indexOf(key) === -1) {
            changes.added.push(key);
        } else {
            var sourceVersion = this._source.getVersion(key);
            var targetVersion = this._target.getVersion(key);
            if (sourceVersion !== targetVersion) {
                changes.modified.push(key);
            }
        }
    }, this);

    // 检测删除的数据
    targetKeys.forEach(function(key) {
        if (sourceKeys.indexOf(key) === -1) {
            changes.deleted.push(key);
        }
    });

    return changes;
};

/**
 * 检测数据冲突
 * @returns {Array} 冲突列表
 */
StorageSyncManager.prototype.detectConflicts = function() {
    var conflicts = [];
    var sourceKeys = this._getAllKeys(this._source);
    var targetKeys = this._getAllKeys(this._target);

    // 检查所有在源和目标中都存在的键
    sourceKeys.filter(function(key) {
        return targetKeys.indexOf(key) !== -1;
    }).forEach(function(key) {
        var sourceValue = this._source.get(key);
        var targetValue = this._target.get(key);
        var sourceVersion = this._source.getVersion(key);
        var targetVersion = this._target.getVersion(key);

        if (sourceVersion !== targetVersion && 
            JSON.stringify(sourceValue) !== JSON.stringify(targetValue)) {
            conflicts.push({
                key: key,
                sourceValue: sourceValue,
                targetValue: targetValue,
                sourceVersion: sourceVersion,
                targetVersion: targetVersion
            });
        }
    }, this);

    return conflicts;
};

/**
 * 解决指定键的冲突
 * @param {string} key 冲突的键
 * @param {string|Function} resolution 冲突解决方式或自定义解决函数
 */
StorageSyncManager.prototype.resolveConflict = function(key, resolution) {
    if (typeof resolution === 'function') {
        this._conflictResolutions[key] = resolution;
    } else if (resolution === 'source' || resolution === 'target') {
        this._conflictResolutions[key] = resolution;
    } else {
        throw new Error('无效的冲突解决方式');
    }
};

/**
 * 执行同步操作
 * @throws {Error} 同步失败时抛出错误
 */
StorageSyncManager.prototype.sync = function() {
    var changes = this.detectChanges();
    var conflicts = this.detectConflicts();
    var backup = this._createBackup();

    try {
        // 处理冲突
        conflicts.forEach(function(conflict) {
            if (!this._conflictResolutions[conflict.key]) {
                throw new Error('未解决的冲突：' + conflict.key);
            }

            var resolution = this._conflictResolutions[conflict.key];
            var finalValue;

            if (typeof resolution === 'function') {
                finalValue = resolution(conflict.sourceValue, conflict.targetValue);
            } else if (resolution === 'source') {
                finalValue = conflict.sourceValue;
            } else {
                finalValue = conflict.targetValue;
            }

            this._source.set(conflict.key, finalValue);
            this._target.set(conflict.key, finalValue);
        }, this);

        // 同步新增的数据
        changes.added.forEach(function(key) {
            var value = this._source.get(key);
            var versions = this._source.listVersions(key);
            
            // 同步所有版本
            versions.forEach(function(version) {
                var versionData = this._source.getByVersion(key, version.id);
                this._target.set(key, versionData, {
                    tag: version.tag
                });
            }, this);
        }, this);

        // 同步修改的数据
        changes.modified.forEach(function(key) {
            var sourceVersions = this._source.listVersions(key);
            var targetVersions = this._target.listVersions(key);
            
            // 找出目标中缺少的版本
            sourceVersions.forEach(function(version) {
                var exists = targetVersions.some(function(v) {
                    return v.id === version.id;
                });
                
                if (!exists) {
                    var versionData = this._source.getByVersion(key, version.id);
                    this._target.set(key, versionData, {
                        tag: version.tag
                    });
                }
            }, this);
        }, this);

        // 同步删除的数据
        changes.deleted.forEach(function(key) {
            this._target.remove(key);
        }, this);

        // 更新同步日志
        this._updateSyncLog(changes, conflicts);
        this._lastSyncTimestamp = Date.now();

    } catch (error) {
        // 发生错误时回滚
        this._restoreFromBackup(backup);
        throw error;
    }
};

/**
 * 获取所有存储键
 * @private
 * @param {EncryptedStorageAdapter} adapter 存储适配器
 * @returns {Array} 键列表
 */
StorageSyncManager.prototype._getAllKeys = function(adapter) {
    return Object.keys(adapter._storage._data).filter(function(key) {
        // 过滤掉内部使用的键
        return !key.startsWith('_');
    });
};

/**
 * 创建目标适配器的备份
 * @private
 * @returns {Object} 备份数据
 */
StorageSyncManager.prototype._createBackup = function() {
    return {
        data: JSON.parse(JSON.stringify(this._target._storage._data)),
        meta: JSON.parse(JSON.stringify(this._target._storage.get(this._target._VERSION_META_KEY)))
    };
};

/**
 * 从备份恢复
 * @private
 * @param {Object} backup 备份数据
 */
StorageSyncManager.prototype._restoreFromBackup = function(backup) {
    this._target._storage._data = JSON.parse(JSON.stringify(backup.data));
    this._target._storage.set(this._target._VERSION_META_KEY, backup.meta);
};

/**
 * 更新同步日志
 * @private
 * @param {Object} changes 变更信息
 * @param {Array} conflicts 冲突信息
 */
StorageSyncManager.prototype._updateSyncLog = function(changes, conflicts) {
    this._syncLog.push({
        timestamp: Date.now(),
        changes: changes,
        conflicts: conflicts.length,
        resolvedConflicts: conflicts.filter(function(conflict) {
            return !!this._conflictResolutions[conflict.key];
        }, this).length
    });

    // 保留最近100条日志
    if (this._syncLog.length > 100) {
        this._syncLog = this._syncLog.slice(-100);
    }
};

/**
 * 获取同步日志
 * @returns {Array} 同步日志
 */
StorageSyncManager.prototype.getSyncLog = function() {
    return this._syncLog.slice();
};

/**
 * 获取上次同步时间
 * @returns {number} 时间戳
 */
StorageSyncManager.prototype.getLastSyncTime = function() {
    return this._lastSyncTimestamp;
};

module.exports = StorageSyncManager; 