/**
 * 性能监控工具
 * 用于监控任务管理器的性能指标
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.thresholds = new Map([
      ['storage_write', 100], // 100ms
      ['storage_read', 50],   // 50ms
      ['task_create', 150],   // 150ms
      ['task_update', 100],   // 100ms
      ['task_delete', 100],   // 100ms
      ['storage_size', 5 * 1024 * 1024] // 5MB
    ]);
    this.listeners = new Set();
  }

  /**
   * 开始测量性能指标
   * @param {string} metric 指标名称
   * @returns {number} 开始时间戳
   */
  startMeasure(metric) {
    return Date.now();
  }

  /**
   * 结束测量性能指标
   * @param {string} metric 指标名称
   * @param {number} startTime 开始时间戳
   */
  endMeasure(metric, startTime) {
    const duration = Date.now() - startTime;
    this.updateMetric(metric, duration);
    return duration;
  }

  /**
   * 更新性能指标
   * @param {string} metric 指标名称
   * @param {number} value 指标值
   */
  updateMetric(metric, value) {
    this.metrics.set(metric, value);
    
    // 检查是否超过阈值
    const threshold = this.thresholds.get(metric);
    if (threshold && value > threshold) {
      this._notifyListeners({
        metric,
        value,
        threshold,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 添加监听器
   * @param {Function} callback 回调函数
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * 移除监听器
   * @param {Function} callback 回调函数
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * 通知所有监听器
   * @param {Object} event 事件对象
   * @private
   */
  _notifyListeners(event) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('性能监听器执行出错:', error);
      }
    });
  }

  /**
   * 重置所有指标
   */
  reset() {
    this.metrics.clear();
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }
} 