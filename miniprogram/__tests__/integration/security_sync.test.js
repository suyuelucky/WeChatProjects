/**
 * 安全框架与同步框架集成测试
 * 
 * 创建时间: 2025-04-09 13:56:42 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 测试文件
 */

// 导入测试相关依赖
var assert = require('../mocks/assert.mock');
var wxMock = require('../mocks/wx.mock');

// 导入被测试模块
var EncryptionManager = require('../../services/security/EncryptionManager');
var AuthenticationAdapter = require('../../services/security/AuthenticationAdapter');
var SyncAdapter = require('../../services/SyncAdapter');

// 测试套件
describe('安全框架与同步框架集成测试', function() {
  
  // 在每个测试用例前重置模拟对象
  beforeEach(function() {
    // 重置 wx Mock
    wxMock.resetMock();
    
    // 初始化加密管理器 - 使用模拟存储
    EncryptionManager.init({
      storage: wxMock.storage
    });
    
    // 初始化认证适配器 - 使用模拟API地址
    AuthenticationAdapter.init({
      apiUrl: 'https://api.example.com',
      storage: wxMock.storage
    });
    
    // 初始化同步适配器
    SyncAdapter.init({
      baseUrl: 'https://api.example.com/sync'
    });
    
    // 模拟认证状态
    mockAuthenticationState();
  });
  
  /**
   * 模拟用户认证状态
   */
  function mockAuthenticationState() {
    // 创建模拟会话数据
    var sessionData = {
      token: 'mock_token_12345',
      refreshToken: 'mock_refresh_token_67890',
      expiresAt: Date.now() + 3600000, // 1小时后过期
      authenticatedAt: Date.now(),
      authMethod: 'test'
    };
    
    var userInfo = {
      id: 'user_12345',
      username: 'testuser',
      isAdmin: false,
      permissions: ['sync:read', 'sync:write']
    };
    
    // 直接存储到认证适配器
    AuthenticationAdapter.cache.session = sessionData;
    AuthenticationAdapter.cache.token = sessionData.token;
    AuthenticationAdapter.cache.refreshToken = sessionData.refreshToken;
    AuthenticationAdapter.cache.userInfo = userInfo;
    AuthenticationAdapter.sessionState.isAuthenticated = true;
    AuthenticationAdapter.sessionState.lastAuthenticated = sessionData.authenticatedAt;
    AuthenticationAdapter.sessionState.authMethod = sessionData.authMethod;
  }
  
  /**
   * 测试安全框架与同步框架的基本集成
   * @category 集成测试
   * @priority P0
   */
  test('test_basic_integration', function() {
    // 1. 验证认证状态
    var isAuthenticated = AuthenticationAdapter.isSessionValid();
    assert.isTrue(isAuthenticated);
    
    // 2. 获取访问令牌
    var token = AuthenticationAdapter.getAccessToken();
    assert.equals(token, 'mock_token_12345');
    
    // 3. 确认同步适配器可以获取令牌
    var syncHeaders = SyncAdapter.getRequestHeaders();
    assert.isTrue(syncHeaders.Authorization.includes(token));
  });
  
  /**
   * 测试安全加密和同步数据的集成
   * @category 集成测试
   * @priority P0
   */
  test('test_encrypted_sync_data', function() {
    // 1. 准备测试数据
    var syncData = {
      id: 'record_12345',
      content: '敏感同步数据',
      timestamp: Date.now()
    };
    
    // 2. 使用加密管理器加密数据
    var encryptedData = EncryptionManager.encrypt(syncData);
    
    // 3. 验证数据已加密
    assert.notEquals(JSON.stringify(syncData), encryptedData);
    
    // 4. 模拟同步过程前的处理 - 包装加密的数据
    var syncPackage = {
      type: 'encrypted',
      content: encryptedData,
      signature: EncryptionManager.signData(encryptedData)
    };
    
    // 5. 确认可以提取和解密数据（模拟接收端）
    var receivedData = syncPackage.content;
    var isSignatureValid = EncryptionManager.verifySignature(receivedData, syncPackage.signature);
    assert.isTrue(isSignatureValid);
    
    var decryptedData = EncryptionManager.decrypt(receivedData);
    assert.deepEquals(syncData, decryptedData);
  });
  
  /**
   * 测试令牌刷新和同步重试的集成
   * @category 集成测试
   * @priority P1
   */
  test('test_token_refresh_and_sync_retry', function() {
    // 模拟令牌过期
    AuthenticationAdapter.cache.session.expiresAt = Date.now() - 1000;
    
    // 模拟令牌刷新的响应
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/auth/refresh',
      response: {
        statusCode: 200,
        data: {
          token: 'new_mock_token_updated',
          refreshToken: 'new_mock_refresh_token',
          expiresAt: Date.now() + 7200000
        }
      }
    });
    
    // 模拟同步请求的响应
    wxMock.mockHttpResponse({
      url: 'https://api.example.com/sync/data',
      response: {
        statusCode: 200,
        data: {
          success: true,
          syncId: 'sync_12345'
        }
      }
    });
    
    // 执行令牌刷新和同步操作
    AuthenticationAdapter.refreshToken()
      .then(function(success) {
        assert.isTrue(success);
        
        // 验证令牌已更新
        var newToken = AuthenticationAdapter.getAccessToken();
        assert.equals(newToken, 'new_mock_token_updated');
        
        // 使用新令牌执行同步操作
        return SyncAdapter.syncData({
          type: 'test',
          data: { testData: true }
        });
      })
      .then(function(result) {
        // 验证同步成功
        assert.isTrue(result.success);
        assert.equals(result.syncId, 'sync_12345');
      })
      .catch(function(error) {
        assert.fail('操作应成功但失败: ' + error);
      });
  });
  
  /**
   * 测试加密存储和同步状态管理的集成
   * @category 集成测试
   * @priority P1
   */
  test('test_encrypted_storage_and_sync_state', function() {
    // 1. 加密存储同步状态
    var syncState = {
      lastSyncTime: Date.now(),
      pendingChanges: 3,
      syncId: 'state_12345',
      deviceId: 'device_67890'
    };
    
    // 2. 安全存储状态
    EncryptionManager.secureStore('sync_state', syncState);
    
    // 3. 验证状态已加密存储
    var rawStoredState = wxMock.storage('secure_data_sync_state');
    assert.notEquals(JSON.stringify(syncState), rawStoredState);
    
    // 4. 安全检索状态
    var retrievedState = EncryptionManager.secureRetrieve('sync_state');
    assert.deepEquals(syncState, retrievedState);
    
    // 5. 验证可以更新和保存状态
    retrievedState.lastSyncTime = Date.now();
    retrievedState.pendingChanges = 0;
    EncryptionManager.secureStore('sync_state', retrievedState);
    
    // 6. 再次检索验证更新成功
    var updatedState = EncryptionManager.secureRetrieve('sync_state');
    assert.equals(updatedState.pendingChanges, 0);
    assert.notEquals(updatedState.lastSyncTime, syncState.lastSyncTime);
  });
});

// 模拟同步适配器的简单实现（如果不存在）
if (typeof SyncAdapter === 'undefined') {
  var SyncAdapter = {
    config: {
      baseUrl: ''
    },
    
    init: function(options) {
      this.config = Object.assign({}, this.config, options);
      return true;
    },
    
    getRequestHeaders: function() {
      return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AuthenticationAdapter.getAccessToken()
      };
    },
    
    syncData: function(data) {
      return new Promise(function(resolve, reject) {
        wx.request({
          url: SyncAdapter.config.baseUrl + '/data',
          method: 'POST',
          header: SyncAdapter.getRequestHeaders(),
          data: data,
          success: function(res) {
            resolve(res.data);
          },
          fail: function(error) {
            reject(error);
          }
        });
      });
    }
  };
}

// 为wx模拟对象添加HTTP响应模拟功能
if (!wxMock.mockHttpResponse) {
  wxMock.mockResponses = {};
  
  wxMock.mockHttpResponse = function(config) {
    this.mockResponses[config.url] = config.response;
  };
  
  // 保存原始的wx.request
  var originalRequest = wx.request;
  
  // 覆盖wx.request以支持模拟响应
  wx.request = function(options) {
    // 检查是否有匹配的模拟响应
    var mockResponse = wxMock.mockResponses[options.url];
    
    if (mockResponse) {
      // 使用模拟响应
      if (options.success) {
        setTimeout(function() {
          options.success(mockResponse);
        }, 10);
      }
      
      if (options.complete) {
        setTimeout(function() {
          options.complete(mockResponse);
        }, 15);
      }
      
      return;
    }
    
    // 如果没有匹配的模拟响应，使用原始方法
    if (originalRequest) {
      return originalRequest(options);
    } else {
      // 如果原始方法不可用，返回基本错误
      if (options.fail) {
        setTimeout(function() {
          options.fail({ errMsg: '请求失败: 未模拟的URL' });
        }, 10);
      }
      
      if (options.complete) {
        setTimeout(function() {
          options.complete({ errMsg: '请求失败: 未模拟的URL' });
        }, 15);
      }
    }
  };
} 