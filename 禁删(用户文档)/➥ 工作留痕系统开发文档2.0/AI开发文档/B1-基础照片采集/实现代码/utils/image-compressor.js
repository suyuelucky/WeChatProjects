/**
 * 图片压缩工具
 * 
 * 提供图片压缩功能，支持调整图片质量和大小
 */

// 压缩图片的默认配置
const DEFAULT_CONFIG = {
  quality: 0.8, // 压缩质量 0-1
  maxWidth: 1280, // 最大宽度
  maxHeight: 1280, // 最大高度
  fileType: 'jpg' // 输出文件类型 jpg/png
};

/**
 * 压缩图片
 * @param {string} tempFilePath 原始图片的临时路径
 * @param {Object} [options] 压缩配置选项
 * @returns {Promise<string>} 压缩后图片的临时路径
 */
function compressImage(tempFilePath, options = {}) {
  return new Promise((resolve, reject) => {
    if (!tempFilePath) {
      reject(new Error('图片路径不能为空'));
      return;
    }

    // 合并默认配置
    const config = { ...DEFAULT_CONFIG, ...options };
    
    // 先获取图片信息
    wx.getImageInfo({
      src: tempFilePath,
      success: (imageInfo) => {
        // 计算压缩后的尺寸
        const { width, height } = calculateSize(
          imageInfo.width, 
          imageInfo.height, 
          config.maxWidth, 
          config.maxHeight
        );
        
        // 压缩图片
        compressWithCanvas(tempFilePath, width, height, config.quality, config.fileType)
          .then(resolve)
          .catch(reject);
      },
      fail: (err) => {
        console.error('获取图片信息失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 计算压缩后的图片尺寸，保持原始宽高比
 * @param {number} origWidth 原始宽度
 * @param {number} origHeight 原始高度
 * @param {number} maxWidth 最大宽度
 * @param {number} maxHeight 最大高度
 * @returns {Object} 计算后的宽高
 */
function calculateSize(origWidth, origHeight, maxWidth, maxHeight) {
  // 如果原始尺寸小于限制尺寸，则无需缩放
  if (origWidth <= maxWidth && origHeight <= maxHeight) {
    return { width: origWidth, height: origHeight };
  }
  
  // 计算缩放比例
  const widthRatio = maxWidth / origWidth;
  const heightRatio = maxHeight / origHeight;
  
  // 选择较小的比例进行等比缩放
  const ratio = Math.min(widthRatio, heightRatio);
  
  return {
    width: Math.floor(origWidth * ratio),
    height: Math.floor(origHeight * ratio)
  };
}

/**
 * 使用Canvas压缩图片
 * @param {string} tempFilePath 图片临时路径
 * @param {number} targetWidth 目标宽度
 * @param {number} targetHeight 目标高度
 * @param {number} quality 压缩质量 0-1
 * @param {string} fileType 文件类型 jpg/png
 * @returns {Promise<string>} 压缩后的图片路径
 */
function compressWithCanvas(tempFilePath, targetWidth, targetHeight, quality, fileType) {
  return new Promise((resolve, reject) => {
    try {
      // 创建离屏Canvas
      const ctx = wx.createCanvasContext('compressCanvas');
      
      // 绘制图片
      ctx.drawImage(tempFilePath, 0, 0, targetWidth, targetHeight);
      
      // 将Canvas内容导出为图片
      ctx.draw(false, () => {
        setTimeout(() => {
          wx.canvasToTempFilePath({
            canvasId: 'compressCanvas',
            x: 0,
            y: 0,
            width: targetWidth,
            height: targetHeight,
            destWidth: targetWidth,
            destHeight: targetHeight,
            fileType: fileType,
            quality: quality,
            success: (res) => {
              resolve(res.tempFilePath);
            },
            fail: (err) => {
              console.error('导出图片失败:', err);
              reject(err);
              
              // 压缩失败时返回原图
              resolve(tempFilePath);
            }
          });
        }, 300); // 确保Canvas已经绘制完成
      });
    } catch (err) {
      console.error('Canvas压缩图片失败:', err);
      reject(err);
      
      // 出错时返回原图
      resolve(tempFilePath);
    }
  });
}

/**
 * 快速压缩图片(使用微信API)
 * 此方法使用微信提供的接口，速度快但自定义能力较弱
 * @param {string} tempFilePath 原始图片的临时路径
 * @param {number} quality 压缩质量 0-100
 * @returns {Promise<string>} 压缩后图片的临时路径
 */
function quickCompress(tempFilePath, quality = 80) {
  return new Promise((resolve, reject) => {
    wx.compressImage({
      src: tempFilePath,
      quality: quality, // 1-100
      success: (res) => {
        resolve(res.tempFilePath);
      },
      fail: (err) => {
        console.error('压缩图片失败:', err);
        reject(err);
        
        // 压缩失败时返回原图
        resolve(tempFilePath);
      }
    });
  });
}

/**
 * 检测图片是否需要压缩
 * @param {string} tempFilePath 图片临时路径
 * @param {number} maxSize 最大文件大小(KB)
 * @returns {Promise<boolean>} 是否需要压缩
 */
function needCompress(tempFilePath, maxSize = 1024) {
  return new Promise((resolve, reject) => {
    wx.getFileInfo({
      filePath: tempFilePath,
      success: (res) => {
        // 获取文件大小(KB)
        const fileSizeKB = res.size / 1024;
        resolve(fileSizeKB > maxSize);
      },
      fail: (err) => {
        console.error('获取文件信息失败:', err);
        reject(err);
        
        // 无法获取大小时默认需要压缩
        resolve(true);
      }
    });
  });
}

/**
 * 智能压缩图片
 * 根据图片大小和尺寸自动选择压缩方式
 * @param {string} tempFilePath 原始图片的临时路径
 * @returns {Promise<string>} 压缩后图片的临时路径
 */
function smartCompress(tempFilePath) {
  return new Promise((resolve, reject) => {
    // 先检测是否需要压缩
    needCompress(tempFilePath, 500)
      .then(needsCompression => {
        if (!needsCompression) {
          // 如果不需要压缩，直接返回原图
          resolve(tempFilePath);
          return;
        }
        
        // 获取图片信息
        wx.getImageInfo({
          src: tempFilePath,
          success: (imageInfo) => {
            const { width, height } = imageInfo;
            
            // 大图使用Canvas压缩，控制尺寸和质量
            if (width > 1280 || height > 1280) {
              compressImage(tempFilePath, {
                maxWidth: 1280,
                maxHeight: 1280,
                quality: 0.8
              })
                .then(resolve)
                .catch(reject);
            } else {
              // 小图使用微信API快速压缩
              quickCompress(tempFilePath, 80)
                .then(resolve)
                .catch(reject);
            }
          },
          fail: (err) => {
            console.error('获取图片信息失败:', err);
            // 出错时使用快速压缩
            quickCompress(tempFilePath, 80)
              .then(resolve)
              .catch(() => resolve(tempFilePath)); // 压缩失败返回原图
          }
        });
      })
      .catch(() => {
        // 检测失败时默认进行压缩
        quickCompress(tempFilePath, 80)
          .then(resolve)
          .catch(() => resolve(tempFilePath)); // 压缩失败返回原图
      });
  });
}

// 导出主压缩函数和其他工具函数
module.exports = smartCompress;
module.exports.compressImage = compressImage;
module.exports.quickCompress = quickCompress;
module.exports.needCompress = needCompress; 