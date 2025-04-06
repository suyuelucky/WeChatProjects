// 相机快门遮罩动画组件
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 动画持续时间（毫秒）
    duration: {
      type: Number,
      value: 200
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    isFlashing: false
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 触发闪烁动画
     */
    flash: function() {
      // 如果正在闪烁中，不重复执行
      if (this.data.isFlashing) {
        return;
      }
      
      // 设置闪烁状态
      this.setData({
        isFlashing: true
      });
      
      // 创建动画
      var animation = wx.createAnimation({
        duration: this.data.duration / 2,
        timingFunction: 'ease',
      });
      
      // 先设置为不透明
      animation.opacity(0.7).step();
      
      this.setData({
        animationData: animation.export()
      });
      
      // 然后设置为透明
      var that = this;
      setTimeout(function() {
        animation.opacity(0).step();
        
        that.setData({
          animationData: animation.export()
        });
        
        // 动画结束后重置状态
        setTimeout(function() {
          that.setData({
            isFlashing: false
          });
        }, that.data.duration / 2);
      }, this.data.duration / 2);
    }
  }
}) 