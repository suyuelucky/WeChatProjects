Page({
  data: {
    openId: '',
    cloudFunctionResult: '',
    dbQueryResult: '',
    uploadResult: '',
    fileID: '',
    cloudPath: '',
    userInfo: null,
    hasUserInfo: false,
    initDatabaseResult: ''
  },

  onLoad: function(options) {
    // 页面加载时执行
  },

  // 调用云函数获取OpenID
  getOpenId: function() {
    wx.showLoading({
      title: '正在获取',
    });
    
    wx.cloud.callFunction({
      name: 'getOpenId',
      data: {},
      success: res => {
        console.log('[云函数] [getOpenId] 调用成功：', res);
        this.setData({
          openId: res.result.openid,
          cloudFunctionResult: JSON.stringify(res.result, null, 2)
        });
        wx.hideLoading();
      },
      fail: err => {
        console.error('[云函数] [getOpenId] 调用失败', err);
        wx.hideLoading();
        wx.showToast({
          icon: 'none',
          title: '获取 openId 失败，请检查是否有部署 getOpenId 云函数',
        });
      }
    });
  },

  // 初始化数据库
  initDatabase: function() {
    wx.showLoading({
      title: '正在初始化数据库',
    });
    
    wx.cloud.callFunction({
      name: 'initDatabase',
      data: {},
      success: res => {
        console.log('[云函数] [initDatabase] 调用成功：', res);
        this.setData({
          initDatabaseResult: JSON.stringify(res.result, null, 2)
        });
        wx.hideLoading();
        wx.showToast({
          title: '初始化完成',
        });
      },
      fail: err => {
        console.error('[云函数] [initDatabase] 调用失败', err);
        wx.hideLoading();
        wx.showToast({
          icon: 'none',
          title: '初始化数据库失败',
        });
      }
    });
  },

  // 创建或更新用户信息
  updateUser: function() {
    if (!this.data.openId) {
      wx.showToast({
        title: '请先获取OpenID',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '正在更新用户信息',
    });
    
    // 获取当前用户微信信息（小程序最新版本已移除getUserInfo，使用模拟数据）
    const userInfo = {
      nickName: '测试用户',
      avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
      gender: 1,
      province: '广东省',
      city: '深圳市'
    };
    
    // 调用云函数更新用户信息
    wx.cloud.callFunction({
      name: 'manageUser',
      data: {
        action: 'update',
        data: {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          gender: userInfo.gender,
          province: userInfo.province,
          city: userInfo.city
        }
      },
      success: res => {
        console.log('[云函数] [manageUser] 调用成功：', res);
        
        this.setData({
          userInfo: userInfo,
          hasUserInfo: true,
          dbQueryResult: JSON.stringify(res.result, null, 2)
        });
        
        wx.hideLoading();
        wx.showToast({
          title: '用户信息已更新',
        });
      },
      fail: err => {
        console.error('[云函数] [manageUser] 调用失败', err);
        wx.hideLoading();
        wx.showToast({
          icon: 'none',
          title: '更新用户信息失败',
        });
      }
    });
  },

  // 查询用户信息
  queryUser: function() {
    if (!this.data.openId) {
      wx.showToast({
        title: '请先获取OpenID',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '正在查询用户信息',
    });
    
    // 调用云函数查询用户信息
    wx.cloud.callFunction({
      name: 'manageUser',
      data: {
        action: 'get'
      },
      success: res => {
        console.log('[云函数] [manageUser] 查询调用成功：', res);
        
        this.setData({
          dbQueryResult: JSON.stringify(res.result, null, 2)
        });
        
        // 如果查询成功且有数据，更新用户信息显示
        if (res.result.success && res.result.data) {
          this.setData({
            userInfo: res.result.data,
            hasUserInfo: true
          });
        }
        
        wx.hideLoading();
      },
      fail: err => {
        console.error('[云函数] [manageUser] 查询调用失败', err);
        wx.hideLoading();
        wx.showToast({
          icon: 'none',
          title: '查询用户信息失败',
        });
      }
    });
  },

  // 上传文件到云存储
  uploadFile: function() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: res => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        const timestamp = Date.now();
        const cloudPath = `user-photos/${this.data.openId || 'anonymous'}/${timestamp}${tempFilePath.match(/\.[^.]+?$/)[0]}`;
        
        wx.showLoading({
          title: '正在上传',
        });
        
        wx.cloud.uploadFile({
          cloudPath,
          filePath: tempFilePath,
          success: res => {
            console.log('[上传文件] 成功：', res);
            
            // 文件上传成功后，保存文件信息到数据库
            wx.cloud.callFunction({
              name: 'manageFile',
              data: {
                action: 'save',
                fileID: res.fileID,
                fileInfo: {
                  name: `图片_${timestamp}`,
                  type: 'image',
                  size: res.tempFiles ? res.tempFiles[0].size : 0,
                  extension: tempFilePath.match(/\.[^.]+?$/)[0]
                }
              },
              success: dbRes => {
                console.log('[保存文件信息] 成功：', dbRes);
                
                this.setData({
                  fileID: res.fileID,
                  cloudPath,
                  uploadResult: `上传成功：${res.fileID}`,
                  dbQueryResult: JSON.stringify(dbRes.result, null, 2)
                });
              },
              fail: dbErr => {
                console.error('[保存文件信息] 失败：', dbErr);
              },
              complete: () => {
                wx.hideLoading();
              }
            });
          },
          fail: err => {
            console.error('[上传文件] 失败：', err);
            wx.hideLoading();
            wx.showToast({
              icon: 'none',
              title: '上传失败',
            });
          }
        });
      },
      fail: err => {
        console.error(err);
      }
    });
  },

  // 从云存储下载文件
  downloadFile: function() {
    if (!this.data.fileID) {
      wx.showToast({
        title: '请先上传文件',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '正在下载',
    });
    
    wx.cloud.downloadFile({
      fileID: this.data.fileID,
      success: res => {
        console.log('[下载文件] 成功：', res);
        
        wx.showToast({
          title: '下载成功',
          icon: 'success'
        });
        
        // 打开文件
        const filePath = res.tempFilePath;
        wx.openDocument({
          filePath,
          success: function (res) {
            console.log('打开文档成功');
          },
          fail: function(err) {
            console.error('打开文档失败', err);
          }
        });
        
        wx.hideLoading();
      },
      fail: err => {
        console.error('[下载文件] 失败：', err);
        wx.hideLoading();
        wx.showToast({
          icon: 'none',
          title: '下载失败',
        });
      }
    });
  },
  
  // 获取文件列表
  getFileList: function() {
    if (!this.data.openId) {
      wx.showToast({
        title: '请先获取OpenID',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '正在获取文件列表',
    });
    
    // 调用云函数获取文件列表
    wx.cloud.callFunction({
      name: 'manageFile',
      data: {
        action: 'list',
        type: 'image',  // 可选，按类型筛选
        page: 1,
        pageSize: 10
      },
      success: res => {
        console.log('[获取文件列表] 成功：', res);
        
        this.setData({
          dbQueryResult: JSON.stringify(res.result, null, 2)
        });
        
        wx.hideLoading();
      },
      fail: err => {
        console.error('[获取文件列表] 失败：', err);
        wx.hideLoading();
        wx.showToast({
          icon: 'none',
          title: '获取文件列表失败',
        });
      }
    });
  }
}) 