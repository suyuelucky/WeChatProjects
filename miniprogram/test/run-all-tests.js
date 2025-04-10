/**
 * 图片加载器综合测试运行器
 * 创建日期: 2025-04-11 16:05:12
 * 创建者: Claude AI 3.7 Sonnet
 * 
 * 该文件用于运行所有图片加载器的测试，并生成综合测试报告
 */

// 导入各类测试模块
const { runAllNetworkTests } = require('./run-network-tests');
const { runAllExtremeLoadTests } = require('./extreme-load-test');
const { runAllMemoryTests } = require('./run-memory-tests');
const { runAllNetworkAdaptivityTests } = require('./network-adaptability.test');

// 设置测试环境
process.env.NODE_ENV = 'test';

// 输出颜色配置
const color = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  
  // 便利函数
  bold: function(text) { return color.bright + text + color.reset; },
  error: function(text) { return color.red + text + color.reset; },
  success: function(text) { return color.green + text + color.reset; },
  warn: function(text) { return color.yellow + text + color.reset; },
  info: function(text) { return color.cyan + text + color.reset; }
};

// 输出格式化函数
function printTitle(title) {
  console.log('\n' + color.bold('='.repeat(80)));
  console.log(color.bold(' ' + title));
  console.log(color.bold('='.repeat(80)));
}

function printSubtitle(subtitle) {
  console.log('\n' + color.bold('-'.repeat(60)));
  console.log(color.bold(' ' + subtitle));
  console.log(color.bold('-'.repeat(60)));
}

function printTestResult(name, success, detail) {
  const icon = success ? '✓' : '✗';
  const textColor = success ? color.success : color.error;
  
  console.log(`  ${icon} ${textColor(name)}`);
  if (detail) {
    console.log(`    ${detail}`);
  }
}

/**
 * 运行所有测试并生成报告
 */
async function runAllTests() {
  const startTime = Date.now();
  
  printTitle('图片加载器综合测试报告');
  console.log(color.bold(`开始时间: ${new Date().toLocaleString()}`));
  console.log(color.cyan('测试环境: WeChat 小程序'));
  console.log(color.cyan('构建日期: 2025-04-11'));
  
  // 测试结果
  const results = {
    networkAdaptivity: null,
    extremeNetwork: null, 
    extremeLoad: null,
    memory: null,
    passCount: 0,
    failCount: 0,
    overallSuccess: false
  };
  
  try {
    // 1. 网络适应性测试
    printSubtitle('1. 网络适应性测试');
    console.log('测试图片加载器在不同网络环境下的适应能力...');
    results.networkAdaptivity = await runAllNetworkAdaptivityTests();
    updateTestCount(results, results.networkAdaptivity.overallSuccess);
    printTestResult('网络适应性测试', results.networkAdaptivity.overallSuccess,
                   `成功率: ${getSuccessRateFromNetworkAdaptivityResults(results.networkAdaptivity)}%`);
    
    // 2. 极端网络测试
    printSubtitle('2. 极端网络测试');
    console.log('测试图片加载器在极端网络条件下的性能...');
    results.extremeNetwork = await runAllNetworkTests();
    updateTestCount(results, results.extremeNetwork.overallSuccess);
    printTestResult('极端网络测试', results.extremeNetwork.overallSuccess,
                   `弱网成功率: ${results.extremeNetwork.extremeWeakResults.successRate.toFixed(1)}%, 恢复率: ${results.extremeNetwork.recoveryResults.recoveryRate.toFixed(1)}%`);
    
    // 3. 极端负载测试
    printSubtitle('3. 极端负载测试');
    console.log('测试图片加载器在高并发和长时间运行下的性能...');
    results.extremeLoad = await runAllExtremeLoadTests();
    updateTestCount(results, results.extremeLoad.overallSuccess);
    printTestResult('极端负载测试', results.extremeLoad.overallSuccess,
                   `并发成功率: ${results.extremeLoad.concurrencyResults.successRate.toFixed(1)}%, 内存稳定: ${results.extremeLoad.stabilityResults.isMemoryStable ? '是' : '否'}`);
    
    // 4. 内存管理测试
    printSubtitle('4. 内存管理测试');
    console.log('测试图片加载器的内存使用和泄漏检测...');
    results.memory = await runAllMemoryTests();
    updateTestCount(results, results.memory.overallSuccess);
    printTestResult('内存管理测试', results.memory.overallSuccess,
                   `基础内存稳定: ${results.memory.basicMemoryResults.isStable ? '是' : '否'}, 极限内存稳定: ${results.memory.extremeMemoryResults.isStable ? '是' : '否'}`);
    
    // 计算整体结果
    results.overallSuccess = (
      results.networkAdaptivity?.overallSuccess === true &&
      results.extremeNetwork?.overallSuccess === true &&
      results.extremeLoad?.overallSuccess === true &&
      results.memory?.overallSuccess === true
    );
    
    // 输出总结果
    const totalDuration = (Date.now() - startTime) / 1000;
    
    printTitle('测试总结');
    console.log(`测试总耗时: ${totalDuration.toFixed(2)}秒`);
    console.log(`通过测试: ${results.passCount}, 失败测试: ${results.failCount}`);
    
    if (results.overallSuccess) {
      console.log('\n' + color.bold(color.success('✓ 综合测试通过')));
      console.log(color.success('图片加载器通过所有测试，性能和稳定性符合要求。'));
    } else {
      console.log('\n' + color.bold(color.error('✗ 综合测试不通过')));
      console.log(color.error('图片加载器在某些测试中未达到预期性能，请查看详细测试结果。'));
      
      // 输出失败的测试
      console.log('\n失败的测试项:');
      if (results.networkAdaptivity && !results.networkAdaptivity.overallSuccess) {
        console.log(color.error('- 网络适应性测试'));
      }
      if (results.extremeNetwork && !results.extremeNetwork.overallSuccess) {
        console.log(color.error('- 极端网络测试'));
      }
      if (results.extremeLoad && !results.extremeLoad.overallSuccess) {
        console.log(color.error('- 极端负载测试'));
      }
      if (results.memory && !results.memory.overallSuccess) {
        console.log(color.error('- 内存管理测试'));
      }
    }
    
    console.log('\n测试完成时间:', new Date().toLocaleString());
    
    return results;
  } catch (error) {
    console.error(color.error('\n测试执行过程中发生错误:'));
    console.error(error);
    
    // 返回错误状态
    results.error = error;
    results.overallSuccess = false;
    return results;
  }
}

/**
 * 更新测试通过/失败计数
 */
function updateTestCount(results, success) {
  if (success) {
    results.passCount++;
  } else {
    results.failCount++;
  }
}

/**
 * 从网络适应性测试结果中提取成功率
 */
function getSuccessRateFromNetworkAdaptivityResults(result) {
  if (!result || !result.switchingResults) return 0;
  return result.switchingResults.successRate.toFixed(1);
}

/**
 * 生成HTML格式的测试报告
 */
function generateHTMLReport(results) {
  if (!results) return null;
  
  const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>图片加载器测试报告</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 960px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { color: #333; }
    .pass { color: green; }
    .fail { color: red; }
    .section { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
    .summary { font-weight: bold; margin: 20px 0; padding: 10px; background-color: #f5f5f5; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .overall-pass { background-color: #dff0d8; padding: 10px; border-radius: 5px; }
    .overall-fail { background-color: #f2dede; padding: 10px; border-radius: 5px; }
  </style>
</head>
<body>
  <h1>优化图片加载器测试报告</h1>
  <p>测试日期: ${new Date().toLocaleString()}</p>
  
  <div class="summary">
    <p>测试结果: <span class="${results.overallSuccess ? 'pass' : 'fail'}">${results.overallSuccess ? '通过' : '不通过'}</span></p>
    <p>通过测试: ${results.passCount}, 失败测试: ${results.failCount}</p>
  </div>
  
  <div class="section">
    <h2>1. 网络适应性测试</h2>
    <p>测试结果: <span class="${results.networkAdaptivity?.overallSuccess ? 'pass' : 'fail'}">${results.networkAdaptivity?.overallSuccess ? '通过' : '不通过'}</span></p>
    
    <table>
      <tr>
        <th>测试项目</th>
        <th>结果</th>
      </tr>
      <tr>
        <td>网络切换成功率</td>
        <td>${getSuccessRateFromNetworkAdaptivityResults(results.networkAdaptivity)}%</td>
      </tr>
    </table>
  </div>
  
  <div class="section">
    <h2>2. 极端网络测试</h2>
    <p>测试结果: <span class="${results.extremeNetwork?.overallSuccess ? 'pass' : 'fail'}">${results.extremeNetwork?.overallSuccess ? '通过' : '不通过'}</span></p>
    
    <table>
      <tr>
        <th>测试项目</th>
        <th>结果</th>
      </tr>
      <tr>
        <td>弱网环境成功率</td>
        <td>${results.extremeNetwork?.extremeWeakResults.successRate.toFixed(1)}%</td>
      </tr>
      <tr>
        <td>网络恢复成功率</td>
        <td>${results.extremeNetwork?.recoveryResults.recoveryRate.toFixed(1)}%</td>
      </tr>
    </table>
  </div>
  
  <div class="section">
    <h2>3. 极端负载测试</h2>
    <p>测试结果: <span class="${results.extremeLoad?.overallSuccess ? 'pass' : 'fail'}">${results.extremeLoad?.overallSuccess ? '通过' : '不通过'}</span></p>
    
    <table>
      <tr>
        <th>测试项目</th>
        <th>结果</th>
      </tr>
      <tr>
        <td>极限并发成功率</td>
        <td>${results.extremeLoad?.concurrencyResults.successRate.toFixed(1)}%</td>
      </tr>
      <tr>
        <td>平均加载时间</td>
        <td>${Math.round(results.extremeLoad?.concurrencyResults.avgLoadTime || 0)}ms</td>
      </tr>
      <tr>
        <td>内存稳定性</td>
        <td>${results.extremeLoad?.stabilityResults.isMemoryStable ? '稳定' : '不稳定'}</td>
      </tr>
    </table>
  </div>
  
  <div class="section">
    <h2>4. 内存管理测试</h2>
    <p>测试结果: <span class="${results.memory?.overallSuccess ? 'pass' : 'fail'}">${results.memory?.overallSuccess ? '通过' : '不通过'}</span></p>
    
    <table>
      <tr>
        <th>测试项目</th>
        <th>结果</th>
      </tr>
      <tr>
        <td>基础内存稳定性</td>
        <td>${results.memory?.basicMemoryResults.isStable ? '稳定' : '不稳定'}</td>
      </tr>
      <tr>
        <td>极限内存稳定性</td>
        <td>${results.memory?.extremeMemoryResults.isStable ? '稳定' : '不稳定'}</td>
      </tr>
      <tr>
        <td>内存回收能力</td>
        <td>${results.memory?.noClearResults.releaseRate.toFixed(1)}%</td>
      </tr>
    </table>
  </div>
  
  <div class="${results.overallSuccess ? 'overall-pass' : 'overall-fail'}">
    <h2>综合结论</h2>
    <p>${results.overallSuccess ? '图片加载器通过所有测试，性能和稳定性符合要求。' : '图片加载器在某些测试中未达到预期性能，需要进一步优化。'}</p>
  </div>
  
  <p>报告生成时间: ${new Date().toLocaleString()}</p>
</body>
</html>`;

  return htmlTemplate;
}

/**
 * 保存HTML测试报告
 */
function saveHTMLReport(html) {
  if (!html) return false;
  
  try {
    const fs = wx.getFileSystemManager();
    const reportPath = `${wx.env.USER_DATA_PATH}/test-report-${Date.now()}.html`;
    
    fs.writeFileSync(reportPath, html, 'utf8');
    console.log(color.success(`HTML测试报告已保存至: ${reportPath}`));
    return reportPath;
  } catch (error) {
    console.error('保存HTML报告失败:', error);
    return false;
  }
}

// 如果直接运行此文件，则执行所有测试
if (require.main === module) {
  runAllTests().then(results => {
    // 生成HTML报告
    const htmlReport = generateHTMLReport(results);
    if (htmlReport) {
      saveHTMLReport(htmlReport);
    }
    
    // 退出代码反映测试成功或失败
    process.exit(results.overallSuccess ? 0 : 1);
  }).catch(err => {
    console.error('测试执行失败:', err);
    process.exit(1);
  });
}

// 导出测试函数
module.exports = {
  runAllTests,
  generateHTMLReport,
  saveHTMLReport
}; 