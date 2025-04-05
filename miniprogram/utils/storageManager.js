/**
 * 存储空间管理工具
 * 提供本地存储空间监控和自动清理策略
 */

import { storage } from './storageUtils';

// 默认配置
const DEFAULT_CONFIG = {
  maxStorageSize: 50 * 1024 * 1024, // 默认最大存储空间50MB
  warningThreshold: 0.8, // 存储空间使用警告阈值（80%）
  criticalThreshold: 0.9, // 存储空间临界阈值（90%）
  autoClearEnabled: true, // 是否启用自动清理
  autoClearThreshold: 0.85, // 自动清理阈值（85%）
  cleanUpInterval: 24 * 60 * 60 * 1000, // 清理检查间隔（24小时）
  priorityCleanupKeys: [ // 优先清理的存储项（按优先级排序）
    'temp_',  // 临时文件
    'cache_', // 缓存文件
    'log_',   // 日志
    'draft_'  // 草稿
  ],
  preserveKeys: [  // 必须保留的存储项
    'user_info', 
    'auth_token', 
    'app_settings', 
    'client_id'
  ]
};

// 存储项类型
export const StorageItemType = {
  CACHE: 'cache',    // 缓存数据，可随时清理
  TEMP: 'temp',      // 临时数据，优先清理
  USER_DATA: 'user', // 用户数据，非必要不清理
  SYNC: 'sync',      // 同步相关数据，非必要不清理
  SYSTEM: 'system',  // 系统数据，不应清理
  OTHER: 'other'     // 其他数据
};

// 存储空间状态
export const StorageStatus = {
  NORMAL: 'normal',
  WARNING: 'warning',
  CRITICAL: 'critical'
};

/**
 * 存储空间管理器
 */
export default class StorageManager {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.listeners = [];
    this.cleanupTimer = null;
    this.storageInfo = null;
    
    // 初始化
    this.init();
  }
  
  /**
   * 初始化存储管理器
   */
  async init() {
    // 获取初始存储信息
    await this.refreshStorageInfo();
    
    // 启动定时清理检查
    if (this.config.autoClearEnabled) {
      this.startCleanupTimer();
    }
  }
  
  /**
   * 启动清理定时器
   */
  startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.checkAndCleanup();
    }, this.config.cleanUpInterval);
  }
  
  /**
   * 停止清理定时器
   */
  stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
  
  /**
   * 刷新存储信息
   * @returns {Promise<Object>} 存储信息
   */
  async refreshStorageInfo() {
    try {
      this.storageInfo = await this.getStorageInfo();
      
      // 计算使用率和状态
      const usageRatio = this.storageInfo.currentSize / this.storageInfo.limitSize;
      let status = StorageStatus.NORMAL;
      
      if (usageRatio >= this.config.criticalThreshold) {
        status = StorageStatus.CRITICAL;
      } else if (usageRatio >= this.config.warningThreshold) {
        status = StorageStatus.WARNING;
      }
      
      this.storageInfo.usageRatio = usageRatio;
      this.storageInfo.status = status;
      
      // 通知监听器
      this.notifyListeners('storageInfoUpdated', this.storageInfo);
      
      return this.storageInfo;
    } catch (error) {
      console.error('刷新存储信息失败:', error);
      return null;
    }
  }
  
  /**
   * 获取存储信息
   * @returns {Promise<Object>} 存储信息
   */
  getStorageInfo() {
    return new Promise((resolve, reject) => {
      wx.getStorageInfo({
        success: (res) => {
          resolve({
            keys: res.keys,
            currentSize: res.currentSize,
            limitSize: res.limitSize,
            keysCount: res.keys.length,
            timestamp: Date.now()
          });
        },
        fail: (err) => reject(err)
      });
    });
  }
  
  /**
   * 获取指定键的存储数据大小
   * @param {string} key 存储键
   * @returns {Promise<number>} 数据大小（字节）
   */
  async getItemSize(key) {
    try {
      const item = await storage.get(key);
      if (!item) return 0;
      
      // 计算近似大小
      const itemString = JSON.stringify(item);
      return itemString.length * 2;  // 粗略估计（UTF-16编码）
    } catch (error) {
      console.error(`获取存储项 ${key} 大小失败:`, error);
      return 0;
    }
  }
  
  /**
   * 检查并执行自动清理
   * @returns {Promise<boolean>} 是否执行了清理
   */
  async checkAndCleanup() {
    try {
      // 刷新存储信息
      await this.refreshStorageInfo();
      
      // 检查是否需要清理
      if (!this.config.autoClearEnabled) {
        return false;
      }
      
      if (this.storageInfo.usageRatio < this.config.autoClearThreshold) {
        return false; // 存储空间充足，无需清理
      }
      
      // 执行自动清理
      const cleanedSize = await this.cleanupStorage();
      
      // 通知清理结果
      this.notifyListeners('storageAutoCleanup', {
        cleanedSize,
        timestamp: Date.now()
      });
      
      // 刷新存储信息
      await this.refreshStorageInfo();
      
      return cleanedSize > 0;
    } catch (error) {
      console.error('检查并清理存储失败:', error);
      return false;
    }
  }
  
  /**
   * 清理存储空间
   * @param {boolean} forceClean 是否强制清理
   * @returns {Promise<number>} 清理的空间大小（字节）
   */
  async cleanupStorage(forceClean = false) {
    try {
      // 获取所有存储键
      const storageInfo = await this.getStorageInfo();
      const keys = storageInfo.keys;
      
      // 获取所有键的相关信息
      const keyInfos = await Promise.all(
        keys.map(async (key) => {
          const size = await this.getItemSize(key);
          const type = this.getItemType(key);
          const priority = this.getCleanupPriority(key, type);
          
          return { key, size, type, priority };
        })
      );
      
      // 按清理优先级排序
      keyInfos.sort((a, b) => b.priority - a.priority);
      
      // 计算需要清理的空间
      const totalSize = storageInfo.currentSize;
      const targetSize = this.config.autoClearThreshold * storageInfo.limitSize;
      let spaceToFree = totalSize - targetSize;
      
      // 如果强制清理，至少释放10%空间
      if (forceClean && spaceToFree <= 0) {
        spaceToFree = 0.1 * totalSize;
      }
      
      if (spaceToFree <= 0 && !forceClean) {
        return 0; // 无需清理
      }
      
      // 开始清理
      let freedSpace = 0;
      const cleanedItems = [];
      
      for (const item of keyInfos) {
        // 跳过保留项
        if (this.isPreservedKey(item.key)) {
          continue;
        }
        
        try {
          await storage.remove(item.key);
          freedSpace += item.size;
          cleanedItems.push(item);
          
          // 如果已经释放足够空间，停止清理
          if (freedSpace >= spaceToFree && !forceClean) {
            break;
          }
        } catch (error) {
          console.error(`清理存储项 ${item.key} 失败:`, error);
        }
      }
      
      // 记录清理日志
      await this.logCleanupAction(cleanedItems, freedSpace);
      
      return freedSpace;
    } catch (error) {
      console.error('清理存储空间失败:', error);
      return 0;
    }
  }
  
  /**
   * 确定存储项的类型
   * @param {string} key 存储键
   * @returns {StorageItemType} 存储项类型
   */
  getItemType(key) {
    if (key.startsWith('temp_') || key.startsWith('tmp_')) {
      return StorageItemType.TEMP;
    }
    
    if (key.startsWith('cache_') || key.includes('_cache')) {
      return StorageItemType.CACHE;
    }
    
    if (key.startsWith('user_') || key.startsWith('profile_')) {
      return StorageItemType.USER_DATA;
    }
    
    if (key.startsWith('sync_') || key.includes('_sync') || key.includes('_queue')) {
      return StorageItemType.SYNC;
    }
    
    if (key.startsWith('sys_') || this.config.preserveKeys.includes(key)) {
      return StorageItemType.SYSTEM;
    }
    
    return StorageItemType.OTHER;
  }
  
  /**
   * 获取清理优先级
   * @param {string} key 存储键
   * @param {StorageItemType} type 存储项类型
   * @returns {number} 优先级评分（越高优先级越高）
   */
  getCleanupPriority(key, type) {
    // 基础优先级
    let priority = 0;
    
    // 根据类型设置基础优先级
    switch (type) {
      case StorageItemType.TEMP:
        priority = 100;
        break;
      case StorageItemType.CACHE:
        priority = 80;
        break;
      case StorageItemType.OTHER:
        priority = 50;
        break;
      case StorageItemType.USER_DATA:
        priority = 20;
        break;
      case StorageItemType.SYNC:
        priority = 10;
        break;
      case StorageItemType.SYSTEM:
        priority = 0;
        break;
      default:
        priority = 30;
    }
    
    // 检查优先清理列表
    for (let i = 0; i < this.config.priorityCleanupKeys.length; i++) {
      const prefix = this.config.priorityCleanupKeys[i];
      if (key.startsWith(prefix)) {
        // 加上位置权重
        priority += 100 - i * 10;
        break;
      }
    }
    
    // 检查时间戳（如果键包含时间戳，优先清理旧数据）
    const timestamp = this.extractTimestamp(key);
    if (timestamp && timestamp > 0) {
      const ageInDays = (Date.now() - timestamp) / (24 * 60 * 60 * 1000);
      // 根据年龄增加优先级，越老优先级越高
      priority += Math.min(ageInDays * 2, 50);
    }
    
    return priority;
  }
  
  /**
   * 从键名提取时间戳
   * @param {string} key 存储键
   * @returns {number|null} 时间戳
   */
  extractTimestamp(key) {
    // 尝试从键名中提取时间戳
    const matches = key.match(/_(\d{13})$/);
    if (matches && matches[1]) {
      return parseInt(matches[1], 10);
    }
    return null;
  }
  
  /**
   * 检查是否是保留键
   * @param {string} key 存储键
   * @returns {boolean} 是否保留
   */
  isPreservedKey(key) {
    return this.config.preserveKeys.some(
      preserveKey => key === preserveKey || key.startsWith(`${preserveKey}_`)
    );
  }
  
  /**
   * 记录清理日志
   * @param {Array} cleanedItems 被清理的项目
   * @param {number} freedSpace 释放的空间
   */
  async logCleanupAction(cleanedItems, freedSpace) {
    try {
      const timestamp = Date.now();
      const logKey = `log_storage_cleanup_${timestamp}`;
      
      const log = {
        timestamp,
        freedSpace,
        itemsCount: cleanedItems.length,
        items: cleanedItems.map(item => ({
          key: item.key,
          size: item.size,
          type: item.type
        }))
      };
      
      await storage.set(logKey, log);
      
      // 清理旧日志（只保留最近10条）
      const storageInfo = await this.getStorageInfo();
      const logKeys = storageInfo.keys.filter(key => key.startsWith('log_storage_cleanup_'))
        .sort().reverse().slice(10);
      
      for (const oldLogKey of logKeys) {
        await storage.remove(oldLogKey);
      }
    } catch (error) {
      console.error('记录清理日志失败:', error);
    }
  }
  
  /**
   * 获取清理日志
   * @param {number} limit 日志数量限制
   * @returns {Promise<Array>} 清理日志列表
   */
  async getCleanupLogs(limit = 10) {
    try {
      const storageInfo = await this.getStorageInfo();
      const logKeys = storageInfo.keys.filter(key => key.startsWith('log_storage_cleanup_'))
        .sort().reverse().slice(0, limit);
      
      const logs = [];
      for (const logKey of logKeys) {
        const log = await storage.get(logKey);
        if (log) {
          logs.push(log);
        }
      }
      
      return logs;
    } catch (error) {
      console.error('获取清理日志失败:', error);
      return [];
    }
  }
  
  /**
   * 添加存储状态监听器
   * @param {Function} listener 监听器函数
   * @returns {Function} 取消监听的函数
   */
  addListener(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }
    
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  /**
   * 通知所有监听器
   * @param {string} event 事件名称
   * @param {any} data 事件数据
   */
  notifyListeners(event, data) {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (error) {
        console.error('存储监听器错误:', error);
      }
    }
  }
  
  /**
   * 获取存储状态摘要
   * @returns {Promise<Object>} 存储状态摘要
   */
  async getStorageSummary() {
    try {
      // 刷新存储信息
      const info = await this.refreshStorageInfo();
      
      // 按类型统计存储项
      const storageInfo = await this.getStorageInfo();
      const keys = storageInfo.keys;
      
      const typeCounts = {};
      let analyzedSize = 0;
      
      // 获取按类型分组的信息
      for (const key of keys) {
        const size = await this.getItemSize(key);
        const type = this.getItemType(key);
        
        if (!typeCounts[type]) {
          typeCounts[type] = {
            count: 0,
            totalSize: 0,
            keys: []
          };
        }
        
        typeCounts[type].count++;
        typeCounts[type].totalSize += size;
        if (typeCounts[type].keys.length < 10) { // 只存储前10个键作为示例
          typeCounts[type].keys.push(key);
        }
        
        analyzedSize += size;
      }
      
      // 计算百分比
      const percentAnalyzed = info.currentSize > 0 
        ? (analyzedSize / info.currentSize * 100).toFixed(2) 
        : 0;
      
      return {
        ...info,
        percentUsed: (info.usageRatio * 100).toFixed(2),
        typeBreakdown: typeCounts,
        percentAnalyzed
      };
    } catch (error) {
      console.error('获取存储摘要失败:', error);
      return null;
    }
  }
  
  /**
   * 销毁管理器
   */
  destroy() {
    this.stopCleanupTimer();
    this.listeners = [];
  }
} 