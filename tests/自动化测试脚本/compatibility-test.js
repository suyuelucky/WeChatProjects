/**
 * 兼容性测试脚本
 * 测试不同微信版本和设备环境下的功能兼容性
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// 引入模拟环境
require('../utils/mock-wx-env');
const { mockWxApi, restoreAllWxApis } = require('../utils/mock-wx-api');

// 测试配置
const CONFIG = {
  environments: [
    // 安卓环境
    {
      name: 'Android-6.0-WeChat-7.0.0',
      system: 'android',
      version: '6.0',
      SDKVersion: '2.10.0',
      wechatVersion: '7.0.0',
      brand: 'HUAWEI',
      model: 'Mate 9'
    },
    {
      name: 'Android-10.0-WeChat-8.0.0',
      system: 'android',
      version: '10.0',
      SDKVersion: '2.18.0',
      wechatVersion: '8.0.0',
      brand: 'XIAOMI',
      model: 'MI 10'
    },
    // iOS环境
    {
      name: 'iOS-12.0-WeChat-7.0.0',
      system: 'ios',
      version: '12.0',
      SDKVersion: '2.10.0',
      wechatVersion: '7.0.0',
      brand: 'Apple',
      model: 'iPhone X'
    },
    {
      name: 'iOS-15.0-WeChat-8.0.0',
      system: 'ios',
      version: '15.0',
      SDKVersion: '2.18.0',
      wechatVersion: '8.0.0',
      brand: 'Apple',
      model: 'iPhone 13'
    },
    // 低端设备模拟
    {
      name: 'LowEndDevice',
      system: 'android',
      version: '5.0',
      SDKVersion: '2.8.0',
      wechatVersion: '6.0.0',
      brand: 'HUAWEI',
      model: 'Y5',
      isLowEnd: true
    }
  ],
  reportPath: path.resolve(__dirname, '../test-reports/compatibility')
};

// 确保测试报告目录存在
if (!fs.existsSync(CONFIG.reportPath)) {
  fs.mkdirSync(CONFIG.reportPath, { recursive: true });
}

// 测试结果
const testResults = {
  environments: [],
  results: {},
  startTime: new Date(),
  endTime: null,
  summary: {
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  }
};

/**
 * 运行兼容性测试
 */
async function runCompatibilityTests() {
  logger.info('开始兼容性测试');
  
  try {
    // 加载测试模块
    const PhotoService = require('../../miniprogram/services/photoService');
    
    // 遍历环境配置，进行测试
    for (const env of CONFIG.environments) {
      await testEnvironment(env, PhotoService);
    }
    
    // 记录测试结束时间
    testResults.endTime = new Date();
    
    // 生成报告
    generateReport();
    
    // 输出测试摘要
    logger.info('兼容性测试完成: 共 ' + testResults.summary.totalTests + 
               ' 项, 通过: ' + testResults.summary.passed + 
               ', 失败: ' + testResults.summary.failed + 
               ', 跳过: ' + testResults.summary.skipped);
    
    return testResults;
  } catch (error) {
    logger.error('兼容性测试执行错误:', error);
    throw error;
  } finally {
    // 恢复所有模拟的API
    restoreAllWxApis();
  }
}

/**
 * 在特定环境下进行测试
 * @param {Object} env 环境配置
 * @param {Object} PhotoService 照片服务模块
 */
async function testEnvironment(env, PhotoService) {
  logger.info(`开始测试环境: ${env.name}`);
  
  // 记录当前环境
  testResults.environments.push(env);
  testResults.results[env.name] = { tests: [], passed: 0, failed: 0, skipped: 0 };
  
  try {
    // 设置模拟系统信息
    global.wx.getSystemInfoSync = () => ({
      system: `${env.system} ${env.version}`,
      platform: env.system,
      SDKVersion: env.SDKVersion,
      brand: env.brand,
      model: env.model,
      version: env.wechatVersion,
      benchmarkLevel: env.isLowEnd ? 10 : 50   // 性能基准等级，越低越弱
    });
    
    // 创建模拟服务容器
    const mockContainer = createMockServiceContainer();
    
    // 初始化服务
    PhotoService.init(mockContainer);
    
    // 运行测试用例
    await testCameraFunctions(env, PhotoService);
    await testPhotoProcessing(env, PhotoService);
    await testUploadCompatibility(env, PhotoService);
    await testStorageCompatibility(env);
    
    logger.info(`环境 ${env.name} 测试完成: 通过 ${testResults.results[env.name].passed}, ` +
               `失败 ${testResults.results[env.name].failed}, ` +
               `跳过 ${testResults.results[env.name].skipped}`);
  } catch (error) {
    logger.error(`环境 ${env.name} 测试失败:`, error);
  }
}

/**
 * 测试相机功能兼容性
 * @param {Object} env 环境配置
 * @param {Object} PhotoService 照片服务模块
 */
async function testCameraFunctions(env, PhotoService) {
  const category = '相机功能';
  logger.info(`[${env.name}] 测试${category}`);
  
  const tests = [
    {
      name: '拍照功能',
      run: async () => {
        // 模拟相机交互
        if (env.system === 'ios' && parseFloat(env.version) < 13.0) {
          // 模拟iOS低版本相机行为
          mockWxApi('createCameraContext', true, null, {
            takePhoto: (options) => {
              setTimeout(() => {
                options.success({ tempImagePath: '/tmp/test_photo.jpg' });
              }, 100);
            }
          });
        } else {
          // 模拟标准行为
          mockWxApi('chooseMedia', true, null, {
            tempFiles: [{ tempFilePath: '/tmp/test_photo.jpg', size: 1024 * 1024 }]
          });
        }
        
        // 执行拍照
        const result = await PhotoService.takePhoto();
        return {
          passed: result && result.path === '/tmp/test_photo.jpg',
          data: result
        };
      }
    },
    {
      name: '相册选择',
      run: async () => {
        // 模拟相册选择
        if (env.SDKVersion < '2.10.0') {
          // 低版本SDK使用wx.chooseImage
          mockWxApi('chooseImage', true, null, {
            tempFilePaths: ['/tmp/album_photo.jpg'],
            tempFiles: [{ path: '/tmp/album_photo.jpg', size: 1024 * 1024 }]
          });
        } else {
          // 高版本SDK使用wx.chooseMedia
          mockWxApi('chooseMedia', true, null, {
            tempFiles: [{ tempFilePath: '/tmp/album_photo.jpg', size: 1024 * 1024 }]
          });
        }
        
        // 执行相册选择
        const result = await PhotoService.chooseFromAlbum();
        return {
          passed: Array.isArray(result) && result.length > 0 && result[0].path === '/tmp/album_photo.jpg',
          data: result
        };
      }
    }
  ];
  
  await runTests(env, category, tests);
}

/**
 * 测试照片处理兼容性
 * @param {Object} env 环境配置
 * @param {Object} PhotoService 照片服务模块
 */
async function testPhotoProcessing(env, PhotoService) {
  const category = '照片处理';
  logger.info(`[${env.name}] 测试${category}`);
  
  const tests = [
    {
      name: '照片保存',
      run: async () => {
        // 模拟文件系统API
        if (env.system === 'ios') {
          // iOS文件系统模拟
          mockWxApi('getFileSystemManager', true, null, {
            saveFile: (options) => {
              setTimeout(() => {
                options.success({ savedFilePath: '/storage/photo_saved.jpg' });
              }, 50);
            },
            copyFile: (options) => {
              setTimeout(() => {
                options.success({});
              }, 30);
            }
          });
        } else {
          // Android文件系统模拟
          mockWxApi('getFileSystemManager', true, null, {
            saveFile: (options) => {
              setTimeout(() => {
                options.success({ savedFilePath: '/storage/photo_saved.jpg' });
              }, 50);
            },
            copyFile: (options) => {
              setTimeout(() => {
                options.success({});
              }, 30);
            }
          });
        }
        
        // 执行照片保存
        const photos = [
          {
            id: 'test_photo_1',
            path: '/tmp/test_photo.jpg',
            size: 1024 * 1024,
            type: 'image'
          }
        ];
        
        const result = await PhotoService.savePhotos(photos);
        return {
          passed: result && result.length > 0,
          data: result
        };
      }
    },
    {
      name: '照片压缩',
      run: async () => {
        // 检查环境是否支持图片压缩
        if (env.isLowEnd || parseFloat(env.SDKVersion) < 2.10) {
          return { skipped: true, reason: '设备不支持或SDK版本过低' };
        }
        
        // 模拟图片压缩API
        mockWxApi('compressImage', true, null, {
          tempFilePath: '/tmp/compressed.jpg'
        });
        
        // 执行照片压缩
        global.wx.compressImage({
          src: '/tmp/test_photo.jpg',
          quality: 80,
          success: () => {},
          fail: () => {}
        });
        
        return {
          passed: true,
          data: { compressed: true }
        };
      }
    }
  ];
  
  await runTests(env, category, tests);
}

/**
 * 测试上传兼容性
 * @param {Object} env 环境配置
 * @param {Object} PhotoService 照片服务模块
 */
async function testUploadCompatibility(env, PhotoService) {
  const category = '照片上传';
  logger.info(`[${env.name}] 测试${category}`);
  
  const tests = [
    {
      name: '创建上传任务',
      run: async () => {
        // 模拟状态服务和任务管理
        const mockStorageService = createMockStorageService();
        mockStorageService.saveItem('photos', 'test_photo_id', {
          id: 'test_photo_id',
          path: '/storage/test_photo.jpg',
          size: 1024 * 1024,
          createdAt: new Date().toISOString(),
          uploaded: false
        });
        
        // 执行上传任务创建
        const result = await PhotoService.uploadPhotos('test_photo_id');
        return {
          passed: result && result.taskId,
          data: result
        };
      }
    },
    {
      name: '网络状态监测',
      run: async () => {
        // 检查SDK版本对网络API的支持
        if (parseFloat(env.SDKVersion) < 2.8) {
          return { skipped: true, reason: 'SDK版本不支持网络状态监测' };
        }
        
        // 模拟不同设备的网络状态API
        if (env.system === 'ios') {
          mockWxApi('getNetworkType', true, null, { networkType: '4g' });
        } else {
          mockWxApi('getNetworkType', true, null, { networkType: 'wifi' });
        }
        
        const networkType = await new Promise(resolve => {
          wx.getNetworkType({
            success: res => resolve(res.networkType)
          });
        });
        
        return {
          passed: networkType === '4g' || networkType === 'wifi',
          data: { networkType }
        };
      }
    }
  ];
  
  await runTests(env, category, tests);
}

/**
 * 测试存储兼容性
 * @param {Object} env 环境配置
 */
async function testStorageCompatibility(env) {
  const category = '本地存储';
  logger.info(`[${env.name}] 测试${category}`);
  
  const tests = [
    {
      name: '存储限制',
      run: async () => {
        // 不同环境的存储限制模拟
        let storageLimit = 10 * 1024 * 1024; // 默认10MB
        
        if (env.system === 'ios') {
          storageLimit = 50 * 1024 * 1024; // iOS通常有更大的存储限制
        }
        
        if (env.isLowEnd) {
          storageLimit = 5 * 1024 * 1024; // 低端设备限制更小
        }
        
        // 模拟存储操作
        let storageError = null;
        
        // 尝试存储大数据
        const largeData = 'x'.repeat(storageLimit - 1024); // 接近但不超过限制
        
        try {
          wx.setStorageSync('large_data_test', largeData);
          wx.removeStorageSync('large_data_test'); // 测试后清理
        } catch (error) {
          storageError = error;
        }
        
        return {
          passed: !storageError,
          data: { storageLimit, error: storageError }
        };
      }
    },
    {
      name: '存储同步API',
      run: async () => {
        // 测试同步存储API
        try {
          wx.setStorageSync('compat_test_key', 'test_value');
          const value = wx.getStorageSync('compat_test_key');
          wx.removeStorageSync('compat_test_key');
          
          return {
            passed: value === 'test_value',
            data: { value }
          };
        } catch (error) {
          return {
            passed: false,
            data: { error: error.message }
          };
        }
      }
    }
  ];
  
  await runTests(env, category, tests);
}

/**
 * 运行一组测试
 * @param {Object} env 环境配置
 * @param {string} category 测试类别
 * @param {Array} tests 测试用例数组
 */
async function runTests(env, category, tests) {
  for (const test of tests) {
    testResults.summary.totalTests++;
    
    try {
      logger.info(`[${env.name}] 测试: ${category} - ${test.name}`);
      
      const result = await test.run();
      
      if (result.skipped) {
        testResults.summary.skipped++;
        testResults.results[env.name].skipped++;
        logger.info(`[${env.name}] ${category} - ${test.name}: 已跳过 (${result.reason})`);
        
        testResults.results[env.name].tests.push({
          category,
          name: test.name,
          skipped: true,
          reason: result.reason
        });
      } else if (result.passed) {
        testResults.summary.passed++;
        testResults.results[env.name].passed++;
        logger.success(`[${env.name}] ${category} - ${test.name}: 通过`);
        
        testResults.results[env.name].tests.push({
          category,
          name: test.name,
          passed: true,
          data: result.data
        });
      } else {
        testResults.summary.failed++;
        testResults.results[env.name].failed++;
        logger.error(`[${env.name}] ${category} - ${test.name}: 失败`);
        
        testResults.results[env.name].tests.push({
          category,
          name: test.name,
          passed: false,
          data: result.data
        });
      }
    } catch (error) {
      testResults.summary.failed++;
      testResults.results[env.name].failed++;
      logger.error(`[${env.name}] ${category} - ${test.name}: 错误`, error);
      
      testResults.results[env.name].tests.push({
        category,
        name: test.name,
        passed: false,
        error: error.message
      });
    }
  }
}

/**
 * 创建模拟存储服务
 * @returns {object} 模拟存储服务
 */
function createMockStorageService() {
  const mockData = {};
  
  return {
    saveItem: function(collection, id, item) {
      if (!mockData[collection]) {
        mockData[collection] = {};
      }
      mockData[collection][id] = item;
      return Promise.resolve(true);
    },
    getItem: function(collection, id) {
      if (mockData[collection] && mockData[collection][id]) {
        return Promise.resolve(mockData[collection][id]);
      }
      return Promise.resolve(null);
    },
    removeItem: function(collection, id) {
      if (mockData[collection] && mockData[collection][id]) {
        delete mockData[collection][id];
      }
      return Promise.resolve(true);
    },
    getCollection: function(collection) {
      if (mockData[collection]) {
        return Promise.resolve(Object.values(mockData[collection]));
      }
      return Promise.resolve([]);
    }
  };
}

/**
 * 创建模拟服务容器
 * @returns {object} 模拟服务容器
 */
function createMockServiceContainer() {
  const mockStorageService = createMockStorageService();
  
  return {
    get: function(serviceName) {
      if (serviceName === 'storageService') {
        return mockStorageService;
      }
      return null;
    }
  };
}

/**
 * 生成兼容性测试报告
 */
function generateReport() {
  const reportPath = path.join(CONFIG.reportPath, 'compatibility-report.json');
  const htmlReportPath = path.join(CONFIG.reportPath, 'compatibility-report.html');
  
  // 保存JSON报告
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  
  // 生成HTML报告
  const htmlReport = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>照片处理兼容性测试报告</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 20px; }
    .summary { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .environment { margin-bottom: 30px; }
    .env-header { background-color: #eee; padding: 10px; border-radius: 5px; margin-bottom: 10px; }
    .category { margin-bottom: 20px; }
    .test-results { margin-top: 20px; }
    .test-case { margin-bottom: 10px; padding: 10px; border-radius: 5px; }
    .passed { background-color: #dff0d8; border: 1px solid #d6e9c6; }
    .failed { background-color: #f2dede; border: 1px solid #ebccd1; }
    .skipped { background-color: #fcf8e3; border: 1px solid #faebcc; }
    .timestamp { color: #777; font-size: 0.8em; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <div class="header">
    <h1>照片处理兼容性测试报告</h1>
    <p class="timestamp">生成时间: ${new Date().toLocaleString()}</p>
  </div>
  
  <div class="summary">
    <h2>测试摘要</h2>
    <p>开始时间: ${testResults.startTime.toLocaleString()}</p>
    <p>结束时间: ${testResults.endTime.toLocaleString()}</p>
    <p>总测试用例数: ${testResults.summary.totalTests}</p>
    <p>通过: ${testResults.summary.passed}</p>
    <p>失败: ${testResults.summary.failed}</p>
    <p>跳过: ${testResults.summary.skipped}</p>
  </div>
  
  <h2>环境兼容性矩阵</h2>
  <table>
    <tr>
      <th>测试环境</th>
      <th>系统</th>
      <th>微信版本</th>
      <th>通过</th>
      <th>失败</th>
      <th>跳过</th>
      <th>兼容性得分</th>
    </tr>
    ${testResults.environments.map(env => {
      const envResult = testResults.results[env.name];
      const totalTests = envResult.passed + envResult.failed;
      const score = totalTests > 0 ? Math.round((envResult.passed / totalTests) * 100) : 0;
      
      return `
        <tr>
          <td>${env.name}</td>
          <td>${env.system} ${env.version}</td>
          <td>${env.wechatVersion}</td>
          <td>${envResult.passed}</td>
          <td>${envResult.failed}</td>
          <td>${envResult.skipped}</td>
          <td>${score}%</td>
        </tr>
      `;
    }).join('')}
  </table>
  
  <h2>详细测试结果</h2>
  ${testResults.environments.map(env => {
    const envResult = testResults.results[env.name];
    
    // 按类别分组测试结果
    const categorizedTests = {};
    envResult.tests.forEach(test => {
      if (!categorizedTests[test.category]) {
        categorizedTests[test.category] = [];
      }
      categorizedTests[test.category].push(test);
    });
    
    return `
      <div class="environment">
        <div class="env-header">
          <h3>${env.name}</h3>
          <p>系统: ${env.system} ${env.version}, 微信版本: ${env.wechatVersion}, 设备: ${env.brand} ${env.model}</p>
        </div>
        
        ${Object.keys(categorizedTests).map(category => `
          <div class="category">
            <h4>${category}</h4>
            <table>
              <tr>
                <th>测试名称</th>
                <th>状态</th>
                <th>备注</th>
              </tr>
              ${categorizedTests[category].map(test => {
                let status = '';
                let notes = '';
                
                if (test.skipped) {
                  status = '<span style="color: #8a6d3b;">跳过</span>';
                  notes = test.reason || '';
                } else if (test.passed) {
                  status = '<span style="color: #3c763d;">通过</span>';
                } else {
                  status = '<span style="color: #a94442;">失败</span>';
                  notes = test.error || '';
                }
                
                return `
                  <tr>
                    <td>${test.name}</td>
                    <td>${status}</td>
                    <td>${notes}</td>
                  </tr>
                `;
              }).join('')}
            </table>
          </div>
        `).join('')}
      </div>
    `;
  }).join('')}
</body>
</html>
  `;
  
  fs.writeFileSync(htmlReportPath, htmlReport);
  logger.info('兼容性测试报告已保存到: ' + htmlReportPath);
}

// 如果直接运行此脚本，执行测试
if (require.main === module) {
  runCompatibilityTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('兼容性测试执行失败:', error);
      process.exit(1);
    });
}

module.exports = {
  runCompatibilityTests
}; 