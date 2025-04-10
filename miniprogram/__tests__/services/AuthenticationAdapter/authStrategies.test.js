/**
 * AuthenticationAdapter认证策略功能测试
 * 
 * 创建时间: 2025-04-09 14:48:26 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 测试文件
 */

// 引入测试框架
var assert = require('../../mocks/assert.mock');
var wxMock = require('../../mocks/wx.mock');
var AuthenticationAdapter = require('../../../services/security/AuthenticationAdapter');
var EncryptionManager = require('../../../services/security/EncryptionManager');

// 测试套件
describe('AuthenticationAdapter - 认证策略功能测试', function() {
  
  // 初始化测试环境
  beforeEach(function() {
    // 重置wx Mock
    wxMock.resetMock();
    
    // 初始化加密管理器
    EncryptionManager.init({
      storage: wxMock.storage
    });
    
    // 初始化认证适配器
    AuthenticationAdapter.init({
      apiUrl: 'https://api.example.com',
      sessionStorage: 'standard',
      storage: wxMock.storage
    });
    
    // 清除会话状态
    AuthenticationAdapter._clearSession();
  });
  
  /**
   * 测试多种认证策略统一管理
   * @category 功能测试
   * @priority P0
   */
  test('test_multiple_auth_strategies', function() {
    // 1. 模拟微信登录认证
    wxMock.mockApiResponse('login', {
      code: 'wx_code_12345'
    });
    
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/auth/wechat',
      response: {
        statusCode: 200,
        data: {
          token: 'wx_auth_token',
          refreshToken: 'wx_auth_refresh_token',
          expiresAt: Date.now() + 3600000,
          userInfo: {
            id: 'user_wx_12345',
            nickname: '微信用户',
            avatarUrl: 'https://example.com/wx_avatar.jpg'
          }
        }
      }
    });
    
    // 2. 执行微信登录
    return AuthenticationAdapter.authenticateWithWechat()
      .then(function(result) {
        // 3. 验证微信登录成功
        assert.isTrue(result.success);
        assert.equals(AuthenticationAdapter.sessionState.authMethod, 'wechat');
        
        // 4. 登出
        return AuthenticationAdapter.logout();
      })
      .then(function() {
        // 5. 模拟用户名密码登录
        wxMock.mockHttpResponse({
          url: 'https://api.example.com/auth/login',
          response: {
            statusCode: 200,
            data: {
              token: 'pwd_auth_token',
              refreshToken: 'pwd_auth_refresh_token',
              expiresAt: Date.now() + 3600000,
              userInfo: {
                id: 'user_pwd_12345',
                username: '密码用户',
                email: 'pwd@example.com'
              }
            }
          }
        });
        
        // 6. 执行用户名密码登录
        return AuthenticationAdapter.authenticateWithCredentials('testuser', 'password123');
      })
      .then(function(result) {
        // 7. 验证密码登录成功
        assert.isTrue(result.success);
        assert.equals(AuthenticationAdapter.sessionState.authMethod, 'credentials');
      });
  });
  
  /**
   * 测试自定义认证策略
   * @category 功能测试
   * @priority P1
   */
  test('test_custom_auth_strategy', function() {
    // 1. 添加自定义认证策略
    AuthenticationAdapter.registerAuthStrategy('custom', function(params) {
      // 验证参数
      if (!params || !params.customToken) {
        return Promise.reject(new Error('无效的自定义认证参数'));
      }
      
      // 执行自定义认证逻辑
      return new Promise(function(resolve) {
        // 模拟API请求
        wxMock.request({
          url: 'https://api.example.com/auth/custom',
          method: 'POST',
          data: {
            customToken: params.customToken
          },
          success: function(res) {
            if (res.statusCode === 200 && res.data.token) {
              // 成功响应
              resolve({
                token: res.data.token,
                refreshToken: res.data.refreshToken,
                expiresAt: res.data.expiresAt,
                userInfo: res.data.userInfo
              });
            } else {
              // 失败响应
              resolve(null);
            }
          },
          fail: function() {
            resolve(null);
          }
        });
      });
    });
    
    // 2. 模拟自定义认证请求的响应
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/auth/custom',
      response: {
        statusCode: 200,
        data: {
          token: 'custom_auth_token',
          refreshToken: 'custom_auth_refresh_token',
          expiresAt: Date.now() + 3600000,
          userInfo: {
            id: 'user_custom_12345',
            username: '自定义用户',
            customData: '自定义数据'
          }
        }
      }
    });
    
    // 3. 使用自定义认证策略
    return AuthenticationAdapter.authenticate('custom', { customToken: 'custom_token_12345' })
      .then(function(result) {
        // 4. 验证自定义认证成功
        assert.isTrue(result.success);
        assert.equals(AuthenticationAdapter.sessionState.authMethod, 'custom');
        assert.equals(AuthenticationAdapter.cache.token, 'custom_auth_token');
        assert.equals(AuthenticationAdapter.cache.userInfo.customData, '自定义数据');
      });
  });
  
  /**
   * 测试认证策略失败处理
   * @category 错误处理测试
   * @priority P1
   */
  test('test_auth_strategy_failure', function() {
    // 1. 模拟微信登录失败
    wxMock.mockApiResponse('login', {
      code: 'invalid_code'
    });
    
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/auth/wechat',
      response: {
        statusCode: 401,
        data: {
          error: 'invalid_code',
          message: '无效的授权码'
        }
      }
    });
    
    // 2. 执行微信登录
    return AuthenticationAdapter.authenticateWithWechat()
      .then(function(result) {
        // 3. 验证登录失败
        assert.isFalse(result.success);
        assert.equals(result.error, 'invalid_code');
        assert.isFalse(AuthenticationAdapter.isSessionValid());
      });
  });
  
  /**
   * 测试认证策略优先级和回退
   * @category 功能测试
   * @priority P2
   */
  test('test_auth_strategy_fallback', function() {
    // 1. 初始化带有策略顺序的认证适配器
    AuthenticationAdapter.init({
      apiUrl: 'https://api.example.com',
      authStrategies: ['wechat', 'credentials', 'custom'],
      storage: wxMock.storage
    });
    
    // 2. 模拟微信登录失败
    wxMock.mockApiResponse('login', {
      errMsg: 'login:fail'
    });
    
    // 3. 模拟用户名密码登录成功
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/auth/login',
      response: {
        statusCode: 200,
        data: {
          token: 'fallback_token',
          refreshToken: 'fallback_refresh_token',
          expiresAt: Date.now() + 3600000,
          userInfo: {
            id: 'user_fallback',
            username: '回退用户'
          }
        }
      }
    });
    
    // 4. 执行认证，应该自动回退到用户名密码
    return AuthenticationAdapter.authenticateWithFallback({
      credentials: {
        username: 'fallbackuser',
        password: 'fallbackpass'
      }
    })
      .then(function(result) {
        // 5. 验证通过回退认证成功
        assert.isTrue(result.success);
        assert.equals(AuthenticationAdapter.sessionState.authMethod, 'credentials');
        assert.equals(AuthenticationAdapter.cache.token, 'fallback_token');
      });
  });
  
  /**
   * 测试离线认证策略
   * @category 功能测试
   * @priority P1
   */
  test('test_offline_auth_strategy', function() {
    // 启用离线认证
    AuthenticationAdapter.init({
      apiUrl: 'https://api.example.com',
      enableOfflineAuth: true,
      offlineAuthTTL: 86400000, // 24小时
      storage: wxMock.storage
    });
    
    // 1. 首先进行在线认证
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/auth/login',
      response: {
        statusCode: 200,
        data: {
          token: 'offline_token',
          refreshToken: 'offline_refresh_token',
          expiresAt: Date.now() + 3600000,
          userInfo: {
            id: 'user_offline',
            username: '离线用户'
          }
        }
      }
    });
    
    // 2. 在线登录
    return AuthenticationAdapter.authenticateWithCredentials('offlineuser', 'offlinepass')
      .then(function(result) {
        // 3. 验证在线登录成功
        assert.isTrue(result.success);
        
        // 4. 确保离线凭证已存储
        var offlineCredentials = AuthenticationAdapter._getOfflineCredentials();
        assert.isNotNull(offlineCredentials);
        
        // 5. 清除会话
        AuthenticationAdapter._clearSession();
        assert.isFalse(AuthenticationAdapter.isSessionValid());
        
        // 6. 模拟网络不可用
        wxMock.setNetworkType('none');
        
        // 7. 使用离线登录
        return AuthenticationAdapter.authenticateOffline('offlineuser', 'offlinepass');
      })
      .then(function(result) {
        // 8. 验证离线登录成功
        assert.isTrue(result.success);
        assert.equals(AuthenticationAdapter.sessionState.authMethod, 'offline');
        assert.isTrue(AuthenticationAdapter.isSessionValid());
        assert.equals(AuthenticationAdapter.cache.userInfo.username, '离线用户');
      });
  });
}); 