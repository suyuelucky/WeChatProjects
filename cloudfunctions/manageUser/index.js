// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

// 用户集合
const userCollection = db.collection('users')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取操作类型
  const { action, data } = event
  
  // 当前时间
  const now = db.serverDate()
  
  try {
    // 根据不同操作类型执行不同逻辑
    switch (action) {
      // 获取用户信息
      case 'get':
        return await getUser(openid)
      
      // 创建或更新用户信息
      case 'update':
        return await updateUser(openid, data, now)
      
      // 检查用户是否存在
      case 'checkExist':
        return await checkUserExist(openid)
        
      // 更新用户设置
      case 'updateSettings':
        return await updateUserSettings(openid, data.settings, now)
      
      // 默认返回错误
      default:
        return {
          success: false,
          error: '未知的操作类型'
        }
    }
  } catch (err) {
    console.error('用户操作异常', err)
    return {
      success: false,
      error: err.message
    }
  }
}

// 获取用户信息
async function getUser(openid) {
  try {
    const user = await userCollection.where({
      _openid: openid
    }).get()
    
    if (user.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      }
    }
    
    return {
      success: true,
      data: user.data[0]
    }
  } catch (err) {
    console.error('获取用户信息失败', err)
    return {
      success: false,
      error: err.message
    }
  }
}

// 创建或更新用户信息
async function updateUser(openid, userData, now) {
  try {
    // 检查用户是否已存在
    const existUser = await userCollection.where({
      _openid: openid
    }).count()
    
    // 合并用户数据
    const userInfo = {
      ...userData,
      updateTime: now
    }
    
    if (existUser.total === 0) {
      // 创建新用户
      userInfo._openid = openid
      userInfo.createTime = now
      userInfo.lastActive = now
      
      // 设置默认值
      userInfo.settings = userInfo.settings || {
        theme: 'light',
        notification: true,
        autoSync: true
      }
      
      const result = await userCollection.add({
        data: userInfo
      })
      
      return {
        success: true,
        data: {
          _id: result._id,
          ...userInfo
        },
        isNew: true
      }
    } else {
      // 更新用户信息
      const result = await userCollection.where({
        _openid: openid
      }).update({
        data: {
          ...userInfo,
          lastActive: now
        }
      })
      
      return {
        success: true,
        updated: result.stats.updated,
        isNew: false
      }
    }
  } catch (err) {
    console.error('更新用户信息失败', err)
    return {
      success: false,
      error: err.message
    }
  }
}

// 检查用户是否存在
async function checkUserExist(openid) {
  try {
    const existUser = await userCollection.where({
      _openid: openid
    }).count()
    
    return {
      success: true,
      exist: existUser.total > 0
    }
  } catch (err) {
    console.error('检查用户存在失败', err)
    return {
      success: false,
      error: err.message
    }
  }
}

// 更新用户设置
async function updateUserSettings(openid, settings, now) {
  try {
    // 更新用户设置
    const result = await userCollection.where({
      _openid: openid
    }).update({
      data: {
        'settings': settings,
        'updateTime': now,
        'lastActive': now
      }
    })
    
    return {
      success: true,
      updated: result.stats.updated
    }
  } catch (err) {
    console.error('更新用户设置失败', err)
    return {
      success: false,
      error: err.message
    }
  }
} 