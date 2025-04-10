/**
 * 博客模块修复5-URL路径格式
 * 创建时间：2025年04月11日 00:06:37
 * 创建者：Claude助手
 * 
 * 本文件实现对博客模块中URL路径格式不一致问题的修复
 * 问题描述：项目中存在相对路径和绝对路径混用的情况，导致导航不稳定
 */

/**
 * 修复方案：
 * 1. 提供URL路径标准化工具
 * 2. 检测并修复不一致的路径格式
 * 3. 为博客模块创建统一的路由管理机制
 */

// ========================= 问题分析 =========================

/**
 * 当前存在的URL路径格式问题：
 * 
 * 1. 混用绝对路径和相对路径
 *    - 绝对路径: '/pages/blog/detail/index'
 *    - 相对路径: '../detail/index'
 * 
 * 2. 参数传递格式不统一
 *    - 在某些地方使用 `?id=${id}`
 *    - 在其他地方使用 `?blogId=${id}`
 * 
 * 这会导致：
 * - 导航不稳定，尤其在页面结构调整时
 * - 参数获取混乱，需要检查多种可能的参数名
 * - 难以维护和扩展
 */

// ========================= URL标准化工具 =========================

/**
 * 博客模块URL路径配置
 * 集中定义所有博客相关的路径
 */
const BLOG_ROUTES = {
  // 博客列表页
  LIST: '/pages/blog/index/index',
  
  // 博客详情页
  DETAIL: '/pages/blog/detail/index',
  
  // 博客发布页
  PUBLISH: '/pages/blog/publish/index',
  
  // 博客编辑页
  EDIT: '/pages/blog/edit/index',
  
  // 用户博客页
  USER_BLOGS: '/pages/blog/user/index',
  
  // 博客评论页
  COMMENTS: '/pages/blog/comments/index',
  
  // 博客分类页
  CATEGORY: '/pages/blog/category/index'
};

/**
 * 统一的参数名定义
 */
const PARAM_NAMES = {
  BLOG_ID: 'id',           // 博客ID
  USER_ID: 'userId',       // 用户ID
  CATEGORY_ID: 'category', // 分类ID
  COMMENT_ID: 'commentId', // 评论ID
  SORT_TYPE: 'sort',       // 排序方式
  PAGE: 'page',            // 页码
  SIZE: 'size'             // 每页数量
};

/**
 * URL路径标准化工具
 * 提供统一的URL构建机制
 */
const BlogUrlBuilder = {
  /**
   * 构建博客详情页URL
   * @param {string} blogId 博客ID
   * @returns {string} 标准化的URL
   */
  buildDetailUrl: function(blogId) {
    if (!blogId) return BLOG_ROUTES.LIST;
    return `${BLOG_ROUTES.DETAIL}?${PARAM_NAMES.BLOG_ID}=${encodeURIComponent(blogId)}`;
  },
  
  /**
   * 构建用户博客列表URL
   * @param {string} userId 用户ID
   * @returns {string} 标准化的URL
   */
  buildUserBlogsUrl: function(userId) {
    if (!userId) return BLOG_ROUTES.LIST;
    return `${BLOG_ROUTES.USER_BLOGS}?${PARAM_NAMES.USER_ID}=${encodeURIComponent(userId)}`;
  },
  
  /**
   * 构建博客分类页URL
   * @param {string} categoryId 分类ID
   * @param {Object} options 其他选项
   * @returns {string} 标准化的URL
   */
  buildCategoryUrl: function(categoryId, options = {}) {
    if (!categoryId) return BLOG_ROUTES.LIST;
    
    let url = `${BLOG_ROUTES.CATEGORY}?${PARAM_NAMES.CATEGORY_ID}=${encodeURIComponent(categoryId)}`;
    
    // 添加可选参数
    if (options.sort) {
      url += `&${PARAM_NAMES.SORT_TYPE}=${encodeURIComponent(options.sort)}`;
    }
    if (options.page) {
      url += `&${PARAM_NAMES.PAGE}=${encodeURIComponent(options.page)}`;
    }
    if (options.size) {
      url += `&${PARAM_NAMES.SIZE}=${encodeURIComponent(options.size)}`;
    }
    
    return url;
  },
  
  /**
   * 构建博客评论页URL
   * @param {string} blogId 博客ID
   * @returns {string} 标准化的URL
   */
  buildCommentsUrl: function(blogId) {
    if (!blogId) return BLOG_ROUTES.LIST;
    return `${BLOG_ROUTES.COMMENTS}?${PARAM_NAMES.BLOG_ID}=${encodeURIComponent(blogId)}`;
  },
  
  /**
   * 构建博客发布页URL
   * @returns {string} 标准化的URL
   */
  buildPublishUrl: function() {
    return BLOG_ROUTES.PUBLISH;
  },
  
  /**
   * 构建博客编辑页URL
   * @param {string} blogId 博客ID
   * @returns {string} 标准化的URL
   */
  buildEditUrl: function(blogId) {
    if (!blogId) return BLOG_ROUTES.LIST;
    return `${BLOG_ROUTES.EDIT}?${PARAM_NAMES.BLOG_ID}=${encodeURIComponent(blogId)}`;
  },
  
  /**
   * 构建带筛选条件的博客列表URL
   * @param {Object} filters 筛选条件
   * @returns {string} 标准化的URL
   */
  buildListUrl: function(filters = {}) {
    let url = BLOG_ROUTES.LIST;
    const params = [];
    
    // 添加各种筛选条件
    if (filters.category) {
      params.push(`${PARAM_NAMES.CATEGORY_ID}=${encodeURIComponent(filters.category)}`);
    }
    if (filters.sort) {
      params.push(`${PARAM_NAMES.SORT_TYPE}=${encodeURIComponent(filters.sort)}`);
    }
    if (filters.page) {
      params.push(`${PARAM_NAMES.PAGE}=${encodeURIComponent(filters.page)}`);
    }
    if (filters.size) {
      params.push(`${PARAM_NAMES.SIZE}=${encodeURIComponent(filters.size)}`);
    }
    
    // 如果有参数，添加到URL
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    
    return url;
  }
};

// ========================= 导航封装 =========================

/**
 * 博客导航管理器
 * 提供统一的导航方法
 */
const BlogNavigator = {
  /**
   * 导航到博客详情页
   * @param {string} blogId 博客ID
   * @param {Object} options 导航选项
   */
  navigateToDetail: function(blogId, options = {}) {
    if (!blogId) {
      console.error('[博客导航] 缺少博客ID');
      if (options.showError !== false) {
        wx.showToast({
          title: '无法查看博客详情',
          icon: 'none'
        });
      }
      return;
    }
    
    const url = BlogUrlBuilder.buildDetailUrl(blogId);
    
    wx.navigateTo({
      url: url,
      fail: function(err) {
        console.error('[博客导航] 导航到博客详情失败', err);
        if (options.showError !== false) {
          wx.showToast({
            title: '页面跳转失败，请重试',
            icon: 'none'
          });
        }
      },
      ...(options.navigateOptions || {})
    });
  },
  
  /**
   * 导航到用户博客列表
   * @param {string} userId 用户ID
   * @param {Object} options 导航选项
   */
  navigateToUserBlogs: function(userId, options = {}) {
    if (!userId) {
      console.error('[博客导航] 缺少用户ID');
      return;
    }
    
    const url = BlogUrlBuilder.buildUserBlogsUrl(userId);
    
    wx.navigateTo({
      url: url,
      fail: function(err) {
        console.error('[博客导航] 导航到用户博客失败', err);
        if (options.showError !== false) {
          wx.showToast({
            title: '页面跳转失败，请重试',
            icon: 'none'
          });
        }
      },
      ...(options.navigateOptions || {})
    });
  },
  
  /**
   * 导航到博客分类页
   * @param {string} categoryId 分类ID
   * @param {Object} options 导航选项
   */
  navigateToCategory: function(categoryId, options = {}) {
    if (!categoryId) {
      console.error('[博客导航] 缺少分类ID');
      return;
    }
    
    const url = BlogUrlBuilder.buildCategoryUrl(categoryId, {
      sort: options.sort,
      page: options.page,
      size: options.size
    });
    
    wx.navigateTo({
      url: url,
      fail: function(err) {
        console.error('[博客导航] 导航到博客分类失败', err);
        if (options.showError !== false) {
          wx.showToast({
            title: '页面跳转失败，请重试',
            icon: 'none'
          });
        }
      },
      ...(options.navigateOptions || {})
    });
  },
  
  /**
   * 导航到博客发布页面
   * @param {Object} options 导航选项
   */
  navigateToPublish: function(options = {}) {
    const url = BlogUrlBuilder.buildPublishUrl();
    
    wx.navigateTo({
      url: url,
      fail: function(err) {
        console.error('[博客导航] 导航到博客发布失败', err);
        if (options.showError !== false) {
          wx.showToast({
            title: '页面跳转失败，请重试',
            icon: 'none'
          });
        }
      },
      ...(options.navigateOptions || {})
    });
  },
  
  /**
   * 导航到博客列表页面
   * @param {Object} filters 筛选条件
   * @param {Object} options 导航选项
   */
  navigateToList: function(filters = {}, options = {}) {
    const url = BlogUrlBuilder.buildListUrl(filters);
    
    wx.navigateTo({
      url: url,
      fail: function(err) {
        console.error('[博客导航] 导航到博客列表失败', err);
        if (options.showError !== false) {
          wx.showToast({
            title: '页面跳转失败，请重试',
            icon: 'none'
          });
        }
      },
      ...(options.navigateOptions || {})
    });
  }
};

// ========================= 参数解析工具 =========================

/**
 * 博客相关参数解析工具
 * 用于统一处理页面参数
 */
const BlogParamParser = {
  /**
   * 从页面参数中解析博客ID
   * @param {Object} options 页面参数
   * @returns {string|null} 博客ID或null
   */
  parseBlogId: function(options) {
    // 检查所有可能的参数名
    const id = options[PARAM_NAMES.BLOG_ID] || options.blogId || options.blog_id;
    return id || null;
  },
  
  /**
   * 从页面参数中解析用户ID
   * @param {Object} options 页面参数
   * @returns {string|null} 用户ID或null
   */
  parseUserId: function(options) {
    // 检查所有可能的参数名
    const id = options[PARAM_NAMES.USER_ID] || options.userId || options.user_id;
    return id || null;
  },
  
  /**
   * 从页面参数中解析分类ID
   * @param {Object} options 页面参数
   * @returns {string|null} 分类ID或null
   */
  parseCategoryId: function(options) {
    // 检查所有可能的参数名
    const id = options[PARAM_NAMES.CATEGORY_ID] || options.categoryId || options.category_id;
    return id || null;
  },
  
  /**
   * 从页面参数中解析评论ID
   * @param {Object} options 页面参数
   * @returns {string|null} 评论ID或null
   */
  parseCommentId: function(options) {
    // 检查所有可能的参数名
    const id = options[PARAM_NAMES.COMMENT_ID] || options.commentId || options.comment_id;
    return id || null;
  },
  
  /**
   * 从页面参数中解析列表筛选条件
   * @param {Object} options 页面参数
   * @returns {Object} 筛选条件对象
   */
  parseListFilters: function(options) {
    return {
      category: this.parseCategoryId(options),
      sort: options[PARAM_NAMES.SORT_TYPE] || options.sort,
      page: options[PARAM_NAMES.PAGE] || options.page,
      size: options[PARAM_NAMES.SIZE] || options.size
    };
  }
};

// ========================= 导出所有工具 =========================

module.exports = {
  // 路径常量
  BLOG_ROUTES,
  PARAM_NAMES,
  
  // URL构建工具
  BlogUrlBuilder,
  
  // 导航管理器
  BlogNavigator,
  
  // 参数解析工具
  BlogParamParser,
  
  // 集成说明
  integrationGuide: `
    博客模块URL路径格式统一修复指南:
    
    1. 添加路由管理模块:
       - 创建新文件: miniprogram/utils/blog-routes.js
       - 复制本文件中的所有常量和工具函数到该文件
       - 在文件底部导出所有工具
    
    2. 在博客相关页面中引入:
       - 在每个博客相关页面添加: import BlogRoutes from '../../utils/blog-routes';
       - 或在app.js中全局引入: app.globalData.BlogRoutes = require('./utils/blog-routes');
    
    3. 替换现有导航代码:
       - 查找所有使用wx.navigateTo跳转到博客页面的代码
       - 使用BlogNavigator中对应的方法替换
       - 例如:
         * 替换: wx.navigateTo({ url: '/pages/blog/detail/index?id=' + blogId })
         * 为: BlogNavigator.navigateToDetail(blogId)
    
    4. 替换参数解析代码:
       - 在onLoad函数中使用BlogParamParser解析参数
       - 例如:
         * 替换: const blogId = options.id || options.blogId;
         * 为: const blogId = BlogParamParser.parseBlogId(options);
    
    5. 页面之间传递参数:
       - 使用BlogUrlBuilder构建标准URL
       - 例如:
         * 替换: '/pages/blog/category/index?category=' + categoryId
         * 为: BlogUrlBuilder.buildCategoryUrl(categoryId)
    
    6. 测试各种导航场景:
       - 测试从各个页面到博客详情页的导航
       - 测试各种参数传递和解析
       - 确保所有页面都能正确接收参数
    
    这套修复方案提供了完整的URL路径管理机制，确保项目中的导航和参数传递统一、可维护。
    它不仅解决了当前的路径混乱问题，也为未来的扩展提供了灵活的框架。
  `
}; 