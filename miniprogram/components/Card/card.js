Component({
  options: {
    addGlobalClass: true, // 允许使用全局样式类
    multipleSlots: true // 启用多插槽
  },
  /**
   * 组件的属性列表
   */
  properties: {
    // 卡片标题
    title: {
      type: String,
      value: '',
    },
    // 卡片副标题
    subtitle: {
      type: String,
      value: '',
    },
    // 卡片封面图片
    cover: {
      type: String,
      value: '',
    },
    // 卡片类型
    variant: {
      type: String,
      value: 'default', // default, outlined, elevated, flat
    },
    // 卡片尺寸
    size: {
      type: String,
      value: 'medium', // small, medium, large
    },
    // 是否可点击
    clickable: {
      type: Boolean,
      value: false,
    },
    // 自定义类名
    customClass: {
      type: String,
      value: '',
    },
  },

  /**
   * 组件的初始数据
   */
  data: {
    
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 卡片点击事件
     */
    onClick(event) {
      if (this.data.clickable) {
        this.triggerEvent('click', event);
      }
    }
  }
}) 