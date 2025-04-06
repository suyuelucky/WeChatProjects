Component({
  properties: {
    // 当前相机位置
    devicePosition: {
      type: String,
      value: 'back'
    },
    // 当前闪光灯模式
    flash: {
      type: String,
      value: 'auto'
    },
    // 是否正在拍照
    isTaking: {
      type: Boolean,
      value: false
    },
    // 是否相机已准备好
    isReady: {
      type: Boolean,
      value: false
    },
    // 支持的闪光灯模式列表
    supportedFlash: {
      type: Array,
      value: ['auto', 'on', 'off']
    }
  },

  data: {
    // 闪光灯模式显示名称映射
    flashModeNames: {
      'auto': '自动闪光',
      'on': '开启闪光灯',
      'off': '关闭闪光灯'
    },
    // 是否显示设置面板
    showSettings: false
  },

  methods: {
    // 拍照按钮点击事件
    handleTakePhoto() {
      if (this.data.isTaking || !this.data.isReady) {
        return;
      }
      
      this.triggerEvent('takePhoto');
    },
    
    // 切换前后摄像头
    handleSwitchCamera() {
      if (this.data.isTaking || !this.data.isReady) {
        return;
      }
      
      const newPosition = this.data.devicePosition === 'back' ? 'front' : 'back';
      this.triggerEvent('switchCamera', { position: newPosition });
    },
    
    // 切换闪光灯模式
    handleSwitchFlash() {
      if (this.data.isTaking || !this.data.isReady) {
        return;
      }
      
      const currentIndex = this.data.supportedFlash.indexOf(this.data.flash);
      const nextIndex = (currentIndex + 1) % this.data.supportedFlash.length;
      const newFlash = this.data.supportedFlash[nextIndex];
      
      this.triggerEvent('switchFlash', { flash: newFlash });
    },
    
    // 切换相机设置面板显示
    toggleSettings() {
      if (this.data.isTaking) {
        return;
      }
      
      this.setData({
        showSettings: !this.data.showSettings
      });
    },
    
    // 取消拍照
    handleCancel() {
      this.triggerEvent('cancel');
    },
    
    // 阻止冒泡事件 - 用于设置面板中的点击
    preventBubble() {
      return false;
    },
    
    // 切换到特定闪光灯模式
    setFlashMode(e) {
      const { mode } = e.currentTarget.dataset;
      if (this.data.flash !== mode) {
        this.triggerEvent('switchFlash', { flash: mode });
      }
      this.setData({ showSettings: false });
    }
  }
}); 