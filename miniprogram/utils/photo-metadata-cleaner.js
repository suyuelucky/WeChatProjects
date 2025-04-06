/**
 * 照片元数据净化工具
 * 用于清理照片元数据，移除潜在敏感信息
 */

// 导入安全过滤器
const SecurityFilter = require('./security-filter');

/**
 * 照片元数据净化工具
 */
const PhotoMetadataCleaner = {
  /**
   * 清理照片元数据，移除潜在敏感信息
   * @param {Object} photoObject 照片对象
   * @returns {Object} 清理后的照片对象
   */
  cleanMetadata(photoObject) {
    // 如果不是对象则直接返回
    if (!photoObject || typeof photoObject !== 'object') {
      return photoObject;
    }
    
    // 创建拷贝，避免修改原对象
    const cleanPhoto = { ...photoObject };
    
    // 移除可能包含敏感数据的字段
    const sensitiveFields = [
      'gpsInfo',           // GPS位置信息
      'deviceInfo',        // 详细设备信息
      'originalName',      // 原始文件名
      'creatorInfo',       // 创建者信息
      'editHistory',       // 编辑历史
      'exif'               // 原始EXIF数据
    ];
    
    sensitiveFields.forEach(field => {
      if (cleanPhoto.hasOwnProperty(field)) {
        delete cleanPhoto[field];
      }
    });
    
    // 保留必要的安全元数据
    const safeMetadata = {};
    
    // 仅保留安全必要字段
    if (photoObject.size) safeMetadata.size = photoObject.size;
    if (photoObject.width) safeMetadata.width = photoObject.width;
    if (photoObject.height) safeMetadata.height = photoObject.height;
    if (photoObject.format) safeMetadata.format = photoObject.format;
    if (photoObject.createdAt) safeMetadata.createdAt = photoObject.createdAt;
    
    // 设置安全的元数据
    cleanPhoto.metadata = safeMetadata;
    
    // 如果有描述字段，进行XSS过滤
    if (cleanPhoto.description) {
      cleanPhoto.description = SecurityFilter.escapeHTML(cleanPhoto.description);
    }
    
    // 如果有标签字段，确保每个标签都进行XSS过滤
    if (cleanPhoto.tags && Array.isArray(cleanPhoto.tags)) {
      cleanPhoto.tags = cleanPhoto.tags.map(tag => 
        typeof tag === 'string' ? SecurityFilter.escapeHTML(tag) : tag
      );
    }
    
    // 限制标题长度
    if (cleanPhoto.title) {
      cleanPhoto.title = SecurityFilter.sanitizeDisplayText(cleanPhoto.title, 100);
    }
    
    return cleanPhoto;
  },
  
  /**
   * 生成安全文件名
   * @param {Object} photo 照片对象
   * @returns {String} 安全文件名
   */
  generateSafeFileName(photo) {
    // 基于照片ID和时间创建安全文件名
    const baseFileName = `photo_${photo.id || Date.now()}`;
    const safeFileName = SecurityFilter.sanitizeFileName(baseFileName);
    
    return `${safeFileName}.jpg`;
  },
  
  /**
   * 清理照片描述
   * @param {String} description 原始描述
   * @param {Number} maxLength 最大长度
   * @returns {String} 清理后的描述
   */
  cleanDescription(description, maxLength = 500) {
    if (!description) {
      return '';
    }
    
    // 使用安全过滤器清理描述
    return SecurityFilter.sanitizeDisplayText(description, maxLength);
  },
  
  /**
   * 移除所有可能的敏感信息
   * @param {Object} photoData 照片数据
   * @returns {Object} 清理后的数据
   */
  removeSensitiveData(photoData) {
    if (!photoData) {
      return null;
    }
    
    // 获取安全数据
    const safePhoto = this.cleanMetadata(photoData);
    
    // 确保文件名安全
    if (safePhoto.fileName) {
      safePhoto.fileName = this.generateSafeFileName(safePhoto);
    }
    
    // 过滤自定义字段
    if (safePhoto.customFields && typeof safePhoto.customFields === 'object') {
      safePhoto.customFields = SecurityFilter.filterUserInput(safePhoto.customFields);
    }
    
    return safePhoto;
  }
};

module.exports = PhotoMetadataCleaner; 