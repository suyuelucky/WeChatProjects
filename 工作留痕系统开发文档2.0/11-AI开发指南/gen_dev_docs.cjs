/**
 * 开发文档生成器
 * 
 * 此脚本自动为开发任务生成所需的一套完整工作文档
 * 使用方法: node gen_dev_docs.cjs <任务代号> "<任务描述>"
 * 例如: node gen_dev_docs.cjs B1 "基础照片采集功能"
 */

const fs = require('fs');
const path = require('path');
const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD格式日期

// 命令行参数
const taskCode = process.argv[2];
const taskDesc = process.argv[3];

if (!taskCode || !taskDesc) {
  console.error('错误: 缺少必要参数!');
  console.log('用法: node gen_dev_docs.cjs <任务代号> "<任务描述>"');
  console.log('例如: node gen_dev_docs.cjs B1 "基础照片采集功能"');
  process.exit(1);
}

// 创建目录
const baseDir = path.join(__dirname, 'AI开发文档');
const taskDir = path.join(baseDir, `${taskCode}-${taskDesc}`);

// 目录结构
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

// 7. README文档模板
const readmeTemplate = `# ${taskCode}: ${taskDesc} 开发文档

本目录包含${taskCode}(${taskDesc})的所有开发文档，按照AI工业级开发流程规范创建。

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

- [系统架构文档](${path.relative(taskDir, path.join(__dirname, '01-系统架构设计.md'))})
- [功能模块概览](${path.relative(taskDir, path.join(__dirname, '02-功能模块概览.md'))})
- [AI工业级开发流程规范](${path.relative(taskDir, path.join(__dirname, '70-AI工业级开发流程规范.md'))})

---

创建日期: ${currentDate}
`;

// 文档模板定义
const templates = {
  // 开发计划模板
  devPlan: `# ${taskCode}: ${taskDesc} 开发计划

## 1. 任务概述

${taskDesc}是工作留痕系统的重要组成部分，负责[待补充功能描述]。

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

创建日期: ${currentDate}
`,

  // 测试用例模板
  testCase: `# ${taskCode}: ${taskDesc} 测试用例

## 基本功能测试

| 用例ID | 测试场景 | 测试步骤 | 预期结果 | 实际结果 | 通过状态 |
|-------|---------|---------|---------|---------|---------|
| BF01 | 正常操作 | 1. 步骤1<br>2. 步骤2 | [预期结果] | [待填写] | [待测试] |
| BF02 | [场景2] | 1. 步骤1<br>2. 步骤2 | [预期结果] | [待填写] | [待测试] |

## 边界条件测试

| 用例ID | 测试场景 | 测试步骤 | 预期结果 | 实际结果 | 通过状态 |
|-------|---------|---------|---------|---------|---------|
| BC01 | 边界条件1 | 1. 步骤1<br>2. 步骤2 | [预期结果] | [待填写] | [待测试] |
| BC02 | [场景2] | 1. 步骤1<br>2. 步骤2 | [预期结果] | [待填写] | [待测试] |

## 错误处理测试

| 用例ID | 测试场景 | 测试步骤 | 预期结果 | 实际结果 | 通过状态 |
|-------|---------|---------|---------|---------|---------|
| EH01 | 错误情况1 | 1. 步骤1<br>2. 步骤2 | [预期结果] | [待填写] | [待测试] |
| EH02 | [场景2] | 1. 步骤1<br>2. 步骤2 | [预期结果] | [待填写] | [待测试] |

## 性能测试

| 用例ID | 测试场景 | 测试指标 | 预期结果 | 实际结果 | 通过状态 |
|-------|---------|---------|---------|---------|---------|
| PF01 | 性能场景1 | 响应时间 | < 300ms | [待填写] | [待测试] |
| PF02 | [场景2] | [指标] | [预期结果] | [待填写] | [待测试] |

## 极端测试

| 用例ID | 测试场景 | 测试步骤 | 预期结果 | 实际结果 | 通过状态 |
|-------|---------|---------|---------|---------|---------|
| ET01 | 极端情况1 | 1. 步骤1<br>2. 步骤2 | [预期结果] | [待填写] | [待测试] |
| ET02 | [场景2] | 1. 步骤1<br>2. 步骤2 | [预期结果] | [待填写] | [待测试] |

---

创建日期: ${currentDate}
`,

  // 技术债务记录模板
  techDebt: `# ${taskCode}: ${taskDesc} 技术债务记录

## 技术债务清单

| 债务ID | 描述 | 影响范围 | 严重程度 | 建议解决时间 | 状态 |
|-------|------|---------|---------|------------|------|
| TD001 | [待填写] | [待填写] | [高/中/低] | [时间评估] | [未解决] |

## 详细描述

### TD001: [债务标题]

**问题描述**：
[详细描述问题的本质和原因]

**当前解决方案**：
[描述当前的临时解决方案]

**理想解决方案**：
[描述最佳的解决方案]

**解决影响**：
[解决此问题可能带来的好处]

**所需资源**：
[解决此问题需要的资源和时间]

**相关代码位置**：
[具体的代码文件和行号]

---

创建日期: ${currentDate}
最后更新: ${currentDate}
`,

  // 知识传递文档模板
  knowledgeTransfer: `# ${taskCode}: ${taskDesc} 知识传递文档

## 1. 背景知识

### 1.1 业务背景

[描述业务背景和需求来源]

### 1.2 技术背景

[描述相关的技术背景和约束]

## 2. 关键决策

| 决策点 | 方案选择 | 选择理由 | 替代方案 |
|-------|---------|---------|---------|
| [决策1] | [选择方案] | [理由] | [替代方案] |
| [决策2] | [选择方案] | [理由] | [替代方案] |

## 3. 学习经验

### 3.1 有效经验

[总结开发过程中的有效经验]

### 3.2 遇到的挑战

[总结开发过程中遇到的挑战]

### 3.3 教训

[总结开发过程中的教训]

## 4. 实现细节

### 4.1 关键算法

[描述实现中的关键算法]

### 4.2 重要数据结构

[描述实现中的重要数据结构]

### 4.3 易被忽视的细节

[描述容易被忽视的实现细节]

## 5. 潜在问题

[列出潜在的问题和风险]

## 6. 后续工作

[描述后续工作和改进建议]

---

创建日期: ${currentDate}
`,

  // 会话总结模板
  sessionSummary: `# ${taskCode}: ${taskDesc} 会话总结

## 基本信息
- **会话ID**: DEV-${taskCode}-01-${currentDate}
- **日期**: ${currentDate}
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

创建日期: ${currentDate}
`
};

// 生成文档
const files = [
  { path: path.join(taskDir, 'README.md'), content: readmeTemplate },
  { path: path.join(taskDir, 'dev_plan', `${taskCode}-开发计划.md`), content: templates.devPlan },
  { path: path.join(taskDir, 'test_cases', `${taskCode}-测试用例.md`), content: templates.testCase },
  { path: path.join(taskDir, 'tech_debt', `${taskCode}-技术债务.md`), content: templates.techDebt },
  { path: path.join(taskDir, 'knowledge_transfer', `${taskCode}-知识传递.md`), content: templates.knowledgeTransfer },
  { path: path.join(taskDir, `${taskCode}-会话总结.md`), content: templates.sessionSummary }
];

// 保存文件
files.forEach(file => {
  fs.writeFileSync(file.path, file.content);
  console.log(`创建文件: ${file.path}`);
});

console.log(`\n✅ ${taskCode}: ${taskDesc} 的开发文档已全部生成`);
console.log(`目录: ${taskDir}`);
console.log('\n开发文档包含:');
console.log('- 开发计划');
console.log('- 测试用例');
console.log('- 技术债务记录');
console.log('- 知识传递文档');
console.log('- 会话总结');
console.log('\n请AI助手按AI工业级开发流程规范开始开发工作。'); 