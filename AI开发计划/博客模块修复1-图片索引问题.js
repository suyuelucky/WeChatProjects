/**
 * 博客模块修复1-图片索引问题
 * 创建时间：2025年04月10日 23:52:34
 * 创建者：Claude助手
 * 
 * 本文件实现对博客模块中图片索引混淆问题的修复
 * 问题描述：图片加载错误处理中使用了相同的索引变量，导致无法正确标识博客项和图片
 */

/**
 * 修复方案：
 * 1. 修改博客列表循环，添加明确的索引标识
 * 2. 更新图片错误处理函数，确保正确区分博客索引和图片索引
 * 3. 添加完整的索引验证以增强稳定性
 */

// ========================= WXML修改部分 =========================

/**
 * 原始代码：
 * 
 * <view class="blog-card" wx:for="{{blogList}}" wx:key="id" bindtap="onTapBlogItem" data-id="{{item.id}}">
 *   <!-- ... 其他代码 ... -->
 *   <view class="image-container {{item.images.length === 1 ? 'single-image' : ''}}">
 *     <image 
 *       wx:for="{{item.images}}" 
 *       wx:for-item="img" 
 *       wx:key="*this" 
 *       src="{{img}}" 
 *       mode="aspectFill" 
 *       class="content-image"
 *       lazy-load="true"
 *       binderror="onImageError"
 *       data-index="{{index}}"
 *       data-blog-index="{{index}}"
 *     ></image>
 *   </view>
 */

/**
 * 修复后代码：
 * 
 * <view class="blog-card" wx:for="{{blogList}}" wx:for-index="blogIndex" wx:key="id" bindtap="onTapBlogItem" data-id="{{item.id}}">
 *   <!-- ... 其他代码 ... -->
 *   <view class="image-container {{item.images.length === 1 ? 'single-image' : ''}}">
 *     <image 
 *       wx:for="{{item.images}}" 
 *       wx:for-item="img"
 *       wx:for-index="imageIndex" 
 *       wx:key="*this" 
 *       src="{{img}}" 
 *       mode="aspectFill" 
 *       class="content-image"
 *       lazy-load="true"
 *       binderror="onImageError"
 *       data-image-index="{{imageIndex}}"
 *       data-blog-index="{{blogIndex}}"
 *     ></image>
 *   </view>
 */

// ========================= JS修改部分 =========================

/**
 * 原始代码:
 * 
 * onImageError: function (e) {
 *   try {
 *     // 获取博客索引和图片索引
 *     const { blogIndex, index } = e.currentTarget.dataset;
 *     
 *     // 深拷贝当前博客列表
 *     const blogList = [...this.data.blogList];
 *     
 *     // 标记该博客项的图片加载有错误
 *     if (blogList[blogIndex]) {
 *       blogList[blogIndex].hasImageError = true;
 *       
 *       // 更新数据
 *       this.setData({ blogList });
 *       
 *       console.error(`[博客页] 图片加载失败: 博客索引=${blogIndex}, 图片索引=${index}`);
 *     }
 *   } catch (err) {
 *     console.error('[博客页] 处理图片错误失败:', err);
 *   }
 * }
 */

/**
 * 修复后代码:
 */
const onImageError = function (e) {
  try {
    // 获取博客索引和图片索引，使用更明确的字段名
    const { blogIndex, imageIndex } = e.currentTarget.dataset;
    
    // 参数验证，确保索引有效
    if (blogIndex === undefined || imageIndex === undefined) {
      console.error('[博客页] 图片加载错误处理缺少必要的索引参数');
      return;
    }
    
    // 深拷贝当前博客列表
    const blogList = [...this.data.blogList];
    
    // 额外的边界检查，确保数据结构完整
    if (!blogList || blogIndex < 0 || blogIndex >= blogList.length) {
      console.error(`[博客页] 图片加载错误 - 无效的博客索引: ${blogIndex}`);
      return;
    }
    
    const blog = blogList[blogIndex];
    
    // 更多验证，确保图片数组存在且索引有效
    if (!blog.images || imageIndex < 0 || imageIndex >= blog.images.length) {
      console.error(`[博客页] 图片加载错误 - 博客#${blogIndex}的无效图片索引: ${imageIndex}`);
      return;
    }
    
    // 针对特定图片进行错误标记，而非整个博客
    if (!blog.imageErrors) {
      blog.imageErrors = [];
    }
    blog.imageErrors[imageIndex] = true;
    
    // 同时保留整体错误标记，兼容现有逻辑
    blog.hasImageError = true;
    
    // 更新UI
    this.setData({ 
      [`blogList[${blogIndex}].hasImageError`]: true,
      [`blogList[${blogIndex}].imageErrors`]: blog.imageErrors
    });
    
    // 详细日志
    console.error(`[博客页] 图片加载失败: 博客索引=${blogIndex}, 图片索引=${imageIndex}, 图片URL=${blog.images[imageIndex]}`);
  } catch (err) {
    console.error('[博客页] 处理图片错误失败:', err, e);
  }
};

// ========================= WXML增强部分 =========================

/**
 * 增强后的WXML，添加更细粒度的错误显示
 * 
 * <!-- 原有的整体错误提示 -->
 * <view class="image-error-tip" wx:if="{{item.hasImageError}}">
 *   <text class="error-text">图片加载失败</text>
 * </view>
 * 
 * <!-- 增强后的针对单张图片的错误提示 -->
 * <view class="image-container {{item.images.length === 1 ? 'single-image' : ''}}">
 *   <block wx:for="{{item.images}}" wx:for-item="img" wx:for-index="imageIndex" wx:key="*this">
 *     <view class="image-wrapper">
 *       <image 
 *         src="{{img}}" 
 *         mode="aspectFill" 
 *         class="content-image {{item.imageErrors[imageIndex] ? 'image-error' : ''}}"
 *         lazy-load="true"
 *         binderror="onImageError"
 *         data-image-index="{{imageIndex}}"
 *         data-blog-index="{{blogIndex}}"
 *       ></image>
 *       <view class="single-image-error-tip" wx:if="{{item.imageErrors[imageIndex]}}">
 *         <text class="error-text">图片加载失败</text>
 *       </view>
 *     </view>
 *   </block>
 * </view>
 */

// ========================= 样式增强部分 =========================

/**
 * 增强后的WXSS，添加单张图片错误样式
 * 
 * .image-wrapper {
 *   position: relative;
 *   overflow: hidden;
 * }
 * 
 * .image-error {
 *   opacity: 0.5;
 * }
 * 
 * .single-image-error-tip {
 *   position: absolute;
 *   top: 50%;
 *   left: 50%;
 *   transform: translate(-50%, -50%);
 *   background-color: rgba(0, 0, 0, 0.6);
 *   padding: 6rpx 12rpx;
 *   border-radius: 8rpx;
 * }
 * 
 * .single-image-error-tip .error-text {
 *   color: #fff;
 *   font-size: 24rpx;
 * }
 */

// 导出修复函数
module.exports = {
  onImageError,
  
  // 集成说明
  integrationGuide: `
    修复博客模块图片索引混淆问题的集成指南:
    
    1. 修改 miniprogram/pages/blog/index/index.wxml:
       - 在博客列表循环中添加 wx:for-index="blogIndex"
       - 在图片循环中添加 wx:for-index="imageIndex"
       - 更新image标签的data属性为 data-image-index 和 data-blog-index
    
    2. 更新 miniprogram/pages/blog/index/index.js:
       - 替换 onImageError 函数为此文件中的增强版本
       - 初始化 data 时为 blogList 中的图片项添加 imageErrors 数组支持
    
    3. 可选: 增强 WXML 和 WXSS，添加单张图片的错误提示
    
    4. 测试:
       - 确保在博客列表中故意加载错误图片能正确显示错误提示
       - 验证错误处理不会影响其他正常图片的显示
  `
}; 