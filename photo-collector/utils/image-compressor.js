/**
 * 图片压缩和处理工具
 */

/**
 * 压缩图片
 * @param {Object} options 配置项
 * @param {String} options.src 图片路径
 * @param {Number} options.quality 压缩质量 0-100
 * @param {Number} options.maxWidth 最大宽度
 * @param {Number} options.maxHeight 最大高度
 * @param {Function} options.success 成功回调
 * @param {Function} options.fail 失败回调
 */
function compressImage(options) {
  // 默认配置
  var defaultOptions = {
    quality: 80,
    maxWidth: 1280,
    maxHeight: 1280
  };
  
  // 合并配置
  var opts = Object.assign({}, defaultOptions, options);
  
  // 检查必须的参数
  if (!opts.src) {
    if (typeof opts.fail === 'function') {
      opts.fail({errMsg: '缺少图片路径'});
    }
    return;
  }
  
  // 使用微信API压缩图片
  wx.compressImage({
    src: opts.src,
    quality: opts.quality,
    success: function(res) {
      if (typeof opts.success === 'function') {
        opts.success(res);
      }
    },
    fail: function(err) {
      console.error('压缩图片失败:', err);
      
      // 如果微信API压缩失败，使用Canvas备选方案
      getImageInfo(opts.src).then(function(imageInfo) {
        // 计算等比例缩放后的尺寸
        var aspectRatio = imageInfo.width / imageInfo.height;
        var targetWidth = imageInfo.width;
        var targetHeight = imageInfo.height;
        
        if (targetWidth > opts.maxWidth) {
          targetWidth = opts.maxWidth;
          targetHeight = targetWidth / aspectRatio;
        }
        
        if (targetHeight > opts.maxHeight) {
          targetHeight = opts.maxHeight;
          targetWidth = targetHeight * aspectRatio;
        }
        
        // 创建Canvas绘制图片
        return canvasCompressImage(opts.src, {
          width: targetWidth,
          height: targetHeight,
          quality: opts.quality / 100
        });
      }).then(function(tempFilePath) {
        if (typeof opts.success === 'function') {
          opts.success({tempFilePath: tempFilePath});
        }
      }).catch(function(error) {
        if (typeof opts.fail === 'function') {
          opts.fail(error);
        }
      });
    }
  });
}

/**
 * 使用Canvas压缩图片
 * @param {String} src 图片路径
 * @param {Object} options 配置项
 * @returns {Promise<String>} 返回压缩后的图片路径
 * @private
 */
function canvasCompressImage(src, options) {
  return new Promise(function(resolve, reject) {
    var canvasId = 'compressCanvas';
    var canvas = wx.createOffscreenCanvas({type: '2d'});
    var ctx = canvas.getContext('2d');
    
    // 设置Canvas尺寸
    canvas.width = options.width;
    canvas.height = options.height;
    
    // 加载图片
    var img = canvas.createImage();
    img.src = src;
    img.onload = function() {
      // 在Canvas上绘制图片
      ctx.clearRect(0, 0, options.width, options.height);
      ctx.drawImage(img, 0, 0, options.width, options.height);
      
      // 导出为图片
      wx.canvasToTempFilePath({
        canvas: canvas,
        quality: options.quality,
        success: function(res) {
          resolve(res.tempFilePath);
        },
        fail: function(err) {
          reject(err);
        }
      });
    };
    
    img.onerror = function(err) {
      reject(err);
    };
  });
}

/**
 * 获取图片信息
 * @param {String} src 图片路径
 * @returns {Promise<Object>} 返回图片信息
 * @private
 */
function getImageInfo(src) {
  return new Promise(function(resolve, reject) {
    wx.getImageInfo({
      src: src,
      success: function(res) {
        resolve(res);
      },
      fail: function(err) {
        reject(err);
      }
    });
  });
}

/**
 * 创建缩略图
 * @param {Object} options 配置项
 * @param {String} options.src 图片路径
 * @param {Number} options.width 宽度
 * @param {Number} options.height 高度
 * @param {Function} options.success 成功回调
 * @param {Function} options.fail 失败回调
 */
function createThumbnail(options) {
  // 默认配置
  var defaultOptions = {
    width: 200,
    height: 200,
    quality: 60
  };
  
  // 合并配置
  var opts = Object.assign({}, defaultOptions, options);
  
  // 检查必须的参数
  if (!opts.src) {
    if (typeof opts.fail === 'function') {
      opts.fail({errMsg: '缺少图片路径'});
    }
    return;
  }
  
  // 获取图片信息
  getImageInfo(opts.src).then(function(imageInfo) {
    // 创建Canvas绘制缩略图
    return canvasCompressImage(opts.src, {
      width: opts.width,
      height: opts.height,
      quality: opts.quality / 100
    });
  }).then(function(tempFilePath) {
    if (typeof opts.success === 'function') {
      opts.success({tempFilePath: tempFilePath});
    }
  }).catch(function(error) {
    if (typeof opts.fail === 'function') {
      opts.fail(error);
    }
  });
}

/**
 * 预处理图片(批量处理图片，适用于连拍模式)
 * @param {Object} options 配置项
 * @param {Array<String>} options.images 图片路径数组
 * @param {Number} options.quality 压缩质量
 * @param {Boolean} options.createThumbnails 是否创建缩略图
 * @param {Function} options.progress 进度回调
 * @param {Function} options.success 成功回调
 * @param {Function} options.fail 失败回调
 */
function batchProcessImages(options) {
  // 默认配置
  var defaultOptions = {
    quality: 80,
    createThumbnails: true,
    thumbnailWidth: 200,
    thumbnailHeight: 200
  };
  
  // 合并配置
  var opts = Object.assign({}, defaultOptions, options);
  
  // 检查必须的参数
  if (!opts.images || !Array.isArray(opts.images) || opts.images.length === 0) {
    if (typeof opts.fail === 'function') {
      opts.fail({errMsg: '缺少图片数组'});
    }
    return;
  }
  
  var results = [];
  var totalImages = opts.images.length;
  var processedCount = 0;
  
  // 顺序处理图片
  processNextImage(0);
  
  /**
   * 处理下一张图片
   * @param {Number} index 图片索引
   */
  function processNextImage(index) {
    if (index >= totalImages) {
      // 所有图片处理完成
      if (typeof opts.success === 'function') {
        opts.success(results);
      }
      return;
    }
    
    var imagePath = opts.images[index];
    
    // 压缩图片
    compressImage({
      src: imagePath,
      quality: opts.quality,
      success: function(compressResult) {
        var result = {
          original: imagePath,
          compressed: compressResult.tempFilePath
        };
        
        // 如果需要创建缩略图
        if (opts.createThumbnails) {
          createThumbnail({
            src: compressResult.tempFilePath,
            width: opts.thumbnailWidth,
            height: opts.thumbnailHeight,
            success: function(thumbResult) {
              result.thumbnail = thumbResult.tempFilePath;
              finishProcessing(result);
            },
            fail: function(err) {
              console.error('创建缩略图失败:', err);
              finishProcessing(result);
            }
          });
        } else {
          finishProcessing(result);
        }
      },
      fail: function(err) {
        console.error('压缩图片失败:', err);
        processedCount++;
        
        // 报告进度
        if (typeof opts.progress === 'function') {
          opts.progress(processedCount, totalImages, null);
        }
        
        // 继续处理下一张图片
        processNextImage(index + 1);
      }
    });
    
    /**
     * 完成当前图片处理
     * @param {Object} result 处理结果
     */
    function finishProcessing(result) {
      results.push(result);
      processedCount++;
      
      // 报告进度
      if (typeof opts.progress === 'function') {
        opts.progress(processedCount, totalImages, result);
      }
      
      // 处理下一张图片
      processNextImage(index + 1);
    }
  }
}

/**
 * 保存图片到本地
 * @param {Object} options 配置项
 * @param {String} options.tempFilePath 临时文件路径
 * @param {Function} options.success 成功回调
 * @param {Function} options.fail 失败回调
 */
function saveImageToLocal(options) {
  // 检查必须的参数
  if (!options.tempFilePath) {
    if (typeof options.fail === 'function') {
      options.fail({errMsg: '缺少临时文件路径'});
    }
    return;
  }
  
  // 生成唯一文件名
  var fileName = 'photo_' + Date.now() + '_' + Math.floor(Math.random() * 1000) + '.jpg';
  var filePath = wx.env.USER_DATA_PATH + '/' + fileName;
  
  // 保存文件
  wx.getFileSystemManager().copyFile({
    srcPath: options.tempFilePath,
    destPath: filePath,
    success: function() {
      if (typeof options.success === 'function') {
        options.success({
          savedFilePath: filePath
        });
      }
    },
    fail: function(err) {
      console.error('保存图片失败:', err);
      if (typeof options.fail === 'function') {
        options.fail(err);
      }
    }
  });
}

/**
 * 自动选择图片压缩配置
 * @param {Number} devicePerformance 设备性能评分(1-5)
 * @param {Number} fileSize 文件大小(kb)
 * @returns {Object} 压缩配置
 */
function getCompressionConfig(devicePerformance, fileSize) {
  var config = {
    quality: 80,
    maxWidth: 1280,
    maxHeight: 1280
  };
  
  // 根据设备性能调整
  if (devicePerformance <= 2) {
    // 低性能设备
    config.quality = 60;
    config.maxWidth = 800;
    config.maxHeight = 800;
  } else if (devicePerformance <= 4) {
    // 中性能设备
    config.quality = 70;
    config.maxWidth = 1080;
    config.maxHeight = 1080;
  }
  
  // 根据文件大小调整
  if (fileSize > 5000) {
    // 大于5MB的图片
    config.quality = Math.max(50, config.quality - 20);
  } else if (fileSize > 2000) {
    // 大于2MB的图片
    config.quality = Math.max(60, config.quality - 10);
  }
  
  return config;
}

// 导出模块
module.exports = {
  compressImage: compressImage,
  createThumbnail: createThumbnail,
  batchProcessImages: batchProcessImages,
  saveImageToLocal: saveImageToLocal,
  getCompressionConfig: getCompressionConfig
}; 