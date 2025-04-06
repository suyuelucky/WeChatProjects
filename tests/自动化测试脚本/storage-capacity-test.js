/**
 * 存储容量极限测试脚本
 * 用于自动测试微信小程序本地存储在高容量负载下的行为
 * 
 * 注意: 该脚本需在微信开发者工具的Console中执行
 * 使用方法: 复制整个脚本到控制台执行
 */

// 存储控制器，提供存储测试API
var StorageCapacityTester = (function() {
  // 私有变量
  var config = {
    // 测试数据大小设置 (字节)
    dataSize: {
      tiny: 100,       // 100B
      small: 1024,     // 1KB
      medium: 51200,   // 50KB
      large: 512000,   // 500KB
      huge: 1048576    // 1MB
    },
    // 存储占用阈值
    thresholds: {
      warning: 0.7,     // 70%
      autoClear: 0.85,  // 85% 
      critical: 0.95    // 95%
    },
    // 测试键前缀
    keyPrefix: 'test_data_',
    // 日志控制
    logging: true
  };
  
  // 测试数据集合
  var testKeys = [];
  var storageInfo = null;
  var listeners = [];
  
  // 私有方法 - 生成指定大小的测试数据
  function generateTestData(size) {
    // 生成随机字符串填充
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var iterations = Math.ceil(size / 100);
    var result = '';
    
    // 每次生成100字节，重复直到达到目标大小
    for (var i = 0; i < iterations; i++) {
      var chunk = '';
      for (var j = 0; j < 100 && result.length < size; j++) {
        chunk += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      result += chunk;
    }
    
    return result.substring(0, size);
  }
  
  // 私有方法 - 获取当前存储信息
  function getStorageInfo() {
    return new Promise(function(resolve, reject) {
      wx.getStorageInfo({
        success: function(res) {
          storageInfo = {
            keys: res.keys,
            currentSize: res.currentSize,
            limitSize: res.limitSize,
            usageRatio: res.currentSize / res.limitSize,
            keysCount: res.keys.length,
            timestamp: Date.now()
          };
          resolve(storageInfo);
        },
        fail: function(err) {
          reject(err);
        }
      });
    });
  }
  
  // 私有方法 - 记录日志
  function log(message, data, isError) {
    if (!config.logging) return;
    
    var logTime = new Date().toISOString();
    if (isError) {
      console.error('[' + logTime + '] ' + message, data || '');
    } else {
      console.log('[' + logTime + '] ' + message, data || '');
    }
  }
  
  // 私有方法 - 触发事件
  function triggerEvent(eventName, data) {
    listeners.forEach(function(listener) {
      if (listener.event === eventName && typeof listener.callback === 'function') {
        listener.callback(data);
      }
    });
  }
  
  // 公开API
  return {
    // 初始化测试环境
    init: function() {
      log('初始化存储容量测试...');
      return getStorageInfo().then(function(info) {
        log('当前存储状态:', info);
        return info;
      });
    },
    
    // 添加测试数据到存储，直到达到指定使用率
    fillStorageToRatio: function(targetRatio, chunkSize) {
      var self = this;
      chunkSize = chunkSize || config.dataSize.medium;
      
      return new Promise(function(resolve, reject) {
        getStorageInfo().then(function(info) {
          log('当前存储使用率: ' + (info.usageRatio * 100).toFixed(2) + '%');
          
          // 已达到目标比例
          if (info.usageRatio >= targetRatio) {
            log('已达到目标使用率: ' + (targetRatio * 100).toFixed(2) + '%');
            resolve(info);
            return;
          }
          
          // 计算需要添加的数据量
          var targetSize = info.limitSize * targetRatio;
          var sizeToAdd = targetSize - info.currentSize;
          log('需要添加数据量: ' + (sizeToAdd / 1024).toFixed(2) + ' KB');
          
          // 分批添加数据
          var chunksToAdd = Math.ceil(sizeToAdd / chunkSize);
          var addedChunks = 0;
          
          function addNextChunk() {
            if (addedChunks >= chunksToAdd) {
              // 所有数据添加完成，再次检查存储状态
              getStorageInfo().then(resolve).catch(reject);
              return;
            }
            
            var testData = generateTestData(chunkSize);
            var keyName = config.keyPrefix + Date.now() + '_' + addedChunks;
            
            wx.setStorage({
              key: keyName,
              data: testData,
              success: function() {
                testKeys.push(keyName);
                addedChunks++;
                log('已添加测试数据 ' + addedChunks + '/' + chunksToAdd + ': ' + keyName);
                
                // 每添加5个数据检查一次存储状态，避免过度填充
                if (addedChunks % 5 === 0) {
                  getStorageInfo().then(function(newInfo) {
                    log('添加中存储使用率: ' + (newInfo.usageRatio * 100).toFixed(2) + '%');
                    if (newInfo.usageRatio >= targetRatio) {
                      // 已达到目标，提前结束
                      resolve(newInfo);
                    } else {
                      // 继续添加
                      setTimeout(addNextChunk, 100);
                    }
                  });
                } else {
                  // 继续添加下一块
                  setTimeout(addNextChunk, 100);
                }
              },
              fail: function(err) {
                log('添加测试数据失败: ' + keyName, err, true);
                // 可能达到存储限制，记录状态后结束
                getStorageInfo().then(resolve).catch(reject);
              }
            });
          }
          
          // 开始添加数据
          addNextChunk();
        }).catch(reject);
      });
    },
    
    // 清理测试数据
    cleanTestData: function() {
      var promises = [];
      var self = this;
      
      log('开始清理测试数据，共 ' + testKeys.length + ' 项');
      
      testKeys.forEach(function(key) {
        promises.push(new Promise(function(resolve) {
          wx.removeStorage({
            key: key,
            success: function() {
              log('已清理: ' + key);
              resolve(true);
            },
            fail: function(err) {
              log('清理失败: ' + key, err, true);
              resolve(false);
            }
          });
        }));
      });
      
      return Promise.all(promises).then(function(results) {
        var successCount = results.filter(Boolean).length;
        log('清理完成，成功: ' + successCount + '，失败: ' + (results.length - successCount));
        
        // 更新测试键列表，移除已成功清理的
        var newTestKeys = [];
        for (var i = 0; i < testKeys.length; i++) {
          if (!results[i]) {
            newTestKeys.push(testKeys[i]);
          }
        }
        testKeys = newTestKeys;
        
        return getStorageInfo();
      });
    },
    
    // 测试存储极限容量
    testStorageLimit: function() {
      var self = this;
      
      log('开始存储极限测试...');
      
      // 测试70%容量
      return self.fillStorageToRatio(config.thresholds.warning)
        .then(function(info) {
          log('***** 达到70%存储用量 *****');
          log('触发警告通知...');
          triggerEvent('warningThreshold', info);
          return new Promise(function(resolve) {
            // 等待3秒观察系统行为
            setTimeout(function() {
              resolve(info);
            }, 3000);
          });
        })
        .then(function(info) {
          // 测试85%容量
          return self.fillStorageToRatio(config.thresholds.autoClear);
        })
        .then(function(info) {
          log('***** 达到85%存储用量 *****');
          log('触发自动清理检查...');
          triggerEvent('autoClearThreshold', info);
          return new Promise(function(resolve) {
            // 等待5秒观察清理行为
            setTimeout(function() {
              resolve(info);
            }, 5000);
          });
        })
        .then(function(info) {
          // 重新获取存储信息，看是否有自动清理发生
          return getStorageInfo();
        })
        .then(function(info) {
          // 测试95%容量
          return self.fillStorageToRatio(config.thresholds.critical);
        })
        .then(function(info) {
          log('***** 达到95%存储用量 *****');
          log('触发紧急清理检查...');
          triggerEvent('criticalThreshold', info);
          return new Promise(function(resolve) {
            // 等待5秒观察紧急清理行为
            setTimeout(function() {
              resolve(info);
            }, 5000);
          });
        })
        .then(function(info) {
          // 尝试达到100%+容量
          log('尝试超出存储限制...');
          // 使用较大数据块加速填充
          return self.fillStorageToRatio(1.0, config.dataSize.large);
        })
        .then(function(info) {
          log('***** 存储测试完成 *****');
          log('最终存储状态:', info);
          return info;
        })
        .catch(function(err) {
          log('存储测试过程中出错', err, true);
          throw err;
        });
    },
    
    // 进行循环测试
    runCycleTest: function(cycles) {
      var self = this;
      cycles = cycles || 5;
      var currentCycle = 0;
      var results = [];
      
      function runNextCycle() {
        if (currentCycle >= cycles) {
          log('完成所有' + cycles + '轮循环测试');
          return Promise.resolve(results);
        }
        
        currentCycle++;
        log('开始第' + currentCycle + '轮循环测试');
        
        // 填充到85%
        return self.fillStorageToRatio(0.85)
          .then(function(fillInfo) {
            // 记录填充状态
            var cycleResult = {
              cycle: currentCycle,
              fillInfo: fillInfo
            };
            
            // 等待3秒观察系统行为
            return new Promise(function(resolve) {
              setTimeout(function() {
                resolve(cycleResult);
              }, 3000);
            });
          })
          .then(function(cycleResult) {
            // 清理测试数据
            return self.cleanTestData().then(function(cleanInfo) {
              cycleResult.cleanInfo = cleanInfo;
              return cycleResult;
            });
          })
          .then(function(cycleResult) {
            results.push(cycleResult);
            
            // 等待2秒再开始下一轮
            return new Promise(function(resolve) {
              setTimeout(function() {
                resolve();
              }, 2000);
            });
          })
          .then(runNextCycle);
      }
      
      return runNextCycle();
    },
    
    // 获取当前存储信息
    getStorageInfo: getStorageInfo,
    
    // 添加测试事件监听器
    on: function(eventName, callback) {
      listeners.push({
        event: eventName,
        callback: callback
      });
    },
    
    // 获取测试配置
    getConfig: function() {
      return config;
    },
    
    // 修改测试配置
    setConfig: function(newConfig) {
      Object.assign(config, newConfig);
    },
    
    // 获取已添加的测试键
    getTestKeys: function() {
      return testKeys.slice();
    }
  };
})();

// 测试执行函数
function runStorageCapacityTest() {
  console.log('=== 开始存储容量极限测试 ===');
  
  // 监听事件
  StorageCapacityTester.on('warningThreshold', function(info) {
    console.log('%c[警告阈值] 存储使用率: ' + (info.usageRatio * 100).toFixed(2) + '%', 'color: orange; font-weight: bold');
  });
  
  StorageCapacityTester.on('autoClearThreshold', function(info) {
    console.log('%c[自动清理阈值] 存储使用率: ' + (info.usageRatio * 100).toFixed(2) + '%', 'color: orange; font-weight: bold');
  });
  
  StorageCapacityTester.on('criticalThreshold', function(info) {
    console.log('%c[紧急阈值] 存储使用率: ' + (info.usageRatio * 100).toFixed(2) + '%', 'color: red; font-weight: bold');
  });
  
  // 初始化测试
  StorageCapacityTester.init()
    .then(function() {
      // 可以根据需要选择运行单轮极限测试或循环测试
      // return StorageCapacityTester.testStorageLimit();
      return StorageCapacityTester.runCycleTest(3); // 运行3轮循环测试
    })
    .then(function(results) {
      console.log('测试完成，最终结果:', results);
      console.log('=== 存储容量测试结束 ===');
    })
    .catch(function(error) {
      console.error('测试过程出错:', error);
    });
}

// 导出测试对象和执行函数
module.exports = {
  StorageCapacityTester: StorageCapacityTester,
  runStorageCapacityTest: runStorageCapacityTest
};

// 如果在控制台直接执行，则自动启动测试
if (typeof window !== 'undefined' && window.wx) {
  console.log('检测到微信环境，自动启动测试...');
  runStorageCapacityTest();
} 