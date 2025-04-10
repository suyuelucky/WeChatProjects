/**
 * 博客详情页
 * 创建时间：2025年04月10日 21:10:59
 * 创建者：Claude助手
 * 编辑时间：2025年04月10日 22:18:15
 * 编辑内容：修复导航路径格式
 * 编辑时间：2025年05月12日 20:41:58
 * 编辑内容：修复loadBlogDetail函数中的语法错误
 * 编辑时间：2025年04月10日 23:21:05
 * 编辑内容：完全修复loadBlogDetail函数的语法结构
 */

Page({
  data: {
    blogId: '',
    blog: null,
    commentList: [],
    commentText: '',
    canSend: false,
    isLiked: false
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({
        blogId: options.id
      });
      this.loadBlogDetail();
      this.loadComments();
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 加载博客详情
   */
  loadBlogDetail: function () {
    wx.showLoading({
      title: '加载中...',
    });
    
    // 模拟加载博客详情
    setTimeout(() => {
      try {
        const blogId = this.data.blogId;
        const idNumber = parseInt(blogId.split('_')[1]);
        
        const blog = {
          id: blogId,
          content: `这是第${idNumber + 1}条博客内容，包含一些文字描述。这是一个模拟的博客内容，用于测试详情页展示效果。这里是更长的内容，用来展示详情页的布局和样式。`,
          images: [
            idNumber % 3 === 0 ? 'https://picsum.photos/400/300?random=' + idNumber : '',
            idNumber % 4 === 0 ? 'https://picsum.photos/400/600?random=' + (idNumber + 1) : ''
          ].filter(Boolean),
          author: {
            nickname: '用户' + idNumber,
            avatarUrl: 'https://picsum.photos/100/100?random=' + idNumber
          },
          createTime: new Date(Date.now() - idNumber * 3600000).toLocaleString(),
          likes: Math.floor(Math.random() * 100),
          comments: Math.floor(Math.random() * 20),
          location: idNumber % 2 === 0 ? {
            name: '某个地点' + idNumber,
            latitude: 39.9 + Math.random() * 0.1,
            longitude: 116.3 + Math.random() * 0.1
          } : null
        };
        
        this.setData({
          blog
        });
      } catch (err) {
        console.error('[博客详情] 加载博客详情失败:', err);
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      } finally {
        wx.hideLoading();
      }
    }, 500);
  },

  /**
   * 加载评论列表
   */
  loadComments: function () {
    // 模拟加载评论列表
    setTimeout(() => {
      const blogId = this.data.blogId;
      const idNumber = parseInt(blogId.split('_')[1]);
      
      const commentList = [];
      const commentCount = Math.floor(Math.random() * 10);
      
      for (let i = 0; i < commentCount; i++) {
        commentList.push({
          id: `comment_${idNumber}_${i}`,
          content: `这是第${i + 1}条评论，评论内容评论内容评论内容。`,
          author: {
            nickname: '评论用户' + i,
            avatarUrl: 'https://picsum.photos/100/100?random=' + (idNumber + i)
          },
          createTime: new Date(Date.now() - i * 60000).toLocaleString()
        });
      }
      
      this.setData({
        commentList
      });
    }, 700);
  },

  /**
   * 评论输入事件
   */
  onCommentInput: function (e) {
    const text = e.detail.value.trim();
    
    this.setData({
      commentText: e.detail.value,
      canSend: text !== ''
    });
  },

  /**
   * 提交评论
   */
  onSubmitComment: function () {
    if (!this.data.canSend) return;
    
    const commentText = this.data.commentText.trim();
    if (!commentText) return;
    
    wx.showLoading({
      title: '发送中...',
    });
    
    // 模拟提交评论
    setTimeout(() => {
      const newComment = {
        id: `comment_new_${Date.now()}`,
        content: commentText,
        author: {
          nickname: '当前用户',
          avatarUrl: 'https://picsum.photos/100/100?random=current'
        },
        createTime: new Date().toLocaleString()
      };
      
      const commentList = [newComment, ...this.data.commentList];
      const blog = this.data.blog;
      blog.comments = commentList.length;
      
      this.setData({
        commentList,
        blog,
        commentText: '',
        canSend: false
      });
      
      wx.hideLoading();
      
      wx.showToast({
        title: '评论成功',
        icon: 'success'
      });
    }, 500);
  },

  /**
   * 点击评论按钮，聚焦输入框
   */
  onTapComment: function () {
    // 这里可以做一些操作，比如自动聚焦到评论框
  },

  /**
   * 点赞操作
   */
  onTapLike: function () {
    const isLiked = !this.data.isLiked;
    const blog = this.data.blog;
    
    blog.likes = isLiked ? blog.likes + 1 : blog.likes - 1;
    
    this.setData({
      isLiked,
      blog
    });
    
    wx.showToast({
      title: isLiked ? '点赞成功' : '取消点赞',
      icon: 'success'
    });
  },

  /**
   * 预览图片
   */
  onPreviewImage: function (e) {
    const { index } = e.currentTarget.dataset;
    const { images } = this.data.blog;
    
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },
  
  /**
   * 分享功能
   */
  onShareAppMessage: function () {
    const blog = this.data.blog;
    
    return {
      title: blog.content.substring(0, 30) + '...',
      path: `/pages/blog/detail/index?id=${blog.id}`,
      imageUrl: blog.images && blog.images.length > 0 ? blog.images[0] : ''
    };
  }
}); 