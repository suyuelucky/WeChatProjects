// 云函数入口文件
// 创建时间: 2025年5月10日 14:38:22
// 创建者: Claude助手

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const posts = db.collection('posts')

// 云函数入口函数
exports.main = async (event, context) => {
  const { content, images = [] } = event
  const wxContext = cloud.getWXContext()
  
  // 检查内容是否为空
  if (!content && images.length === 0) {
    return {
      success: false,
      error: '内容不能为空'
    }
  }

  try {
    // 创建博客记录
    const result = await posts.add({
      data: {
        content,
        images,
        createTime: db.serverDate(),
        authorId: wxContext.OPENID || 'anonymous',
        viewCount: 0,
        likeCount: 0
      }
    })
    
    return {
      success: true,
      postId: result._id
    }
  } catch (error) {
    console.error('发布博客失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
} 