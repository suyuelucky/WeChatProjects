/**
 * 行为分析系统模块入口
 * 导出行为分析系统的所有组件
 * 
 * 创建时间: 2025-04-08 19:55:33
 * 创建者: Claude 3.7 Sonnet
 */

const BehaviorCollector = require('./BehaviorCollector');
const BehaviorAnalysisEngine = require('./BehaviorAnalysisEngine');
const IntelligentPreloader = require('./IntelligentPreloader');
const BehaviorAnalysisSystem = require('./BehaviorAnalysisSystem');

// 导出模块组件
module.exports = {
  BehaviorCollector,
  BehaviorAnalysisEngine,
  IntelligentPreloader,
  BehaviorAnalysisSystem,
  
  // 创建并导出默认系统实例
  createSystem: function(options) {
    return new BehaviorAnalysisSystem(options);
  },
  
  // 默认的系统实例
  system: null,
  
  // 初始化并返回系统单例
  initialize: function(options) {
    if (!this.system) {
      this.system = this.createSystem(options);
    }
    return this.system;
  }
}; 