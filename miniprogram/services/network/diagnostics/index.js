/**
 * 网络诊断工具模块
 * 提供网络诊断、分析和解决方案生成功能
 * 
 * 创建时间: 2025-04-08 20:42:15
 * 创建者: Claude 3.7 Sonnet
 */

const NetworkDiagnosticTool = require('./NetworkDiagnosticTool');
const NetworkDiagnosisSolutionGenerator = require('./NetworkDiagnosisSolutionGenerator');

/**
 * 创建网络诊断服务实例
 * @param {Object} options - 诊断工具配置选项
 * @param {Object} solutionOptions - 解决方案生成器配置选项
 * @return {Object} 包含诊断工具和解决方案生成器的服务对象
 */
function createNetworkDiagnosticService(options = {}, solutionOptions = {}) {
  const diagnosticTool = new NetworkDiagnosticTool(options);
  const solutionGenerator = new NetworkDiagnosisSolutionGenerator(solutionOptions);
  
  // 确保诊断工具初始化
  diagnosticTool.initialize();
  
  // 创建简化的API
  return {
    // 诊断工具相关方法
    runFullDiagnosis: async () => {
      return await diagnosticTool.runDiagnostics();
    },
    
    runSpecificTest: async (testName) => {
      return await diagnosticTool.runSpecificTest(testName);
    },
    
    getDiagnosticResults: () => {
      return diagnosticTool.getDiagnosticResults();
    },
    
    getIssues: () => {
      return diagnosticTool.getIssues();
    },
    
    getSummary: () => {
      return diagnosticTool.getSummary();
    },
    
    // 解决方案生成器相关方法
    generateSolutions: (diagnosticResults) => {
      return solutionGenerator.generateSolutions(diagnosticResults);
    },
    
    // 便捷方法：运行诊断并生成解决方案
    runDiagnosisAndGenerateSolutions: async () => {
      const diagnosticResults = await diagnosticTool.runDiagnostics();
      return {
        diagnosticResults,
        solutions: solutionGenerator.generateSolutions(diagnosticResults)
      };
    },
    
    // 获取原始实例以便访问更多高级功能
    getDiagnosticTool: () => diagnosticTool,
    getSolutionGenerator: () => solutionGenerator
  };
}

// 导出模块组件
module.exports = {
  NetworkDiagnosticTool,
  NetworkDiagnosisSolutionGenerator,
  createNetworkDiagnosticService
}; 