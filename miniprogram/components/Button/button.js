Component({
  options: {
    addGlobalClass: true // 允许使用全局样式类
  },
  /**
   * 组件的属性列表
   */
  properties: {
    // 按钮类型
    type: {
      type: String,
      value: 'primary', // primary, secondary, outline, ghost, link
    },
    // 按钮尺寸
    size: {
      type: String,
      value: 'medium', // small, medium, large
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false,
    },
    // 是否加载中
    loading: {
      type: Boolean,
      value: false,
    },
    // 按钮文本
    text: {
      type: String,
      value: '',
    },
    // 是否为块级按钮
    block: {
      type: Boolean,
      value: false,
    },
    // 图标
    icon: {
      type: String,
      value: '',
    },
    // 自定义类名
    customClass: {
      type: String,
      value: '',
    },
    // 表单提交类型
    formType: {
      type: String,
      value: '', // submit, reset
    },
    // 开放能力
    openType: {
      type: String,
      value: '', // contact, share, getPhoneNumber 等
    },
    // 会话来源
    sessionFrom: {
      type: String,
      value: '',
    },
    // 发送内容
    sendMessageTitle: {
      type: String,
      value: '',
    },
    sendMessagePath: {
      type: String,
      value: '',
    },
    sendMessageImg: {
      type: String,
      value: '',
    },
    // 是否显示会话内消息卡片
    showMessageCard: {
      type: Boolean,
      value: false,
    },
    // 节流时间，单位毫秒，不需要节流设置为0
    throttleTime: {
      type: Number,
      value: 500,
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    lastClickTime: 0,
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 按钮点击事件
     */
    onClick(event) {
      // 禁用或加载状态不触发点击事件
      if (this.data.disabled || this.data.loading) {
        return;
      }

      // 节流处理
      const now = Date.now();
      if (this.data.throttleTime && now - this.data.lastClickTime < this.data.throttleTime) {
        return;
      }
      this.setData({ lastClickTime: now });

      this.triggerEvent('click', event);
    },
    
    /**
     * 获取用户信息回调
     */
    onGetUserInfo(event) {
      this.triggerEvent('getuserinfo', event.detail);
    },
    
    /**
     * 获取手机号回调
     */
    onGetPhoneNumber(event) {
      this.triggerEvent('getphonenumber', event.detail);
    },
    
    /**
     * 打开设置页面回调
     */
    onOpenSetting(event) {
      this.triggerEvent('opensetting', event.detail);
    },
    
    /**
     * 客服消息回调
     */
    onContact(event) {
      this.triggerEvent('contact', event.detail);
    },
    
    /**
     * 获取定位回调
     */
    onGetLocation(event) {
      this.triggerEvent('getlocation', event.detail);
    },
    
    /**
     * 错误回调
     */
    onError(event) {
      this.triggerEvent('error', event.detail);
    },
    
    /**
     * 开放能力返回结果
     */
    onLaunchApp(event) {
      this.triggerEvent('launchapp', event.detail);
    }
  }
}) 