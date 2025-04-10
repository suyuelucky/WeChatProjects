/**
 * 行为分析引擎
 * 负责分析用户行为数据，预测用户意图，优化预加载策略
 * 
 * 创建时间: 2025-04-08 19:48:38
 * 创建者: Claude 3.7 Sonnet
 * 编辑时间: 2025-04-08 19:49:00
 */

class BehaviorAnalysisEngine {
  constructor(options = {}) {
    // 基本配置
    this.options = Object.assign({
      // 默认配置
      maxAnalysisEntries: 100,
      analysisPeriod: 7 * 24 * 60 * 60 * 1000, // 默认分析最近7天的数据
      predictionThreshold: 0.6,
      enableRealTimeAnalysis: true
    }, options);
    
    // 内部状态
    this.isInitialized = false;
    this.isRunning = false;
    this.analysisResults = null;
    
    // 统计数据
    this.statistics = {
      totalEventsAnalyzed: 0,
      predictionsGenerated: 0,
      predictionAccuracy: 0
    };
    
    // 分析模型
    this.models = {
      navigation: null,
      resource: null,
      timing: null,
      sequence: null
    };
  }
  
  // 初始化引擎
  initialize() {
    if (this.isInitialized) {
      console.warn('行为分析引擎已经初始化');
      return;
    }
    
    try {
      // 初始化分析模型
      this._initializeModels();
      this.isInitialized = true;
      console.log('行为分析引擎初始化成功');
    } catch (error) {
      console.error('行为分析引擎初始化失败', error);
      throw error;
    }
  }
  
  // 内部方法: 初始化分析模型
  _initializeModels() {
    // 初始化导航模型
    this.models.navigation = {
      patterns: {},
      confidence: 0
    };
    
    // 初始化资源使用模型
    this.models.resource = {
      usage: {},
      priorities: {}
    };
    
    // 初始化时间模型
    this.models.timing = {
      dayParts: {},
      weekParts: {}
    };
    
    // 初始化序列模型
    this.models.sequence = {
      patterns: {},
      probability: {}
    };
  }
  
  // 启动分析引擎
  start() {
    if (!this.isInitialized) {
      this.initialize();
    }
    
    if (this.isRunning) {
      console.warn('行为分析引擎已经在运行中');
      return;
    }
    
    this.isRunning = true;
    console.log('行为分析引擎已启动');
  }
  
  // 停止分析引擎
  stop() {
    if (!this.isRunning) {
      console.warn('行为分析引擎未在运行');
      return;
    }
    
    this.isRunning = false;
    console.log('行为分析引擎已停止');
  }
  
  // 分析用户行为数据
  analyze(events) {
    if (!this.isInitialized) {
      throw new Error('行为分析引擎未初始化');
    }
    
    if (!Array.isArray(events) || events.length === 0) {
      console.warn('没有事件数据可供分析');
      return null;
    }
    
    try {
      // 数据预处理
      const processedEvents = this._preprocessEvents(events);
      
      // 分析导航模式
      this._analyzeNavigationPatterns(processedEvents);
      
      // 分析资源使用模式
      this._analyzeResourceUsage(processedEvents);
      
      // 分析时间模式
      this._analyzeTimingPatterns(processedEvents);
      
      // 分析行为序列
      this._analyzeSequencePatterns(processedEvents);
      
      // 合并分析结果
      this.analysisResults = {
        timestamp: Date.now(),
        navigationPatterns: this.models.navigation.patterns,
        resourceUsage: this.models.resource.usage,
        timingPatterns: this.models.timing,
        sequencePatterns: this.models.sequence.patterns
      };
      
      // 更新统计数据
      this.statistics.totalEventsAnalyzed += events.length;
      
      console.log(`行为分析完成，处理了 ${events.length} 个事件`);
      return this.analysisResults;
    } catch (error) {
      console.error('行为分析过程出错', error);
      throw error;
    }
  }
  
  // 内部方法: 数据预处理
  _preprocessEvents(events) {
    // 过滤无效事件
    const validEvents = events.filter(event => {
      return event && event.type && event.timestamp;
    });
    
    // 按时间戳排序
    validEvents.sort((a, b) => a.timestamp - b.timestamp);
    
    // 去除过期的事件
    const cutoffTime = Date.now() - this.options.analysisPeriod;
    const recentEvents = validEvents.filter(event => event.timestamp >= cutoffTime);
    
    // 如果事件过多，只保留最近的一部分
    if (recentEvents.length > this.options.maxAnalysisEntries) {
      return recentEvents.slice(recentEvents.length - this.options.maxAnalysisEntries);
    }
    
    return recentEvents;
  }
  
  // 内部方法: 分析导航模式
  _analyzeNavigationPatterns(events) {
    const navigationEvents = events.filter(event => event.type === 'navigation');
    const patterns = {};
    
    // 分析页面转换模式
    for (let i = 0; i < navigationEvents.length - 1; i++) {
      const currentPage = navigationEvents[i].page;
      const nextPage = navigationEvents[i + 1].page;
      
      if (!currentPage || !nextPage || currentPage === nextPage) {
        continue;
      }
      
      if (!patterns[currentPage]) {
        patterns[currentPage] = {};
      }
      
      if (!patterns[currentPage][nextPage]) {
        patterns[currentPage][nextPage] = 0;
      }
      
      patterns[currentPage][nextPage]++;
    }
    
    // 计算转换概率
    Object.keys(patterns).forEach(fromPage => {
      let total = 0;
      Object.values(patterns[fromPage]).forEach(count => {
        total += count;
      });
      
      Object.keys(patterns[fromPage]).forEach(toPage => {
        patterns[fromPage][toPage] = {
          count: patterns[fromPage][toPage],
          probability: patterns[fromPage][toPage] / total
        };
      });
    });
    
    this.models.navigation.patterns = patterns;
    this.models.navigation.confidence = navigationEvents.length > 10 ? 'high' : 'low';
  }
  
  // 内部方法: 分析资源使用模式
  _analyzeResourceUsage(events) {
    const resourceEvents = events.filter(event => 
      event.type === 'api' || event.type === 'resource');
    
    const usage = {};
    
    resourceEvents.forEach(event => {
      const page = event.page;
      const url = event.type === 'api' ? 
        (event.params && event.params.url) : event.url;
      
      if (!page || !url) {
        return;
      }
      
      if (!usage[page]) {
        usage[page] = {};
      }
      
      if (!usage[page][url]) {
        usage[page][url] = {
          count: 0,
          type: event.type,
          lastUsed: 0
        };
      }
      
      usage[page][url].count++;
      usage[page][url].lastUsed = Math.max(usage[page][url].lastUsed, event.timestamp);
    });
    
    this.models.resource.usage = usage;
  }
  
  // 内部方法: 分析时间模式
  _analyzeTimingPatterns(events) {
    const dayParts = {
      morning: 0,   // 6-12
      afternoon: 0, // 12-18
      evening: 0,   // 18-24
      night: 0      // 0-6
    };
    
    const weekParts = {
      weekday: 0,   // 周一至周五
      weekend: 0    // 周六周日
    };
    
    events.forEach(event => {
      const date = new Date(event.timestamp);
      const hour = date.getHours();
      const day = date.getDay(); // 0是星期日，1-6是星期一至星期六
      
      // 分析一天中的时间段
      if (hour >= 6 && hour < 12) {
        dayParts.morning++;
      } else if (hour >= 12 && hour < 18) {
        dayParts.afternoon++;
      } else if (hour >= 18 && hour < 24) {
        dayParts.evening++;
      } else {
        dayParts.night++;
      }
      
      // 分析工作日与周末
      if (day === 0 || day === 6) {
        weekParts.weekend++;
      } else {
        weekParts.weekday++;
      }
    });
    
    // 计算比例
    const total = events.length;
    Object.keys(dayParts).forEach(part => {
      dayParts[part] = {
        count: dayParts[part],
        ratio: dayParts[part] / total
      };
    });
    
    Object.keys(weekParts).forEach(part => {
      weekParts[part] = {
        count: weekParts[part],
        ratio: weekParts[part] / total
      };
    });
    
    this.models.timing.dayParts = dayParts;
    this.models.timing.weekParts = weekParts;
  }
  
  // 内部方法: 分析行为序列模式
  _analyzeSequencePatterns(events) {
    const patterns = {};
    
    // 分析事件序列（每3个事件为一组）
    for (let i = 0; i < events.length - 2; i++) {
      const seq = [
        events[i].type,
        events[i + 1].type,
        events[i + 2].type
      ].join('-');
      
      if (!patterns[seq]) {
        patterns[seq] = 0;
      }
      
      patterns[seq]++;
    }
    
    // 找出最常见的序列
    const sortedPatterns = Object.entries(patterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});
    
    this.models.sequence.patterns = sortedPatterns;
  }
  
  // 预测用户行为
  predictUserBehavior(context) {
    if (!this.isInitialized || !this.analysisResults) {
      console.warn('无法预测行为：分析引擎未初始化或没有分析结果');
      return null;
    }
    
    const predictions = {
      nextPages: this._predictNextPages(context),
      nextActions: this._predictNextActions(context),
      resources: this._predictResourceNeeds(context)
    };
    
    // 更新统计数据
    this.statistics.predictionsGenerated++;
    
    return predictions;
  }
  
  // 内部方法: 预测用户可能访问的下一个页面
  _predictNextPages(context) {
    const { currentPage } = context;
    
    if (!currentPage || !this.models.navigation.patterns[currentPage]) {
      return [];
    }
    
    const pagePatterns = this.models.navigation.patterns[currentPage];
    
    // 按概率排序，并过滤低于阈值的预测
    return Object.entries(pagePatterns)
      .filter(([_, data]) => data.probability >= this.options.predictionThreshold)
      .sort((a, b) => b[1].probability - a[1].probability)
      .map(([page, data]) => ({
        page,
        probability: data.probability,
        confidence: data.probability > 0.8 ? 'high' : 
                   (data.probability > 0.6 ? 'medium' : 'low')
      }));
  }
  
  // 内部方法: 预测用户可能的下一步行为
  _predictNextActions(context) {
    // 基于序列模式预测
    const { recentEvents } = context;
    
    if (!recentEvents || recentEvents.length < 2) {
      return [];
    }
    
    // 获取最近的两个事件类型
    const recentSeq = recentEvents
      .slice(-2)
      .map(event => event.type)
      .join('-');
    
    // 寻找匹配的序列
    const predictions = [];
    Object.keys(this.models.sequence.patterns).forEach(seq => {
      if (seq.startsWith(recentSeq)) {
        const nextAction = seq.split('-')[2];
        predictions.push({
          action: nextAction,
          probability: this.models.sequence.patterns[seq] / 
                      Object.values(this.models.sequence.patterns)
                        .reduce((sum, count) => sum + count, 0),
          confidence: 'medium'
        });
      }
    });
    
    return predictions;
  }
  
  // 内部方法: 预测用户可能需要的资源
  _predictResourceNeeds(context) {
    const { currentPage, predictedPages } = context;
    
    if (!currentPage) {
      return [];
    }
    
    const resources = [];
    
    // 当前页面常用资源
    if (this.models.resource.usage[currentPage]) {
      Object.entries(this.models.resource.usage[currentPage])
        .forEach(([url, data]) => {
          resources.push({
            url,
            type: data.type,
            priority: data.count * 0.7, // 基础优先级
            source: 'current_page'
          });
        });
    }
    
    // 预测页面的资源
    if (predictedPages && predictedPages.length > 0) {
      predictedPages.forEach(prediction => {
        const page = prediction.page;
        const pageProbability = prediction.probability;
        
        if (this.models.resource.usage[page]) {
          Object.entries(this.models.resource.usage[page])
            .forEach(([url, data]) => {
              // 查找是否已存在
              const existing = resources.find(r => r.url === url);
              
              if (existing) {
                // 增加优先级
                existing.priority += data.count * pageProbability * 0.3;
                existing.source += ',predicted_page';
              } else {
                resources.push({
                  url,
                  type: data.type,
                  priority: data.count * pageProbability * 0.3,
                  source: 'predicted_page'
                });
              }
            });
        }
      });
    }
    
    // 按优先级排序
    return resources
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10); // 只返回优先级最高的10个资源
  }
  
  // 获取预加载建议
  getPreloadSuggestions(context) {
    if (!this.isInitialized || !this.analysisResults) {
      console.warn('无法提供预加载建议：分析引擎未初始化或没有分析结果');
      return null;
    }
    
    const { currentPage, networkType, devicePerformance } = context;
    
    // 根据网络类型和设备性能调整预加载策略
    const maxResources = networkType === 'wifi' ? 10 :
                        networkType === '4g' ? 6 :
                        networkType === '3g' ? 3 : 1;
                        
    const priorityThreshold = devicePerformance === 'high' ? 1 :
                             devicePerformance === 'medium' ? 2 : 3;
    
    // 预测用户行为
    const predictions = this.predictUserBehavior({
      currentPage,
      recentEvents: context.recentEvents || []
    });
    
    if (!predictions) {
      return {
        shouldPreload: false,
        reason: '无法获得行为预测'
      };
    }
    
    // 获取预测的下一个页面
    const predictedPages = predictions.nextPages;
    
    // 获取预测的资源需求
    const resources = this._predictResourceNeeds({
      currentPage,
      predictedPages
    });
    
    // 根据阈值和最大数量筛选资源
    const resourcesToPreload = resources
      .filter(r => r.priority >= priorityThreshold)
      .slice(0, maxResources);
    
    return {
      shouldPreload: resourcesToPreload.length > 0,
      predictedPages,
      resources: resourcesToPreload,
      networkType,
      devicePerformance,
      reason: resourcesToPreload.length > 0 ? 
              '基于用户行为分析的预加载建议' : 
              '没有符合条件的资源需要预加载'
    };
  }
  
  // 获取分析结果
  getAnalysisResults() {
    return this.analysisResults;
  }
  
  // 获取统计数据
  getStatistics() {
    return this.statistics;
  }
  
  // 重置引擎
  reset() {
    // 重置模型
    this._initializeModels();
    
    // 重置统计数据
    this.statistics = {
      totalEventsAnalyzed: 0,
      predictionsGenerated: 0,
      predictionAccuracy: 0
    };
    
    this.analysisResults = null;
    
    console.log('行为分析引擎已重置');
  }
}

module.exports = BehaviorAnalysisEngine; 