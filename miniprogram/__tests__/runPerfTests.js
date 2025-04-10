/**
 * 数据同步框架性能测试运行器
 * 
 * 创建时间: 2025年4月9日 10时56分42秒 CST
 * 创建者: Claude 3.7 Sonnet
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 性能测试配置
const config = {
  // 测试超时时间(毫秒)
  timeout: 30000,
  
  // 测试文件
  testFiles: [
    'services/SyncPerformance.test.js'
  ],
  
  // 报告文件名
  reportFile: 'perf-report.json',
  
  // 基准比较文件名
  baselineFile: 'perf-baseline.json'
};

// 性能报告
const perfReport = {
  timestamp: Date.now(),
  date: new Date().toISOString(),
  results: {},
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    improved: 0,
    degraded: 0
  },
  system: {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version
  }
};

// 记录基准比较结果
let baselineData = {};

/**
 * 加载基准数据
 */
function loadBaseline() {
  const baselinePath = path.join(__dirname, config.baselineFile);
  if (fs.existsSync(baselinePath)) {
    try {
      baselineData = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
      console.log('加载基准数据成功');
    } catch (err) {
      console.error('加载基准数据失败:', err);
    }
  } else {
    console.log('基准数据文件不存在，将创建新基准');
  }
}

/**
 * 运行性能测试
 */
function runPerformanceTests() {
  console.log('======== 开始执行性能测试 ========');
  console.log('当前时间:', new Date().toLocaleString());
  
  // 运行测试
  config.testFiles.forEach(testFile => {
    const testPath = path.join(__dirname, testFile);
    console.log(`\n执行测试: ${testFile}`);
    
    try {
      // 使用Jest运行测试，并捕获输出
      const output = execSync(`npx jest ${testPath} --no-cache --testTimeout=${config.timeout}`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      // 解析测试输出，提取性能数据
      const perfData = parseTestOutput(output);
      perfReport.results[testFile] = perfData;
      
      // 更新汇总统计
      Object.keys(perfData).forEach(metric => {
        perfReport.summary.total++;
        
        // 检查是否有基准数据进行比较
        if (baselineData.results && baselineData.results[testFile] && baselineData.results[testFile][metric]) {
          const baseline = baselineData.results[testFile][metric];
          const current = perfData[metric];
          
          // 对象类型的性能数据(包含平均值)
          if (typeof current === 'object' && current.average !== undefined) {
            const improvement = (baseline.average - current.average) / baseline.average;
            perfData[metric].improvement = improvement;
            perfData[metric].status = improvement >= 0 ? 'improved' : 'degraded';
            
            if (improvement >= 0) {
              perfReport.summary.improved++;
              perfReport.summary.passed++;
            } else {
              perfReport.summary.degraded++;
              
              // 性能下降超过20%视为失败
              if (improvement < -0.2) {
                perfReport.summary.failed++;
              } else {
                perfReport.summary.passed++;
              }
            }
          } 
          // 简单数值类型的性能数据
          else if (typeof current === 'number') {
            const improvement = (baseline - current) / baseline;
            perfData[metric] = {
              value: current,
              baseline: baseline,
              improvement: improvement,
              status: improvement >= 0 ? 'improved' : 'degraded'
            };
            
            if (improvement >= 0) {
              perfReport.summary.improved++;
              perfReport.summary.passed++;
            } else {
              perfReport.summary.degraded++;
              
              // 性能下降超过20%视为失败
              if (improvement < -0.2) {
                perfReport.summary.failed++;
              } else {
                perfReport.summary.passed++;
              }
            }
          }
        } 
        // 无基准数据，记为通过
        else {
          perfReport.summary.passed++;
        }
      });
      
      console.log(`测试完成: ${testFile}`);
    } catch (err) {
      console.error(`测试失败: ${testFile}`, err.message);
      perfReport.results[testFile] = { error: err.message };
    }
  });
  
  // 保存报告
  saveReport();
  
  // 如果没有基准或明确要求创建新基准，则保存当前结果为基准
  if (Object.keys(baselineData).length === 0) {
    saveBaseline();
  }
  
  // 打印报告摘要
  printSummary();
}

/**
 * 从测试输出中解析性能数据
 */
function parseTestOutput(output) {
  const perfData = {};
  
  // 查找性能报告部分
  const reportMatch = output.match(/===== 性能测试报告 =====\n([\s\S]*?)(?=\n\n|$)/);
  if (reportMatch && reportMatch[1]) {
    const reportLines = reportMatch[1].split('\n');
    
    reportLines.forEach(line => {
      // 解析类似 "data_save: 总时间=152ms, 平均时间=15.20ms (10次迭代)" 的行
      const complexMatch = line.match(/(\w+): 总时间=(\d+)ms, 平均时间=([0-9.]+)ms \((\d+)次迭代\)/);
      if (complexMatch) {
        const [, name, total, average, iterations] = complexMatch;
        perfData[name] = {
          total: parseInt(total, 10),
          average: parseFloat(average),
          iterations: parseInt(iterations, 10)
        };
        return;
      }
      
      // 解析类似 "init: 32ms" 的行
      const simpleMatch = line.match(/(\w+): (\d+)ms/);
      if (simpleMatch) {
        const [, name, value] = simpleMatch;
        perfData[name] = parseInt(value, 10);
      }
    });
  }
  
  return perfData;
}

/**
 * 保存性能报告
 */
function saveReport() {
  const reportPath = path.join(__dirname, config.reportFile);
  try {
    fs.writeFileSync(reportPath, JSON.stringify(perfReport, null, 2), 'utf8');
    console.log(`\n性能报告已保存至: ${reportPath}`);
  } catch (err) {
    console.error('保存性能报告失败:', err);
  }
}

/**
 * 保存基准数据
 */
function saveBaseline() {
  const baselinePath = path.join(__dirname, config.baselineFile);
  try {
    fs.writeFileSync(baselinePath, JSON.stringify(perfReport, null, 2), 'utf8');
    console.log(`基准数据已保存至: ${baselinePath}`);
  } catch (err) {
    console.error('保存基准数据失败:', err);
  }
}

/**
 * 打印报告摘要
 */
function printSummary() {
  console.log('\n======== 性能测试摘要 ========');
  console.log(`总指标数: ${perfReport.summary.total}`);
  console.log(`通过数: ${perfReport.summary.passed}`);
  console.log(`失败数: ${perfReport.summary.failed}`);
  console.log(`性能提升项: ${perfReport.summary.improved}`);
  console.log(`性能下降项: ${perfReport.summary.degraded}`);
  
  // 打印具体性能对比
  if (Object.keys(baselineData).length > 0) {
    console.log('\n性能对比:');
    
    Object.keys(perfReport.results).forEach(testFile => {
      const results = perfReport.results[testFile];
      
      Object.keys(results).forEach(metric => {
        const result = results[metric];
        
        if (typeof result === 'object' && result.improvement !== undefined) {
          const improvementPercent = (result.improvement * 100).toFixed(2);
          const status = result.improvement >= 0 ? '改进' : '下降';
          
          console.log(`  ${metric}: ${status} ${Math.abs(improvementPercent)}%`);
        }
      });
    });
  }
  
  console.log('\n======== 测试完成 ========');
}

// 主函数
function main() {
  // 加载基准数据
  loadBaseline();
  
  // 运行性能测试
  runPerformanceTests();
}

// 执行测试
main(); 