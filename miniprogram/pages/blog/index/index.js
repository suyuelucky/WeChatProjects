/**
 * 博客列表页
 * 创建时间：2025年04月10日 21:08:42
 * 创建者：Claude助手
 * 编辑时间：2025年04月10日 21:30:12
 * 编辑内容：添加拍照功能跳转
 * 编辑时间：2025年04月10日 22:18:15
 * 编辑内容：修复导航路径格式
 * 编辑时间：2025年04月10日 21:43:56
 * 编辑内容：修复在真机上显示空白的问题
 * 编辑时间：2025年04月10日 21:49:45
 * 编辑内容：恢复虚拟列表功能，修复所有点击函数
 * 编辑时间：2025年04月10日 21:53:43
 * 编辑内容：添加_virtualBlogList数据属性
 * 编辑时间：2025年04月10日 19:38:16
 * 编辑内容：统一所有导航路径格式为"/pages/"开头
 * 编辑时间：2025年04月10日 20:25:45
 * 编辑内容：修复性能优化模块导入问题
 * 编辑时间：2025年04月10日 22:54:34
 * 编辑内容：增强真机错误处理和适配
 * 编辑时间：2025年04月10日 20:53:42
 * 编辑内容：修复滚动问题，确保可以正常上下滚动
 * 编辑时间：2025年04月10日 23:16:35
 * 编辑内容：移除性能优化模块，简化功能确保基础稳定性
 * 编辑时间：2025年04月10日 23:22:45
 * 编辑内容：添加图片加载错误处理函数
 */

const app = getApp();

// 不再使用性能优化模块，简化功能确保基础稳定性
/*
try {
  BlogScrollOptimizer = require('./performance-optimized.js');
  console.log('[博客页] 性能优化模块加载成功');
} catch (err) {
  console.error('[博客页] 性能优化模块加载失败:', err);
  // 不中断执行，而是继续使用基本功能
}
*/

Page({
  data: {
    blogList: [],
    _virtualBlogList: [], // 添加虚拟列表数据属性
    loading: false,
    loadingMore: false,
    noMore: false,
    page: 1,
    pageSize: 10,
    refresherTriggered: false,
    _useVirtualList: false,  // 默认关闭虚拟列表，避免初始化问题
    _isPerformanceOptimized: false, // 默认关闭性能优化
    _safeMode: true, // 强制使用安全模式，禁用所有可能导致滚动问题的优化
    errorMessage: '', // 存储错误信息
  },

  onLoad: function (options) {
    console.log('[博客页] 页面加载开始');
    
    // 检测是否在真机上运行
    try {
      const systemInfo = wx.getSystemInfoSync();
      const isRealDevice = systemInfo.platform !== 'devtools';
      
      console.log('[博客页] 运行环境:', systemInfo.platform);
      
      // 在真机上强制使用安全模式
      if (isRealDevice) {
        this.setData({ 
          _useVirtualList: false,
          _isPerformanceOptimized: false,
          _safeMode: true
        });
        console.log('[博客页] 真机运行，已启用安全模式');
      }
    } catch (err) {
      console.error('[博客页] 获取系统信息失败:', err);
      // 出错时默认使用安全模式
      this.setData({ _safeMode: true });
    }
    
    // 加载数据
    this.loadBlogList(true);

    // 禁用所有可能导致滚动问题的优化功能
    this.setData({
      _useVirtualList: false,
      _isPerformanceOptimized: false,
      _safeMode: true
    });
    console.log('[博客页] 已禁用可能导致滚动问题的优化功能');
  },

  onShow: function () {
    // 可能从其他页面返回，需要检查是否需要刷新
    if (app.globalData && app.globalData.needRefreshBlogList) {
      this.setData({
        page: 1,
        blogList: []
      });
      this.loadBlogList(true);
      app.globalData.needRefreshBlogList = false;
    }
  },

  /**
   * 加载博客列表
   * @param {Boolean} refresh 是否刷新数据
   */
  loadBlogList: function (refresh = false) {
    try {
      if (refresh) {
        // 刷新数据
        this.setData({
          loading: true
        });
      } else {
        // 加载更多
        if (this.data.loading || this.data.noMore) {
          return;
        }
        
        this.setData({
          loadingMore: true,
          page: this.data.page + 1
        });
      }
      
      // 模拟网络请求延迟
      setTimeout(() => {
        const newData = this.getMockData(this.data.page, this.data.pageSize);
        
        let blogList = refresh ? newData : [...this.data.blogList, ...newData];
        
        const noMore = newData.length < this.data.pageSize;
        
        this.setData({
          blogList: blogList,
          loading: false,
          loadingMore: false,
          noMore: noMore,
          refresherTriggered: false
        });
      }, 1000);
    } catch (err) {
      console.error('[博客页] 加载数据失败:', err);
      this.setData({
        loading: false,
        loadingMore: false,
        refresherTriggered: false,
        errorMessage: '加载失败，请重试'
      });
    }
  },

  /**
   * 获取模拟数据
   */
  getMockData: function (page, pageSize) {
    try {
      const mockData = [];
      const startIndex = (page - 1) * pageSize;
      
      for (let i = 0; i < pageSize; i++) {
        const index = startIndex + i;
        // 模拟最多50条数据
        if (index >= 50) break;

        mockData.push({
          id: `blog_${index}`,
          content: `这是第${index + 1}条博客内容，包含一些文字描述。这是一个模拟的博客内容，用于测试列表展示效果。`,
          images: [
            index % 3 === 0 ? 'https://picsum.photos/400/300?random=' + index : '',
            index % 4 === 0 ? 'https://picsum.photos/400/600?random=' + (index + 1) : ''
          ].filter(Boolean),
          author: {
            nickname: '用户' + index,
            avatarUrl: 'https://picsum.photos/100/100?random=' + index
          },
          createTime: new Date(Date.now() - index * 3600000).toLocaleString(),
          likes: Math.floor(Math.random() * 100),
          comments: Math.floor(Math.random() * 20)
        });
      }
      
      return mockData;
    } catch (err) {
      console.error('[博客页] 生成模拟数据失败:', err);
      return []; // 返回空数组避免渲染错误
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh: function () {
    this.setData({
      refresherTriggered: true,
      page: 1
    });
    this.loadBlogList(true);
  },

  /**
   * 上拉加载更多
   */
  onReachBottom: function () {
    if (!this.data.noMore) {
      this.loadBlogList();
    }
  },

  /**
   * 点击发布博客
   */
  onTapPublish: function () {
    wx.navigateTo({
      url: '/pages/blog/publish/index'
    });
  },

  /**
   * 点击博客项 (用于虚拟列表模式)
   */
  goDetail: function (e) {
    const { blog } = e.currentTarget.dataset;
    if (blog && blog.id) {
      wx.navigateTo({
        url: `/pages/blog/detail/index?id=${blog.id}`
      });
    }
  },

  /**
   * 点击博客项 (用于普通列表模式)
   */
  onTapBlogItem: function (e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/blog/detail/index?id=${id}`
    });
  },

  /**
   * 点赞
   */
  onTapLike: function (e) {
    const { index } = e.currentTarget.dataset;
    const blogList = this.data.blogList;
    
    try {
      blogList[index].likes += 1;
      
      this.setData({
        blogList
      });
      
      wx.showToast({
        title: '点赞成功',
        icon: 'success',
        duration: 1000
      });
    } catch (err) {
      console.error('[博客页] 点赞失败:', err);
    }
  },

  /**
   * 点击拍照按钮
   */
  onTapCamera: function () {
    wx.navigateTo({
      url: '/pages/photo-capture/index'
    });
  },

  // 启用性能优化
  enablePerformanceOptimization() {
    try {
      // 检查性能优化模块是否正确加载
      if (!BlogScrollOptimizer) {
        console.error('[博客页] 性能优化模块未加载，无法启用优化');
        return;
      }
      
      // 优化博客列表滚动性能，启用虚拟列表
      const optimizers = BlogScrollOptimizer.optimizeBlogListPage(this, {
        highPerformanceMode: true,   // 启用120fps高性能模式
        virtualList: true,           // 启用虚拟列表
        lazyLoadImages: true         // 启用图片懒加载
      });

      // 检查优化器是否正确创建
      if (optimizers && optimizers.scrollManager) {
        this.scrollManager = optimizers.scrollManager;
        this.imageManager = optimizers.imageManager;
        
        // 标记已启用虚拟列表
        this.setData({
          _useVirtualList: true
        });
        
        console.log('[博客页] 性能优化已启用');
      } else {
        console.error('[博客页] 性能优化初始化失败');
        // 初始化失败，回退到普通模式
        this.setData({
          _useVirtualList: false,
          _isPerformanceOptimized: false
        });
      }
    } catch (err) {
      console.error('[博客页] 启用性能优化失败:', err);
      // 异常时回退到普通模式
      this.setData({
        _useVirtualList: false,
        _isPerformanceOptimized: false
      });
    }
  },
  
  /**
   * 滚动事件处理（支持高性能模式）
   */
  onScroll: function(e) {
    try {
      // 在启用滚动优化时，传递滚动事件到滚动管理器
      if (this.data._isPerformanceOptimized && this.scrollManager) {
        this.scrollManager.handleScroll(e);
      }
    } catch (err) {
      console.error('[博客页] 滚动处理异常:', err);
    }
  },

  /**
   * 滚动触底加载更多
   */
  _onLoadMore() {
    if (!this.data.noMore && !this.data.loading) {
      this.loadBlogList();
    }
  },

  /**
   * 处理图片加载错误
   * @param {Object} e 事件对象
   */
  onImageError: function (e) {
    try {
      // 获取博客索引和图片索引
      const { blogIndex, index } = e.currentTarget.dataset;
      
      // 深拷贝当前博客列表
      const blogList = [...this.data.blogList];
      
      // 标记该博客项的图片加载有错误
      if (blogList[blogIndex]) {
        blogList[blogIndex].hasImageError = true;
        
        // 更新数据
        this.setData({ blogList });
        
        console.error(`[博客页] 图片加载失败: 博客索引=${blogIndex}, 图片索引=${index}`);
      }
    } catch (err) {
      console.error('[博客页] 处理图片错误失败:', err);
    }
  },
});