/**
 * 存储模块索引文件
 * 用于导出存储相关模块
 */

// 导出存储管理器
const StorageManager = require('./storageManager');

// 导出清理策略
const CleanupStrategy = require('./cleanupStrategy');

// 导出存储配置
const StorageConfig = require('./storageConfig');

// 导出加密相关
const Encryption = require('./encryption');
const Crypto = require('./crypto');

// 导出适配器工厂
const StorageAdapterFactory = require('./storageAdapterFactory');
const OptimizedStorageAdapter = require('./optimizedStorageAdapter');
const EncryptedStorageAdapter = require('./encryptedStorageAdapter');
const MemoryStorageAdapter = require('./memoryStorageAdapter');
const OfflineStorageAdapter = require('./offlineStorageAdapter');

// 导出数据类型优先级
const DataTypePriority = require('./dataTypePriority');

// 导出同步管理器
const StorageSyncManager = require('./storageSyncManager');

// 导出所有模块
module.exports = {
  StorageManager,
  CleanupStrategy,
  StorageConfig,
  Encryption,
  Crypto,
  StorageAdapterFactory,
  OptimizedStorageAdapter,
  EncryptedStorageAdapter,
  MemoryStorageAdapter,
  OfflineStorageAdapter,
  DataTypePriority,
  StorageSyncManager
}; 