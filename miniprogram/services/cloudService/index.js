/**
 * 云开发服务
 * 封装云函数调用、云存储和数据库操作
 */

const CloudService = (function() {
  // 私有变量
  let _instance = null;
  let _initialized = false;
  
  // 构造函数
  function CloudServiceConstructor() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    
    // 云环境ID
    this.envId = 'xiuhuazhenMiniProGram';
    
    // 初始化状态
    this.ready = false;
  }
  
  // 原型方法
  CloudServiceConstructor.prototype = {
    /**
     * 初始化云开发
     */
    init: function(container) {
      if (this.ready) return this;
      
      try {
        // 初始化云开发
        wx.cloud.init({
          env: this.envId,
          traceUser: true
        });
        
        // 获取云函数、云存储和数据库引用
        this.db = wx.cloud.database({
          env: this.envId
        });
        
        console.log('[CloudService] 云开发服务初始化成功');
        this.ready = true;
      } catch (error) {
        console.error('[CloudService] 云开发服务初始化失败', error);
      }
      
      return this;
    },
    
    /**
     * 调用云函数
     * @param {String} name 云函数名称
     * @param {Object} data 传递给云函数的参数
     * @param {Boolean} showLoading 是否显示加载提示
     * @returns {Promise}
     */
    callFunction: function(name, data = {}, showLoading = false) {
      if (!this.ready) {
        return Promise.reject(new Error('云开发服务未初始化'));
      }
      
      if (showLoading) {
        wx.showLoading({
          title: '加载中...',
          mask: true
        });
      }
      
      return new Promise((resolve, reject) => {
        wx.cloud.callFunction({
          name,
          data,
          success: (res) => {
            if (showLoading) wx.hideLoading();
            resolve(res.result);
          },
          fail: (err) => {
            if (showLoading) wx.hideLoading();
            console.error(`[CloudService] 调用云函数 ${name} 失败:`, err);
            reject(err);
          }
        });
      });
    },
    
    /**
     * 上传文件到云存储
     * @param {String} filePath 本地文件路径
     * @param {String} cloudPath 云端文件路径
     * @param {Object} options 上传选项
     * @returns {Promise}
     */
    uploadFile: function(filePath, cloudPath, options = {}) {
      if (!this.ready) {
        return Promise.reject(new Error('云开发服务未初始化'));
      }
      
      const showLoading = options.showLoading !== false;
      
      if (showLoading) {
        wx.showLoading({
          title: options.loadingTitle || '上传中...',
          mask: true
        });
      }
      
      return new Promise((resolve, reject) => {
        wx.cloud.uploadFile({
          cloudPath,
          filePath,
          success: (res) => {
            if (showLoading) wx.hideLoading();
            resolve(res);
          },
          fail: (err) => {
            if (showLoading) wx.hideLoading();
            console.error('[CloudService] 上传文件失败:', err);
            reject(err);
          }
        });
      });
    },
    
    /**
     * 从云存储下载文件
     * @param {String} fileID 云文件ID
     * @param {Object} options 下载选项
     * @returns {Promise}
     */
    downloadFile: function(fileID, options = {}) {
      if (!this.ready) {
        return Promise.reject(new Error('云开发服务未初始化'));
      }
      
      const showLoading = options.showLoading !== false;
      
      if (showLoading) {
        wx.showLoading({
          title: options.loadingTitle || '下载中...',
          mask: true
        });
      }
      
      return new Promise((resolve, reject) => {
        wx.cloud.downloadFile({
          fileID,
          success: (res) => {
            if (showLoading) wx.hideLoading();
            resolve(res);
          },
          fail: (err) => {
            if (showLoading) wx.hideLoading();
            console.error('[CloudService] 下载文件失败:', err);
            reject(err);
          }
        });
      });
    },
    
    /**
     * 获取数据库集合引用
     * @param {String} collectionName 集合名称
     * @returns {Object} 集合引用
     */
    collection: function(collectionName) {
      if (!this.ready) {
        console.error('云开发服务未初始化');
        return null;
      }
      
      return this.db.collection(collectionName);
    },
    
    /**
     * 获取当前用户OpenID
     * @returns {Promise<String>} OpenID
     */
    getOpenId: function() {
      return this.callFunction('getOpenId').then(res => res.openid);
    }
  };
  
  // 单例模式
  return {
    init: function(container) {
      if (!_instance) {
        _instance = new CloudServiceConstructor();
        _initialized = true;
      }
      
      if (!_instance.ready) {
        _instance.init(container);
      }
      
      return _instance;
    },
    
    getInstance: function() {
      if (!_instance || !_initialized) {
        throw new Error('CloudService尚未初始化，请先调用init方法');
      }
      
      return _instance;
    }
  };
})();

module.exports = CloudService; 