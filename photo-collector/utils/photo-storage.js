/**
 * 照片存储管理工具
 * 负责管理照片在本地的存储、查询和上传状态跟踪
 */

// 存储键名
var STORAGE_KEY = {
  DATABASE: 'PHOTO_COLLECTOR_DB' // 数据库存储键
};

// 默认数据库结构
var DEFAULT_DATABASE = {
  version: '1.0.0',
  projects: [],       // 项目列表
  photos: [],         // 照片列表
  lastUpdate: null    // 最后更新时间
};

/**
 * 获取数据库
 * 如果不存在则初始化一个新的
 */
function getDatabase(callback) {
  try {
    var db = wx.getStorageSync(STORAGE_KEY.DATABASE);
    if (!db) {
      db = DEFAULT_DATABASE;
      db.lastUpdate = new Date().toISOString();
      wx.setStorageSync(STORAGE_KEY.DATABASE, db);
    }
    
    if (callback) {
      callback(db);
    }
    return db;
  } catch (e) {
    console.error('获取数据库失败:', e);
    if (callback) {
      callback(null);
    }
    return null;
  }
}

/**
 * 保存数据库
 */
function saveDatabase(db, callback) {
  try {
    db.lastUpdate = new Date().toISOString();
    wx.setStorageSync(STORAGE_KEY.DATABASE, db);
    if (callback) {
      callback(true);
    }
    return true;
  } catch (e) {
    console.error('保存数据库失败:', e);
    if (callback) {
      callback(false);
    }
    return false;
  }
}

/**
 * 初始化数据库
 */
function initDatabase(callback) {
  try {
    // 检查是否存在数据库，不存在则创建
    var db = wx.getStorageSync(STORAGE_KEY.DATABASE);
    if (!db) {
      db = DEFAULT_DATABASE;
      db.lastUpdate = new Date().toISOString();
      wx.setStorageSync(STORAGE_KEY.DATABASE, db);
    }
    
    if (callback) {
      callback(true);
    }
    return true;
  } catch (e) {
    console.error('初始化数据库失败:', e);
    if (callback) {
      callback(false);
    }
    return false;
  }
}

/**
 * 创建新项目
 */
function createProject(name, callback) {
  try {
    var db = getDatabase();
    if (!db) {
      if (callback) {
        callback(false, null);
      }
      return;
    }
    
    // 生成唯一ID
    var projectId = 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    // 检查ID是否已存在
    var existingProject = db.projects.find(function(p) {
      return p.id === projectId;
    });
    
    if (existingProject) {
      // 极小概率下ID冲突，重新生成
      projectId = 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    }
    
    // 创建新项目
    var newProject = {
      id: projectId,
      name: name,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    };
    
    db.projects.push(newProject);
    saveDatabase(db);
    
    if (callback) {
      callback(true, projectId);
    }
  } catch (e) {
    console.error('创建项目失败:', e);
    if (callback) {
      callback(false, null);
    }
  }
}

/**
 * 在项目中添加位置
 */
function addLocation(projectId, name, callback) {
  try {
    var db = getDatabase();
    if (!db) {
      if (callback) {
        callback(false, null);
      }
      return;
    }
    
    // 查找项目
    var project = db.projects.find(function(p) {
      return p.id === projectId;
    });
    
    if (!project) {
      console.error('项目不存在:', projectId);
      if (callback) {
        callback(false, null);
      }
      return;
    }
    
    // 如果项目没有locations数组，创建一个
    if (!project.locations) {
      project.locations = [];
    }
    
    // 生成唯一ID
    var locationId = 'l_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    // 创建新位置
    var newLocation = {
      id: locationId,
      name: name,
      createTime: new Date().toISOString()
    };
    
    project.locations.push(newLocation);
    project.updateTime = new Date().toISOString();
    
    saveDatabase(db);
    
    if (callback) {
      callback(true, locationId);
    }
  } catch (e) {
    console.error('添加位置失败:', e);
    if (callback) {
      callback(false, null);
    }
  }
}

/**
 * 获取项目列表
 */
function getProjects(callback) {
  try {
    var db = getDatabase();
    if (!db) {
      if (callback) {
        callback([]);
      }
      return [];
    }
    
    // 按照更新时间降序排序
    var projects = db.projects.sort(function(a, b) {
      return new Date(b.updateTime) - new Date(a.updateTime);
    });
    
    if (callback) {
      callback(projects);
    }
    return projects;
  } catch (e) {
    console.error('获取项目列表失败:', e);
    if (callback) {
      callback([]);
    }
    return [];
  }
}

/**
 * 获取位置列表
 */
function getLocations(projectId, callback) {
  try {
    var db = getDatabase();
    if (!db) {
      if (callback) {
        callback([]);
      }
      return [];
    }
    
    // 查找项目
    var project = db.projects.find(function(p) {
      return p.id === projectId;
    });
    
    if (!project || !project.locations) {
      if (callback) {
        callback([]);
      }
      return [];
    }
    
    // 按照创建时间降序排序
    var locations = project.locations.sort(function(a, b) {
      return new Date(b.createTime) - new Date(a.createTime);
    });
    
    if (callback) {
      callback(locations);
    }
    return locations;
  } catch (e) {
    console.error('获取位置列表失败:', e);
    if (callback) {
      callback([]);
    }
    return [];
  }
}

/**
 * 保存照片
 */
function savePhoto(photoInfo, callback) {
  try {
    var db = getDatabase();
    if (!db) {
      if (callback) {
        callback(false, null);
      }
      return;
    }
    
    // 生成唯一ID
    var photoId = 'photo_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    // 构建照片对象
    var newPhoto = {
      id: photoId,
      projectId: photoInfo.projectId,
      locationId: photoInfo.locationId,
      filePath: photoInfo.filePath,
      thumbPath: photoInfo.thumbPath || '',
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      uploaded: false,
      uploadTime: null,
      remark: photoInfo.remark || ''
    };
    
    db.photos.push(newPhoto);
    saveDatabase(db);
    
    if (callback) {
      callback(true, photoId);
    }
    return photoId;
  } catch (e) {
    console.error('保存照片失败:', e);
    if (callback) {
      callback(false, null);
    }
    return null;
  }
}

/**
 * 获取照片列表
 * 可按项目ID和位置ID筛选
 */
function getPhotos(filter, callback) {
  try {
    var db = getDatabase();
    if (!db) {
      if (callback) {
        callback([]);
      }
      return [];
    }
    
    var photos = db.photos;
    
    // 应用过滤条件
    if (filter) {
      if (filter.projectId) {
        photos = photos.filter(function(p) {
          return p.projectId === filter.projectId;
        });
      }
      
      if (filter.locationId) {
        photos = photos.filter(function(p) {
          return p.locationId === filter.locationId;
        });
      }
      
      if (filter.uploaded !== undefined) {
        photos = photos.filter(function(p) {
          return p.uploaded === filter.uploaded;
        });
      }
    }
    
    // 按照创建时间降序排序
    photos = photos.sort(function(a, b) {
      return new Date(b.createTime) - new Date(a.createTime);
    });
    
    if (callback) {
      callback(photos);
    }
    return photos;
  } catch (e) {
    console.error('获取照片列表失败:', e);
    if (callback) {
      callback([]);
    }
    return [];
  }
}

/**
 * 更新照片上传状态
 */
function updatePhotoUploadStatus(photoId, uploaded, callback) {
  try {
    var db = getDatabase();
    if (!db) {
      if (callback) {
        callback(false);
      }
      return false;
    }
    
    // 查找照片
    var photoIndex = db.photos.findIndex(function(p) {
      return p.id === photoId;
    });
    
    if (photoIndex === -1) {
      console.error('照片不存在:', photoId);
      if (callback) {
        callback(false);
      }
      return false;
    }
    
    // 更新状态
    db.photos[photoIndex].uploaded = uploaded;
    db.photos[photoIndex].updateTime = new Date().toISOString();
    
    if (uploaded) {
      db.photos[photoIndex].uploadTime = new Date().toISOString();
    }
    
    saveDatabase(db);
    
    if (callback) {
      callback(true);
    }
    return true;
  } catch (e) {
    console.error('更新照片上传状态失败:', e);
    if (callback) {
      callback(false);
    }
    return false;
  }
}

/**
 * 删除照片
 */
function deletePhoto(photoId, callback) {
  try {
    var db = getDatabase();
    if (!db) {
      if (callback) {
        callback(false);
      }
      return false;
    }
    
    // 查找照片
    var photoIndex = db.photos.findIndex(function(p) {
      return p.id === photoId;
    });
    
    if (photoIndex === -1) {
      console.error('照片不存在:', photoId);
      if (callback) {
        callback(false);
      }
      return false;
    }
    
    // 获取照片路径以便删除文件
    var photo = db.photos[photoIndex];
    
    // 从数据库中删除
    db.photos.splice(photoIndex, 1);
    saveDatabase(db);
    
    // 删除本地文件
    try {
      if (photo.filePath) {
        wx.removeSavedFile({
          filePath: photo.filePath,
          fail: function(err) {
            console.error('删除照片文件失败:', err);
          }
        });
      }
      
      if (photo.thumbPath) {
        wx.removeSavedFile({
          filePath: photo.thumbPath,
          fail: function(err) {
            console.error('删除缩略图文件失败:', err);
          }
        });
      }
    } catch (fileErr) {
      console.error('删除文件时出错:', fileErr);
      // 继续执行，即使文件删除失败
    }
    
    if (callback) {
      callback(true);
    }
    return true;
  } catch (e) {
    console.error('删除照片失败:', e);
    if (callback) {
      callback(false);
    }
    return false;
  }
}

// 导出模块
module.exports = {
  initDatabase: initDatabase,
  getDatabase: getDatabase,
  createProject: createProject,
  addLocation: addLocation,
  getProjects: getProjects,
  getLocations: getLocations,
  savePhoto: savePhoto,
  getPhotos: getPhotos,
  updatePhotoUploadStatus: updatePhotoUploadStatus,
  deletePhoto: deletePhoto
}; 