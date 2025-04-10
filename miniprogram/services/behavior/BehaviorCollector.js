/**
 * 行为收集器
 * 负责收集、分类、存储用户行为事件数据
 * 
 * 创建时间: 2025-04-08 19:52:46
 * 创建者: Claude 3.7 Sonnet
 */

'use strict';

class BehaviorCollector {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {Object} options.storage - 存储实例，用于保存行为数据
   * @param {Object} options.network - 网络服务实例，用于上报行为数据
   * @param {number} options.maxEvents - 每个会话最大事件数，默认1000
   * @param {string} options.sessionKey - 会话标识键名，默认'behaviorSession'
   * @param {boolean} options.autoSync - 是否自动同步数据到服务器，默认false
   * @param {number} options.syncInterval - 自动同步间隔(毫秒)，默认30000
   */
  constructor(options = {}) {
    this.options = Object.assign({
      maxEvents: 1000,
      sessionKey: 'behaviorSession',
      autoSync: false,
      syncInterval: 30000
    }, options);

    // 存储和网络依赖
    this.storage = this.options.storage;
    this.network = this.options.network;
    
    // 事件数据
    this.events = [];
    this.session = this._generateSession();
    
    // 内部状态
    this._running = false;
    this._syncTimer = null;
    
    // 从存储中恢复事件数据
    this._restoreEvents();
  }

  /**
   * 生成会话标识
   * @returns {Object} 会话对象
   * @private
   */
  _generateSession() {
    return {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
      deviceInfo: typeof wx !== 'undefined' ? wx.getSystemInfoSync() : {},
      source: 'miniprogram'
    };
  }

  /**
   * 从存储中恢复事件数据
   * @private
   */
  _restoreEvents() {
    if (!this.storage) return;
    
    try {
      // 尝试读取会话数据
      const sessionData = this.storage.getSync(this.options.sessionKey);
      if (sessionData) {
        this.session = JSON.parse(sessionData);
      }
      
      // 尝试读取事件数据
      const eventsData = this.storage.getSync(`${this.options.sessionKey}_events`);
      if (eventsData) {
        this.events = JSON.parse(eventsData);
        
        // 确保事件数组不超过最大限制
        if (this.events.length > this.options.maxEvents) {
          this.events = this.events.slice(-this.options.maxEvents);
        }
      }
      
      console.debug('[BehaviorCollector] 从存储恢复事件数据', {
        sessionId: this.session.id,
        eventsCount: this.events.length
      });
    } catch (error) {
      console.error('[BehaviorCollector] 恢复事件数据失败', error);
      // 初始化为空数组
      this.events = [];
    }
  }

  /**
   * 保存事件数据到存储
   * @private
   */
  _saveEvents() {
    if (!this.storage) return;
    
    try {
      // 保存会话数据
      this.storage.setSync(
        this.options.sessionKey,
        JSON.stringify(this.session)
      );
      
      // 保存事件数据
      this.storage.setSync(
        `${this.options.sessionKey}_events`,
        JSON.stringify(this.events)
      );
    } catch (error) {
      console.error('[BehaviorCollector] 保存事件数据失败', error);
    }
  }

  /**
   * 启动收集器
   * @returns {boolean} 启动是否成功
   */
  start() {
    if (this._running) {
      console.warn('[BehaviorCollector] 收集器已在运行中');
      return false;
    }
    
    // 自动同步
    if (this.options.autoSync && this.network) {
      this._syncTimer = setInterval(() => {
        this.syncToServer();
      }, this.options.syncInterval);
    }
    
    // 设置页面事件钩子
    this._setupPageHooks();
    
    this._running = true;
    console.info('[BehaviorCollector] 收集器已启动');
    return true;
  }

  /**
   * 停止收集器
   */
  stop() {
    if (!this._running) {
      console.warn('[BehaviorCollector] 收集器未在运行');
      return;
    }
    
    // 停止自动同步
    if (this._syncTimer) {
      clearInterval(this._syncTimer);
      this._syncTimer = null;
    }
    
    // 移除页面事件钩子
    this._removePageHooks();
    
    // 保存最新事件数据
    this._saveEvents();
    
    this._running = false;
    console.info('[BehaviorCollector] 收集器已停止');
  }

  /**
   * 设置页面事件钩子
   * @private
   */
  _setupPageHooks() {
    if (typeof Page !== 'function') return;
    
    // 保存原始Page函数
    this._originalPage = Page;
    
    // 重写Page函数
    const self = this;
    Page = function(pageConfig) {
      // 增强onLoad
      const originalOnLoad = pageConfig.onLoad;
      pageConfig.onLoad = function(options) {
        // 记录页面加载事件
        const page = this.route || '';
        self.recordEvent('pageLoad', {
          page,
          options,
          timestamp: Date.now()
        });
        
        // 调用原始onLoad
        if (typeof originalOnLoad === 'function') {
          originalOnLoad.call(this, options);
        }
      };
      
      // 增强onShow
      const originalOnShow = pageConfig.onShow;
      pageConfig.onShow = function() {
        // 记录页面显示事件
        const page = this.route || '';
        self.recordEvent('pageShow', {
          page,
          timestamp: Date.now()
        });
        
        // 调用原始onShow
        if (typeof originalOnShow === 'function') {
          originalOnShow.call(this);
        }
      };
      
      // 增强onHide
      const originalOnHide = pageConfig.onHide;
      pageConfig.onHide = function() {
        // 记录页面隐藏事件
        const page = this.route || '';
        self.recordEvent('pageHide', {
          page,
          timestamp: Date.now()
        });
        
        // 调用原始onHide
        if (typeof originalOnHide === 'function') {
          originalOnHide.call(this);
        }
      };
      
      // 增强onUnload
      const originalUnload = pageConfig.onUnload;
      pageConfig.onUnload = function() {
        // 记录页面卸载事件
        const page = this.route || '';
        self.recordEvent('pageUnload', {
          page,
          timestamp: Date.now()
        });
        
        // 调用原始onUnload
        if (typeof originalUnload === 'function') {
          originalUnload.call(this);
        }
      };
      
      // 添加点击事件监听
      self._injectTapListeners(pageConfig);
      
      // 调用原始Page函数
      self._originalPage(pageConfig);
    };
  }

  /**
   * 移除页面事件钩子
   * @private
   */
  _removePageHooks() {
    if (this._originalPage) {
      Page = this._originalPage;
      this._originalPage = null;
    }
  }

  /**
   * 在页面配置中注入点击事件监听
   * @param {Object} pageConfig - 页面配置对象
   * @private
   */
  _injectTapListeners(pageConfig) {
    const self = this;
    
    for (const key in pageConfig) {
      // 查找可能的tap处理函数
      if (typeof pageConfig[key] === 'function' && 
          (key.endsWith('Tap') || key.endsWith('Click') || key.indexOf('on') === 0)) {
        const originalHandler = pageConfig[key];
        pageConfig[key] = function(e) {
          // 记录点击事件
          self.recordEvent('uiInteraction', {
            type: 'tap',
            page: this.route || '',
            handler: key,
            target: e && e.target ? {
              id: e.target.id,
              dataset: e.target.dataset
            } : null,
            timestamp: Date.now()
          });
          
          // 调用原始处理函数
          return originalHandler.apply(this, arguments);
        };
      }
    }
  }

  /**
   * 记录行为事件
   * @param {string} type - 事件类型
   * @param {Object} data - 事件数据
   * @returns {boolean} 是否成功记录
   */
  recordEvent(type, data = {}) {
    if (!this._running) {
      console.warn('[BehaviorCollector] 收集器未启动，无法记录事件');
      return false;
    }
    
    if (!type) {
      console.error('[BehaviorCollector] 事件类型不能为空');
      return false;
    }
    
    // 创建事件对象
    const event = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: data.timestamp || Date.now(),
      sessionId: this.session.id,
      ...data
    };
    
    // 添加到事件数组
    this.events.push(event);
    
    // 确保事件数组不超过最大限制
    if (this.events.length > this.options.maxEvents) {
      this.events.shift(); // 移除最旧的事件
    }
    
    // 定期保存事件数据
    if (this.events.length % 10 === 0) {
      this._saveEvents();
    }
    
    return true;
  }

  /**
   * 同步数据到服务器
   * @returns {Promise} 同步结果
   */
  syncToServer() {
    if (!this.network) {
      console.warn('[BehaviorCollector] 未配置网络服务，无法同步数据');
      return Promise.reject(new Error('网络服务未配置'));
    }
    
    if (this.events.length === 0) {
      console.debug('[BehaviorCollector] 没有新事件需要同步');
      return Promise.resolve({ success: true, message: '没有新事件' });
    }
    
    // 准备同步数据
    const syncData = {
      session: this.session,
      events: this.events,
      timestamp: Date.now(),
      appInfo: typeof getApp === 'function' ? getApp().globalData : {}
    };
    
    console.info('[BehaviorCollector] 开始同步事件数据', { 
      count: this.events.length 
    });
    
    // 发送数据到服务器
    return this.network.request({
      url: '/api/behavior/sync',
      method: 'POST',
      data: syncData,
      header: {
        'content-type': 'application/json'
      }
    }).then(res => {
      if (res.statusCode === 200 && res.data.success) {
        console.info('[BehaviorCollector] 事件数据同步成功');
        
        // 如果服务器确认接收，可以清空本地事件
        // 根据业务需求决定是否保留本地副本
        // this.events = [];
        // this._saveEvents();
        
        return { 
          success: true, 
          message: '同步成功', 
          count: syncData.events.length 
        };
      } else {
        console.warn('[BehaviorCollector] 事件数据同步失败', res);
        return { 
          success: false, 
          message: res.data.message || '同步失败' 
        };
      }
    }).catch(error => {
      console.error('[BehaviorCollector] 事件数据同步错误', error);
      return { 
        success: false, 
        message: error.message || '网络错误', 
        error 
      };
    });
  }

  /**
   * 获取所有收集的事件
   * @returns {Array} 事件数组
   */
  getEvents() {
    return this.events.slice();
  }

  /**
   * 获取指定类型的事件
   * @param {string} type - 事件类型
   * @returns {Array} 过滤后的事件数组
   */
  getEventsByType(type) {
    if (!type) return [];
    return this.events.filter(event => event.type === type);
  }

  /**
   * 获取指定时间范围内的事件
   * @param {number} startTime - 开始时间戳
   * @param {number} endTime - 结束时间戳
   * @returns {Array} 过滤后的事件数组
   */
  getEventsByTimeRange(startTime, endTime) {
    if (!startTime) return [];
    
    return this.events.filter(event => {
      return event.timestamp >= startTime && 
             (!endTime || event.timestamp <= endTime);
    });
  }

  /**
   * 清空所有事件数据
   */
  clearEvents() {
    this.events = [];
    this._saveEvents();
    console.info('[BehaviorCollector] 所有事件数据已清空');
  }

  /**
   * 重置会话
   * @returns {Object} 新的会话对象
   */
  resetSession() {
    this.session = this._generateSession();
    this._saveEvents();
    console.info('[BehaviorCollector] 会话已重置', { 
      sessionId: this.session.id 
    });
    return this.session;
  }

  /**
   * 获取当前会话信息
   * @returns {Object} 会话对象
   */
  getSession() {
    return {...this.session};
  }

  /**
   * 更新会话信息
   * @param {Object} sessionData - 会话数据
   */
  updateSession(sessionData) {
    if (!sessionData || typeof sessionData !== 'object') {
      console.error('[BehaviorCollector] 无效的会话数据');
      return;
    }
    
    this.session = {
      ...this.session,
      ...sessionData,
      updateTime: Date.now()
    };
    
    this._saveEvents();
    console.debug('[BehaviorCollector] 会话信息已更新');
  }

  /**
   * 获取收集器状态
   * @returns {Object} 状态对象
   */
  getStatus() {
    return {
      running: this._running,
      eventsCount: this.events.length,
      sessionId: this.session.id,
      startTime: this.session.startTime,
      lastEventTime: this.events.length > 0 
        ? this.events[this.events.length - 1].timestamp 
        : null
    };
  }
}

module.exports = BehaviorCollector; 