/**
 * AuthenticationAdapter基础认证功能测试
 * 
 * 创建时间: 2025-04-09 14:32:18 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 测试文件
 */

// 引入测试框架
var assert = require('../../mocks/assert.mock');
var wxMock = require('../../mocks/wx.mock');
var AuthenticationAdapter = require('../../../services/security/AuthenticationAdapter');
var EncryptionManager = require('../../../services/security/EncryptionManager');

// 测试套件
describe('AuthenticationAdapter - 基础认证功能测试', function() {
  
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
      sessionStorage: 'standard', // 使用标准存储以便于测试
      storage: wxMock.storage
    });
    
    // 清除会话状态
    AuthenticationAdapter._clearSession();
  });
  
  /**
   * 测试微信登录认证
   * @category 功能测试
   * @priority P0
   */
  test('test_wechat_authentication', function() {
    // 1. 模拟wx.login的返回结果
    wxMock.mockApiResponse('login', {
      code: 'test_code_12345'
    });
    
    // 2. 模拟登录请求的响应
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/auth/wechat',
      response: {
        statusCode: 200,
        data: {
          token: 'wx_token_12345',
          refreshToken: 'wx_refresh_token_67890',
          expiresAt: Date.now() + 3600000,
          userInfo: {
            id: 'user_12345',
            nickname: '测试用户',
            avatarUrl: 'https://example.com/avatar.jpg'
          }
        }
      }
    });
    
    // 3. 执行微信登录
    return AuthenticationAdapter.authenticateWithWechat()
      .then(function(result) {
        // 4. 验证登录结果
        assert.isTrue(result.success);
        assert.equals(result.userInfo.id, 'user_12345');
        
        // 5. 验证会话状态
        assert.isTrue(AuthenticationAdapter.isSessionValid());
        assert.equals(AuthenticationAdapter.sessionState.authMethod, 'wechat');
        
        // 6. 验证可以获取访问令牌
        var token = AuthenticationAdapter.getAccessToken();
        assert.equals(token, 'wx_token_12345');
      });
  });
  
  /**
   * 测试用户名密码认证
   * @category 功能测试
   * @priority P0
   */
  test('test_credentials_authentication', function() {
    // 1. 模拟登录请求的响应
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/auth/login',
      response: {
        statusCode: 200,
        data: {
          token: 'user_token_12345',
          refreshToken: 'user_refresh_token_67890',
          expiresAt: Date.now() + 3600000,
          userInfo: {
            id: 'user_67890',
            username: 'testuser',
            email: 'test@example.com'
          }
        }
      }
    });
    
    // 2. 执行用户名密码登录
    return AuthenticationAdapter.authenticateWithCredentials('testuser', 'password123')
      .then(function(result) {
        // 3. 验证登录结果
        assert.isTrue(result.success);
        assert.equals(result.userInfo.username, 'testuser');
        
        // 4. 验证会话状态
        assert.isTrue(AuthenticationAdapter.isSessionValid());
        assert.equals(AuthenticationAdapter.sessionState.authMethod, 'credentials');
        
        // 5. 验证可以获取访问令牌
        var token = AuthenticationAdapter.getAccessToken();
        assert.equals(token, 'user_token_12345');
      });
  });
  
  /**
   * 测试会话有效性检查
   * @category 功能测试
   * @priority P0
   */
  test('test_session_validity', function() {
    // 1. 初始状态应为未认证
    assert.isFalse(AuthenticationAdapter.isSessionValid());
    
    // 2. 手动设置有效会话
    AuthenticationAdapter.cache.session = {
      token: 'test_token_12345',
      refreshToken: 'test_refresh_token_67890',
      expiresAt: Date.now() + 3600000, // 1小时后过期
      authenticatedAt: Date.now(),
      authMethod: 'test'
    };
    AuthenticationAdapter.sessionState.isAuthenticated = true;
    
    // 3. 检查会话状态应为有效
    assert.isTrue(AuthenticationAdapter.isSessionValid());
    
    // 4. 设置过期会话
    AuthenticationAdapter.cache.session.expiresAt = Date.now() - 1000; // 1秒前过期
    
    // 5. 检查会话状态应为无效
    assert.isFalse(AuthenticationAdapter.isSessionValid());
  });
  
  /**
   * 测试令牌刷新功能
   * @category 功能测试
   * @priority P1
   */
  test('test_token_refresh', function() {
    // 1. 手动设置即将过期的会话
    AuthenticationAdapter.cache.session = {
      token: 'old_token_12345',
      refreshToken: 'old_refresh_token_67890',
      expiresAt: Date.now() + 60000, // 60秒后过期
      authenticatedAt: Date.now() - 3540000, // 59分钟前认证
      authMethod: 'test'
    };
    AuthenticationAdapter.cache.token = 'old_token_12345';
    AuthenticationAdapter.cache.refreshToken = 'old_refresh_token_67890';
    AuthenticationAdapter.sessionState.isAuthenticated = true;
    
    // 2. 模拟刷新请求的响应
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/auth/refresh',
      response: {
        statusCode: 200,
        data: {
          token: 'new_token_12345',
          refreshToken: 'new_refresh_token_67890',
          expiresAt: Date.now() + 7200000 // 2小时后过期
        }
      }
    });
    
    // 3. 执行令牌刷新
    return AuthenticationAdapter.refreshToken()
      .then(function(success) {
        // 4. 验证刷新结果
        assert.isTrue(success);
        
        // 5. 验证令牌已更新
        assert.equals(AuthenticationAdapter.cache.token, 'new_token_12345');
        assert.equals(AuthenticationAdapter.cache.refreshToken, 'new_refresh_token_67890');
        
        // 6. 验证会话仍然有效
        assert.isTrue(AuthenticationAdapter.isSessionValid());
      });
  });
  
  /**
   * 测试登出功能
   * @category 功能测试
   * @priority P0
   */
  test('test_logout', function() {
    // 1. 手动设置有效会话
    AuthenticationAdapter.cache.session = {
      token: 'test_token_12345',
      refreshToken: 'test_refresh_token_67890',
      expiresAt: Date.now() + 3600000,
      authenticatedAt: Date.now(),
      authMethod: 'test'
    };
    AuthenticationAdapter.cache.token = 'test_token_12345';
    AuthenticationAdapter.cache.refreshToken = 'test_refresh_token_67890';
    AuthenticationAdapter.cache.userInfo = { id: 'user_12345' };
    AuthenticationAdapter.sessionState.isAuthenticated = true;
    
    // 2. 验证初始状态是已认证
    assert.isTrue(AuthenticationAdapter.isSessionValid());
    
    // 3. 执行登出
    return AuthenticationAdapter.logout()
      .then(function(success) {
        // 4. 验证登出结果
        assert.isTrue(success);
        
        // 5. 验证会话已清除
        assert.isFalse(AuthenticationAdapter.isSessionValid());
        assert.isNull(AuthenticationAdapter.cache.token);
        assert.isNull(AuthenticationAdapter.cache.refreshToken);
        assert.isNull(AuthenticationAdapter.cache.userInfo);
      });
  });
  
  /**
   * 测试权限检查功能
   * @category 功能测试
   * @priority P1
   */
  test('test_permission_check', function() {
    // 1. 手动设置有效会话和用户信息
    AuthenticationAdapter.cache.session = {
      token: 'test_token_12345',
      refreshToken: 'test_refresh_token_67890',
      expiresAt: Date.now() + 3600000,
      authenticatedAt: Date.now(),
      authMethod: 'test'
    };
    AuthenticationAdapter.sessionState.isAuthenticated = true;
    
    // 2. 设置带有权限的用户信息
    AuthenticationAdapter.cache.userInfo = {
      id: 'user_12345',
      username: 'testuser',
      permissions: ['read', 'write', 'profile:edit']
    };
    
    // 3. 验证权限检查
    assert.isTrue(AuthenticationAdapter.hasPermission('read'));
    assert.isTrue(AuthenticationAdapter.hasPermission('write'));
    assert.isTrue(AuthenticationAdapter.hasPermission('profile:edit'));
    assert.isFalse(AuthenticationAdapter.hasPermission('admin'));
    assert.isFalse(AuthenticationAdapter.hasPermission('delete'));
  });
  
  /**
   * 测试安全存储会话模式
   * @category 功能测试
   * @priority P1
   */
  test('test_secure_storage_mode', function() {
    // 重新初始化认证适配器，使用安全存储
    AuthenticationAdapter.init({
      apiUrl: 'https://api.example.com',
      sessionStorage: 'secure',
      storage: wxMock.storage
    });
    
    // 1. 模拟登录请求的响应
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/auth/login',
      response: {
        statusCode: 200,
        data: {
          token: 'secure_token_12345',
          refreshToken: 'secure_refresh_token_67890',
          expiresAt: Date.now() + 3600000,
          userInfo: {
            id: 'user_12345',
            username: 'secureuser'
          }
        }
      }
    });
    
    // 2. 执行登录
    return AuthenticationAdapter.authenticateWithCredentials('secureuser', 'password123')
      .then(function(result) {
        // 3. 验证登录成功
        assert.isTrue(result.success);
        
        // 4. 验证会话已加密存储
        var rawSession = wxMock.getStorageSync(AuthenticationAdapter.config.sessionKey);
        
        // 确认存储的内容不是明文
        assert.notIncludes(rawSession, 'secure_token_12345');
        
        // 5. 重新初始化适配器，验证可以恢复会话
        AuthenticationAdapter.init({
          apiUrl: 'https://api.example.com',
          sessionStorage: 'secure',
          storage: wxMock.storage
        });
        
        // 6. 验证会话状态正确恢复
        assert.isTrue(AuthenticationAdapter.isSessionValid());
        assert.equals(AuthenticationAdapter.getAccessToken(), 'secure_token_12345');
      });
  });
}); 