/**
 * CacheManager组件测试套件
 * A3-网络请求管理模块2.0 - A3.7
 * 
 * 创建日期: 2025-04-08
 * 作者: AI开发团队
 * 
 * 测试覆盖范围:
 * - 基础功能测试
 * - 错误处理测试
 * - 边界条件测试
 * - 性能测试
 * - 集成测试
 */

'use strict';

// 模拟微信存储API
var mockWxStorage = {
  _storage: {},
  setStorage: function(options) {
    try {
      this._storage[options.key] = options.data;
      if (options.success) {
        options.success();
      }
    } catch (e) {
      if (options.fail) {
        options.fail(e);
      }
    }
    if (options.complete) {
      options.complete();
    }
  },
  getStorage: function(options) {
    try {
      if (this._storage[options.key] !== undefined) {
        if (options.success) {
          options.success({ data: this._storage[options.key] });
        }
      } else {
        if (options.fail) {
          options.fail({ errMsg: 'getStorage:fail data not found' });
        }
      }
    } catch (e) {
      if (options.fail) {
        options.fail(e);
      }
    }
    if (options.complete) {
      options.complete();
    }
  },
  removeStorage: function(options) {
    try {
      if (this._storage[options.key] !== undefined) {
        delete this._storage[options.key];
        if (options.success) {
          options.success();
        }
      } else {
        if (options.fail) {
          options.fail({ errMsg: 'removeStorage:fail data not found' });
        }
      }
    } catch (e) {
      if (options.fail) {
        options.fail(e);
      }
    }
    if (options.complete) {
      options.complete();
    }
  },
  clearStorage: function(options) {
    try {
      this._storage = {};
      if (options && options.success) {
        options.success();
      }
    } catch (e) {
      if (options && options.fail) {
        options.fail(e);
      }
    }
    if (options && options.complete) {
      options.complete();
    }
  },
  getStorageInfo: function(options) {
    try {
      var keys = Object.keys(this._storage);
      var size = 0;
      for (var key in this._storage) {
        if (this._storage.hasOwnProperty(key)) {
          size += JSON.stringify(this._storage[key]).length;
        }
      }
      var info = {
        keys: keys,
        currentSize: size,
        limitSize: 10 * 1024 * 1024 // 10MB
      };
      if (options && options.success) {
        options.success(info);
      }
    } catch (e) {
      if (options && options.fail) {
        options.fail(e);
      }
    }
    if (options && options.complete) {
      options.complete();
    }
  },
  // 重置测试存储
  _reset: function() {
    this._storage = {};
  }
};

// 模拟微信环境
global.wx = {
  setStorage: function(options) { 
    mockWxStorage.setStorage(options);
  },
  getStorage: function(options) {
    mockWxStorage.getStorage(options);
  },
  removeStorage: function(options) {
    mockWxStorage.removeStorage(options);
  },
  clearStorage: function(options) {
    mockWxStorage.clearStorage(options);
  },
  getStorageInfo: function(options) {
    mockWxStorage.getStorageInfo(options);
  }
};

// 导入CacheManager构造函数
var CacheManager = require('../services/CacheManager');

// 主测试套件
describe('CacheManager', function() {
  var cacheManager;
  var defaultOptions;
  
  // 在每个测试前重置存储和创建实例
  beforeEach(function() {
    mockWxStorage._reset();
    defaultOptions = {
      prefix: 'test_cache_',
      defaultExpiration: 300000, // 5分钟
      cleanupInterval: 60000,    // 1分钟
      maxItems: 100,
      maxSize: 5 * 1024 * 1024   // 5MB
    };
    
    // 确保实例被正确创建
    try {
      cacheManager = new CacheManager(defaultOptions);
      console.log('    [测试] cacheManager实例创建成功');
    } catch (e) {
      console.error('    [测试] cacheManager实例创建失败:', e);
      // 尝试使用全局变量
      if (global.CacheManager) {
        cacheManager = new global.CacheManager(defaultOptions);
        console.log('    [测试] 使用全局CacheManager创建实例成功');
      } else {
        console.error('    [测试] 全局CacheManager也不存在');
      }
    }
  });
  
  describe('基础功能测试', function() {

    it('应该正确创建缓存管理器实例', function() {
      expect(cacheManager).toBeDefined();
      expect(cacheManager.prefix).toBe(defaultOptions.prefix);
      expect(cacheManager.defaultExpiration).toBe(defaultOptions.defaultExpiration);
    });

    it('应该能存储缓存项', function(done) {
      var testKey = 'testKey';
      var testData = { message: 'Hello World' };
      
      cacheManager.set(testKey, testData)
        .then(function() {
          return new Promise(function(resolve) {
            wx.getStorage({
              key: cacheManager.prefix + testKey,
              success: function(res) {
                resolve(res.data);
              },
              fail: function() {
                fail('缓存项未找到');
              }
            });
          });
        })
        .then(function(storedData) {
          expect(storedData).toBeDefined();
          expect(storedData.value).toEqual(testData);
          expect(storedData.timestamp).toBeDefined();
          expect(storedData.expiration).toBe(defaultOptions.defaultExpiration);
          done();
        })
        .catch(function(err) {
          fail(err);
          done();
        });
    });

    it('应该能获取缓存项', function(done) {
      var testKey = 'testKey';
      var testData = { message: 'Hello World' };
      
      cacheManager.set(testKey, testData)
        .then(function() {
          return cacheManager.get(testKey);
        })
        .then(function(data) {
          expect(data).toEqual(testData);
          done();
        })
        .catch(function(err) {
          fail(err);
          done();
        });
    });

    it('应该能清除特定缓存项', function(done) {
      var testKey = 'testKey';
      var testData = { message: 'Hello World' };
      
      cacheManager.set(testKey, testData)
        .then(function() {
          return cacheManager.remove(testKey);
        })
        .then(function() {
          return cacheManager.get(testKey);
        })
        .then(function(data) {
          fail('应该不存在该缓存项');
          done();
        })
        .catch(function(err) {
          // 应该抛出错误，表示缓存项不存在
          expect(err).toBeDefined();
          done();
        });
    });

    it('应该能清除所有缓存', function(done) {
      var testData = { message: 'Hello World' };
      
      Promise.all([
        cacheManager.set('key1', testData),
        cacheManager.set('key2', testData),
        cacheManager.set('key3', testData)
      ])
      .then(function() {
        return cacheManager.clear();
      })
      .then(function() {
        return Promise.all([
          cacheManager.get('key1').catch(function() { return null; }),
          cacheManager.get('key2').catch(function() { return null; }),
          cacheManager.get('key3').catch(function() { return null; })
        ]);
      })
      .then(function(results) {
        expect(results[0]).toBeNull();
        expect(results[1]).toBeNull();
        expect(results[2]).toBeNull();
        done();
      })
      .catch(function(err) {
        fail(err);
        done();
      });
    });

    it('应该能设置自定义过期时间', function(done) {
      var testKey = 'testKey';
      var testData = { message: 'Hello World' };
      var customExpiration = 600000; // 10分钟
      
      cacheManager.set(testKey, testData, { expiration: customExpiration })
        .then(function() {
          return new Promise(function(resolve) {
            wx.getStorage({
              key: cacheManager.prefix + testKey,
              success: function(res) {
                resolve(res.data);
              }
            });
          });
        })
        .then(function(storedData) {
          expect(storedData.expiration).toBe(customExpiration);
          done();
        })
        .catch(function(err) {
          fail(err);
          done();
        });
    });

    it('应该能检查缓存项是否过期', function(done) {
      var testKey = 'testKey';
      var testData = { message: 'Hello World' };
      var expiredData = { message: 'Expired data' };
      
      // 添加一个已过期的缓存项
      var expiredItem = {
        value: expiredData,
        timestamp: Date.now() - 600000, // 10分钟前
        expiration: 300000 // 5分钟
      };
      
      wx.setStorage({
        key: cacheManager.prefix + 'expiredKey',
        data: expiredItem,
        success: function() {
          // 添加一个未过期的缓存项
          cacheManager.set(testKey, testData)
            .then(function() {
              // 获取未过期的缓存项
              return cacheManager.get(testKey);
            })
            .then(function(data) {
              expect(data).toEqual(testData);
              
              // 获取已过期的缓存项
              return cacheManager.get('expiredKey');
            })
            .then(function() {
              fail('应该不返回过期的缓存项');
              done();
            })
            .catch(function(err) {
              // 应该抛出错误，表示缓存项已过期
              expect(err).toBeDefined();
              done();
            });
        }
      });
    });

  });
  
  describe('错误处理测试', function() {
    
    it('应该处理存储失败的情况', function(done) {
      // 模拟存储失败
      var originalSetStorage = wx.setStorage;
      wx.setStorage = function(options) {
        if (options.fail) {
          options.fail({ errMsg: 'setStorage:fail' });
        }
        if (options.complete) {
          options.complete();
        }
      };
      
      var testKey = 'testKey';
      var testData = { message: 'Hello World' };
      
      cacheManager.set(testKey, testData)
        .then(function() {
          fail('应该抛出存储失败错误');
          done();
        })
        .catch(function(err) {
          expect(err).toBeDefined();
          expect(err.errMsg).toBeDefined();
          // 恢复原始函数
          wx.setStorage = originalSetStorage;
          done();
        });
    });
    
    it('应该处理获取不存在的缓存项', function(done) {
      var nonExistentKey = 'nonExistentKey';
      
      cacheManager.get(nonExistentKey)
        .then(function(data) {
          fail('应该抛出缓存项不存在错误');
          done();
        })
        .catch(function(err) {
          expect(err).toBeDefined();
          expect(err.errMsg).toBeDefined();
          done();
        });
    });
    
    it('应该处理清除不存在的缓存项', function(done) {
      var nonExistentKey = 'nonExistentKey';
      
      cacheManager.remove(nonExistentKey)
        .then(function() {
          // 应该正常完成，不抛出错误
          done();
        })
        .catch(function(err) {
          fail('不应该因为清除不存在的缓存项而抛出错误');
          done();
        });
    });
    
    it('应该处理getStorage异常', function(done) {
      // 模拟getStorage抛出异常
      var originalGetStorage = wx.getStorage;
      wx.getStorage = function(options) {
        throw new Error('模拟getStorage异常');
      };
      
      var testKey = 'testKey';
      
      cacheManager.get(testKey)
        .then(function() {
          fail('应该抛出获取缓存异常');
          done();
        })
        .catch(function(err) {
          expect(err).toBeDefined();
          // 恢复原始函数
          wx.getStorage = originalGetStorage;
          done();
        });
    });
    
    it('应该处理无效的JSON数据', function(done) {
      var testKey = 'testKey';
      
      // 直接设置无效的JSON数据
      wx.setStorage({
        key: cacheManager.prefix + testKey,
        data: 'invalid json data',
        success: function() {
          cacheManager.get(testKey)
            .then(function() {
              fail('应该抛出无效数据错误');
              done();
            })
            .catch(function(err) {
              expect(err).toBeDefined();
              done();
            });
        }
      });
    });
  });
  
  describe('边界条件测试', function() {
    
    it('应该处理空键名', function(done) {
      var emptyKey = '';
      var testData = { message: 'Hello World' };
      
      cacheManager.set(emptyKey, testData)
        .then(function() {
          fail('应该拒绝空键名');
          done();
        })
        .catch(function(err) {
          expect(err).toBeDefined();
          expect(err.code).toBe('INVALID_KEY');
          done();
        });
    });
    
    it('应该处理空缓存值', function(done) {
      var testKey = 'testKey';
      var emptyValues = [null, undefined, ''];
      
      var promises = emptyValues.map(function(value) {
        return cacheManager.set(testKey, value)
          .then(function() {
            return cacheManager.get(testKey);
          })
          .then(function(data) {
            expect(data).toEqual(value);
            return true;
          })
          .catch(function() {
            return false;
          });
      });
      
      Promise.all(promises)
        .then(function(results) {
          // 至少有一个空值应该被成功存储
          expect(results.some(function(result) { return result; })).toBe(true);
          done();
        })
        .catch(function(err) {
          fail(err);
          done();
        });
    });
    
    it('应该处理超大缓存项', function(done) {
      var testKey = 'largeKey';
      // 创建一个大于默认maxItemSize的数据
      var largeData = new Array(1024 * 1024).join('a'); // 约1MB的字符串
      
      cacheManager.set(testKey, largeData)
        .then(function() {
          // 如果没有maxItemSize限制，应该能正常存储
          return cacheManager.get(testKey);
        })
        .then(function(data) {
          expect(data).toBe(largeData);
          done();
        })
        .catch(function(err) {
          // 如果有maxItemSize限制，应该拒绝存储
          expect(err.code).toBe('ITEM_TOO_LARGE');
          done();
        });
    });
    
    it('应该处理缓存满的情况', function(done) {
      // 创建一个只允许存储3个项目的缓存管理器
      var smallCacheManager = new CacheManager({
        prefix: 'small_cache_',
        maxItems: 3
      });
      
      var promises = [];
      // 存储5个缓存项，超过maxItems限制
      for(var i = 0; i < 5; i++) {
        promises.push(smallCacheManager.set('key' + i, 'value' + i));
      }
      
      Promise.all(promises)
        .then(function() {
          // 检查应该只保留最近的3个缓存项
          return Promise.all([
            smallCacheManager.get('key0').catch(function() { return null; }),
            smallCacheManager.get('key1').catch(function() { return null; }),
            smallCacheManager.get('key2').catch(function() { return null; }),
            smallCacheManager.get('key3').catch(function() { return null; }),
            smallCacheManager.get('key4').catch(function() { return null; })
          ]);
        })
        .then(function(results) {
          // 前两个应该被淘汰
          expect(results[0]).toBeNull();
          expect(results[1]).toBeNull();
          // 后三个应该存在
          expect(results[2]).toBe('value2');
          expect(results[3]).toBe('value3');
          expect(results[4]).toBe('value4');
          done();
        })
        .catch(function(err) {
          fail(err);
          done();
        });
    });
    
    it('应该处理无效的过期时间', function(done) {
      var testKey = 'testKey';
      var testData = { message: 'Hello World' };
      var invalidExpirations = [-1, 0, 'invalid', null, undefined];
      
      var promises = invalidExpirations.map(function(expiration) {
        return cacheManager.set(testKey, testData, { expiration: expiration })
          .then(function() {
            return new Promise(function(resolve) {
              wx.getStorage({
                key: cacheManager.prefix + testKey,
                success: function(res) {
                  resolve(res.data.expiration);
                }
              });
            });
          });
      });
      
      Promise.all(promises)
        .then(function(results) {
          // 无效的过期时间应该被替换为默认值
          results.forEach(function(expiration) {
            expect(expiration).toBe(defaultOptions.defaultExpiration);
          });
          done();
        })
        .catch(function(err) {
          fail(err);
          done();
        });
    });
  });
  
  describe('性能测试', function() {
    
    it('应该高效处理大量缓存操作', function(done) {
      // 生成100个缓存项
      var itemCount = 100;
      var startTime = Date.now();
      var promises = [];
      
      for (var i = 0; i < itemCount; i++) {
        promises.push(cacheManager.set('perf_key_' + i, 'value_' + i));
      }
      
      Promise.all(promises)
        .then(function() {
          var setTime = Date.now() - startTime;
          startTime = Date.now();
          
          // 读取100个缓存项
          var readPromises = [];
          for (var i = 0; i < itemCount; i++) {
            readPromises.push(cacheManager.get('perf_key_' + i));
          }
          return Promise.all(readPromises).then(function() {
            return setTime;
          });
        })
        .then(function(setTime) {
          var getTime = Date.now() - startTime;
          
          // 验证性能在可接受范围内
          expect(setTime).toBeLessThan(1000); // 设置100项应该不超过1秒
          expect(getTime).toBeLessThan(500);  // 读取100项应该不超过0.5秒
          
          // 计算平均操作时间
          var avgSetTime = setTime / itemCount;
          var avgGetTime = getTime / itemCount;
          
          // 记录性能数据，用于优化
          console.log('设置' + itemCount + '个缓存项平均耗时: ' + avgSetTime.toFixed(2) + 'ms');
          console.log('读取' + itemCount + '个缓存项平均耗时: ' + avgGetTime.toFixed(2) + 'ms');
          
          done();
        })
        .catch(function(err) {
          fail(err);
          done();
        });
    });
    
    it('应该正确实现LRU策略', function(done) {
      // 创建一个只允许5个项目的LRU缓存管理器
      var lruCacheManager = new CacheManager({
        prefix: 'lru_cache_',
        maxItems: 5,
        strategy: 'LRU'
      });
      
      // 按顺序存储5个缓存项
      Promise.resolve()
        .then(function() {
          var promises = [];
          for (var i = 0; i < 5; i++) {
            promises.push(lruCacheManager.set('key' + i, 'value' + i));
          }
          return Promise.all(promises);
        })
        .then(function() {
          // 访问key1，使其成为最近使用的
          return lruCacheManager.get('key1');
        })
        .then(function() {
          // 再添加一个新的缓存项，应该淘汰最旧的(key0)
          return lruCacheManager.set('key5', 'value5');
        })
        .then(function() {
          // 检查key0是否被淘汰，key1是否保留
          return Promise.all([
            lruCacheManager.get('key0').catch(function() { return null; }),
            lruCacheManager.get('key1')
          ]);
        })
        .then(function(results) {
          expect(results[0]).toBeNull(); // key0应该被淘汰
          expect(results[1]).toBe('value1'); // key1应该被保留
          done();
        })
        .catch(function(err) {
          fail(err);
          done();
        });
    });
    
    it('应该在后台自动清理过期缓存', function(done) {
      // 创建一个定期清理缓存的管理器
      var cleanupCacheManager = new CacheManager({
        prefix: 'cleanup_cache_',
        defaultExpiration: 100, // 100ms过期
        cleanupInterval: 200    // 200ms清理一次
      });
      
      // 存储几个很快就会过期的缓存项
      cleanupCacheManager.set('quickExpireKey', 'quickExpireValue')
        .then(function() {
          // 等待300ms，确保缓存过期且清理运行
          return new Promise(function(resolve) {
            setTimeout(resolve, 300);
          });
        })
        .then(function() {
          // 尝试获取已经过期的缓存项
          return cleanupCacheManager.get('quickExpireKey')
            .then(function() {
              fail('应该已经被自动清理');
              done();
            })
            .catch(function(err) {
              // 应该抛出错误，表示缓存项不存在或已过期
              expect(err).toBeDefined();
              done();
            });
        })
        .catch(function(err) {
          fail(err);
          done();
        });
    });
  });
  
  describe('集成测试', function() {
    
    it('应该正确配合其他组件工作', function(done) {
      // 模拟网络请求适配器
      var RequestAdapter = function() {
        this.send = function(config) {
          return new Promise(function(resolve) {
            setTimeout(function() {
              resolve({
                statusCode: 200,
                data: { message: 'Success', timestamp: Date.now() },
                headers: { 'content-type': 'application/json' }
              });
            }, 50);
          });
        };
      };
      
      var adapter = new RequestAdapter();
      var requestUrl = 'https://api.example.com/data';
      var cacheKey = 'request_' + requestUrl;
      
      // 第一次请求，应该从网络获取并缓存
      adapter.send({ url: requestUrl })
        .then(function(response) {
          // 缓存响应
          return cacheManager.set(cacheKey, response);
        })
        .then(function() {
          // 检查是否成功缓存
          return cacheManager.get(cacheKey);
        })
        .then(function(cachedResponse) {
          expect(cachedResponse).toBeDefined();
          expect(cachedResponse.statusCode).toBe(200);
          expect(cachedResponse.data.message).toBe('Success');
          
          // 模拟第二次请求，应该优先使用缓存
          var startTime = Date.now();
          return cacheManager.get(cacheKey)
            .then(function(cachedResponse) {
              var fetchTime = Date.now() - startTime;
              
              // 从缓存获取应该非常快（远快于网络请求的50ms）
              expect(fetchTime).toBeLessThan(20);
              expect(cachedResponse.statusCode).toBe(200);
              
              done();
            });
        })
        .catch(function(err) {
          fail(err);
          done();
        });
    });
    
    it('应该支持缓存刷新机制', function(done) {
      var testKey = 'refresh_key';
      var initialData = { version: 1, message: 'Initial data' };
      var updatedData = { version: 2, message: 'Updated data' };
      
      // 先存储初始数据
      cacheManager.set(testKey, initialData)
        .then(function() {
          // 确认初始数据已存储
          return cacheManager.get(testKey);
        })
        .then(function(data) {
          expect(data).toEqual(initialData);
          
          // 使用强制刷新获取新数据的模拟函数
          var fetchFreshData = function() {
            return Promise.resolve(updatedData);
          };
          
          // 实现刷新缓存的逻辑
          return cacheManager.getOrFetch(testKey, fetchFreshData, { forceRefresh: true });
        })
        .then(function(data) {
          // 应该返回新数据
          expect(data).toEqual(updatedData);
          
          // 确认缓存已更新
          return cacheManager.get(testKey);
        })
        .then(function(data) {
          expect(data).toEqual(updatedData);
          done();
        })
        .catch(function(err) {
          fail(err);
          done();
        });
    });
    
    it('应该能与本地存储同步', function(done) {
      // 在其他地方（如其他页面）直接修改了存储
      var testKey = 'external_key';
      var externalData = { source: 'external', value: 123 };
      
      // 直接使用wx API设置存储
      wx.setStorage({
        key: cacheManager.prefix + testKey,
        data: {
          value: externalData,
          timestamp: Date.now(),
          expiration: 3600000 // 1小时
        },
        success: function() {
          // 通过CacheManager读取
          cacheManager.get(testKey)
            .then(function(data) {
              expect(data).toEqual(externalData);
              
              // 使用CacheManager更新数据
              return cacheManager.set(testKey, { source: 'updated', value: 456 });
            })
            .then(function() {
              // 直接通过wx API读取
              wx.getStorage({
                key: cacheManager.prefix + testKey,
                success: function(res) {
                  expect(res.data.value).toEqual({ source: 'updated', value: 456 });
                  done();
                },
                fail: function(err) {
                  fail(err);
                  done();
                }
              });
            })
            .catch(function(err) {
              fail(err);
              done();
            });
        }
      });
    });
  });
  
}); 