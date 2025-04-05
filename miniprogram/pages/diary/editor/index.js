// 日记编辑页面
const util = require('../../../utils/util');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    diaryId: '', // 日记ID，编辑现有日记时使用
    date: '', // 日期，格式：YYYY-MM-DD
    dateFormatted: '', // 格式化后的日期显示
    title: '', // 日记标题
    content: '', // 日记内容
    weather: '', // 天气
    weatherIcon: '☀️', // 天气图标
    location: '', // 位置
    images: [], // 图片列表
    voiceUrl: '', // 语音文件URL
    isEditing: false // 是否是编辑模式
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 设置默认日期为今天
    const today = new Date();
    const date = util.formatDate(today);
    const dateFormatted = util.formatDateDisplay(today);
    
    this.setData({
      date,
      dateFormatted
    });
    
    // 如果传入了日记ID，则加载日记数据
    if (options.id) {
      this.setData({
        diaryId: options.id,
        isEditing: true
      });
      this.loadDiaryData(options.id);
    }
  },
  
  /**
   * 加载日记数据
   */
  loadDiaryData: function (diaryId) {
    try {
      const diaries = wx.getStorageSync('diaries') || [];
      const diary = diaries.find(item => item.id === diaryId);
      
      if (diary) {
        this.setData({
          date: diary.date,
          dateFormatted: util.formatDateDisplay(new Date(diary.date)),
          title: diary.title || '',
          content: diary.content || '',
          weather: diary.weather || '',
          weatherIcon: diary.weatherIcon || '☀️',
          location: diary.location || '',
          images: diary.images || [],
          voiceUrl: diary.voiceUrl || ''
        });
      } else {
        wx.showToast({
          title: '日记不存在',
          icon: 'error'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('加载日记数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },
  
  /**
   * 日期选择器变化事件
   */
  onDateChange: function (e) {
    const date = e.detail.value;
    const dateFormatted = util.formatDateDisplay(new Date(date));
    
    this.setData({
      date,
      dateFormatted
    });
  },
  
  /**
   * 标题输入事件
   */
  onTitleInput: function (e) {
    this.setData({
      title: e.detail.value
    });
  },
  
  /**
   * 内容输入事件
   */
  onContentInput: function (e) {
    this.setData({
      content: e.detail.value
    });
  },
  
  /**
   * 选择天气
   */
  chooseWeather: function () {
    const weathers = [
      { text: '晴', icon: '☀️' },
      { text: '多云', icon: '⛅' },
      { text: '阴', icon: '☁️' },
      { text: '小雨', icon: '🌦️' },
      { text: '大雨', icon: '🌧️' },
      { text: '雷雨', icon: '⛈️' },
      { text: '雪', icon: '❄️' },
      { text: '雾', icon: '🌫️' }
    ];
    
    const weatherItems = weathers.map(w => `${w.icon} ${w.text}`);
    
    wx.showActionSheet({
      itemList: weatherItems,
      success: (res) => {
        const selected = weathers[res.tapIndex];
        this.setData({
          weather: selected.text,
          weatherIcon: selected.icon
        });
      }
    });
  },
  
  /**
   * 添加图片
   */
  addImage: function () {
    const currentCount = this.data.images.length;
    const maxCount = 9 - currentCount;
    
    if (maxCount <= 0) {
      wx.showToast({
        title: '最多添加9张图片',
        icon: 'none'
      });
      return;
    }
    
    wx.chooseMedia({
      count: maxCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFiles = res.tempFiles;
        const newImages = this.data.images.concat(tempFiles.map(file => file.tempFilePath));
        
        this.setData({
          images: newImages
        });
      }
    });
  },
  
  /**
   * 添加位置
   */
  addLocation: function () {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          location: res.name || res.address
        });
      }
    });
  },
  
  /**
   * 添加语音
   */
  addVoice: function () {
    wx.navigateTo({
      url: '/pages/diary/camera/index?type=voice'
    });
  },
  
  /**
   * 预览图片
   */
  previewImage: function (e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },
  
  /**
   * 删除图片
   */
  deleteImage: function (e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    
    images.splice(index, 1);
    
    this.setData({
      images
    });
  },
  
  /**
   * 取消编辑
   */
  cancelEdit: function () {
    wx.showModal({
      title: '确认取消',
      content: '内容将不会保存，确定要取消吗？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack();
        }
      }
    });
  },
  
  /**
   * 保存日记
   */
  saveDiary: function () {
    const { diaryId, date, title, content, weather, weatherIcon, location, images, voiceUrl, isEditing } = this.data;
    
    // 验证必填字段
    if (!content.trim()) {
      wx.showToast({
        title: '请输入日记内容',
        icon: 'none'
      });
      return;
    }
    
    try {
      // 获取现有日记
      const diaries = wx.getStorageSync('diaries') || [];
      
      if (isEditing) {
        // 编辑现有日记
        const index = diaries.findIndex(item => item.id === diaryId);
        
        if (index !== -1) {
          diaries[index] = {
            ...diaries[index],
            date,
            title,
            content,
            weather,
            weatherIcon,
            location,
            images,
            voiceUrl,
            updatedAt: new Date().getTime()
          };
        }
      } else {
        // 创建新日记
        const newDiary = {
          id: Date.now().toString(),
          date,
          title,
          content,
          weather,
          weatherIcon,
          location,
          images,
          voiceUrl,
          createdAt: new Date().getTime(),
          updatedAt: new Date().getTime()
        };
        
        diaries.unshift(newDiary);
      }
      
      // 保存到本地存储
      wx.setStorageSync('diaries', diaries);
      
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      
      // 延迟返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('保存日记失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    }
  }
}); 