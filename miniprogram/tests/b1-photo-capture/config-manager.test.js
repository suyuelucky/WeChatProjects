/**
 * 配置管理模块测试用例
 * 创建时间: 2025-04-09 11:12:45
 * 创建者: Claude AI 3.7 Sonnet
 */

var assert = function(condition, message) {
  if (!condition) {
    wx.showModal({
      title: '测试失败',
      content: message || '断言失败',
      showCancel: false
    });
    console.error('[TEST FAILED]', message || '断言失败');
    throw new Error(message || '断言失败');
  }
};

/**
 * 配置管理模块测试套件
 */
var ConfigManagerTest = {
  /**
   * 运行所有测试
   */
  runAllTests: function() {
    console.log('[TEST] 开始运行ConfigManager测试套件');
    
    this.testEnvironmentSwitch();
    this.testDefaultConfig();
    this.testApiUrlConfig();
    this.testConfigOverride();
    this.testConfigPersistence();
    
    console.log('[TEST] ConfigManager测试套件运行完成');
  },
  
  /**
   * 测试环境切换功能
   */
  testEnvironmentSwitch: function() {
    console.log('[TEST] 测试环境切换功能');
    
    // 导入待测试模块
    var ConfigManager = require('../../utils/config-manager');
    
    // 测试环境切换
    ConfigManager.setEnv('development');
    assert(ConfigManager.getCurrentEnv() === 'development', '环境切换到development失败');
    
    ConfigManager.setEnv('production');
    assert(ConfigManager.getCurrentEnv() === 'production', '环境切换到production失败');
    
    ConfigManager.setEnv('testing');
    assert(ConfigManager.getCurrentEnv() === 'testing', '环境切换到testing失败');
    
    // 测试无效环境名称
    ConfigManager.setEnv('invalid-env');
    assert(ConfigManager.getCurrentEnv() !== 'invalid-env', '应该忽略无效的环境名称');
    
    console.log('[TEST] 环境切换功能测试通过');
  },
  
  /**
   * 测试默认配置
   */
  testDefaultConfig: function() {
    console.log('[TEST] 测试默认配置功能');
    
    // 导入待测试模块
    var ConfigManager = require('../../utils/config-manager');
    
    // 重置为默认配置
    ConfigManager.resetToDefault();
    
    // 验证默认配置
    var config = ConfigManager.getConfig();
    assert(config !== null, '默认配置不应为null');
    assert(typeof config === 'object', '默认配置应为对象');
    assert(config.hasOwnProperty('apiBase'), '默认配置应包含apiBase');
    assert(config.hasOwnProperty('defaultPhotoQuality'), '默认配置应包含defaultPhotoQuality');
    
    console.log('[TEST] 默认配置功能测试通过');
  },
  
  /**
   * 测试API URL配置
   */
  testApiUrlConfig: function() {
    console.log('[TEST] 测试API URL配置功能');
    
    // 导入待测试模块
    var ConfigManager = require('../../utils/config-manager');
    
    // 设置测试环境
    ConfigManager.setEnv('development');
    
    // 测试获取API URL
    var photoUploadUrl = ConfigManager.getApiUrl('photoUpload');
    assert(typeof photoUploadUrl === 'string', 'API URL应为字符串');
    assert(photoUploadUrl.indexOf('dev') > -1, '开发环境URL应包含dev标识');
    
    // 设置生产环境
    ConfigManager.setEnv('production');
    
    // 测试生产环境URL
    var prodPhotoUploadUrl = ConfigManager.getApiUrl('photoUpload');
    assert(prodPhotoUploadUrl.indexOf('dev') === -1, '生产环境URL不应包含dev标识');
    
    // 测试无效API名称
    var invalidApiUrl = ConfigManager.getApiUrl('nonExistentApi');
    assert(typeof invalidApiUrl === 'string', '无效API名称也应返回字符串');
    assert(invalidApiUrl !== '', '无效API名称应返回基础URL');
    
    console.log('[TEST] API URL配置功能测试通过');
  },
  
  /**
   * 测试配置覆盖功能
   */
  testConfigOverride: function() {
    console.log('[TEST] 测试配置覆盖功能');
    
    // 导入待测试模块
    var ConfigManager = require('../../utils/config-manager');
    
    // 保存原始配置
    var originalConfig = ConfigManager.getConfig();
    
    // 测试部分覆盖
    var overrideConfig = {
      defaultPhotoQuality: 0.5,
      customSetting: 'test value'
    };
    
    ConfigManager.updateConfig(overrideConfig);
    var updatedConfig = ConfigManager.getConfig();
    
    assert(updatedConfig.defaultPhotoQuality === 0.5, '配置覆盖失败');
    assert(updatedConfig.customSetting === 'test value', '新增配置项失败');
    assert(updatedConfig.apiBase === originalConfig.apiBase, '未覆盖的配置项应保持不变');
    
    // 重置配置
    ConfigManager.resetToDefault();
    
    console.log('[TEST] 配置覆盖功能测试通过');
  },
  
  /**
   * 测试配置持久化功能
   */
  testConfigPersistence: function() {
    console.log('[TEST] 测试配置持久化功能');
    
    // 导入待测试模块
    var ConfigManager = require('../../utils/config-manager');
    
    // 设置测试配置
    var testConfig = {
      testKey: 'testValue',
      timestamp: Date.now()
    };
    
    // 保存配置
    ConfigManager.updateConfig(testConfig);
    ConfigManager.saveConfigToStorage();
    
    // 重置内存中的配置
    ConfigManager.resetToDefault();
    
    // 从存储加载配置
    ConfigManager.loadConfigFromStorage();
    var loadedConfig = ConfigManager.getConfig();
    
    // 验证加载的配置
    assert(loadedConfig.testKey === testConfig.testKey, '配置持久化失败');
    assert(loadedConfig.timestamp === testConfig.timestamp, '配置时间戳不匹配');
    
    // 清理测试配置
    ConfigManager.resetToDefault();
    ConfigManager.saveConfigToStorage();
    
    console.log('[TEST] 配置持久化功能测试通过');
  }
};

// 导出测试套件
module.exports = ConfigManagerTest; 