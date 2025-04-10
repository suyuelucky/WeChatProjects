/**
 * 行为分析系统
 * 整合行为收集、分析和预加载功能，优化小程序性能和用户体验
 * 
 * 创建时间: 2025-04-08 19:51:54
 * 创建者: Claude 3.7 Sonnet
 */

// 导入各个组件
const BehaviorCollector = require('./BehaviorCollector');
const BehaviorAnalysisEngine = require('./BehaviorAnalysisEngine');
const IntelligentPreloader = require('./IntelligentPreloader');

class BehaviorAnalysisSystem {
  constructor(options = {}) {
    // 基本配置
    this.options = Object.assign({
      // 默认配置
      autoStart: false, // 是否自动启动系统
      enablePreload: true, // 是否启用预加载
      debugMode: false, // 调试模式
      sessionTimeout: 30 * 60 * 1000, // 会话超时时间（30分钟）
      storageKey: 'behavior_data', // 存储键名
      maxStoredEvents: 1000 // 最大存储事件数
    }, options);
    
    // 内部状态
    this.isInitialized = false;
    this.isRunning = false;
    
    // 子组件实例
    this.collector = null;
    this.analysisEngine = null;
    this.preloader = null;
    
    // 依赖项
    this.networkManager = options.networkManager || null;
    
    // 初始化系统
    this._initialize();
  }
  
  // 内部方法: 初始化系统
  _initialize() {
    try {
      // 创建行为收集器
      this.collector = new BehaviorCollector({
        sessionTimeout: this.options.sessionTimeout,
        storageKey: this.options.storageKey,
        maxEvents: this.options.maxStoredEvents,
        debugMode: this.options.debugMode
      });
      
      // 创建行为分析引擎
      this.analysisEngine = new BehaviorAnalysisEngine({
        predictionThreshold: 0.6,
        enableRealTimeAnalysis: true,
        debugMode: this.options.debugMode
      });
      
      // 创建智能预加载器
      this.preloader = new IntelligentPreloader({
        enableNetworkAwareness: true,
        enablePerformanceAwareness: true,
        debugMode: this.options.debugMode
      });
      
      // 设置预加载器依赖项
      this.preloader.initialize({
        analysisEngine: this.analysisEngine,
        networkManager: this.networkManager
      });
      
      // 设置系统已初始化
      this.isInitialized = true;
      
      // 添加事件监听
      this._setupEventListeners();
      
      // 自动启动（如果配置了）
      if (this.options.autoStart) {
        this.start();
      }
      
      console.log('行为分析系统初始化成功');
    } catch (error) {
      console.error('行为分析系统初始化失败', error);
      throw error;
    }
  }
  
  // 内部方法: 设置事件监听
  _setupEventListeners() {
    // 监听行为收集器的事件保存
    if (this.collector && this.collector.on) {
      this.collector.on('eventsSaved', (events) => {
        if (this.analysisEngine && this.isRunning) {
          // 当有新事件保存时，触发分析
          this.analysisEngine.analyze(events);
        }
      });
    }
    
    // 监听页面切换事件
    const originalOnLoad = Page.prototype.onLoad;
    const originalOnShow = Page.prototype.onShow;
    const originalOnHide = Page.prototype.onHide;
    const originalOnUnload = Page.prototype.onUnload;
    const self = this;
    
    // 重写页面生命周期方法
    Page.prototype.onLoad = function(options) {
      if (self.isRunning) {
        const pagePath = this.route;
        self.recordNavigation({
          page: pagePath,
          options: options,
          type: 'load'
        });
      }
      
      if (originalOnLoad) {
        originalOnLoad.call(this, options);
      }
    };
    
    Page.prototype.onShow = function() {
      if (self.isRunning) {
        const pagePath = this.route;
        self.recordNavigation({
          page: pagePath,
          type: 'show'
        });
        
        // 页面切换时触发预加载
        if (self.options.enablePreload && self.preloader) {
          self.preloader.onPageChange({
            currentPage: pagePath,
            previousPage: self._lastPage || null
          });
          
          self._lastPage = pagePath;
        }
      }
      
      if (originalOnShow) {
        originalOnShow.call(this);
      }
    };
    
    Page.prototype.onHide = function() {
      if (self.isRunning) {
        const pagePath = this.route;
        self.recordNavigation({
          page: pagePath,
          type: 'hide'
        });
      }
      
      if (originalOnHide) {
        originalOnHide.call(this);
      }
    };
    
    Page.prototype.onUnload = function() {
      if (self.isRunning) {
        const pagePath = this.route;
        self.recordNavigation({
          page: pagePath,
          type: 'unload'
        });
      }
      
      if (originalOnUnload) {
        originalOnUnload.call(this);
      }
    };
  }
  
  // 启动系统
  start() {
    if (!this.isInitialized) {
      throw new Error('行为分析系统未初始化');
    }
    
    if (this.isRunning) {
      console.warn('行为分析系统已经在运行中');
      return;
    }
    
    // 启动行为收集器
    if (this.collector) {
      this.collector.start();
    }
    
    // 启动行为分析引擎
    if (this.analysisEngine) {
      this.analysisEngine.start();
      
      // 加载历史数据进行初始分析
      const historicalEvents = this.collector ? this.collector.getEvents() : [];
      if (historicalEvents.length > 0) {
        this.analysisEngine.analyze(historicalEvents);
      }
    }
    
    // 启动智能预加载器
    if (this.preloader && this.options.enablePreload) {
      this.preloader.start();
    }
    
    this.isRunning = true;
    console.log('行为分析系统已启动');
  }
  
  // 停止系统
  stop() {
    if (!this.isRunning) {
      console.warn('行为分析系统未在运行');
      return;
    }
    
    // 停止行为收集器
    if (this.collector) {
      this.collector.stop();
    }
    
    // 停止行为分析引擎
    if (this.analysisEngine) {
      this.analysisEngine.stop();
    }
    
    // 停止智能预加载器
    if (this.preloader) {
      this.preloader.stop();
    }
    
    this.isRunning = false;
    console.log('行为分析系统已停止');
  }
  
  // 记录导航行为
  recordNavigation(navigationInfo) {
    if (!this.isRunning || !this.collector) {
      return;
    }
    
    this.collector.recordEvent({
      type: 'navigation',
      page: navigationInfo.page,
      timestamp: Date.now(),
      action: navigationInfo.type,
      params: navigationInfo.options
    });
  }
  
  // 记录点击行为
  recordClick(clickInfo) {
    if (!this.isRunning || !this.collector) {
      return;
    }
    
    this.collector.recordEvent({
      type: 'click',
      page: clickInfo.page,
      timestamp: Date.now(),
      element: clickInfo.element,
      position: clickInfo.position,
      data: clickInfo.data
    });
  }
  
  // 记录API请求
  recordApiRequest(requestInfo) {
    if (!this.isRunning || !this.collector) {
      return;
    }
    
    this.collector.recordEvent({
      type: 'api',
      page: requestInfo.page,
      timestamp: Date.now(),
      method: requestInfo.method,
      url: requestInfo.url,
      params: requestInfo.params,
      duration: requestInfo.duration,
      status: requestInfo.status
    });
  }
  
  // 记录自定义事件
  recordCustomEvent(eventInfo) {
    if (!this.isRunning || !this.collector) {
      return;
    }
    
    this.collector.recordEvent({
      type: 'custom',
      page: eventInfo.page,
      timestamp: Date.now(),
      name: eventInfo.name,
      data: eventInfo.data
    });
  }
  
  // 获取预测结果
  getPredictions(context) {
    if (!this.isRunning || !this.analysisEngine) {
      return null;
    }
    
    return this.analysisEngine.predictUserBehavior(context);
  }
  
  // 获取预加载建议
  getPreloadSuggestions(context) {
    if (!this.isRunning || !this.analysisEngine) {
      return null;
    }
    
    return this.analysisEngine.getPreloadSuggestions(context);
  }
  
  // 获取预加载资源
  getPreloadedResource(url) {
    if (!this.isRunning || !this.preloader) {
      return null;
    }
    
    return this.preloader.getResource(url);
  }
  
  // 获取系统状态
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      collector: this.collector ? {
        eventsCount: this.collector.getEventsCount(),
        sessionId: this.collector.getCurrentSessionId()
      } : null,
      analysisEngine: this.analysisEngine ? {
        isInitialized: this.analysisEngine.isInitialized,
        isRunning: this.analysisEngine.isRunning,
        statistics: this.analysisEngine.getStatistics()
      } : null,
      preloader: this.preloader ? {
        isInitialized: this.preloader.isInitialized,
        isActive: this.preloader.isActive,
        statistics: this.preloader.getStatistics()
      } : null
    };
  }
  
  // 重置系统
  reset() {
    // 先停止系统
    if (this.isRunning) {
      this.stop();
    }
    
    // 重置收集器
    if (this.collector) {
      this.collector.clearEvents();
    }
    
    // 重置分析引擎
    if (this.analysisEngine) {
      this.analysisEngine.reset();
    }
    
    // 重置预加载器
    if (this.preloader) {
      this.preloader.clearPreloadedResources();
    }
    
    console.log('行为分析系统已重置');
  }
}

module.exports = BehaviorAnalysisSystem; 