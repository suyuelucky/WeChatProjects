/**
 * B1-基础照片采集模块 - 集成测试
 * 
 * 本文件包含照片采集模块的集成测试，验证各组件间的交互
 * 测试时间：2025-05-18
 */

// 引入断言工具
var Assert = require('../utils/assert.js');

/**
 * 相机初始化与捕获流程测试
 */
function testCameraInitAndCapture() {
  return {
    name: '相机初始化与捕获流程测试',
    run: function(context, done) {
      // 获取所需的组件类
      var CameraPreview = context.getCameraPreviewClass();
      var CameraModeController = context.getCameraModeControllerClass();
      var ImageCompressor = context.getImageCompressorClass();
      var PhotoStorage = context.getPhotoStorageClass();
      
      // 创建组件实例
      var preview = new CameraPreview({
        devicePosition: 'back',
        flash: 'auto',
        width: 500,
        height: 700
      });
      
      var modeController = new CameraModeController();
      var compressor = new ImageCompressor();
      var storage = new PhotoStorage({
        baseDir: 'integration_test_storage'
      });
      
      // 初始化所有组件
      Promise.all([
        preview.initialize(),
        storage.initialize()
      ])
        .then(function() {
          context.assert(
            preview.isInitialized(),
            '相机预览组件初始化失败'
          );
          
          context.assert(
            storage.isInitialized(),
            '存储组件初始化失败'
          );
          
          // 设置相机模式为标准模式
          modeController.setMode('standard');
          
          // 捕获照片
          return preview.capturePhoto();
        })
        .then(function(captureResult) {
          context.assert(
            captureResult.tempPath && captureResult.tempPath.length > 0,
            '未能成功捕获照片'
          );
          
          // 压缩捕获的照片
          return compressor.compress(captureResult.tempPath, {
            quality: 0.8,
            maxWidth: 1200,
            maxHeight: 1600
          });
        })
        .then(function(compressResult) {
          context.assert(
            compressResult.path && compressResult.path.length > 0,
            '图片压缩失败'
          );
          
          // 保存压缩后的照片
          return storage.savePhoto(compressResult.path, {
            name: 'integration_test_photo',
            createTime: Date.now(),
            tags: ['test', 'integration']
          });
        })
        .then(function(saveResult) {
          context.assert(
            saveResult.id && saveResult.id.length > 0,
            '照片保存失败'
          );
          
          // 确认照片已正确保存
          return storage.getPhoto(saveResult.id);
        })
        .then(function(photo) {
          context.assert(
            photo !== null && photo.metadata.name === 'integration_test_photo',
            '获取保存的照片失败'
          );
          
          // 清理资源
          return Promise.all([
            preview.release(),
            storage.close()
          ]);
        })
        .then(function() {
          done();
        })
        .catch(function(error) {
          context.fail('相机初始化与捕获流程测试失败：' + error.message);
        });
    }
  };
}

/**
 * 连拍模式与批处理测试
 */
function testBurstModeAndBatchProcessing() {
  return {
    name: '连拍模式与批处理测试',
    run: function(context, done) {
      // 获取所需的组件类
      var CameraPreview = context.getCameraPreviewClass();
      var CameraModeController = context.getCameraModeControllerClass();
      var PhotoBatchProcessor = context.getPhotoBatchProcessorClass();
      var PhotoStorage = context.getPhotoStorageClass();
      
      // 创建组件实例
      var preview = new CameraPreview();
      var modeController = new CameraModeController();
      var batchProcessor = new PhotoBatchProcessor();
      var storage = new PhotoStorage({
        baseDir: 'burst_test_storage'
      });
      
      // 初始化组件
      Promise.all([
        preview.initialize(),
        storage.initialize()
      ])
        .then(function() {
          // 设置连拍模式，5张照片
          modeController.setMode('burst', { count: 5 });
          
          // 确保模式设置成功
          context.assert(
            modeController.getCurrentMode() === 'burst',
            '连拍模式设置失败'
          );
          
          // 获取模式配置
          var config = modeController.getModeConfig();
          context.assert(
            config.count === 5,
            '连拍模式配置错误'
          );
          
          // 执行连拍
          return preview.capturePhotoBurst(config);
        })
        .then(function(burstResults) {
          context.assert(
            Array.isArray(burstResults) && burstResults.length === 5,
            '连拍未返回预期数量的照片'
          );
          
          // 提取临时路径
          var tempPaths = burstResults.map(function(result) {
            return result.tempPath;
          });
          
          // 批量压缩照片
          return batchProcessor.batchCompress(tempPaths, {
            quality: 0.75,
            maxWidth: 1000,
            maxHeight: 1000
          });
        })
        .then(function(compressResults) {
          context.assert(
            Array.isArray(compressResults) && compressResults.length === 5,
            '批量压缩未返回预期数量的结果'
          );
          
          // 提取压缩后的路径
          var compressedPaths = compressResults.map(function(result) {
            return result.path;
          });
          
          // 批量保存照片
          return batchProcessor.batchSave(compressedPaths, {
            category: 'burst_test',
            createTime: Date.now()
          });
        })
        .then(function(saveResults) {
          context.assert(
            Array.isArray(saveResults) && saveResults.length === 5,
            '批量保存未返回预期数量的结果'
          );
          
          // 提取保存的ID
          var savedIds = saveResults.map(function(result) {
            return result.id;
          });
          
          // 获取已保存的照片
          return batchProcessor.batchGet(savedIds);
        })
        .then(function(getResults) {
          context.assert(
            Array.isArray(getResults) && getResults.length === 5,
            '批量获取照片失败'
          );
          
          // 检查照片元数据
          var allValid = getResults.every(function(photo) {
            return photo.metadata.category === 'burst_test';
          });
          
          context.assert(
            allValid,
            '批量保存的照片元数据错误'
          );
          
          // 清理资源
          return Promise.all([
            preview.release(),
            storage.close()
          ]);
        })
        .then(function() {
          done();
        })
        .catch(function(error) {
          context.fail('连拍模式与批处理测试失败：' + error.message);
        });
    }
  };
}

/**
 * 定时拍摄模式测试
 */
function testTimedCaptureMode() {
  return {
    name: '定时拍摄模式测试',
    run: function(context, done) {
      // 获取所需的组件类
      var CameraPreview = context.getCameraPreviewClass();
      var CameraModeController = context.getCameraModeControllerClass();
      var ImageCompressor = context.getImageCompressorClass();
      var PhotoStorage = context.getPhotoStorageClass();
      
      // 创建组件实例
      var preview = new CameraPreview();
      var modeController = new CameraModeController();
      var compressor = new ImageCompressor();
      var storage = new PhotoStorage({
        baseDir: 'timed_test_storage'
      });
      
      // 初始化组件
      Promise.all([
        preview.initialize(),
        storage.initialize()
      ])
        .then(function() {
          // 设置定时模式，延迟2秒
          modeController.setMode('timed', { delay: 2 });
          
          // 确保模式设置成功
          context.assert(
            modeController.getCurrentMode() === 'timed',
            '定时模式设置失败'
          );
          
          // 获取模式配置
          var config = modeController.getModeConfig();
          context.assert(
            config.delay === 2,
            '定时模式配置错误'
          );
          
          // 执行定时捕获
          return preview.capturePhotoTimed(config);
        })
        .then(function(timedResult) {
          context.assert(
            timedResult.tempPath && timedResult.tempPath.length > 0,
            '定时捕获失败'
          );
          
          context.assert(
            timedResult.captureTime - timedResult.startTime >= 2000,
            '定时延迟不正确'
          );
          
          // 压缩照片
          return compressor.compress(timedResult.tempPath, {
            quality: 0.8
          });
        })
        .then(function(compressResult) {
          // 保存照片
          return storage.savePhoto(compressResult.path, {
            name: 'timed_test_photo',
            createTime: Date.now(),
            tags: ['test', 'timed']
          });
        })
        .then(function(saveResult) {
          // 获取保存的照片
          return storage.getPhoto(saveResult.id);
        })
        .then(function(photo) {
          context.assert(
            photo !== null && photo.metadata.name === 'timed_test_photo',
            '获取定时捕获的照片失败'
          );
          
          // 清理资源
          return Promise.all([
            preview.release(),
            storage.close()
          ]);
        })
        .then(function() {
          done();
        })
        .catch(function(error) {
          context.fail('定时拍摄模式测试失败：' + error.message);
        });
    }
  };
}

/**
 * 低内存条件下的拍照与压缩测试
 */
function testCaptureUnderLowMemory() {
  return {
    name: '低内存条件下的拍照与压缩测试',
    run: function(context, done) {
      // 获取所需的组件类
      var CameraPreview = context.getCameraPreviewClass();
      var ImageCompressor = context.getImageCompressorClass();
      var MemoryManager = context.getMemoryManagerClass();
      var PhotoStorage = context.getPhotoStorageClass();
      
      // 创建组件实例
      var preview = new CameraPreview();
      var compressor = new ImageCompressor();
      var memoryManager = new MemoryManager();
      var storage = new PhotoStorage({
        baseDir: 'lowmem_test_storage'
      });
      
      // 初始化组件
      Promise.all([
        preview.initialize(),
        storage.initialize()
      ])
        .then(function() {
          // 模拟低内存情况
          return memoryManager.simulateLowMemory();
        })
        .then(function() {
          // 获取低内存下的最佳图片设置
          return memoryManager.getOptimalImageSettings();
        })
        .then(function(settings) {
          context.assert(
            settings.quality < 1.0,
            '低内存情况下未降低图片质量'
          );
          
          // 在低内存条件下捕获照片
          return preview.capturePhoto();
        })
        .then(function(captureResult) {
          context.assert(
            captureResult.tempPath && captureResult.tempPath.length > 0,
            '低内存条件下捕获照片失败'
          );
          
          // 获取低内存下的最佳压缩设置
          return memoryManager.getOptimalImageSettings()
            .then(function(settings) {
              // 使用低内存优化设置进行压缩
              return compressor.compress(captureResult.tempPath, settings);
            });
        })
        .then(function(compressResult) {
          context.assert(
            compressResult.path && compressResult.path.length > 0,
            '低内存条件下压缩照片失败'
          );
          
          // 检查内存释放情况
          return memoryManager.getMemoryUsage()
            .then(function(usage) {
              // 保存压缩后的照片
              return storage.savePhoto(compressResult.path, {
                name: 'lowmem_test_photo',
                createTime: Date.now(),
                tags: ['test', 'lowmem']
              });
            });
        })
        .then(function(saveResult) {
          context.assert(
            saveResult.id && saveResult.id.length > 0,
            '低内存条件下保存照片失败'
          );
          
          // 恢复正常内存状态
          return memoryManager.restoreMemory();
        })
        .then(function() {
          // 清理资源
          return Promise.all([
            preview.release(),
            storage.close()
          ]);
        })
        .then(function() {
          done();
        })
        .catch(function(error) {
          context.fail('低内存条件下的拍照与压缩测试失败：' + error.message);
        });
    }
  };
}

/**
 * 图片压缩与存储流程测试
 */
function testCompressAndStorageFlow() {
  return {
    name: '图片压缩与存储流程测试',
    run: function(context, done) {
      // 获取所需的组件类
      var ImageCompressor = context.getImageCompressorClass();
      var PhotoStorage = context.getPhotoStorageClass();
      
      // 创建组件实例
      var compressor = new ImageCompressor();
      var storage = new PhotoStorage({
        baseDir: 'compress_store_test'
      });
      
      // 获取测试图像
      var testImagePath = context.getTestImagePath();
      var originalFileSize = 0;
      
      // 获取原始图像大小
      context.getFileSize(testImagePath)
        .then(function(size) {
          originalFileSize = size;
          
          // 初始化存储
          return storage.initialize();
        })
        .then(function() {
          // 测试不同压缩质量
          var compressionTests = [0.3, 0.5, 0.7, 0.9].map(function(quality) {
            return compressor.compress(testImagePath, { quality: quality })
              .then(function(result) {
                return context.getFileSize(result.path)
                  .then(function(size) {
                    return {
                      quality: quality,
                      size: size,
                      path: result.path
                    };
                  });
              });
          });
          
          return Promise.all(compressionTests);
        })
        .then(function(results) {
          // 验证压缩效果
          var validCompression = results.every(function(result, index, array) {
            if (index > 0) {
              return result.size > array[index - 1].size;
            }
            return true;
          });
          
          context.assert(
            validCompression,
            '图片压缩质量设置未正确影响文件大小'
          );
          
          context.assert(
            results[0].size < originalFileSize,
            '图片压缩无效，压缩后文件大小未减小'
          );
          
          // 使用不同压缩质量的图片进行存储，观察其性能
          var storageTests = results.map(function(result) {
            var startTime = Date.now();
            
            return storage.savePhoto(result.path, {
              name: 'quality_' + result.quality,
              createTime: Date.now(),
              tags: ['test', 'compression_' + result.quality]
            })
              .then(function(saveResult) {
                var endTime = Date.now();
                return {
                  quality: result.quality,
                  size: result.size,
                  saveTime: endTime - startTime,
                  photoId: saveResult.id
                };
              });
          });
          
          return Promise.all(storageTests);
        })
        .then(function(storageResults) {
          // 验证存储性能与文件大小的关系
          storageResults.forEach(function(result) {
            context.log('质量: ' + result.quality + ', 大小: ' + result.size + ', 存储时间: ' + result.saveTime + 'ms');
          });
          
          // 获取所有保存的照片信息
          var photoIds = storageResults.map(function(result) {
            return result.photoId;
          });
          
          return Promise.all(photoIds.map(function(id) {
            return storage.getPhoto(id);
          }));
        })
        .then(function(photos) {
          // 验证所有照片都能成功获取
          context.assert(
            photos.length === 4 && photos.every(function(photo) { return photo !== null; }),
            '未能获取所有已保存的照片'
          );
          
          // 测试按标签查询
          return storage.getPhotosByTag('test');
        })
        .then(function(taggedPhotos) {
          context.assert(
            Array.isArray(taggedPhotos) && taggedPhotos.length === 4,
            '按标签查询照片失败'
          );
          
          // 清理资源
          return storage.close();
        })
        .then(function() {
          done();
        })
        .catch(function(error) {
          context.fail('图片压缩与存储流程测试失败：' + error.message);
        });
    }
  };
}

/**
 * 错误恢复与异常处理测试
 */
function testErrorRecoveryAndHandling() {
  return {
    name: '错误恢复与异常处理测试',
    run: function(context, done) {
      // 获取所需的组件类
      var CameraPreview = context.getCameraPreviewClass();
      var ImageCompressor = context.getImageCompressorClass();
      var PhotoStorage = context.getPhotoStorageClass();
      
      // 创建组件实例
      var preview = new CameraPreview();
      var compressor = new ImageCompressor();
      var storage = new PhotoStorage({
        baseDir: 'error_test_storage'
      });
      
      // 初始化组件
      Promise.all([
        preview.initialize(),
        storage.initialize()
      ])
        .then(function() {
          // 测试没有相机权限的情况
          return context.simulatePermissionDenied()
            .then(function() {
              return preview.capturePhoto();
            })
            .catch(function(error) {
              context.assert(
                error.code === 'camera_permission_denied',
                '相机权限被拒绝时未返回正确的错误代码'
              );
              
              // 恢复权限
              return context.restorePermissions();
            });
        })
        .then(function() {
          // 测试无效的压缩参数
          return compressor.compress('invalid_path', { quality: 2.0 })
            .catch(function(error) {
              context.assert(
                error.code === 'invalid_compression_params' || error.code === 'file_not_found',
                '无效压缩参数时未返回正确的错误代码'
              );
              
              // 测试无效的存储路径
              return storage.savePhoto('non_existent_path', {
                name: 'error_test'
              });
            })
            .catch(function(error) {
              context.assert(
                error.code === 'file_not_found',
                '存储不存在的文件时未返回正确的错误代码'
              );
              
              // 测试获取不存在的照片
              return storage.getPhoto('non_existent_id')
                .catch(function(error) {
                  context.assert(
                    error.code === 'photo_not_found',
                    '获取不存在的照片时未返回正确的错误代码'
                  );
                  
                  // 正常捕获一张照片
                  return preview.capturePhoto();
                });
            });
        })
        .then(function(captureResult) {
          // 测试存储空间不足
          return context.simulateLowDiskSpace()
            .then(function() {
              return compressor.compress(captureResult.tempPath, { quality: 0.8 });
            })
            .then(function(compressResult) {
              return storage.savePhoto(compressResult.path, {
                name: 'low_space_test'
              });
            })
            .catch(function(error) {
              context.assert(
                error.code === 'insufficient_storage',
                '存储空间不足时未返回正确的错误代码'
              );
              
              // 恢复存储空间
              return context.restoreDiskSpace();
            });
        })
        .then(function() {
          // 测试相机初始化错误恢复
          return context.simulateCameraInitError()
            .then(function() {
              return preview.initialize();
            })
            .catch(function(error) {
              context.assert(
                error.code === 'camera_init_failed',
                '相机初始化失败时未返回正确的错误代码'
              );
              
              // 测试自动恢复
              return preview.recover();
            })
            .then(function(recoverResult) {
              context.assert(
                recoverResult.success === true,
                '相机恢复失败'
              );
              
              // 确认恢复后可以正常工作
              return preview.capturePhoto();
            });
        })
        .then(function(captureResult) {
          context.assert(
            captureResult.tempPath && captureResult.tempPath.length > 0,
            '恢复后相机未能正常工作'
          );
          
          // 清理资源
          return Promise.all([
            preview.release(),
            storage.close()
          ]);
        })
        .then(function() {
          done();
        })
        .catch(function(error) {
          context.fail('错误恢复与异常处理测试失败：' + error.message);
        });
    }
  };
}

// 导出所有测试用例
module.exports = {
  testCameraInitAndCapture: testCameraInitAndCapture,
  testBurstModeAndBatchProcessing: testBurstModeAndBatchProcessing,
  testTimedCaptureMode: testTimedCaptureMode,
  testCaptureUnderLowMemory: testCaptureUnderLowMemory,
  testCompressAndStorageFlow: testCompressAndStorageFlow,
  testErrorRecoveryAndHandling: testErrorRecoveryAndHandling
}; 