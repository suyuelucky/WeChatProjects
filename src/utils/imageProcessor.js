/**
 * 图像处理工具类
 * 提供图像压缩、处理等功能
 */

const canvasManager = {
  canvas: null,
  ctx: null,
  canvasId: 'offscreenCanvas',
  
  /**
   * 初始化Canvas
   * @private
   */
  _initCanvas: function() {
    if (this.canvas) {
      return;
    }
    
    try {
      // 创建离屏Canvas
      var query = wx.createSelectorQuery();
      query.select('#' + this.canvasId)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (res && res[0] && res[0].node) {
            this.canvas = res[0].node;
            this.ctx = this.canvas.getContext('2d');
          }
        });
    } catch (error) {
      console.error('初始化Canvas失败：', error);
    }
  },
  
  /**
   * 获取Canvas
   * @return {Object} Canvas对象或null
   */
  getCanvas: function() {
    if (!this.canvas) {
      this._initCanvas();
    }
    return this.canvas;
  },
  
  /**
   * 获取Context
   * @return {Object} Context对象或null
   */
  getContext: function() {
    if (!this.ctx) {
      this._initCanvas();
    }
    return this.ctx;
  },
  
  /**
   * 清理Canvas资源
   */
  clear: function() {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  },
  
  /**
   * 释放资源
   */
  release: function() {
    this.clear();
    this.canvas = null;
    this.ctx = null;
  }
};

/**
 * 获取图片信息
 * @param {string} imagePath - 图片路径
 * @return {Promise} 包含图片信息的Promise
 */
const getImageInfo = function(imagePath) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src: imagePath,
      success: (res) => {
        resolve(res);
      },
      fail: (error) => {
        reject(error);
      }
    });
  });
};

/**
 * 压缩图片
 * @param {string} imagePath - 原图片路径
 * @param {number} quality - 压缩质量，范围0-1
 * @param {number} [maxWidth=1280] - 最大宽度
 * @param {number} [maxHeight=1280] - 最大高度
 * @return {Promise<string>} 压缩后图片的临时路径
 */
const compressImage = function(imagePath, quality, maxWidth = 1280, maxHeight = 1280) {
  if (!imagePath) {
    return Promise.reject(new Error('图片路径不能为空'));
  }
  
  // 默认压缩质量
  quality = quality || 0.8;
  
  return new Promise((resolve, reject) => {
    // 检查基础库版本是否支持压缩功能
    if (wx.canIUse('compressImage')) {
      // 如果支持原生压缩，则优先使用
      wx.compressImage({
        src: imagePath,
        quality: Math.floor(quality * 100), // 将0-1转换为0-100
        success: (res) => {
          resolve(res.tempFilePath);
        },
        fail: () => {
          // 如果原生压缩失败，则尝试Canvas压缩
          compressByCanvas(imagePath, quality, maxWidth, maxHeight)
            .then(resolve)
            .catch(reject);
        }
      });
    } else {
      // 回退到Canvas压缩
      compressByCanvas(imagePath, quality, maxWidth, maxHeight)
        .then(resolve)
        .catch(reject);
    }
  });
};

/**
 * 使用Canvas压缩图片
 * @private
 * @param {string} imagePath - 原图片路径
 * @param {number} quality - 压缩质量，范围0-1
 * @param {number} maxWidth - 最大宽度
 * @param {number} maxHeight - 最大高度
 * @return {Promise<string>} 压缩后图片的临时路径
 */
const compressByCanvas = function(imagePath, quality, maxWidth, maxHeight) {
  return new Promise((resolve, reject) => {
    getImageInfo(imagePath)
      .then((imageInfo) => {
        // 计算压缩后的尺寸，保持原图比例
        let targetWidth = imageInfo.width;
        let targetHeight = imageInfo.height;
        
        if (targetWidth > maxWidth || targetHeight > maxHeight) {
          if (targetWidth / targetHeight > maxWidth / maxHeight) {
            // 宽度超出约束
            targetHeight = targetHeight * (maxWidth / targetWidth);
            targetWidth = maxWidth;
          } else {
            // 高度超出约束
            targetWidth = targetWidth * (maxHeight / targetHeight);
            targetHeight = maxHeight;
          }
        }
        
        targetWidth = Math.floor(targetWidth);
        targetHeight = Math.floor(targetHeight);
        
        // 创建临时Canvas执行压缩
        const canvas = wx.createOffscreenCanvas({
          type: '2d',
          width: targetWidth,
          height: targetHeight
        });
        
        if (!canvas) {
          reject(new Error('创建Canvas失败，不支持离屏Canvas'));
          return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // 加载图片
        const image = canvas.createImage();
        image.onload = function() {
          // 清空画布
          ctx.clearRect(0, 0, targetWidth, targetHeight);
          
          // 绘制图像
          ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
          
          // 导出图像
          try {
            const tempFilePath = wx.env.USER_DATA_PATH + '/compressed_' + Date.now() + '.jpg';
            
            // 将Canvas内容导出为文件
            const fileSystem = wx.getFileSystemManager();
            fileSystem.writeFile({
              filePath: tempFilePath,
              data: canvas.toDataURL('image/jpeg', quality).slice(22), // 移除data:image/jpeg;base64,
              encoding: 'base64',
              success: () => {
                // 释放资源
                ctx.clearRect(0, 0, targetWidth, targetHeight);
                image.src = '';
                
                resolve(tempFilePath);
              },
              fail: (error) => {
                reject(error);
              }
            });
          } catch (error) {
            reject(error);
          }
        };
        
        image.onerror = function() {
          reject(new Error('图片加载失败'));
        };
        
        image.src = imagePath;
      })
      .catch(reject);
  });
};

/**
 * 批量压缩图片
 * @param {Array<string>} imagePaths - 图片路径数组
 * @param {number} [quality=0.8] - 压缩质量
 * @param {number} [concurrency=2] - 并发数
 * @return {Promise<Array<string>>} 压缩后图片路径数组
 */
const batchCompressImages = function(imagePaths, quality = 0.8, concurrency = 2) {
  if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
    return Promise.resolve([]);
  }
  
  return new Promise((resolve, reject) => {
    const results = [];
    let completed = 0;
    let currentIndex = 0;
    
    // 处理单个图片
    const processImage = function(index) {
      if (index >= imagePaths.length) {
        return;
      }
      
      compressImage(imagePaths[index], quality)
        .then((compressedPath) => {
          results[index] = compressedPath;
          completed++;
          
          if (completed === imagePaths.length) {
            // 所有图片处理完成
            resolve(results);
          } else {
            // 处理下一张图片
            processImage(currentIndex++);
          }
        })
        .catch((error) => {
          console.error('压缩图片失败：', error);
          results[index] = imagePaths[index]; // 使用原图
          completed++;
          
          if (completed === imagePaths.length) {
            resolve(results);
          } else {
            processImage(currentIndex++);
          }
        });
    };
    
    // 启动初始并发处理
    const initialConcurrency = Math.min(concurrency, imagePaths.length);
    for (let i = 0; i < initialConcurrency; i++) {
      processImage(currentIndex++);
    }
  });
};

module.exports = {
  compressImage,
  batchCompressImages,
  getImageInfo,
  canvasManager
}; 