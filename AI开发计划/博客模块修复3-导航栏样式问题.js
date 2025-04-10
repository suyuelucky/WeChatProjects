/**
 * 博客模块修复3-导航栏样式问题
 * 创建时间：2025年04月10日 23:56:25
 * 创建者：Claude助手
 * 
 * 本文件实现对博客模块导航栏在不同机型上的样式兼容性问题修复
 * 问题描述：
 * 1. 在部分机型上导航栏高度异常，显示不全或超出范围
 * 2. 动态导航栏在切换时存在闪烁现象
 * 3. 夜间模式下导航栏内容对比度不足
 */

/**
 * 修复方案：
 * 1. 优化导航栏高度计算逻辑，兼容不同设备
 * 2. 改进导航栏切换动画，减少闪烁
 * 3. 增强夜间模式下的视觉对比度
 */

// ========================= WXML修改部分 =========================

/**
 * 原始导航栏WXML:
 * 
 * <view class="nav-bar {{fixedTop ? 'fixed' : ''}}" style="height: {{navBarHeight}}px;">
 *   <view class="nav-bar-content" style="top: {{statusBarHeight}}px; height: {{navBarContentHeight}}px;">
 *     <view class="nav-bar-title">{{title}}</view>
 *     <view class="tabs-wrapper">
 *       <view 
 *         wx:for="{{tabs}}" 
 *         wx:key="index" 
 *         class="tab {{activeTab === index ? 'active' : ''}}"
 *         bindtap="onTabTap"
 *         data-index="{{index}}"
 *       >
 *         {{item}}
 *       </view>
 *     </view>
 *   </view>
 * </view>
 */

/**
 * 修复后的导航栏WXML:
 * 
 * <view 
 *   class="blog-nav-bar {{fixedTop ? 'fixed' : ''}} {{isDarkMode ? 'dark-mode' : ''}}" 
 *   style="height: {{navBarHeight}}px; padding-top: {{statusBarHeight}}px;"
 * >
 *   <view class="nav-content-wrapper" style="height: {{navBarContentHeight}}px;">
 *     <view class="blog-nav-bar-left">
 *       <view class="back-button" bindtap="onBackTap" wx:if="{{showBackButton}}">
 *         <text class="iconfont icon-back"></text>
 *       </view>
 *       <view class="blog-nav-bar-title">{{title}}</view>
 *     </view>
 *     
 *     <view class="blog-tabs-container">
 *       <view class="tabs-scroll-view">
 *         <view class="tabs-wrapper">
 *           <view 
 *             wx:for="{{tabs}}" 
 *             wx:key="index" 
 *             class="blog-tab {{activeTab === index ? 'active' : ''}}"
 *             bindtap="onTabTap"
 *             data-index="{{index}}"
 *             data-name="{{item}}"
 *           >
 *             <text class="tab-text">{{item}}</text>
 *             <view class="tab-indicator" wx:if="{{activeTab === index}}"></view>
 *           </view>
 *         </view>
 *       </view>
 *     </view>
 *   </view>
 * </view>
 */

// ========================= WXSS修改部分 =========================

/**
 * 原始导航栏WXSS:
 * 
 * .nav-bar {
 *   width: 100%;
 *   background-color: #fff;
 *   position: relative;
 *   z-index: 99;
 * }
 * 
 * .nav-bar.fixed {
 *   position: fixed;
 *   top: 0;
 *   left: 0;
 * }
 * 
 * .nav-bar-content {
 *   position: absolute;
 *   width: 100%;
 *   display: flex;
 *   flex-direction: column;
 *   align-items: center;
 * }
 * 
 * .nav-bar-title {
 *   font-size: 34rpx;
 *   font-weight: 500;
 *   color: #333;
 * }
 * 
 * .tabs-wrapper {
 *   display: flex;
 *   width: 100%;
 *   justify-content: center;
 *   margin-top: 16rpx;
 * }
 * 
 * .tab {
 *   padding: 0 20rpx;
 *   font-size: 28rpx;
 *   color: #666;
 *   position: relative;
 * }
 * 
 * .tab.active {
 *   color: #1a73e8;
 *   font-weight: 500;
 * }
 * 
 * .tab.active::after {
 *   content: '';
 *   position: absolute;
 *   bottom: -10rpx;
 *   left: 50%;
 *   transform: translateX(-50%);
 *   width: 40rpx;
 *   height: 4rpx;
 *   background-color: #1a73e8;
 * }
 */

/**
 * 修复后的导航栏WXSS:
 * 
 * .blog-nav-bar {
 *   width: 100%;
 *   background-color: #fff;
 *   position: relative;
 *   z-index: 99;
 *   transition: background-color 0.3s ease;
 *   box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
 *   box-sizing: border-box;
 * }
 * 
 * .blog-nav-bar.fixed {
 *   position: fixed;
 *   top: 0;
 *   left: 0;
 *   right: 0;
 * }
 * 
 * .blog-nav-bar.dark-mode {
 *   background-color: #1f1f1f;
 *   box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.2);
 * }
 * 
 * .nav-content-wrapper {
 *   position: relative;
 *   width: 100%;
 *   box-sizing: border-box;
 *   padding: 0 24rpx;
 *   display: flex;
 *   flex-direction: column;
 * }
 * 
 * .blog-nav-bar-left {
 *   display: flex;
 *   align-items: center;
 *   height: 88rpx;
 * }
 * 
 * .back-button {
 *   width: 60rpx;
 *   height: 60rpx;
 *   display: flex;
 *   align-items: center;
 *   justify-content: center;
 * }
 * 
 * .icon-back {
 *   font-size: 36rpx;
 *   color: #333;
 * }
 * 
 * .dark-mode .icon-back {
 *   color: #e0e0e0;
 * }
 * 
 * .blog-nav-bar-title {
 *   font-size: 34rpx;
 *   font-weight: 500;
 *   color: #333;
 *   margin-left: 16rpx;
 *   flex: 1;
 *   white-space: nowrap;
 *   overflow: hidden;
 *   text-overflow: ellipsis;
 * }
 * 
 * .dark-mode .blog-nav-bar-title {
 *   color: #f0f0f0;
 * }
 * 
 * .blog-tabs-container {
 *   width: 100%;
 *   overflow: hidden;
 * }
 * 
 * .tabs-scroll-view {
 *   width: 100%;
 *   white-space: nowrap;
 *   overflow-x: auto;
 *   -webkit-overflow-scrolling: touch;
 *   scrollbar-width: none; /* Firefox */
 * }
 * 
 * .tabs-scroll-view::-webkit-scrollbar {
 *   display: none; /* Chrome, Safari */
 * }
 * 
 * .tabs-wrapper {
 *   display: inline-flex;
 *   min-width: 100%;
 *   height: 84rpx;
 *   box-sizing: border-box;
 *   padding: 0 12rpx;
 * }
 * 
 * .blog-tab {
 *   display: inline-flex;
 *   flex-direction: column;
 *   align-items: center;
 *   justify-content: center;
 *   padding: 0 24rpx;
 *   height: 100%;
 *   position: relative;
 *   transition: all 0.2s ease-out;
 * }
 * 
 * .tab-text {
 *   font-size: 28rpx;
 *   font-weight: 400;
 *   color: #666;
 *   transition: color 0.2s ease, font-weight 0.1s ease;
 * }
 * 
 * .dark-mode .tab-text {
 *   color: #a0a0a0;
 * }
 * 
 * .blog-tab.active .tab-text {
 *   color: #1a73e8;
 *   font-weight: 500;
 * }
 * 
 * .dark-mode .blog-tab.active .tab-text {
 *   color: #4a96f8;
 * }
 * 
 * .tab-indicator {
 *   position: absolute;
 *   bottom: 0;
 *   left: 50%;
 *   transform: translateX(-50%);
 *   width: 40rpx;
 *   height: 6rpx;
 *   border-radius: 6rpx;
 *   background-color: #1a73e8;
 *   transition: width 0.2s ease;
 * }
 * 
 * .dark-mode .tab-indicator {
 *   background-color: #4a96f8;
 * }
 */

// ========================= JS修改部分 =========================

/**
 * 原始导航栏相关JS:
 * 
 * data: {
 *   statusBarHeight: 0,
 *   navBarHeight: 0,
 *   navBarContentHeight: 0,
 *   title: '博客',
 *   tabs: ['推荐', '关注', '热门'],
 *   activeTab: 0,
 *   fixedTop: false
 * },
 * 
 * onLoad: function() {
 *   this.initNavBar();
 *   // 其他初始化
 * },
 * 
 * initNavBar: function() {
 *   const systemInfo = wx.getSystemInfoSync();
 *   const statusBarHeight = systemInfo.statusBarHeight;
 *   const navBarContentHeight = 88; // 固定高度，单位px
 *   const navBarHeight = statusBarHeight + navBarContentHeight;
 *   
 *   this.setData({
 *     statusBarHeight,
 *     navBarHeight,
 *     navBarContentHeight
 *   });
 * },
 * 
 * onTabTap: function(e) {
 *   const index = e.currentTarget.dataset.index;
 *   this.setData({ activeTab: index });
 *   // 切换内容
 * },
 * 
 * onPageScroll: function(e) {
 *   const fixedTop = e.scrollTop > this.data.navBarHeight;
 *   if (fixedTop !== this.data.fixedTop) {
 *     this.setData({ fixedTop });
 *   }
 * }
 */

/**
 * 修复后的导航栏相关JS:
 */

// 封装导航栏工具函数，便于复用
const navBarUtils = {
  /**
   * 获取导航栏尺寸信息
   * 针对不同机型进行优化调整
   * @returns {Object} 返回导航栏尺寸信息
   */
  getNavBarSize: function() {
    try {
      const systemInfo = wx.getSystemInfoSync();
      const statusBarHeight = systemInfo.statusBarHeight;
      
      // 根据机型判断适合的导航栏内容高度
      let navBarContentHeight = 88; // 默认高度，单位rpx转px
      
      // 兼容iOS和安卓的差异
      if (systemInfo.platform === 'ios') {
        navBarContentHeight = 88;
      } else if (systemInfo.platform === 'android') {
        // 安卓可能需要稍微调整
        navBarContentHeight = 96;
      }
      
      // 针对异形屏额外处理
      const isIphoneX = /iPhone X|iPhone 11|iPhone 12|iPhone 13|iPhone 14|iPhone 15/i.test(systemInfo.model);
      if (isIphoneX) {
        navBarContentHeight = 92;
      }
      
      // 小屏幕设备(如iPhone SE)优化
      if (systemInfo.screenHeight < 700) {
        navBarContentHeight = 80;
      }
      
      // 转换为px（假设设计稿为750rpx）
      const rpxToPx = systemInfo.windowWidth / 750;
      navBarContentHeight = Math.round(navBarContentHeight * rpxToPx);
      
      const navBarHeight = statusBarHeight + navBarContentHeight;
      
      return {
        statusBarHeight,
        navBarContentHeight,
        navBarHeight,
        windowWidth: systemInfo.windowWidth,
        windowHeight: systemInfo.windowHeight,
        pixelRatio: systemInfo.pixelRatio,
        platform: systemInfo.platform
      };
    } catch (e) {
      console.error('[导航栏工具] 获取系统信息失败', e);
      // 提供默认值以避免崩溃
      return {
        statusBarHeight: 20,
        navBarContentHeight: 44,
        navBarHeight: 64,
        windowWidth: 375,
        windowHeight: 667,
        pixelRatio: 2,
        platform: 'unknown'
      };
    }
  },
  
  /**
   * 计算标签页指示器的位置
   * @param {Object} targetTab 目标标签元素
   * @param {Number} tabsContainerLeft 标签容器左侧位置
   * @returns {Object} 指示器位置信息
   */
  calculateIndicatorPosition: function(targetTab, tabsContainerLeft) {
    return new Promise((resolve) => {
      wx.createSelectorQuery()
        .select(targetTab)
        .boundingClientRect(function(rect) {
          if (!rect) {
            resolve({ left: 0, width: 0 });
            return;
          }
          
          const indicatorWidth = 40; // rpx，与CSS中保持一致
          const left = rect.left + rect.width / 2 - indicatorWidth / 2 - tabsContainerLeft;
          
          resolve({
            left,
            width: indicatorWidth
          });
        })
        .exec();
    });
  },
  
  /**
   * 检测并应用夜间模式
   * @returns {Boolean} 是否为夜间模式
   */
  checkDarkMode: function() {
    try {
      // 尝试读取系统主题模式（部分设备支持）
      const systemInfo = wx.getSystemInfoSync();
      if (systemInfo.theme === 'dark') {
        return true;
      }
      
      // 也可以从本地存储读取用户设置
      const userSettings = wx.getStorageSync('userSettings') || {};
      if (userSettings.darkMode !== undefined) {
        return userSettings.darkMode;
      }
      
      // 或根据时间自动判断（晚上10点到早上6点）
      const hour = new Date().getHours();
      return (hour >= 22 || hour < 6);
    } catch (e) {
      console.error('[导航栏工具] 检测夜间模式失败', e);
      return false;
    }
  }
};

/**
 * 页面实现代码
 * 在Page对象中添加或修改以下方法:
 */

// data对象中添加的字段：
/**
 * data: {
 *   statusBarHeight: 0,
 *   navBarHeight: 0,
 *   navBarContentHeight: 0,
 *   title: '博客',
 *   tabs: ['推荐', '关注', '热门'],
 *   activeTab: 0,
 *   fixedTop: false,
 *   showBackButton: true,
 *   isDarkMode: false,
 *   indicatorStyles: '',
 *   scrollLeft: 0,
 *   // 其他现有数据...
 * },
 */

/**
 * 初始化导航栏
 * 改进计算逻辑，兼容不同设备
 */
const initNavBar = function() {
  // 获取导航栏尺寸信息
  const navBarInfo = navBarUtils.getNavBarSize();
  
  // 检测是否为夜间模式
  const isDarkMode = navBarUtils.checkDarkMode();
  
  // 判断是否显示返回按钮（如果有上一页则显示）
  const pages = getCurrentPages();
  const showBackButton = pages.length > 1;
  
  this.setData({
    statusBarHeight: navBarInfo.statusBarHeight,
    navBarHeight: navBarInfo.navBarHeight,
    navBarContentHeight: navBarInfo.navBarContentHeight,
    isDarkMode,
    showBackButton
  });
  
  // 延迟一帧，确保组件已渲染
  setTimeout(() => {
    this.updateTabIndicator();
  }, 50);
};

/**
 * 切换标签页
 * 增加滚动到可见区域和指示器动画
 */
const onTabTap = function(e) {
  const index = e.currentTarget.dataset.index;
  const name = e.currentTarget.dataset.name;
  
  if (index === this.data.activeTab) return;
  
  this.setData({ activeTab: index });
  
  // 切换对应内容
  this.switchTabContent(index, name);
  
  // 更新指示器位置
  this.updateTabIndicator();
  
  // 确保选中标签在可见区域
  this.scrollTabIntoView(index);
};

/**
 * 更新标签指示器位置
 * 添加动画效果
 */
const updateTabIndicator = function() {
  const activeIndex = this.data.activeTab;
  const query = wx.createSelectorQuery();
  
  // 获取标签容器位置
  query.select('.tabs-wrapper').boundingClientRect();
  query.select(`.blog-tab:nth-child(${activeIndex + 1})`).boundingClientRect();
  
  query.exec((res) => {
    if (!res || !res[0] || !res[1]) return;
    
    const containerRect = res[0];
    const tabRect = res[1];
    
    const tabCenterX = tabRect.left + tabRect.width / 2;
    const indicatorWidth = 40; // 与CSS中的宽度保持一致
    const left = tabCenterX - containerRect.left - indicatorWidth / 2;
    
    this.setData({
      indicatorStyles: `left: ${left}px; width: ${indicatorWidth}px;`
    });
  });
};

/**
 * 滚动标签到可见区域
 */
const scrollTabIntoView = function(index) {
  const query = wx.createSelectorQuery();
  query.select(`.blog-tab:nth-child(${index + 1})`).boundingClientRect();
  query.select('.tabs-scroll-view').boundingClientRect();
  
  query.exec((res) => {
    if (!res || !res[0] || !res[1]) return;
    
    const tabRect = res[0];
    const scrollViewRect = res[1];
    
    // 计算需要滚动的位置
    const tabCenter = tabRect.left + tabRect.width / 2;
    const scrollViewCenter = scrollViewRect.left + scrollViewRect.width / 2;
    const scrollLeft = this.data.scrollLeft + (tabCenter - scrollViewCenter);
    
    this.setData({ scrollLeft });
  });
};

/**
 * 切换标签内容
 * 分离业务逻辑，便于扩展
 */
const switchTabContent = function(index, name) {
  // 这里处理内容切换的逻辑
  // 例如：加载对应类别的博客列表
  console.log(`切换到标签: ${name}, 索引: ${index}`);
  
  // 根据标签类型加载不同内容
  switch (index) {
    case 0: // 推荐
      this.loadRecommendedBlogs();
      break;
    case 1: // 关注
      this.loadFollowingBlogs();
      break;
    case 2: // 热门
      this.loadHotBlogs();
      break;
    default:
      this.loadRecommendedBlogs();
  }
};

/**
 * 处理返回按钮点击
 */
const onBackTap = function() {
  wx.navigateBack({
    fail: () => {
      // 如果没有可返回的页面，则跳转到首页
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  });
};

/**
 * 页面滚动处理
 * 优化滚动检测，减少重绘
 */
const onPageScroll = function(e) {
  // 使用节流函数优化性能
  if (this.scrollThrottleTimer) return;
  
  this.scrollThrottleTimer = setTimeout(() => {
    const scrollTop = e.scrollTop;
    const fixedTop = scrollTop > this.data.navBarHeight;
    
    if (fixedTop !== this.data.fixedTop) {
      this.setData({ fixedTop });
    }
    
    this.scrollThrottleTimer = null;
  }, 16); // 约60fps的更新频率
};

/**
 * 监听主题变化
 * 用于响应系统深色模式变化
 */
const onThemeChange = function(e) {
  const isDarkMode = e.theme === 'dark';
  this.setData({ isDarkMode });
};

// 导出修复方案
module.exports = {
  navBarUtils,
  navBarMethods: {
    initNavBar,
    onTabTap,
    updateTabIndicator,
    scrollTabIntoView,
    switchTabContent,
    onBackTap,
    onPageScroll,
    onThemeChange
  },
  
  // 集成说明
  integrationGuide: `
    博客模块导航栏样式问题修复集成指南:
    
    1. WXML修改:
       - 打开博客页面的WXML文件，例如 miniprogram/pages/blog/index/index.wxml
       - 替换原有导航栏代码段为新的WXML代码
    
    2. WXSS修改:
       - 打开对应的WXSS文件，例如 miniprogram/pages/blog/index/index.wxss
       - 添加新的样式代码，注意与现有样式合并
       - 可以创建单独的导航栏样式文件，例如 miniprogram/components/blog-nav-bar/blog-nav-bar.wxss
    
    3. JS修改:
       - 先安装navBarUtils工具函数到项目中:
         * 创建 miniprogram/utils/navBarUtils.js 文件
         * 复制本文件中的navBarUtils对象到该文件并导出
       - 在博客页面JS中引入: import navBarUtils from '../../../../utils/navBarUtils';
       - 修改页面data对象，添加新的字段
       - 更新生命周期函数和事件处理函数:
         * 在onLoad中调用 this.initNavBar()
         * 添加onThemeChange生命周期函数
       
    4. 实现各函数逻辑:
       - 复制本文件提供的函数实现到页面对象中
       - 根据实际项目结构调整路径和变量名
    
    5. 兼容性测试:
       - 在不同机型上测试导航栏显示效果
       - 检查夜间模式下的视觉表现
       - 测试标签页切换动画是否流畅
    
    这套修复方案提供了全方位的兼容性优化，包括:
    - 不同机型屏幕适配
    - 异形屏支持
    - 夜间模式增强
    - 滚动性能优化
    - 动画流畅度提升
  `
}; 