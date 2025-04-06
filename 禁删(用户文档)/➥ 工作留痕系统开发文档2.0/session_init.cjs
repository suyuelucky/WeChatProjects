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
  const indexContent = fs.readFileSync('索引.md', 'utf8');
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
    execSync(`node gen_dev_docs.cjs "${taskCode}" "${taskDescription}"`, {stdio: 'inherit'});
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
    console.error('查找前序会话失败:', err.message);
    return [];
  }
}

// 5. 生成上下文加载指南
function generateContextGuide(taskCode, taskInfo, previousSessions) {
  try {
    const guide = [
      '# 开发上下文加载指南',
      '',
      `## 当前任务: ${taskCode} - ${taskInfo.description}`,
      '',
      '## 必读文档',
      ...taskInfo.requiredDocs.map(doc => `- ${doc}`),
      '',
      '## 参考文档',
      ...taskInfo.referenceDocs.map(doc => `- ${doc}`),
      '',
      '## 前序会话知识',
      ...previousSessions.map(session => `- ${session}/README.md`),
      ...previousSessions.map(session => `- ${session}/${taskCode.charAt(0)}-会话总结.md`),
      '',
      '## 开发流程指南',
      '1. 先阅读必读文档，了解任务要求',
      '2. 再阅读前序会话知识，理解已有工作',
      '3. 研究当前代码库状态，查看相关组件和文件',
      '4. 确认开发计划并补充到开发计划文档中',
      '5. 按照小步快跑原则实现功能',
      '6. 编写并执行测试用例验证功能',
      '7. 完成知识传递文档和会话总结',
      '',
      '## 自动化验证要求',
      '所有开发工作必须通过自动化测试验证，验证步骤如下:',
      '1. 单元测试: 确保核心功能正确',
      '2. 集成测试: 确保与其他组件交互正常',
      '3. 性能测试: 确保性能满足要求',
      '4. 兼容性测试: 确保在各种环境下正常运行'
    ].join('\n');
    
    const guidePath = path.join(__dirname, 'AI开发文档', `${taskCode}-${taskInfo.description}`, 'context_guide.md');
    fs.writeFileSync(guidePath, guide);
    
    console.log(`✅ 上下文加载指南生成完毕: ${guidePath}`);
    return guidePath;
  } catch (err) {
    console.error('❌ 生成上下文加载指南失败:', err.message);
    return null;
  }
}

// 6. 生成代码库状态报告
function generateCodebaseReport(taskCode, taskInfo) {
  try {
    // 1. 获取项目目录结构
    const dirStructure = execSync('find . -type d -not -path "*/\\.*" | sort').toString();
    
    // 2. 获取关键文件列表
    const jsFiles = execSync('find . -name "*.js" -o -name "*.ts" -o -name "*.wxml" -o -name "*.wxss" | grep -v "node_modules" | sort').toString();
    
    // 3. 获取依赖信息
    let dependencies = "无法获取依赖信息";
    try {
      dependencies = execSync('cat package.json | grep -A 20 "dependencies"').toString();
    } catch (e) {
      // 可能没有package.json
    }
    
    const report = [
      '# 代码库状态报告',
      '',
      '## 目录结构',
      '```',
      dirStructure,
      '```',
      '',
      '## 关键文件',
      '```',
      jsFiles,
      '```',
      '',
      '## 依赖信息',
      '```',
      dependencies,
      '```',
      '',
      '## 当前代码状态',
      '请根据上述信息和前序会话文档，分析当前代码库状态，特别关注:',
      '1. 已实现的功能和组件',
      '2. 现有架构和设计模式',
      '3. 当前面临的技术挑战',
      '4. 与当前任务相关的已有代码'
    ].join('\n');
    
    const reportPath = path.join(__dirname, 'AI开发文档', `${taskCode}-${taskInfo.description}`, 'codebase_status.md');
    fs.writeFileSync(reportPath, report);
    
    console.log(`✅ 代码库状态报告生成完毕: ${reportPath}`);
    return reportPath;
  } catch (err) {
    console.error('❌ 生成代码库状态报告失败:', err.message);
    return null;
  }
}

// 7. 生成任务自动化指南
function generateAutomationGuide(taskCode, taskInfo) {
  try {
    const guide = [
      '# AI开发任务自动化指南',
      '',
      `## 任务: ${taskCode} - ${taskInfo.description}`,
      '',
      '## 自动化开发流程',
      '',
      '作为AI开发者，你应该按照以下完全自动化的流程开展工作:',
      '',
      '### 1. 文档阅读阶段',
      '- 首先阅读本文档(automation_guide.md)',
      '- 其次阅读上下文加载指南(context_guide.md)',
      '- 然后阅读所有必读文档和前序会话知识',
      '- 最后研究代码库状态报告',
      '',
      '### 2. 计划阶段',
      '- 自动完善开发计划文档中的所有内容',
      '- 明确分解功能点、技术方案、测试计划等',
      '- 评估工作量和潜在风险',
      '',
      '### 3. 开发阶段',
      '- 按照小步快跑原则逐个功能点实现',
      '- 每完成一个功能点，自动更新开发计划中的进度',
      '- 记录关键技术决策和实现难点',
      '',
      '### 4. 测试验证阶段',
      '- 自动为每个功能点创建测试用例',
      '- 执行测试并记录结果',
      '- 修复测试过程中发现的问题',
      '',
      '### 5. 文档总结阶段',
      '- 自动生成技术债务记录',
      '- 完成知识传递文档',
      '- 完成会话总结文档',
      '',
      '## 自动化开发规则',
      '',
      '1. **持续工作规则**: 一旦启动开发，必须自动执行全流程直至完成',
      '2. **异常处理规则**: 遇到问题自动解决，必要时向用户寻求帮助',
      '3. **质量保障规则**: 严格遵循工业级开发流程规范',
      '4. **进度汇报规则**: 每完成重要阶段自动提供简要进度报告',
      '',
      '## 自动化开发承诺',
      '',
      '作为AI开发者，我承诺:',
      '',
      '1. 我会自动执行所有必要的初始化和准备工作',
      '2. 我会自动加载和理解所有相关文档和代码',
      '3. 我会一步步实现所有功能并保证质量',
      '4. 我会创建全面的测试和验证',
      '5. 我会生成完整的文档和总结',
      '6. 整个过程将高效、自动化，无需用户频繁干预',
      '',
      '---',
      '',
      '创建日期: ' + new Date().toISOString().split('T')[0]
    ].join('\n');
    
    const guidePath = path.join(__dirname, 'AI开发文档', `${taskCode}-${taskInfo.description}`, 'automation_guide.md');
    fs.writeFileSync(guidePath, guide);
    
    console.log(`✅ AI开发任务自动化指南生成完毕: ${guidePath}`);
    return guidePath;
  } catch (err) {
    console.error('❌ 生成AI开发任务自动化指南失败:', err.message);
    return null;
  }
}

// 主流程
const taskInfo = getTaskInfo(taskCode);
const docsGenerated = generateDocuments(taskCode, taskInfo.description);
const previousSessions = findPreviousSessions();
const contextGuidePath = generateContextGuide(taskCode, taskInfo, previousSessions);
const codebaseReportPath = generateCodebaseReport(taskCode, taskInfo);
const automationGuidePath = generateAutomationGuide(taskCode, taskInfo);

console.log('\n==== 开发会话初始化完成 ====');
console.log(`任务代号: ${taskCode}`);
console.log(`任务描述: ${taskInfo.description}`);
console.log(`上下文指南: ${contextGuidePath || '生成失败'}`);
console.log(`代码库报告: ${codebaseReportPath || '生成失败'}`);
console.log(`自动化指南: ${automationGuidePath || '生成失败'}`);
console.log('\n开发者应首先阅读自动化指南和上下文加载指南，然后按照工业级流程规范自动化开展工作'); 