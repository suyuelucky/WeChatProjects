// pages/index/index.js
// 引入工具模块
var photoStorageUtil = require('../../utils/photo-storage');

Page({
  data: {
    loading: true,
    projects: [],
    locations: [],
    selectedProject: null,
    selectedLocation: null,
    
    // 新建项目对话框
    showProjectDialog: false,
    newProjectName: '',
    projectNameError: '',
    
    // 新建位置对话框
    showLocationDialog: false,
    newLocationName: '',
    locationNameError: ''
  },

  onLoad: function() {
    // 初始化照片存储
    this.initPhotoStorage();
  },
  
  onShow: function() {
    // 重新加载数据
    this.loadProjects();
  },
  
  // 初始化照片存储
  initPhotoStorage: function() {
    var that = this;
    photoStorageUtil.initDatabase(function(success) {
      if (success) {
        that.loadProjects();
      } else {
        that.setData({ 
          loading: false
        });
        wx.showToast({
          title: '初始化失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 加载项目列表
  loadProjects: function() {
    var that = this;
    photoStorageUtil.getProjects(function(projects) {
      that.setData({
        projects: projects,
        loading: false
      });
      
      // 如果有选中的项目，重新加载位置列表
      if (that.data.selectedProject) {
        that.loadLocations(that.data.selectedProject.id);
      }
    });
  },
  
  // 加载位置列表
  loadLocations: function(projectId) {
    var that = this;
    photoStorageUtil.getLocations(projectId, function(locations) {
      that.setData({
        locations: locations
      });
    });
  },
  
  // 选择项目
  selectProject: function(e) {
    var projectId = e.currentTarget.dataset.id;
    var project = this.data.projects.find(function(p) {
      return p.id === projectId;
    });
    
    if (project) {
      this.setData({
        selectedProject: project,
        // 切换项目时清空已选位置
        selectedLocation: null
      });
      
      // 加载该项目下的位置列表
      this.loadLocations(project.id);
    }
  },
  
  // 选择位置
  selectLocation: function(e) {
    var locationId = e.currentTarget.dataset.id;
    var location = this.data.locations.find(function(loc) {
      return loc.id === locationId;
    });
    
    if (location) {
      this.setData({
        selectedLocation: location
      });
    }
  },
  
  // 显示新建项目对话框
  showAddProject: function() {
    this.setData({
      showProjectDialog: true,
      newProjectName: '',
      projectNameError: ''
    });
  },
  
  // 隐藏新建项目对话框
  hideAddProject: function() {
    this.setData({
      showProjectDialog: false
    });
  },
  
  // 输入项目名称
  inputProjectName: function(e) {
    this.setData({
      newProjectName: e.detail.value
    });
  },
  
  // 创建新项目
  createProject: function() {
    var that = this;
    var name = this.data.newProjectName.trim();
    
    if (!name) {
      this.setData({
        projectNameError: '项目名称不能为空'
      });
      return;
    }
    
    if (name.length > 20) {
      this.setData({
        projectNameError: '项目名称不能超过20个字符'
      });
      return;
    }
    
    // 创建项目
    photoStorageUtil.createProject(name, function(success, projectId) {
      if (success) {
        // 关闭对话框并刷新列表
        that.setData({
          showProjectDialog: false
        });
        that.loadProjects();
        
        wx.showToast({
          title: '创建成功',
          icon: 'success'
        });
      } else {
        that.setData({
          projectNameError: '创建失败，请重试'
        });
      }
    });
  },
  
  // 显示新建位置对话框
  showAddLocation: function() {
    if (!this.data.selectedProject) {
      wx.showToast({
        title: '请先选择项目',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      showLocationDialog: true,
      newLocationName: '',
      locationNameError: ''
    });
  },
  
  // 隐藏新建位置对话框
  hideAddLocation: function() {
    this.setData({
      showLocationDialog: false
    });
  },
  
  // 输入位置名称
  inputLocationName: function(e) {
    this.setData({
      newLocationName: e.detail.value
    });
  },
  
  // 创建新位置
  createLocation: function() {
    var that = this;
    var name = this.data.newLocationName.trim();
    
    if (!name) {
      this.setData({
        locationNameError: '位置名称不能为空'
      });
      return;
    }
    
    if (name.length > 30) {
      this.setData({
        locationNameError: '位置名称不能超过30个字符'
      });
      return;
    }
    
    // 检查项目是否已选择
    if (!this.data.selectedProject) {
      this.setData({
        locationNameError: '请先选择项目'
      });
      return;
    }
    
    // 创建位置
    photoStorageUtil.addLocation(
      this.data.selectedProject.id, 
      name, 
      function(success, locationId) {
        if (success) {
          // 关闭对话框并刷新列表
          that.setData({
            showLocationDialog: false
          });
          that.loadLocations(that.data.selectedProject.id);
          
          wx.showToast({
            title: '创建成功',
            icon: 'success'
          });
        } else {
          that.setData({
            locationNameError: '创建失败，请重试'
          });
        }
      }
    );
  },
  
  // 进入拍照页面
  goToCapture: function() {
    if (!this.data.selectedProject || !this.data.selectedLocation) {
      wx.showToast({
        title: '请先选择项目和位置',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/camera-page/index?projectId=' + this.data.selectedProject.id + 
           '&projectName=' + encodeURIComponent(this.data.selectedProject.name) + 
           '&locationId=' + this.data.selectedLocation.id + 
           '&locationName=' + encodeURIComponent(this.data.selectedLocation.name)
    });
  },
  
  // 查看照片列表
  goToPhotoList: function() {
    var url = '/pages/photo-list/index';
    
    // 如果有选中的项目和位置，附加参数
    if (this.data.selectedProject && this.data.selectedLocation) {
      url += '?projectId=' + this.data.selectedProject.id + 
             '&locationId=' + this.data.selectedLocation.id;
    } else if (this.data.selectedProject) {
      url += '?projectId=' + this.data.selectedProject.id;
    }
    
    wx.navigateTo({
      url: url
    });
  }
}) 