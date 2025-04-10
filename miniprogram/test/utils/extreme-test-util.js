/**
 * 极端测试工具类
 * 用于模拟各种极端条件，如内存不足、存储空间不足等
 * 
 * 创建时间: 2025-04-09 20:36:45
 * 创建者: Claude AI 3.7 Sonnet
 */

// 导入必要的模块
const NetworkSimulator = require('./network-simulator');

/**
 * 极端测试工具类
 * 提供各种方法模拟极端情况下的微信小程序环境
 */
class ExtremeTestUtil {
  constructor() {
    // 存储原始的API
    this._originalGetSystemInfo = wx.getSystemInfo;
    this._originalGetStorageInfo = wx.getStorageInfo;
    this._originalGetFileSystemManager = wx.getFileSystemManager;
    
    // 网络模拟器实例
    this.networkSimulator = new NetworkSimulator();
    
    // 模拟的系统信息
    this._mockSystemInfo = {
      memory: 1024, // 内存大小(MB)
      windowWidth: 375,
      windowHeight: 667,
      pixelRatio: 2,
      platform: 'ios',
      system: 'iOS 14.2',
      brand: 'iPhone',
      model: 'iPhone 11',
      benchmarkLevel: 50,
      batteryLevel: 100,
      statusBarHeight: 20,
      safeArea: {
        left: 0,
        right: 375,
        top: 20,
        bottom: 647,
        width: 375,
        height: 627
      },
      wifiEnabled: true,
      bluetoothEnabled: true,
      locationEnabled: true,
      locationAuthorized: true,
      microphoneAuthorized: true,
      notificationAuthorized: true
    };
    
    // 模拟的存储信息
    this._mockStorageInfo = {
      keys: [],
      currentSize: 0,
      limitSize: 10 * 1024 // 10MB
    };
    
    // 模拟的文件系统信息
    this._mockFileSystemInfo = {
      totalSpace: 2048 * 1024 * 1024, // 总空间(字节)
      availableSpace: 1024 * 1024 * 1024, // 可用空间(字节)
      files: new Map(), // 模拟文件系统中的文件
      directories: new Set() // 模拟文件系统中的目录
    };
    
    // 注册的事件监听器
    this._eventListeners = {
      memoryWarning: []
    };
    
    // 当前是否处于低内存状态
    this._isLowMemory = false;
    
    // 内存使用记录
    this._memoryUsageHistory = [];
  }
  
  /**
   * 初始化测试环境
   */
  init() {
    this._setupSystemInfoSimulation();
    this._setupStorageSimulation();
    this._setupFileSystemSimulation();
    
    console.log('[ExtremeTestUtil] 极端测试环境初始化完成');
    
    return this;
  }
  
  /**
   * 设置模拟的系统内存大小
   * @param {number} memory - 内存大小(MB)
   */
  setMemorySize(memory) {
    this._mockSystemInfo.memory = memory;
    console.log(`[ExtremeTestUtil] 系统内存设置为: ${memory}MB`);
    return this;
  }
  
  /**
   * 模拟内存警告事件
   * @param {number} level - 内存警告级别，默认为10，值越大警告越严重
   */
  triggerMemoryWarning(level = 10) {
    console.log(`[ExtremeTestUtil] 触发内存警告，级别: ${level}`);
    
    this._isLowMemory = true;
    
    // 触发内存警告事件
    this._eventListeners.memoryWarning.forEach(callback => {
      try {
        callback({ level });
      } catch (error) {
        console.error('[ExtremeTestUtil] 内存警告回调执行错误:', error);
      }
    });
    
    return this;
  }
  
  /**
   * 记录内存使用情况
   * @param {string} operation - 操作名称
   * @param {number} memoryUsed - 使用的内存(MB)
   */
  recordMemoryUsage(operation, memoryUsed) {
    const timestamp = Date.now();
    const record = {
      timestamp,
      operation,
      memoryUsed,
      totalMemory: this._mockSystemInfo.memory,
      isLowMemory: this._isLowMemory
    };
    
    this._memoryUsageHistory.push(record);
    
    // 如果使用的内存超过总内存的80%，触发内存警告
    if (memoryUsed > this._mockSystemInfo.memory * 0.8 && !this._isLowMemory) {
      this.triggerMemoryWarning();
    }
    
    return this;
  }
  
  /**
   * 获取内存使用记录
   * @returns {Array} 内存使用记录
   */
  getMemoryUsageHistory() {
    return [...this._memoryUsageHistory];
  }
  
  /**
   * 清除内存使用记录
   */
  clearMemoryUsageHistory() {
    this._memoryUsageHistory = [];
    return this;
  }
  
  /**
   * 设置存储空间限制
   * @param {number} limitSize - 存储空间限制(KB)
   */
  setStorageLimitSize(limitSize) {
    this._mockStorageInfo.limitSize = limitSize;
    console.log(`[ExtremeTestUtil] 存储空间限制设置为: ${limitSize}KB`);
    return this;
  }
  
  /**
   * 设置当前存储空间使用量
   * @param {number} currentSize - 存储空间使用量(KB)
   */
  setStorageCurrentSize(currentSize) {
    this._mockStorageInfo.currentSize = currentSize;
    console.log(`[ExtremeTestUtil] 当前存储空间使用量设置为: ${currentSize}KB`);
    return this;
  }
  
  /**
   * 设置文件系统可用空间
   * @param {number} availableSpace - 可用空间(MB)
   */
  setFileSystemAvailableSpace(availableSpace) {
    this._mockFileSystemInfo.availableSpace = availableSpace * 1024 * 1024;
    console.log(`[ExtremeTestUtil] 文件系统可用空间设置为: ${availableSpace}MB`);
    return this;
  }
  
  /**
   * 添加模拟文件
   * @param {string} filePath - 文件路径
   * @param {number} size - 文件大小(字节)
   * @param {string} data - 文件内容
   */
  addMockFile(filePath, size, data = '') {
    this._mockFileSystemInfo.files.set(filePath, {
      size,
      data,
      createTime: Date.now(),
      lastModifiedTime: Date.now()
    });
    
    // 创建目录结构
    const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
    if (dirPath) {
      this._createDirectoryRecursive(dirPath);
    }
    
    // 减少可用空间
    this._mockFileSystemInfo.availableSpace -= size;
    if (this._mockFileSystemInfo.availableSpace < 0) {
      this._mockFileSystemInfo.availableSpace = 0;
    }
    
    console.log(`[ExtremeTestUtil] 添加模拟文件: ${filePath}, 大小: ${size}字节`);
    
    return this;
  }
  
  /**
   * 递归创建目录
   * @param {string} dirPath - 目录路径
   */
  _createDirectoryRecursive(dirPath) {
    if (this._mockFileSystemInfo.directories.has(dirPath)) {
      return;
    }
    
    this._mockFileSystemInfo.directories.add(dirPath);
    
    // 创建父目录
    const parentDir = dirPath.substring(0, dirPath.lastIndexOf('/'));
    if (parentDir) {
      this._createDirectoryRecursive(parentDir);
    }
  }
  
  /**
   * 删除模拟文件
   * @param {string} filePath - 文件路径
   */
  removeMockFile(filePath) {
    if (this._mockFileSystemInfo.files.has(filePath)) {
      const fileInfo = this._mockFileSystemInfo.files.get(filePath);
      
      // 恢复可用空间
      this._mockFileSystemInfo.availableSpace += fileInfo.size;
      if (this._mockFileSystemInfo.availableSpace > this._mockFileSystemInfo.totalSpace) {
        this._mockFileSystemInfo.availableSpace = this._mockFileSystemInfo.totalSpace;
      }
      
      this._mockFileSystemInfo.files.delete(filePath);
      
      console.log(`[ExtremeTestUtil] 删除模拟文件: ${filePath}`);
    }
    
    return this;
  }
  
  /**
   * 获取模拟文件列表
   * @returns {Array} 文件列表
   */
  getMockFileList() {
    const fileList = [];
    
    this._mockFileSystemInfo.files.forEach((fileInfo, filePath) => {
      fileList.push({
        filePath,
        size: fileInfo.size,
        createTime: fileInfo.createTime,
        lastModifiedTime: fileInfo.lastModifiedTime
      });
    });
    
    return fileList;
  }
  
  /**
   * 清空模拟文件系统
   */
  clearMockFileSystem() {
    this._mockFileSystemInfo.files.clear();
    this._mockFileSystemInfo.directories.clear();
    this._mockFileSystemInfo.availableSpace = this._mockFileSystemInfo.totalSpace;
    
    console.log('[ExtremeTestUtil] 清空模拟文件系统');
    
    return this;
  }
  
  /**
   * 模拟系统信息
   */
  _setupSystemInfoSimulation() {
    const self = this;
    
    // 重写wx.getSystemInfo
    wx.getSystemInfo = function(options) {
      const systemInfo = { ...self._mockSystemInfo };
      
      setTimeout(() => {
        if (typeof options.success === 'function') {
          options.success(systemInfo);
        }
        
        if (typeof options.complete === 'function') {
          options.complete(systemInfo);
        }
      }, 0);
    };
    
    // 重写wx.getSystemInfoSync
    wx.getSystemInfoSync = function() {
      return { ...self._mockSystemInfo };
    };
    
    // 重写wx.onMemoryWarning
    wx.onMemoryWarning = function(callback) {
      self._eventListeners.memoryWarning.push(callback);
    };
    
    // 重写wx.offMemoryWarning
    wx.offMemoryWarning = function(callback) {
      const index = self._eventListeners.memoryWarning.indexOf(callback);
      if (index !== -1) {
        self._eventListeners.memoryWarning.splice(index, 1);
      }
    };
  }
  
  /**
   * 模拟存储信息
   */
  _setupStorageSimulation() {
    const self = this;
    
    // 重写wx.getStorageInfo
    wx.getStorageInfo = function(options) {
      const storageInfo = { ...self._mockStorageInfo };
      
      setTimeout(() => {
        if (typeof options.success === 'function') {
          options.success(storageInfo);
        }
        
        if (typeof options.complete === 'function') {
          options.complete(storageInfo);
        }
      }, 0);
    };
    
    // 重写wx.getStorageInfoSync
    wx.getStorageInfoSync = function() {
      return { ...self._mockStorageInfo };
    };
  }
  
  /**
   * 模拟文件系统
   */
  _setupFileSystemSimulation() {
    const self = this;
    const originalGetFileSystemManager = wx.getFileSystemManager;
    
    // 重写wx.getFileSystemManager
    wx.getFileSystemManager = function() {
      const fsm = originalGetFileSystemManager();
      
      // 原始方法备份
      const originalAccess = fsm.access;
      const originalAccessSync = fsm.accessSync;
      const originalReadFile = fsm.readFile;
      const originalReadFileSync = fsm.readFileSync;
      const originalWriteFile = fsm.writeFile;
      const originalWriteFileSync = fsm.writeFileSync;
      const originalUnlink = fsm.unlink;
      const originalUnlinkSync = fsm.unlinkSync;
      const originalMkdir = fsm.mkdir;
      const originalMkdirSync = fsm.mkdirSync;
      const originalRmdir = fsm.rmdir;
      const originalRmdirSync = fsm.rmdirSync;
      const originalReaddir = fsm.readdir;
      const originalReaddirSync = fsm.readdirSync;
      const originalGetFileInfo = fsm.getFileInfo;
      const originalGetFileInfoSync = fsm.getFileInfoSync;
      const originalGetSavedFileList = fsm.getSavedFileList;
      const originalGetSavedFileListSync = fsm.getSavedFileListSync;
      
      // 重写access方法
      fsm.access = function(options) {
        const filePath = options.path;
        
        // 检查是否存在于模拟文件系统中
        if (self._mockFileSystemInfo.files.has(filePath)) {
          setTimeout(() => {
            if (typeof options.success === 'function') {
              options.success({ errMsg: 'access:ok' });
            }
            
            if (typeof options.complete === 'function') {
              options.complete({ errMsg: 'access:ok' });
            }
          }, 0);
          
          return;
        }
        
        // 检查是否存在于模拟目录中
        if (self._mockFileSystemInfo.directories.has(filePath)) {
          setTimeout(() => {
            if (typeof options.success === 'function') {
              options.success({ errMsg: 'access:ok' });
            }
            
            if (typeof options.complete === 'function') {
              options.complete({ errMsg: 'access:ok' });
            }
          }, 0);
          
          return;
        }
        
        // 否则使用原始方法
        originalAccess.call(fsm, options);
      };
      
      // 重写accessSync方法
      fsm.accessSync = function(path) {
        // 检查是否存在于模拟文件系统中
        if (self._mockFileSystemInfo.files.has(path)) {
          return;
        }
        
        // 检查是否存在于模拟目录中
        if (self._mockFileSystemInfo.directories.has(path)) {
          return;
        }
        
        // 否则使用原始方法
        return originalAccessSync.call(fsm, path);
      };
      
      // 重写writeFile方法
      fsm.writeFile = function(options) {
        const filePath = options.filePath;
        const data = options.data;
        
        // 计算数据大小
        let dataSize = 0;
        if (typeof data === 'string') {
          dataSize = new TextEncoder().encode(data).length;
        } else if (data instanceof ArrayBuffer) {
          dataSize = data.byteLength;
        } else {
          dataSize = 1024; // 默认大小
        }
        
        // 检查可用空间是否足够
        if (dataSize > self._mockFileSystemInfo.availableSpace) {
          setTimeout(() => {
            if (typeof options.fail === 'function') {
              options.fail({
                errMsg: 'writeFile:fail disk space not enough'
              });
            }
            
            if (typeof options.complete === 'function') {
              options.complete({
                errMsg: 'writeFile:fail disk space not enough'
              });
            }
          }, 0);
          
          return;
        }
        
        // 创建目录结构
        const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
        if (dirPath) {
          self._createDirectoryRecursive(dirPath);
        }
        
        // 添加到模拟文件系统
        self.addMockFile(filePath, dataSize, data);
        
        setTimeout(() => {
          if (typeof options.success === 'function') {
            options.success({ errMsg: 'writeFile:ok' });
          }
          
          if (typeof options.complete === 'function') {
            options.complete({ errMsg: 'writeFile:ok' });
          }
        }, 0);
      };
      
      // 重写unlink方法
      fsm.unlink = function(options) {
        const filePath = options.filePath;
        
        // 检查是否存在于模拟文件系统中
        if (self._mockFileSystemInfo.files.has(filePath)) {
          self.removeMockFile(filePath);
          
          setTimeout(() => {
            if (typeof options.success === 'function') {
              options.success({ errMsg: 'unlink:ok' });
            }
            
            if (typeof options.complete === 'function') {
              options.complete({ errMsg: 'unlink:ok' });
            }
          }, 0);
          
          return;
        }
        
        // 否则使用原始方法
        originalUnlink.call(fsm, options);
      };
      
      // 重写getFileInfo方法
      fsm.getFileInfo = function(options) {
        const filePath = options.filePath;
        
        // 检查是否存在于模拟文件系统中
        if (self._mockFileSystemInfo.files.has(filePath)) {
          const fileInfo = self._mockFileSystemInfo.files.get(filePath);
          
          setTimeout(() => {
            if (typeof options.success === 'function') {
              options.success({
                size: fileInfo.size,
                createTime: fileInfo.createTime,
                lastModifiedTime: fileInfo.lastModifiedTime,
                errMsg: 'getFileInfo:ok'
              });
            }
            
            if (typeof options.complete === 'function') {
              options.complete({
                size: fileInfo.size,
                createTime: fileInfo.createTime,
                lastModifiedTime: fileInfo.lastModifiedTime,
                errMsg: 'getFileInfo:ok'
              });
            }
          }, 0);
          
          return;
        }
        
        // 否则使用原始方法
        originalGetFileInfo.call(fsm, options);
      };
      
      // 重写getSavedFileList方法
      fsm.getSavedFileList = function(options) {
        const fileList = self.getMockFileList();
        
        setTimeout(() => {
          if (typeof options.success === 'function') {
            options.success({
              fileList,
              errMsg: 'getSavedFileList:ok'
            });
          }
          
          if (typeof options.complete === 'function') {
            options.complete({
              fileList,
              errMsg: 'getSavedFileList:ok'
            });
          }
        }, 0);
      };
      
      // 其他方法也可以类似重写
      
      return fsm;
    };
  }
  
  /**
   * 还原所有重写的API，恢复原始行为
   */
  restore() {
    // 恢复原始API
    wx.getSystemInfo = this._originalGetSystemInfo;
    wx.getStorageInfo = this._originalGetStorageInfo;
    wx.getFileSystemManager = this._originalGetFileSystemManager;
    
    // 还原网络模拟器
    this.networkSimulator.restore();
    
    // 清空事件监听器
    this._eventListeners.memoryWarning = [];
    
    console.log('[ExtremeTestUtil] 已还原所有API到原始状态');
    
    return this;
  }
}

module.exports = ExtremeTestUtil; 