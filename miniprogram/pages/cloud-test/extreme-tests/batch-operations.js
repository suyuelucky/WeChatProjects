/**
 * 云开发极端测试套件 - 批量操作测试
 * 测试云函数和数据库在高并发、大数据量情况下的性能和稳定性
 */

// 获取应用实例
const app = getApp();

// 测试配置
const config = {
  // 批量操作数量（调整此数值可改变测试强度）
  batchSize: 20,
  
  // 并发数（同时进行的操作数量）
  concurrentLimit: 5,
  
  // 单次操作超时时间(ms)
  timeout: 15000,
  
  // 测试文件尺寸（单位：KB，最大10MB）
  fileSize: 200,
  
  // 是否记录详细日志
  verbose: true
};

/**
 * 生成指定大小的测试文件
 * @param {Number} sizeKB 文件大小，单位KB
 * @returns {Promise<String>} 临时文件路径
 */
function generateTestFile(sizeKB) {
  return new Promise((resolve, reject) => {
    try {
      // 限制最大文件大小为10MB
      const size = Math.min(sizeKB, 10240);
      
      // 创建一个临时canvas用于生成图片
      const ctx = wx.createCanvasContext('testCanvas');
      
      // 计算需要的画布大小（假设1KB约等于100x100像素的图片）
      const canvasSize = Math.ceil(Math.sqrt(size * 100));
      
      // 使用随机颜色填充画布以增加数据量
      ctx.fillStyle = `rgb(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255})`;
      ctx.fillRect(0, 0, canvasSize, canvasSize);
      
      // 添加一些随机线条增加复杂度
      for (let i = 0; i < 50; i++) {
        ctx.strokeStyle = `rgb(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255})`;
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvasSize, Math.random() * canvasSize);
        ctx.lineTo(Math.random() * canvasSize, Math.random() * canvasSize);
        ctx.stroke();
      }
      
      // 将Canvas内容保存为临时文件
      ctx.draw(false, () => {
        setTimeout(() => {
          wx.canvasToTempFilePath({
            canvasId: 'testCanvas',
            quality: 0.9,
            success: res => {
              resolve(res.tempFilePath);
            },
            fail: err => {
              console.error('生成测试文件失败', err);
              reject(err);
            }
          });
        }, 500); // 等待绘制完成
      });
    } catch (err) {
      console.error('生成测试文件过程出错', err);
      reject(err);
    }
  });
}

/**
 * 使用Promise.all控制并发数
 * @param {Array} items 要处理的项目数组
 * @param {Function} fn 处理函数
 * @param {Number} concurrentLimit 并发限制
 * @returns {Promise<Array>} 所有结果的数组
 */
async function runWithConcurrencyLimit(items, fn, concurrentLimit) {
  const results = [];
  const executing = new Set();
  
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);
    executing.add(p);
    
    const clean = p.then(() => executing.delete(p));
    
    if (executing.size >= concurrentLimit) {
      await Promise.race(executing);
    }
  }
  
  return Promise.all(results);
}

/**
 * 批量上传文件测试
 */
async function testBatchFileUpload() {
  console.log(`[极端测试] 开始批量上传文件测试，共${config.batchSize}个文件`);
  const startTime = Date.now();
  
  try {
    // 生成测试文件
    const tempFilePath = await generateTestFile(config.fileSize);
    
    // 准备上传任务
    const tasks = Array(config.batchSize).fill().map((_, index) => {
      return async () => {
        const cloudPath = `extreme-tests/batch-upload-${Date.now()}-${index}.jpg`;
        
        try {
          const uploadTimer = setTimeout(() => {
            console.warn(`[极端测试] 上传任务 ${index} 超时`);
          }, config.timeout);
          
          // 上传文件
          const uploadResult = await wx.cloud.uploadFile({
            cloudPath,
            filePath: tempFilePath,
            config: {
              env: 'cloudbase-5giucop314e2cd87'
            }
          });
          
          clearTimeout(uploadTimer);
          
          if (config.verbose) {
            console.log(`[极端测试] 文件 ${index} 上传成功: ${uploadResult.fileID}`);
          }
          
          // 保存文件信息到数据库
          const dbResult = await wx.cloud.callFunction({
            name: 'manageFile',
            data: {
              action: 'save',
              fileID: uploadResult.fileID,
              fileInfo: {
                name: `极端测试_${index}`,
                type: 'image',
                size: config.fileSize * 1024,
                extension: '.jpg',
                testBatch: true
              }
            },
            config: {
              env: 'cloudbase-5giucop314e2cd87'
            }
          });
          
          return {
            index,
            fileID: uploadResult.fileID,
            dbResult: dbResult.result,
            success: true
          };
        } catch (err) {
          console.error(`[极端测试] 文件 ${index} 上传失败:`, err);
          return {
            index,
            error: err.message || err.errMsg || '未知错误',
            success: false
          };
        }
      };
    });
    
    // 执行上传任务（控制并发数）
    const results = await runWithConcurrencyLimit(
      tasks, 
      task => task(), 
      config.concurrentLimit
    );
    
    // 统计结果
    const endTime = Date.now();
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    const totalTime = endTime - startTime;
    
    return {
      totalFiles: config.batchSize,
      successCount,
      failCount,
      totalTimeMs: totalTime,
      avgTimePerFile: totalTime / config.batchSize,
      results: config.verbose ? results : undefined
    };
  } catch (err) {
    console.error('[极端测试] 批量上传测试失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * 批量读取数据库测试
 */
async function testBatchDBQuery() {
  console.log(`[极端测试] 开始批量数据库查询测试，共${config.batchSize}次查询`);
  const startTime = Date.now();
  
  try {
    // 准备查询任务
    const tasks = Array(config.batchSize).fill().map((_, index) => {
      return async () => {
        try {
          const queryTimer = setTimeout(() => {
            console.warn(`[极端测试] 查询任务 ${index} 超时`);
          }, config.timeout);
          
          // 执行数据库查询
          const result = await wx.cloud.callFunction({
            name: 'manageFile',
            data: {
              action: 'list',
              page: 1,
              pageSize: 10,
              type: 'image'
            },
            config: {
              env: 'cloudbase-5giucop314e2cd87'
            }
          });
          
          clearTimeout(queryTimer);
          
          if (config.verbose) {
            console.log(`[极端测试] 查询 ${index} 成功: 获取到 ${result.result.data ? result.result.data.length : 0} 条记录`);
          }
          
          return {
            index,
            recordCount: result.result.data ? result.result.data.length : 0,
            pagination: result.result.pagination,
            success: true
          };
        } catch (err) {
          console.error(`[极端测试] 查询 ${index} 失败:`, err);
          return {
            index,
            error: err.message || err.errMsg || '未知错误',
            success: false
          };
        }
      };
    });
    
    // 执行查询任务（控制并发数）
    const results = await runWithConcurrencyLimit(
      tasks, 
      task => task(), 
      config.concurrentLimit
    );
    
    // 统计结果
    const endTime = Date.now();
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    const totalTime = endTime - startTime;
    
    return {
      totalQueries: config.batchSize,
      successCount,
      failCount,
      totalTimeMs: totalTime,
      avgTimePerQuery: totalTime / config.batchSize,
      results: config.verbose ? results : undefined
    };
  } catch (err) {
    console.error('[极端测试] 批量查询测试失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * 批量调用云函数测试
 */
async function testBatchCloudFunction() {
  console.log(`[极端测试] 开始批量云函数调用测试，共${config.batchSize}次调用`);
  const startTime = Date.now();
  
  try {
    // 准备云函数调用任务
    const tasks = Array(config.batchSize).fill().map((_, index) => {
      return async () => {
        try {
          const functionTimer = setTimeout(() => {
            console.warn(`[极端测试] 云函数调用 ${index} 超时`);
          }, config.timeout);
          
          // 执行云函数调用
          const result = await wx.cloud.callFunction({
            name: 'getOpenId',
            data: {
              testIndex: index,
              timestamp: Date.now()
            },
            config: {
              env: 'cloudbase-5giucop314e2cd87'
            }
          });
          
          clearTimeout(functionTimer);
          
          if (config.verbose) {
            console.log(`[极端测试] 云函数调用 ${index} 成功: ${result.result.openid}`);
          }
          
          return {
            index,
            openid: result.result.openid,
            success: true
          };
        } catch (err) {
          console.error(`[极端测试] 云函数调用 ${index} 失败:`, err);
          return {
            index,
            error: err.message || err.errMsg || '未知错误',
            success: false
          };
        }
      };
    });
    
    // 执行云函数调用任务（控制并发数）
    const results = await runWithConcurrencyLimit(
      tasks, 
      task => task(), 
      config.concurrentLimit
    );
    
    // 统计结果
    const endTime = Date.now();
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    const totalTime = endTime - startTime;
    
    return {
      totalCalls: config.batchSize,
      successCount,
      failCount,
      totalTimeMs: totalTime,
      avgTimePerCall: totalTime / config.batchSize,
      results: config.verbose ? results : undefined
    };
  } catch (err) {
    console.error('[极端测试] 批量云函数调用测试失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * 清理测试数据
 */
async function cleanupTestData() {
  try {
    console.log('[极端测试] 开始清理测试数据');
    
    // 获取极端测试上传的文件ID列表
    const result = await wx.cloud.callFunction({
      name: 'manageFile',
      data: {
        action: 'list',
        page: 1,
        pageSize: 100,
        testOnly: true
      },
      config: {
        env: 'cloudbase-5giucop314e2cd87'
      }
    });
    
    if (!result.result.success) {
      console.error('[极端测试] 获取测试文件列表失败:', result.result.error);
      return {
        success: false,
        error: result.result.error
      };
    }
    
    const files = result.result.data || [];
    
    if (files.length === 0) {
      console.log('[极端测试] 没有找到测试文件需要清理');
      return { success: true, deletedCount: 0 };
    }
    
    // 删除文件
    const fileIDs = files.map(file => file.fileID);
    const deleteResult = await wx.cloud.callFunction({
      name: 'manageFile',
      data: {
        action: 'batchDelete',
        fileIDs
      },
      config: {
        env: 'cloudbase-5giucop314e2cd87'
      }
    });
    
    console.log(`[极端测试] 清理完成, 删除了 ${fileIDs.length} 个测试文件`);
    
    return {
      success: true,
      deletedCount: fileIDs.length,
      result: deleteResult.result
    };
  } catch (err) {
    console.error('[极端测试] 清理测试数据失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * 运行所有极端测试
 */
async function runAllTests() {
  console.log('[极端测试] 开始运行所有测试...');
  const results = {};
  
  try {
    // 测试1: 批量云函数调用
    console.log('\n==== 测试1: 批量云函数调用 ====');
    results.cloudFunction = await testBatchCloudFunction();
    console.log('[测试1结果]', results.cloudFunction);
    
    // 测试2: 批量数据库操作
    console.log('\n==== 测试2: 批量数据库查询 ====');
    results.dbQuery = await testBatchDBQuery();
    console.log('[测试2结果]', results.dbQuery);
    
    // 测试3: 批量文件上传
    console.log('\n==== 测试3: 批量文件上传 ====');
    results.fileUpload = await testBatchFileUpload();
    console.log('[测试3结果]', results.fileUpload);
    
    // 清理测试数据
    console.log('\n==== 清理测试数据 ====');
    results.cleanup = await cleanupTestData();
    console.log('[清理结果]', results.cleanup);
    
    // 汇总结果
    console.log('\n==== 测试完成 ====');
    const summary = {
      cloudFunction: {
        success: results.cloudFunction.successCount,
        failed: results.cloudFunction.failCount,
        avgTime: Math.round(results.cloudFunction.avgTimePerCall)
      },
      dbQuery: {
        success: results.dbQuery.successCount,
        failed: results.dbQuery.failCount,
        avgTime: Math.round(results.dbQuery.avgTimePerQuery)
      },
      fileUpload: {
        success: results.fileUpload.successCount,
        failed: results.fileUpload.failCount,
        avgTime: Math.round(results.fileUpload.avgTimePerFile)
      },
      cleanup: {
        deletedFiles: results.cleanup.deletedCount
      }
    };
    
    console.log('测试汇总:', summary);
    return {
      success: true,
      summary,
      detailedResults: results
    };
  } catch (err) {
    console.error('[极端测试] 测试过程中发生错误:', err);
    return {
      success: false,
      error: err.message,
      detailedResults: results
    };
  }
}

module.exports = {
  config,
  testBatchFileUpload,
  testBatchDBQuery,
  testBatchCloudFunction,
  cleanupTestData,
  runAllTests
}; 