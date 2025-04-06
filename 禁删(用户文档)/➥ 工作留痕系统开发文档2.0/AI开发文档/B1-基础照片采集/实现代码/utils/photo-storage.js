/**
 * 照片存储工具
 * 
 * 提供照片的本地存储、管理和查询功能
 */

const PHOTO_DB_KEY = 'photo_database';
const PHOTO_LIST_PREFIX = 'photo_list_';

/**
 * 照片数据库结构
 * {
 *   projectList: [项目ID1, 项目ID2, ...],
 *   projects: {
 *     [项目ID]: {
 *       name: 项目名称,
 *       locations: [位置1, 位置2, ...],
 *       createTime: 创建时间,
 *       updateTime: 更新时间
 *     },
 *     ...
 *   }
 * }
 * 
 * 照片列表结构（按项目和位置分开存储）
 * [
 *   {
 *     id: 照片ID,
 *     filePath: 照片本地路径, 
 *     devicePosition: 前置/后置摄像头,
 *     uploadStatus: 上传状态,
 *     createTime: 拍摄时间,
 *     uploadTime: 上传时间
 *   },
 *   ...
 * ]
 */

// 初始化数据库
function initDatabase() {
  return {
    projectList: [],
    projects: {}
  };
}

// 获取数据库
function getDatabase() {
  return new Promise((resolve) => {
    try {
      const dbString = wx.getStorageSync(PHOTO_DB_KEY);
      if (dbString) {
        const db = JSON.parse(dbString);
        resolve(db);
      } else {
        const newDb = initDatabase();
        wx.setStorageSync(PHOTO_DB_KEY, JSON.stringify(newDb));
        resolve(newDb);
      }
    } catch (err) {
      console.error('获取照片数据库失败:', err);
      const newDb = initDatabase();
      wx.setStorageSync(PHOTO_DB_KEY, JSON.stringify(newDb));
      resolve(newDb);
    }
  });
}

// 保存数据库
function saveDatabase(db) {
  return new Promise((resolve, reject) => {
    try {
      wx.setStorageSync(PHOTO_DB_KEY, JSON.stringify(db));
      resolve();
    } catch (err) {
      console.error('保存照片数据库失败:', err);
      reject(err);
    }
  });
}

// 获取照片列表存储键
function getPhotoListKey(projectId, locationName) {
  return `${PHOTO_LIST_PREFIX}${projectId}_${locationName || 'default'}`;
}

// 获取照片列表
function getPhotoList(projectId, locationName) {
  return new Promise((resolve) => {
    try {
      const key = getPhotoListKey(projectId, locationName);
      const listString = wx.getStorageSync(key);
      
      if (listString) {
        const list = JSON.parse(listString);
        resolve(list);
      } else {
        resolve([]);
      }
    } catch (err) {
      console.error('获取照片列表失败:', err);
      resolve([]);
    }
  });
}

// 保存照片列表
function savePhotoList(projectId, locationName, photoList) {
  return new Promise((resolve, reject) => {
    try {
      const key = getPhotoListKey(projectId, locationName);
      wx.setStorageSync(key, JSON.stringify(photoList));
      resolve();
    } catch (err) {
      console.error('保存照片列表失败:', err);
      reject(err);
    }
  });
}

// 确保项目和位置存在
async function ensureProjectAndLocation(projectId, locationName) {
  if (!projectId) {
    throw new Error('项目ID不能为空');
  }
  
  const db = await getDatabase();
  
  // 项目不存在则创建
  if (!db.projectList.includes(projectId)) {
    db.projectList.push(projectId);
    db.projects[projectId] = {
      name: projectId, // 使用ID作为默认名称
      locations: locationName ? [locationName] : [],
      createTime: Date.now(),
      updateTime: Date.now()
    };
  } 
  // 位置不存在则添加
  else if (locationName && !db.projects[projectId].locations.includes(locationName)) {
    db.projects[projectId].locations.push(locationName);
    db.projects[projectId].updateTime = Date.now();
  }
  
  await saveDatabase(db);
}

/**
 * 创建新项目
 * @param {string} projectId 项目ID
 * @param {string} projectName 项目名称
 * @returns {Promise<void>}
 */
async function createProject(projectId, projectName) {
  if (!projectId || !projectName) {
    throw new Error('项目ID和名称不能为空');
  }
  
  const db = await getDatabase();
  
  // 检查项目ID是否已存在
  if (db.projectList.includes(projectId)) {
    throw new Error('项目ID已存在');
  }
  
  // 创建新项目
  db.projectList.push(projectId);
  db.projects[projectId] = {
    name: projectName,
    locations: [],
    createTime: Date.now(),
    updateTime: Date.now()
  };
  
  await saveDatabase(db);
}

/**
 * 添加位置到项目
 * @param {string} projectId 项目ID
 * @param {string} locationName 位置名称
 * @returns {Promise<void>}
 */
async function addLocation(projectId, locationName) {
  if (!projectId || !locationName) {
    throw new Error('项目ID和位置名称不能为空');
  }
  
  const db = await getDatabase();
  
  // 检查项目是否存在
  if (!db.projectList.includes(projectId)) {
    throw new Error('项目不存在');
  }
  
  // 检查位置是否已存在
  if (db.projects[projectId].locations.includes(locationName)) {
    throw new Error('位置已存在');
  }
  
  // 添加位置
  db.projects[projectId].locations.push(locationName);
  db.projects[projectId].updateTime = Date.now();
  
  await saveDatabase(db);
}

/**
 * 保存拍摄的照片
 * @param {Object} photoData 照片数据
 * @param {string} photoData.projectId 项目ID
 * @param {string} photoData.locationName 位置名称
 * @param {string} photoData.tempImagePath 临时图片路径
 * @param {string} photoData.devicePosition 相机位置(前置/后置)
 * @param {number} photoData.createTime 创建时间
 * @returns {Promise<string>} 保存后的文件ID
 */
async function savePhoto(photoData) {
  const { projectId, locationName = 'default', tempImagePath, devicePosition, createTime } = photoData;
  
  if (!projectId || !tempImagePath) {
    throw new Error('项目ID和图片路径不能为空');
  }
  
  try {
    // 确保项目和位置存在
    await ensureProjectAndLocation(projectId, locationName);
    
    // 生成唯一ID
    const photoId = `${projectId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // 保存图片到本地文件系统
    const savedFilePath = await saveImageToLocal(tempImagePath, photoId);
    
    // 获取现有照片列表
    const photoList = await getPhotoList(projectId, locationName);
    
    // 添加新照片信息
    const newPhoto = {
      id: photoId,
      filePath: savedFilePath,
      devicePosition: devicePosition || 'back',
      uploadStatus: 'pending', // 待上传
      createTime: createTime || Date.now(),
      uploadTime: null
    };
    
    photoList.push(newPhoto);
    
    // 保存更新后的照片列表
    await savePhotoList(projectId, locationName, photoList);
    
    return photoId;
  } catch (err) {
    console.error('保存照片失败:', err);
    throw err;
  }
}

/**
 * 将临时图片保存到本地文件系统
 * @param {string} tempImagePath 临时图片路径
 * @param {string} photoId 照片ID
 * @returns {Promise<string>} 保存后的文件路径
 */
function saveImageToLocal(tempImagePath, photoId) {
  return new Promise((resolve, reject) => {
    // 构建文件名和目标路径
    const fileName = `${photoId}.jpg`;
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
    
    // 保存文件
    wx.saveFile({
      tempFilePath: tempImagePath,
      filePath: filePath,
      success: (res) => {
        resolve(res.savedFilePath);
      },
      fail: (err) => {
        console.error('保存图片到本地失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 获取照片数量
 * @param {string} projectId 项目ID
 * @param {string} locationName 位置名称
 * @returns {Promise<number>} 照片数量
 */
async function getPhotoCount(projectId, locationName = 'default') {
  try {
    const photoList = await getPhotoList(projectId, locationName);
    return photoList.length;
  } catch (err) {
    console.error('获取照片数量失败:', err);
    return 0;
  }
}

/**
 * 获取指定项目和位置的照片列表
 * @param {string} projectId 项目ID
 * @param {string} locationName 位置名称
 * @param {Object} options 查询选项
 * @param {number} options.page 页码
 * @param {number} options.pageSize 每页大小
 * @param {string} options.sortBy 排序字段
 * @param {string} options.order 排序方向 asc/desc
 * @returns {Promise<Array>} 照片列表
 */
async function getPhotos(projectId, locationName = 'default', options = {}) {
  try {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'createTime',
      order = 'desc'
    } = options;
    
    // 获取照片列表
    let photoList = await getPhotoList(projectId, locationName);
    
    // 排序
    photoList.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (order === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
    
    // 分页
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return photoList.slice(startIndex, endIndex);
  } catch (err) {
    console.error('获取照片列表失败:', err);
    return [];
  }
}

/**
 * 删除照片
 * @param {string} projectId 项目ID
 * @param {string} locationName 位置名称
 * @param {string} photoId 照片ID
 * @returns {Promise<boolean>} 是否删除成功
 */
async function deletePhoto(projectId, locationName = 'default', photoId) {
  try {
    // 获取照片列表
    const photoList = await getPhotoList(projectId, locationName);
    
    // 查找照片索引
    const index = photoList.findIndex(photo => photo.id === photoId);
    
    if (index === -1) {
      return false;
    }
    
    // 删除本地文件
    const filePath = photoList[index].filePath;
    
    try {
      await new Promise((resolve, reject) => {
        wx.removeSavedFile({
          filePath: filePath,
          success: resolve,
          fail: reject
        });
      });
    } catch (err) {
      console.error('删除本地文件失败:', err);
      // 即使删除文件失败，也继续删除数据库中的记录
    }
    
    // 从列表中移除
    photoList.splice(index, 1);
    
    // 保存更新后的照片列表
    await savePhotoList(projectId, locationName, photoList);
    
    return true;
  } catch (err) {
    console.error('删除照片失败:', err);
    return false;
  }
}

/**
 * 更新照片上传状态
 * @param {string} projectId 项目ID
 * @param {string} locationName 位置名称
 * @param {string} photoId 照片ID
 * @param {string} status 上传状态 success/failed/pending
 * @returns {Promise<boolean>} 是否更新成功
 */
async function updatePhotoUploadStatus(projectId, locationName = 'default', photoId, status) {
  try {
    // 获取照片列表
    const photoList = await getPhotoList(projectId, locationName);
    
    // 查找照片索引
    const index = photoList.findIndex(photo => photo.id === photoId);
    
    if (index === -1) {
      return false;
    }
    
    // 更新状态
    photoList[index].uploadStatus = status;
    
    if (status === 'success') {
      photoList[index].uploadTime = Date.now();
    }
    
    // 保存更新后的照片列表
    await savePhotoList(projectId, locationName, photoList);
    
    return true;
  } catch (err) {
    console.error('更新照片上传状态失败:', err);
    return false;
  }
}

/**
 * 批量清理已上传的照片
 * @param {string} projectId 项目ID
 * @param {string} locationName 位置名称
 * @returns {Promise<number>} 清理的照片数量
 */
async function cleanUploadedPhotos(projectId, locationName = 'default') {
  try {
    // 获取照片列表
    const photoList = await getPhotoList(projectId, locationName);
    
    // 找出已上传的照片
    const uploadedPhotos = photoList.filter(photo => photo.uploadStatus === 'success');
    
    let cleanCount = 0;
    
    // 删除已上传的照片
    for (const photo of uploadedPhotos) {
      try {
        await new Promise((resolve, reject) => {
          wx.removeSavedFile({
            filePath: photo.filePath,
            success: resolve,
            fail: reject
          });
        });
        cleanCount++;
      } catch (err) {
        console.error('删除已上传照片失败:', err);
      }
    }
    
    // 更新照片列表，移除已删除的照片
    const newPhotoList = photoList.filter(photo => photo.uploadStatus !== 'success');
    
    // 保存更新后的照片列表
    await savePhotoList(projectId, locationName, newPhotoList);
    
    return cleanCount;
  } catch (err) {
    console.error('清理已上传照片失败:', err);
    return 0;
  }
}

// 导出照片存储工具函数
module.exports = {
  getDatabase,
  createProject,
  addLocation,
  savePhoto,
  getPhotoCount,
  getPhotos,
  deletePhoto,
  updatePhotoUploadStatus,
  cleanUploadedPhotos
};