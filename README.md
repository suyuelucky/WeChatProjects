# B1-基础照片采集模块

## 项目概述

B1-基础照片采集模块是工作留痕系统的核心功能组件，提供拍照、图片处理和照片管理功能。本模块采用组件化架构，遵循小程序最佳实践和性能优化策略，以实现流畅的用户体验和高效的照片处理能力。

## 功能特点

- **高效相机控制**：支持前后置切换、闪光灯控制、多种拍摄模式
- **智能图像处理**：自适应压缩算法，平衡照片质量和存储需求
- **多级存储管理**：分层存储架构，支持照片元数据管理和检索
- **性能优化**：采用多种性能优化策略，确保流畅用户体验
- **兼容性适配**：提供降级方案，支持不同版本微信基础库

## 项目结构

```
src/
├── components/
│   └── PhotoCapture/       # 照片采集组件
│       ├── index.js        # 组件逻辑
│       ├── index.wxml      # 组件模板
│       ├── index.wxss      # 组件样式
│       └── index.json      # 组件配置
├── pages/
│   └── camera/             # 相机页面
│       ├── index.js        # 页面逻辑
│       ├── index.wxml      # 页面模板
│       ├── index.wxss      # 页面样式
│       └── index.json      # 页面配置
├── utils/
│   ├── imageProcessor.js   # 图像处理工具
│   ├── storageHelper.js    # 存储管理工具
│   └── logger.js           # 日志记录工具
└── app.json                # 应用配置
```

## 技术实现

### 核心组件

- **CameraPreview**：封装相机预览功能，支持前后置切换和闪光灯控制
- **CameraModeController**：支持普通、连拍、定时三种拍照模式
- **ImageCompressor**：实现高效的图片压缩算法，平衡质量和性能
- **PhotoStorage**：管理照片本地存储和元数据记录

### 性能优化策略

- **相机快速启动**：使用延迟初始化策略，减少启动时间
- **图片处理优化**：两阶段处理，大图片分块处理避免UI阻塞
- **内存管理**：资源池化，主动触发资源释放，定期缓存清理

## 使用方法

### 基本用法

1. 在页面配置中引入组件：

```json
{
  "usingComponents": {
    "photo-capture": "../../components/PhotoCapture/index"
  }
}
```

2. 在页面模板中使用组件：

```html
<photo-capture 
  id="photoCapture"
  device-position="back"
  flash="auto"
  bindready="handleCameraReady"
  bindcapture="handleCapturePhoto"
/>
```

3. 在页面逻辑中处理组件事件：

```javascript
Page({
  handleCameraReady: function() {
    console.log('相机已准备就绪');
  },
  
  handleCapturePhoto: function(e) {
    const photo = e.detail.photo;
    console.log('拍照成功:', photo);
  }
});
```

## 常见问题

### 相机无法使用

检查以下可能的原因：
- 用户未授权相机权限
- 设备不支持相机功能
- 微信基础库版本过低

### 拍照后图片处理耗时过长

可能原因：
- 设备性能较低
- 图片分辨率过高
- 内存占用过多

优化建议：
- 降低拍照分辨率
- 优化压缩参数
- 使用分步处理策略

## 版本兼容性

| 功能 | 最低支持版本 | 降级方案 |
|------|------------|---------|
| Camera组件 | 基础库2.10.0 | 使用wx.chooseImage替代 |
| Canvas 2D | 基础库2.9.0 | 使用旧版Canvas API |
| 文件系统管理 | 基础库2.16.0 | 使用本地缓存存储 |

## 开发团队

- 开发者: 照片采集模块开发团队
- 创建日期: 2025-04-09
- 版本: 1.0.0

## 许可证

本项目遵循MIT许可证

# 绣花针项目结构说明

> 创建时间：2025年5月10日 15:12:36
> 更新时间：2025年5月10日 15:26:12
> 创建者：Claude助手

## 项目概览

绣花针项目是一个多功能应用集合，包含微信小程序、Web应用、表格系统、台账系统以及博客系统等多个子系统。

## 目录结构

```
xiuhuazhen/                   # 项目根目录
├── WeChatProjects/           # 微信小程序项目
│   ├── miniprogram/          # 小程序源代码
│   ├── cloudfunctions/       # 云函数
│   └── ...                   # 小程序相关其他文件
├── web/                      # Web应用
├── tableSystem/              # 表格系统
│   ├── photo-collector/      # 照片采集模块
│   └── src/                  # 源代码
├── blogSystem/               # 博客系统
│   ├── src/                  # 博客源代码
│   ├── public/               # 公共资源
│   └── cloud/                # 云函数
├── ledgerSystem/             # 台账系统
│   ├── src/                  # 源代码
│   └── cloud/                # 云函数
├── src/                      # 共享源代码
│   ├── utils/                # 工具函数
│   └── design-system/        # 设计系统
├── docs/                     # 文档资料
└── ...                       # 其他配置文件
```

## 子系统说明

### 微信小程序
- 位置：`./WeChatProjects/`
- 说明：包含微信小程序的代码和相关资源

### Web应用
- 位置：`./web/`
- 说明：Web端应用，与小程序共享后端资源

### 表格系统
- 位置：`./tableSystem/`
- 说明：数据表格处理系统，包含表单设计、数据收集等功能

### 博客系统
- 位置：`./blogSystem/`
- 说明：简单博客系统，支持无标题发布

### 台账系统
- 位置：`./ledgerSystem/`
- 说明：业务记录和台账管理系统

### 共享代码
- 位置：`./src/`
- 说明：各系统共享的代码，包括工具函数和设计系统

## 代码调整说明

所有非小程序相关的代码已从WeChatProjects目录移动到上级目录中，按照功能进行了分类整理：

1. 各个子系统(博客、表格、台账)的代码移动到了各自的目录中
2. 共享代码移动到了src目录下
3. 各种配置文件(.eslintrc, tsconfig.json等)移动到了项目根目录
4. 微信小程序相关代码保留在WeChatProjects目录中不变

这样的调整使项目结构更加清晰，便于管理和开发。
