/**
 * A1基础应用架构模块极端测试执行器
 * 
 * 该脚本用于运行极端测试套件，并输出测试结果
 * 
 * 使用方法: node run-extreme-tests.js
 * 
 * 创建日期: 2024-04-07
 */

import { runAllTests } from './extreme-test-runner-esm.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 测试配置
const config = {
  iterations: 500,        // 减少迭代次数以加快测试
  timeout: 30000,         // 超时时间30秒
  concurrency: 5,         // 并发数
  mockNetwork: true,      // 启用网络模拟
  storageLimit: 5,        // 存储限制5MB
  logLevel: 'info',       // 日志级别
  memoryLeakThreshold: 50 // 内存泄漏阈值（KB）
};

// 报告输出目录
const REPORT_DIR = path.join(__dirname, '../测试报告');

// 确保报告目录存在
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

// 将日期格式化为字符串
function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  
  return `${yyyy}${mm}${dd}-${hh}${min}`;
}

// 生成HTML报告
function generateHtmlReport(report) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A1基础应用架构模块极端测试报告</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #0066cc;
    }
    .summary {
      background-color: #f8f9fa;
      border-radius: 5px;
      padding: 15px;
      margin-bottom: 20px;
    }
    .category {
      margin-bottom: 30px;
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 15px;
    }
    .progress {
      height: 20px;
      background-color: #e9ecef;
      border-radius: 10px;
      margin-bottom: 10px;
      overflow: hidden;
    }
    .progress-bar {
      height: 100%;
      background-color: #28a745;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
    }
    .details {
      margin-top: 15px;
    }
    .test-item {
      padding: 8px;
      border-bottom: 1px solid #eee;
    }
    .test-item:nth-child(odd) {
      background-color: #f8f9fa;
    }
    .pass {
      color: #28a745;
    }
    .fail {
      color: #dc3545;
    }
    .timestamp {
      color: #6c757d;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <h1>A1基础应用架构模块极端测试报告</h1>
  <p class="timestamp">生成时间: ${new Date(report.timestamp).toLocaleString('zh-CN')}</p>
  
  <div class="summary">
    <h2>测试总结</h2>
    <div class="progress">
      <div class="progress-bar" style="width: ${report.summary.total.passRate}%">
        ${report.summary.total.passRate.toFixed(1)}%
      </div>
    </div>
    <p>总体通过率: ${report.summary.total.passRate.toFixed(1)}% (${report.summary.total.passed}/${report.summary.total.passed + report.summary.total.failed})</p>
  </div>
  
  <div class="category">
    <h2>循环依赖测试</h2>
    <div class="progress">
      <div class="progress-bar" style="width: ${report.summary.categories.circular.passRate}%">
        ${report.summary.categories.circular.passRate.toFixed(1)}%
      </div>
    </div>
    <p>通过率: ${report.summary.categories.circular.passRate.toFixed(1)}% (${report.summary.categories.circular.passed}/${report.summary.categories.circular.passed + report.summary.categories.circular.failed})</p>
    
    <div class="details">
      <h3>详细结果</h3>
      ${report.details.circular.map(item => `
        <div class="test-item">
          <span class="${item.passed ? 'pass' : 'fail'}">[${item.passed ? '通过' : '失败'}]</span>
          <strong>${item.name}:</strong> ${item.message}
        </div>
      `).join('')}
    </div>
  </div>
  
  <div class="category">
    <h2>ES6兼容性测试</h2>
    <div class="progress">
      <div class="progress-bar" style="width: ${report.summary.categories.es6.passRate}%">
        ${report.summary.categories.es6.passRate.toFixed(1)}%
      </div>
    </div>
    <p>通过率: ${report.summary.categories.es6.passRate.toFixed(1)}% (${report.summary.categories.es6.passed}/${report.summary.categories.es6.passed + report.summary.categories.es6.failed})</p>
    
    <div class="details">
      <h3>详细结果</h3>
      ${report.details.es6.map(item => `
        <div class="test-item">
          <span class="${item.passed ? 'pass' : 'fail'}">[${item.passed ? '通过' : '失败'}]</span>
          <strong>${item.name}:</strong> ${item.message}
        </div>
      `).join('')}
    </div>
  </div>
  
  <div class="category">
    <h2>事件处理机制测试</h2>
    <div class="progress">
      <div class="progress-bar" style="width: ${report.summary.categories.eventBus.passRate}%">
        ${report.summary.categories.eventBus.passRate.toFixed(1)}%
      </div>
    </div>
    <p>通过率: ${report.summary.categories.eventBus.passRate.toFixed(1)}% (${report.summary.categories.eventBus.passed}/${report.summary.categories.eventBus.passed + report.summary.categories.eventBus.failed})</p>
    
    <div class="details">
      <h3>详细结果</h3>
      ${report.details.eventBus.map(item => `
        <div class="test-item">
          <span class="${item.passed ? 'pass' : 'fail'}">[${item.passed ? '通过' : '失败'}]</span>
          <strong>${item.name}:</strong> ${item.message}
        </div>
      `).join('')}
    </div>
  </div>
  
  <div class="category">
    <h2>离线存储测试</h2>
    <div class="progress">
      <div class="progress-bar" style="width: ${report.summary.categories.storage.passRate}%">
        ${report.summary.categories.storage.passRate.toFixed(1)}%
      </div>
    </div>
    <p>通过率: ${report.summary.categories.storage.passRate.toFixed(1)}% (${report.summary.categories.storage.passed}/${report.summary.categories.storage.passed + report.summary.categories.storage.failed})</p>
    
    <div class="details">
      <h3>详细结果</h3>
      ${report.details.storage.map(item => `
        <div class="test-item">
          <span class="${item.passed ? 'pass' : 'fail'}">[${item.passed ? '通过' : '失败'}]</span>
          <strong>${item.name}:</strong> ${item.message}
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>
  `;
}

// 生成JSON报告
function saveJsonReport(report, filePath) {
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`JSON报告已保存至: ${filePath}`);
}

// 生成HTML报告
function saveHtmlReport(report, filePath) {
  const html = generateHtmlReport(report);
  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`HTML报告已保存至: ${filePath}`);
}

// 生成纯文本报告
function saveTextReport(report, filePath) {
  let text = `# A1基础应用架构模块极端测试报告\n\n`;
  text += `生成时间: ${new Date(report.timestamp).toLocaleString('zh-CN')}\n\n`;
  
  text += `## 测试总结\n\n`;
  text += `总体通过率: ${report.summary.total.passRate.toFixed(1)}% (${report.summary.total.passed}/${report.summary.total.passed + report.summary.total.failed})\n\n`;
  
  text += `## 循环依赖测试\n\n`;
  text += `通过率: ${report.summary.categories.circular.passRate.toFixed(1)}% (${report.summary.categories.circular.passed}/${report.summary.categories.circular.passed + report.summary.categories.circular.failed})\n\n`;
  text += `详细结果:\n`;
  report.details.circular.forEach(item => {
    text += `- [${item.passed ? '通过' : '失败'}] ${item.name}: ${item.message}\n`;
  });
  text += `\n`;
  
  text += `## ES6兼容性测试\n\n`;
  text += `通过率: ${report.summary.categories.es6.passRate.toFixed(1)}% (${report.summary.categories.es6.passed}/${report.summary.categories.es6.passed + report.summary.categories.es6.failed})\n\n`;
  text += `详细结果:\n`;
  report.details.es6.forEach(item => {
    text += `- [${item.passed ? '通过' : '失败'}] ${item.name}: ${item.message}\n`;
  });
  text += `\n`;
  
  text += `## 事件处理机制测试\n\n`;
  text += `通过率: ${report.summary.categories.eventBus.passRate.toFixed(1)}% (${report.summary.categories.eventBus.passed}/${report.summary.categories.eventBus.passed + report.summary.categories.eventBus.failed})\n\n`;
  text += `详细结果:\n`;
  report.details.eventBus.forEach(item => {
    text += `- [${item.passed ? '通过' : '失败'}] ${item.name}: ${item.message}\n`;
  });
  text += `\n`;
  
  text += `## 离线存储测试\n\n`;
  text += `通过率: ${report.summary.categories.storage.passRate.toFixed(1)}% (${report.summary.categories.storage.passed}/${report.summary.categories.storage.passed + report.summary.categories.storage.failed})\n\n`;
  text += `详细结果:\n`;
  report.details.storage.forEach(item => {
    text += `- [${item.passed ? '通过' : '失败'}] ${item.name}: ${item.message}\n`;
  });
  
  fs.writeFileSync(filePath, text, 'utf8');
  console.log(`文本报告已保存至: ${filePath}`);
}

// 主函数
async function main() {
  console.log('开始执行A1基础应用架构模块极端测试...');
  console.log(`测试配置: ${JSON.stringify(config)}`);
  
  try {
    // 运行测试
    const startTime = Date.now();
    const report = await runAllTests(config);
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`\n测试执行完成，耗时: ${duration.toFixed(2)}秒`);
    console.log(`总体通过率: ${report.summary.total.passRate.toFixed(1)}%`);
    
    // 生成报告文件名
    const timestamp = formatDate(new Date());
    const baseFileName = `极端测试报告-${timestamp}`;
    
    // 保存各种格式的报告
    saveJsonReport(report, path.join(REPORT_DIR, `${baseFileName}.json`));
    saveHtmlReport(report, path.join(REPORT_DIR, `${baseFileName}.html`));
    saveTextReport(report, path.join(REPORT_DIR, `${baseFileName}.md`));
    
    console.log('\n测试报告生成完毕!');
  } catch (err) {
    console.error('测试执行过程中发生错误:', err);
    process.exit(1);
  }
}

// 执行主函数
main(); 