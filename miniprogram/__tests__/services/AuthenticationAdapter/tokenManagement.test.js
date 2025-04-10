/**
 * AuthenticationAdapter令牌管理功能测试
 * 
 * 创建时间: 2025-04-09 14:35:42 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 测试文件
 */

// 引入测试框架
var assert = require('../../mocks/assert.mock');
var wxMock = require('../../mocks/wx.mock');
var AuthenticationAdapter = require('../../../services/security/AuthenticationAdapter');
var EncryptionManager = require('../../../services/security/EncryptionManager');

// 测试套件
describe('AuthenticationAdapter - 令牌管理功能测试', function() {
  
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
      storage: wxMock.storage,
      tokenRefreshInterval: 1800000 // 30分钟
    });
    
    // 清除会话状态
    AuthenticationAdapter._clearSession();
    
    // 设置模拟会话
    setupMockSession();
  });
  
  /**
   * 设置模拟会话
   */
  function setupMockSession() {
    // 创建模拟会话
    var now = Date.now();
    var session = {
      token: 'token_12345',
      refreshToken: 'refresh_token_67890',
      expiresAt: now + 3600000, // 1小时后过期
      authenticatedAt: now,
      authMethod: 'test'
    };
    
    // 设置到认证适配器
    AuthenticationAdapter.cache.session = session;
    AuthenticationAdapter.cache.token = session.token;
    AuthenticationAdapter.cache.refreshToken = session.refreshToken;
    AuthenticationAdapter.sessionState.isAuthenticated = true;
    AuthenticationAdapter.sessionState.lastAuthenticated = session.authenticatedAt;
    AuthenticationAdapter.sessionState.authMethod = session.authMethod;
  }
  
  /**
   * 测试获取访问令牌
   * @category 功能测试
   * @priority P0
   */
  test('test_get_access_token', function() {
    // 1. 验证可以获取令牌
    var token = AuthenticationAdapter.getAccessToken();
    assert.equals(token, 'token_12345');
    
    // 2. 未认证状态下获取令牌
    AuthenticationAdapter._clearSession();
    assert.isFalse(AuthenticationAdapter.isSessionValid());
    
    // 3. 验证未认证状态下获取令牌返回null
    token = AuthenticationAdapter.getAccessToken();
    assert.isNull(token);
  });
  
  /**
   * 测试令牌过期处理
   * @category 功能测试
   * @priority P0
   */
  test('test_token_expiration', function() {
    // 1. 初始状态令牌有效
    assert.isTrue(AuthenticationAdapter.isSessionValid());
    
    // 2. 设置令牌过期
    AuthenticationAdapter.cache.session.expiresAt = Date.now() - 1000; // 1秒前过期
    
    // 3. 验证会话无效
    assert.isFalse(AuthenticationAdapter.isSessionValid());
    
    // 4. 模拟刷新令牌请求的响应
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
    
    // 5. 尝试获取访问令牌，应触发令牌刷新
    var promise = AuthenticationAdapter.getAccessTokenWithRefresh();
    
    // 6. 验证返回的令牌
    return promise.then(function(token) {
      assert.equals(token, 'new_token_12345');
      
      // 7. 验证会话状态已更新
      assert.isTrue(AuthenticationAdapter.isSessionValid());
      assert.equals(AuthenticationAdapter.cache.token, 'new_token_12345');
    });
  });
  
  /**
   * 测试令牌刷新失败处理
   * @category 错误处理测试
   * @priority P1
   */
  test('test_token_refresh_failure', function() {
    // 1. 设置令牌即将过期
    AuthenticationAdapter.cache.session.expiresAt = Date.now() + 60000; // 60秒后过期
    
    // 2. 模拟刷新令牌请求失败
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/auth/refresh',
      response: {
        statusCode: 401,
        data: {
          error: 'invalid_refresh_token',
          message: '刷新令牌无效或已过期'
        }
      }
    });
    
    // 3. 尝试刷新令牌
    return AuthenticationAdapter.refreshToken()
      .then(function(success) {
        // 4. 验证刷新失败
        assert.isFalse(success);
        
        // 5. 检查会话状态
        // 注意：在刷新失败时，应清除会话状态
        assert.isFalse(AuthenticationAdapter.isSessionValid());
        assert.isNull(AuthenticationAdapter.cache.token);
        assert.isNull(AuthenticationAdapter.cache.refreshToken);
      });
  });
  
  /**
   * 测试自动令牌刷新机制
   * @category 功能测试
   * @priority P1
   */
  test('test_auto_token_refresh', function() {
    // 1. 设置令牌即将过期
    var now = Date.now();
    AuthenticationAdapter.cache.session.authenticatedAt = now - 1700000; // 28分20秒前认证
    AuthenticationAdapter.cache.session.expiresAt = now + 100000; // 还有100秒过期
    
    // 2. 模拟刷新令牌请求的响应
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/auth/refresh',
      response: {
        statusCode: 200,
        data: {
          token: 'auto_refreshed_token',
          refreshToken: 'auto_refreshed_refresh_token',
          expiresAt: now + 3600000 // 新令牌1小时后过期
        }
      }
    });
    
    // 3. 手动触发自动刷新检查
    AuthenticationAdapter._checkAutoRefresh();
    
    // 4. 验证令牌被自动刷新
    // 这里我们需要模拟等待异步刷新完成
    return new Promise(function(resolve) {
      setTimeout(function() {
        // 5. 验证令牌已更新
        assert.equals(AuthenticationAdapter.cache.token, 'auto_refreshed_token');
        assert.equals(AuthenticationAdapter.cache.refreshToken, 'auto_refreshed_refresh_token');
        resolve();
      }, 100);
    });
  });
  
  /**
   * 测试令牌安全存储
   * @category 安全测试
   * @priority P1
   */
  test('test_token_secure_storage', function() {
    // 重新初始化认证适配器为安全存储模式
    AuthenticationAdapter.init({
      apiUrl: 'https://api.example.com',
      sessionStorage: 'secure',
      storage: wxMock.storage
    });
    
    // 1. 设置会话信息
    var session = {
      token: 'secure_token_12345',
      refreshToken: 'secure_refresh_token_67890',
      expiresAt: Date.now() + 3600000,
      authenticatedAt: Date.now(),
      authMethod: 'test'
    };
    
    // 2. 安全存储会话
    AuthenticationAdapter._saveSession(session);
    
    // 3. 检查存储内容不包含明文令牌
    var storedData = wxMock.getStorageSync(AuthenticationAdapter.config.sessionKey);
    assert.notIncludes(storedData, 'secure_token_12345');
    assert.notIncludes(storedData, 'secure_refresh_token_67890');
    
    // 4. 恢复会话并验证
    AuthenticationAdapter._clearSession(); // 先清除内存中的会话
    AuthenticationAdapter._restoreSession();
    
    // 5. 验证会话恢复正确
    assert.isTrue(AuthenticationAdapter.isSessionValid());
    assert.equals(AuthenticationAdapter.cache.token, 'secure_token_12345');
    assert.equals(AuthenticationAdapter.cache.refreshToken, 'secure_refresh_token_67890');
  });
  
  /**
   * 测试令牌刷新间隔配置
   * @category 配置测试
   * @priority P2
   */
  test('test_token_refresh_interval_config', function() {
    // 1. 使用自定义刷新间隔初始化
    AuthenticationAdapter.init({
      apiUrl: 'https://api.example.com',
      tokenRefreshInterval: 600000, // 10分钟
      storage: wxMock.storage
    });
    
    setupMockSession();
    
    // 2. 设置认证时间为9分钟前（应该还不需要刷新）
    var now = Date.now();
    AuthenticationAdapter.cache.session.authenticatedAt = now - 540000; // 9分钟前
    AuthenticationAdapter.cache.session.expiresAt = now + 3060000; // 51分钟后过期
    
    // 3. 验证不需要刷新
    assert.isFalse(AuthenticationAdapter._needsRefresh());
    
    // 4. 设置认证时间为11分钟前（应该需要刷新）
    AuthenticationAdapter.cache.session.authenticatedAt = now - 660000; // 11分钟前
    
    // 5. 验证需要刷新
    assert.isTrue(AuthenticationAdapter._needsRefresh());
  });
}); 