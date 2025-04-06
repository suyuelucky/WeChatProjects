/**
 * B1基础照片采集功能 - 存储资源模拟器
 * 
 * 该工具用于模拟各种存储状态和错误情况，辅助进行极端存储资源测试
 * 使用方法：导入并替换原存储API进行测试
 * 
 * 版本: 1.0
 * 创建日期: 2024-04-06
 * 创建者: 资方测试团队
 */

// 模拟存储状态枚举
const StorageState = {
  NORMAL: 'normal',           // 正常状态
  LOW_SPACE: 'low_space',     // 低存储空间
  FULL: 'full',               // 存储已满
  WRITE_ERROR: 'write_error', // 写入错误
  READ_ERROR: 'read_error',   // 读取错误
  QUOTA_EXCEEDED: 'quota_exceeded', // 超出配额
  PERMISSION_DENIED: 'permission_denied', // 权限被拒绝
  UNSTABLE: 'unstable'        // 不稳定状态(随机错误)
};

// 错误类型枚举
const ErrorType = {
  STORAGE_FULL: 'storage_full',       // 存储空间已满
  PERMISSION: 'permission_denied',    // 权限错误
  IO_ERROR: 'io_error',               // IO错误
  QUOTA_EXCEEDED: 'quota_exceeded',   // 超出配额
  FILE_SIZE_LIMIT: 'file_size_limit', // 文件大小限制
  FORMAT_ERROR: 'format_error',       // 格式错误
  UNKNOWN: 'unknown'                  // 未知错误
};

/**
 * 模拟存储资源工具
 * 替代wx.saveFile等存储API进行测试
 */
class StorageMocker {
  constructor(options = {}) {
    // 默认配置
    this.config = {
      storageState: StorageState.NORMAL, // 存储状态
      totalSpace: 4096,                  // 总存储空间(MB)
      usedSpace: 2048,                   // 已使用空间(MB)
      errorProbability: 0,               // 错误概率(0-100)
      operationDelay: 200,               // 操作延迟(毫秒)
      enableLogging: true,               // 是否启用日志
      mockFileSystem: true,              // 是否模拟文件系统
      mockFileLimit: 1000                // 模拟文件数量限制
    };
    
    // 更新配置
    Object.assign(this.config, options);
    
    // 模拟文件系统
    this.mockFiles = {};
    
    // 操作计数器
    this.operationCount = 0;
    
    // 日志前缀
    this.logPrefix = '[存储模拟器]';
  }
  
  /**
   * 模拟保存文件到本地
   * @param {Object} options 选项，类似wx.saveFile的选项
   */
  saveFile(options) {
    const opId = ++this.operationCount;
    this._log(`开始保存文件 #${opId}: ${options.tempFilePath}`);
    
    // 检查参数
    if (!options.tempFilePath) {
      this._log(`保存文件 #${opId} 失败: 缺少tempFilePath参数`);
      setTimeout(() => {
        if (options.fail) {
          options.fail({
            errMsg: 'saveFile:fail parameter error: parameter.tempFilePath should be String instead of Undefined'
          });
        }
        if (options.complete) {
          options.complete({
            errMsg: 'saveFile:fail parameter error'
          });
        }
      }, 0);
      return;
    }
    
    // 根据存储状态处理请求
    switch (this.config.storageState) {
      case StorageState.FULL:
        this._log(`保存文件 #${opId} 失败: 存储空间已满`);
        setTimeout(() => {
          if (options.fail) {
            options.fail({
              errMsg: 'saveFile:fail storage full'
            });
          }
          if (options.complete) {
            options.complete({
              errMsg: 'saveFile:fail storage full'
            });
          }
        }, this.config.operationDelay);
        return;
        
      case StorageState.PERMISSION_DENIED:
        this._log(`保存文件 #${opId} 失败: 权限被拒绝`);
        setTimeout(() => {
          if (options.fail) {
            options.fail({
              errMsg: 'saveFile:fail permission denied'
            });
          }
          if (options.complete) {
            options.complete({
              errMsg: 'saveFile:fail permission denied'
            });
          }
        }, this.config.operationDelay);
        return;
        
      case StorageState.WRITE_ERROR:
        this._log(`保存文件 #${opId} 失败: 写入错误`);
        setTimeout(() => {
          if (options.fail) {
            options.fail({
              errMsg: 'saveFile:fail writeFile error'
            });
          }
          if (options.complete) {
            options.complete({
              errMsg: 'saveFile:fail writeFile error'
            });
          }
        }, this.config.operationDelay);
        return;
        
      case StorageState.QUOTA_EXCEEDED:
        this._log(`保存文件 #${opId} 失败: 超出配额限制`);
        setTimeout(() => {
          if (options.fail) {
            options.fail({
              errMsg: 'saveFile:fail quota exceeded'
            });
          }
          if (options.complete) {
            options.complete({
              errMsg: 'saveFile:fail quota exceeded'
            });
          }
        }, this.config.operationDelay);
        return;
    }
    
    // 随机错误
    if (Math.random() * 100 < this.config.errorProbability) {
      const errors = [
        { type: ErrorType.IO_ERROR, msg: 'saveFile:fail IO error' },
        { type: ErrorType.PERMISSION, msg: 'saveFile:fail permission denied' },
        { type: ErrorType.STORAGE_FULL, msg: 'saveFile:fail storage full' },
        { type: ErrorType.UNKNOWN, msg: 'saveFile:fail unknown error' }
      ];
      
      const randomError = errors[Math.floor(Math.random() * errors.length)];
      
      this._log(`保存文件 #${opId} 随机错误: ${randomError.type}`);
      
      setTimeout(() => {
        if (options.fail) {
          options.fail({
            errMsg: randomError.msg
          });
        }
        if (options.complete) {
          options.complete({
            errMsg: randomError.msg
          });
        }
      }, this.config.operationDelay);
      
      return;
    }
    
    // 低空间状态检查
    if (this.config.storageState === StorageState.LOW_SPACE) {
      // 有50%概率失败
      if (Math.random() > 0.5) {
        this._log(`保存文件 #${opId} 失败: 存储空间不足`);
        setTimeout(() => {
          if (options.fail) {
            options.fail({
              errMsg: 'saveFile:fail storage low space'
            });
          }
          if (options.complete) {
            options.complete({
              errMsg: 'saveFile:fail storage low space'
            });
          }
        }, this.config.operationDelay);
        return;
      }
    }
    
    // 不稳定状态检查
    if (this.config.storageState === StorageState.UNSTABLE) {
      // 有30%概率操作延迟更长
      if (Math.random() < 0.3) {
        this._log(`保存文件 #${opId} 延迟响应`);
        setTimeout(() => {
          this._simulateSaveFileSuccess(opId, options);
        }, this.config.operationDelay * 5);
        return;
      }
    }
    
    // 正常保存文件
    setTimeout(() => {
      this._simulateSaveFileSuccess(opId, options);
    }, this.config.operationDelay);
  },
  
  /**
   * 模拟从本地读取文件内容
   * @param {Object} options 选项，类似wx.getFileInfo的选项
   */
  getFileInfo(options) {
    const opId = ++this.operationCount;
    this._log(`开始获取文件信息 #${opId}: ${options.filePath}`);
    
    // 检查参数
    if (!options.filePath) {
      this._log(`获取文件信息 #${opId} 失败: 缺少filePath参数`);
      setTimeout(() => {
        if (options.fail) {
          options.fail({
            errMsg: 'getFileInfo:fail parameter error: parameter.filePath should be String instead of Undefined'
          });
        }
        if (options.complete) {
          options.complete({
            errMsg: 'getFileInfo:fail parameter error'
          });
        }
      }, 0);
      return;
    }
    
    // 读取错误状态
    if (this.config.storageState === StorageState.READ_ERROR) {
      this._log(`获取文件信息 #${opId} 失败: 读取错误`);
      setTimeout(() => {
        if (options.fail) {
          options.fail({
            errMsg: 'getFileInfo:fail read error'
          });
        }
        if (options.complete) {
          options.complete({
            errMsg: 'getFileInfo:fail read error'
          });
        }
      }, this.config.operationDelay);
      return;
    }
    
    // 权限被拒绝状态
    if (this.config.storageState === StorageState.PERMISSION_DENIED) {
      this._log(`获取文件信息 #${opId} 失败: 权限被拒绝`);
      setTimeout(() => {
        if (options.fail) {
          options.fail({
            errMsg: 'getFileInfo:fail permission denied'
          });
        }
        if (options.complete) {
          options.complete({
            errMsg: 'getFileInfo:fail permission denied'
          });
        }
      }, this.config.operationDelay);
      return;
    }
    
    // 随机错误
    if (Math.random() * 100 < this.config.errorProbability) {
      const errors = [
        { type: ErrorType.IO_ERROR, msg: 'getFileInfo:fail IO error' },
        { type: ErrorType.PERMISSION, msg: 'getFileInfo:fail permission denied' },
        { type: ErrorType.UNKNOWN, msg: 'getFileInfo:fail file not found' }
      ];
      
      const randomError = errors[Math.floor(Math.random() * errors.length)];
      
      this._log(`获取文件信息 #${opId} 随机错误: ${randomError.type}`);
      
      setTimeout(() => {
        if (options.fail) {
          options.fail({
            errMsg: randomError.msg
          });
        }
        if (options.complete) {
          options.complete({
            errMsg: randomError.msg
          });
        }
      }, this.config.operationDelay);
      
      return;
    }
    
    // 不稳定状态下可能延迟更长
    if (this.config.storageState === StorageState.UNSTABLE && Math.random() < 0.3) {
      this._log(`获取文件信息 #${opId} 延迟响应`);
      setTimeout(() => {
        this._simulateGetFileInfoSuccess(opId, options);
      }, this.config.operationDelay * 5);
      return;
    }
    
    // 正常获取文件信息
    setTimeout(() => {
      this._simulateGetFileInfoSuccess(opId, options);
    }, this.config.operationDelay);
  },
  
  /**
   * 模拟保存文件到相册
   * @param {Object} options 选项，类似wx.saveImageToPhotosAlbum的选项
   */
  saveImageToPhotosAlbum(options) {
    const opId = ++this.operationCount;
    this._log(`开始保存图片到相册 #${opId}: ${options.filePath}`);
    
    // 检查参数
    if (!options.filePath) {
      this._log(`保存图片到相册 #${opId} 失败: 缺少filePath参数`);
      setTimeout(() => {
        if (options.fail) {
          options.fail({
            errMsg: 'saveImageToPhotosAlbum:fail parameter error: parameter.filePath should be String instead of Undefined'
          });
        }
        if (options.complete) {
          options.complete({
            errMsg: 'saveImageToPhotosAlbum:fail parameter error'
          });
        }
      }, 0);
      return;
    }
    
    // 权限被拒绝状态
    if (this.config.storageState === StorageState.PERMISSION_DENIED) {
      this._log(`保存图片到相册 #${opId} 失败: 权限被拒绝`);
      setTimeout(() => {
        if (options.fail) {
          options.fail({
            errMsg: 'saveImageToPhotosAlbum:fail auth denied'
          });
        }
        if (options.complete) {
          options.complete({
            errMsg: 'saveImageToPhotosAlbum:fail auth denied'
          });
        }
      }, this.config.operationDelay);
      return;
    }
    
    // 存储已满状态
    if (this.config.storageState === StorageState.FULL) {
      this._log(`保存图片到相册 #${opId} 失败: 存储空间已满`);
      setTimeout(() => {
        if (options.fail) {
          options.fail({
            errMsg: 'saveImageToPhotosAlbum:fail storage full'
          });
        }
        if (options.complete) {
          options.complete({
            errMsg: 'saveImageToPhotosAlbum:fail storage full'
          });
        }
      }, this.config.operationDelay);
      return;
    }
    
    // 随机错误
    if (Math.random() * 100 < this.config.errorProbability) {
      const errors = [
        { type: ErrorType.IO_ERROR, msg: 'saveImageToPhotosAlbum:fail IO error' },
        { type: ErrorType.PERMISSION, msg: 'saveImageToPhotosAlbum:fail auth denied' },
        { type: ErrorType.FORMAT_ERROR, msg: 'saveImageToPhotosAlbum:fail invalid image' },
        { type: ErrorType.UNKNOWN, msg: 'saveImageToPhotosAlbum:fail unknown error' }
      ];
      
      const randomError = errors[Math.floor(Math.random() * errors.length)];
      
      this._log(`保存图片到相册 #${opId} 随机错误: ${randomError.type}`);
      
      setTimeout(() => {
        if (options.fail) {
          options.fail({
            errMsg: randomError.msg
          });
        }
        if (options.complete) {
          options.complete({
            errMsg: randomError.msg
          });
        }
      }, this.config.operationDelay);
      
      return;
    }
    
    // 低空间状态检查
    if (this.config.storageState === StorageState.LOW_SPACE) {
      // 有30%概率失败
      if (Math.random() < 0.3) {
        this._log(`保存图片到相册 #${opId} 失败: 存储空间不足`);
        setTimeout(() => {
          if (options.fail) {
            options.fail({
              errMsg: 'saveImageToPhotosAlbum:fail storage low space'
            });
          }
          if (options.complete) {
            options.complete({
              errMsg: 'saveImageToPhotosAlbum:fail storage low space'
            });
          }
        }, this.config.operationDelay);
        return;
      }
    }
    
    // 不稳定状态检查
    if (this.config.storageState === StorageState.UNSTABLE) {
      // 有30%概率操作延迟更长
      if (Math.random() < 0.3) {
        this._log(`保存图片到相册 #${opId} 延迟响应`);
        setTimeout(() => {
          this._simulateSaveImageSuccess(opId, options);
        }, this.config.operationDelay * 5);
        return;
      }
    }
    
    // 正常保存图片到相册
    setTimeout(() => {
      this._simulateSaveImageSuccess(opId, options);
    }, this.config.operationDelay);
  },
  
  /**
   * 模拟获取存储信息
   * @param {Object} options 选项，类似wx.getStorageInfo的选项
   */
  getStorageInfo(options = {}) {
    const opId = ++this.operationCount;
    this._log(`开始获取存储信息 #${opId}`);
    
    // 随机错误
    if (Math.random() * 100 < this.config.errorProbability) {
      this._log(`获取存储信息 #${opId} 随机错误`);
      setTimeout(() => {
        if (options.fail) {
          options.fail({
            errMsg: 'getStorageInfo:fail'
          });
        }
        if (options.complete) {
          options.complete({
            errMsg: 'getStorageInfo:fail'
          });
        }
      }, this.config.operationDelay);
      return;
    }
    
    // 计算剩余空间
    const remainingSpace = this.config.totalSpace - this.config.usedSpace;
    
    // 根据存储状态调整信息
    let storageInfo = {
      keys: [],
      currentSize: 0,
      limitSize: 0,
      errMsg: 'getStorageInfo:ok'
    };
    
    switch (this.config.storageState) {
      case StorageState.FULL:
        storageInfo.currentSize = this.config.totalSpace;
        storageInfo.limitSize = this.config.totalSpace;
        break;
      
      case StorageState.LOW_SPACE:
        storageInfo.currentSize = Math.round(this.config.totalSpace * 0.95);
        storageInfo.limitSize = this.config.totalSpace;
        break;
      
      default:
        storageInfo.currentSize = this.config.usedSpace;
        storageInfo.limitSize = this.config.totalSpace;
        break;
    }
    
    // 生成模拟的key列表
    for (let i = 0; i < 10; i++) {
      storageInfo.keys.push(`mock_key_${i}`);
    }
    
    // 延迟响应
    setTimeout(() => {
      this._log(`获取存储信息 #${opId} 成功: 已用 ${storageInfo.currentSize}MB / 总共 ${storageInfo.limitSize}MB`);
      
      if (options.success) {
        options.success(storageInfo);
      }
      if (options.complete) {
        options.complete(storageInfo);
      }
    }, this.config.operationDelay);
  },
  
  /**
   * 模拟保存文件成功
   * @param {Number} opId 操作ID
   * @param {Object} options 原始选项对象
   */
  _simulateSaveFileSuccess(opId, options) {
    // 生成模拟的保存文件路径
    const savedFilePath = `mock_saved_file_${Date.now()}.png`;
    
    // 模拟保存文件并增加使用空间
    if (this.config.mockFileSystem) {
      this.mockFiles[savedFilePath] = {
        size: this._getRandomFileSize(),
        createTime: Date.now(),
        contentType: 'image/png',
        originalPath: options.tempFilePath
      };
      
      // 更新已使用空间
      this.config.usedSpace = Math.min(
        this.config.totalSpace,
        this.config.usedSpace + this.mockFiles[savedFilePath].size / 1024
      );
    }
    
    this._log(`保存文件 #${opId} 成功: ${savedFilePath}`);
    
    if (options.success) {
      options.success({
        savedFilePath: savedFilePath,
        errMsg: 'saveFile:ok'
      });
    }
    if (options.complete) {
      options.complete({
        savedFilePath: savedFilePath,
        errMsg: 'saveFile:ok'
      });
    }
  },
  
  /**
   * 模拟获取文件信息成功
   * @param {Number} opId 操作ID
   * @param {Object} options 原始选项对象
   */
  _simulateGetFileInfoSuccess(opId, options) {
    let fileInfo = {};
    
    // 检查是否存在于模拟文件系统中
    if (this.config.mockFileSystem && this.mockFiles[options.filePath]) {
      const mockFile = this.mockFiles[options.filePath];
      fileInfo = {
        size: mockFile.size,
        createTime: mockFile.createTime,
        digest: `mock_md5_${Math.floor(Math.random() * 1000000)}`,
        errMsg: 'getFileInfo:ok'
      };
    } else {
      // 生成随机文件信息
      fileInfo = {
        size: this._getRandomFileSize(),
        createTime: Date.now() - Math.floor(Math.random() * 86400000),
        digest: `mock_md5_${Math.floor(Math.random() * 1000000)}`,
        errMsg: 'getFileInfo:ok'
      };
    }
    
    this._log(`获取文件信息 #${opId} 成功: 大小 ${fileInfo.size}B, 创建时间 ${new Date(fileInfo.createTime).toISOString()}`);
    
    if (options.success) {
      options.success(fileInfo);
    }
    if (options.complete) {
      options.complete(fileInfo);
    }
  },
  
  /**
   * 模拟保存图片成功
   * @param {Number} opId 操作ID
   * @param {Object} options 原始选项对象
   */
  _simulateSaveImageSuccess(opId, options) {
    this._log(`保存图片到相册 #${opId} 成功`);
    
    if (options.success) {
      options.success({
        errMsg: 'saveImageToPhotosAlbum:ok'
      });
    }
    if (options.complete) {
      options.complete({
        errMsg: 'saveImageToPhotosAlbum:ok'
      });
    }
  },
  
  /**
   * 获取随机文件大小
   * @returns {Number} 文件大小(字节)
   */
  _getRandomFileSize() {
    // 返回500KB-5MB的随机大小(字节)
    return Math.floor(500 * 1024 + Math.random() * 4.5 * 1024 * 1024);
  },
  
  /**
   * 输出日志
   * @param {String} message 日志消息
   */
  _log(message) {
    if (this.config.enableLogging) {
      console.log(`${this.logPrefix} ${message}`);
    }
  },
  
  /**
   * 设置存储状态
   * @param {String} state 存储状态
   */
  setStorageState(state) {
    if (Object.values(StorageState).includes(state)) {
      this.config.storageState = state;
      this._log(`存储状态已切换: ${state}`);
      return true;
    }
    return false;
  },
  
  /**
   * 设置错误概率
   * @param {Number} probability 错误概率(0-100)
   */
  setErrorProbability(probability) {
    this.config.errorProbability = Math.max(0, Math.min(100, probability));
    this._log(`错误概率已设置: ${this.config.errorProbability}%`);
  },
  
  /**
   * 设置存储空间限制
   * @param {Number} totalMB 总空间(MB)
   * @param {Number} usedMB 已用空间(MB)
   */
  setStorageSpace(totalMB, usedMB) {
    if (totalMB > 0) {
      this.config.totalSpace = totalMB;
    }
    
    if (usedMB >= 0) {
      this.config.usedSpace = Math.min(usedMB, this.config.totalSpace);
    }
    
    this._log(`存储空间已设置: 已用 ${this.config.usedSpace}MB / 总共 ${this.config.totalSpace}MB`);
    
    // 根据已用空间比例自动设置状态
    const usageRatio = this.config.usedSpace / this.config.totalSpace;
    
    if (usageRatio >= 0.99) {
      this.config.storageState = StorageState.FULL;
      this._log(`存储状态已自动切换为: ${StorageState.FULL}`);
    } else if (usageRatio >= 0.9) {
      this.config.storageState = StorageState.LOW_SPACE;
      this._log(`存储状态已自动切换为: ${StorageState.LOW_SPACE}`);
    } else if (this.config.storageState === StorageState.FULL || this.config.storageState === StorageState.LOW_SPACE) {
      this.config.storageState = StorageState.NORMAL;
      this._log(`存储状态已自动切换为: ${StorageState.NORMAL}`);
    }
  },
  
  /**
   * 获取当前存储配置
   * @returns {Object} 存储配置信息
   */
  getStorageConfig() {
    return { ...this.config };
  },
  
  /**
   * 清理模拟文件系统
   */
  clearMockFileSystem() {
    this.mockFiles = {};
    this.config.usedSpace = 0;
    this._log('模拟文件系统已清理');
  },
  
  /**
   * 获取模拟文件系统状态
   * @returns {Object} 文件系统状态
   */
  getMockFileSystemStatus() {
    const fileCount = Object.keys(this.mockFiles).length;
    let totalSize = 0;
    
    for (const file in this.mockFiles) {
      totalSize += this.mockFiles[file].size;
    }
    
    return {
      fileCount: fileCount,
      totalSize: totalSize,
      totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
      mockFiles: this.mockFiles
    };
  }
};

// 导出存储模拟器和状态枚举
module.exports = {
  StorageMocker,
  StorageState,
  ErrorType
}; 