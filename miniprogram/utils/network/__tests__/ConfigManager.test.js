/**
 * ConfigManager 组件单元测试
 * 配置管理器，提供网络请求的配置管理功能
 * 支持全局配置、请求组配置和单次请求配置的三层继承结构
 */

const mockWx = require('../../testing/wx-mock');
global.wx = mockWx;

// 导入被测试模块
const ConfigManager = require('../ConfigManager');

describe('ConfigManager', function() {
  
  // 在每个测试前重置状态
  beforeEach(function() {
    // 重置mock对象状态
    mockWx._reset();
  });
  
  // 1️⃣ 基础功能测试
  describe('Basic', function() {
    it('应使用默认选项正确初始化', function() {
      var configManager = new ConfigManager();
      expect(configManager).toBeDefined();
      expect(configManager._globalConfig).toEqual(expect.objectContaining({
        core: expect.objectContaining({
          timeout: 30000,
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        }),
        retry: expect.objectContaining({
          enableRetry: true,
          maxRetryTimes: 3
        }),
        cache: expect.objectContaining({
          enableCache: false
        })
      }));
    });

    it('应正确合并用户选项和默认选项', function() {
      var customConfig = {
        core: {
          timeout: 5000,
          headers: {
            'Authorization': 'Bearer token123'
          }
        },
        retry: {
          maxRetryTimes: 1
        }
      };
      
      var configManager = new ConfigManager(customConfig);
      
      expect(configManager._globalConfig.core.timeout).toBe(5000);
      expect(configManager._globalConfig.core.headers['Authorization']).toBe('Bearer token123');
      expect(configManager._globalConfig.core.headers['Content-Type']).toBe('application/json');
      expect(configManager._globalConfig.retry.maxRetryTimes).toBe(1);
      expect(configManager._globalConfig.retry.enableRetry).toBe(true);
    });

    it('应能获取全局配置', function() {
      var configManager = new ConfigManager();
      var globalConfig = configManager.getGlobalConfig();
      
      expect(globalConfig).toEqual(configManager._globalConfig);
    });

    it('应能创建和获取请求组配置', function() {
      var configManager = new ConfigManager();
      var groupConfig = {
        core: {
          baseURL: 'https://api.example.com',
          timeout: 8000
        }
      };
      
      configManager.createRequestGroup('testGroup', groupConfig);
      var retrievedConfig = configManager.getGroupConfig('testGroup');
      
      expect(retrievedConfig).toEqual(expect.objectContaining({
        core: expect.objectContaining({
          baseURL: 'https://api.example.com',
          timeout: 8000
        })
      }));
    });

    it('应能更新全局配置', function() {
      var configManager = new ConfigManager();
      var update = {
        core: {
          timeout: 15000
        },
        security: {
          enableCSRF: true
        }
      };
      
      configManager.updateGlobalConfig(update);
      
      expect(configManager._globalConfig.core.timeout).toBe(15000);
      expect(configManager._globalConfig.security.enableCSRF).toBe(true);
    });
  });
  
  // 2️⃣ 错误处理测试
  describe('Error', function() {
    it('应正确处理非法参数', function() {
      var configManager = new ConfigManager();
      
      // 测试无效的请求组ID
      expect(function() {
        configManager.getGroupConfig(null);
      }).toThrow();
      
      // 测试无效的配置对象
      expect(function() {
        configManager.updateGlobalConfig('not an object');
      }).toThrow();
    });

    it('应正确处理不存在的请求组', function() {
      var configManager = new ConfigManager();
      
      expect(function() {
        configManager.getGroupConfig('nonExistentGroup');
      }).toThrow(/不存在/);
    });

    it('应防止配置值被非法修改', function() {
      var configManager = new ConfigManager();
      var globalConfig = configManager.getGlobalConfig();
      
      // 尝试修改返回的配置
      globalConfig.core.timeout = 1;
      
      // 验证原始配置未被修改
      expect(configManager._globalConfig.core.timeout).not.toBe(1);
    });

    it('应验证配置的有效性', function() {
      var configManager = new ConfigManager();
      
      expect(function() {
        configManager.updateGlobalConfig({
          core: {
            timeout: 'not a number'
          }
        });
      }).toThrow(/无效/);
    });

    it('应阻止创建同名请求组', function() {
      var configManager = new ConfigManager();
      
      configManager.createRequestGroup('testGroup', {});
      
      expect(function() {
        configManager.createRequestGroup('testGroup', {});
      }).toThrow(/已存在/);
    });
  });
  
  // 3️⃣ 边界条件测试
  describe('Edge', function() {
    it('应处理空配置请求', function() {
      var configManager = new ConfigManager();
      var config = configManager.createRequestConfig({});
      
      // 应返回有完整默认值的配置
      expect(config).toEqual(expect.objectContaining({
        core: expect.objectContaining({
          method: 'GET',
          timeout: 30000
        })
      }));
    });

    it('应处理深层次配置合并', function() {
      var configManager = new ConfigManager({
        core: {
          headers: {
            'X-Global': 'global-value',
            'Content-Type': 'application/json'
          }
        }
      });
      
      configManager.createRequestGroup('deepGroup', {
        core: {
          headers: {
            'X-Group': 'group-value',
            'Content-Type': 'application/xml'
          }
        }
      });
      
      var requestConfig = {
        core: {
          headers: {
            'X-Request': 'request-value'
          }
        }
      };
      
      var mergedConfig = configManager.createRequestConfig(requestConfig, 'deepGroup');
      
      // 验证深层次合并正确
      expect(mergedConfig.core.headers['X-Global']).toBe('global-value');
      expect(mergedConfig.core.headers['X-Group']).toBe('group-value');
      expect(mergedConfig.core.headers['X-Request']).toBe('request-value');
      expect(mergedConfig.core.headers['Content-Type']).toBe('application/xml');
    });

    it('应处理特殊类型配置合并', function() {
      var configManager = new ConfigManager({
        custom: {
          arrayValue: [1, 2, 3],
          specialValue: true
        }
      });
      
      var requestConfig = {
        custom: {
          arrayValue: [4, 5]
        }
      };
      
      var mergedConfig = configManager.createRequestConfig(requestConfig);
      
      // 数组应被替换而非合并
      expect(mergedConfig.custom.arrayValue).toEqual([4, 5]);
      expect(mergedConfig.custom.specialValue).toBe(true);
    });

    it('应在配置复杂嵌套结构时保持完整性', function() {
      var complexConfig = {
        core: {
          transformRequest: function(data) { return data; },
          nestedObject: {
            level1: {
              level2: {
                value: 'test'
              }
            }
          }
        }
      };
      
      var configManager = new ConfigManager(complexConfig);
      var retrievedConfig = configManager.getGlobalConfig();
      
      expect(typeof retrievedConfig.core.transformRequest).toBe('function');
      expect(retrievedConfig.core.nestedObject.level1.level2.value).toBe('test');
    });

    it('应正确处理大量请求组', function() {
      var configManager = new ConfigManager();
      
      // 创建多个请求组
      for (var i = 0; i < 100; i++) {
        configManager.createRequestGroup('group' + i, {
          core: {
            baseURL: 'https://api' + i + '.example.com'
          }
        });
      }
      
      // 验证所有组都可以正确获取
      for (var j = 0; j < 100; j++) {
        var groupConfig = configManager.getGroupConfig('group' + j);
        expect(groupConfig.core.baseURL).toBe('https://api' + j + '.example.com');
      }
    });
  });
  
  // 4️⃣ 性能测试
  describe('Performance', function() {
    it('配置处理时间应少于5ms', function() {
      var configManager = new ConfigManager();
      var startTime = Date.now();
      
      // 执行多次配置处理操作
      for (var i = 0; i < 100; i++) {
        configManager.createRequestConfig({
          core: {
            url: '/test' + i,
            method: 'POST',
            data: { id: i }
          }
        });
      }
      
      var endTime = Date.now();
      var avgTime = (endTime - startTime) / 100;
      
      expect(avgTime).toBeLessThan(5);
    });

    it('内存占用应保持稳定', function() {
      var configManager = new ConfigManager();
      
      // 创建和删除多个请求组
      for (var i = 0; i < 1000; i++) {
        var groupId = 'tempGroup' + i;
        configManager.createRequestGroup(groupId, {});
        
        // 每创建10个就删除旧的，保持总数不超过10
        if (i >= 10) {
          configManager.deleteRequestGroup('tempGroup' + (i - 10));
        }
      }
      
      // 验证最终请求组数量
      var groups = configManager.listRequestGroups();
      expect(groups.length).toBe(10);
    });
  });
  
  // 5️⃣ 功能特性测试
  describe('Features', function() {
    it('应支持配置预设应用', function() {
      var configManager = new ConfigManager();
      
      var highPerformanceConfig = configManager.applyConfigPreset('HIGH_PERFORMANCE');
      
      expect(highPerformanceConfig.cache.enableCache).toBe(true);
      expect(highPerformanceConfig.retry.enableRetry).toBe(false);
    });

    it('应支持配置持久化与恢复', function() {
      mockWx.setStorageSync = jest.fn();
      mockWx.getStorageSync = jest.fn().mockReturnValue({
        core: {
          timeout: 60000
        }
      });
      
      var configManager = new ConfigManager();
      
      // 持久化配置
      configManager.persistConfig('test_config');
      expect(mockWx.setStorageSync).toHaveBeenCalled();
      
      // 加载持久化配置
      var loaded = configManager.loadPersistedConfig('test_config');
      expect(loaded.core.timeout).toBe(60000);
    });

    it('应支持配置验证', function() {
      var configManager = new ConfigManager();
      
      var validResult = configManager.validateRequestConfig({
        core: {
          url: 'https://api.example.com',
          method: 'GET',
          timeout: 5000
        }
      });
      
      expect(validResult.valid).toBe(true);
      
      var invalidResult = configManager.validateRequestConfig({
        core: {
          url: '',  // 无效URL
          method: 'INVALID',  // 无效方法
          timeout: -1  // 无效超时
        }
      });
      
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    it('应支持配置路径访问', function() {
      var configManager = new ConfigManager();
      
      // 设置嵌套配置值
      configManager.setConfigValue('core.timeout', 12000);
      
      // 获取配置值
      var timeout = configManager.getConfigValue('core.timeout');
      expect(timeout).toBe(12000);
      
      // 获取不存在的配置应返回默认值
      var nonExistent = configManager.getConfigValue('nonexistent.path', null, 'default');
      expect(nonExistent).toBe('default');
    });

    it('应支持配置变更通知', function() {
      var configManager = new ConfigManager();
      var callbackSpy = jest.fn();
      
      // 订阅配置变更
      var subscriptionId = configManager.subscribeToConfigChanges('core.timeout', callbackSpy);
      
      // 触发变更
      configManager.setConfigValue('core.timeout', 15000);
      
      // 验证回调被调用
      expect(callbackSpy).toHaveBeenCalledWith(15000, expect.anything());
      
      // 取消订阅
      configManager.unsubscribeFromConfigChanges(subscriptionId);
      
      // 再次变更不应触发回调
      callbackSpy.mockClear();
      configManager.setConfigValue('core.timeout', 20000);
      expect(callbackSpy).not.toHaveBeenCalled();
    });
  });
}); 