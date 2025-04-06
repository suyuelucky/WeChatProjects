/**
 * 模拟照片数据
 * 用于测试的模拟照片数据生成器
 */

// 模拟的图片路径数组（测试使用）
const MOCK_IMAGE_PATHS = [
  'https://example.com/mock-images/photo1.jpg',
  'https://example.com/mock-images/photo2.jpg',
  'https://example.com/mock-images/photo3.jpg',
  'https://example.com/mock-images/photo4.jpg',
  'https://example.com/mock-images/photo5.jpg'
];

// 模拟的图片尺寸数组（测试使用）
const MOCK_IMAGE_SIZES = [
  { width: 1200, height: 800 },
  { width: 800, height: 1200 },
  { width: 1920, height: 1080 },
  { width: 1080, height: 1920 },
  { width: 1600, height: 1200 }
];

/**
 * 创建模拟照片数据
 * @param {Number} count 要创建的照片数量
 * @param {Object} options 可选配置
 * @returns {Promise<Array>} 照片数组
 */
export function createMockPhotos(count, options = {}) {
  count = Math.min(count || 1, MOCK_IMAGE_PATHS.length);
  
  const photos = [];
  
  for (let i = 0; i < count; i++) {
    const imageIndex = i % MOCK_IMAGE_PATHS.length;
    const sizeIndex = i % MOCK_IMAGE_SIZES.length;
    
    const size = options.size || Math.floor(Math.random() * 1000000) + 500000; // 500KB - 1.5MB
    const width = options.width || MOCK_IMAGE_SIZES[sizeIndex].width;
    const height = options.height || MOCK_IMAGE_SIZES[sizeIndex].height;
    
    photos.push({
      id: `mock_photo_${Date.now()}_${i}`,
      path: options.path || MOCK_IMAGE_PATHS[imageIndex],
      size: size,
      type: 'image',
      createdAt: new Date().toISOString(),
      width: width,
      height: height,
      status: 'temp',
      metadata: options.metadata || {
        location: options.includeLocation ? {
          latitude: 22.5431 + (Math.random() * 2 - 1) * 0.1,
          longitude: 114.0579 + (Math.random() * 2 - 1) * 0.1
        } : null,
        device: options.device || 'Testing Device',
        timestamp: Date.now()
      }
    });
  }
  
  return Promise.resolve(photos);
}

/**
 * 创建模拟照片二进制数据
 * @param {Object} photoObject 照片对象
 * @returns {Promise<ArrayBuffer>} 模拟的照片二进制数据
 */
export function createMockPhotoData(photoObject) {
  return new Promise((resolve) => {
    // 创建模拟的二进制数据
    const size = photoObject.size || 100000;
    const buffer = new ArrayBuffer(size);
    const view = new Uint8Array(buffer);
    
    // 填充一些随机数据
    for (let i = 0; i < size; i++) {
      view[i] = Math.floor(Math.random() * 256);
    }
    
    // 添加JPEG文件头标记
    view[0] = 0xFF;
    view[1] = 0xD8;
    
    // 添加JPEG文件尾标记
    view[size - 2] = 0xFF;
    view[size - 1] = 0xD9;
    
    resolve(buffer);
  });
}

/**
 * 创建模拟照片上传结果
 * @param {Array} photoIds 照片ID数组
 * @returns {Promise<Array>} 上传结果数组
 */
export function createMockUploadResults(photoIds) {
  return Promise.resolve(photoIds.map((id, index) => {
    return {
      photoId: id,
      taskId: `upload_task_${Date.now()}_${index}`,
      startTime: Date.now(),
      status: 'pending',
      progress: 0
    };
  }));
}

/**
 * 模拟照片上传状态更新
 * @param {Array} uploadTasks 上传任务数组
 * @param {Object} options 选项
 * @returns {Promise<Array>} 更新后的任务数组
 */
export function mockUploadStatusUpdate(uploadTasks, options = {}) {
  const updatedTasks = uploadTasks.map(task => {
    const currentProgress = task.progress || 0;
    let newProgress = currentProgress;
    
    if (currentProgress < 100) {
      // 模拟进度增加
      newProgress = Math.min(100, currentProgress + (options.progressStep || 20));
    }
    
    let status = task.status;
    if (newProgress >= 100) {
      // 任务完成
      status = options.forceError ? 'error' : 'completed';
    } else if (status === 'pending' && newProgress > 0) {
      // 任务进行中
      status = 'uploading';
    }
    
    return {
      ...task,
      progress: newProgress,
      status: status,
      lastUpdated: Date.now(),
      error: status === 'error' ? { code: 'UPLOAD_FAILED', message: '模拟上传失败' } : null
    };
  });
  
  return Promise.resolve(updatedTasks);
}

// 默认导出，兼容性支持
export default {
  createMockPhotos,
  createMockPhotoData,
  createMockUploadResults,
  mockUploadStatusUpdate
}; 