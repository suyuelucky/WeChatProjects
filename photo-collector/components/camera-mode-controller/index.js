/**
 * 相机模式控制器组件
 * 负责控制相机的不同拍摄模式：正常模式、连拍模式、定时模式
 */

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 当前模式：normal(正常), continuous(连拍), timer(定时)
    mode: {
      type: String,
      value: 'normal'
    },
    // 是否可用
    disabled: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 可用的模式列表
    modes: [
      { id: 'normal', name: '标准', icon: 'camera' },
      { id: 'continuous', name: '连拍', icon: 'continuous' },
      { id: 'timer', name: '定时', icon: 'timer' }
    ],
    
    // 连拍模式设置
    continuousSettings: {
      count: 3,          // 连拍数量
      interval: 1000,    // 间隔时间(毫秒)
      remainingCount: 0, // 剩余拍摄数量
      isRunning: false   // 是否正在连拍
    },
    
    // 定时器模式设置
    timerSettings: {
      delay: 3,          // 延迟时间(秒)
      remainingTime: 0,  // 剩余时间(秒)
      isRunning: false   // 是否正在倒计时
    },
    
    // 当前是否有计时器运行
    hasActiveTimer: false,
    
    // 当前模式的设置面板是否显示
    showSettings: false
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached: function() {
      // 组件初始化
    },
    detached: function() {
      // 清理定时器
      this._clearAllTimers();
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 切换相机模式
     */
    switchMode: function(e) {
      if (this.data.disabled || this.data.hasActiveTimer) {
        return;
      }
      
      const mode = e.currentTarget.dataset.mode;
      if (mode === this.data.mode) {
        // 如果点击当前模式，则显示设置面板
        this.setData({
          showSettings: !this.data.showSettings
        });
        return;
      }
      
      // 切换到新模式
      this.setData({
        mode: mode,
        showSettings: false
      });
      
      // 触发模式切换事件
      this.triggerEvent('modeChange', { mode: mode });
    },
    
    /**
     * 开始拍照（根据当前模式）
     */
    startCapture: function() {
      if (this.data.disabled || this.data.hasActiveTimer) {
        return;
      }
      
      const mode = this.data.mode;
      
      switch (mode) {
        case 'normal':
          // 标准模式，直接触发拍照事件
          this._triggerCaptureEvent();
          break;
        case 'continuous':
          // 连拍模式
          this._startContinuousCapture();
          break;
        case 'timer':
          // 定时模式
          this._startTimerCapture();
          break;
      }
    },
    
    /**
     * 停止当前捕获过程
     */
    stopCapture: function() {
      this._clearAllTimers();
      
      this.setData({
        'continuousSettings.isRunning': false,
        'continuousSettings.remainingCount': 0,
        'timerSettings.isRunning': false,
        'timerSettings.remainingTime': 0,
        hasActiveTimer: false
      });
      
      // 触发停止事件
      this.triggerEvent('captureStop');
    },
    
    /**
     * 更新连拍设置
     */
    updateContinuousSettings: function(e) {
      const field = e.currentTarget.dataset.field;
      const value = parseInt(e.detail.value) || 1;
      
      let updatedValue = value;
      if (field === 'count') {
        // 限制连拍数量范围：1-10
        updatedValue = Math.max(1, Math.min(10, value));
      } else if (field === 'interval') {
        // 限制间隔时间范围：0.5-5秒
        updatedValue = Math.max(500, Math.min(5000, value));
      }
      
      this.setData({
        [`continuousSettings.${field}`]: updatedValue
      });
    },
    
    /**
     * 更新定时器设置
     */
    updateTimerSettings: function(e) {
      const field = e.currentTarget.dataset.field;
      const value = parseInt(e.detail.value) || 1;
      
      let updatedValue = value;
      if (field === 'delay') {
        // 限制延迟时间范围：1-10秒
        updatedValue = Math.max(1, Math.min(10, value));
      }
      
      this.setData({
        [`timerSettings.${field}`]: updatedValue
      });
    },
    
    /**
     * 开始连拍
     * @private
     */
    _startContinuousCapture: function() {
      const count = this.data.continuousSettings.count;
      const interval = this.data.continuousSettings.interval;
      
      this.setData({
        'continuousSettings.remainingCount': count,
        'continuousSettings.isRunning': true,
        hasActiveTimer: true
      });
      
      // 触发拍照准备事件
      this.triggerEvent('capturePrepare', {
        mode: 'continuous',
        count: count,
        interval: interval
      });
      
      // 先拍一张
      this._triggerCaptureEvent();
      
      // 设置剩余照片的拍摄
      let photosLeft = count - 1;
      
      if (photosLeft <= 0) {
        this.setData({
          'continuousSettings.isRunning': false,
          hasActiveTimer: false
        });
        return;
      }
      
      // 使用setInterval实现连拍
      this.continuousTimer = setInterval(() => {
        // 更新剩余数量
        this.setData({
          'continuousSettings.remainingCount': photosLeft
        });
        
        // 拍照
        this._triggerCaptureEvent();
        
        photosLeft--;
        
        // 检查是否完成
        if (photosLeft <= 0) {
          clearInterval(this.continuousTimer);
          this.continuousTimer = null;
          
          this.setData({
            'continuousSettings.isRunning': false,
            hasActiveTimer: false
          });
          
          // 触发拍照完成事件
          this.triggerEvent('captureComplete', {
            mode: 'continuous',
            count: count
          });
        }
      }, interval);
    },
    
    /**
     * 开始定时拍照
     * @private
     */
    _startTimerCapture: function() {
      const delay = this.data.timerSettings.delay;
      
      this.setData({
        'timerSettings.remainingTime': delay,
        'timerSettings.isRunning': true,
        hasActiveTimer: true
      });
      
      // 触发拍照准备事件
      this.triggerEvent('capturePrepare', {
        mode: 'timer',
        delay: delay
      });
      
      // 倒计时
      this.timerInterval = setInterval(() => {
        let remaining = this.data.timerSettings.remainingTime - 1;
        
        this.setData({
          'timerSettings.remainingTime': remaining
        });
        
        // 触发倒计时事件
        this.triggerEvent('timerTick', {
          remainingTime: remaining
        });
        
        // 倒计时结束
        if (remaining <= 0) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
          
          // 拍照
          this._triggerCaptureEvent();
          
          this.setData({
            'timerSettings.isRunning': false,
            hasActiveTimer: false
          });
          
          // 触发拍照完成事件
          this.triggerEvent('captureComplete', {
            mode: 'timer'
          });
        }
      }, 1000);
    },
    
    /**
     * 触发拍照事件
     * @private
     */
    _triggerCaptureEvent: function() {
      this.triggerEvent('capture', {
        mode: this.data.mode,
        timestamp: Date.now()
      });
    },
    
    /**
     * 清理所有定时器
     * @private
     */
    _clearAllTimers: function() {
      if (this.continuousTimer) {
        clearInterval(this.continuousTimer);
        this.continuousTimer = null;
      }
      
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    }
  }
}); 