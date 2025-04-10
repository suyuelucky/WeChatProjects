/**
 * AuthenticationAdapter会话处理功能测试
 * 
 * 创建时间: 2025-04-09 14:42:15 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 测试文件
 */

// 引入测试框架
var assert = require('../../mocks/assert.mock');
var wxMock = require('../../mocks/wx.mock');
var AuthenticationAdapter = require('../../../services/security/AuthenticationAdapter');
var EncryptionManager = require('../../../services/security/EncryptionManager');

// 测试套件
describe('AuthenticationAdapter - 会话处理功能测试', function() {
  
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
   * 测试会话存储和恢复
   * @category 功能测试
   * @priority P0
   */
  test('test_session_storage_and_restoration', function() {
    // 1. 准备会话数据
    var sessionData = {
      token: 'session_token_12345',
      refreshToken: 'session_refresh_token_67890',
      expiresAt: Date.now() + 3600000,
      authenticatedAt: Date.now(),
      authMethod: 'test_session'
    };
    
    var userInfo = {
      id: 'user_12345',
      username: 'sessiontestuser',
      email: 'session@example.com'
    };
    
    // 2. 设置会话和用户信息
    AuthenticationAdapter.cache.session = sessionData;
    AuthenticationAdapter.cache.token = sessionData.token;
    AuthenticationAdapter.cache.refreshToken = sessionData.refreshToken;
    AuthenticationAdapter.cache.userInfo = userInfo;
    AuthenticationAdapter.sessionState.isAuthenticated = true;
    AuthenticationAdapter.sessionState.lastAuthenticated = sessionData.authenticatedAt;
    AuthenticationAdapter.sessionState.authMethod = sessionData.authMethod;
    
    // 3. 保存会话
    AuthenticationAdapter._saveSession(sessionData);
    AuthenticationAdapter._saveUserInfo(userInfo);
    
    // 4. 清除内存中的会话
    AuthenticationAdapter._clearSession();
    assert.isNull(AuthenticationAdapter.cache.session);
    assert.isNull(AuthenticationAdapter.cache.token);
    assert.isNull(AuthenticationAdapter.cache.userInfo);
    
    // 5. 恢复会话
    var restored = AuthenticationAdapter._restoreSession();
    assert.isTrue(restored);
    
    // 6. 验证会话恢复正确
    assert.isTrue(AuthenticationAdapter.isSessionValid());
    assert.equals(AuthenticationAdapter.cache.token, 'session_token_12345');
    assert.equals(AuthenticationAdapter.cache.refreshToken, 'session_refresh_token_67890');
    assert.equals(AuthenticationAdapter.cache.userInfo.username, 'sessiontestuser');
  });
  
  /**
   * 测试会话过期自动处理
   * @category 功能测试
   * @priority P1
   */
  test('test_session_expiration_handling', function() {
    // 1. 准备即将过期的会话
    var sessionData = {
      token: 'expiring_token_12345',
      refreshToken: 'expiring_refresh_token_67890',
      expiresAt: Date.now() + 30000, // 30秒后过期
      authenticatedAt: Date.now() - 3570000, // 59.5分钟前认证
      authMethod: 'test_expiring'
    };
    
    // 2. 设置会话
    AuthenticationAdapter.cache.session = sessionData;
    AuthenticationAdapter.cache.token = sessionData.token;
    AuthenticationAdapter.cache.refreshToken = sessionData.refreshToken;
    AuthenticationAdapter.sessionState.isAuthenticated = true;
    AuthenticationAdapter.sessionState.lastAuthenticated = sessionData.authenticatedAt;
    AuthenticationAdapter.sessionState.authMethod = sessionData.authMethod;
    
    // 3. 保存会话
    AuthenticationAdapter._saveSession(sessionData);
    
    // 4. 模拟刷新令牌请求的响应
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/auth/refresh',
      response: {
        statusCode: 200,
        data: {
          token: 'new_session_token',
          refreshToken: 'new_session_refresh_token',
          expiresAt: Date.now() + 7200000 // 2小时后过期
        }
      }
    });
    
    // 5. 获取访问令牌应触发自动刷新
    return AuthenticationAdapter.getAccessTokenWithRefresh()
      .then(function(token) {
        // 6. 验证返回新令牌
        assert.equals(token, 'new_session_token');
        
        // 7. 验证会话已更新
        assert.isTrue(AuthenticationAdapter.isSessionValid());
        assert.equals(AuthenticationAdapter.cache.token, 'new_session_token');
        assert.equals(AuthenticationAdapter.cache.refreshToken, 'new_session_refresh_token');
      });
  });
  
  /**
   * 测试会话异常检测
   * @category 安全测试
   * @priority P1
   */
  test('test_session_anomaly_detection', function() {
    // 启用会话异常检测
    AuthenticationAdapter.init({
      apiUrl: 'https://api.example.com',
      sessionStorage: 'standard',
      storage: wxMock.storage,
      enableAnomalyDetection: true
    });
    
    // 1. 创建初始会话（模拟首次认证）
    var initialSession = {
      token: 'initial_token',
      refreshToken: 'initial_refresh_token',
      expiresAt: Date.now() + 3600000,
      authenticatedAt: Date.now(),
      authMethod: 'test',
      deviceInfo: {
        model: 'iPhone X',
        system: 'iOS 14.0',
        platform: 'ios',
        deviceId: 'device_12345'
      }
    };
    
    // 2. 保存初始会话
    AuthenticationAdapter.cache.session = initialSession;
    AuthenticationAdapter._saveSession(initialSession);
    AuthenticationAdapter.sessionState.isAuthenticated = true;
    
    // 3. 清除会话缓存
    AuthenticationAdapter._clearSession();
    
    // 4. 恢复会话（正常场景，相同设备）
    wxMock.mockSystemInfo({
      model: 'iPhone X',
      system: 'iOS 14.0',
      platform: 'ios'
    });
    
    var restored = AuthenticationAdapter._restoreSession();
    assert.isTrue(restored);
    assert.isTrue(AuthenticationAdapter.isSessionValid());
    
    // 5. 清除会话缓存
    AuthenticationAdapter._clearSession();
    
    // 6. 改变设备信息
    wxMock.mockSystemInfo({
      model: 'Pixel 5',
      system: 'Android 11',
      platform: 'android'
    });
    
    // 7. 恢复会话（异常场景，不同设备）
    var anomalyDetected = false;
    try {
      AuthenticationAdapter._restoreSession();
    } catch (error) {
      anomalyDetected = error.message.includes('session anomaly detected');
    }
    
    // 8. 验证异常检测
    assert.isTrue(anomalyDetected || !AuthenticationAdapter.isSessionValid());
  });
  
  /**
   * 测试会话持久化
   * @category 功能测试
   * @priority P0
   */
  test('test_session_persistence', function() {
    // 1. 准备会话数据
    var sessionData = {
      token: 'persist_token_12345',
      refreshToken: 'persist_refresh_token_67890',
      expiresAt: Date.now() + 3600000,
      authenticatedAt: Date.now(),
      authMethod: 'test_persist'
    };
    
    // 2. 设置和保存会话
    AuthenticationAdapter.cache.session = sessionData;
    AuthenticationAdapter.cache.token = sessionData.token;
    AuthenticationAdapter.cache.refreshToken = sessionData.refreshToken;
    AuthenticationAdapter.sessionState.isAuthenticated = true;
    AuthenticationAdapter._saveSession(sessionData);
    
    // 3. 模拟小程序重启（创建新的认证适配器实例）
    var newAuthAdapter = Object.create(AuthenticationAdapter);
    newAuthAdapter.init({
      apiUrl: 'https://api.example.com',
      sessionStorage: 'standard',
      storage: wxMock.storage
    });
    
    // 4. 验证新实例能恢复会话
    assert.isTrue(newAuthAdapter.isSessionValid());
    assert.equals(newAuthAdapter.getAccessToken(), 'persist_token_12345');
  });
  
  /**
   * 测试会话安全升级
   * @category 安全测试
   * @priority P2
   */
  test('test_session_security_upgrade', function() {
    // 1. 使用标准存储模式初始化
    AuthenticationAdapter.init({
      apiUrl: 'https://api.example.com',
      sessionStorage: 'standard',
      storage: wxMock.storage
    });
    
    // 2. 准备会话数据
    var sessionData = {
      token: 'upgrade_token_12345',
      refreshToken: 'upgrade_refresh_token_67890',
      expiresAt: Date.now() + 3600000,
      authenticatedAt: Date.now(),
      authMethod: 'test_upgrade'
    };
    
    // 3. 设置和保存会话（标准模式）
    AuthenticationAdapter.cache.session = sessionData;
    AuthenticationAdapter.cache.token = sessionData.token;
    AuthenticationAdapter.cache.refreshToken = sessionData.refreshToken;
    AuthenticationAdapter.sessionState.isAuthenticated = true;
    AuthenticationAdapter._saveSession(sessionData);
    
    // 4. 切换到安全存储模式
    AuthenticationAdapter.init({
      apiUrl: 'https://api.example.com',
      sessionStorage: 'secure',
      storage: wxMock.storage,
      upgradeExistingSession: true
    });
    
    // 5. 验证会话正确升级
    assert.isTrue(AuthenticationAdapter.isSessionValid());
    assert.equals(AuthenticationAdapter.getAccessToken(), 'upgrade_token_12345');
    
    // 6. 验证已使用安全存储
    var rawData = wxMock.getStorageSync(AuthenticationAdapter.config.sessionKey);
    assert.notIncludes(rawData, 'upgrade_token_12345');
    
    // 7. 清除内存中的会话
    AuthenticationAdapter._clearSession();
    
    // 8. 从安全存储恢复
    var restored = AuthenticationAdapter._restoreSession();
    assert.isTrue(restored);
    assert.isTrue(AuthenticationAdapter.isSessionValid());
    assert.equals(AuthenticationAdapter.getAccessToken(), 'upgrade_token_12345');
  });
}); 