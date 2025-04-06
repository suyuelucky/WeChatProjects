// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 创建集合
    const collections = [
      'users',      // 用户信息
      'diaries',    // 日记
      'photos',     // 照片
      'traces',     // 轨迹记录
      'settings',   // 应用设置
      'feedback'    // 用户反馈
    ]
    
    // 结果记录
    const results = []
    
    // 尝试创建每个集合
    for (const collectionName of collections) {
      try {
        // 检查集合是否已存在
        await db.collection(collectionName).count()
        results.push({ name: collectionName, status: 'already_exists' })
      } catch (err) {
        if (err.errCode === -502005) {
          // 集合不存在，创建集合
          try {
            await db.createCollection(collectionName)
            
            // 为不同集合添加初始数据
            switch (collectionName) {
              case 'settings':
                await db.collection('settings').add({
                  data: {
                    appVersion: '1.0.0',
                    lastUpdated: db.serverDate(),
                    features: {
                      cloudSync: true,
                      offlineMode: true,
                      autoBackup: false
                    }
                  }
                })
                break
                
              case 'users':
                // 不添加初始用户数据，将在用户首次登录时创建
                break
                
              default:
                // 其他集合暂不添加初始数据
                break
            }
            
            results.push({ name: collectionName, status: 'created' })
          } catch (createErr) {
            results.push({ 
              name: collectionName, 
              status: 'error', 
              error: createErr.message 
            })
          }
        } else {
          results.push({ 
            name: collectionName, 
            status: 'error', 
            error: err.message 
          })
        }
      }
    }
    
    return {
      success: true,
      results
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
} 