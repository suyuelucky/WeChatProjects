// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

// 文件集合
const photosCollection = db.collection('photos')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取操作类型
  const { action, fileID, fileInfo } = event
  
  // 当前时间
  const now = db.serverDate()
  
  try {
    // 根据不同操作类型执行不同逻辑
    switch (action) {
      // 保存文件信息
      case 'save':
        return await saveFileInfo(openid, fileID, fileInfo, now)
      
      // 获取文件列表
      case 'list':
        return await listFiles(openid, event.type, event.page || 1, event.pageSize || 20)
      
      // 删除文件
      case 'delete':
        return await deleteFile(openid, fileID)
        
      // 批量删除文件
      case 'batchDelete':
        return await batchDeleteFiles(openid, event.fileIDs)
        
      // 获取文件详情
      case 'detail':
        return await getFileDetail(openid, fileID)
      
      // 默认返回错误
      default:
        return {
          success: false,
          error: '未知的操作类型'
        }
    }
  } catch (err) {
    console.error('文件操作异常', err)
    return {
      success: false,
      error: err.message
    }
  }
}

// 保存文件信息
async function saveFileInfo(openid, fileID, fileInfo, now) {
  try {
    // 检查文件记录是否已存在
    const existFile = await photosCollection.where({
      fileID: fileID
    }).count()
    
    // 构建文件信息
    const photoInfo = {
      ...fileInfo,
      fileID: fileID,
      _openid: openid,
      updateTime: now
    }
    
    if (existFile.total === 0) {
      // 创建新文件记录
      photoInfo.createTime = now
      photoInfo.status = 'active'
      
      const result = await photosCollection.add({
        data: photoInfo
      })
      
      return {
        success: true,
        fileID: fileID,
        _id: result._id,
        isNew: true
      }
    } else {
      // 更新文件记录
      const result = await photosCollection.where({
        fileID: fileID
      }).update({
        data: photoInfo
      })
      
      return {
        success: true,
        updated: result.stats.updated,
        isNew: false
      }
    }
  } catch (err) {
    console.error('保存文件信息失败', err)
    return {
      success: false,
      error: err.message
    }
  }
}

// 获取文件列表
async function listFiles(openid, type, page, pageSize) {
  try {
    // 构建查询条件
    const condition = {
      _openid: openid,
      status: 'active'
    }
    
    // 如果指定了类型，添加类型过滤
    if (type) {
      condition.type = type
    }
    
    // 计算总数
    const countResult = await photosCollection.where(condition).count()
    const total = countResult.total
    
    // 计算分页
    const skip = (page - 1) * pageSize
    
    // 查询文件列表
    const filesResult = await photosCollection.where(condition)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    return {
      success: true,
      data: filesResult.data,
      pagination: {
        total,
        page,
        pageSize,
        pages: Math.ceil(total / pageSize)
      }
    }
  } catch (err) {
    console.error('获取文件列表失败', err)
    return {
      success: false,
      error: err.message
    }
  }
}

// 删除文件
async function deleteFile(openid, fileID) {
  try {
    // 先查询文件记录确保属于当前用户
    const fileRecord = await photosCollection.where({
      fileID: fileID,
      _openid: openid
    }).get()
    
    if (fileRecord.data.length === 0) {
      return {
        success: false,
        error: '文件不存在或无权限删除'
      }
    }
    
    // 从云存储中删除
    await cloud.deleteFile({
      fileList: [fileID]
    })
    
    // 更新数据库状态（软删除）
    const result = await photosCollection.where({
      fileID: fileID
    }).update({
      data: {
        status: 'deleted',
        deleteTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      deleted: result.stats.updated
    }
  } catch (err) {
    console.error('删除文件失败', err)
    return {
      success: false,
      error: err.message
    }
  }
}

// 批量删除文件
async function batchDeleteFiles(openid, fileIDs) {
  try {
    if (!Array.isArray(fileIDs) || fileIDs.length === 0) {
      return {
        success: false,
        error: '文件ID列表无效'
      }
    }
    
    // 从云存储中删除
    const deleteResult = await cloud.deleteFile({
      fileList: fileIDs
    })
    
    // 更新数据库状态（软删除）
    const updateResult = await photosCollection.where({
      fileID: _.in(fileIDs),
      _openid: openid
    }).update({
      data: {
        status: 'deleted',
        deleteTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      cloudDeleteResult: deleteResult,
      dbUpdateResult: {
        updated: updateResult.stats.updated
      }
    }
  } catch (err) {
    console.error('批量删除文件失败', err)
    return {
      success: false,
      error: err.message
    }
  }
}

// 获取文件详情
async function getFileDetail(openid, fileID) {
  try {
    const fileRecord = await photosCollection.where({
      fileID: fileID,
      _openid: openid
    }).get()
    
    if (fileRecord.data.length === 0) {
      return {
        success: false,
        error: '文件不存在或无权限查看'
      }
    }
    
    // 获取临时访问链接
    const tempUrlResult = await cloud.getTempFileURL({
      fileList: [fileID]
    })
    
    const fileData = fileRecord.data[0]
    fileData.tempUrl = tempUrlResult.fileList[0].tempFileURL
    fileData.requestId = tempUrlResult.fileList[0].requestId
    
    return {
      success: true,
      data: fileData
    }
  } catch (err) {
    console.error('获取文件详情失败', err)
    return {
      success: false,
      error: err.message
    }
  }
} 