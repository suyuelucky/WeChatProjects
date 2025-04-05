// 账本页面脚本
Page({
  /**
   * 页面的初始数据
   */
  data: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    summary: {
      expense: '0.00',
      income: '0.00',
      balance: '0.00'
    },
    records: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.loadData();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.loadData();
  },

  /**
   * 加载当月数据
   */
  loadData: function () {
    try {
      // 示例数据，实际应该从本地存储或API获取
      const mockRecords = [
        {
          id: '1',
          type: 'expense',
          category: '餐饮',
          icon: '🍔',
          amount: '32.50',
          note: '午餐',
          time: '今天 12:30'
        },
        {
          id: '2',
          type: 'income',
          category: '工资',
          icon: '💰',
          amount: '5000.00',
          note: '月薪',
          time: '昨天 10:00'
        },
        {
          id: '3',
          type: 'expense',
          category: '购物',
          icon: '🛒',
          amount: '128.00',
          note: '超市',
          time: '昨天 18:45'
        }
      ];
      
      // 计算总结数据
      let totalExpense = 0;
      let totalIncome = 0;
      
      mockRecords.forEach(record => {
        if (record.type === 'expense') {
          totalExpense += parseFloat(record.amount);
        } else {
          totalIncome += parseFloat(record.amount);
        }
      });
      
      const balance = totalIncome - totalExpense;
      
      this.setData({
        records: mockRecords,
        summary: {
          expense: totalExpense.toFixed(2),
          income: totalIncome.toFixed(2),
          balance: balance.toFixed(2)
        }
      });
    } catch (error) {
      console.error('加载账本数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  /**
   * 上个月
   */
  prevMonth: function () {
    let { year, month } = this.data;
    
    month--;
    if (month < 1) {
      month = 12;
      year--;
    }
    
    this.setData({
      year,
      month
    });
    
    this.loadData();
  },

  /**
   * 下个月
   */
  nextMonth: function () {
    let { year, month } = this.data;
    
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
    
    this.setData({
      year,
      month
    });
    
    this.loadData();
  },

  /**
   * 查看全部记录
   */
  viewAllRecords: function () {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  /**
   * 查看记录详情
   */
  viewRecordDetail: function (e) {
    const recordId = e.currentTarget.dataset.id;
    wx.showToast({
      title: '查看记录: ' + recordId,
      icon: 'none'
    });
  },

  /**
   * 添加记录
   */
  addRecord: function () {
    wx.showToast({
      title: '添加记录功能开发中',
      icon: 'none'
    });
  }
}); 