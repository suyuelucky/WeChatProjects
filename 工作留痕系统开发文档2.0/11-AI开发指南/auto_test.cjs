/**
 * 自动化测试框架
 * 
 * 此脚本用于自动执行工作留痕系统的测试用例
 * 用法: node auto_test.cjs <任务代号>
 * 例如: node auto_test.cjs B1
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 解析命令行参数
const taskCode = process.argv[2];

if (!taskCode) {
  console.error('错误: 缺少任务代号!');
  console.log('用法: node auto_test.cjs <任务代号>');
  console.log('例如: node auto_test.cjs B1');
  process.exit(1);
}

// 项目根目录
const projectRoot = path.resolve(__dirname, '..');
const miniprogramDir = path.join(projectRoot, 'miniprogram');
const utilsDir = path.join(projectRoot, 'utils');

// 测试用例目录查找
function findTestCasePath(taskCode) {
  const devDocDir = path.join(__dirname, 'AI开发文档');
  
  // 查找匹配的任务目录
  const dirs = fs.readdirSync(devDocDir).filter(
    dir => fs.statSync(path.join(devDocDir, dir)).isDirectory() && dir.startsWith(taskCode)
  );
  
  if (dirs.length === 0) {
    console.error(`找不到任务 ${taskCode} 的开发目录`);
    return null;
  }
  
  // 使用最新的目录
  const taskDir = dirs.sort((a, b) => {
    const statA = fs.statSync(path.join(devDocDir, a));
    const statB = fs.statSync(path.join(devDocDir, b));
    return statB.mtime.getTime() - statA.mtime.getTime();
  })[0];
  
  // 测试用例文件路径
  const testCasePath = path.join(devDocDir, taskDir, 'test_cases', `${taskCode}-测试用例.md`);
  
  if (!fs.existsSync(testCasePath)) {
    console.error(`找不到任务 ${taskCode} 的测试用例文件: ${testCasePath}`);
    return null;
  }
  
  return { taskDir, testCasePath };
}

// 解析测试用例文件
function parseTestCases(testCasePath) {
  console.log(`解析测试用例文件: ${testCasePath}`);
  
  const content = fs.readFileSync(testCasePath, 'utf8');
  const testCases = [];
  
  // 解析Markdown表格中的测试用例
  const tableRegex = /\| ([A-Z]+\d+) \| (.*?) \| (.*?) \| (.*?) \| .*? \| .*? \|/g;
  let match;
  
  while ((match = tableRegex.exec(content)) !== null) {
    const [_, id, scenario, steps, expected] = match;
    if (id === '用例ID') continue; // 跳过表头
    
    testCases.push({
      id,
      scenario: scenario.trim(),
      steps: steps.trim().replace(/<br>/g, '\n'),
      expected: expected.trim()
    });
  }
  
  console.log(`找到 ${testCases.length} 个测试用例`);
  return testCases;
}

// 准备测试环境
function prepareTestEnvironment() {
  console.log('准备测试环境...');
  
  // 检查项目结构
  if (!fs.existsSync(miniprogramDir)) {
    console.error(`找不到小程序目录: ${miniprogramDir}`);
    return false;
  }
  
  // 检查是否有必要的测试工具
  try {
    // 创建临时测试目录
    const tempTestDir = path.join(projectRoot, 'temp_test');
    if (!fs.existsSync(tempTestDir)) {
      fs.mkdirSync(tempTestDir);
    }
    
    console.log('✅ 测试环境准备完成');
    return true;
  } catch (err) {
    console.error('❌ 测试环境准备失败:', err.message);
    return false;
  }
}

// 执行测试用例
function runTestCase(testCase) {
  console.log(`\n执行测试: ${testCase.id} - ${testCase.scenario}`);
  console.log(`测试步骤:\n${testCase.steps}`);
  console.log(`预期结果: ${testCase.expected}`);
  
  let result = {
    status: '待完成',
    output: '需要人工执行此测试用例',
    error: null
  };
  
  // 根据测试用例类型执行不同的测试
  if (testCase.id.startsWith('BF')) {
    // 基本功能测试 - 需要人工执行
    result.output = '基本功能测试需要在小程序环境中人工执行';
  } else if (testCase.id.startsWith('BC')) {
    // 边界条件测试 - 部分可自动化
    result.output = '边界条件测试需要人工验证';
  } else if (testCase.id.startsWith('EH')) {
    // 错误处理测试 - 部分可自动化
    result.output = '错误处理测试需要人工验证';
  } else if (testCase.id.startsWith('PF')) {
    // 性能测试 - 可自动化
    try {
      result.output = '性能测试需要在实际环境中执行';
      result.status = '待验证';
    } catch (err) {
      result.status = '失败';
      result.error = err.message;
    }
  } else if (testCase.id.startsWith('ET')) {
    // 极端测试 - 需要特殊环境
    result.output = '极端测试需要在特定环境中执行';
  }
  
  return result;
}

// 生成测试报告
function generateTestReport(taskDir, taskCode, testCases, results) {
  console.log('\n生成测试报告...');
  
  const reportDir = path.join(taskDir, 'test_reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir);
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportDir, `${taskCode}-测试报告-${timestamp}.md`);
  
  const reportContent = [
    `# ${taskCode} 自动化测试报告`,
    '',
    `- **测试时间**: ${new Date().toISOString()}`,
    `- **测试环境**: 自动化测试框架`,
    `- **测试用例数**: ${testCases.length}`,
    '',
    '## 测试结果汇总',
    '',
    '| 类型 | 总数 | 通过 | 失败 | 待验证 |',
    '|------|------|------|------|--------|',
  ];
  
  // 统计不同类型的测试结果
  const stats = {
    'BF': { total: 0, pass: 0, fail: 0, pending: 0 },
    'BC': { total: 0, pass: 0, fail: 0, pending: 0 },
    'EH': { total: 0, pass: 0, fail: 0, pending: 0 },
    'PF': { total: 0, pass: 0, fail: 0, pending: 0 },
    'ET': { total: 0, pass: 0, fail: 0, pending: 0 }
  };
  
  testCases.forEach((testCase, index) => {
    const result = results[index];
    const type = testCase.id.slice(0, 2);
    
    stats[type].total++;
    if (result.status === '通过') stats[type].pass++;
    else if (result.status === '失败') stats[type].fail++;
    else stats[type].pending++;
  });
  
  // 添加统计结果到报告
  Object.keys(stats).forEach(type => {
    const { total, pass, fail, pending } = stats[type];
    if (total > 0) {
      let typeName = '';
      switch (type) {
        case 'BF': typeName = '基本功能'; break;
        case 'BC': typeName = '边界条件'; break;
        case 'EH': typeName = '错误处理'; break;
        case 'PF': typeName = '性能测试'; break;
        case 'ET': typeName = '极端测试'; break;
      }
      reportContent.push(`| ${typeName} | ${total} | ${pass} | ${fail} | ${pending} |`);
    }
  });
  
  // 添加详细测试结果
  reportContent.push('', '## 详细测试结果', '');
  
  testCases.forEach((testCase, index) => {
    const result = results[index];
    reportContent.push(`### ${testCase.id}: ${testCase.scenario}`, '');
    reportContent.push('**步骤**:', testCase.steps.replace(/\n/g, '<br>'), '');
    reportContent.push('**预期结果**:', testCase.expected, '');
    reportContent.push('**实际结果**:', result.output, '');
    reportContent.push('**状态**: ' + result.status, '');
    if (result.error) {
      reportContent.push('**错误信息**:', '```', result.error, '```', '');
    }
    reportContent.push('---', '');
  });
  
  // 写入报告文件
  fs.writeFileSync(reportPath, reportContent.join('\n'));
  console.log(`✅ 测试报告已生成: ${reportPath}`);
  
  return reportPath;
}

// 主函数
async function main() {
  console.log(`开始执行任务 ${taskCode} 的自动化测试...\n`);
  
  // 1. 查找测试用例路径
  const pathInfo = findTestCasePath(taskCode);
  if (!pathInfo) {
    console.error('❌ 无法继续测试');
    process.exit(1);
  }
  
  const { taskDir, testCasePath } = pathInfo;
  
  // 2. 解析测试用例
  const testCases = parseTestCases(testCasePath);
  if (testCases.length === 0) {
    console.error('❌ 未找到可执行的测试用例');
    process.exit(1);
  }
  
  // 3. 准备测试环境
  const environmentReady = prepareTestEnvironment();
  if (!environmentReady) {
    console.error('❌ 环境准备失败，无法继续测试');
    process.exit(1);
  }
  
  // 4. 执行测试用例
  console.log(`\n开始执行 ${testCases.length} 个测试用例...`);
  const results = [];
  
  for (const testCase of testCases) {
    const result = runTestCase(testCase);
    results.push(result);
  }
  
  // 5. 生成测试报告
  const reportPath = generateTestReport(taskDir, taskCode, testCases, results);
  
  console.log('\n测试执行完成!');
  console.log(`- 总计测试: ${testCases.length} 个用例`);
  console.log(`- 通过: ${results.filter(r => r.status === '通过').length} 个用例`);
  console.log(`- 失败: ${results.filter(r => r.status === '失败').length} 个用例`);
  console.log(`- 待验证: ${results.filter(r => r.status === '待验证' || r.status === '待完成').length} 个用例`);
  console.log(`- 测试报告: ${reportPath}`);
}

// 执行主函数
main().catch(err => {
  console.error('执行测试过程中发生错误:', err);
  process.exit(1);
}); 