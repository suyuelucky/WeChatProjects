/**
 * AI开发会话初始化脚本
 * 自动执行整个开发流程所需的准备工作
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 参数解析
const taskCode = process.argv[2]; // 如A8
const taskDescription = process.argv[3] || "未命名任务";

// 1. 日志初始化
console.log(`开始初始化开发会话 - 任务代号: ${taskCode}`);

// 2. 任务信息获取（从索引文档）
function getTaskInfo(taskCode) {
  const indexContent = fs.readFileSync(path.join(__dirname, '索引.md'), 'utf8');
  // 从索引文档解析出任务描述、必读文档和参考文档
  const taskRegex = new RegExp(`\\| ${taskCode} \\| ([^|]+)\\| ([^|]+)\\| ([^|]+)\\|`);
  const match = indexContent.match(taskRegex);
  
  if (match) {
    return {
      description: match[1].trim(),
      requiredDocs: match[2].trim().split(',').map(d => d.trim()),
      referenceDocs: match[3].trim().split(',').map(d => d.trim())
    };
  }
  
  return {
    description: taskDescription,
    requiredDocs: ['00-README.md', '70-AI工业级开发流程规范.md'],
    referenceDocs: []
  };
}

// 3. 文档生成
function generateDocuments(taskCode, taskDescription) {
  try {
    // 运行gen_dev_docs.cjs脚本生成标准文档集
    execSync(`node ${path.join(__dirname, 'gen_dev_docs.cjs')} "${taskCode}" "${taskDescription}"`, {stdio: 'inherit'});
    console.log('✅ 开发文档生成完成');
    return true;
  } catch (err) {
    console.error('❌ 文档生成失败:', err.message);
    // 尝试使用备选方案创建文档
    return createFallbackDocuments(taskCode, taskDescription);
  }
}

// 备选文档生成方案
function createFallbackDocuments(taskCode, taskDescription) {
  console.log('尝试使用备选方案创建文档...');
  
  try {
    // 1. 创建基本目录结构
    const baseDir = path.join(__dirname, 'AI开发文档');
    const taskDir = path.join(baseDir, `${taskCode}-${taskDescription}`);
    
    const directories = [
      '',                  // 主目录
      'dev_plan',          // 开发计划
      'decision_records',  // 决策记录
      'test_cases',        // 测试用例
      'test_reports',      // 测试报告
      'tech_debt',         // 技术债务
      'knowledge_transfer' // 知识传递
    ];
    
    // 创建目录结构
    directories.forEach(dir => {
      const dirPath = path.join(taskDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`创建目录: ${dirPath}`);
      }
    });
    
    // 2. 创建最基本的README文件
    const readmeContent = `# ${taskCode}: ${taskDescription} 开发文档

本目录包含${taskCode}(${taskDescription})的所有开发文档，按照AI工业级开发流程规范创建。

## 目录结构

- [开发计划](./dev_plan/${taskCode}-开发计划.md) - 详细的开发计划和功能分解
- [测试用例](./test_cases/${taskCode}-测试用例.md) - 完整的测试用例集
- [技术债务](./tech_debt/${taskCode}-技术债务.md) - 记录开发过程中的技术债务
- [知识传递](./knowledge_transfer/${taskCode}-知识传递.md) - 重要知识和经验的传递
- [会话总结](${taskCode}-会话总结.md) - 开发会话的总结

## 使用说明

1. 开发前先阅读开发计划
2. 开发过程中实时更新进度和技术债务
3. 功能完成后执行测试用例
4. 会话结束前完成知识传递和会话总结

## 相关资源

- [系统架构文档](../../01-系统架构设计.md)
- [功能模块概览](../../02-功能模块概览.md)
- [AI工业级开发流程规范](../../70-AI工业级开发流程规范.md)

---

创建日期: ${new Date().toISOString().split('T')[0]}
`;
    
    fs.writeFileSync(path.join(taskDir, 'README.md'), readmeContent);
    console.log(`创建文件: ${path.join(taskDir, 'README.md')}`);
    
    // 3. 创建最基本的开发计划文档
    const devPlanContent = `# ${taskCode}: ${taskDescription} 开发计划

## 1. 任务概述

${taskDescription}是工作留痕系统的重要组成部分，负责[待补充功能描述]。

## 2. 功能点分解

- [ ] 功能点1: [功能点描述]
  - 预计耗时: [时间评估]
  - 技术路径: [技术方案]
  - 验收标准: [验收标准]
- [ ] 功能点2: [功能点描述]
  - 预计耗时: [时间评估]
  - 技术路径: [技术方案]
  - 验收标准: [验收标准]
- [ ] 功能点3: [功能点描述]
  - 预计耗时: [时间评估]
  - 技术路径: [技术方案]
  - 验收标准: [验收标准]

## 3. 技术方案

### 3.1 方案概述

[技术方案概述]

### 3.2 技术选型

[技术选型描述]

### 3.3 架构设计

[架构设计描述]

## 4. 潜在风险

| 风险描述 | 影响 | 可能性 | 缓解策略 |
|---------|-----|-------|---------|
| [风险1] | [高/中/低] | [高/中/低] | [缓解策略] |
| [风险2] | [高/中/低] | [高/中/低] | [缓解策略] |

## 5. 测试计划

| 测试类型 | 测试范围 | 测试方法 | 通过标准 |
|---------|---------|---------|---------|
| 单元测试 | [范围] | [方法] | [标准] |
| 集成测试 | [范围] | [方法] | [标准] |
| 性能测试 | [范围] | [方法] | [标准] |

## 6. 时间规划

| 阶段 | 开始时间 | 结束时间 | 主要任务 |
|------|---------|---------|---------|
| 准备 | [日期] | [日期] | [任务] |
| 开发 | [日期] | [日期] | [任务] |
| 测试 | [日期] | [日期] | [任务] |
| 文档 | [日期] | [日期] | [任务] |

## 7. 依赖关系

| 依赖项 | 类型 | 状态 | 负责人 |
|-------|-----|------|-------|
| [依赖1] | [内部/外部] | [状态] | [负责人] |
| [依赖2] | [内部/外部] | [状态] | [负责人] |

---

创建日期: ${new Date().toISOString().split('T')[0]}
`;
    
    fs.writeFileSync(path.join(taskDir, 'dev_plan', `${taskCode}-开发计划.md`), devPlanContent);
    console.log(`创建文件: ${path.join(taskDir, 'dev_plan', `${taskCode}-开发计划.md`)}`);
    
    // 4. 创建简单的会话总结模板
    const sessionSummaryContent = `# ${taskCode}: ${taskDescription} 会话总结

## 基本信息
- **会话ID**: DEV-${taskCode}-01-${new Date().toISOString().split('T')[0]}
- **日期**: ${new Date().toISOString().split('T')[0]}
- **开发目标**: [本次会话的目标]
- **完成状态**: [待填写]

## 完成内容
[详细描述本次会话完成的内容]

## 遇到的问题与解决方案
[描述遇到的主要问题及解决方法]

## 技术决策
[记录本次会话做出的重要技术决策]

## 未完成工作
[描述未完成的工作及原因]

## 下一步建议
[对下一个会话的工作建议]

## 附加资源
[相关的文档、代码或其他资源链接]

---

创建日期: ${new Date().toISOString().split('T')[0]}
`;
    
    fs.writeFileSync(path.join(taskDir, `${taskCode}-会话总结.md`), sessionSummaryContent);
    console.log(`创建文件: ${path.join(taskDir, `${taskCode}-会话总结.md`)}`);
    
    console.log('✅ 备选方案创建文档完成');
    return true;
  } catch (err) {
    console.error('❌ 备选方案创建文档失败:', err.message);
    return false;
  }
}

// 4. 查找前序开发会话记录
function findPreviousSessions() {
  try {
    const aiDevDocsDir = path.join(__dirname, 'AI开发文档');
    const dirs = fs.readdirSync(aiDevDocsDir).filter(
      dir => fs.statSync(path.join(aiDevDocsDir, dir)).isDirectory()
    );
    
    // 按创建时间排序，找出最近的3个会话
    const sortedDirs = dirs.sort((a, b) => {
      const statA = fs.statSync(path.join(aiDevDocsDir, a));
      const statB = fs.statSync(path.join(aiDevDocsDir, b));
      return statB.mtime.getTime() - statA.mtime.getTime();
    }).slice(0, 3);
    
    console.log('找到最近的开发会话:');
    sortedDirs.forEach(dir => console.log(`- ${dir}`));
    
    return sortedDirs;
  } catch (err) {
    console.error('找不到前序开发会话记录:', err.message);
    return [];
  }
}

// 5. 生成上下文指南
function generateContextGuide(taskCode, taskInfo, previousSessions) {
  // 项目根目录(工作留痕系统目录)的相对路径
  const projectRoot = path.resolve(__dirname, '..');
  
  const contextGuide = `# ${taskCode}: ${taskInfo.description} 开发上下文指南

## 1. 必读文档

以下是完成本任务必须阅读的核心文档:

${taskInfo.requiredDocs.map(doc => {
  // 文档可能在项目根目录，也可能在开发文档目录
  const docPath = path.join(__dirname, doc);
  const projectDocPath = path.join(projectRoot, doc);
  
  if (fs.existsSync(docPath)) {
    return `- [${doc}](${docPath})`; 
  } else if (fs.existsSync(projectDocPath)) {
    return `- [${doc}](${projectDocPath})`;
  } else {
    return `- ${doc} (找不到文件，可能需要从其他位置获取)`;
  }
}).join('\n')}

## 2. 参考文档

以下是可能对本任务有帮助的参考文档:

${taskInfo.referenceDocs.map(doc => {
  // 文档可能在项目根目录，也可能在开发文档目录
  const docPath = path.join(__dirname, doc);
  const projectDocPath = path.join(projectRoot, doc);
  
  if (fs.existsSync(docPath)) {
    return `- [${doc}](${docPath})`; 
  } else if (fs.existsSync(projectDocPath)) {
    return `- [${doc}](${projectDocPath})`;
  } else {
    return `- ${doc} (找不到文件，可能需要从其他位置获取)`;
  }
}).join('\n')}

## 3. 前序开发会话

以下是最近的相关开发会话，可查阅其代码和文档:

${previousSessions.map(session => {
  const sessionDir = path.join(__dirname, 'AI开发文档', session);
  return `- [${session}](${sessionDir})`;
}).join('\n')}

## 4. 相关代码目录

执行本任务需要了解的代码目录:

- [主程序目录](${path.join(projectRoot, 'miniprogram')})
- [云函数目录](${path.join(projectRoot, 'cloudfunctions')})
- [工具函数目录](${path.join(projectRoot, 'utils')})

## 5. 开发工具

- [自动化测试脚本](${path.join(__dirname, 'auto_test.js')})
- [会话初始化脚本](${path.join(__dirname, 'session_init.js')})

---

生成时间: ${new Date().toISOString()}
`;

  // 保存上下文指南
  const taskDir = path.join(__dirname, 'AI开发文档', `${taskCode}-${taskInfo.description}`);
  const contextGuidePath = path.join(taskDir, `${taskCode}-上下文指南.md`);
  fs.writeFileSync(contextGuidePath, contextGuide);
  console.log(`✅ 上下文指南已生成: ${contextGuidePath}`);
  
  return contextGuidePath;
}

// 6. 生成代码库报告
function generateCodebaseReport(taskCode, taskInfo) {
  try {
    // 项目根目录(工作留痕系统目录)的绝对路径
    const projectRoot = path.resolve(__dirname, '..');
    
    // 分析项目目录结构
    const codebaseReport = `# ${taskCode}: ${taskInfo.description} 代码库状态报告

## 1. 项目结构

主要目录结构:

- /miniprogram - 小程序前端代码
- /cloudfunctions - 云函数代码
- /utils - 工具函数目录
- /➥ 工作留痕系统开发文档2.0 - 开发文档目录

## 2. 相关代码模块

与本任务相关的主要代码模块:

[待AI助手根据任务代号分析补充]

## 3. 依赖关系

本任务的关键依赖:

[待AI助手根据任务代号分析补充]

## 4. 当前实现状态

已实现的相关功能:

[待AI助手根据任务代号分析补充]

待实现的相关功能:

[待AI助手根据任务代号分析补充]

## 5. 已知问题

当前代码库中与本任务相关的已知问题:

[待AI助手根据任务代号分析补充]

---

生成时间: ${new Date().toISOString()}
`;

    // 保存代码库报告
    const taskDir = path.join(__dirname, 'AI开发文档', `${taskCode}-${taskInfo.description}`);
    const reportPath = path.join(taskDir, `${taskCode}-代码库报告.md`);
    fs.writeFileSync(reportPath, codebaseReport);
    console.log(`✅ 代码库报告已生成: ${reportPath}`);
    
    return reportPath;
  } catch (err) {
    console.error('❌ 生成代码库报告失败:', err.message);
    return null;
  }
}

// 7. 生成自动化指南
function generateAutomationGuide(taskCode, taskInfo) {
  const automationGuide = `# ${taskCode}: ${taskInfo.description} 开发自动化指南

## 1. 自动化测试

执行自动化测试:

\`\`\`
node ${path.join(__dirname, 'auto_test.js')} ${taskCode}
\`\`\`

测试报告将保存在 \`AI开发文档/${taskCode}-${taskInfo.description}/test_reports\` 目录。

## 2. 进度更新

开发计划进度更新方法:

1. 打开 \`AI开发文档/${taskCode}-${taskInfo.description}/dev_plan/${taskCode}-开发计划.md\`
2. 将已完成的功能点 "[ ]" 更新为 "[x]"
3. 添加完成时间和相关注释

## 3. 技术债务记录

记录技术债务的方法:

1. 打开 \`AI开发文档/${taskCode}-${taskInfo.description}/tech_debt/${taskCode}-技术债务.md\`
2. 按照模板添加新的技术债务条目
3. 为每个技术债务条目分配唯一ID (TD001, TD002...)

## 4. 会话总结

会话结束前，更新会话总结:

1. 打开 \`AI开发文档/${taskCode}-${taskInfo.description}/${taskCode}-会话总结.md\`
2. 填写本次会话完成的内容、遇到的问题、技术决策等
3. 列出未完成工作和下一步建议

## 5. 验证与提交

代码验证和提交步骤:

1. 运行所有单元测试确保功能正常
2. 进行集成测试确保无破坏性变更
3. 更新文档和会话总结
4. 提交代码并标记为 "${taskCode}: ${taskInfo.description}"

---

生成时间: ${new Date().toISOString()}
`;

  // 保存自动化指南
  const taskDir = path.join(__dirname, 'AI开发文档', `${taskCode}-${taskInfo.description}`);
  const guidePath = path.join(taskDir, `${taskCode}-自动化指南.md`);
  fs.writeFileSync(guidePath, automationGuide);
  console.log(`✅ 自动化指南已生成: ${guidePath}`);
  
  return guidePath;
}

// 主函数
async function main() {
  console.log(`\n========== 工作留痕系统 AI开发会话初始化 ==========`);
  console.log(`任务代号: ${taskCode}`);
  console.log(`任务描述: ${taskDescription}`);
  console.log(`开始时间: ${new Date().toISOString()}`);
  console.log(`=================================================\n`);
  
  // 1. 获取任务信息
  const taskInfo = getTaskInfo(taskCode);
  console.log(`任务信息: ${taskInfo.description}`);
  console.log(`必读文档: ${taskInfo.requiredDocs.join(', ')}`);
  
  // 2. 生成开发文档
  const docsGenerated = generateDocuments(taskCode, taskInfo.description);
  
  if (docsGenerated) {
    // 3. 查找前序开发会话
    const previousSessions = findPreviousSessions();
    
    // 4. 生成上下文指南
    const contextGuidePath = generateContextGuide(taskCode, taskInfo, previousSessions);
    
    // 5. 生成代码库报告
    const codebaseReportPath = generateCodebaseReport(taskCode, taskInfo);
    
    // 6. 生成自动化指南
    const automationGuidePath = generateAutomationGuide(taskCode, taskInfo);
    
    console.log(`\n✅ 会话初始化完成！请AI助手按以下顺序执行:`);
    console.log(`1. 阅读上下文指南: ${contextGuidePath}`);
    console.log(`2. 分析代码库状态: ${codebaseReportPath}`);
    console.log(`3. 参考自动化指南: ${automationGuidePath}`);
    console.log(`4. 补充开发计划文档`);
    console.log(`5. 按小步快跑原则开始功能实现`);
  } else {
    console.error(`\n❌ 会话初始化失败，无法生成必要文档。`);
  }
}

// 执行主函数
main().catch(err => {
  console.error(`初始化过程中发生错误:`, err);
  process.exit(1);
}); 