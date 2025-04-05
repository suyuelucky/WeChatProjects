# 拍照写留痕和编辑页开发计划

## 文档信息
- **版本**：v1.0.2
- **日期**：2025-03-30
- **状态**：修订中
- **环境**：微信小程序 + 腾讯云托管
- **安全等级**：高
- **更新记录**：
  * v1.0.0 - 2025-03-30 - 初始版本
  * v1.0.1 - 2025-03-30 - 增加详细实现
  * v1.0.2 - 2025-03-30 - 完善开发流程

## 项目结构设计

```
miniprogram/
├── components/
│   ├── photo-capture/       # 拍照相关组件
│   ├── photo-editor/        # 照片编辑组件
│   ├── voice-input/         # 语音输入组件
│   └── rich-text/          # 富文本编辑组件
├── pages/
│   ├── photo-edit/         # 拍照编辑主页面
│   └── preview/            # 预览页面
├── services/
│   ├── cloud/              # 云服务接口
│   ├── storage/            # 存储服务
│   └── ai/                 # AI服务接口
└── utils/
    ├── file/              # 文件处理工具
    ├── image/             # 图片处理工具
    └── network/           # 网络请求工具
```

## 开发环境准备

### 1. 环境配置清单
- Node.js v18.15.0（强制要求）
- 微信开发者工具 Stable 1.06.2403020
- Git 2.43.0
- VSCode 1.87.0 + 必要插件：
  * ESLint
  * Prettier
  * WeChat Mini Program
  * Git Lens
  * Error Lens

### 2. 本地开发环境标准化

#### DevBox 配置
```toml
# devbox.json
{
  "packages": [
    "nodejs@18.15.0",
    "git@2.43.0",
    "python@3.11",
    "watchman@2024.03.18.00",
    "redis@7.2.4"
  ],
  "shell": {
    "init_hook": [
      "echo 'DevBox 环境已启动'",
      "node -v"
    ],
    "scripts": {
      "dev": "npm run dev",
      "test": "npm run test",
      "build": "npm run build",
      "clean": "rm -rf node_modules && rm -rf dist"
    }
  }
}
```

#### 开发环境启动流程
```bash
# 1. 启动devbox环境
devbox shell

# 2. 安装依赖
npm ci

# 3. 启动本地服务
npm run dev

# 4. 启动开发工具
devbox services start
```

#### 本地开发服务
1. **Redis缓存服务**：
   ```yaml
   # docker-compose.yml
   version: '3.8'
   services:
     redis:
       image: redis:7.2.4
       ports:
         - "6379:6379"
       volumes:
         - ./data/redis:/data
       command: redis-server --appendonly yes
   ```

2. **Mock服务**：
   ```js
   // mock/index.js
   module.exports = {
     'GET /api/photos': (req, res) => {
       res.json({
         status: 'success',
         data: [
           // 模拟数据
         ]
       })
     }
   }
   ```

3. **本地调试工具**：
   ```js
   // debug/index.js
   class LocalDebugger {
     static init() {
       // 初始化本地调试环境
       this.setupMockData()
       this.setupDevTools()
       this.setupPerformanceMonitor()
     }

     static setupMockData() {
       // 设置模拟数据
     }

     static setupDevTools() {
       // 配置开发工具
     }

     static setupPerformanceMonitor() {
       // 设置性能监控
     }
   }
   ```

#### 环境隔离方案
1. **多环境配置**：
   ```js
   // config/index.js
   const envConfigs = {
     development: {
       baseUrl: 'http://localhost:3000',
       mockEnabled: true,
       debugEnabled: true
     },
     testing: {
       baseUrl: 'https://test-api.example.com',
       mockEnabled: false,
       debugEnabled: true
     },
     production: {
       baseUrl: 'https://api.example.com',
       mockEnabled: false,
       debugEnabled: false
     }
   }
   ```

2. **环境切换机制**：
   ```js
   // scripts/switch-env.js
   const switchEnv = async (env) => {
     // 1. 备份当前环境数据
     await backupEnvData()
     
     // 2. 切换环境配置
     process.env.NODE_ENV = env
     
     // 3. 重置开发环境
     await resetDevEnv()
     
     // 4. 启动新环境服务
     await startEnvServices()
   }
   ```

#### 开发工具链
1. **代码生成器**：
   ```js
   // tools/generator/index.js
   class CodeGenerator {
     static async generateComponent(name, options) {
       // 生成组件模板
     }

     static async generatePage(name, options) {
       // 生成页面模板
     }

     static async generateTest(name, options) {
       // 生成测试模板
     }
   }
   ```

2. **开发辅助工具**：
   ```js
   // tools/helper/index.js
   class DevHelper {
     static async checkEnv() {
       // 检查环境配置
     }

     static async validateConfig() {
       // 验证配置有效性
     }

     static async setupDevTools() {
       // 配置开发工具
     }
   }
   ```

#### 缓存清理机制
```bash
# scripts/clean.sh
#!/bin/bash

# 清理本地缓存
function cleanCache() {
    echo "清理本地缓存..."
    rm -rf ./temp/*
    rm -rf ./node_modules/.cache
    rm -rf ./dist
}

# 清理开发工具缓存
function cleanDevToolsCache() {
    echo "清理开发工具缓存..."
    rm -rf ~/Library/Application\ Support/微信开发者工具/Cache
}

# 重置数据库
function resetDatabase() {
    echo "重置本地数据库..."
    redis-cli FLUSHALL
}

# 主函数
function main() {
    cleanCache
    cleanDevToolsCache
    resetDatabase
    echo "缓存清理完成"
}

main
```

#### 开发环境检查清单
```js
// scripts/check-env.js
const checkList = [
  {
    name: 'Node.js版本',
    check: async () => {
      const version = process.version
      return version === 'v18.15.0'
    }
  },
  {
    name: 'DevBox状态',
    check: async () => {
      // 检查DevBox运行状态
    }
  },
  {
    name: '依赖完整性',
    check: async () => {
      // 检查package.json与node_modules一致性
    }
  },
  {
    name: '开发工具配置',
    check: async () => {
      // 检查开发工具配置
    }
  },
  {
    name: '本地服务状态',
    check: async () => {
      // 检查Redis等服务状态
    }
  }
]
```

### 2. 腾讯云资源准备
- 云托管环境ID：[待配置]
- 对象存储：
  * 存储桶：[需要在腾讯云控制台创建并配置]
  * 地域：[需要根据项目实际情况选择]
  * 访问权限：[需要配置]
  * 生命周期规则：[需要配置]
- AI服务：
  * 语音识别服务：[需要开通并配置]
  * OCR服务：[需要开通并配置]
  * 图像处理服务：[需要开通并配置]
- CDN服务：
  * 加速域名：[需要配置]
  * HTTPS证书：[需要配置]

注意：以上配置信息需要在实际开发环境中获取和设置，禁止使用虚构的配置信息。在开发之前，需要：
1. 在腾讯云控制台完成相关服务开通
2. 获取实际的配置信息
3. 使用环境变量或配置文件管理这些敏感信息
4. 在不同环境（开发、测试、生产）中使用不同的配置

### 3. 监控系统部署
- 性能监控：
  * 小程序实时监控
  * 服务器监控
  * 数据库监控
- 错误追踪：
  * 前端错误日志
  * 服务端错误日志
  * 用户行为追踪
- 告警机制：
  * 钉钉机器人
  * 邮件通知
  * 短信告警

## 开发流程规范

### 1. 代码管理规范
- 分支策略：
  * master：生产环境分支
  * develop：开发主分支
  * feature/*：功能分支
  * hotfix/*：紧急修复分支
  * release/*：发布分支

- 提交规范：
  ```
  <type>(<scope>): <subject>

  <body>

  <footer>
  ```
  type类型：
  * feat：新功能
  * fix：修复
  * docs：文档
  * style：格式
  * refactor：重构
  * test：测试
  * chore：构建

### 2. 开发会话交接规范

#### 会话前准备
1. **环境检查**：
   ```bash
   # 检查Node.js版本
   node -v | grep "v18.15.0"
   
   # 检查依赖完整性
   npm ci
   
   # 检查云环境连接
   wx cloud init --env prod-6gkt60ur787b10ad
   ```

2. **分支准备**：
   ```bash
   # 创建功能分支
   git checkout -b feature/photo-capture-${sessionId}
   
   # 更新依赖
   npm update
   ```

3. **状态检查**：
   ```bash
   # 检查服务状态
   curl -I https://api.example.com/health
   
   # 检查数据库连接
   wx cloud database ping
   ```

#### 会话开发过程

1. **验证驱动开发（VDD）机制**：
   ```js
   // 验证管理器
   class ValidationManager {
     static async validate(context) {
       const validationPoints = this.getValidationPoints(context)
       
       for (const point of validationPoints) {
         // 执行验证前检查
         await this.preValidate(point)
         
         // 执行验证
         const result = await this.executeValidation(point)
         
         // 验证失败处理
         if (!result.success) {
           await this.handleValidationFailure(result)
           return false
         }
         
         // 验证成功记录
         await this.logValidationSuccess(point, result)
       }
       
       return true
     }
     
     static getValidationPoints(context) {
       // 根据上下文动态确定验证点
       return [
         // 1. 代码级验证点
         {
           type: 'code',
           triggers: ['function', 'class', 'component'],
           validators: ['lint', 'test', 'type-check']
         },
         // 2. 功能级验证点
         {
           type: 'feature',
           triggers: ['api', 'ui', 'interaction'],
           validators: ['unit-test', 'integration-test', 'e2e-test']
         },
         // 3. 性能级验证点
         {
           type: 'performance',
           triggers: ['render', 'network', 'storage'],
           validators: ['metrics', 'profiling', 'monitoring']
         }
       ]
     }
   }
   ```

2. **实时验证触发器**：
   ```js
   // 验证触发器
   class ValidationTrigger {
     constructor() {
       this.observers = new Map()
       this.thresholds = {
         codeChange: 20,    // 20行代码改动
         timeElapsed: 300,  // 5分钟
         functionComplete: true,
         componentMount: true,
         apiIntegration: true
       }
     }
     
     async check(event) {
       const { type, data } = event
       
       switch (type) {
         case 'code-change':
           if (data.lines >= this.thresholds.codeChange) {
             await this.triggerValidation('code')
           }
           break
           
         case 'function-complete':
           if (this.thresholds.functionComplete) {
             await this.triggerValidation('function')
           }
           break
           
         case 'component-mount':
           if (this.thresholds.componentMount) {
             await this.triggerValidation('component')
           }
           break
           
         case 'api-integration':
           if (this.thresholds.apiIntegration) {
             await this.triggerValidation('api')
           }
           break
       }
     }
     
     async triggerValidation(type) {
       const validators = this.observers.get(type) || []
       for (const validator of validators) {
         await validator.validate()
       }
     }
   }
   ```

3. **验证执行器**：
   ```js
   // 验证执行器
   class Validator {
     static async validateCode(context) {
       // 1. 语法检查
       const lintResult = await this.runLint(context.files)
       if (!lintResult.success) return lintResult
       
       // 2. 类型检查
       const typeResult = await this.runTypeCheck(context.files)
       if (!typeResult.success) return typeResult
       
       // 3. 单元测试
       const testResult = await this.runUnitTest(context.files)
       if (!testResult.success) return testResult
       
       // 4. 代码质量检查
       const qualityResult = await this.runQualityCheck(context.files)
       if (!qualityResult.success) return qualityResult
       
       return { success: true }
     }
     
     static async validateFeature(context) {
       // 1. 功能完整性检查
       const completenessResult = await this.checkCompleteness(context.feature)
       if (!completenessResult.success) return completenessResult
       
       // 2. 接口一致性检查
       const interfaceResult = await this.checkInterface(context.feature)
       if (!interfaceResult.success) return interfaceResult
       
       // 3. 集成测试
       const integrationResult = await this.runIntegrationTest(context.feature)
       if (!integrationResult.success) return integrationResult
       
       return { success: true }
     }
     
     static async validatePerformance(context) {
       // 1. 性能指标检查
       const metricsResult = await this.checkMetrics(context.performance)
       if (!metricsResult.success) return metricsResult
       
       // 2. 资源使用检查
       const resourceResult = await this.checkResources(context.performance)
       if (!resourceResult.success) return resourceResult
       
       // 3. 响应时间检查
       const responseResult = await this.checkResponseTime(context.performance)
       if (!responseResult.success) return responseResult
       
       return { success: true }
     }
   }
   ```

4. **验证报告生成器**：
   ```js
   // 验证报告生成器
   class ValidationReporter {
     static async generateReport(results) {
       const report = {
         timestamp: new Date().toISOString(),
         summary: {
           total: results.length,
           passed: results.filter(r => r.success).length,
           failed: results.filter(r => !r.success).length
         },
         details: results.map(r => ({
           type: r.type,
           status: r.success ? 'passed' : 'failed',
           duration: r.duration,
           errors: r.errors || [],
           warnings: r.warnings || [],
           metrics: r.metrics || {}
         }))
       }
       
       // 保存报告
       await this.saveReport(report)
       
       // 发送通知
       await this.notifyTeam(report)
       
       return report
     }
   }
   ```

5. **验证示例**：
   ```js
   // 照片上传功能验证
   class PhotoUploadValidator {
     static async validate() {
       // 1. 选择照片验证
       await this.validatePhotoSelection({
         maxSize: 10 * 1024 * 1024,
         formats: ['jpg', 'png', 'gif'],
         quality: 0.8
       })
       
       // 2. 压缩处理验证
       await this.validateCompression({
         targetSize: 2 * 1024 * 1024,
         minQuality: 0.6,
         maxQuality: 0.9
       })
       
       // 3. 上传功能验证
       await this.validateUpload({
         timeout: 30000,
         retries: 3,
         concurrent: 2
       })
       
       // 4. 存储验证
       await this.validateStorage({
         persistence: true,
         encryption: true,
         backup: true
       })
     }
   }
   
   // 照片编辑功能验证
   class PhotoEditValidator {
     static async validate() {
       // 1. 基础编辑功能验证
       await this.validateBasicEdits({
         crop: true,
         rotate: true,
         filter: true
       })
       
       // 2. 高级编辑功能验证
       await this.validateAdvancedEdits({
         masking: true,
         layering: true,
         effects: true
       })
       
       // 3. 编辑历史验证
       await this.validateHistory({
         undo: true,
         redo: true,
         snapshot: true
       })
       
       // 4. 性能验证
       await this.validatePerformance({
         responseTime: 100,
         memoryUsage: 150 * 1024 * 1024,
         fps: 60
       })
     }
   }
   ```

#### 会话交接流程

1. **代码交接**：
   ```bash
   # 提交前检查
   npm run lint
   npm run test
   npm run build
   
   # 提交代码
   git add .
   git commit -m "feat(photo): complete photo capture function
   
   - Add photo capture component
   - Implement cloud storage
   - Add unit tests
   
   Resolves: #123"
   
   # 推送到远程
   git push origin feature/photo-capture-${sessionId}
   ```

2. **文档交接**：
   - 更新API文档
   - 更新测试用例
   - 更新开发日志
   - 记录已知问题
   - 更新性能报告

3. **环境交接**：
   ```bash
   # 清理开发环境
   npm run clean
   
   # 备份本地数据
   npm run backup
   
   # 重置测试数据
   npm run reset-test-data
   ```

4. **状态交接**：
   - 当前功能完成度
   - 未解决的问题
   - 性能瓶颈
   - 待优化点
   - 风险提示

### 3. 验证流程规范

#### 功能验证
1. **单元测试**：
   ```js
   describe('PhotoCapture Component', () => {
     beforeEach(async () => {
       // 初始化测试环境
       await TestEnvironment.init()
     })
     
     test('should capture photo correctly', async () => {
       // 准备测试数据
       const mockPhoto = await TestData.createMockPhoto()
       
       // 执行测试
       const result = await PhotoCapture.take()
       
       // 验证结果
       expect(result).toMatchSnapshot()
       expect(result.size).toBeLessThan(MAX_PHOTO_SIZE)
     })
     
     afterEach(async () => {
       // 清理测试数据
       await TestEnvironment.cleanup()
     })
   })
   ```

2. **集成测试**：
   ```js
   describe('Photo Edit Flow', () => {
     test('should complete full edit flow', async () => {
       // 模拟用户操作
       await UserFlow.simulatePhotoCapture()
       await UserFlow.simulatePhotoEdit()
       await UserFlow.simulatePhotoSave()
       
       // 验证数据一致性
       const savedPhoto = await Storage.getPhoto()
       expect(savedPhoto).toMatchSchema(PhotoSchema)
     })
   })
   ```

3. **性能测试**：
   ```js
   class PerformanceTest {
     static async run() {
       // 测试页面加载性能
       const loadMetrics = await this.testPageLoad()
       
       // 测试照片处理性能
       const processMetrics = await this.testPhotoProcess()
       
       // 测试内存占用
       const memoryMetrics = await this.testMemoryUsage()
       
       return this.generateReport({
         load: loadMetrics,
         process: processMetrics,
         memory: memoryMetrics
       })
     }
   }
   ```

#### 发布验证
1. **预发布检查**：
   ```bash
   # 构建检查
   npm run build:check
   
   # 依赖审计
   npm audit
   
   # 代码质量检查
   sonar-scanner
   ```

2. **灰度发布**：
   ```js
   class GrayRelease {
     static async deploy() {
       // 部署到灰度环境
       await this.deployToGray()
       
       // 监控灰度效果
       await this.monitorGray()
       
       // 分析灰度数据
       const report = await this.analyzeGrayData()
       
       // 决策是否继续发布
       return this.makeDecision(report)
     }
   }
   ```

3. **回滚机制**：
   ```js
   class Rollback {
     static async execute(version) {
       // 保存当前状态
       await this.backup()
       
       // 执行回滚
       await this.rollback(version)
       
       // 验证回滚结果
       await this.verify()
       
       // 恢复相关服务
       await this.recoverServices()
     }
   }
   ```

### 4. 监控与维护规范

#### 实时监控
1. **性能监控**：
   - 页面加载时间 < 3秒
   - API响应时间 < 1秒
   - 内存占用 < 150MB
   - CPU使用率 < 60%
   - 帧率 >= 60fps

2. **错误监控**：
   - JS错误率 < 0.1%
   - API错误率 < 0.01%
   - 崩溃率 < 0.001%

3. **用户体验监控**：
   - 页面跳转延迟 < 100ms
   - 图片加载时间 < 1秒
   - 操作响应时间 < 200ms

#### 应急处理
1. **问题分级**：
   - P0：系统崩溃
   - P1：主要功能不可用
   - P2：功能部分异常
   - P3：体验问题

2. **响应时间**：
   - P0：立即响应，30分钟内解决
   - P1：2小时内响应，4小时内解决
   - P2：24小时内响应，48小时内解决
   - P3：72小时内响应，一周内解决

3. **恢复流程**：
   ```js
   class EmergencyRecovery {
     static async recover(level) {
       // 问题定位
       const issue = await this.locateIssue()
       
       // 应用临时修复
       await this.applyHotfix()
       
       // 验证修复效果
       await this.verifyFix()
       
       // 制定长期解决方案
       return this.prepareLongTermSolution()
     }
   }
   ```

## 具体会话实现

### 会话1.1：项目初始化与配置

**目标**：搭建基础项目框架，完成必要的配置和依赖安装。

**输入**：
- 项目需求文档
- 微信小程序开发工具
- Node.js v18.15.0环境

**工作内容**：

1. 项目基础结构创建
```js
// app.js
App({
  globalData: {
    // 全局配置
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
    // 腾讯云配置
    cloudEnv: process.env.CLOUD_ENV_ID,
    // 存储配置
    storage: {
      maxPhotoSize: process.env.MAX_PHOTO_SIZE || 10 * 1024 * 1024, // 默认10MB
      compressQuality: process.env.COMPRESS_QUALITY || 0.8,
      maxPhotos: process.env.MAX_PHOTOS || 9
    },
    // 性能配置
    performance: {
      photoCompressionWorker: process.env.USE_COMPRESSION_WORKER === 'true',
      useCloudStorage: process.env.USE_CLOUD_STORAGE === 'true',
      useLocalCache: process.env.USE_LOCAL_CACHE === 'true'
    }
  },
  onLaunch() {
    // 初始化云开发环境
    if (!this.globalData.cloudEnv) {
      console.error('未配置云环境ID')
      return
    }
    wx.cloud.init({
      env: this.globalData.cloudEnv,
      traceUser: true
    })
    // 初始化性能监控
    wx.reportPerformance && wx.reportPerformance()
  }
})
```

2. 腾讯云托管配置
```js
// services/cloud/config.js
export const cloudConfig = {
  // 云存储配置
  storage: {
    bucket: process.env.COS_BUCKET,
    region: process.env.COS_REGION,
    maxDuration: process.env.COS_KEY_DURATION || 7200, // 默认2小时
    maxSize: process.env.COS_MAX_SIZE || 10 * 1024 * 1024 // 默认10MB
  },
  // AI服务配置
  ai: {
    ocrService: process.env.OCR_SERVICE,
    voiceService: process.env.VOICE_SERVICE,
    imageProcess: process.env.IMAGE_SERVICE
  },
  // 数据库配置
  database: {
    photoCollection: process.env.PHOTO_COLLECTION || 'photos',
    draftCollection: process.env.DRAFT_COLLECTION || 'drafts',
    userCollection: process.env.USER_COLLECTION || 'users'
  }
}

// 配置验证
Object.entries(cloudConfig).forEach(([key, value]) => {
  if (typeof value === 'object') {
    Object.entries(value).forEach(([subKey, subValue]) => {
      if (subValue === undefined) {
        console.error(`未配置${key}.${subKey}`)
      }
    })
  }
})
```

3. 工具函数封装（60行）
```js
// utils/network/request.js
export const request = {
  // 网络请求封装
  async fetch(options) {
    try {
      const { url, method = 'GET', data, header = {} } = options
      const res = await wx.request({
        url,
        method,
        data,
        header: {
          'content-type': 'application/json',
          ...header
        },
        timeout: 15000
      })
      return this.handleResponse(res)
    } catch (error) {
      return this.handleError(error)
    }
  },
  
  // 响应处理
  handleResponse(res) {
    if (res.statusCode === 200) {
      return res.data
    }
    throw new Error(`请求失败：${res.statusCode}`)
  },
  
  // 错误处理
  handleError(error) {
    console.error('网络请求错误：', error)
    wx.showToast({
      title: '网络请求失败，请重试',
      icon: 'none'
    })
    return Promise.reject(error)
  }
}
```

4. ESLint与Prettier配置（30行）
```json
// .eslintrc.js
module.exports = {
  root: true,
  env: {
    es6: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended'
  ],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
  }
}
```

**输出**：
1. 完整的项目目录结构
2. 基础配置文件：
   - app.js（全局配置）
   - project.config.json（项目配置）
   - cloud/config.js（云服务配置）
   - utils/（基础工具函数）
3. 代码规范配置：
   - .eslintrc.js
   - .prettierrc
   - .editorconfig

**依赖关系**：
- 本会话为首个会话，无前置依赖
- 为后续所有会话提供基础环境支持

**测试标准**：
1. 项目结构完整性检查：
   ```bash
   tree -I 'node_modules|dist' > structure.txt
   diff structure.txt expected_structure.txt
   ```

2. 配置文件有效性测试：
   ```js
   describe('项目配置测试', () => {
     test('云服务配置有效', () => {
       expect(cloudConfig).toBeDefined()
       expect(cloudConfig.storage.bucket).toBeDefined()
     })
     
     test('全局配置有效', async () => {
       const app = getApp()
       expect(app.globalData).toBeDefined()
       expect(app.globalData.version).toBeDefined()
     })
   })
   ```

3. 工具函数测试：
   ```js
   describe('网络请求工具测试', () => {
     test('基础请求功能', async () => {
       const res = await request.fetch({
         url: 'test-url'
       })
       expect(res).toBeDefined()
     })
     
     test('错误处理', async () => {
       await expect(request.fetch({
         url: 'invalid-url'
       })).rejects.toThrow()
     })
   })
   ```

**性能指标**：
1. 项目初始化时间 < 2秒
2. 配置文件加载时间 < 100ms
3. 网络请求超时设置为15秒
4. 全局配置内存占用 < 1MB

**注意事项**：
1. 确保Node.js版本为v18.15.0
2. 腾讯云配置信息需要在部署时替换为实际值
3. 所有敏感配置信息需要使用环境变量管理
4. 开发环境与生产环境配置需要分离

**可能的问题及解决方案**：
1. 问题：Node.js版本不匹配
   解决：使用nvm进行版本管理
   ```bash
   nvm install 18.15.0
   nvm use 18.15.0
   ```

2. 问题：云服务配置无效
   解决：检查环境变量和配置文件
   ```js
   if (!process.env.CLOUD_ENV_ID) {
     throw new Error('未配置云环境ID')
   }
   ```

3. 问题：ESLint规则冲突
   解决：检查并调整规则优先级
   ```js
   rules: {
     'prettier/prettier': ['error', {}, { usePrettierrc: true }]
   }
   ```

// ... 继续优化后续会话 ...

### 第二阶段：核心功能开发（8个会话）

#### 会话2.1：照片智能处理
- 工作内容：
  * 实现照片压缩优化
  * 添加照片编辑功能
  * 实现马赛克处理
  * 配置云端存储同步
- 预计代码量：190行
- 交付物：照片处理功能

#### 会话2.2：照片交互增强
- 工作内容：
  * 实现长按照片交互
  * 添加照片排序功能
  * 实现照片合组功能
  * 添加封面图设置
- 预计代码量：180行
- 交付物：增强的照片交互功能

#### 会话2.3：语音识别增强
- 工作内容：
  * 添加方言识别支持
  * 实现专业术语识别
  * 优化实时转写功能
  * 添加离线识别支持
- 预计代码量：200行
- 交付物：增强的语音识别功能

#### 会话2.4：文本编辑增强
- 工作内容：
  * 实现高级格式设置
  * 添加表格支持
  * 实现图文混排增强
  * 添加格式导入功能
- 预计代码量：190行
- 交付物：增强的文本编辑功能

#### 会话2.5：AI辅助功能
- 工作内容：
  * 实现错别字修正
  * 添加智能排版
  * 实现AI润色功能
  * 配置AI服务调用
- 预计代码量：180行
- 交付物：AI辅助功能

#### 会话2.6：数据同步机制
- 工作内容：
  * 实现草稿自动保存
  * 添加多端同步支持
  * 实现离线数据处理
  * 配置数据冲突处理
- 预计代码量：200行
- 交付物：数据同步功能

#### 会话2.7：关键词处理
- 工作内容：
  * 实现关键词提取
  * 添加关键词云展示
  * 实现关键词检索
  * 配置关键词优化
- 预计代码量：180行
- 交付物：关键词功能

#### 会话2.8：多格式支持
- 工作内容：
  * 实现Excel导入
  * 添加PDF解析
  * 实现Word导入
  * 配置格式转换
- 预计代码量：200行
- 交付物：多格式支持功能

### 第三阶段：性能优化与体验提升（4个会话）

#### 会话3.1：性能优化
- 工作内容：
  * 实现延迟加载
  * 添加资源压缩
  * 实现缓存优化
  * 配置CDN加速
- 预计代码量：180行
- 交付物：性能优化方案

#### 会话3.2：用户体验优化
- 工作内容：
  * 优化交互动画
  * 添加手势操作
  * 实现过渡效果
  * 优化响应速度
- 预计代码量：170行
- 交付物：优化后的交互体验

#### 会话3.3：弱网适配
- 工作内容：
  * 实现离线功能
  * 添加断点续传
  * 实现数据压缩
  * 优化重试机制
- 预计代码量：190行
- 交付物：弱网适配方案

#### 会话3.4：安全性增强
- 工作内容：
  * 实现数据加密
  * 添加访问控制
  * 实现敏感信息处理
  * 配置安全策略
- 预计代码量：180行
- 交付物：安全性方案

## 开发规范

1. **代码质量要求**
   - 每个会话的代码必须经过完整测试
   - 代码提交前必须通过ESLint检查
   - 保持代码注释完整性
   - 确保代码可维护性

2. **性能要求**
   - 页面加载时间控制在3秒内
   - 主要操作响应时间不超过0.5秒
   - 内存占用控制在合理范围
   - 确保60fps的流畅度

3. **兼容性要求**
   - 支持主流机型
   - 适配不同屏幕尺寸
   - 考虑低端设备性能
   - 支持弱网环境

## 风险管理

1. **技术风险**
   - AI服务稳定性
   - 数据同步冲突
   - 性能优化难度
   - 安全性保障

2. **应对策略**
   - 建立备选方案
   - 实施渐进式开发
   - 加强测试验证
   - 保持技术储备

## 进度安排

- 第一阶段：5个工作日
- 第二阶段：8个工作日
- 第三阶段：4个工作日
- 总计：17个工作日

## 资源需求

1. **开发环境**
   - 微信开发者工具
   - Node.js v18.15.0
   - 腾讯云开发环境
   - 版本控制工具

2. **云资源**
   - 腾讯云托管服务
   - 对象存储服务
   - AI服务接口
   - CDN服务

## 验收标准

1. **功能验收**
   - 所有功能正常运行
   - 符合需求文档规范
   - 通过性能测试
   - 通过安全测试

2. **文档要求**
   - 完整的技术文档
   - 详细的API文档
   - 使用说明文档
   - 部署文档

### 3. 开发环境注意事项

#### 系统要求
- macOS/Linux：推荐使用macOS Sonoma 14.4或更高版本
- 内存：至少16GB RAM
- 存储：至少20GB可用空间
- 网络：稳定的互联网连接，建议50Mbps以上

#### 开发工具自动化配置
```bash
# scripts/setup-dev.sh
#!/bin/bash

# 检查并安装devbox
if ! command -v devbox &> /dev/null; then
    curl -fsSL https://get.jetpack.io/devbox | bash
fi

# 安装必要的全局工具
npm install -g @tarojs/cli@latest
npm install -g miniprogram-ci@latest
npm install -g typescript@latest

# 配置Git钩子
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run test"
npx husky add .husky/commit-msg "npx commitlint -E HUSKY_GIT_PARAMS"

# 配置VSCode插件
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-typescript-tslint-plugin
```

#### 开发环境监控
```js
// monitor/dev-monitor.js
class DevMonitor {
    static async startMonitoring() {
        // 监控内存使用
        this.monitorMemory()
        
        // 监控CPU使用
        this.monitorCPU()
        
        // 监控文件变化
        this.monitorFileChanges()
        
        // 监控网络请求
        this.monitorNetworkRequests()
    }

    static monitorMemory() {
        setInterval(() => {
            const used = process.memoryUsage()
            if (used.heapUsed > 1024 * 1024 * 1024) { // 1GB
                console.warn('内存使用超过1GB')
            }
        }, 1000 * 60) // 每分钟检查
    }

    static monitorFileChanges() {
        const chokidar = require('chokidar')
        const watcher = chokidar.watch('.', {
            ignored: /(^|[\/\\])\../,
            persistent: true
        })
        
        watcher
            .on('change', path => console.log(`文件变更: ${path}`))
            .on('error', error => console.error(`监控错误: ${error}`))
    }
}
```

#### 开发环境备份策略
```js
// scripts/backup.js
class DevBackup {
    static async backup() {
        const timestamp = new Date().toISOString()
        
        // 备份本地数据库
        await this.backupDatabase(timestamp)
        
        // 备份本地缓存
        await this.backupCache(timestamp)
        
        // 备份配置文件
        await this.backupConfigs(timestamp)
        
        // 压缩备份文件
        await this.compressBackup(timestamp)
    }

    static async restore(timestamp) {
        // 恢复指定时间点的备份
        await this.extractBackup(timestamp)
        await this.restoreDatabase(timestamp)
        await this.restoreCache(timestamp)
        await this.restoreConfigs(timestamp)
    }
}
```

#### 开发环境安全配置
```js
// security/dev-security.js
class DevSecurity {
    static async setupSecurity() {
        // 配置本地HTTPS
        await this.setupLocalHTTPS()
        
        // 配置本地防火墙
        await this.setupFirewall()
        
        // 配置敏感信息加密
        await this.setupEncryption()
        
        // 配置访问控制
        await this.setupAccessControl()
    }

    static async setupLocalHTTPS() {
        // 生成本地SSL证书
        const mkcert = require('mkcert')
        const cert = await mkcert.createCA({
            organization: '开发证书',
            countryCode: 'CN',
            state: '开发环境',
            locality: '本地'
        })
    }
}
```

#### 开发环境性能优化
```js
// performance/dev-performance.js
class DevPerformance {
    static async optimize() {
        // 优化构建性能
        await this.optimizeBuild()
        
        // 优化开发工具性能
        await this.optimizeDevTools()
        
        // 优化本地服务性能
        await this.optimizeLocalServices()
    }

    static async optimizeBuild() {
        // 配置webpack缓存
        // 配置babel缓存
        // 配置模块热替换
    }

    static async optimizeDevTools() {
        // 配置VSCode性能优化
        // 配置微信开发者工具性能优化
    }
}
```

### 5. 持续部署与云托管方案

#### 多环境部署配置
```yaml
# deploy/cloud.yaml
environments:
  development:
    name: 开发环境
    env: dev-${git.branch}
    domain: dev-${git.branch}.${base.domain}
    cpu: 0.5
    mem: 1G
    minNum: 1
    maxNum: 2
    
  testing:
    name: 测试环境
    env: test
    domain: test.${base.domain}
    cpu: 1
    mem: 2G
    minNum: 2
    maxNum: 4
    
  production:
    name: 生产环境
    env: prod
    domain: ${base.domain}
    cpu: 2
    mem: 4G
    minNum: 4
    maxNum: 8

common:
  containerPort: 80
  dockerfilePath: ./Dockerfile
  buildCommand: npm run build
  vpcConfig:
    vpcId: ${vpc.id}
    subnetId: ${subnet.id}
```

#### 自动化部署流程
```js
// deploy/cloud-deploy.js
class CloudDeploy {
    constructor(env) {
        this.env = env
        this.cloudBaseConfig = require('./cloud.yaml')
        this.deployLock = new DeployLock()
    }

    async deploy() {
        try {
            // 1. 获取部署锁
            await this.deployLock.acquire()

            // 2. 环境准备
            await this.prepareEnvironment()

            // 3. 构建应用
            await this.buildApplication()

            // 4. 执行部署
            await this.executeDeploy()

            // 5. 健康检查
            await this.healthCheck()

            // 6. 流量切换
            await this.switchTraffic()

            // 7. 部署完成处理
            await this.postDeploy()

        } catch (error) {
            // 部署失败处理
            await this.handleDeployFailure(error)
            throw error
        } finally {
            // 释放部署锁
            await this.deployLock.release()
        }
    }

    async prepareEnvironment() {
        // 1. 检查环境配置
        const envConfig = this.cloudBaseConfig.environments[this.env]
        if (!envConfig) {
            throw new Error(`未找到环境配置: ${this.env}`)
        }

        // 2. 准备环境变量
        await this.prepareEnvVariables()

        // 3. 检查云资源
        await this.checkCloudResources()

        // 4. 准备构建目录
        await this.prepareBuildDirectory()
    }

    async buildApplication() {
        // 1. 安装依赖
        await this.installDependencies()

        // 2. 执行构建
        await this.runBuild()

        // 3. 构建Docker镜像
        await this.buildDockerImage()

        // 4. 推送镜像
        await this.pushDockerImage()
    }

    async executeDeploy() {
        // 1. 创建新版本
        const version = await this.createVersion()

        // 2. 部署配置
        await this.deployConfig()

        // 3. 更新服务
        await this.updateService(version)

        // 4. 配置域名
        await this.configureDomain()
    }

    async healthCheck() {
        // 1. 等待服务就绪
        await this.waitForServiceReady()

        // 2. 检查服务健康状态
        await this.checkServiceHealth()

        // 3. 检查日志是否正常
        await this.checkServiceLogs()

        // 4. 检查监控指标
        await this.checkMetrics()
    }

    async switchTraffic() {
        // 1. 准备流量切换
        await this.prepareTrafficSwitch()

        // 2. 灰度发布
        await this.gradualTrafficSwitch()

        // 3. 观察服务状态
        await this.monitorServiceStatus()

        // 4. 完成流量切换
        await this.completeTrafficSwitch()
    }

    async postDeploy() {
        // 1. 清理旧版本
        await this.cleanupOldVersions()

        // 2. 更新部署记录
        await this.updateDeployHistory()

        // 3. 发送部署通知
        await this.sendDeployNotification()

        // 4. 更新监控配置
        await this.updateMonitoring()
    }
}

// 部署锁实现
class DeployLock {
    async acquire() {
        // 获取部署锁
        const lock = await redis.set('deploy_lock', 1, 'NX', 'EX', 3600)
        if (!lock) {
            throw new Error('另一个部署正在进行中')
        }
    }

    async release() {
        // 释放部署锁
        await redis.del('deploy_lock')
    }
}
```

#### 开发过程中的持续部署
```js
// scripts/dev-deploy.js
class DevDeploy {
    constructor() {
        this.deployer = new CloudDeploy('development')
        this.watcher = new FileWatcher()
    }

    async startDevDeploy() {
        // 1. 初始化开发环境
        await this.initDevEnvironment()

        // 2. 启动文件监听
        await this.startFileWatching()

        // 3. 启动自动部署
        await this.startAutoDeploy()
    }

    async initDevEnvironment() {
        // 1. 检查开发分支
        const branch = await git.getCurrentBranch()
        
        // 2. 创建开发环境
        await this.deployer.prepareEnvironment()
        
        // 3. 初始化部署配置
        await this.initDeployConfig(branch)
    }

    async startFileWatching() {
        // 监听文件变化
        this.watcher.watch(['src/**/*', 'cloud/**/*'], async (event) => {
            if (this.shouldTriggerDeploy(event)) {
                await this.triggerDeploy()
            }
        })
    }

    shouldTriggerDeploy(event) {
        // 判断是否需要触发部署
        return !event.path.includes('node_modules') &&
               !event.path.includes('.git') &&
               !event.path.endsWith('.log')
    }

    async triggerDeploy() {
        try {
            // 1. 执行代码检查
            await this.runCodeCheck()

            // 2. 执行测试
            await this.runTests()

            // 3. 执行部署
            await this.deployer.deploy()

            // 4. 发送部署通知
            await this.sendDeployNotification()

        } catch (error) {
            // 处理部署失败
            await this.handleDeployFailure(error)
        }
    }

    async runCodeCheck() {
        // 执行代码检查
        await Promise.all([
            this.runLint(),
            this.runTypeCheck(),
            this.runSecurityCheck()
        ])
    }

    async runTests() {
        // 执行测试
        await Promise.all([
            this.runUnitTests(),
            this.runIntegrationTests()
        ])
    }
}

// 使用示例
const devDeploy = new DevDeploy()
devDeploy.startDevDeploy().catch(console.error)
```

#### 部署监控与告警
```js
// monitor/deploy-monitor.js
class DeployMonitor {
    constructor() {
        this.metrics = new CloudMetrics()
        this.alerter = new DeployAlerter()
    }

    async monitorDeploy() {
        // 1. 监控部署状态
        await this.monitorDeployStatus()

        // 2. 监控服务健康
        await this.monitorServiceHealth()

        // 3. 监控资源使用
        await this.monitorResources()

        // 4. 监控性能指标
        await this.monitorPerformance()
    }

    async monitorDeployStatus() {
        // 监控部署进度和状态
        this.metrics.watch('deploy_status', async (metric) => {
            if (metric.status === 'failed') {
                await this.alerter.sendAlert({
                    level: 'critical',
                    message: `部署失败: ${metric.error}`,
                    timestamp: new Date()
                })
            }
        })
    }

    async monitorServiceHealth() {
        // 监控服务健康状态
        this.metrics.watch('service_health', async (metric) => {
            if (metric.status !== 'healthy') {
                await this.alerter.sendAlert({
                    level: 'warning',
                    message: `服务异常: ${metric.details}`,
                    timestamp: new Date()
                })
            }
        })
    }
}
```

#### 部署回滚机制
```js
// deploy/rollback.js
class DeployRollback {
    constructor() {
        this.history = new DeployHistory()
        this.deployer = new CloudDeploy()
    }

    async rollback(version) {
        try {
            // 1. 获取回滚版本信息
            const rollbackVersion = await this.history.getVersion(version)

            // 2. 验证回滚可行性
            await this.validateRollback(rollbackVersion)

            // 3. 执行回滚
            await this.executeRollback(rollbackVersion)

            // 4. 验证回滚结果
            await this.verifyRollback()

        } catch (error) {
            // 处理回滚失败
            await this.handleRollbackFailure(error)
            throw error
        }
    }

    async validateRollback(version) {
        // 验证回滚版本
        if (!version.verified) {
            throw new Error('回滚版本未经验证')
        }

        // 检查依赖兼容性
        await this.checkDependencies(version)

        // 检查数据库兼容性
        await this.checkDatabase(version)
    }

    async executeRollback(version) {
        // 1. 准备回滚
        await this.prepareRollback(version)

        // 2. 执行回滚
        await this.deployer.deploy({
            version: version.id,
            isRollback: true
        })

        // 3. 恢复配置
        await this.restoreConfig(version)

        // 4. 更新服务
        await this.updateService(version)
    }
}
```

### 6. 修改点记录与备份恢复系统

#### 修改点记录机制
```js
// track/change-tracker.js
class ChangeTracker {
    constructor() {
        this.db = new LowDB('changes.json')
        this.currentSession = null
        this.changeCount = 0
        this.MAX_CHANGES = 10000 // 最少维护1万个修改点
    }

    async startSession() {
        this.currentSession = {
            id: `session_${Date.now()}`,
            startTime: new Date().toISOString(),
            changes: []
        }
        await this.db.write('sessions', this.currentSession)
    }

    async trackChange(change) {
        if (!this.currentSession) {
            await this.startSession()
        }

        const changeRecord = {
            id: `change_${Date.now()}_${this.changeCount++}`,
            timestamp: new Date().toISOString(),
            type: change.type, // 'create', 'modify', 'delete'
            file: change.file,
            content: change.content,
            diff: change.diff,
            hash: await this.calculateHash(change.content),
            author: change.author,
            branch: await git.getCurrentBranch(),
            relatedFiles: change.relatedFiles || [],
            dependencies: change.dependencies || [],
            snapshot: change.snapshot || null
        }

        // 记录修改点
        await this.db.push(`sessions.${this.currentSession.id}.changes`, changeRecord)

        // 维护修改点数量
        const totalChanges = await this.db.count('sessions.*.changes')
        if (totalChanges > this.MAX_CHANGES) {
            await this.archiveOldChanges()
        }

        // 触发备份
        await this.triggerBackupIfNeeded(changeRecord)

        return changeRecord.id
    }

    async archiveOldChanges() {
        const oldChanges = await this.db.find('sessions.*.changes', {
            sort: 'timestamp',
            limit: 1000
        })

        // 将旧的修改记录归档
        await this.db.write(`archives/changes_${Date.now()}.json`, oldChanges)
        
        // 从当前数据库中删除
        await this.db.remove('sessions.*.changes', oldChanges.map(c => c.id))
    }

    async getChange(changeId) {
        return await this.db.findOne('sessions.*.changes', { id: changeId })
    }

    async searchChanges(criteria) {
        return await this.db.find('sessions.*.changes', criteria)
    }
}

// 修改点监听器
class ChangeWatcher {
    constructor() {
        this.tracker = new ChangeTracker()
        this.fileWatcher = chokidar.watch('**/*', {
            ignored: [
                '**/node_modules/**',
                '**/.git/**',
                '**/dist/**',
                '**/recycle-bin/**'
            ],
            persistent: true
        })
    }

    async startWatching() {
        this.fileWatcher
            .on('add', path => this.handleFileChange('create', path))
            .on('change', path => this.handleFileChange('modify', path))
            .on('unlink', path => this.handleFileChange('delete', path))

        // VSCode扩展集成
        vscode.workspace.onDidChangeTextDocument(event => {
            this.handleEditorChange(event)
        })

        // Git钩子集成
        await this.setupGitHooks()
    }

    async handleFileChange(type, path) {
        const content = type !== 'delete' ? 
            await fs.readFile(path, 'utf-8') : 
            await this.getLastContent(path)

        await this.tracker.trackChange({
            type,
            file: path,
            content,
            diff: await this.calculateDiff(path, content),
            author: await git.getAuthor(),
            relatedFiles: await this.findRelatedFiles(path)
        })
    }

    async handleEditorChange(event) {
        const { document, contentChanges } = event
        await this.tracker.trackChange({
            type: 'modify',
            file: document.fileName,
            content: document.getText(),
            diff: contentChanges,
            author: await git.getAuthor()
        })
    }
}
```

#### 回收站机制
```js
// recycle/recycle-bin.js
class RecycleBin {
    constructor() {
        this.basePath = '.recycle-bin'
        this.db = new LowDB('recycle-bin.json')
        this.maxAge = 30 * 24 * 60 * 60 * 1000 // 30天
    }

    async moveToRecycleBin(filePath) {
        const timestamp = Date.now()
        const recycledPath = path.join(
            this.basePath,
            `${path.basename(filePath)}.${timestamp}`
        )

        // 移动文件到回收站
        await fs.move(filePath, recycledPath)

        // 记录删除信息
        await this.db.push('recycled', {
            originalPath: filePath,
            recycledPath,
            timestamp,
            author: await git.getAuthor(),
            branch: await git.getCurrentBranch(),
            commit: await git.getCurrentCommit()
        })

        return recycledPath
    }

    async restore(recycledPath) {
        const record = await this.db.findOne('recycled', {
            recycledPath
        })

        if (!record) {
            throw new Error('找不到回收记录')
        }

        // 恢复文件
        await fs.move(recycledPath, record.originalPath)

        // 更新记录
        await this.db.remove('recycled', { recycledPath })

        return record.originalPath
    }

    async cleanup() {
        const now = Date.now()
        const oldFiles = await this.db.find('recycled', {
            timestamp: { $lt: now - this.maxAge }
        })

        for (const file of oldFiles) {
            // 永久删除前再次备份
            await this.backupBeforePermanentDelete(file)
            
            // 永久删除文件
            await fs.remove(file.recycledPath)
            
            // 删除记录
            await this.db.remove('recycled', { recycledPath: file.recycledPath })
        }
    }

    async list() {
        return await this.db.find('recycled', {
            sort: { timestamp: -1 }
        })
    }
}
```

#### 快照备份系统
```js
// backup/snapshot-system.js
class SnapshotSystem {
    constructor() {
        this.config = {
            // 快照间隔配置
            intervals: {
                critical: 5 * 60 * 1000,    // 关键文件每5分钟
                important: 15 * 60 * 1000,  // 重要文件每15分钟
                normal: 30 * 60 * 1000      // 普通文件每30分钟
            },
            // 文件重要性配置
            importance: {
                critical: [
                    'app.js',
                    'project.config.json',
                    'cloud/config.js',
                    'services/*/core.js'
                ],
                important: [
                    'components/**/*.js',
                    'pages/**/*.js',
                    'services/**/*.js'
                ],
                normal: [
                    '**/*.js',
                    '**/*.json',
                    '**/*.wxss'
                ]
            },
            // 保留策略
            retention: {
                critical: 30 * 24 * 60 * 60 * 1000,  // 30天
                important: 15 * 24 * 60 * 60 * 1000, // 15天
                normal: 7 * 24 * 60 * 60 * 1000      // 7天
            }
        }
    }

    async startSnapshotting() {
        // 启动不同级别的快照任务
        Object.entries(this.config.intervals).forEach(([level, interval]) => {
            setInterval(() => {
                this.takeSnapshot(level)
            }, interval)
        })

        // 启动定期清理
        setInterval(() => {
            this.cleanupSnapshots()
        }, 24 * 60 * 60 * 1000) // 每天清理一次
    }

    async takeSnapshot(level) {
        const timestamp = Date.now()
        const snapshotDir = path.join(
            'snapshots',
            level,
            timestamp.toString()
        )

        // 获取需要快照的文件
        const files = await this.getFilesForLevel(level)

        // 创建快照
        for (const file of files) {
            const snapshotPath = path.join(
                snapshotDir,
                path.relative(process.cwd(), file)
            )
            
            await fs.ensureDir(path.dirname(snapshotPath))
            await fs.copy(file, snapshotPath)
        }

        // 记录快照元数据
        await this.db.push('snapshots', {
            id: `snapshot_${timestamp}`,
            level,
            timestamp,
            files: files.length,
            size: await this.calculateSize(snapshotDir),
            hash: await this.calculateHash(snapshotDir)
        })

        // 压缩快照
        await this.compressSnapshot(snapshotDir)
    }

    async getFilesForLevel(level) {
        const patterns = this.config.importance[level]
        const files = []
        
        for (const pattern of patterns) {
            const matches = await glob(pattern)
            files.push(...matches)
        }

        return [...new Set(files)] // 去重
    }

    async restoreSnapshot(snapshotId) {
        const snapshot = await this.db.findOne('snapshots', { id: snapshotId })
        if (!snapshot) {
            throw new Error('找不到快照')
        }

        // 解压快照
        await this.extractSnapshot(snapshot)

        // 恢复文件
        const snapshotDir = path.join(
            'snapshots',
            snapshot.level,
            snapshot.timestamp.toString()
        )

        await this.restoreFiles(snapshotDir)
    }

    async cleanupSnapshots() {
        const now = Date.now()

        // 按级别清理过期快照
        for (const [level, retention] of Object.entries(this.config.retention)) {
            const oldSnapshots = await this.db.find('snapshots', {
                level,
                timestamp: { $lt: now - retention }
            })

            for (const snapshot of oldSnapshots) {
                // 删除快照文件
                await fs.remove(path.join(
                    'snapshots',
                    snapshot.level,
                    snapshot.timestamp.toString()
                ))

                // 删除记录
                await this.db.remove('snapshots', { id: snapshot.id })
            }
        }
    }
}

// 使用示例
const snapshotSystem = new SnapshotSystem()
const recycleBin = new RecycleBin()
const changeTracker = new ChangeTracker()

// 启动所有系统
async function startSafetySystems() {
    // 启动修改点跟踪
    const watcher = new ChangeWatcher()
    await watcher.startWatching()

    // 启动快照系统
    await snapshotSystem.startSnapshotting()

    // 配置文件删除拦截
    const originalUnlink = fs.unlink
    fs.unlink = async (path, callback) => {
        try {
            // 移动到回收站而不是直接删除
            await recycleBin.moveToRecycleBin(path)
            callback && callback(null)
        } catch (error) {
            callback && callback(error)
        }
    }

    // 定期清理
    setInterval(async () => {
        await recycleBin.cleanup()
    }, 24 * 60 * 60 * 1000) // 每天清理一次
}

startSafetySystems().catch(console.error) 