/**
 * 照片采集功能模糊测试脚本
 * 通过随机和异常输入测试系统的稳定性和错误处理能力
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// 模拟微信小程序环境
require('../utils/mock-wx-env');
const { mockWxApi } = require('../utils/mock-wx-api');

// 测试配置
const CONFIG = {
  testCases: 100, // 执行的测试用例数量
  seed: Date.now(), // 随机种子，固定后可重现测试结果
  reportPath: path.resolve(__dirname, '../test-reports/fuzz-tests')
};

// 确保测试报告目录存在
if (!fs.existsSync(CONFIG.reportPath)) {
  fs.mkdirSync(CONFIG.reportPath, { recursive: true });
}

// 测试结果存储
const testResults = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  errors: [],
  startTime: Date.now(),
  endTime: null,
  seed: CONFIG.seed
};

/**
 * 运行模糊测试
 */
async function runFuzzTests() {
  logger.info(`开始照片采集功能模糊测试，种子: ${CONFIG.seed}`);
  
  try {
    // 设置随机种子
    Math.seedrandom = require('seedrandom');
    Math.random = Math.seedrandom(CONFIG.seed.toString());
    
    // 加载目标模块
    const PhotoService = require('../../miniprogram/services/photoService');
    const TaskManager = require('../../miniprogram/utils/task-manager');
    const UploadManager = require('../../miniprogram/utils/upload-manager');
    
    // 模拟服务容器
    const mockContainer = getMockServiceContainer();
    
    // 初始化服务
    PhotoService.init(mockContainer);
    
    // 执行测试用例
    await testPhotoCapture(PhotoService);
    await testPhotoProcessing(PhotoService);
    await testPhotoUpload(PhotoService, TaskManager, UploadManager);
    
    // 记录测试完成时间
    testResults.endTime = Date.now();
    
    // 生成报告
    generateReport();
    
    logger.info(`模糊测试完成：总计 ${testResults.totalTests} 个测试，通过 ${testResults.passed} 个，失败 ${testResults.failed} 个`);
    
    return testResults;
  } catch (error) {
    logger.error('模糊测试执行失败:', error);
    testResults.errors.push({
      phase: 'test_initialization',
      error: error.message,
      stack: error.stack
    });
    
    testResults.endTime = Date.now();
    generateReport();
    
    throw error;
  }
}

/**
 * 测试照片拍摄功能
 */
async function testPhotoCapture(PhotoService) {
  logger.info('测试照片拍摄功能的模糊输入处理');
  
  const testCases = [
    // 标准测试 - 正常情况
    { 
      name: 'normal_photo_capture', 
      options: { count: 1, camera: 'back' },
      mockSuccess: true,
      expectError: false
    },
    
    // 异常输入测试
    { 
      name: 'invalid_count_negative', 
      options: { count: -5, camera: 'back' },
      mockSuccess: true,
      expectError: false // 应该使用默认值而非报错
    },
    { 
      name: 'invalid_count_zero', 
      options: { count: 0, camera: 'back' },
      mockSuccess: true,
      expectError: false // 应该使用默认值而非报错
    },
    { 
      name: 'invalid_count_string', 
      options: { count: 'two', camera: 'back' },
      mockSuccess: true,
      expectError: false // 应该尝试转换或使用默认值
    },
    { 
      name: 'invalid_camera_value', 
      options: { count: 1, camera: 'invalid_camera' },
      mockSuccess: true,
      expectError: false // 应该使用默认相机
    },
    { 
      name: 'null_options', 
      options: null,
      mockSuccess: true,
      expectError: false // 应该使用默认值
    },
    { 
      name: 'empty_options', 
      options: {},
      mockSuccess: true,
      expectError: false // 应该使用默认值
    },
    
    // 错误处理测试
    { 
      name: 'api_permission_denied', 
      options: { count: 1, camera: 'back' },
      mockSuccess: false,
      mockError: { errMsg: 'chooseMedia:fail auth deny' },
      expectError: true
    },
    { 
      name: 'api_system_error', 
      options: { count: 1, camera: 'back' },
      mockSuccess: false,
      mockError: { errMsg: 'chooseMedia:fail system error' },
      expectError: true
    },
    { 
      name: 'api_cancel', 
      options: { count: 1, camera: 'back' },
      mockSuccess: false,
      mockError: { errMsg: 'chooseMedia:fail cancel' },
      expectError: true
    }
  ];
  
  // 添加随机测试用例
  for (let i = 0; i < 10; i++) {
    testCases.push({
      name: `random_photo_capture_${i}`,
      options: {
        count: Math.floor(Math.random() * 20) - 5, // 有时为负数
        camera: Math.random() > 0.5 ? 'back' : Math.random() > 0.5 ? 'front' : `random_${i}`
      },
      mockSuccess: Math.random() > 0.3, // 70%成功率
      mockError: { errMsg: `chooseMedia:fail random error ${i}` },
      expectError: Math.random() > 0.3 // 预期错误率
    });
  }
  
  // 执行测试用例
  for (const testCase of testCases) {
    testResults.totalTests++;
    
    try {
      // 设置模拟API行为
      mockWxApi('chooseMedia', testCase.mockSuccess, testCase.mockError, {
        tempFiles: [{
          tempFilePath: `/tmp/fuzz_test_${testCase.name}.jpg`,
          size: Math.floor(Math.random() * 1024 * 1024 * 5) // 最大5MB
        }]
      });
      
      // 执行测试
      let result = null;
      let hasError = false;
      
      try {
        result = await PhotoService.takePhoto(testCase.options);
      } catch (e) {
        hasError = true;
        if (!testCase.expectError) {
          throw e; // 不期望错误但发生了错误
        }
      }
      
      // 验证结果
      if (testCase.expectError && !hasError) {
        throw new Error(`Expected error but none occurred in test case ${testCase.name}`);
      }
      
      if (!testCase.expectError) {
        // 验证结果格式
        if (!result || !Array.isArray(result)) {
          throw new Error(`Invalid result format: expected array but got ${typeof result}`);
        }
        
        if (testCase.mockSuccess && result.length === 0) {
          throw new Error(`Expected photos but got empty array in test case ${testCase.name}`);
        }
      }
      
      // 测试通过
      logger.info(`✓ 测试通过: ${testCase.name}`);
      testResults.passed++;
    } catch (error) {
      // 测试失败
      logger.error(`✗ 测试失败: ${testCase.name} - ${error.message}`);
      testResults.failed++;
      testResults.errors.push({
        phase: 'photo_capture',
        testCase: testCase.name,
        error: error.message,
        stack: error.stack
      });
    }
  }
}

/**
 * 测试照片处理功能
 */
async function testPhotoProcessing(PhotoService) {
  logger.info('测试照片处理功能的异常输入');
  
  const testCases = [
    // 空输入测试
    {
      name: 'process_empty_array',
      photos: [],
      expectError: false
    },
    {
      name: 'process_null_input',
      photos: null,
      expectError: false
    },
    {
      name: 'process_undefined_input',
      photos: undefined,
      expectError: false
    },
    
    // 异常照片数据测试
    {
      name: 'invalid_photo_no_path',
      photos: [{ id: 'photo_no_path', size: 1024, createdAt: new Date().toISOString() }],
      expectError: true
    },
    {
      name: 'invalid_photo_empty_path',
      photos: [{ id: 'photo_empty_path', path: '', size: 1024, createdAt: new Date().toISOString() }],
      expectError: true
    },
    {
      name: 'photo_with_invalid_size',
      photos: [{ id: 'photo_negative_size', path: '/tmp/photo.jpg', size: -1024, createdAt: new Date().toISOString() }],
      expectError: false // 应该处理负数大小而非报错
    },
    {
      name: 'photo_with_string_size',
      photos: [{ id: 'photo_string_size', path: '/tmp/photo.jpg', size: 'large', createdAt: new Date().toISOString() }],
      expectError: false // 应该尝试转换或使用默认值
    },
    {
      name: 'photo_without_id',
      photos: [{ path: '/tmp/photo_no_id.jpg', size: 1024, createdAt: new Date().toISOString() }],
      expectError: false // 应该生成ID
    },
    
    // 混合有效和无效数据
    {
      name: 'mixed_valid_invalid_photos',
      photos: [
        { id: 'valid_photo', path: '/tmp/valid_photo.jpg', size: 1024, createdAt: new Date().toISOString() },
        { id: 'invalid_photo', size: 2048, createdAt: new Date().toISOString() } // 缺少path
      ],
      expectError: false // 应该处理有效照片并跳过无效照片
    }
  ];
  
  // 添加随机测试用例
  for (let i = 0; i < 10; i++) {
    const randomPhotos = [];
    const photoCount = Math.floor(Math.random() * 5) + 1;
    
    for (let j = 0; j < photoCount; j++) {
      const hasPath = Math.random() > 0.2; // 80%有路径
      const hasId = Math.random() > 0.2; // 80%有ID
      const hasValidSize = Math.random() > 0.2; // 80%有有效大小
      
      const photo = {};
      if (hasId) photo.id = `random_photo_${i}_${j}`;
      if (hasPath) photo.path = `/tmp/random_photo_${i}_${j}.jpg`;
      if (hasValidSize) {
        photo.size = Math.floor(Math.random() * 1024 * 1024 * 10); // 最大10MB
      } else {
        // 无效大小
        const sizeTypes = ['negative', 'string', 'null', 'object'];
        const sizeType = sizeTypes[Math.floor(Math.random() * sizeTypes.length)];
        
        switch (sizeType) {
          case 'negative':
            photo.size = -Math.floor(Math.random() * 1024 * 1024);
            break;
          case 'string':
            photo.size = 'about 5 megabytes';
            break;
          case 'null':
            photo.size = null;
            break;
          case 'object':
            photo.size = { value: Math.floor(Math.random() * 1024 * 1024) };
            break;
        }
      }
      
      photo.createdAt = new Date().toISOString();
      randomPhotos.push(photo);
    }
    
    testCases.push({
      name: `random_photo_processing_${i}`,
      photos: randomPhotos,
      expectError: Math.random() > 0.7 // 30%预期错误率
    });
  }
  
  // 执行测试用例
  for (const testCase of testCases) {
    testResults.totalTests++;
    
    try {
      // 设置模拟
      mockWxApi('copyFile', true, null, {});
      mockWxApi('compressImage', true, null, { tempFilePath: `/tmp/compressed_${Date.now()}.jpg` });
      
      // 执行测试
      let result = null;
      let hasError = false;
      
      try {
        result = await PhotoService.savePhotos(testCase.photos);
      } catch (e) {
        hasError = true;
        if (!testCase.expectError) {
          throw e; // 不期望错误但发生了错误
        }
      }
      
      // 验证结果
      if (testCase.expectError && !hasError) {
        throw new Error(`Expected error but none occurred in test case ${testCase.name}`);
      }
      
      if (!testCase.expectError) {
        // 验证结果格式
        if (!result || !Array.isArray(result)) {
          throw new Error(`Invalid result format: expected array but got ${typeof result}`);
        }
      }
      
      // 测试通过
      logger.info(`✓ 测试通过: ${testCase.name}`);
      testResults.passed++;
    } catch (error) {
      // 测试失败
      logger.error(`✗ 测试失败: ${testCase.name} - ${error.message}`);
      testResults.failed++;
      testResults.errors.push({
        phase: 'photo_processing',
        testCase: testCase.name,
        error: error.message,
        stack: error.stack
      });
    }
  }
}

/**
 * 测试照片上传功能
 */
async function testPhotoUpload(PhotoService, TaskManager, UploadManager) {
  logger.info('测试照片上传功能的异常处理');
  
  const testCases = [
    // 空输入测试
    {
      name: 'upload_empty_id',
      photoIds: '',
      options: {},
      expectError: false
    },
    {
      name: 'upload_null_id',
      photoIds: null,
      options: {},
      expectError: false
    },
    {
      name: 'upload_undefined_id',
      photoIds: undefined,
      options: {},
      expectError: false
    },
    
    // 无效ID测试
    {
      name: 'upload_non_existent_id',
      photoIds: 'non_existent_photo_id',
      options: {},
      photoExists: false,
      expectError: false // 应该优雅处理而非报错
    },
    
    // 有效ID测试
    {
      name: 'upload_valid_id',
      photoIds: 'valid_photo_id',
      options: { priority: 5 },
      photoExists: true,
      photoData: {
        id: 'valid_photo_id',
        path: '/tmp/valid_photo.jpg',
        size: 1024 * 1024,
        createdAt: new Date().toISOString()
      },
      expectError: false
    },
    
    // 异常选项测试
    {
      name: 'upload_with_negative_priority',
      photoIds: 'valid_photo_id',
      options: { priority: -10 },
      photoExists: true,
      photoData: {
        id: 'valid_photo_id',
        path: '/tmp/valid_photo.jpg',
        size: 1024 * 1024,
        createdAt: new Date().toISOString()
      },
      expectError: false // 应该使用默认优先级
    },
    {
      name: 'upload_with_string_priority',
      photoIds: 'valid_photo_id',
      options: { priority: 'high' },
      photoExists: true,
      photoData: {
        id: 'valid_photo_id',
        path: '/tmp/valid_photo.jpg',
        size: 1024 * 1024,
        createdAt: new Date().toISOString()
      },
      expectError: false // 应该尝试转换或使用默认值
    },
    
    // 网络错误测试
    {
      name: 'upload_network_error',
      photoIds: 'valid_photo_id',
      options: {},
      photoExists: true,
      photoData: {
        id: 'valid_photo_id',
        path: '/tmp/valid_photo.jpg',
        size: 1024 * 1024,
        createdAt: new Date().toISOString()
      },
      simulateNetworkError: true,
      expectError: false // 应该捕获并处理网络错误
    }
  ];
  
  // 添加随机测试用例
  for (let i = 0; i < 10; i++) {
    const useArray = Math.random() > 0.5;
    const photoCount = Math.floor(Math.random() * 5) + 1;
    let photoIds;
    
    if (useArray) {
      photoIds = [];
      for (let j = 0; j < photoCount; j++) {
        photoIds.push(`random_photo_id_${i}_${j}`);
      }
    } else {
      photoIds = `random_photo_id_${i}_0`;
    }
    
    testCases.push({
      name: `random_photo_upload_${i}`,
      photoIds: photoIds,
      options: {
        priority: Math.floor(Math.random() * 20) - 5 // 有时为负数
      },
      photoExists: Math.random() > 0.3, // 70%存在照片
      photoData: {
        id: useArray ? photoIds[0] : photoIds,
        path: `/tmp/random_upload_photo_${i}.jpg`,
        size: Math.floor(Math.random() * 1024 * 1024 * 10),
        createdAt: new Date().toISOString()
      },
      simulateNetworkError: Math.random() > 0.7, // 30%模拟网络错误
      expectError: Math.random() > 0.8 // 20%预期错误率
    });
  }
  
  // 执行测试用例
  for (const testCase of testCases) {
    testResults.totalTests++;
    
    try {
      // 设置模拟存储服务行为
      const mockStorageService = {
        getItem: jest.fn().mockImplementation((collection, id) => {
          if (collection === 'photos' && testCase.photoExists) {
            if (Array.isArray(testCase.photoIds) && testCase.photoIds.includes(id)) {
              return Promise.resolve(testCase.photoData);
            } else if (id === testCase.photoIds) {
              return Promise.resolve(testCase.photoData);
            }
          }
          return Promise.resolve(null);
        }),
        saveItem: jest.fn().mockResolvedValue(true)
      };
      
      // 更新模拟服务容器
      const container = getMockServiceContainer();
      container.get = jest.fn().mockImplementation(service => {
        if (service === 'storageService') {
          return mockStorageService;
        }
        return null;
      });
      
      // 重新初始化服务
      PhotoService.container = container;
      
      // 模拟上传管理器
      if (testCase.simulateNetworkError) {
        UploadManager.uploadPhoto = jest.fn().mockRejectedValue(new Error('Network error'));
      } else {
        UploadManager.uploadPhoto = jest.fn().mockResolvedValue({ taskId: `task_${Date.now()}` });
      }
      
      // 执行测试
      let result = null;
      let hasError = false;
      
      try {
        result = await PhotoService.uploadPhotos(testCase.photoIds, testCase.options);
      } catch (e) {
        hasError = true;
        if (!testCase.expectError) {
          throw e; // 不期望错误但发生了错误
        }
      }
      
      // 验证结果
      if (testCase.expectError && !hasError) {
        throw new Error(`Expected error but none occurred in test case ${testCase.name}`);
      }
      
      if (!testCase.expectError) {
        // 验证结果格式
        if (!result || !Array.isArray(result)) {
          throw new Error(`Invalid result format: expected array but got ${typeof result}`);
        }
      }
      
      // 测试通过
      logger.info(`✓ 测试通过: ${testCase.name}`);
      testResults.passed++;
    } catch (error) {
      // 测试失败
      logger.error(`✗ 测试失败: ${testCase.name} - ${error.message}`);
      testResults.failed++;
      testResults.errors.push({
        phase: 'photo_upload',
        testCase: testCase.name,
        error: error.message,
        stack: error.stack
      });
    }
  }
}

/**
 * 获取模拟服务容器
 */
function getMockServiceContainer() {
  const mockStorageService = {
    saveItem: jest.fn().mockResolvedValue(true),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(true),
    getCollection: jest.fn().mockResolvedValue([])
  };
  
  return {
    get: jest.fn().mockImplementation(service => {
      if (service === 'storageService') {
        return mockStorageService;
      }
      return null;
    })
  };
}

/**
 * 生成测试报告
 */
function generateReport() {
  const reportPath = path.join(CONFIG.reportPath, 'fuzz-report.json');
  const htmlReportPath = path.join(CONFIG.reportPath, 'fuzz-report.html');
  
  // 保存JSON报告
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  
  // 生成HTML报告
  const htmlReport = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>照片采集功能模糊测试报告</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 20px; }
    .summary { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .error-details { margin-top: 20px; }
    .error { background-color: #f2dede; border: 1px solid #ebccd1; padding: 10px; margin-bottom: 10px; border-radius: 5px; }
    .timestamp { color: #777; font-size: 0.8em; }
    pre { background-color: #f8f8f8; padding: 10px; border-radius: 3px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="header">
    <h1>照片采集功能模糊测试报告</h1>
    <p class="timestamp">生成时间: ${new Date().toLocaleString()}</p>
  </div>
  
  <div class="summary">
    <h2>测试摘要</h2>
    <p>总计测试: ${testResults.totalTests}</p>
    <p>通过: ${testResults.passed}</p>
    <p>失败: ${testResults.failed}</p>
    <p>测试种子: ${testResults.seed}</p>
    <p>运行时间: ${((testResults.endTime - testResults.startTime) / 1000).toFixed(2)}秒</p>
  </div>
  
  <div class="error-details">
    <h2>错误详情 (${testResults.errors.length})</h2>
    ${testResults.errors.map((error, index) => `
      <div class="error">
        <h3>错误 #${index + 1} - ${error.phase} ${error.testCase ? ': ' + error.testCase : ''}</h3>
        <p>${error.error}</p>
        <pre>${error.stack}</pre>
      </div>
    `).join('')}
  </div>
</body>
</html>
  `;
  
  fs.writeFileSync(htmlReportPath, htmlReport);
  logger.info(`测试报告已保存至 ${reportPath} 和 ${htmlReportPath}`);
}

// 如果直接运行此脚本，执行测试
if (require.main === module) {
  runFuzzTests()
    .then(() => process.exit(testResults.failed > 0 ? 1 : 0))
    .catch(error => {
      console.error('测试执行失败:', error);
      process.exit(1);
    });
}

module.exports = {
  runFuzzTests
}; 