/**
 * 存储系统配置
 * 提供存储相关的全局配置参数
 * 遵循ES5标准，确保在微信小程序环境兼容
 */

// 存储项类型
var StorageItemType = {
  CORE: 'core',      // 核心数据，最高优先级，不会被自动清理
  USER: 'user',      // 用户数据，次高优先级，只在空间严重不足时才会清理
  WORK: 'work',      // 工作数据，普通优先级
  CACHE: 'cache',    // 缓存数据，低优先级，可随时清理
  TEMP: 'temp',      // 临时数据，最低优先级，优先清理
};

// 数据过期策略
var ExpiryStrategy = {
  NEVER: 'never',           // 永不过期
  ABSOLUTE: 'absolute',     // 绝对时间过期
  RELATIVE: 'relative',     // 相对时间过期
  SLIDING: 'sliding',       // 滑动窗口过期
  SESSION: 'session'        // 会话过期
};

// 存储范围
var StorageScope = {
  LOCAL: 'local',     // 仅本地存储
  CLOUD: 'cloud',     // 仅云端存储
  GLOBAL: 'global'    // 本地+云端存储
};

// 存储系统全局配置
var StorageConfig = {
  // 基本配置
  maxStorageSize: 9 * 1024 * 1024,  // 最大存储空间(9MB)
  warningThreshold: 0.8,            // 存储空间使用警告阈值(80%)
  criticalThreshold: 0.9,           // 存储空间临界阈值(90%)
  
  // 前缀配置
  keyPrefixes: {
    core: 'core_',     // 核心数据前缀
    user: 'user_',     // 用户数据前缀
    work: 'work_',     // 工作数据前缀
    cache: 'cache_',   // 缓存数据前缀
    temp: 'temp_',     // 临时数据前缀
    system: 'system_', // 系统数据前缀
    sync: 'sync_'      // 同步数据前缀
  },
  
  // 离线同步配置
  syncConfig: {
    queueKey: 'sync_operation_queue',     // 同步队列存储键
    resultKey: 'sync_operation_results',  // 同步结果存储键
    interval: 30 * 1000,                  // 同步间隔(30秒)
    maxRetryCount: 3,                     // 最大重试次数
    retryDelay: 5 * 1000,                 // 重试延迟(5秒)
    batchSize: 10,                        // 批量同步大小
    autoSync: true                        // 自动同步
  },
  
  // 存储清理配置
  cleanupConfig: {
    autoCleanup: true,                       // 自动清理
    cleanupInterval: 24 * 60 * 60 * 1000,    // 清理间隔(24小时)
    minSpaceToReserve: 1 * 1024 * 1024,      // 最小保留空间(1MB)
    maxCacheAge: 7 * 24 * 60 * 60 * 1000,    // 缓存最大保留时间(7天)
    maxTempAge: 24 * 60 * 60 * 1000          // 临时数据最大保留时间(1天)
  },
  
  // 安全配置
  securityConfig: {
    encryptSensitiveData: true,              // 是否加密敏感数据
    encryptionKey: 'auto-generate'           // 加密密钥(auto-generate表示自动生成)
  },
  
  // 默认失效时间(毫秒)
  defaultExpiry: {
    core: null,                           // 核心数据默认不过期
    user: null,                           // 用户数据默认不过期
    work: 30 * 24 * 60 * 60 * 1000,       // 工作数据默认30天
    cache: 7 * 24 * 60 * 60 * 1000,       // 缓存数据默认7天
    temp: 24 * 60 * 60 * 1000             // 临时数据默认1天
  }
};

// 导出
module.exports = {
  StorageConfig: StorageConfig,
  StorageItemType: StorageItemType,
  ExpiryStrategy: ExpiryStrategy,
  StorageScope: StorageScope
}; 