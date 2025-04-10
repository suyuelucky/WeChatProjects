/**
 * 云服务模块
 * 提供云函数调用、数据库操作和文件存储的统一接口
 */

// 云服务对象
var CloudService = {
  /**
   * 初始化云服务
   * @param {Object} container 服务容器
   * @return {Object} 当前实例
   */
  init: function(container) {
    if (!container) {
      console.error('初始化CloudService时container未提供');
      container = {};
    }
    
    this.container = container;
    this.isInitialized = false;
    
    // 初始化云环境
    this.initCloud();
    
    this.isInitialized = true;
    console.log('云服务初始化完成');
    return this;
  },
  
  /**
   * 检查云环境是否可用
   * @return {Boolean} 是否可用
   */
  checkCloud: function() {
    if (!wx.cloud) {
      console.error('请使用2.2.3以上的基础库以使用云能力');
      return false;
    }
    return true;
  },
  
  /**
   * 初始化云环境
   * @return {Boolean} 是否成功
   */
  initCloud: function() {
    if (!this.checkCloud()) return false;
    
    try {
      // 云环境已在app.js中初始化，这里只检查状态
      const env = 'xiuhuazhenMiniProGram'; // 云环境ID
      
      // 验证云环境是否已经初始化
      if (!wx.cloud || !wx.cloud.DYNAMIC_CURRENT_ENV) {
        console.warn('云环境可能未完全初始化，尝试重新初始化');
        wx.cloud.init({
          env,
          traceUser: true,
        });
      }
      
      // 设置超时和重试参数
      this.callOptions = {
        timeout: 30000, // 30秒超时
        maxRetries: 3,  // 最多重试3次
        retryDelay: 1000 // 重试间隔1秒
      };
      
      console.log('云服务准备就绪');
      return true;
    } catch (err) {
      console.error('云服务准备失败', err);
      return false;
    }
  },

  /**
   * 调用云函数
   * @param {string} name 云函数名称
   * @param {object} data 请求参数
   * @param {object} options 调用选项
   * @returns {Promise} 云函数调用结果
   */
  callFunction: function(name, data = {}, options = {}) {
    if (!this.checkCloud()) return Promise.reject(new Error('云环境不可用'));
    
    // 合并默认选项
    const callOpts = Object.assign({}, this.callOptions || {
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000
    }, options);
    
    // 创建调用函数
    const self = this;
    const doCall = function(retryCount) {
      // 记录调用开始时间
      const startTime = Date.now();
      
      return new Promise((resolve, reject) => {
        console.log(`调用云函数 ${name}${retryCount > 0 ? ' (重试 #' + retryCount + ')' : ''}`);
        
        // 设置超时
        let timeoutId = setTimeout(() => {
          timeoutId = null;
          const error = new Error(`云函数 ${name} 调用超时`);
          error.code = 'FUNCTION_TIMEOUT';
          error.retryCount = retryCount;
          reject(error);
        }, callOpts.timeout);
        
        // 执行实际调用
        wx.cloud.callFunction({
          name,
          data,
          success: res => {
            if (timeoutId) {
              clearTimeout(timeoutId);
              // 记录调用耗时
              const duration = Date.now() - startTime;
              console.log(`云函数 ${name} 调用成功，耗时 ${duration}ms`);
              resolve(res);
            }
          },
          fail: err => {
            if (timeoutId) {
              clearTimeout(timeoutId);
              // 记录错误信息
              console.error(`云函数 ${name} 调用失败:`, err);
              
              // 将错误转换为标准格式
              const error = err instanceof Error ? err : new Error(err.errMsg || JSON.stringify(err));
              error.original = err;
              error.code = err.errCode || 'FUNCTION_ERROR';
              error.retryCount = retryCount;
              
              reject(error);
            }
          }
        });
      });
    };
    
    // 创建重试函数
    const callWithRetry = function(retryCount = 0) {
      return doCall(retryCount).catch(err => {
        // 判断是否可以重试（不超过最大重试次数，且非永久性错误）
        if (retryCount < callOpts.maxRetries &&
            err.code !== 'FUNCTION_NOT_FOUND' && 
            err.code !== 'PERMISSION_DENIED') {
          
          // 延迟后重试
          return new Promise(resolve => {
            setTimeout(() => {
              resolve(callWithRetry(retryCount + 1));
            }, callOpts.retryDelay * (retryCount + 1)); // 指数级增加延迟
          });
        }
        
        // 不能重试或重试次数已达上限，抛出最终错误
        throw err;
      });
    };
    
    // 开始调用并处理结果
    return callWithRetry().catch(err => {
      // 记录最终错误
      console.error(`云函数 ${name} 最终调用失败:`, err);
      
      // 尝试获取错误服务来记录错误
      try {
        if (this.container && this.container.get && this.container.get('error')) {
          const errorService = this.container.get('error');
          errorService.reportError('cloud', `云函数 ${name} 调用失败`, {
            name,
            error: err,
            retries: err.retryCount || 0
          });
        }
      } catch (e) {
        console.error('记录云函数错误失败:', e);
      }
      
      throw err;
    });
  },

  /**
   * 获取数据库集合引用
   * @param {string} collection 集合名称
   * @returns {object} 集合引用
   */
  getCollection: function(collection) {
    if (!this.checkCloud()) return null;
    
    try {
      return wx.cloud.database().collection(collection);
    } catch (err) {
      console.error(`获取集合 ${collection} 引用失败:`, err);
      return null;
    }
  },

  /**
   * 添加数据到集合
   * @param {string} collection 集合名称
   * @param {object} data 要添加的数据
   * @returns {Promise} 添加结果
   */
  addDocument: function(collection, data) {
    const coll = this.getCollection(collection);
    if (!coll) return Promise.reject(new Error('获取集合引用失败'));
    
    return coll.add({ data }).catch(err => {
      console.error(`添加数据到 ${collection} 失败:`, err);
      throw err;
    });
  },

  /**
   * 获取集合中的文档
   * @param {string} collection 集合名称
   * @param {object} query 查询条件
   * @param {number} limit 限制返回数量
   * @param {number} skip 跳过文档数量
   * @returns {Promise} 查询结果
   */
  getDocuments: function(collection, query = {}, limit = 10, skip = 0) {
    const coll = this.getCollection(collection);
    if (!coll) return Promise.reject(new Error('获取集合引用失败'));
    
    try {
      let queryObj = coll.where(query);
      
      if (skip > 0) {
        queryObj = queryObj.skip(skip);
      }
      
      return queryObj.limit(limit).get().catch(err => {
        console.error(`查询 ${collection} 失败:`, err);
        throw err;
      });
    } catch (err) {
      console.error(`构建查询失败:`, err);
      return Promise.reject(err);
    }
  },

  /**
   * 更新文档
   * @param {string} collection 集合名称
   * @param {string} docId 文档ID
   * @param {object} data 要更新的数据
   * @returns {Promise} 更新结果
   */
  updateDocument: function(collection, docId, data) {
    const coll = this.getCollection(collection);
    if (!coll) return Promise.reject(new Error('获取集合引用失败'));
    
    return coll.doc(docId).update({ data }).catch(err => {
      console.error(`更新文档 ${docId} 失败:`, err);
      throw err;
    });
  },

  /**
   * 删除文档
   * @param {string} collection 集合名称
   * @param {string} docId 文档ID
   * @returns {Promise} 删除结果
   */
  removeDocument: function(collection, docId) {
    const coll = this.getCollection(collection);
    if (!coll) return Promise.reject(new Error('获取集合引用失败'));
    
    return coll.doc(docId).remove().catch(err => {
      console.error(`删除文档 ${docId} 失败:`, err);
      throw err;
    });
  },

  /**
   * 上传文件到云存储
   * @param {string} cloudPath 云端存储路径
   * @param {string} filePath 本地文件路径
   * @param {object} options 额外选项
   * @returns {Promise} 上传结果
   */
  uploadFile: function(cloudPath, filePath, options = {}) {
    if (!this.checkCloud()) return Promise.reject(new Error('云环境不可用'));
    
    return wx.cloud.uploadFile({
      cloudPath,
      filePath,
      ...options
    }).catch(err => {
      console.error(`上传文件到 ${cloudPath} 失败:`, err);
      throw err;
    });
  },

  /**
   * 从云存储下载文件
   * @param {string} fileID 文件ID
   * @returns {Promise} 下载结果
   */
  downloadFile: function(fileID) {
    if (!this.checkCloud()) return Promise.reject(new Error('云环境不可用'));
    
    return wx.cloud.downloadFile({
      fileID
    }).catch(err => {
      console.error(`下载文件 ${fileID} 失败:`, err);
      throw err;
    });
  },

  /**
   * 获取文件临时下载链接
   * @param {string|array} fileList 文件ID或文件ID数组
   * @returns {Promise} 获取结果
   */
  getTempFileURL: function(fileList) {
    if (!this.checkCloud()) return Promise.reject(new Error('云环境不可用'));
    
    const files = Array.isArray(fileList) ? fileList : [fileList];
    
    return wx.cloud.getTempFileURL({
      fileList: files
    }).catch(err => {
      console.error(`获取文件链接失败:`, err);
      throw err;
    });
  },

  /**
   * 删除云存储文件
   * @param {string|array} fileList 文件ID或文件ID数组
   * @returns {Promise} 删除结果
   */
  deleteFile: function(fileList) {
    if (!this.checkCloud()) return Promise.reject(new Error('云环境不可用'));
    
    const files = Array.isArray(fileList) ? fileList : [fileList];
    
    return wx.cloud.deleteFile({
      fileList: files
    }).catch(err => {
      console.error(`删除文件失败:`, err);
      throw err;
    });
  }
};

module.exports = CloudService; 