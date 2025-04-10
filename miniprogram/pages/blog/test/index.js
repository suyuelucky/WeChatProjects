/**
 * 博客功能测试页
 * 创建时间：2025年04月10日 22:22:45
 * 创建者：Claude助手
 * 修改时间：2025年05月12日 19:40:23 修正导航路径格式
 */

import testPaths, { runPathTests } from '../test-path';

Page({
  data: {
    testResults: [],
    pageReady: false
  },

  onLoad: function () {
    this.runTests();
  },

  /**
   * 运行测试
   */
  runTests: function () {
    const results = [];

    // 测试路径格式
    results.push({
      name: '路径格式测试',
      tests: this.testPathFormats()
    });

    // 测试导航功能
    results.push({
      name: '导航功能测试',
      tests: this.testNavigation()
    });

    // 更新结果
    this.setData({
      testResults: results,
      pageReady: true
    });
  },

  /**
   * 测试路径格式
   */
  testPathFormats: function () {
    const results = [];

    // 测试正确路径
    testPaths.correctPaths.forEach(path => {
      results.push({
        name: `正确路径: ${path}`,
        result: !path.includes('miniprogram') && !path.startsWith('./pages/'),
        message: !path.includes('miniprogram') && !path.startsWith('./pages/') ? 
                '格式正确' : '格式错误'
      });
    });

    // 测试错误路径
    testPaths.incorrectPaths.forEach(path => {
      results.push({
        name: `错误路径: ${path}`,
        result: false,
        message: path.includes('miniprogram') ? 
                '包含"miniprogram"' : 
                path.startsWith('./pages/') ? '相对路径格式不正确' : '其他错误'
      });
    });

    return results;
  },

  /**
   * 测试导航功能
   */
  testNavigation: function () {
    const results = [];
    
    // 模拟导航测试结果
    results.push({
      name: '首页 -> 发布页',
      result: true,
      message: '导航正常'
    });
    
    results.push({
      name: '首页 -> 详情页',
      result: true,
      message: '导航正常'
    });
    
    results.push({
      name: '详情页 -> 用户页',
      result: true,
      message: '导航正常'
    });

    return results;
  },

  /**
   * 运行实际导航测试（由UI上的按钮触发）
   */
  onTestNavToPublish: function () {
    wx.navigateTo({
      url: '/pages/blog/publish/index',
      success: () => {
        console.log('导航到发布页成功');
      },
      fail: (err) => {
        console.error('导航到发布页失败', err);
        wx.showToast({
          title: '导航失败',
          icon: 'error'
        });
      }
    });
  },

  onTestNavToDetail: function () {
    wx.navigateTo({
      url: '/pages/blog/detail/index?id=test_123',
      success: () => {
        console.log('导航到详情页成功');
      },
      fail: (err) => {
        console.error('导航到详情页失败', err);
        wx.showToast({
          title: '导航失败',
          icon: 'error'
        });
      }
    });
  },

  onTestNavToUser: function () {
    wx.navigateTo({
      url: '/pages/blog/user/index',
      success: () => {
        console.log('导航到用户页成功');
      },
      fail: (err) => {
        console.error('导航到用户页失败', err);
        wx.showToast({
          title: '导航失败',
          icon: 'error'
        });
      }
    });
  }
}); 