/**
 * image-demo.js
 * 优化图片加载器示例页面
 * 
 * 创建时间: 2025-04-09 20:40:15
 * 创建者: Claude AI 3.7 Sonnet
 */

const OptimizedImageLoader = require('../../utils/optimized-image-loader');

// 初始化图片加载器
OptimizedImageLoader.init({
  thumbnailSize: 200,
  previewSize: 800,
  quality: 0.8,
  debug: true
});

Page({
  data: {
    imageList: [
      {
        id: 1,
        url: 'https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd',
        title: '城市风光',
        loading: false,
        path: '',
        thumbnail: '',
        error: ''
      },
      {
        id: 2,
        url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05',
        title: '自然风景',
        loading: false,
        path: '',
        thumbnail: '',
        error: ''
      },
      {
        id: 3,
        url: 'https://images.unsplash.com/photo-1595411425732-e69c1ced1e75',
        title: '建筑艺术',
        loading: false,
        path: '',
        thumbnail: '',
        error: ''
      },
      {
        id: 4,
        url: 'https://images.unsplash.com/photo-1618588507085-c79565432917',
        title: '美食佳肴',
        loading: false,
        path: '',
        thumbnail: '',
        error: ''
      },
      {
        id: 5,
        url: 'https://images.unsplash.com/photo-1516616370751-86d6bd8b0651',
        title: '旅行探险',
        loading: false,
        path: '',
        thumbnail: '',
        error: ''
      }
    ],
    activeTab: 'normal',
    preloadStarted: false,
    preloadSuccess: 0,
    preloadFailed: 0,
    cacheStatus: {
      totalSize: 0,
      imageCount: 0,
      thumbCount: 0
    },
    performance: {
      normalLoadTime: 0,
      thumbnailLoadTime: 0,
      previewLoadTime: 0,
      preloadTime: 0
    },
    selectedImageIndex: -1
  },
  
  onLoad: function() {
    // 更新缓存状态
    this.updateCacheStatus();
  },
  
  /**
   * 更新缓存状态
   */
  updateCacheStatus: function() {
    const imageCount = Object.keys(OptimizedImageLoader._cache.images).length;
    const thumbCount = Object.keys(OptimizedImageLoader._cache.thumbnails).length;
    const totalSize = OptimizedImageLoader._cache.totalSize;
    
    this.setData({
      'cacheStatus.totalSize': (totalSize / (1024 * 1024)).toFixed(2),
      'cacheStatus.imageCount': imageCount,
      'cacheStatus.thumbCount': thumbCount
    });
  },
  
  /**
   * 切换标签页
   */
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
    
    // 当切换到预加载标签时，自动开始预加载
    if (tab === 'preload' && !this.data.preloadStarted) {
      this.startPreload();
    }
  },
  
  /**
   * 加载普通图片
   */
  loadNormalImages: function() {
    const startTime = Date.now();
    
    // 重置状态
    const imageList = this.data.imageList.map(item => ({
      ...item,
      loading: true,
      path: '',
      error: ''
    }));
    
    this.setData({
      imageList
    });
    
    // 加载每张图片
    imageList.forEach((item, index) => {
      OptimizedImageLoader.loadImage(item.url)
        .then(result => {
          imageList[index].loading = false;
          imageList[index].path = result.path;
          
          this.setData({
            [`imageList[${index}]`]: imageList[index]
          });
        })
        .catch(error => {
          imageList[index].loading = false;
          imageList[index].error = error.message;
          
          this.setData({
            [`imageList[${index}]`]: imageList[index]
          });
        })
        .finally(() => {
          // 检查是否所有图片都已加载完成
          if (imageList.every(img => !img.loading)) {
            const loadTime = Date.now() - startTime;
            this.setData({
              'performance.normalLoadTime': loadTime
            });
            
            // 更新缓存状态
            this.updateCacheStatus();
          }
        });
    });
  },
  
  /**
   * 加载缩略图
   */
  loadThumbnails: function() {
    const startTime = Date.now();
    
    // 重置状态
    const imageList = this.data.imageList.map(item => ({
      ...item,
      loading: true,
      thumbnail: '',
      error: ''
    }));
    
    this.setData({
      imageList
    });
    
    // 加载每张缩略图
    imageList.forEach((item, index) => {
      OptimizedImageLoader.loadImage(item.url, { thumbnail: true })
        .then(result => {
          imageList[index].loading = false;
          imageList[index].thumbnail = result.path;
          
          this.setData({
            [`imageList[${index}]`]: imageList[index]
          });
        })
        .catch(error => {
          imageList[index].loading = false;
          imageList[index].error = error.message;
          
          this.setData({
            [`imageList[${index}]`]: imageList[index]
          });
        })
        .finally(() => {
          // 检查是否所有图片都已加载完成
          if (imageList.every(img => !img.loading)) {
            const loadTime = Date.now() - startTime;
            this.setData({
              'performance.thumbnailLoadTime': loadTime
            });
            
            // 更新缓存状态
            this.updateCacheStatus();
          }
        });
    });
  },
  
  /**
   * 显示预览图
   */
  showPreview: function(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.imageList[index];
    
    // 标记为选中
    this.setData({
      selectedImageIndex: index
    });
    
    // 加载预览图
    const startTime = Date.now();
    
    OptimizedImageLoader.loadImage(item.url, { preview: true })
      .then(result => {
        // 如果当前选中的图片仍然是这张，才更新UI
        if (this.data.selectedImageIndex === index) {
          this.setData({
            [`imageList[${index}].preview`]: result.path,
            'performance.previewLoadTime': Date.now() - startTime
          });
          
          // 更新缓存状态
          this.updateCacheStatus();
          
          // 显示预览大图
          wx.previewImage({
            current: result.path,
            urls: [result.path]
          });
        }
      })
      .catch(error => {
        wx.showToast({
          title: '预览加载失败',
          icon: 'none'
        });
      });
  },
  
  /**
   * 开始预加载
   */
  startPreload: function() {
    // 标记预加载已开始
    this.setData({
      preloadStarted: true,
      preloadSuccess: 0,
      preloadFailed: 0
    });
    
    // 获取所有图片URL
    const urls = this.data.imageList.map(item => item.url);
    
    // 开始预加载
    const startTime = Date.now();
    
    OptimizedImageLoader.preloadImages(urls, { thumbnail: true })
      .then(results => {
        // 统计结果
        const successCount = results.filter(r => r.success).length;
        const failedCount = results.length - successCount;
        
        this.setData({
          preloadSuccess: successCount,
          preloadFailed: failedCount,
          'performance.preloadTime': Date.now() - startTime
        });
        
        // 更新缓存状态
        this.updateCacheStatus();
      })
      .catch(error => {
        wx.showToast({
          title: '预加载失败',
          icon: 'none'
        });
      });
  },
  
  /**
   * 清理缓存
   */
  clearCache: function(e) {
    const aggressive = e.currentTarget.dataset.mode === 'aggressive';
    
    wx.showLoading({
      title: '清理中...'
    });
    
    OptimizedImageLoader.clearCache(aggressive)
      .then(result => {
        wx.hideLoading();
        
        wx.showToast({
          title: `清理了${(result.clearedSize / (1024 * 1024)).toFixed(2)}MB`,
          icon: 'success'
        });
        
        // 更新缓存状态
        this.updateCacheStatus();
      })
      .catch(error => {
        wx.hideLoading();
        
        wx.showToast({
          title: '清理失败',
          icon: 'none'
        });
      });
  }
}); 