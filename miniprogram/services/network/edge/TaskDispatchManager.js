/**
 * TaskDispatchManager.js
 * 
 * 边缘计算任务分发管理器
 * 负责判断任务应在本地(边缘)还是云端执行，并进行智能分发
 * 
 * 创建时间: 2025-04-08 20:13:46 | 创建者: Claude 3.7 Sonnet
 * 更新时间: 2025-04-08 20:42:08 | 更新者: Claude 3.7 Sonnet
 */

// 默认配置
const DEFAULT_CONFIG = {
  thresholds: {
    networkSpeed: 1000,  // kbps, 低于此值优先本地处理
    batteryLevel: 20,    // 电池电量百分比，低于此值减少本地处理
    cpuThreshold: 80,    // CPU使用率百分比，高于此值减少本地处理
    memoryThreshold: 70, // 内存使用率百分比，高于此值减少本地处理
    taskComplexity: {    // 任务复杂度分类阈值
      low: 10,           // 复杂度评分低于此值为低复杂度
      medium: 50,        // 复杂度评分低于此值为中复杂度，高于为高复杂度
    },
    dataSize: {          // 数据量分类阈值 (KB)
      small: 100,        // 数据量低于此值为小数据量
      medium: 1000       // 数据量低于此值为中数据量，高于为大数据量
    }
  },
  maxRetries: 3,        // 本地执行失败最大重试次数
  taskTypes: {          // 支持的任务类型及其默认处理位置
    computation: 'local',
    data_processing: 'local',
    image_processing: 'cloud',
    ai_inference: 'cloud'
  },
  priorities: {         // 任务优先级及其评分
    low: 10,
    medium: 50,
    high: 90
  }
};

/**
 * 边缘计算任务分发管理器
 */
class TaskDispatchManager {
  /**
   * 创建任务分发管理器实例
   * @param {Object} options - 配置选项
   */
  constructor(options) {
    // 合并配置
    this.config = this._mergeConfig(DEFAULT_CONFIG, options || {});
    
    // 初始化logger
    this.logger = options && options.logger ? options.logger : {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
      time: console.time,
      timeEnd: console.timeEnd
    };
    
    // 初始化设备状态
    this.deviceStatus = {
      networkType: 'unknown',
      isConnected: true,
      networkSpeed: 0,          // 预估网络速度 (kbps)
      batteryLevel: 100,        // 电池电量 (%)
      benchmarkLevel: 50,       // 设备性能评分 (0-100)
      currentCpuUsage: 0,       // 当前CPU使用率 (%)
      currentMemoryUsage: 0,    // 当前内存使用率 (%)
      deviceInfo: {}            // 设备信息
    };
    
    // 任务统计
    this.stats = {
      totalTasks: 0,
      localTasks: 0,
      cloudTasks: 0,
      successTasks: 0,
      failedTasks: 0,
      retryCount: 0
    };
    
    // 初始化设备状态
    this._initDeviceStatus();
    
    // 监听网络状态变化
    this._setupNetworkListener();
    
    this.logger.info('[TaskDispatchManager] 初始化完成');
  }
  
  /**
   * 合并配置
   * @private
   * @param {Object} defaultConfig - 默认配置
   * @param {Object} userConfig - 用户提供的配置
   * @return {Object} 合并后的配置
   */
  _mergeConfig(defaultConfig, userConfig) {
    const result = JSON.parse(JSON.stringify(defaultConfig));
    
    if (!userConfig) {
      return result;
    }
    
    // 合并一级属性
    for (var key in userConfig) {
      if (userConfig.hasOwnProperty(key)) {
        if (typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key]) && result[key]) {
          // 合并嵌套对象
          for (var nestedKey in userConfig[key]) {
            if (userConfig[key].hasOwnProperty(nestedKey)) {
              if (!result[key]) {
                result[key] = {};
              }
              result[key][nestedKey] = userConfig[key][nestedKey];
            }
          }
        } else {
          // 简单覆盖
          result[key] = userConfig[key];
        }
      }
    }
    
    return result;
  }
  
  /**
   * 初始化设备状态
   * @private
   */
  _initDeviceStatus() {
    this.logger.debug('[TaskDispatchManager] 初始化设备状态');
    
    try {
      // 获取网络状态
      wx.getNetworkType({
        success: (res) => {
          this.deviceStatus.networkType = res.networkType;
          this.deviceStatus.isConnected = res.networkType !== 'none';
          this._updateNetworkSpeed(res.networkType);
          this.logger.debug('[TaskDispatchManager] 网络状态:', res.networkType);
        },
        fail: (err) => {
          this.logger.warn('[TaskDispatchManager] 获取网络状态失败:', err);
        }
      });
      
      // 获取系统信息
      wx.getSystemInfo({
        success: (res) => {
          this.deviceStatus.deviceInfo = res;
          this.deviceStatus.batteryLevel = res.battery || 100;
          this.deviceStatus.benchmarkLevel = res.benchmarkLevel || 50;
          this.logger.debug('[TaskDispatchManager] 设备信息:', 
            res.brand, res.model, res.platform, res.benchmarkLevel);
        },
        fail: (err) => {
          this.logger.warn('[TaskDispatchManager] 获取系统信息失败:', err);
        }
      });
      
      // 初始化性能测量
      this._measurePerformance();
    } catch (err) {
      this.logger.error('[TaskDispatchManager] 初始化设备状态失败:', err);
    }
  }
  
  /**
   * 设置网络状态变化监听
   * @private
   */
  _setupNetworkListener() {
    try {
      wx.onNetworkStatusChange((res) => {
        this.deviceStatus.networkType = res.networkType;
        this.deviceStatus.isConnected = res.isConnected;
        this._updateNetworkSpeed(res.networkType);
        
        this.logger.info('[TaskDispatchManager] 网络状态变化:',
          res.networkType, '连接状态:', res.isConnected);
      });
    } catch (err) {
      this.logger.error('[TaskDispatchManager] 设置网络监听失败:', err);
    }
  }
  
  /**
   * 更新网络速度估计
   * @private
   * @param {string} networkType - 网络类型
   */
  _updateNetworkSpeed(networkType) {
    // 根据网络类型估算网络速度
    switch (networkType) {
      case 'wifi':
        this.deviceStatus.networkSpeed = 10000; // 10Mbps
        break;
      case '4g':
        this.deviceStatus.networkSpeed = 5000;  // 5Mbps
        break;
      case '3g':
        this.deviceStatus.networkSpeed = 1000;  // 1Mbps
        break;
      case '2g':
        this.deviceStatus.networkSpeed = 100;   // 100kbps
        break;
      case 'none':
      case 'unknown':
        this.deviceStatus.networkSpeed = 0;
        break;
      default:
        this.deviceStatus.networkSpeed = 2000;  // 默认2Mbps
    }
  }
  
  /**
   * 测量设备性能
   * @private
   */
  _measurePerformance() {
    // 在真实环境中，可以根据实际情况进行性能测量
    // 这里简化处理，使用随机值模拟
    var randomCpu = Math.floor(Math.random() * 60); // 0-60%
    var randomMemory = Math.floor(Math.random() * 50); // 0-50%
    
    this.deviceStatus.currentCpuUsage = randomCpu;
    this.deviceStatus.currentMemoryUsage = randomMemory;
    
    // 每30秒更新一次性能数据
    setTimeout(this._measurePerformance.bind(this), 30000);
  }
  
  /**
   * 判断任务是否应该在本地处理
   * @param {Object} task - 任务对象
   * @return {boolean} 是否应该在本地处理
   */
  shouldProcessLocally(task) {
    this.logger.time('dispatch-decision');
    
    // 快速决策路径：特定情况立即决定
    
    // 1. 如果断网，必须本地处理
    if (!this.deviceStatus.isConnected) {
      this.logger.debug('[TaskDispatchManager] 网络断开，强制本地处理');
      this.logger.timeEnd('dispatch-decision');
      return true;
    }
    
    // 2. 简单计算任务本地处理
    if (task.type === 'computation' && task.complexity === 'low') {
      this.logger.debug('[TaskDispatchManager] 简单计算任务，优先本地处理');
      this.logger.timeEnd('dispatch-decision');
      return true;
    }
    
    // 3. 小数据量任务本地处理
    if (task.dataSize !== undefined && task.dataSize < this.config.thresholds.dataSize.small) {
      this.logger.debug('[TaskDispatchManager] 小数据量任务，优先本地处理');
      this.logger.timeEnd('dispatch-decision');
      return true;
    }
    
    // 4. 高复杂度或大数据量任务云端处理
    if (
      (task.complexity === 'high') || 
      (task.dataSize !== undefined && task.dataSize > this.config.thresholds.dataSize.medium)
    ) {
      this.logger.debug('[TaskDispatchManager] 高复杂度或大数据量任务，优先云端处理');
      this.logger.timeEnd('dispatch-decision');
      return false;
    }
    
    // 5. 弱网环境优先本地处理
    if (this.deviceStatus.networkType === '2g' || this.deviceStatus.networkSpeed < 500) {
      this.logger.debug('[TaskDispatchManager] 弱网环境，优先本地处理');
      this.logger.timeEnd('dispatch-decision');
      return true;
    }
    
    // 6. 高优先级任务在设备资源充足时本地处理
    if (
      task.priority === 'high' && 
      this.deviceStatus.batteryLevel > 30 && 
      this.deviceStatus.currentCpuUsage < 70
    ) {
      this.logger.debug('[TaskDispatchManager] 高优先级任务且设备资源充足，优先本地处理');
      this.logger.timeEnd('dispatch-decision');
      return true;
    }
    
    // 如果没有触发快速决策路径，使用综合评分决策
    
    // 计算任务评分，分数越高越适合本地处理
    var score = this._calculateTaskScore(task);
    
    // 获取设备状态评分，分数越高设备越适合处理任务
    var deviceScore = this._calculateDeviceScore();
    
    // 获取网络评分，分数越高越适合云端处理
    var networkScore = this._calculateNetworkScore();
    
    // 根据各项评分计算最终决策
    var localThreshold = 50 + (100 - networkScore) * 0.3; // 降低为50，以便更容易分配到本地
    var finalScore = (score * deviceScore / 100);
    var shouldProcessLocal = finalScore > localThreshold;
    
    this.logger.debug(
      '[TaskDispatchManager] 任务评分:', score,
      '设备评分:', deviceScore,
      '网络评分:', networkScore,
      '本地阈值:', localThreshold,
      '最终得分:', finalScore,
      '决策:', shouldProcessLocal ? '本地' : '云端'
    );
    
    this.logger.timeEnd('dispatch-decision');
    return shouldProcessLocal;
  }
  
  /**
   * 计算任务评分
   * @private
   * @param {Object} task - 任务对象
   * @return {number} 任务评分(0-100)，分数越高越适合本地处理
   */
  _calculateTaskScore(task) {
    var score = 50; // 默认中等
    
    // 根据任务类型调整
    if (task.type && this.config.taskTypes[task.type]) {
      score += this.config.taskTypes[task.type] === 'local' ? 20 : -20;
    }
    
    // 根据任务复杂度调整
    if (task.complexity) {
      switch (task.complexity) {
        case 'low':
          score += 30;
          break;
        case 'medium':
          score += 0;
          break;
        case 'high':
          score -= 30;
          break;
      }
    }
    
    // 根据数据大小调整
    if (task.dataSize !== undefined) {
      if (task.dataSize < this.config.thresholds.dataSize.small) {
        score += 20;
      } else if (task.dataSize > this.config.thresholds.dataSize.medium) {
        score -= 30;
      }
    }
    
    // 根据优先级调整
    if (task.priority) {
      switch (task.priority) {
        case 'high':
          score += 15; // 高优先级任务倾向于本地处理以减少延迟
          break;
        case 'low':
          score -= 10; // 低优先级任务可以放到云端
          break;
      }
    }
    
    // 确保分数在0-100范围内
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * 计算设备状态评分
   * @private
   * @return {number} 设备评分(0-100)，分数越高越适合处理任务
   */
  _calculateDeviceScore() {
    var score = 50; // 默认中等
    
    // 根据电池状态调整
    if (this.deviceStatus.batteryLevel < this.config.thresholds.batteryLevel) {
      score -= 30; // 低电量显著降低本地处理倾向
    } else if (this.deviceStatus.batteryLevel > 80) {
      score += 10; // 电量充足增加本地处理倾向
    }
    
    // 根据设备性能调整
    if (this.deviceStatus.benchmarkLevel < 20) {
      score -= 20; // 低性能设备减少本地处理
    } else if (this.deviceStatus.benchmarkLevel > 70) {
      score += 20; // 高性能设备增加本地处理
    }
    
    // 根据当前CPU使用率调整
    if (this.deviceStatus.currentCpuUsage > this.config.thresholds.cpuThreshold) {
      score -= 30; // CPU负载高时减少本地处理
    }
    
    // 根据当前内存使用率调整
    if (this.deviceStatus.currentMemoryUsage > this.config.thresholds.memoryThreshold) {
      score -= 20; // 内存使用率高时减少本地处理
    }
    
    // 确保分数在0-100范围内
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * 计算网络状态评分
   * @private
   * @return {number} 网络评分(0-100)，分数越高越适合云端处理
   */
  _calculateNetworkScore() {
    var score = 50; // 默认中等
    
    // 根据网络连接状态调整
    if (!this.deviceStatus.isConnected) {
      return 0; // 断网时云端处理得分为0
    }
    
    // 根据网络类型调整
    switch (this.deviceStatus.networkType) {
      case 'wifi':
        score += 40;
        break;
      case '4g':
        score += 30;
        break;
      case '3g':
        score += 10;
        break;
      case '2g':
        score -= 30;
        break;
      case 'unknown':
        score += 0; // 保持中等
        break;
    }
    
    // 根据网络速度调整
    if (this.deviceStatus.networkSpeed < this.config.thresholds.networkSpeed) {
      score -= Math.min(40, Math.floor(40 * (1 - this.deviceStatus.networkSpeed / this.config.thresholds.networkSpeed)));
    } else {
      score += Math.min(30, Math.floor(30 * (this.deviceStatus.networkSpeed / this.config.thresholds.networkSpeed - 1)));
    }
    
    // 确保分数在0-100范围内
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * 执行任务
   * @param {Object} task - 任务对象
   * @param {Function} localProcessor - 本地处理函数
   * @return {Promise} 执行结果Promise
   */
  executeTask(task) {
    this.stats.totalTasks++;
    
    return new Promise((resolve, reject) => {
      // 判断应该在本地还是云端处理
      if (this.shouldProcessLocally(task)) {
        this.stats.localTasks++;
        this.logger.info('[TaskDispatchManager] 在本地执行任务:', task.type);
        
        // 尝试本地执行，失败后重试
        try {
          this.executeWithRetry(task, task.localProcessor, this.config.maxRetries)
            .then(resolve)
            .catch((error) => {
              this.logger.warn('[TaskDispatchManager] 本地执行失败，转发到云端:', error);
              this.sendTaskToCloud(task).then(resolve).catch(reject);
            });
        } catch (error) {
          this.logger.warn('[TaskDispatchManager] 本地执行异常，转发到云端:', error);
          this.sendTaskToCloud(task).then(resolve).catch(reject);
        }
      } else {
        this.stats.cloudTasks++;
        this.logger.info('[TaskDispatchManager] 在云端执行任务:', task.type);
        this.sendTaskToCloud(task).then(resolve).catch(reject);
      }
    });
  }
  
  /**
   * 带重试的任务执行
   * @param {Object} task - 任务对象
   * @param {Function} processor - 处理函数
   * @param {number} maxRetries - 最大重试次数
   * @return {Promise} 执行结果Promise
   */
  executeWithRetry(task, processor, maxRetries) {
    return new Promise((resolve, reject) => {
      let retries = 0;
      
      const tryExecute = () => {
        try {
          if (!processor || typeof processor !== 'function') {
            reject(new Error('处理器不是有效的函数'));
            return;
          }
          
          const result = processor(task);
          // 如果处理函数返回Promise，则处理其结果
          if (result && typeof result.then === 'function') {
            result.then(resolve).catch((error) => {
              handleError(error);
            });
          } else {
            // 否则直接解析结果
            resolve(result);
          }
        } catch (error) {
          handleError(error);
        }
      };
      
      const handleError = (error) => {
        retries++;
        this.stats.retryCount++;
        
        this.logger.warn(
          '[TaskDispatchManager] 执行失败，重试 ' + retries + '/' + maxRetries,
          error.message
        );
        
        if (retries < maxRetries) {
          // 延迟重试，时间随重试次数增加
          setTimeout(tryExecute, 100 * retries);
        } else {
          this.stats.failedTasks++;
          this.logger.error(
            '[TaskDispatchManager] 达到最大重试次数，任务失败:',
            error.message
          );
          reject(error);
        }
      };
      
      // 首次尝试执行
      tryExecute();
    });
  }
  
  /**
   * 将任务发送到云端处理
   * @param {Object} task - 任务对象
   * @return {Promise} 处理结果Promise
   */
  sendTaskToCloud(task) {
    return new Promise((resolve, reject) => {
      this.logger.info('[TaskDispatchManager] 向云端发送任务:', task.type);
      
      // 构造请求数据
      var requestData = {
        task: task
      };
      
      // 如果没有实际连接，则直接拒绝
      if (!this.deviceStatus.isConnected) {
        this.stats.failedTasks++;
        reject(new Error('网络断开，无法发送到云端'));
        return;
      }
      
      // 发送请求
      wx.request({
        url: task.cloudEndpoint || 'https://api.example.com/process',
        method: 'POST',
        data: requestData,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            this.stats.successTasks++;
            this.logger.info('[TaskDispatchManager] 云端任务完成');
            resolve(res.data);
          } else {
            this.stats.failedTasks++;
            const error = new Error('云端请求失败: ' + res.statusCode);
            this.logger.error('[TaskDispatchManager] ' + error.message);
            reject(error);
          }
        },
        fail: (err) => {
          this.stats.failedTasks++;
          this.logger.error('[TaskDispatchManager] 云端请求失败:', err);
          reject(err);
        }
      });
    });
  }
  
  /**
   * 获取任务处理统计信息
   * @return {Object} 统计信息
   */
  getStats() {
    // 计算成功率
    var successRate = this.stats.totalTasks > 0 
      ? (this.stats.successTasks / this.stats.totalTasks * 100).toFixed(2) + '%' 
      : 'N/A';
    
    // 计算本地处理比例
    var localRatio = this.stats.totalTasks > 0 
      ? (this.stats.localTasks / this.stats.totalTasks * 100).toFixed(2) + '%' 
      : 'N/A';
    
    return {
      totalTasks: this.stats.totalTasks,
      localTasks: this.stats.localTasks,
      cloudTasks: this.stats.cloudTasks,
      successTasks: this.stats.successTasks,
      failedTasks: this.stats.failedTasks,
      retryCount: this.stats.retryCount,
      successRate: successRate,
      localRatio: localRatio,
      deviceStatus: {
        networkType: this.deviceStatus.networkType,
        isConnected: this.deviceStatus.isConnected,
        batteryLevel: this.deviceStatus.batteryLevel,
        cpuUsage: this.deviceStatus.currentCpuUsage,
        memoryUsage: this.deviceStatus.currentMemoryUsage
      }
    };
  }
  
  /**
   * 重置任务统计信息
   */
  resetStats() {
    this.stats = {
      totalTasks: 0,
      localTasks: 0,
      cloudTasks: 0,
      successTasks: 0,
      failedTasks: 0,
      retryCount: 0
    };
  }
}

module.exports = TaskDispatchManager; 