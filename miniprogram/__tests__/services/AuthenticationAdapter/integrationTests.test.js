/**
 * AuthenticationAdapter集成测试
 * 
 * 创建时间: 2025-04-09 14:58:36 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 测试文件
 */

// 引入测试框架
var assert = require('../../mocks/assert.mock');
var wxMock = require('../../mocks/wx.mock');
var AuthenticationAdapter = require('../../../services/security/AuthenticationAdapter');
var EncryptionManager = require('../../../services/security/EncryptionManager');
var SyncManager = require('../../../services/sync/SyncManager');
var StorageManager = require('../../../services/storage/StorageManager');

// 测试套件
describe('AuthenticationAdapter - 集成测试', function() {
  
  // 初始化测试环境
  beforeEach(function() {
    // 重置wx Mock
    wxMock.resetMock();
    
    // 初始化加密管理器
    EncryptionManager.init({
      storage: wxMock.storage
    });
    
    // 初始化存储管理器
    StorageManager.init({
      storage: wxMock.storage,
      encryptionManager: EncryptionManager
    });
    
    // 初始化认证适配器
    AuthenticationAdapter.init({
      apiUrl: 'https://api.example.com',
      sessionStorage: 'secure',
      storage: wxMock.storage
    });
    
    // 初始化同步管理器
    SyncManager.init({
      apiUrl: 'https://api.example.com/sync',
      storage: wxMock.storage,
      authenticationAdapter: AuthenticationAdapter
    });
    
    // 清除会话状态
    AuthenticationAdapter._clearSession();
  });
  
  /**
   * 测试认证与同步流程集成
   * @category 集成测试
   * @priority P0
   */
  test('test_auth_and_sync_integration', function() {
    // 1. 模拟用户登录
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/auth/login',
      response: {
        statusCode: 200,
        data: {
          token: 'integration_token_12345',
          refreshToken: 'integration_refresh_token_67890',
          expiresAt: Date.now() + 3600000,
          userInfo: {
            id: 'user_int_12345',
            username: 'integrationuser'
          }
        }
      }
    });
    
    // 2. 模拟同步数据响应
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/sync/data',
      response: {
        statusCode: 200,
        data: {
          lastSyncTimestamp: Date.now(),
          syncId: 'sync_12345',
          data: [
            {id: 'item1', content: '集成测试数据1'},
            {id: 'item2', content: '集成测试数据2'}
          ]
        }
      }
    });
    
    // 3. 执行登录
    return AuthenticationAdapter.authenticateWithCredentials('integrationuser', 'integrationpass')
      .then(function(result) {
        // 4. 验证登录成功
        assert.isTrue(result.success);
        assert.isTrue(AuthenticationAdapter.isSessionValid());
        
        // 5. 执行数据同步
        return SyncManager.syncData();
      })
      .then(function(syncResult) {
        // 6. 验证同步成功
        assert.isTrue(syncResult.success);
        assert.equals(syncResult.data.length, 2);
        
        // 7. 验证同步使用了认证令牌
        var requestHeaders = wxMock.getLastRequestHeaders();
        assert.equals(requestHeaders.Authorization, 'Bearer ' + AuthenticationAdapter.getAccessToken());
      });
  });
  
  /**
   * 测试令牌失效和自动刷新流程
   * @category 集成测试
   * @priority P0
   */
  test('test_token_expiration_and_sync', function() {
    // 1. 模拟初次登录
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/auth/login',
      response: {
        statusCode: 200,
        data: {
          token: 'expiring_int_token',
          refreshToken: 'refresh_int_token',
          expiresAt: Date.now() + 60000, // 1分钟后过期
          userInfo: {
            id: 'user_exp_12345',
            username: 'expirationuser'
          }
        }
      }
    });
    
    // 2. 模拟同步请求的401响应（令牌已过期）
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/sync/data',
      response: {
        statusCode: 401,
        data: {
          error: 'token_expired',
          message: '访问令牌已过期'
        }
      }
    });
    
    // 3. 模拟令牌刷新响应
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/auth/refresh',
      response: {
        statusCode: 200,
        data: {
          token: 'new_int_token',
          refreshToken: 'new_refresh_int_token',
          expiresAt: Date.now() + 3600000
        }
      }
    });
    
    // 4. 模拟刷新令牌后的同步响应
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/sync/data',
      isSecondCall: true,
      response: {
        statusCode: 200,
        data: {
          lastSyncTimestamp: Date.now(),
          syncId: 'sync_after_refresh',
          data: [
            {id: 'refreshed_item1', content: '刷新后数据1'},
            {id: 'refreshed_item2', content: '刷新后数据2'}
          ]
        }
      }
    });
    
    // 5. 执行登录
    return AuthenticationAdapter.authenticateWithCredentials('expirationuser', 'expirationpass')
      .then(function(result) {
        // 6. 验证登录成功
        assert.isTrue(result.success);
        
        // 7. 模拟令牌过期（通过调整过期时间）
        AuthenticationAdapter.cache.session.expiresAt = Date.now() - 1000;
        
        // 8. 尝试同步数据，应触发令牌刷新流程
        return SyncManager.syncData();
      })
      .then(function(syncResult) {
        // 9. 验证同步最终成功
        assert.isTrue(syncResult.success);
        assert.equals(syncResult.data.length, 2);
        
        // 10. 验证令牌已刷新
        assert.equals(AuthenticationAdapter.cache.token, 'new_int_token');
        
        // 11. 验证使用了新令牌进行同步请求
        var requestHeaders = wxMock.getLastRequestHeaders();
        assert.equals(requestHeaders.Authorization, 'Bearer new_int_token');
      });
  });
  
  /**
   * 测试认证与加密存储集成
   * @category 集成测试
   * @priority P1
   */
  test('test_auth_and_encrypted_storage', function() {
    // 1. 模拟用户登录
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/auth/login',
      response: {
        statusCode: 200,
        data: {
          token: 'storage_token_12345',
          refreshToken: 'storage_refresh_token_67890',
          expiresAt: Date.now() + 3600000,
          userInfo: {
            id: 'user_storage_12345',
            username: 'storageuser',
            securityLevel: 'high'
          }
        }
      }
    });
    
    // 2. 执行登录
    return AuthenticationAdapter.authenticateWithCredentials('storageuser', 'storagepass')
      .then(function(result) {
        // 3. 验证登录成功
        assert.isTrue(result.success);
        
        // 4. 获取用户特定的加密密钥
        var userKey = EncryptionManager.generateKeyFromData(
          AuthenticationAdapter.cache.userInfo.id + 
          AuthenticationAdapter.cache.token.substr(0, 8)
        );
        
        // 5. 存储敏感数据
        return StorageManager.setSecureItem('sensitiveUserData', {
          personalInfo: '这是敏感个人信息',
          financialData: '这是财务数据',
          healthRecords: '这是健康记录'
        }, userKey);
      })
      .then(function() {
        // 6. 检索敏感数据
        var userKey = EncryptionManager.generateKeyFromData(
          AuthenticationAdapter.cache.userInfo.id + 
          AuthenticationAdapter.cache.token.substr(0, 8)
        );
        
        return StorageManager.getSecureItem('sensitiveUserData', userKey);
      })
      .then(function(data) {
        // 7. 验证数据正确解密
        assert.equals(data.personalInfo, '这是敏感个人信息');
        assert.equals(data.financialData, '这是财务数据');
        assert.equals(data.healthRecords, '这是健康记录');
        
        // 8. 验证数据在存储中已加密
        var rawData = wxMock.getStorageSync('secure_sensitiveUserData');
        assert.notIncludes(rawData, '这是敏感个人信息');
        assert.notIncludes(rawData, '这是财务数据');
      });
  });
  
  /**
   * 测试认证状态变化监听
   * @category 集成测试
   * @priority P1
   */
  test('test_auth_state_change_listeners', function() {
    // 1. 初始化状态变化监听器
    var stateChangeEvents = [];
    var unsubscribe = AuthenticationAdapter.onAuthStateChanged(function(state) {
      stateChangeEvents.push({
        isAuthenticated: state.isAuthenticated,
        authMethod: state.authMethod,
        timestamp: Date.now()
      });
    });
    
    // 2. 模拟登录响应
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/auth/login',
      response: {
        statusCode: 200,
        data: {
          token: 'listener_token',
          refreshToken: 'listener_refresh_token',
          expiresAt: Date.now() + 3600000,
          userInfo: {
            id: 'user_listener',
            username: 'listeneruser'
          }
        }
      }
    });
    
    // 3. 执行登录
    return AuthenticationAdapter.authenticateWithCredentials('listeneruser', 'listenerpass')
      .then(function(result) {
        // 4. 验证登录成功
        assert.isTrue(result.success);
        
        // 5. 验证状态变化事件被触发
        assert.equals(stateChangeEvents.length, 1);
        assert.isTrue(stateChangeEvents[0].isAuthenticated);
        assert.equals(stateChangeEvents[0].authMethod, 'credentials');
        
        // 6. 执行登出
        return AuthenticationAdapter.logout();
      })
      .then(function() {
        // 7. 验证登出状态变化事件被触发
        assert.equals(stateChangeEvents.length, 2);
        assert.isFalse(stateChangeEvents[1].isAuthenticated);
        assert.isNull(stateChangeEvents[1].authMethod);
        
        // 8. 移除监听器
        unsubscribe();
        
        // 9. 再次登录，不应触发事件
        return AuthenticationAdapter.authenticateWithCredentials('listeneruser', 'listenerpass');
      })
      .then(function() {
        // 10. 验证没有新事件被触发
        assert.equals(stateChangeEvents.length, 2);
      });
  });
  
  /**
   * 测试权限与功能访问控制
   * @category 集成测试
   * @priority P1
   */
  test('test_permission_and_feature_access', function() {
    // 1. 初始化权限功能访问控制
    var featureRegistry = {
      'feature:premium': {
        requiredPermissions: ['premium_access'],
        description: '高级功能'
      },
      'feature:admin': {
        requiredPermissions: ['admin_access'],
        description: '管理功能'
      },
      'feature:basic': {
        requiredPermissions: ['basic_access'],
        description: '基础功能'
      }
    };
    
    AuthenticationAdapter.registerFeatures(featureRegistry);
    
    // 2. 模拟普通用户登录
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/auth/login',
      response: {
        statusCode: 200,
        data: {
          token: 'basic_user_token',
          refreshToken: 'basic_user_refresh',
          expiresAt: Date.now() + 3600000,
          userInfo: {
            id: 'basic_user',
            username: 'basicuser',
            permissions: ['basic_access']
          }
        }
      }
    });
    
    // 3. 执行普通用户登录
    return AuthenticationAdapter.authenticateWithCredentials('basicuser', 'basicpass')
      .then(function(result) {
        // 4. 验证登录成功
        assert.isTrue(result.success);
        
        // 5. 验证权限检查
        assert.isTrue(AuthenticationAdapter.hasPermission('basic_access'));
        assert.isFalse(AuthenticationAdapter.hasPermission('premium_access'));
        assert.isFalse(AuthenticationAdapter.hasPermission('admin_access'));
        
        // 6. 验证功能访问
        assert.isTrue(AuthenticationAdapter.canAccessFeature('feature:basic'));
        assert.isFalse(AuthenticationAdapter.canAccessFeature('feature:premium'));
        assert.isFalse(AuthenticationAdapter.canAccessFeature('feature:admin'));
        
        // 7. 登出
        return AuthenticationAdapter.logout();
      })
      .then(function() {
        // 8. 模拟高级用户登录
        wxMock.mockHttpResponse({
          url: 'https://api.example.com/auth/login',
          response: {
            statusCode: 200,
            data: {
              token: 'premium_user_token',
              refreshToken: 'premium_user_refresh',
              expiresAt: Date.now() + 3600000,
              userInfo: {
                id: 'premium_user',
                username: 'premiumuser',
                permissions: ['basic_access', 'premium_access']
              }
            }
          }
        });
        
        // 9. 执行高级用户登录
        return AuthenticationAdapter.authenticateWithCredentials('premiumuser', 'premiumpass');
      })
      .then(function(result) {
        // 10. 验证登录成功
        assert.isTrue(result.success);
        
        // 11. 验证高级用户权限
        assert.isTrue(AuthenticationAdapter.hasPermission('basic_access'));
        assert.isTrue(AuthenticationAdapter.hasPermission('premium_access'));
        assert.isFalse(AuthenticationAdapter.hasPermission('admin_access'));
        
        // 12. 验证高级用户功能访问
        assert.isTrue(AuthenticationAdapter.canAccessFeature('feature:basic'));
        assert.isTrue(AuthenticationAdapter.canAccessFeature('feature:premium'));
        assert.isFalse(AuthenticationAdapter.canAccessFeature('feature:admin'));
      });
  });
}); 