/**
 * 图像处理工具
 * 提供图像压缩、调整大小、优化和格式转换功能
 * 遵循ES5语法确保微信小程序兼容性
 */

/**
 * 图像处理模块
 */
var imageProcessor = {
  /**
   * 压缩图像
   * @param {String} imagePath - 图像路径
   * @param {Object} options - 压缩选项
   * @param {Number} options.quality - 压缩质量(0-100)
   * @param {Number} options.maxWidth - 最大宽度
   * @param {Number} options.maxHeight - 最大高度
   * @returns {Promise} 返回压缩后的图像信息
   */
  compressImage: function(imagePath, options) {
    return new Promise(function(resolve, reject) {
      if (!imagePath) {
        return reject(new Error('图像路径不能为空'));
      }
      
      var opts = options || {};
      var quality = opts.quality || 80;
      
      console.log('[imageProcessor] 压缩图像:', imagePath);
      
      wx.compressImage({
        src: imagePath,
        quality: quality,
        success: function(res) {
          console.log('[imageProcessor] 压缩成功:', res.tempFilePath);
          resolve({
            path: res.tempFilePath,
            originalPath: imagePath,
            quality: quality
          });
        },
        fail: function(err) {
          console.error('[imageProcessor] 压缩失败:', err);
          reject(err);
        }
      });
    });
  },
  
  /**
   * 调整图像大小
   * @param {String} imagePath - 图像路径
   * @param {Object} options - 调整选项
   * @param {Number} options.width - 目标宽度
   * @param {Number} options.height - 目标高度
   * @param {String} options.mode - 调整模式('aspectFit', 'aspectFill')
   * @returns {Promise} 返回调整后的图像信息
   */
  resizeImage: function(imagePath, options) {
    return new Promise(function(resolve, reject) {
      if (!imagePath) {
        return reject(new Error('图像路径不能为空'));
      }
      
      var opts = options || {};
      
      // 先获取图像信息
      wx.getImageInfo({
        src: imagePath,
        success: function(imageInfo) {
          var originalWidth = imageInfo.width;
          var originalHeight = imageInfo.height;
          var targetWidth = opts.width || originalWidth;
          var targetHeight = opts.height || originalHeight;
          
          // 根据原始大小和目标大小计算需要裁剪的区域
          // 这里使用canvas绘制并导出新图像
          var canvas = wx.createOffscreenCanvas({
            width: targetWidth,
            height: targetHeight
          });
          
          var ctx = canvas.getContext('2d');
          var img = canvas.createImage();
          
          img.onload = function() {
            // 根据指定模式计算绘制参数
            var drawParams = calculateDrawParams(
              originalWidth, 
              originalHeight, 
              targetWidth, 
              targetHeight, 
              opts.mode || 'aspectFit'
            );
            
            ctx.drawImage(
              img, 
              drawParams.sx, drawParams.sy, drawParams.sWidth, drawParams.sHeight,
              drawParams.dx, drawParams.dy, drawParams.dWidth, drawParams.dHeight
            );
            
            // 导出为临时文件
            canvas.toTempFilePath({
              destWidth: targetWidth,
              destHeight: targetHeight,
              quality: opts.quality || 80,
              success: function(res) {
                resolve({
                  path: res.tempFilePath,
                  originalPath: imagePath,
                  width: targetWidth,
                  height: targetHeight
                });
              },
              fail: function(err) {
                console.error('[imageProcessor] 调整大小失败:', err);
                reject(err);
              }
            });
          };
          
          img.onerror = function(err) {
            console.error('[imageProcessor] 图像加载失败:', err);
            reject(new Error('图像加载失败'));
          };
          
          img.src = imagePath;
        },
        fail: function(err) {
          console.error('[imageProcessor] 获取图像信息失败:', err);
          reject(err);
        }
      });
    });
  },
  
  /**
   * 批量处理图像
   * @param {Array} imagePaths - 图像路径数组
   * @param {Object} options - 处理选项
   * @returns {Promise} 返回处理后的图像信息数组
   */
  batchProcess: function(imagePaths, options) {
    var that = this;
    var promises = [];
    
    if (!Array.isArray(imagePaths)) {
      return Promise.reject(new Error('图像路径必须是数组'));
    }
    
    // 创建处理任务
    imagePaths.forEach(function(path) {
      if (options.compress) {
        promises.push(that.compressImage(path, options));
      } else if (options.resize) {
        promises.push(that.resizeImage(path, options));
      } else {
        // 如果没有指定处理操作，则返回原始路径
        promises.push(Promise.resolve({ path: path }));
      }
    });
    
    return Promise.all(promises);
  },
  
  /**
   * 获取图像的EXIF信息
   * @param {String} imagePath - 图像路径
   * @returns {Promise} 返回EXIF信息
   */
  getExifInfo: function(imagePath) {
    return new Promise(function(resolve) {
      // 微信小程序没有原生的EXIF读取API，返回基本信息
      wx.getImageInfo({
        src: imagePath,
        success: function(res) {
          resolve({
            width: res.width,
            height: res.height,
            orientation: res.orientation,
            type: res.type,
            path: imagePath
          });
        },
        fail: function() {
          // 失败时返回空对象
          resolve({});
        }
      });
    });
  },
  
  /**
   * 优化图像（综合处理）
   * @param {Object} options - 选项对象
   * @param {String} options.src - 图像路径
   * @param {Number} options.quality - 压缩质量(0-100)
   * @param {Number} options.maxWidth - 最大宽度
   * @param {Number} options.maxHeight - 最大高度
   * @returns {Promise} 返回处理后的图像信息
   */
  optimizeImage: function(options) {
    var that = this;
    
    if (!options || !options.src) {
      return Promise.reject(new Error('图像路径不能为空'));
    }
    
    return new Promise(function(resolve, reject) {
      // 先获取图像信息
      that.getExifInfo(options.src)
        .then(function(exifInfo) {
          // 根据原始尺寸和目标尺寸决定是否需要调整大小
          var needResize = options.maxWidth && options.maxHeight && 
                          (exifInfo.width > options.maxWidth || exifInfo.height > options.maxHeight);
          
          if (needResize) {
            // 需要调整大小
            return that.resizeImage(options.src, {
              width: options.maxWidth,
              height: options.maxHeight,
              mode: 'aspectFit',
              quality: options.quality
            });
          } else {
            // 只需要压缩
            return that.compressImage(options.src, {
              quality: options.quality
            });
          }
        })
        .then(function(result) {
          // 获取处理后图像大小
          wx.getFileInfo({
            filePath: result.path,
            success: function(fileInfo) {
              resolve(Object.assign({}, result, {
                size: fileInfo.size,
                optimized: true
              }));
            },
            fail: function() {
              // 无法获取文件大小，仍然返回处理结果
              resolve(Object.assign({}, result, {
                optimized: true
              }));
            }
          });
        })
        .catch(function(error) {
          console.error('[imageProcessor] 图像优化失败:', error);
          reject(error);
        });
    });
  }
};

/**
 * 计算绘制参数
 * @private
 */
function calculateDrawParams(srcWidth, srcHeight, dstWidth, dstHeight, mode) {
  var params = {
    sx: 0, sy: 0,
    sWidth: srcWidth, sHeight: srcHeight,
    dx: 0, dy: 0,
    dWidth: dstWidth, dHeight: dstHeight
  };
  
  if (mode === 'aspectFit') {
    // 保持原始比例，图像完整显示
    var ratio = Math.min(dstWidth / srcWidth, dstHeight / srcHeight);
    params.dWidth = srcWidth * ratio;
    params.dHeight = srcHeight * ratio;
    params.dx = (dstWidth - params.dWidth) / 2;
    params.dy = (dstHeight - params.dHeight) / 2;
  } else if (mode === 'aspectFill') {
    // 保持原始比例，图像填满目标区域，可能裁剪
    var ratio = Math.max(dstWidth / srcWidth, dstHeight / srcHeight);
    var newWidth = srcWidth * ratio;
    var newHeight = srcHeight * ratio;
    params.sx = (newWidth - dstWidth) / 2 / ratio;
    params.sy = (newHeight - dstHeight) / 2 / ratio;
    params.sWidth = dstWidth / ratio;
    params.sHeight = dstHeight / ratio;
  }
  
  return params;
}

module.exports = imageProcessor; 