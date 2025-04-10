/**
 * 博客模块修复4-重复导航函数
 * 创建时间：2025年04月11日 00:03:42
 * 创建者：Claude助手
 * 
 * 本文件实现对博客模块中存在的重复导航函数问题的修复
 * 问题描述：博客模块存在两个功能完全相同的导航函数，增加维护负担
 */

/**
 * 修复方案：
 * 1. 合并两个重复的导航函数为一个统一函数
 * 2. 确保所有调用处都使用新函数
 * 3. 增强导航函数的鲁棒性和功能
 */

// ========================= 问题分析 =========================

/**
 * 当前存在的两个重复函数：
 * 
 * 1. onTapBlogItem - 当用户点击博客项时导航到详情页
 * 2. goDetail - 在虚拟列表模式下点击博客项导航到详情页
 * 
 * 问题：
 * - 两个函数逻辑几乎完全相同，都是导航到博客详情页
 * - 但数据获取方式不同，增加了维护负担
 * - 如果需要修改导航逻辑，必须同时修改两个地方
 */

// ========================= 修复实现 =========================

/**
 * 新的统一导航函数
 * 兼容两种数据获取方式，增强鲁棒性
 * 
 * @param {Object} e 事件对象
 * @param {Object} [options] 可选参数对象
 * @returns {void}
 */
const navigateToBlogDetail = function(e, options = {}) {
  try {
    let blogId = '';
    
    // 兼容不同的数据传递方式
    if (options.blogId) {
      // 直接通过参数传入
      blogId = options.blogId;
    } else if (e && e.currentTarget && e.currentTarget.dataset) {
      const dataset = e.currentTarget.dataset;
      
      // 方式1: dataset.id 形式 (原onTapBlogItem)
      if (dataset.id) {
        blogId = dataset.id;
      } 
      // 方式2: dataset.blog.id 形式 (原goDetail)
      else if (dataset.blog && dataset.blog.id) {
        blogId = dataset.blog.id;
      }
    }
    
    // 检查是否获取到有效ID
    if (!blogId) {
      console.error('[博客导航] 未找到有效的博客ID');
      wx.showToast({
        title: '无法查看博客详情',
        icon: 'none'
      });
      return;
    }
    
    // 统一的URL格式 - 使用绝对路径
    const url = `/pages/blog/detail/index?id=${blogId}`;
    
    // 执行导航
    wx.navigateTo({
      url: url,
      fail: function(err) {
        console.error('[博客导航] 导航到博客详情失败', err);
        wx.showToast({
          title: '页面跳转失败，请重试',
          icon: 'none'
        });
      }
    });
    
    // 记录导航事件（便于分析）
    if (typeof this.reportAnalytics === 'function') {
      this.reportAnalytics('view_blog_detail', {
        blog_id: blogId,
        from_page: 'blog_list'
      });
    }
  } catch (err) {
    console.error('[博客导航] 导航异常', err);
    // 发生异常时也给用户提示
    wx.showToast({
      title: '操作异常，请重试',
      icon: 'none'
    });
  }
};

// ========================= 集成方法 =========================

/**
 * 在页面对象中的集成方法
 * 
 * 1. 保留两个原始的函数名，但内部实现统一调用新函数
 * 2. 不改变现有代码的调用方式，确保兼容性
 */

/**
 * 点击博客项 (普通列表模式)
 * 内部重定向到统一函数
 */
const onTapBlogItem = function(e) {
  return navigateToBlogDetail.call(this, e);
};

/**
 * 点击博客项 (虚拟列表模式)
 * 内部重定向到统一函数
 */
const goDetail = function(e) {
  return navigateToBlogDetail.call(this, e);
};

// ========================= 直接调用方法 =========================

/**
 * 直接通过ID导航到博客详情
 * 方便在其他场景中使用
 * 
 * @param {string} blogId 博客ID
 */
const viewBlogById = function(blogId) {
  if (!blogId) {
    console.error('[博客导航] 缺少博客ID');
    return;
  }
  
  // 构造一个模拟事件，这样可以重用统一函数
  const fakeEvent = {
    currentTarget: {
      dataset: {}
    }
  };
  
  return navigateToBlogDetail.call(this, fakeEvent, { blogId });
};

// ========================= 导航函数增强 =========================

/**
 * 导航到博客列表并高亮特定博客
 * 提供更丰富的导航功能
 * 
 * @param {string} categoryId 可选的分类ID
 * @param {string} highlightBlogId 需要高亮的博客ID
 */
const navigateToBlogList = function(categoryId, highlightBlogId) {
  let url = '/pages/blog/index/index';
  
  // 构建参数
  const params = [];
  if (categoryId) {
    params.push(`category=${categoryId}`);
  }
  if (highlightBlogId) {
    params.push(`highlight=${highlightBlogId}`);
  }
  
  // 如果有参数，添加到URL
  if (params.length > 0) {
    url += '?' + params.join('&');
  }
  
  wx.navigateTo({
    url: url,
    fail: function(err) {
      console.error('[博客导航] 导航到博客列表失败', err);
    }
  });
};

// 导出所有函数
module.exports = {
  // 统一的核心导航函数
  navigateToBlogDetail,
  
  // 兼容原有函数名的包装函数
  onTapBlogItem,
  goDetail,
  
  // 增强功能函数
  viewBlogById,
  navigateToBlogList,
  
  // 集成说明
  integrationGuide: `
    修复博客模块重复导航函数问题的集成指南:
    
    1. 替换现有函数:
       - 打开 miniprogram/pages/blog/index/index.js
       - 找到onTapBlogItem和goDetail两个函数
       - 用本文件中提供的统一实现替换这两个函数的内容
    
    2. 添加统一导航函数:
       - 将navigateToBlogDetail函数添加到同一文件中
       - 添加时保持this上下文的正确引用
    
    3. 考虑额外增强功能:
       - 需要增强导航能力时，可以添加viewBlogById和navigateToBlogList函数
    
    4. 测试各种场景:
       - 测试普通列表模式的博客点击
       - 测试虚拟列表模式的博客点击
       - 测试各种边缘情况（如无效ID）
    
    注意: 此修复不会改变现有代码的调用方式，所有依赖这两个函数的代码都可以继续正常工作。
    但内部实现已统一，减少了维护负担，增强了错误处理。
  `
}; 