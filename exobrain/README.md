# AI 外脑系统

AI 外脑系统是一个为开发者设计的智能助手系统，它能够实时分析和理解开发上下文，提供智能建议和辅助功能。

## 主要功能

- 实时代码分析和上下文理解
- 智能错误检测和修复建议
- 代码依赖关系分析
- 性能监控和优化建议
- AI 辅助编程

## 系统架构

系统由以下主要组件构成：

- `CodeParser`: 代码解析器，负责解析和分析代码结构
- `ContextManager`: 上下文管理器，负责管理和协调所有组件
- `MetadataManager`: 元数据管理器，负责处理系统元数据

## 安装

```bash
npm install exobrain
```

## 使用方法

```typescript
import { ContextManager } from 'exobrain'

// 创建上下文管理器实例
const manager = new ContextManager()

// 创建新的开发上下文
const context = await manager.createContext('session-1', '/path/to/project')

// 更新文件
await manager.updateFile('session-1', '/path/to/file.ts', 'file content')

// 添加 AI 交互
await manager.addAIInteraction('session-1', {
    query: '如何优化这段代码？',
    response: 'AI 的建议...',
    relevantFiles: ['/path/to/file.ts'],
    timestamp: Date.now()
})

// 查找相似上下文
const similarContext = await manager.findSimilarContext('session-1', '优化性能')
```

## 配置

系统需要以下环境变量：

```env
OPENAI_API_KEY=your_api_key
```

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 运行测试
npm test

# 运行 lint
npm run lint
```

## 注意事项

- 确保 Node.js 版本 >= 18
- 需要有效的 OpenAI API 密钥
- 建议在开发环境中使用 TypeScript

## 许可证

MIT 