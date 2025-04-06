/**
 * 云服务模块
 * 提供云函数调用、数据库操作和文件存储的统一接口
 */

// 检查云环境是否可用
const checkCloud = () => {
  if (!wx.cloud) {
    console.error('请使用2.2.3以上的基础库以使用云能力');
    return false;
  }
  return true;
};

// 初始化云环境
const initCloud = () => {
  if (!checkCloud()) return false;
  
  try {
    const env = 'cloud1-0g4k4chab5be87c7'; // 请替换为你的云环境ID
    wx.cloud.init({
      env,
      traceUser: true,
    });
    console.log('云环境初始化成功', env);
    return true;
  } catch (err) {
    console.error('云环境初始化失败', err);
    return false;
  }
};

// 确保云环境已初始化
(() => {
  initCloud();
})();

/**
 * 调用云函数
 * @param {string} name 云函数名称
 * @param {object} data 请求参数
 * @returns {Promise} 云函数调用结果
 */
const callFunction = (name, data = {}) => {
  if (!checkCloud()) return Promise.reject(new Error('云环境不可用'));
  
  return wx.cloud.callFunction({
    name,
    data
  }).catch(err => {
    console.error(`云函数 ${name} 调用失败:`, err);
    throw err;
  });
};

/**
 * 获取数据库集合引用
 * @param {string} collection 集合名称
 * @returns {object} 集合引用
 */
const getCollection = (collection) => {
  if (!checkCloud()) return null;
  
  try {
    return wx.cloud.database().collection(collection);
  } catch (err) {
    console.error(`获取集合 ${collection} 引用失败:`, err);
    return null;
  }
};

/**
 * 添加数据到集合
 * @param {string} collection 集合名称
 * @param {object} data 要添加的数据
 * @returns {Promise} 添加结果
 */
const addDocument = (collection, data) => {
  const coll = getCollection(collection);
  if (!coll) return Promise.reject(new Error('获取集合引用失败'));
  
  return coll.add({ data }).catch(err => {
    console.error(`添加数据到 ${collection} 失败:`, err);
    throw err;
  });
};

/**
 * 获取集合中的文档
 * @param {string} collection 集合名称
 * @param {object} query 查询条件
 * @param {number} limit 限制返回数量
 * @param {number} skip 跳过文档数量
 * @returns {Promise} 查询结果
 */
const getDocuments = (collection, query = {}, limit = 10, skip = 0) => {
  const coll = getCollection(collection);
  if (!coll) return Promise.reject(new Error('获取集合引用失败'));
  
  try {
    let queryObj = coll.where(query);
    
    if (skip > 0) {
      queryObj = queryObj.skip(skip);
    }
    
    return queryObj.limit(limit).get().catch(err => {
      console.error(`查询 ${collection} 失败:`, err);
      throw err;
    });
  } catch (err) {
    console.error(`构建查询失败:`, err);
    return Promise.reject(err);
  }
};

/**
 * 更新文档
 * @param {string} collection 集合名称
 * @param {string} docId 文档ID
 * @param {object} data 要更新的数据
 * @returns {Promise} 更新结果
 */
const updateDocument = (collection, docId, data) => {
  const coll = getCollection(collection);
  if (!coll) return Promise.reject(new Error('获取集合引用失败'));
  
  return coll.doc(docId).update({ data }).catch(err => {
    console.error(`更新文档 ${docId} 失败:`, err);
    throw err;
  });
};

/**
 * 删除文档
 * @param {string} collection 集合名称
 * @param {string} docId 文档ID
 * @returns {Promise} 删除结果
 */
const removeDocument = (collection, docId) => {
  const coll = getCollection(collection);
  if (!coll) return Promise.reject(new Error('获取集合引用失败'));
  
  return coll.doc(docId).remove().catch(err => {
    console.error(`删除文档 ${docId} 失败:`, err);
    throw err;
  });
};

/**
 * 上传文件到云存储
 * @param {string} cloudPath 云端存储路径
 * @param {string} filePath 本地文件路径
 * @param {object} options 额外选项
 * @returns {Promise} 上传结果
 */
const uploadFile = (cloudPath, filePath, options = {}) => {
  if (!checkCloud()) return Promise.reject(new Error('云环境不可用'));
  
  return wx.cloud.uploadFile({
    cloudPath,
    filePath,
    ...options
  }).catch(err => {
    console.error(`上传文件到 ${cloudPath} 失败:`, err);
    throw err;
  });
};

/**
 * 从云存储下载文件
 * @param {string} fileID 文件ID
 * @returns {Promise} 下载结果
 */
const downloadFile = (fileID) => {
  if (!checkCloud()) return Promise.reject(new Error('云环境不可用'));
  
  return wx.cloud.downloadFile({
    fileID
  }).catch(err => {
    console.error(`下载文件 ${fileID} 失败:`, err);
    throw err;
  });
};

/**
 * 获取文件临时下载链接
 * @param {string|array} fileList 文件ID或文件ID数组
 * @returns {Promise} 获取结果
 */
const getTempFileURL = (fileList) => {
  if (!checkCloud()) return Promise.reject(new Error('云环境不可用'));
  
  const files = Array.isArray(fileList) ? fileList : [fileList];
  
  return wx.cloud.getTempFileURL({
    fileList: files
  }).catch(err => {
    console.error(`获取文件链接失败:`, err);
    throw err;
  });
};

/**
 * 删除云存储文件
 * @param {string|array} fileList 文件ID或文件ID数组
 * @returns {Promise} 删除结果
 */
const deleteFile = (fileList) => {
  if (!checkCloud()) return Promise.reject(new Error('云环境不可用'));
  
  const files = Array.isArray(fileList) ? fileList : [fileList];
  
  return wx.cloud.deleteFile({
    fileList: files
  }).catch(err => {
    console.error(`删除文件失败:`, err);
    throw err;
  });
};

// 导出模块
module.exports = {
  // 云环境
  initCloud,
  checkCloud,
  
  // 云函数
  callFunction,
  
  // 数据库
  getCollection,
  addDocument,
  getDocuments,
  updateDocument,
  removeDocument,
  
  // 文件存储
  uploadFile,
  downloadFile,
  getTempFileURL,
  deleteFile
}; 