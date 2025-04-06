const photoStorage = require('../../utils/photo-storage');

Page({
  data: {
    // 项目列表
    projects: [],
    
    // 当前选择的项目和位置
    selectedProject: '',
    selectedLocation: '',
    
    // 新建项目表单数据
    newProjectName: '',
    newLocationName: '',
    
    // 对话框控制
    showAddProjectDialog: false,
    showAddLocationDialog: false,
    
    // 加载状态
    isLoading: true,
    
    // 表单验证错误
    formError: ''
  },

  onLoad() {
    this.loadProjects();
  },
  
  onShow() {
    // 每次页面显示时刷新项目列表，确保数据最新
    this.loadProjects();
  },
  
  // 加载项目列表
  async loadProjects() {
    this.setData({ isLoading: true });
    
    try {
      // 获取数据库
      const db = await photoStorage.getDatabase();
      
      if (!db || !db.projectList || !db.projects) {
        this.setData({ 
          projects: [],
          isLoading: false
        });
        return;
      }
      
      // 转换项目数据为页面所需格式
      const projects = db.projectList.map(projectId => {
        const projectData = db.projects[projectId];
        
        return {
          id: projectId,
          name: projectData.name || projectId,
          locations: projectData.locations || [],
          createTime: projectData.createTime || 0,
          updateTime: projectData.updateTime || 0
        };
      });
      
      // 按更新时间排序，最近更新的在前面
      projects.sort((a, b) => b.updateTime - a.updateTime);
      
      this.setData({ 
        projects,
        isLoading: false
      });
      
      // 如果有项目，默认选择第一个
      if (projects.length > 0 && !this.data.selectedProject) {
        this.setData({
          selectedProject: projects[0].id,
          selectedLocation: projects[0].locations.length > 0 ? projects[0].locations[0] : ''
        });
      }
    } catch (err) {
      console.error('加载项目列表失败:', err);
      this.setData({ isLoading: false });
      
      wx.showToast({
        title: '加载项目列表失败',
        icon: 'none'
      });
    }
  },
  
  // 选择项目
  selectProject(e) {
    const { projectId } = e.currentTarget.dataset;
    
    // 找到对应项目
    const selectedProject = this.data.projects.find(p => p.id === projectId);
    
    if (selectedProject) {
      // 设置选中的项目，并默认选择第一个位置
      this.setData({
        selectedProject: projectId,
        selectedLocation: selectedProject.locations.length > 0 ? selectedProject.locations[0] : ''
      });
    }
  },
  
  // 选择位置
  selectLocation(e) {
    const { location } = e.currentTarget.dataset;
    
    this.setData({
      selectedLocation: location
    });
  },
  
  // 打开新建项目对话框
  openAddProjectDialog() {
    this.setData({
      showAddProjectDialog: true,
      newProjectName: '',
      formError: ''
    });
  },
  
  // 关闭新建项目对话框
  closeAddProjectDialog() {
    this.setData({
      showAddProjectDialog: false
    });
  },
  
  // 输入项目名称
  inputProjectName(e) {
    this.setData({
      newProjectName: e.detail.value,
      formError: ''
    });
  },
  
  // 添加新项目
  async addNewProject() {
    const { newProjectName } = this.data;
    
    // 验证项目名称
    if (!newProjectName.trim()) {
      this.setData({
        formError: '项目名称不能为空'
      });
      return;
    }
    
    // 检查项目名称是否重复
    const isExist = this.data.projects.some(p => p.name === newProjectName);
    
    if (isExist) {
      this.setData({
        formError: '项目名称已存在'
      });
      return;
    }
    
    // 生成唯一ID
    const projectId = `project_${Date.now()}`;
    
    try {
      // 创建新项目
      await photoStorage.createProject(projectId, newProjectName);
      
      // 关闭对话框并刷新列表
      this.setData({
        showAddProjectDialog: false
      });
      
      wx.showToast({
        title: '项目创建成功',
        icon: 'success'
      });
      
      // 刷新项目列表
      await this.loadProjects();
      
      // 选择新创建的项目
      this.setData({
        selectedProject: projectId,
        selectedLocation: ''
      });
      
      // 提示添加位置
      setTimeout(() => {
        this.openAddLocationDialog();
      }, 500);
    } catch (err) {
      console.error('创建项目失败:', err);
      
      wx.showToast({
        title: '创建项目失败',
        icon: 'none'
      });
    }
  },
  
  // 打开新建位置对话框
  openAddLocationDialog() {
    if (!this.data.selectedProject) {
      wx.showToast({
        title: '请先选择项目',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      showAddLocationDialog: true,
      newLocationName: '',
      formError: ''
    });
  },
  
  // 关闭新建位置对话框
  closeAddLocationDialog() {
    this.setData({
      showAddLocationDialog: false
    });
  },
  
  // 输入位置名称
  inputLocationName(e) {
    this.setData({
      newLocationName: e.detail.value,
      formError: ''
    });
  },
  
  // 添加新位置
  async addNewLocation() {
    const { selectedProject, newLocationName } = this.data;
    
    if (!selectedProject) {
      wx.showToast({
        title: '请先选择项目',
        icon: 'none'
      });
      return;
    }
    
    // 验证位置名称
    if (!newLocationName.trim()) {
      this.setData({
        formError: '位置名称不能为空'
      });
      return;
    }
    
    // 获取当前项目
    const currentProject = this.data.projects.find(p => p.id === selectedProject);
    
    if (!currentProject) {
      wx.showToast({
        title: '项目不存在',
        icon: 'none'
      });
      return;
    }
    
    // 检查位置名称是否重复
    const isExist = currentProject.locations.includes(newLocationName);
    
    if (isExist) {
      this.setData({
        formError: '位置名称已存在'
      });
      return;
    }
    
    try {
      // 添加新位置
      await photoStorage.addLocation(selectedProject, newLocationName);
      
      // 关闭对话框并刷新列表
      this.setData({
        showAddLocationDialog: false
      });
      
      wx.showToast({
        title: '位置添加成功',
        icon: 'success'
      });
      
      // 刷新项目列表
      await this.loadProjects();
      
      // 选择新添加的位置
      this.setData({
        selectedLocation: newLocationName
      });
    } catch (err) {
      console.error('添加位置失败:', err);
      
      wx.showToast({
        title: '添加位置失败',
        icon: 'none'
      });
    }
  },
  
  // 开始照片采集
  startPhotoCapture() {
    const { selectedProject, selectedLocation } = this.data;
    
    if (!selectedProject) {
      wx.showToast({
        title: '请先选择项目',
        icon: 'none'
      });
      return;
    }
    
    if (!selectedLocation) {
      wx.showToast({
        title: '请先选择位置',
        icon: 'none'
      });
      return;
    }
    
    // 跳转到相机页面
    wx.navigateTo({
      url: `/pages/camera-page/index?projectId=${selectedProject}&locationName=${selectedLocation}`
    });
  },
  
  // 查看照片列表
  viewPhotoList() {
    const { selectedProject, selectedLocation } = this.data;
    
    if (!selectedProject) {
      wx.showToast({
        title: '请先选择项目',
        icon: 'none'
      });
      return;
    }
    
    if (!selectedLocation) {
      wx.showToast({
        title: '请先选择位置',
        icon: 'none'
      });
      return;
    }
    
    // 跳转到照片列表页面
    wx.navigateTo({
      url: `/pages/photo-list/index?projectId=${selectedProject}&locationName=${selectedLocation}`
    });
  }
}); 