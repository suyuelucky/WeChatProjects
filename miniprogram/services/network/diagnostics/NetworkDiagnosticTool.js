/**
 * 网络诊断工具
 * 提供详细的网络问题诊断功能，帮助用户识别并解决网络连接问题
 * 
 * 创建时间: 2025-04-08 19:55:51
 * 创建者: Claude 3.7 Sonnet
 */

class NetworkDiagnosticTool {
  constructor(options = {}) {
    // 基本配置
    this.options = Object.assign({
      // 默认配置
      timeout: 10000, // 诊断超时时间（毫秒）
      pingCount: 3, // ping测试次数
      testEndpoints: [], // 测试端点
      debugMode: false, // 调试模式
      pingTargets: [], // 可选的ping目标
      downloadTestUrls: [], // 下载测试URL
      uploadTestUrls: [], // 上传测试URL
      testDomains: [], // 测试域名
      stabilityTestDuration: 10000, // 稳定性测试持续时间（毫秒）
      stabilitySampleInterval: 500, // 稳定性测试采样间隔（毫秒）
      stabilityTestEndpoint: 'https://www.baidu.com' // 稳定性测试端点
    }, options);
    
    // 诊断结果
    this.diagnosticResults = null;
    
    // 内部状态
    this.isRunning = false;
    this.currentTest = null;
    
    // 系统信息
    this.systemInfo = null;
    this.networkType = 'unknown';
  }
  
  // 初始化诊断工具
  initialize() {
    try {
      // 获取系统信息
      this.systemInfo = wx.getSystemInfoSync();
      
      // 获取网络类型
      wx.getNetworkType({
        success: (res) => {
          this.networkType = res.networkType;
          
          if (this.options.debugMode) {
            console.log('网络诊断工具初始化完成', {
              networkType: this.networkType,
              platform: this.systemInfo.platform
            });
          }
        },
        fail: (error) => {
          console.error('获取网络类型失败', error);
        }
      });
      
      // 设置默认测试端点（如果未提供）
      if (!this.options.testEndpoints || this.options.testEndpoints.length === 0) {
        this.options.testEndpoints = [
          { name: '微信API', url: 'https://api.weixin.qq.com/cgi-bin/getcallbackip' },
          { name: '通用API', url: 'https://www.baidu.com' }
        ];
      }
      
      return true;
    } catch (error) {
      console.error('网络诊断工具初始化失败', error);
      return false;
    }
  }
  
  // 开始网络诊断
  async runDiagnostics() {
    if (this.isRunning) {
      console.warn('诊断已在进行中');
      return null;
    }
    
    this.isRunning = true;
    this.diagnosticResults = {
      timestamp: Date.now(),
      networkType: this.networkType,
      platform: this.systemInfo ? this.systemInfo.platform : 'unknown',
      tests: {},
      issues: [],
      summary: null,
      overallStatus: 'unknown'
    };
    
    try {
      // 1. 基本网络状态测试
      await this._runBasicNetworkTest();
      
      // 2. Ping测试
      await this._runPingTest();
      
      // 3. 带宽测试
      await this._runBandwidthTest();
      
      // 4. API可达性测试
      await this._runApiReachabilityTest();
      
      // 5. DNS解析测试
      await this._runDnsTest();
      
      // 6. 连接稳定性测试
      await this._runStabilityTest();
      
      // 分析结果并生成摘要
      this._analyzeResults();
      
      if (this.options.debugMode) {
        console.log('网络诊断完成', this.diagnosticResults);
      }
    } catch (error) {
      console.error('网络诊断执行错误', error);
      this.diagnosticResults.error = error.message;
      this.diagnosticResults.overallStatus = 'error';
    } finally {
      this.isRunning = false;
    }
    
    return this.diagnosticResults;
  }
  
  // 仅运行特定测试
  async runSpecificTest(testName) {
    if (this.isRunning) {
      console.warn('诊断已在进行中');
      return null;
    }
    
    if (!this.diagnosticResults) {
      this.diagnosticResults = {
        timestamp: Date.now(),
        networkType: this.networkType,
        platform: this.systemInfo ? this.systemInfo.platform : 'unknown',
        tests: {},
        issues: [],
        summary: null,
        overallStatus: 'unknown'
      };
    }
    
    this.isRunning = true;
    this.currentTest = testName;
    
    try {
      let testResult = null;
      
      switch (testName) {
        case 'basic':
          testResult = await this._runBasicNetworkTest();
          break;
        case 'ping':
          testResult = await this._runPingTest();
          break;
        case 'bandwidth':
          testResult = await this._runBandwidthTest();
          break;
        case 'api':
          testResult = await this._runApiReachabilityTest();
          break;
        case 'dns':
          testResult = await this._runDnsTest();
          break;
        case 'stability':
          testResult = await this._runStabilityTest();
          break;
        default:
          throw new Error(`未知的测试类型: ${testName}`);
      }
      
      return testResult;
    } catch (error) {
      console.error(`运行测试 ${testName} 失败`, error);
      return {
        status: 'error',
        error: error.message
      };
    } finally {
      this.isRunning = false;
      this.currentTest = null;
    }
  }
  
  // 获取诊断结果
  getDiagnosticResults() {
    return this.diagnosticResults;
  }
  
  // 获取特定测试结果
  getTestResult(testName) {
    if (!this.diagnosticResults || !this.diagnosticResults.tests) {
      return null;
    }
    
    return this.diagnosticResults.tests[testName] || null;
  }
  
  // 获取诊断问题列表
  getIssues() {
    if (!this.diagnosticResults) {
      return [];
    }
    
    return this.diagnosticResults.issues || [];
  }
  
  // 获取诊断摘要
  getSummary() {
    if (!this.diagnosticResults) {
      return null;
    }
    
    return this.diagnosticResults.summary;
  }
  
  // 重置诊断结果
  resetResults() {
    this.diagnosticResults = null;
  }
  
  // 内部方法: 运行基本网络测试
  async _runBasicNetworkTest() {
    if (this.options.debugMode) {
      console.log('开始基本网络测试');
    }
    
    const result = {
      name: 'basic',
      status: 'unknown',
      networkType: null,
      isConnected: false,
      timestamp: Date.now(),
      details: {}
    };
    
    try {
      // 获取网络状态
      const networkPromise = new Promise((resolve, reject) => {
        wx.getNetworkType({
          success: (res) => {
            result.networkType = res.networkType;
            this.networkType = res.networkType;
            
            // 检查是否有网络连接
            result.isConnected = res.networkType !== 'none';
            
            resolve(res);
          },
          fail: reject
        });
      });
      
      // 添加超时处理
      const timeoutPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('获取网络状态超时'));
        }, this.options.timeout);
      });
      
      // 等待网络状态结果或超时
      await Promise.race([networkPromise, timeoutPromise]);
      
      // 根据网络类型设置详细信息
      switch (result.networkType) {
        case 'wifi':
          result.details.connectionQuality = 'good';
          result.details.expectedBandwidth = 'high';
          break;
        case '4g':
          result.details.connectionQuality = 'good';
          result.details.expectedBandwidth = 'medium';
          break;
        case '3g':
          result.details.connectionQuality = 'fair';
          result.details.expectedBandwidth = 'low';
          break;
        case '2g':
          result.details.connectionQuality = 'poor';
          result.details.expectedBandwidth = 'very-low';
          break;
        case 'none':
          result.details.connectionQuality = 'disconnected';
          result.details.expectedBandwidth = 'none';
          
          // 添加到问题列表
          this.diagnosticResults.issues.push({
            type: 'critical',
            code: 'NO_NETWORK',
            description: '设备未连接到网络',
            suggestion: '请检查Wi-Fi或移动数据连接是否已开启'
          });
          break;
        default:
          result.details.connectionQuality = 'unknown';
          result.details.expectedBandwidth = 'unknown';
      }
      
      result.status = result.isConnected ? 'ok' : 'error';
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      
      // 添加到问题列表
      this.diagnosticResults.issues.push({
        type: 'critical',
        code: 'NETWORK_CHECK_FAILED',
        description: '无法检查网络连接状态',
        suggestion: '请检查设备权限设置，确保网络权限已授予'
      });
    }
    
    // 保存测试结果
    this.diagnosticResults.tests.basic = result;
    
    return result;
  }
  
  // 内部方法: 运行Ping测试
  async _runPingTest() {
    if (this.options.debugMode) {
      console.log('开始Ping测试');
    }
    
    const result = {
      name: 'ping',
      status: 'unknown',
      timestamp: Date.now(),
      targets: [],
      averageLatency: null,
      packetLoss: 0,
      details: {}
    };
    
    try {
      // 准备测试目标
      const pingTargets = this.options.pingTargets || [
        'https://api.weixin.qq.com',
        'https://www.baidu.com'
      ];
      
      // 为每个目标执行ping测试
      const pingResults = [];
      
      for (const target of pingTargets) {
        const targetResult = {
          url: target,
          success: false,
          latency: null,
          attempts: []
        };
        
        // 执行多次ping以获取平均值
        let successCount = 0;
        
        for (let i = 0; i < this.options.pingCount; i++) {
          const pingStartTime = Date.now();
          let pingSuccess = false;
          let pingEndTime;
          
          try {
            // 使用wx.request模拟ping
            await new Promise((resolve, reject) => {
              const requestTask = wx.request({
                url: target,
                method: 'HEAD', // 只请求头部信息，减少数据传输
                timeout: 3000, // 3秒超时
                success: () => {
                  pingSuccess = true;
                  pingEndTime = Date.now();
                  resolve();
                },
                fail: (error) => {
                  resolve(); // 即使失败也继续，只记录结果
                },
                complete: () => {
                  if (!pingEndTime) {
                    pingEndTime = Date.now();
                  }
                }
              });
            });
            
            const latency = pingEndTime - pingStartTime;
            
            targetResult.attempts.push({
              success: pingSuccess,
              latency: pingSuccess ? latency : null,
              timestamp: pingStartTime
            });
            
            if (pingSuccess) {
              successCount++;
            }
            
            // 简单延迟，避免过快发送请求
            await new Promise(resolve => setTimeout(resolve, 200));
            
          } catch (error) {
            targetResult.attempts.push({
              success: false,
              error: error.message,
              timestamp: Date.now()
            });
          }
        }
        
        // 计算此目标的结果
        const successfulAttempts = targetResult.attempts.filter(a => a.success);
        
        if (successfulAttempts.length > 0) {
          const latencies = successfulAttempts.map(a => a.latency);
          targetResult.latency = latencies.reduce((sum, val) => sum + val, 0) / latencies.length;
          targetResult.success = true;
        }
        
        targetResult.packetLoss = 1 - (successCount / this.options.pingCount);
        
        pingResults.push(targetResult);
        result.targets.push({
          url: target,
          success: targetResult.success,
          latency: targetResult.latency,
          packetLoss: targetResult.packetLoss
        });
      }
      
      // 计算整体统计
      const successfulTargets = pingResults.filter(r => r.success);
      
      if (successfulTargets.length > 0) {
        const allLatencies = successfulTargets.map(r => r.latency);
        result.averageLatency = allLatencies.reduce((sum, val) => sum + val, 0) / allLatencies.length;
        
        // 确定网络质量评级
        if (result.averageLatency < 100) {
          result.details.quality = 'excellent';
        } else if (result.averageLatency < 200) {
          result.details.quality = 'good';
        } else if (result.averageLatency < 500) {
          result.details.quality = 'fair';
        } else {
          result.details.quality = 'poor';
        }
      } else {
        result.details.quality = 'critical';
        
        // 添加到问题列表
        this.diagnosticResults.issues.push({
          type: 'critical',
          code: 'PING_ALL_FAILED',
          description: '所有ping测试目标均无法连接',
          suggestion: '请检查网络连接，或尝试更换网络环境'
        });
      }
      
      // 计算丢包率
      const totalAttempts = pingResults.reduce((sum, target) => sum + target.attempts.length, 0);
      const successfulAttempts = pingResults.reduce((sum, target) => {
        return sum + target.attempts.filter(a => a.success).length;
      }, 0);
      
      result.packetLoss = 1 - (successfulAttempts / totalAttempts);
      
      // 根据丢包率添加问题
      if (result.packetLoss > 0.3) {
        this.diagnosticResults.issues.push({
          type: result.packetLoss > 0.7 ? 'critical' : 'warning',
          code: 'HIGH_PACKET_LOSS',
          description: `网络丢包率过高: ${(result.packetLoss * 100).toFixed(1)}%`,
          suggestion: '请检查网络质量，尝试更换网络环境或靠近路由器'
        });
      }
      
      result.status = successfulTargets.length > 0 ? 'ok' : 'error';
      result.details.rawResults = pingResults;
      
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      
      // 添加到问题列表
      this.diagnosticResults.issues.push({
        type: 'error',
        code: 'PING_TEST_FAILED',
        description: '执行Ping测试时发生错误',
        suggestion: '请重试网络诊断，或检查应用权限设置'
      });
    }
    
    // 保存测试结果
    this.diagnosticResults.tests.ping = result;
    
    return result;
  }
  
  // 内部方法: 运行带宽测试
  async _runBandwidthTest() {
    if (this.options.debugMode) {
      console.log('开始带宽测试');
    }
    
    const result = {
      name: 'bandwidth',
      status: 'unknown',
      timestamp: Date.now(),
      downloadSpeed: null, // KB/s
      uploadSpeed: null, // KB/s
      details: {
        downloadTests: [],
        uploadTests: []
      }
    };
    
    try {
      // 1. 下载测试
      await this._runDownloadTest(result);
      
      // 2. 上传测试
      await this._runUploadTest(result);
      
      // 分析结果
      if (result.downloadSpeed !== null || result.uploadSpeed !== null) {
        result.status = 'ok';
        
        // 评估带宽质量
        this._evaluateBandwidthQuality(result);
      } else {
        result.status = 'error';
        
        // 添加到问题列表
        this.diagnosticResults.issues.push({
          type: 'error',
          code: 'BANDWIDTH_TEST_FAILED',
          description: '带宽测试失败，无法获取网络速度数据',
          suggestion: '请检查网络连接并重试'
        });
      }
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      
      // 添加到问题列表
      this.diagnosticResults.issues.push({
        type: 'error',
        code: 'BANDWIDTH_TEST_ERROR',
        description: '带宽测试过程中发生错误',
        suggestion: '请检查网络连接并重试，或联系技术支持'
      });
    }
    
    // 保存测试结果
    this.diagnosticResults.tests.bandwidth = result;
    
    return result;
  }
  
  // 辅助方法: 执行下载测试
  async _runDownloadTest(result) {
    // 测试用的文件大小和URL
    const testSizes = [100, 500]; // KB
    const downloadTestUrls = this.options.downloadTestUrls || [
      'https://api.weixin.qq.com/cgi-bin/getcallbackip' // 微信API为示例
    ];
    
    for (const downloadUrl of downloadTestUrls) {
      for (const size of testSizes) {
        const testResult = {
          url: downloadUrl,
          targetSize: size, // KB
          actualSize: 0, // KB
          duration: 0, // ms
          speed: 0, // KB/s
          success: false
        };
        
        try {
          const startTime = Date.now();
          
          // 使用wx.request进行下载测试
          // 由于微信小程序限制，我们使用参数来尝试请求不同大小的数据
          // 实际项目中应当使用专门的测速API或CDN
          await new Promise((resolve, reject) => {
            wx.request({
              url: `${downloadUrl}?size=${size}`,
              method: 'GET',
              success: (res) => {
                const endTime = Date.now();
                testResult.duration = endTime - startTime;
                
                // 估算实际数据大小 (为方便演示，使用响应长度作为近似值)
                // 真实场景应使用实际下载的字节数
                const responseData = JSON.stringify(res.data);
                testResult.actualSize = responseData.length / 1024; // 转换为KB
                
                if (testResult.duration > 0 && testResult.actualSize > 0) {
                  testResult.speed = (testResult.actualSize / testResult.duration) * 1000; // KB/s
                  testResult.success = true;
                }
                
                resolve();
              },
              fail: reject
            });
          });
        } catch (error) {
          testResult.error = error.message;
        }
        
        result.details.downloadTests.push(testResult);
      }
    }
    
    // 计算平均下载速度
    const successfulTests = result.details.downloadTests.filter(test => test.success);
    if (successfulTests.length > 0) {
      result.downloadSpeed = successfulTests.reduce((sum, test) => sum + test.speed, 0) / successfulTests.length;
    }
  }
  
  // 辅助方法: 执行上传测试
  async _runUploadTest(result) {
    // 测试用的数据大小
    const testSizes = [50, 200]; // KB
    const uploadTestUrls = this.options.uploadTestUrls || [
      'https://api.weixin.qq.com/cgi-bin/getcallbackip' // 微信API为示例
    ];
    
    for (const uploadUrl of uploadTestUrls) {
      for (const size of testSizes) {
        const testResult = {
          url: uploadUrl,
          size: size, // KB
          duration: 0, // ms
          speed: 0, // KB/s
          success: false
        };
        
        try {
          // 创建指定大小的测试数据
          const testData = this._generateTestData(size);
          
          const startTime = Date.now();
          
          // 执行上传请求
          await new Promise((resolve, reject) => {
            wx.request({
              url: uploadUrl,
              method: 'POST',
              data: testData,
              success: () => {
                const endTime = Date.now();
                testResult.duration = endTime - startTime;
                
                if (testResult.duration > 0) {
                  testResult.speed = (size / testResult.duration) * 1000; // KB/s
                  testResult.success = true;
                }
                
                resolve();
              },
              fail: reject
            });
          });
        } catch (error) {
          testResult.error = error.message;
        }
        
        result.details.uploadTests.push(testResult);
      }
    }
    
    // 计算平均上传速度
    const successfulTests = result.details.uploadTests.filter(test => test.success);
    if (successfulTests.length > 0) {
      result.uploadSpeed = successfulTests.reduce((sum, test) => sum + test.speed, 0) / successfulTests.length;
    }
  }
  
  // 辅助方法: 生成测试数据
  _generateTestData(sizeInKB) {
    // 创建随机数据，实际项目中可能需要更复杂的数据生成逻辑
    const dataObj = {};
    const charsPerKB = 1024; // 估算每个KB对应的字符数
    
    for (let i = 0; i < sizeInKB; i++) {
      dataObj[`field_${i}`] = new Array(charsPerKB).fill('A').join('');
    }
    
    return dataObj;
  }
  
  // 辅助方法: 评估带宽质量
  _evaluateBandwidthQuality(result) {
    // 下载速度评估
    if (result.downloadSpeed !== null) {
      if (result.downloadSpeed >= 1000) { // > 1MB/s
        result.details.downloadQuality = 'excellent';
      } else if (result.downloadSpeed >= 500) { // > 500KB/s
        result.details.downloadQuality = 'good';
      } else if (result.downloadSpeed >= 100) { // > 100KB/s
        result.details.downloadQuality = 'fair';
      } else {
        result.details.downloadQuality = 'poor';
        
        // 添加到问题列表
        this.diagnosticResults.issues.push({
          type: 'warning',
          code: 'LOW_DOWNLOAD_SPEED',
          description: `下载速度较慢: ${result.downloadSpeed.toFixed(2)} KB/s`,
          suggestion: '您的网络下载速度较慢，可能影响应用体验。建议连接更快的网络或靠近Wi-Fi源'
        });
      }
    }
    
    // 上传速度评估
    if (result.uploadSpeed !== null) {
      if (result.uploadSpeed >= 500) { // > 500KB/s
        result.details.uploadQuality = 'excellent';
      } else if (result.uploadSpeed >= 200) { // > 200KB/s
        result.details.uploadQuality = 'good';
      } else if (result.uploadSpeed >= 50) { // > 50KB/s
        result.details.uploadQuality = 'fair';
      } else {
        result.details.uploadQuality = 'poor';
        
        // 添加到问题列表
        this.diagnosticResults.issues.push({
          type: 'warning',
          code: 'LOW_UPLOAD_SPEED',
          description: `上传速度较慢: ${result.uploadSpeed.toFixed(2)} KB/s`,
          suggestion: '您的网络上传速度较慢，可能影响数据提交和同步。建议更换网络环境'
        });
      }
    }
    
    // 整体评估
    if (result.downloadSpeed !== null && result.uploadSpeed !== null) {
      const qualities = {
        'excellent': 4,
        'good': 3,
        'fair': 2,
        'poor': 1
      };
      
      const downloadScore = qualities[result.details.downloadQuality] || 0;
      const uploadScore = qualities[result.details.uploadQuality] || 0;
      const avgScore = (downloadScore + uploadScore) / 2;
      
      if (avgScore >= 3.5) {
        result.details.overallQuality = 'excellent';
      } else if (avgScore >= 2.5) {
        result.details.overallQuality = 'good';
      } else if (avgScore >= 1.5) {
        result.details.overallQuality = 'fair';
      } else {
        result.details.overallQuality = 'poor';
        
        // 添加到问题列表
        this.diagnosticResults.issues.push({
          type: 'warning',
          code: 'POOR_NETWORK_QUALITY',
          description: '整体网络质量较差',
          suggestion: '您的网络整体质量较差，建议更换网络环境或联系网络提供商'
        });
      }
    }
  }
  
  // 内部方法: 运行API可达性测试
  async _runApiReachabilityTest() {
    if (this.options.debugMode) {
      console.log('开始API可达性测试');
    }
    
    const result = {
      name: 'api',
      status: 'unknown',
      timestamp: Date.now(),
      endpoints: [],
      successRate: 0,
      averageLatency: null,
      details: {}
    };
    
    try {
      // 准备测试端点
      const apiEndpoints = this.options.testEndpoints.length > 0 
        ? this.options.testEndpoints 
        : [
            { name: '微信API', url: 'https://api.weixin.qq.com/cgi-bin/getcallbackip' },
            { name: '通用API', url: 'https://www.baidu.com' }
          ];
      
      // 测试每个端点
      let successCount = 0;
      let totalLatency = 0;
      
      for (const endpoint of apiEndpoints) {
        const endpointResult = {
          name: endpoint.name,
          url: endpoint.url,
          success: false,
          latency: null,
          statusCode: null,
          errorMessage: null
        };
        
        try {
          const startTime = Date.now();
          
          // 发送请求
          await new Promise((resolve, reject) => {
            wx.request({
              url: endpoint.url,
              method: 'GET',
              timeout: 5000,
              success: (res) => {
                const endTime = Date.now();
                endpointResult.latency = endTime - startTime;
                endpointResult.statusCode = res.statusCode;
                
                // 只有状态码为2xx或3xx才视为成功
                if (res.statusCode >= 200 && res.statusCode < 400) {
                  endpointResult.success = true;
                  successCount++;
                  totalLatency += endpointResult.latency;
                } else {
                  endpointResult.errorMessage = `HTTP错误: ${res.statusCode}`;
                }
                
                resolve();
              },
              fail: (error) => {
                endpointResult.errorMessage = error.errMsg || '请求失败';
                resolve();
              }
            });
          });
        } catch (error) {
          endpointResult.errorMessage = error.message;
        }
        
        result.endpoints.push(endpointResult);
      }
      
      // 计算总体结果
      if (apiEndpoints.length > 0) {
        result.successRate = successCount / apiEndpoints.length;
        
        if (successCount > 0) {
          result.averageLatency = totalLatency / successCount;
        }
        
        // 根据成功率确定状态
        if (result.successRate >= 0.8) {
          result.status = 'ok';
        } else if (result.successRate >= 0.5) {
          result.status = 'warning';
          
          // 添加警告信息
          this.diagnosticResults.issues.push({
            type: 'warning',
            code: 'PARTIAL_API_ACCESS',
            description: `部分API无法访问，成功率: ${(result.successRate * 100).toFixed(1)}%`,
            suggestion: '部分服务可能无法正常工作，请检查网络连接或联系客服'
          });
        } else {
          result.status = 'error';
          
          // 添加严重问题
          this.diagnosticResults.issues.push({
            type: 'critical',
            code: 'API_ACCESS_FAILURE',
            description: `大部分API无法访问，成功率: ${(result.successRate * 100).toFixed(1)}%`,
            suggestion: '网络连接存在严重问题，大多数服务将无法正常工作。请检查网络设置或更换网络环境'
          });
        }
        
        // 分析具体问题
        this._analyzeApiFailures(result);
      } else {
        result.status = 'error';
        result.error = '未提供有效的API测试端点';
      }
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      
      // 添加到问题列表
      this.diagnosticResults.issues.push({
        type: 'error',
        code: 'API_TEST_ERROR',
        description: 'API可达性测试过程中发生错误',
        suggestion: '请重试网络诊断或联系技术支持'
      });
    }
    
    // 保存测试结果
    this.diagnosticResults.tests.api = result;
    
    return result;
  }
  
  // 辅助方法: 分析API失败原因
  _analyzeApiFailures(result) {
    const failedEndpoints = result.endpoints.filter(ep => !ep.success);
    
    if (failedEndpoints.length === 0) {
      return;
    }
    
    // 检查状态码分布
    const statusCodeCounts = {};
    failedEndpoints.forEach(ep => {
      if (ep.statusCode) {
        statusCodeCounts[ep.statusCode] = (statusCodeCounts[ep.statusCode] || 0) + 1;
      }
    });
    
    // 检查错误消息分布
    const errorMessageCounts = {};
    failedEndpoints.forEach(ep => {
      if (ep.errorMessage) {
        errorMessageCounts[ep.errorMessage] = (errorMessageCounts[ep.errorMessage] || 0) + 1;
      }
    });
    
    // 根据状态码和错误消息，推断可能的问题
    
    // 5xx服务器错误
    const serverErrorCount = Object.keys(statusCodeCounts)
      .filter(code => parseInt(code) >= 500 && parseInt(code) < 600)
      .reduce((sum, code) => sum + statusCodeCounts[code], 0);
    
    if (serverErrorCount > 0) {
      this.diagnosticResults.issues.push({
        type: 'warning',
        code: 'SERVER_ERRORS',
        description: `检测到服务器端错误 (5xx): ${serverErrorCount}个端点`,
        suggestion: '服务器端可能存在问题，请稍后再试或联系服务提供商'
      });
    }
    
    // 4xx客户端错误
    const clientErrorCount = Object.keys(statusCodeCounts)
      .filter(code => parseInt(code) >= 400 && parseInt(code) < 500)
      .reduce((sum, code) => sum + statusCodeCounts[code], 0);
    
    if (clientErrorCount > 0) {
      this.diagnosticResults.issues.push({
        type: 'warning',
        code: 'CLIENT_ERRORS',
        description: `检测到客户端错误 (4xx): ${clientErrorCount}个端点`,
        suggestion: '可能是认证问题或参数错误，请检查应用配置或重新登录'
      });
    }
    
    // 网络超时和DNS错误
    const timeoutErrors = Object.keys(errorMessageCounts)
      .filter(msg => msg.includes('timeout') || msg.includes('超时'))
      .reduce((sum, msg) => sum + errorMessageCounts[msg], 0);
    
    const dnsErrors = Object.keys(errorMessageCounts)
      .filter(msg => msg.includes('DNS') || msg.includes('域名'))
      .reduce((sum, msg) => sum + errorMessageCounts[msg], 0);
    
    if (timeoutErrors > 0) {
      this.diagnosticResults.issues.push({
        type: 'warning',
        code: 'API_TIMEOUTS',
        description: `API请求超时: ${timeoutErrors}个端点`,
        suggestion: '网络连接不稳定或API服务响应慢，请检查网络连接或稍后再试'
      });
    }
    
    if (dnsErrors > 0) {
      this.diagnosticResults.issues.push({
        type: 'warning',
        code: 'DNS_RESOLUTION_ISSUES',
        description: `DNS解析问题: ${dnsErrors}个端点`,
        suggestion: '域名解析失败，可能是DNS服务器配置问题或域名不存在，请检查网络设置'
      });
    }
  }
  
  // 内部方法: 运行DNS测试
  async _runDnsTest() {
    if (this.options.debugMode) {
      console.log('开始DNS测试');
    }
    
    const result = {
      name: 'dns',
      status: 'unknown',
      timestamp: Date.now(),
      domains: [],
      successRate: 0,
      averageResolutionTime: null,
      details: {}
    };
    
    try {
      // 准备测试域名
      const testDomains = this.options.testDomains || [
        'api.weixin.qq.com',
        'www.baidu.com',
        'qq.com'
      ];
      
      // 测试每个域名
      let successCount = 0;
      let totalResolutionTime = 0;
      
      for (const domain of testDomains) {
        const domainResult = {
          domain: domain,
          success: false,
          resolutionTime: null,
          error: null
        };
        
        try {
          // 微信小程序环境中没有直接的DNS查询API
          // 使用HTTP请求模拟DNS解析过程
          const startTime = Date.now();
          
          await new Promise((resolve, reject) => {
            wx.request({
              url: `https://${domain}/favicon.ico`, // 请求一个小文件来测试DNS
              method: 'HEAD', // 只请求头部信息，减少数据传输
              timeout: 5000, // 5秒超时
              success: () => {
                const endTime = Date.now();
                domainResult.resolutionTime = endTime - startTime;
                domainResult.success = true;
                
                successCount++;
                totalResolutionTime += domainResult.resolutionTime;
                
                resolve();
              },
              fail: (error) => {
                // 区分DNS错误和其他错误
                if (error.errMsg && (
                    error.errMsg.includes('domain') || 
                    error.errMsg.includes('DNS') || 
                    error.errMsg.includes('域名'))) {
                  domainResult.error = 'DNS解析失败';
                } else {
                  // 如果不是DNS错误，但请求失败了，我们假设DNS解析成功但服务不可用
                  domainResult.success = true;
                  const endTime = Date.now();
                  domainResult.resolutionTime = endTime - startTime;
                  domainResult.error = '域名解析成功但服务不可用';
                  
                  successCount++;
                  totalResolutionTime += domainResult.resolutionTime;
                }
                
                resolve();
              }
            });
          });
        } catch (error) {
          domainResult.error = error.message;
        }
        
        result.domains.push(domainResult);
      }
      
      // 计算总体结果
      if (testDomains.length > 0) {
        result.successRate = successCount / testDomains.length;
        
        if (successCount > 0) {
          result.averageResolutionTime = totalResolutionTime / successCount;
        }
        
        // 根据成功率确定状态
        if (result.successRate >= 0.8) {
          result.status = 'ok';
          
          // 评估DNS解析速度
          if (result.averageResolutionTime !== null) {
            if (result.averageResolutionTime < 100) {
              result.details.resolutionQuality = 'excellent';
            } else if (result.averageResolutionTime < 300) {
              result.details.resolutionQuality = 'good';
            } else if (result.averageResolutionTime < 800) {
              result.details.resolutionQuality = 'fair';
            } else {
              result.details.resolutionQuality = 'poor';
              
              // 添加慢解析警告
              this.diagnosticResults.issues.push({
                type: 'warning',
                code: 'SLOW_DNS_RESOLUTION',
                description: `DNS解析速度较慢: ${result.averageResolutionTime.toFixed(0)}ms`,
                suggestion: '域名解析延迟较高，可能导致网络请求变慢。建议更换DNS服务器或网络环境'
              });
            }
          }
        } else if (result.successRate >= 0.5) {
          result.status = 'warning';
          
          // 添加警告信息
          this.diagnosticResults.issues.push({
            type: 'warning',
            code: 'PARTIAL_DNS_FAILURE',
            description: `部分域名解析失败，成功率: ${(result.successRate * 100).toFixed(1)}%`,
            suggestion: 'DNS服务可能存在问题，请检查网络设置或咨询网络提供商'
          });
        } else {
          result.status = 'error';
          
          // 添加严重问题
          this.diagnosticResults.issues.push({
            type: 'critical',
            code: 'DNS_RESOLUTION_FAILURE',
            description: `大部分域名解析失败，成功率: ${(result.successRate * 100).toFixed(1)}%`,
            suggestion: 'DNS服务存在严重问题，请检查网络设置，尝试切换到公共DNS(如8.8.8.8)或更换网络环境'
          });
        }
        
        // 查找可能的DNS劫持或污染
        this._checkForDNSIssues(result);
      } else {
        result.status = 'error';
        result.error = '未提供有效的测试域名';
      }
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      
      // 添加到问题列表
      this.diagnosticResults.issues.push({
        type: 'error',
        code: 'DNS_TEST_ERROR',
        description: 'DNS测试过程中发生错误',
        suggestion: '请重试网络诊断或联系技术支持'
      });
    }
    
    // 保存测试结果
    this.diagnosticResults.tests.dns = result;
    
    return result;
  }
  
  // 辅助方法: 检查DNS异常情况
  _checkForDNSIssues(result) {
    // 检查DNS解析失败模式
    const failedDomains = result.domains.filter(d => !d.success);
    
    if (failedDomains.length === 0) {
      return;
    }
    
    // 检查是否所有失败都有相同的错误模式
    const errors = failedDomains.map(d => d.error);
    const uniqueErrors = new Set(errors);
    
    if (uniqueErrors.size === 1 && errors[0] && failedDomains.length >= 2) {
      // 如果所有失败都有完全相同的错误，可能是系统级DNS问题
      this.diagnosticResults.issues.push({
        type: 'warning',
        code: 'SYSTEMATIC_DNS_ISSUE',
        description: '检测到系统级DNS解析问题',
        suggestion: '请检查设备网络设置中的DNS配置，或咨询网络服务提供商'
      });
    }
    
    // 检查解析时间异常
    const successfulDomains = result.domains.filter(d => d.success);
    if (successfulDomains.length >= 2) {
      const resolutionTimes = successfulDomains.map(d => d.resolutionTime);
      const maxTime = Math.max(...resolutionTimes);
      const minTime = Math.min(...resolutionTimes);
      
      // 如果最大解析时间是最小的3倍以上，可能存在特定域名的DNS问题
      if (maxTime > minTime * 3 && maxTime > 500) {
        const slowDomains = successfulDomains
          .filter(d => d.resolutionTime > 500)
          .map(d => d.domain)
          .join(', ');
        
        if (slowDomains) {
          this.diagnosticResults.issues.push({
            type: 'warning',
            code: 'SPECIFIC_DNS_SLOWNESS',
            description: `特定域名解析较慢: ${slowDomains}`,
            suggestion: '特定域名解析缓慢，可能与DNS缓存或特定DNS服务器配置有关'
          });
        }
      }
    }
  }
  
  // 内部方法: 运行连接稳定性测试
  async _runStabilityTest() {
    if (this.options.debugMode) {
      console.log('开始连接稳定性测试');
    }
    
    const result = {
      name: 'stability',
      status: 'unknown',
      timestamp: Date.now(),
      jitter: null, // 网络波动(ms)
      packetLoss: null, // 丢包率
      connectionDrops: 0, // 连接中断次数
      details: {
        testDuration: 0, // 测试持续时间(ms)
        samples: [], // 样本数据
        intervals: [] // 请求间隔数据
      }
    };
    
    try {
      // 稳定性测试参数
      const testDuration = this.options.stabilityTestDuration || 10000; // 默认10秒
      const sampleInterval = this.options.stabilitySampleInterval || 500; // 每500ms一次请求
      const testEndpoint = this.options.stabilityTestEndpoint || 'https://www.baidu.com';
      
      const startTime = Date.now();
      const endTime = startTime + testDuration;
      
      // 保存测试配置
      result.details.testDuration = testDuration;
      result.details.sampleInterval = sampleInterval;
      result.details.testEndpoint = testEndpoint;
      
      // 执行多次请求以测量稳定性
      let lastSampleTime = startTime;
      let successfulRequests = 0;
      let failedRequests = 0;
      let totalLatency = 0;
      let connectionDropCount = 0;
      const latencies = [];
      
      while (Date.now() < endTime) {
        // 计算实际应该等待的时间(考虑请求本身的耗时)
        const now = Date.now();
        const elapsedSinceLastSample = now - lastSampleTime;
        const waitTime = Math.max(0, sampleInterval - elapsedSinceLastSample);
        
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        // 记录实际的样本间隔
        const intervalTime = Date.now() - lastSampleTime;
        result.details.intervals.push(intervalTime);
        
        // 执行网络请求
        const sampleStartTime = Date.now();
        lastSampleTime = sampleStartTime;
        
        const sample = {
          timestamp: sampleStartTime,
          success: false,
          latency: null,
          error: null
        };
        
        try {
          await new Promise((resolve, reject) => {
            wx.request({
              url: testEndpoint,
              method: 'HEAD',
              timeout: sampleInterval * 0.8, // 设置超时略小于采样间隔
              success: () => {
                const sampleEndTime = Date.now();
                sample.success = true;
                sample.latency = sampleEndTime - sampleStartTime;
                
                // 累计统计数据
                successfulRequests++;
                totalLatency += sample.latency;
                latencies.push(sample.latency);
                
                resolve();
              },
              fail: (error) => {
                sample.success = false;
                sample.error = error.errMsg || '请求失败';
                
                // 检测连接中断
                if (sample.error.includes('timeout') || 
                    sample.error.includes('断开') || 
                    sample.error.includes('中断')) {
                  connectionDropCount++;
                }
                
                failedRequests++;
                resolve();
              }
            });
          });
        } catch (error) {
          sample.success = false;
          sample.error = error.message;
          failedRequests++;
        }
        
        result.details.samples.push(sample);
      }
      
      // 计算稳定性指标
      const totalRequests = successfulRequests + failedRequests;
      
      if (totalRequests > 0) {
        result.packetLoss = failedRequests / totalRequests;
      }
      
      if (latencies.length >= 2) {
        // 计算抖动(相邻样本延迟差的标准差)
        const latencyDiffs = [];
        for (let i = 1; i < latencies.length; i++) {
          latencyDiffs.push(Math.abs(latencies[i] - latencies[i-1]));
        }
        
        const avgDiff = latencyDiffs.reduce((sum, diff) => sum + diff, 0) / latencyDiffs.length;
        
        // 计算标准差作为抖动指标
        const squaredDiffs = latencyDiffs.map(diff => Math.pow(diff - avgDiff, 2));
        const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / squaredDiffs.length;
        result.jitter = Math.sqrt(avgSquaredDiff);
      }
      
      result.connectionDrops = connectionDropCount;
      
      // 确定测试状态
      if (successfulRequests > 0) {
        if (result.packetLoss <= 0.1 && result.jitter < 50 && connectionDropCount === 0) {
          result.status = 'ok';
          result.details.stabilityRating = 'excellent';
        } else if (result.packetLoss <= 0.2 && result.jitter < 100 && connectionDropCount <= 1) {
          result.status = 'ok';
          result.details.stabilityRating = 'good';
        } else if (result.packetLoss <= 0.3 && result.jitter < 200 && connectionDropCount <= 2) {
          result.status = 'warning';
          result.details.stabilityRating = 'fair';
          
          // 添加警告信息
          this.diagnosticResults.issues.push({
            type: 'warning',
            code: 'NETWORK_INSTABILITY',
            description: '网络连接不稳定',
            suggestion: '您的网络连接不够稳定，可能导致应用断断续续。建议更换网络环境或靠近Wi-Fi源'
          });
        } else {
          result.status = 'error';
          result.details.stabilityRating = 'poor';
          
          // 添加严重问题
          this.diagnosticResults.issues.push({
            type: 'critical',
            code: 'SEVERE_NETWORK_INSTABILITY',
            description: '网络连接严重不稳定',
            suggestion: '您的网络连接极不稳定，将导致应用体验显著下降。建议立即更换网络环境'
          });
        }
        
        // 分析具体问题
        this._analyzeStabilityIssues(result);
      } else {
        result.status = 'error';
        result.error = '所有稳定性测试请求都失败了';
        
        // 添加严重问题
        this.diagnosticResults.issues.push({
          type: 'critical',
          code: 'CONNECTION_FAILURE',
          description: '无法建立稳定的网络连接',
          suggestion: '网络连接可能已中断，请检查您的网络设置或信号强度'
        });
      }
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      
      // 添加到问题列表
      this.diagnosticResults.issues.push({
        type: 'error',
        code: 'STABILITY_TEST_ERROR',
        description: '稳定性测试过程中发生错误',
        suggestion: '请重试网络诊断或联系技术支持'
      });
    }
    
    // 保存测试结果
    this.diagnosticResults.tests.stability = result;
    
    return result;
  }
  
  // 辅助方法: 分析稳定性问题
  _analyzeStabilityIssues(result) {
    // 检查高抖动
    if (result.jitter !== null && result.jitter > 100) {
      this.diagnosticResults.issues.push({
        type: result.jitter > 200 ? 'critical' : 'warning',
        code: 'HIGH_NETWORK_JITTER',
        description: `网络延迟波动较大: ${result.jitter.toFixed(1)}ms`,
        suggestion: '网络延迟波动较大，可能导致应用响应不稳定。建议避免使用拥挤的网络，或尝试靠近路由器'
      });
    }
    
    // 检查高丢包率
    if (result.packetLoss !== null && result.packetLoss > 0.1) {
      this.diagnosticResults.issues.push({
        type: result.packetLoss > 0.25 ? 'critical' : 'warning',
        code: 'HIGH_PACKET_LOSS_RATE',
        description: `网络丢包率较高: ${(result.packetLoss * 100).toFixed(1)}%`,
        suggestion: '网络丢包率较高，将导致频繁的重试和超时。建议检查网络质量或切换到更稳定的网络'
      });
    }
    
    // 检查连接中断
    if (result.connectionDrops > 0) {
      this.diagnosticResults.issues.push({
        type: result.connectionDrops > 2 ? 'critical' : 'warning',
        code: 'CONNECTION_DROPS',
        description: `检测到网络连接中断: ${result.connectionDrops}次`,
        suggestion: '网络连接不稳定，会导致应用功能受影响。建议检查网络信号强度或更换网络环境'
      });
    }
    
    // 检查延迟模式
    const successfulSamples = result.details.samples.filter(s => s.success);
    if (successfulSamples.length >= 5) {
      const latencies = successfulSamples.map(s => s.latency);
      const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      
      // 检查延迟尖峰
      if (maxLatency > avgLatency * 3 && maxLatency > 500) {
        this.diagnosticResults.issues.push({
          type: 'warning',
          code: 'LATENCY_SPIKES',
          description: '检测到网络延迟尖峰',
          suggestion: '网络延迟出现瞬间飙升，可能导致操作延迟或超时。建议关闭其他占用网络的应用'
        });
      }
    }
  }
  
  // 内部方法: 分析结果并生成摘要
  _analyzeResults() {
    const tests = this.diagnosticResults.tests;
    const issues = this.diagnosticResults.issues;
    
    // 根据严重性对问题排序
    const priorityOrder = { 'critical': 0, 'error': 1, 'warning': 2 };
    issues.sort((a, b) => {
      return priorityOrder[a.type] - priorityOrder[b.type];
    });
    
    // 统计各个测试的状态
    const testStatuses = Object.values(tests).map(test => test.status);
    const okCount = testStatuses.filter(status => status === 'ok').length;
    const warningCount = testStatuses.filter(status => status === 'warning').length;
    const errorCount = testStatuses.filter(status => status === 'error').length;
    
    // 确定总体状态
    if (errorCount > 0) {
      this.diagnosticResults.overallStatus = 'error';
    } else if (warningCount > 0) {
      this.diagnosticResults.overallStatus = 'warning';
    } else if (okCount === testStatuses.length) {
      this.diagnosticResults.overallStatus = 'ok';
    } else {
      this.diagnosticResults.overallStatus = 'unknown';
    }
    
    // 生成摘要
    const summary = {
      timestamp: Date.now(),
      overallStatus: this.diagnosticResults.overallStatus,
      networkType: this.networkType,
      issueCount: {
        critical: issues.filter(i => i.type === 'critical').length,
        error: issues.filter(i => i.type === 'error').length,
        warning: issues.filter(i => i.type === 'warning').length,
        total: issues.length
      },
      testResults: {},
      topIssues: issues.slice(0, 3).map(i => ({
        type: i.type,
        code: i.code,
        description: i.description
      }))
    };
    
    // 添加各测试的关键指标
    if (tests.basic) {
      summary.testResults.basic = {
        status: tests.basic.status,
        networkType: tests.basic.networkType,
        isConnected: tests.basic.isConnected
      };
    }
    
    if (tests.ping) {
      summary.testResults.ping = {
        status: tests.ping.status,
        averageLatency: tests.ping.averageLatency,
        packetLoss: tests.ping.packetLoss
      };
    }
    
    if (tests.bandwidth) {
      summary.testResults.bandwidth = {
        status: tests.bandwidth.status,
        downloadSpeed: tests.bandwidth.downloadSpeed,
        uploadSpeed: tests.bandwidth.uploadSpeed
      };
    }
    
    if (tests.api) {
      summary.testResults.api = {
        status: tests.api.status,
        successRate: tests.api.successRate,
        averageLatency: tests.api.averageLatency
      };
    }
    
    if (tests.dns) {
      summary.testResults.dns = {
        status: tests.dns.status,
        successRate: tests.dns.successRate,
        averageResolutionTime: tests.dns.averageResolutionTime
      };
    }
    
    if (tests.stability) {
      summary.testResults.stability = {
        status: tests.stability.status,
        jitter: tests.stability.jitter,
        packetLoss: tests.stability.packetLoss,
        connectionDrops: tests.stability.connectionDrops
      };
    }
    
    // 生成总体建议
    const recommendations = [];
    
    if (summary.issueCount.critical > 0) {
      recommendations.push('您的网络连接存在严重问题，建议立即处理以确保应用正常使用');
    }
    
    if (this.networkType === 'wifi' && (tests.ping && tests.ping.averageLatency > 300)) {
      recommendations.push('Wi-Fi信号可能较弱，建议靠近路由器或检查Wi-Fi信号强度');
    }
    
    if (this.networkType === '2g' || this.networkType === '3g') {
      recommendations.push('当前使用的是较慢的移动网络，建议切换到Wi-Fi或4G/5G网络获得更好体验');
    }
    
    if (tests.dns && tests.dns.status === 'error') {
      recommendations.push('DNS解析存在问题，建议尝试切换到公共DNS服务器(如8.8.8.8)或联系网络提供商');
    }
    
    if (tests.bandwidth && tests.bandwidth.downloadSpeed < 100) {
      recommendations.push('网络带宽较低，可能影响应用内容加载速度，建议使用更快的网络连接');
    }
    
    // 检查WLAN与蜂窝网络混合使用的情况
    if (this.networkType === 'wifi' && tests.api && tests.api.successRate < 0.8 && tests.ping && tests.ping.status === 'ok') {
      recommendations.push('Wi-Fi可能已连接但无法访问互联网，建议检查Wi-Fi设置或临时切换到移动数据');
    }
    
    summary.recommendations = recommendations;
    
    // 保存摘要
    this.diagnosticResults.summary = summary;
  }
}

module.exports = NetworkDiagnosticTool; 