/**
 * 照片处理性能测试脚本
 * 测试大量照片处理和上传的性能表现
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// 引入模拟环境
require('../utils/mock-wx-env');
const { mockWxApi, restoreAllWxApis } = require('../utils/mock-wx-api');

// 测试配置
const CONFIG = {
  photoCount: {
    small: 10,     // 小规模测试：10张照片
    medium: 50,    // 中规模测试：50张照片
    large: 200     // 大规模测试：200张照片
  },
  photoSize: {
    small: 100 * 1024,      // 小照片：100KB
    medium: 1024 * 1024,    // 中等照片：1MB
    large: 5 * 1024 * 1024  // 大照片：5MB
  },
  reportPath: path.resolve(__dirname, '../test-reports/performance')
};

// 确保测试报告目录存在
if (!fs.existsSync(CONFIG.reportPath)) {
  fs.mkdirSync(CONFIG.reportPath, { recursive: true });
}

// 测试结果
const testResults = {
  tests: [],
  summary: {
    totalTests: 0,
    passedThreshold: 0,
    failedThreshold: 0
  },
  startTime: new Date(),
  endTime: null
};

/**
 * 运行性能测试
 */
async function runPerformanceTests() {
  logger.info('开始照片处理和上传性能测试');
  
  try {
    // 加载测试模块
    const PhotoService = require('../../miniprogram/services/photoService');
    const TaskManager = require('../../miniprogram/utils/task-manager');
    const UploadManager = require('../../miniprogram/utils/upload-manager');
    
    // 创建模拟服务容器
    const mockContainer = createMockServiceContainer();
    
    // 初始化服务
    PhotoService.init(mockContainer);
    
    // 运行测试用例
    await testPhotoProcessingPerformance(PhotoService);
    await testPhotoUploadPerformance(PhotoService, UploadManager);
    await testMemoryManagementPerformance(PhotoService);
    
    // 记录测试结束时间
    testResults.endTime = new Date();
    
    // 生成报告
    generateReport();
    
    // 输出测试摘要
    logger.info('性能测试完成: 共 ' + testResults.summary.totalTests + 
               ' 项, 通过阈值: ' + testResults.summary.passedThreshold + 
               ', 未通过阈值: ' + testResults.summary.failedThreshold);
    
    return testResults;
  } catch (error) {
    logger.error('性能测试执行错误:', error);
    throw error;
  } finally {
    // 恢复所有模拟的API
    restoreAllWxApis();
  }
}

/**
 * 测试照片处理性能
 */
async function testPhotoProcessingPerformance(PhotoService) {
  logger.info('测试照片处理性能');
  
  const testCases = [
    // 测试小规模、小尺寸照片处理性能
    {
      name: '小规模小尺寸照片处理',
      count: CONFIG.photoCount.small,
      size: CONFIG.photoSize.small,
      threshold: 500 // 期望处理时间阈值（毫秒）
    },
    // 测试中等规模、中等尺寸照片处理性能
    {
      name: '中规模中等尺寸照片处理',
      count: CONFIG.photoCount.medium,
      size: CONFIG.photoSize.medium,
      threshold: 2000 // 期望处理时间阈值（毫秒）
    },
    // 测试大规模、小尺寸照片处理性能
    {
      name: '大规模小尺寸照片处理',
      count: CONFIG.photoCount.large,
      size: CONFIG.photoSize.small,
      threshold: 4000 // 期望处理时间阈值（毫秒）
    }
  ];
  
  for (const testCase of testCases) {
    testResults.summary.totalTests++;
    
    try {
      // 准备测试数据
      const photos = generateMockPhotos(testCase.count, testCase.size);
      
      // 模拟wx.copyFile和wx.compressImage的行为，确保异步调用能正确返回
      mockWxApi('copyFile', true, null, {});
      mockWxApi('compressImage', true, null, { tempFilePath: '/tmp/compressed.jpg' });
      
      // 记录开始时间
      const startTime = Date.now();
      
      // 执行照片保存处理
      await PhotoService.savePhotos(photos);
      
      // 计算处理时间
      const processingTime = Date.now() - startTime;
      
      // 验证是否满足性能阈值
      const passed = processingTime <= testCase.threshold;
      
      if (passed) {
        testResults.summary.passedThreshold++;
        logger.success(`[${testCase.name}] 处理时间: ${processingTime}ms, 符合阈值: ${testCase.threshold}ms`);
      } else {
        testResults.summary.failedThreshold++;
        logger.error(`[${testCase.name}] 处理时间: ${processingTime}ms, 超出阈值: ${testCase.threshold}ms`);
      }
      
      // 记录测试结果
      testResults.tests.push({
        name: testCase.name,
        category: '照片处理',
        count: testCase.count,
        size: testCase.size,
        processingTime: processingTime,
        threshold: testCase.threshold,
        passed: passed
      });
    } catch (error) {
      logger.error(`[${testCase.name}] 测试执行错误:`, error);
      
      testResults.summary.failedThreshold++;
      testResults.tests.push({
        name: testCase.name,
        category: '照片处理',
        count: testCase.count,
        size: testCase.size,
        processingTime: -1,
        threshold: testCase.threshold,
        passed: false,
        error: error.message
      });
    }
  }
}

/**
 * 测试照片上传性能
 */
async function testPhotoUploadPerformance(PhotoService, UploadManager) {
  logger.info('测试照片上传性能');
  
  const testCases = [
    // 测试小规模照片上传性能
    {
      name: '小规模照片上传',
      count: 5,
      threshold: 1000 // 期望上传时间阈值（毫秒）
    },
    // 测试并发上传性能
    {
      name: '并发照片上传',
      count: 10,
      concurrent: true,
      threshold: 2000 // 期望上传时间阈值（毫秒）
    }
  ];
  
  for (const testCase of testCases) {
    testResults.summary.totalTests++;
    
    try {
      // 准备测试数据
      const photoIds = [];
      const mockStorageService = createMockStorageService();
      
      // 为每个照片ID创建模拟数据
      for (let i = 0; i < testCase.count; i++) {
        const photoId = `test_photo_${i}`;
        photoIds.push(photoId);
        
        // 在存储服务中添加照片数据
        mockStorageService.mockPhotoData[photoId] = {
          id: photoId,
          path: `/tmp/test_photo_${i}.jpg`,
          size: 1024 * 1024,
          createdAt: new Date().toISOString()
        };
      }
      
      // 模拟上传API，使其在100ms内完成
      mockWxApi('uploadFile', true, null, {
        statusCode: 200,
        data: JSON.stringify({ url: 'https://example.com/uploaded.jpg' })
      });
      
      // 替换上传函数
      const originalUploadPhoto = UploadManager.uploadPhoto;
      UploadManager.uploadPhoto = function(fileInfo) {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ taskId: 'task_' + Date.now() });
          }, 50);
        });
      };
      
      // 记录开始时间
      const startTime = Date.now();
      
      // 执行上传，根据测试用例决定是否并发
      if (testCase.concurrent) {
        // 并发上传
        await Promise.all(photoIds.map(id => PhotoService.uploadPhotos(id)));
      } else {
        // 顺序上传
        for (const id of photoIds) {
          await PhotoService.uploadPhotos(id);
        }
      }
      
      // 计算上传时间
      const uploadTime = Date.now() - startTime;
      
      // 恢复原始上传函数
      UploadManager.uploadPhoto = originalUploadPhoto;
      
      // 验证是否满足性能阈值
      const passed = uploadTime <= testCase.threshold;
      
      if (passed) {
        testResults.summary.passedThreshold++;
        logger.success(`[${testCase.name}] 上传时间: ${uploadTime}ms, 符合阈值: ${testCase.threshold}ms`);
      } else {
        testResults.summary.failedThreshold++;
        logger.error(`[${testCase.name}] 上传时间: ${uploadTime}ms, 超出阈值: ${testCase.threshold}ms`);
      }
      
      // 记录测试结果
      testResults.tests.push({
        name: testCase.name,
        category: '照片上传',
        count: testCase.count,
        concurrent: testCase.concurrent || false,
        uploadTime: uploadTime,
        threshold: testCase.threshold,
        passed: passed
      });
    } catch (error) {
      logger.error(`[${testCase.name}] 测试执行错误:`, error);
      
      testResults.summary.failedThreshold++;
      testResults.tests.push({
        name: testCase.name,
        category: '照片上传',
        count: testCase.count,
        uploadTime: -1,
        threshold: testCase.threshold,
        passed: false,
        error: error.message
      });
    }
  }
}

/**
 * 测试内存管理性能
 */
async function testMemoryManagementPerformance(PhotoService) {
  logger.info('测试内存管理性能');
  
  const testCases = [
    // 测试缓存统计性能
    {
      name: '缓存统计性能',
      threshold: 50 // 期望统计时间阈值（毫秒）
    },
    // 测试缓存清理性能
    {
      name: '缓存清理性能',
      itemCount: 100, // 清理的项目数
      threshold: 100 // 期望清理时间阈值（毫秒）
    }
  ];
  
  for (const testCase of testCases) {
    testResults.summary.totalTests++;
    
    try {
      // 根据测试用例类型执行不同的测试
      let executionTime = 0;
      
      if (testCase.name === '缓存统计性能') {
        // 测试缓存统计
        const startTime = Date.now();
        
        // 调用多次统计，计算平均性能
        for (let i = 0; i < 100; i++) {
          PhotoService.getMemoryStats();
        }
        
        executionTime = (Date.now() - startTime) / 100; // 计算平均执行时间
      } else {
        // 测试缓存清理
        const startTime = Date.now();
        
        await PhotoService.cleanupCache();
        
        executionTime = Date.now() - startTime;
      }
      
      // 验证是否满足性能阈值
      const passed = executionTime <= testCase.threshold;
      
      if (passed) {
        testResults.summary.passedThreshold++;
        logger.success(`[${testCase.name}] 执行时间: ${executionTime}ms, 符合阈值: ${testCase.threshold}ms`);
      } else {
        testResults.summary.failedThreshold++;
        logger.error(`[${testCase.name}] 执行时间: ${executionTime}ms, 超出阈值: ${testCase.threshold}ms`);
      }
      
      // 记录测试结果
      testResults.tests.push({
        name: testCase.name,
        category: '内存管理',
        executionTime: executionTime,
        threshold: testCase.threshold,
        passed: passed
      });
    } catch (error) {
      logger.error(`[${testCase.name}] 测试执行错误:`, error);
      
      testResults.summary.failedThreshold++;
      testResults.tests.push({
        name: testCase.name,
        category: '内存管理',
        executionTime: -1,
        threshold: testCase.threshold,
        passed: false,
        error: error.message
      });
    }
  }
}

/**
 * 生成模拟照片数据
 * @param {number} count 照片数量
 * @param {number} size 照片大小
 * @returns {Array} 模拟照片数组
 */
function generateMockPhotos(count, size) {
  const photos = [];
  
  for (let i = 0; i < count; i++) {
    photos.push({
      id: 'photo_' + Date.now() + '_' + i,
      path: '/tmp/mock_photo_' + i + '.jpg',
      size: size,
      type: 'image',
      createdAt: new Date().toISOString()
    });
  }
  
  return photos;
}

/**
 * 创建模拟存储服务
 * @returns {object} 模拟存储服务
 */
function createMockStorageService() {
  const mockPhotoData = {};
  
  return {
    mockPhotoData: mockPhotoData,
    saveItem: function(collection, id, item) {
      if (collection === 'photos') {
        mockPhotoData[id] = item;
      }
      return Promise.resolve(true);
    },
    getItem: function(collection, id) {
      if (collection === 'photos' && mockPhotoData[id]) {
        return Promise.resolve(mockPhotoData[id]);
      }
      return Promise.resolve(null);
    },
    removeItem: function(collection, id) {
      if (collection === 'photos' && mockPhotoData[id]) {
        delete mockPhotoData[id];
      }
      return Promise.resolve(true);
    },
    getCollection: function(collection) {
      if (collection === 'photos') {
        return Promise.resolve(Object.values(mockPhotoData));
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
 * 生成性能测试报告
 */
function generateReport() {
  const reportPath = path.join(CONFIG.reportPath, 'performance-report.json');
  const htmlReportPath = path.join(CONFIG.reportPath, 'performance-report.html');
  
  // 添加汇总数据
  testResults.summary.totalTime = testResults.endTime - testResults.startTime;
  testResults.summary.averageTime = testResults.tests.reduce((sum, test) => {
    // 根据测试类型选择时间字段
    const time = test.processingTime || test.uploadTime || test.executionTime || 0;
    return sum + time;
  }, 0) / testResults.tests.length;
  
  // 保存JSON报告
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  
  // 生成HTML报告
  const htmlReport = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>照片服务性能测试报告</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 20px; }
    .summary { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .test-results { margin-top: 20px; }
    .category { margin-bottom: 20px; }
    .test-case { margin-bottom: 10px; padding: 10px; border-radius: 5px; }
    .passed { background-color: #dff0d8; border: 1px solid #d6e9c6; }
    .failed { background-color: #f2dede; border: 1px solid #ebccd1; }
    .timestamp { color: #777; font-size: 0.8em; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <div class="header">
    <h1>照片服务性能测试报告</h1>
    <p class="timestamp">生成时间: ${new Date().toLocaleString()}</p>
  </div>
  
  <div class="summary">
    <h2>测试摘要</h2>
    <p>开始时间: ${testResults.startTime.toLocaleString()}</p>
    <p>结束时间: ${testResults.endTime.toLocaleString()}</p>
    <p>总测试时间: ${(testResults.summary.totalTime / 1000).toFixed(2)} 秒</p>
    <p>测试用例数: ${testResults.summary.totalTests}</p>
    <p>通过阈值: ${testResults.summary.passedThreshold}</p>
    <p>未通过阈值: ${testResults.summary.failedThreshold}</p>
    <p>平均执行时间: ${testResults.summary.averageTime.toFixed(2)} 毫秒</p>
  </div>
  
  <div class="test-results">
    <h2>测试详情</h2>
    
    <h3>照片处理性能</h3>
    <table>
      <tr>
        <th>测试名称</th>
        <th>照片数量</th>
        <th>照片大小</th>
        <th>处理时间</th>
        <th>阈值</th>
        <th>结果</th>
      </tr>
      ${testResults.tests.filter(test => test.category === '照片处理').map(test => `
        <tr class="${test.passed ? 'passed' : 'failed'}">
          <td>${test.name}</td>
          <td>${test.count}</td>
          <td>${formatBytes(test.size)}</td>
          <td>${test.processingTime} ms</td>
          <td>${test.threshold} ms</td>
          <td>${test.passed ? '通过' : '未通过'}</td>
        </tr>
      `).join('')}
    </table>
    
    <h3>照片上传性能</h3>
    <table>
      <tr>
        <th>测试名称</th>
        <th>照片数量</th>
        <th>并发上传</th>
        <th>上传时间</th>
        <th>阈值</th>
        <th>结果</th>
      </tr>
      ${testResults.tests.filter(test => test.category === '照片上传').map(test => `
        <tr class="${test.passed ? 'passed' : 'failed'}">
          <td>${test.name}</td>
          <td>${test.count}</td>
          <td>${test.concurrent ? '是' : '否'}</td>
          <td>${test.uploadTime} ms</td>
          <td>${test.threshold} ms</td>
          <td>${test.passed ? '通过' : '未通过'}</td>
        </tr>
      `).join('')}
    </table>
    
    <h3>内存管理性能</h3>
    <table>
      <tr>
        <th>测试名称</th>
        <th>执行时间</th>
        <th>阈值</th>
        <th>结果</th>
      </tr>
      ${testResults.tests.filter(test => test.category === '内存管理').map(test => `
        <tr class="${test.passed ? 'passed' : 'failed'}">
          <td>${test.name}</td>
          <td>${test.executionTime} ms</td>
          <td>${test.threshold} ms</td>
          <td>${test.passed ? '通过' : '未通过'}</td>
        </tr>
      `).join('')}
    </table>
  </div>
</body>
</html>
  `;
  
  fs.writeFileSync(htmlReportPath, htmlReport);
  logger.info('性能测试报告已保存到: ' + htmlReportPath);
}

/**
 * 格式化字节大小
 * @param {number} bytes 字节数
 * @returns {string} 格式化后的大小
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 如果直接运行此脚本，执行测试
if (require.main === module) {
  runPerformanceTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('性能测试执行失败:', error);
      process.exit(1);
    });
}

module.exports = {
  runPerformanceTests
}; 