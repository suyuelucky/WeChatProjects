/**
 * 网络诊断解决方案生成器
 * 基于网络诊断结果，生成针对性的解决方案和建议，帮助用户解决网络问题
 * 
 * 创建时间: 2025-04-08 20:35:43
 * 创建者: Claude 3.7 Sonnet
 */

class NetworkDiagnosisSolutionGenerator {
  constructor(options = {}) {
    this.options = Object.assign({
      // 默认配置
      userLevel: 'normal', // 用户技术水平: 'beginner', 'normal', 'advanced'
      detailedMode: false, // 是否生成详细的解决方案
      language: 'zh-CN' // 语言设置
    }, options);
    
    // 解决方案模板库
    this.solutionTemplates = {
      'basic': require('./templates/basicSolutions'),
      'expert': require('./templates/expertSolutions')
    };
    
    this.lastGeneratedSolutions = null;
  }
  
  /**
   * 基于诊断结果生成解决方案
   * @param {Object} diagnosticResults - 由NetworkDiagnosticTool生成的诊断结果
   * @return {Object} 解决方案对象
   */
  generateSolutions(diagnosticResults) {
    if (!diagnosticResults || !diagnosticResults.tests) {
      return {
        timestamp: Date.now(),
        status: 'error',
        error: '无效的诊断结果',
        solutions: []
      };
    }
    
    const solutions = {
      timestamp: Date.now(),
      networkType: diagnosticResults.networkType,
      overallStatus: diagnosticResults.overallStatus,
      solutions: [],
      generalRecommendations: [],
      deviceSpecificSuggestions: []
    };
    
    try {
      // 1. 处理关键问题
      this._generateCriticalSolutions(diagnosticResults, solutions);
      
      // 2. 针对各项测试生成具体解决方案
      this._generateTestSpecificSolutions(diagnosticResults, solutions);
      
      // 3. 添加一般性改进建议
      this._addGeneralRecommendations(diagnosticResults, solutions);
      
      // 4. 添加特定设备的建议
      this._addDeviceSpecificSuggestions(diagnosticResults, solutions);
      
      // 5. 根据用户技术水平调整解决方案复杂度
      this._adjustForUserLevel(solutions);
      
      // 保存生成的解决方案
      this.lastGeneratedSolutions = solutions;
      
      return solutions;
    } catch (error) {
      console.error('生成解决方案时出错', error);
      return {
        timestamp: Date.now(),
        status: 'error',
        error: '生成解决方案失败: ' + error.message,
        solutions: []
      };
    }
  }
  
  /**
   * 获取最近一次生成的解决方案
   * @return {Object|null} 解决方案对象或null
   */
  getLastGeneratedSolutions() {
    return this.lastGeneratedSolutions;
  }
  
  /**
   * 生成针对关键问题的解决方案
   * @private
   */
  _generateCriticalSolutions(diagnosticResults, solutions) {
    // 获取关键问题
    const criticalIssues = diagnosticResults.issues.filter(issue => 
      issue.type === 'critical' || issue.type === 'error'
    );
    
    if (criticalIssues.length === 0) {
      return;
    }
    
    // 为每个关键问题生成解决方案
    criticalIssues.forEach(issue => {
      const solution = {
        level: 'critical',
        issueCode: issue.code,
        issue: issue.description,
        steps: this._getStepsForIssue(issue, diagnosticResults),
        expectedOutcome: this._getExpectedOutcomeForIssue(issue)
      };
      
      solutions.solutions.push(solution);
    });
  }
  
  /**
   * 针对各测试项目生成解决方案
   * @private
   */
  _generateTestSpecificSolutions(diagnosticResults, solutions) {
    const tests = diagnosticResults.tests;
    
    // 检查基本连接
    if (tests.basic && tests.basic.status === 'error') {
      solutions.solutions.push({
        level: 'critical',
        category: 'connectivity',
        issue: '网络连接失败',
        steps: [
          '检查您的设备Wi-Fi或移动数据是否已开启',
          '尝试开启飞行模式几秒钟后再关闭',
          '重启您的设备',
          '如果使用Wi-Fi，请确保路由器正常工作并且信号强度足够'
        ],
        expectedOutcome: '恢复基本网络连接，能够访问网络资源'
      });
    }
    
    // 处理高延迟问题
    if (tests.ping && tests.ping.status !== 'error' && tests.ping.averageLatency > 300) {
      solutions.solutions.push({
        level: 'warning',
        category: 'performance',
        issue: `网络延迟较高 (${tests.ping.averageLatency.toFixed(0)}ms)`,
        steps: [
          '如果使用Wi-Fi，请靠近路由器或减少中间障碍物',
          '关闭其他占用网络带宽的应用',
          '如果有多个可用Wi-Fi网络，尝试切换到信号更强的网络',
          '重启路由器'
        ],
        expectedOutcome: '网络延迟降低，应用响应更快速'
      });
    }
    
    // 处理带宽问题
    if (tests.bandwidth && tests.bandwidth.status !== 'error') {
      if (tests.bandwidth.downloadSpeed < 50) {
        solutions.solutions.push({
          level: 'warning',
          category: 'performance',
          issue: `下载速度较慢 (${tests.bandwidth.downloadSpeed.toFixed(1)} KB/s)`,
          steps: [
            '检查是否有其他应用或设备占用大量带宽',
            '如果使用Wi-Fi，尝试靠近路由器',
            '联系您的网络服务提供商确认是否有网络维护或故障',
            '考虑升级您的网络套餐'
          ],
          expectedOutcome: '提高下载速度，改善应用内容加载体验'
        });
      }
      
      if (tests.bandwidth.uploadSpeed < 25) {
        solutions.solutions.push({
          level: 'warning',
          category: 'performance',
          issue: `上传速度较慢 (${tests.bandwidth.uploadSpeed.toFixed(1)} KB/s)`,
          steps: [
            '检查是否有其他应用占用上传带宽',
            '如果使用Wi-Fi，尝试靠近路由器',
            '避开网络高峰期使用上传功能',
            '联系网络服务提供商查询上传速度限制'
          ],
          expectedOutcome: '提高上传速度，加快数据同步和图片/文件上传'
        });
      }
    }
    
    // 处理API访问问题
    if (tests.api && tests.api.status !== 'ok') {
      const failedEndpoints = tests.api.endpoints.filter(ep => !ep.success);
      
      if (failedEndpoints.length > 0) {
        solutions.solutions.push({
          level: tests.api.status === 'error' ? 'critical' : 'warning',
          category: 'connectivity',
          issue: `API服务访问问题 (${failedEndpoints.length}个端点无法访问)`,
          steps: [
            '检查您的网络连接是否正常',
            '确认您的网络不存在访问限制（如企业防火墙）',
            '尝试重启应用',
            '清除应用缓存或重新安装应用',
            '联系客服确认服务器是否正常'
          ],
          failedServices: failedEndpoints.map(ep => ep.name || ep.url),
          expectedOutcome: '恢复对所有API服务的访问，应用功能正常工作'
        });
      }
    }
    
    // 处理DNS问题
    if (tests.dns && tests.dns.status !== 'ok') {
      solutions.solutions.push({
        level: tests.dns.status === 'error' ? 'critical' : 'warning',
        category: 'connectivity',
        issue: 'DNS解析问题',
        steps: [
          '重启您的网络设备（路由器、调制解调器等）',
          '尝试切换到其他DNS服务器（如Google DNS: 8.8.8.8, 8.8.4.4）',
          '清除设备DNS缓存',
          '联系您的网络服务提供商报告DNS问题'
        ],
        expectedOutcome: '域名解析正常，能够访问所有网站和服务'
      });
    }
    
    // 处理网络稳定性问题
    if (tests.stability && tests.stability.status !== 'ok') {
      const stabilityIssue = {
        level: tests.stability.status === 'error' ? 'critical' : 'warning',
        category: 'stability',
        issue: '网络连接不稳定',
        steps: [
          '如果使用Wi-Fi，检查信号强度并靠近路由器',
          '避免在移动中或网络信号不稳定的区域使用应用',
          '检查路由器是否过热或需要重启',
          '减少同时连接到同一网络的设备数量'
        ],
        expectedOutcome: '获得更稳定的网络连接，减少断连和数据丢失'
      };
      
      if (tests.stability.jitter > 150) {
        stabilityIssue.steps.push('避免同时运行多个网络密集型应用');
        stabilityIssue.issue = `网络连接不稳定（抖动: ${tests.stability.jitter.toFixed(1)}ms）`;
      }
      
      if (tests.stability.packetLoss > 0.1) {
        stabilityIssue.steps.push('检查网络电缆连接是否松动（有线网络）');
        stabilityIssue.issue = `网络连接不稳定（丢包率: ${(tests.stability.packetLoss * 100).toFixed(1)}%）`;
      }
      
      solutions.solutions.push(stabilityIssue);
    }
  }
  
  /**
   * 添加一般性改进建议
   * @private
   */
  _addGeneralRecommendations(diagnosticResults, solutions) {
    const networkType = diagnosticResults.networkType;
    const recommendations = [];
    
    // 根据网络类型添加基本建议
    if (networkType === 'wifi') {
      recommendations.push('确保您的Wi-Fi路由器固件是最新的');
      recommendations.push('避免将路由器放置在金属物体或电子设备附近，这可能干扰信号');
      recommendations.push('考虑使用5GHz频段的Wi-Fi（如果设备支持），它通常拥有更好的性能');
    } else if (networkType === '4g' || networkType === '5g') {
      recommendations.push('在室内信号较弱的区域，考虑切换到Wi-Fi网络');
      recommendations.push('检查您的移动数据套餐是否有流量限制或速度限制');
    } else if (networkType === '3g' || networkType === '2g') {
      recommendations.push('您正在使用较慢的移动网络，建议升级到4G/5G或使用Wi-Fi获得更好体验');
      recommendations.push('如果可能，移动到信号更强的区域');
    }
    
    // 通用建议
    recommendations.push('定期重启您的网络设备（调制解调器、路由器）以保持最佳性能');
    recommendations.push('使用本应用的离线模式功能在网络不稳定时继续工作');
    recommendations.push('确保您的设备操作系统和应用是最新版本');
    
    // 将建议添加到解决方案中
    solutions.generalRecommendations = recommendations;
  }
  
  /**
   * 添加特定设备的建议
   * @private
   */
  _addDeviceSpecificSuggestions(diagnosticResults, solutions) {
    const platform = diagnosticResults.platform || '';
    const suggestions = [];
    
    if (platform.includes('iOS') || platform.includes('iPhone') || platform.includes('iPad')) {
      suggestions.push('在"设置 > Wi-Fi"中忘记并重新连接有问题的Wi-Fi网络');
      suggestions.push('检查"设置 > 通用 > VPN与设备管理"中是否有可能影响网络的配置');
      suggestions.push('尝试"设置 > 通用 > 还原 > 还原网络设置"（注意：这将删除所有Wi-Fi密码）');
    } else if (platform.includes('Android')) {
      suggestions.push('在Wi-Fi设置中长按有问题的网络并选择"忘记网络"，然后重新连接');
      suggestions.push('检查"设置 > 连接 > 数据使用"中是否有应用限制');
      suggestions.push('尝试清除网络设置缓存或重置网络设置');
    }
    
    // 通用设备建议
    suggestions.push('确保您的设备没有省电模式或低功耗模式，这可能会限制网络性能');
    suggestions.push('关闭不需要的后台应用以释放网络资源');
    
    // 将建议添加到解决方案中
    solutions.deviceSpecificSuggestions = suggestions;
  }
  
  /**
   * 根据用户技术水平调整解决方案复杂度
   * @private
   */
  _adjustForUserLevel(solutions) {
    const userLevel = this.options.userLevel;
    
    if (userLevel === 'beginner') {
      // 为初学者简化解决方案
      solutions.solutions.forEach(solution => {
        // 移除技术性步骤
        solution.steps = solution.steps.filter(step => 
          !step.includes('DNS') && 
          !step.includes('缓存') && 
          !step.includes('固件') &&
          !step.includes('配置')
        );
        
        // 添加更直观的指导
        if (solution.category === 'connectivity') {
          solution.steps.unshift('确保您的手机或平板电脑已连接到Wi-Fi或移动数据');
        }
      });
      
      // 简化一般建议
      solutions.generalRecommendations = solutions.generalRecommendations.filter(rec => 
        !rec.includes('固件') && 
        !rec.includes('5GHz频段')
      );
    } else if (userLevel === 'advanced') {
      // 为高级用户添加更技术性的解决方案
      solutions.solutions.forEach(solution => {
        if (solution.category === 'connectivity') {
          solution.steps.push('使用网络分析工具检查本地网络拥塞情况');
          solution.steps.push('检查路由器QoS设置，确保关键应用获得足够带宽');
        } else if (solution.category === 'performance') {
          solution.steps.push('考虑调整TCP/IP设置以优化网络性能');
        }
      });
      
      // 添加高级一般建议
      solutions.generalRecommendations.push('考虑使用网络分流或VPN服务优化路由');
      solutions.generalRecommendations.push('检查并优化路由器的QoS和信道设置');
    }
  }
  
  /**
   * 获取针对特定问题的解决步骤
   * @private
   */
  _getStepsForIssue(issue, diagnosticResults) {
    // 根据问题代码获取标准解决步骤
    const standardSteps = this._getStandardSteps(issue.code);
    
    if (standardSteps.length > 0) {
      return standardSteps;
    }
    
    // 如果没有预定义步骤，根据问题类型生成通用步骤
    const genericSteps = [];
    
    if (issue.code.includes('DNS')) {
      genericSteps.push('重启路由器或调制解调器');
      genericSteps.push('尝试切换到其他DNS服务器');
      genericSteps.push('联系您的网络服务提供商');
    } else if (issue.code.includes('TIMEOUT') || issue.code.includes('SLOW')) {
      genericSteps.push('检查您的网络连接速度');
      genericSteps.push('关闭其他占用带宽的应用');
      genericSteps.push('如果使用Wi-Fi，靠近路由器或减少障碍物');
    } else if (issue.code.includes('CONNECTION') || issue.code.includes('NETWORK')) {
      genericSteps.push('确认您的设备已连接到网络');
      genericSteps.push('重启您的设备');
      genericSteps.push('尝试连接到其他网络');
    }
    
    // 添加通用步骤
    genericSteps.push('重启应用');
    genericSteps.push('尝试稍后再试');
    
    return genericSteps;
  }
  
  /**
   * 获取预期结果
   * @private
   */
  _getExpectedOutcomeForIssue(issue) {
    if (issue.code.includes('DNS')) {
      return '域名解析正常，能够访问所有网站和服务';
    } else if (issue.code.includes('BANDWIDTH') || issue.code.includes('SPEED')) {
      return '网络速度提升，应用加载更快';
    } else if (issue.code.includes('CONNECTION') || issue.code.includes('ACCESS')) {
      return '网络连接恢复正常，应用功能可正常使用';
    } else if (issue.code.includes('PACKET_LOSS') || issue.code.includes('STABILITY')) {
      return '网络连接更稳定，减少断连和数据丢失';
    }
    
    return '解决网络问题，恢复应用正常运行';
  }
  
  /**
   * 获取标准解决步骤
   * @private
   */
  _getStandardSteps(issueCode) {
    // 标准解决步骤映射表
    const standardStepMap = {
      'NO_NETWORK': [
        '检查您的设备Wi-Fi或移动数据是否已开启',
        '开启并关闭飞行模式',
        '重启您的设备',
        '尝试连接到其他Wi-Fi网络'
      ],
      'DNS_RESOLUTION_FAILURE': [
        '重启您的网络设备（路由器和调制解调器）',
        '尝试切换到公共DNS服务器（如8.8.8.8）',
        '联系您的网络服务提供商报告DNS问题',
        '尝试使用移动数据而非Wi-Fi'
      ],
      'API_ACCESS_FAILURE': [
        '检查您的网络连接是否正常',
        '确认您的网络不存在访问限制（如企业防火墙）',
        '尝试重启应用',
        '清除应用缓存或重新安装应用'
      ],
      'HIGH_PACKET_LOSS': [
        '如果使用Wi-Fi，靠近路由器或减少障碍物',
        '重启您的网络设备',
        '尝试使用不同的网络连接',
        '联系您的网络服务提供商报告问题'
      ],
      'SEVERE_NETWORK_INSTABILITY': [
        '检查您的Wi-Fi信号强度',
        '避免在移动中或信号不稳定的区域使用应用',
        '重启路由器并减少同时连接的设备数量',
        '尝试连接到其他网络或使用移动数据'
      ]
    };
    
    return standardStepMap[issueCode] || [];
  }
}

// 注意：这是模拟的模板导入，实际项目中应创建这些模板文件
// 或使用内联模板替代
NetworkDiagnosisSolutionGenerator.prototype.templates = {
  basicSolutions: {},
  expertSolutions: {}
};

module.exports = NetworkDiagnosisSolutionGenerator; 