/**
 * 博客模块云函数调用辅助工具
 * 创建时间：2025年05月12日 20:36:56
 * 创建者：Claude助手
 */

/**
 * 安全调用云函数
 * 封装了重试、错误处理和环境ID修复功能
 * @param {string} name 云函数名称
 * @param {Object} data 传递给云函数的数据
 * @param {Object} options 配置选项
 * @returns {Promise} 云函数调用结果
 */
function callCloudFunction(name, data = {}, options = {}) {
  const app = getApp();
  
  // 优先使用app全局的云函数调用方法
  if (app && typeof app.callCloudFunction === 'function') {
    return app.callCloudFunction({
      name: name,
      data: data,
      ...options
    });
  }
  
  // 备用方案：直接调用云函数，但增加重试和错误处理
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: name,
      data: data,
      config: {
        timeout: options.timeout || 30000 // 默认30秒超时
      },
      success: (res) => {
        resolve(res);
      },
      fail: (err) => {
        console.error(`博客模块云函数[${name}]调用失败:`, err);
        
        // 如果是环境ID错误，尝试修复
        if (err.errMsg && err.errMsg.includes('env check invalid')) {
          console.warn('检测到环境ID错误，尝试重新初始化云环境');
          
          // 尝试重新初始化云环境
          try {
            wx.cloud.init({
              env: 'cloudbase-5giucop314e2cd87',
              traceUser: true
            });
            
            // 重试一次
            wx.cloud.callFunction({
              name: name,
              data: data,
              config: {
                timeout: options.timeout || 30000
              },
              success: (retryRes) => {
                console.log(`云函数[${name}]重试成功`);
                resolve(retryRes);
              },
              fail: (retryErr) => {
                console.error(`云函数[${name}]重试仍然失败:`, retryErr);
                reject(retryErr);
              }
            });
          } catch (initErr) {
            console.error('重新初始化云环境失败:', initErr);
            reject(err); // 返回原始错误
          }
        } else {
          // 其他错误直接返回
          reject(err);
        }
      }
    });
  });
}

/**
 * 获取用户OpenID
 * @returns {Promise<string>} OpenID
 */
function getOpenId() {
  return callCloudFunction('getOpenId')
    .then(res => {
      return res.result.openid || '';
    })
    .catch(err => {
      console.error('获取OpenID失败:', err);
      return '';
    });
}

/**
 * 获取博客列表
 * @param {Object} params 查询参数
 * @returns {Promise<Array>} 博客列表
 */
function getBlogList(params = {}) {
  return callCloudFunction('blog', {
    action: 'list',
    params: params
  }).then(res => {
    return res.result.list || [];
  }).catch(err => {
    console.error('获取博客列表失败:', err);
    return [];
  });
}

/**
 * 发布博客
 * @param {Object} blogData 博客数据
 * @returns {Promise<Object>} 发布结果
 */
function publishBlog(blogData) {
  return callCloudFunction('blog', {
    action: 'publish',
    blog: blogData
  });
}

/**
 * 点赞博客
 * @param {string} blogId 博客ID
 * @returns {Promise<Object>} 点赞结果
 */
function likeBlog(blogId) {
  return callCloudFunction('blog', {
    action: 'like',
    blogId: blogId
  });
}

/**
 * 获取博客详情
 * @param {string} blogId 博客ID
 * @returns {Promise<Object>} 博客详情
 */
function getBlogDetail(blogId) {
  return callCloudFunction('blog', {
    action: 'detail',
    blogId: blogId
  }).then(res => {
    return res.result.blog || null;
  }).catch(err => {
    console.error('获取博客详情失败:', err);
    return null;
  });
}

module.exports = {
  callCloudFunction,
  getOpenId,
  getBlogList,
  publishBlog,
  likeBlog,
  getBlogDetail
}; 