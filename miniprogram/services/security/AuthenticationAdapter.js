/**
 * 身份认证适配器
 * 
 * 创建时间: 2025-04-09 13:24:18 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 服务类
 * 
 * 负责用户身份验证、授权管理和会话处理
 */

// 导入依赖
var EncryptionManager = require('./EncryptionManager');

/**
 * 身份认证适配器
 * 负责用户身份验证、授权管理和会话处理
 */
var AuthenticationAdapter = {
  // 默认配置
  config: {
    tokenRefreshInterval: 1800000, // 30分钟刷新一次令牌
    sessionStorage: 'secure', // 会话存储模式：'secure' 或 'standard'
    sessionKey: 'auth_session',
    tokenKey: 'auth_token',
    refreshTokenKey: 'auth_refresh_token',
    userInfoKey: 'auth_user_info',
    autoRefresh: true,
    apiUrl: ''
  },
  
  // 缓存数据
  cache: {
    session: null,
    token: null,
    refreshToken: null,
    userInfo: null,
    refreshTimer: null
  },
  
  // 会话状态
  sessionState: {
    isAuthenticated: false,
    lastAuthenticated: 0,
    authMethod: null
  },
  
  /**
   * 初始化认证适配器
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
      
      // 确保加密管理器已初始化
      if (!EncryptionManager.cache) {
        EncryptionManager.init();
      }
      
      // 尝试恢复会话
      this._restoreSession();
      
      // 设置令牌自动刷新
      if (this.config.autoRefresh && this.sessionState.isAuthenticated) {
        this._setupTokenRefresh();
      }
      
      return true;
    } catch (error) {
      console.error('AuthenticationAdapter初始化失败:', error);
      return false;
    }
  },
  
  /**
   * 恢复存储的会话
   * @private
   * @returns {Boolean} 是否成功恢复会话
   */
  _restoreSession: function() {
    try {
      // 尝试从安全存储获取会话数据
      var session = null;
      
      if (this.config.sessionStorage === 'secure') {
        // 使用加密管理器安全获取会话
        session = EncryptionManager.secureRetrieve(this.config.sessionKey);
      } else {
        // 使用标准存储
        try {
          var sessionData = wx.getStorageSync(this.config.sessionKey);
          if (sessionData) {
            session = JSON.parse(sessionData);
          }
        } catch (e) {
          console.error('从存储恢复会话失败:', e);
        }
      }
      
      // 如果找到有效会话
      if (session && session.expiresAt && new Date(session.expiresAt) > new Date()) {
        // 恢复会话状态
        this.cache.session = session;
        this.cache.token = session.token;
        this.cache.refreshToken = session.refreshToken;
        
        // 恢复用户信息
        if (this.config.sessionStorage === 'secure') {
          this.cache.userInfo = EncryptionManager.secureRetrieve(this.config.userInfoKey);
        } else {
          try {
            var userInfoData = wx.getStorageSync(this.config.userInfoKey);
            if (userInfoData) {
              this.cache.userInfo = JSON.parse(userInfoData);
            }
          } catch (e) {
            console.error('从存储恢复用户信息失败:', e);
          }
        }
        
        // 更新会话状态
        this.sessionState.isAuthenticated = true;
        this.sessionState.lastAuthenticated = session.authenticatedAt;
        this.sessionState.authMethod = session.authMethod;
        
        return true;
      } else {
        // 会话无效或已过期
        this._clearSession();
        return false;
      }
    } catch (error) {
      console.error('恢复会话失败:', error);
      this._clearSession();
      return false;
    }
  },
  
  /**
   * 清除会话数据
   * @private
   */
  _clearSession: function() {
    // 清除内存中的会话数据
    this.cache.session = null;
    this.cache.token = null;
    this.cache.refreshToken = null;
    this.cache.userInfo = null;
    
    // 更新会话状态
    this.sessionState.isAuthenticated = false;
    this.sessionState.lastAuthenticated = 0;
    this.sessionState.authMethod = null;
    
    // 清除令牌刷新计时器
    if (this.cache.refreshTimer) {
      clearTimeout(this.cache.refreshTimer);
      this.cache.refreshTimer = null;
    }
    
    // 从存储中删除会话数据
    if (this.config.sessionStorage === 'secure') {
      EncryptionManager.secureDelete(this.config.sessionKey);
      EncryptionManager.secureDelete(this.config.userInfoKey);
    } else {
      try {
        wx.removeStorageSync(this.config.sessionKey);
        wx.removeStorageSync(this.config.userInfoKey);
      } catch (e) {
        console.error('删除会话存储失败:', e);
      }
    }
  },
  
  /**
   * 设置令牌自动刷新
   * @private
   */
  _setupTokenRefresh: function() {
    var self = this;
    
    // 清除旧的计时器
    if (this.cache.refreshTimer) {
      clearTimeout(this.cache.refreshTimer);
    }
    
    // 设置新的计时器
    this.cache.refreshTimer = setTimeout(function() {
      self.refreshToken()
        .then(function(success) {
          if (success) {
            // 刷新成功，设置下一次刷新
            self._setupTokenRefresh();
          }
        })
        .catch(function(error) {
          console.error('自动刷新令牌失败:', error);
          // 令牌刷新失败，延迟后重试
          setTimeout(function() {
            self._setupTokenRefresh();
          }, 60000); // 1分钟后重试
        });
    }, this.config.tokenRefreshInterval);
  },
  
  /**
   * 保存会话数据
   * @private
   * @param {Object} sessionData 会话数据
   * @param {Object} userInfo 用户信息
   */
  _saveSession: function(sessionData, userInfo) {
    // 缓存会话数据
    this.cache.session = sessionData;
    this.cache.token = sessionData.token;
    this.cache.refreshToken = sessionData.refreshToken;
    this.cache.userInfo = userInfo;
    
    // 更新会话状态
    this.sessionState.isAuthenticated = true;
    this.sessionState.lastAuthenticated = sessionData.authenticatedAt || Date.now();
    this.sessionState.authMethod = sessionData.authMethod;
    
    // 存储会话数据
    if (this.config.sessionStorage === 'secure') {
      // 使用加密管理器安全存储
      EncryptionManager.secureStore(this.config.sessionKey, sessionData);
      if (userInfo) {
        EncryptionManager.secureStore(this.config.userInfoKey, userInfo);
      }
    } else {
      // 使用标准存储
      try {
        wx.setStorageSync(this.config.sessionKey, JSON.stringify(sessionData));
        if (userInfo) {
          wx.setStorageSync(this.config.userInfoKey, JSON.stringify(userInfo));
        }
      } catch (e) {
        console.error('保存会话到存储失败:', e);
      }
    }
    
    // 设置令牌自动刷新
    if (this.config.autoRefresh) {
      this._setupTokenRefresh();
    }
  },
  
  /**
   * 使用微信登录进行认证
   * @param {Object} loginParams 登录参数
   * @returns {Promise} 认证结果Promise
   */
  authenticateWithWechat: function(loginParams) {
    var self = this;
    
    return new Promise(function(resolve, reject) {
      // 1. 获取微信登录凭证
      wx.login({
        success: function(loginRes) {
          if (loginRes.code) {
            // 2. 使用code换取用户身份
            var requestData = {
              code: loginRes.code
            };
            
            // 合并其他登录参数
            if (loginParams) {
              for (var key in loginParams) {
                if (loginParams.hasOwnProperty(key)) {
                  requestData[key] = loginParams[key];
                }
              }
            }
            
            // 3. 发送认证请求到服务器
            wx.request({
              url: self.config.apiUrl + '/auth/wechat',
              method: 'POST',
              data: requestData,
              success: function(res) {
                if (res.statusCode === 200 && res.data && res.data.token) {
                  // 4. 处理认证响应
                  var sessionData = {
                    token: res.data.token,
                    refreshToken: res.data.refreshToken,
                    expiresAt: res.data.expiresAt ? new Date(res.data.expiresAt).getTime() : (Date.now() + 7200000), // 默认2小时
                    authenticatedAt: Date.now(),
                    authMethod: 'wechat'
                  };
                  
                  // 5. 保存会话信息
                  self._saveSession(sessionData, res.data.userInfo);
                  
                  resolve({
                    success: true,
                    userInfo: res.data.userInfo
                  });
                } else {
                  reject({
                    errMsg: '微信认证失败',
                    details: res.data
                  });
                }
              },
              fail: function(error) {
                reject({
                  errMsg: '微信认证请求失败',
                  details: error
                });
              }
            });
          } else {
            reject({
              errMsg: '获取微信登录凭证失败',
              details: loginRes
            });
          }
        },
        fail: function(error) {
          reject({
            errMsg: '微信登录API调用失败',
            details: error
          });
        }
      });
    });
  },
  
  /**
   * 使用用户名密码进行认证
   * @param {String} username 用户名
   * @param {String} password 密码
   * @returns {Promise} 认证结果Promise
   */
  authenticateWithCredentials: function(username, password) {
    var self = this;
    
    return new Promise(function(resolve, reject) {
      if (!username || !password) {
        reject({
          errMsg: '用户名和密码不能为空'
        });
        return;
      }
      
      // 1. 构建认证请求
      var requestData = {
        username: username,
        password: password
      };
      
      // 2. 发送认证请求到服务器
      wx.request({
        url: self.config.apiUrl + '/auth/login',
        method: 'POST',
        data: requestData,
        success: function(res) {
          if (res.statusCode === 200 && res.data && res.data.token) {
            // 3. 处理认证响应
            var sessionData = {
              token: res.data.token,
              refreshToken: res.data.refreshToken,
              expiresAt: res.data.expiresAt ? new Date(res.data.expiresAt).getTime() : (Date.now() + 7200000), // 默认2小时
              authenticatedAt: Date.now(),
              authMethod: 'credentials'
            };
            
            // 4. 保存会话信息
            self._saveSession(sessionData, res.data.userInfo);
            
            resolve({
              success: true,
              userInfo: res.data.userInfo
            });
          } else {
            reject({
              errMsg: '用户名或密码认证失败',
              details: res.data
            });
          }
        },
        fail: function(error) {
          reject({
            errMsg: '认证请求失败',
            details: error
          });
        }
      });
    });
  },
  
  /**
   * 验证当前会话状态
   * @returns {Boolean} 会话是否有效
   */
  isSessionValid: function() {
    // 检查是否已认证
    if (!this.sessionState.isAuthenticated || !this.cache.session) {
      return false;
    }
    
    // 检查会话是否过期
    var now = Date.now();
    var expiresAt = this.cache.session.expiresAt;
    
    return expiresAt > now;
  },
  
  /**
   * 刷新认证令牌
   * @returns {Promise} 刷新结果Promise
   */
  refreshToken: function() {
    var self = this;
    
    return new Promise(function(resolve, reject) {
      // 检查是否有刷新令牌
      if (!self.cache.refreshToken) {
        reject({
          errMsg: '没有可用的刷新令牌'
        });
        return;
      }
      
      // 构建刷新请求
      var requestData = {
        refreshToken: self.cache.refreshToken
      };
      
      // 发送刷新请求到服务器
      wx.request({
        url: self.config.apiUrl + '/auth/refresh',
        method: 'POST',
        data: requestData,
        success: function(res) {
          if (res.statusCode === 200 && res.data && res.data.token) {
            // 处理刷新响应
            var sessionData = {
              token: res.data.token,
              refreshToken: res.data.refreshToken || self.cache.refreshToken,
              expiresAt: res.data.expiresAt ? new Date(res.data.expiresAt).getTime() : (Date.now() + 7200000), // 默认2小时
              authenticatedAt: self.cache.session.authenticatedAt,
              authMethod: self.cache.session.authMethod
            };
            
            // 保存更新的会话信息
            self._saveSession(sessionData, self.cache.userInfo);
            
            resolve(true);
          } else {
            // 刷新失败，可能需要重新登录
            self._clearSession();
            reject({
              errMsg: '令牌刷新失败',
              details: res.data
            });
          }
        },
        fail: function(error) {
          reject({
            errMsg: '令牌刷新请求失败',
            details: error
          });
        }
      });
    });
  },
  
  /**
   * 登出当前用户
   * @returns {Promise} 登出结果Promise
   */
  logout: function() {
    var self = this;
    
    return new Promise(function(resolve, reject) {
      // 如果当前已认证，尝试向服务器发送登出请求
      if (self.sessionState.isAuthenticated && self.cache.token) {
        // 构建登出请求
        wx.request({
          url: self.config.apiUrl + '/auth/logout',
          method: 'POST',
          header: {
            'Authorization': 'Bearer ' + self.cache.token
          },
          success: function(res) {
            // 无论服务器响应如何，都清除本地会话
            self._clearSession();
            resolve(true);
          },
          fail: function(error) {
            // 请求失败时也清除本地会话
            self._clearSession();
            // 虽然有错误，但登出操作仍然成功（本地会话已清除）
            resolve(true);
          }
        });
      } else {
        // 未认证状态，直接清除本地会话
        self._clearSession();
        resolve(true);
      }
    });
  },
  
  /**
   * 获取当前用户信息
   * @returns {Object} 用户信息
   */
  getCurrentUser: function() {
    return this.cache.userInfo;
  },
  
  /**
   * 检查用户是否有特定权限
   * @param {String} permission 权限名称
   * @returns {Boolean} 是否拥有权限
   */
  hasPermission: function(permission) {
    // 确保用户已认证且有用户信息
    if (!this.sessionState.isAuthenticated || !this.cache.userInfo) {
      return false;
    }
    
    // 检查用户信息中的权限
    var userInfo = this.cache.userInfo;
    
    // 如果用户是管理员，默认拥有所有权限
    if (userInfo.isAdmin) {
      return true;
    }
    
    // 检查具体权限
    if (userInfo.permissions && Array.isArray(userInfo.permissions)) {
      for (var i = 0; i < userInfo.permissions.length; i++) {
        if (userInfo.permissions[i] === permission) {
          return true;
        }
      }
    }
    
    return false;
  },
  
  /**
   * 获取访问令牌用于API调用
   * @returns {String} 访问令牌
   */
  getAccessToken: function() {
    // 检查令牌是否有效
    if (!this.isSessionValid()) {
      return null;
    }
    
    return this.cache.token;
  }
};

module.exports = AuthenticationAdapter; 