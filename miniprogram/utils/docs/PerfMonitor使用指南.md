# PerfMonitor 微信小程序性能监控工具

> 本文档提供PerfMonitor性能监控工具的完整使用指南，涵盖安装、配置、API文档和最佳实践。

## 目录

1. [工具概述](#1-工具概述)
2. [安装与配置](#2-安装与配置)
3. [API文档](#3-api文档)
4. [使用案例](#4-使用案例)
5. [最佳实践](#5-最佳实践)
6. [性能指标解读](#6-性能指标解读)
7. [常见问题](#7-常见问题)

## 1. 工具概述

PerfMonitor是专为微信小程序开发的性能监控工具，提供全面的性能数据收集、分析和报告功能。主要特点：

- **全面监控**：覆盖页面生命周期、setData性能、网络请求、内存使用等多方面
- **低侵入性**：简单集成，不影响现有代码逻辑
- **ES5兼容**：完全兼容微信小程序环境，无依赖
- **灵活配置**：可按需启用不同监控模块
- **数据可视化**：提供简洁报告和数据导出

通过PerfMonitor，开发者可以更加清晰地了解小程序的性能瓶颈，有针对性地进行优化。

## 2. 安装与配置

### 2.1 安装

将`PerfMonitor.js`文件复制到小程序项目的`utils`目录下即可。

### 2.2 基础配置

在小程序的app.js中引入并初始化PerfMonitor：

```javascript
// app.js
const PerfMonitor = require('./utils/PerfMonitor');

App({
  onLaunch: function() {
    // 启动性能监控
    PerfMonitor.start({
      reportInterval: 30000, // 30秒自动上报一次
      reportUrl: 'https://your-server.com/performance', // 上报地址
      enableMemoryMonitor: true, // 启用内存监控
      enableNetworkMonitor: true // 启用网络请求监控
    });
    
    // ...其他初始化代码
  }
});
```

### 2.3 配置选项说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| reportInterval | Number | 0 | 自动上报间隔(毫秒)，0表示不自动上报 |
| reportUrl | String | - | 性能数据上报地址，格式为完整URL |
| enableMemoryMonitor | Boolean | false | 是否启用内存监控 |
| enableSetDataMonitor | Boolean | false | 是否启用setData监控 |
| enableNetworkMonitor | Boolean | false | 是否启用网络请求监控 |
| memoryInterval | Number | 5000 | 内存数据采集间隔(毫秒) |

## 3. API文档

### 3.1 基础API

#### `start(options)`

启动性能监控。

- **参数**：`options` - 配置选项，见[配置选项说明](#23-配置选项说明)
- **返回值**：PerfMonitor实例(支持链式调用)
- **示例**：
  ```javascript
  PerfMonitor.start({
    reportInterval: 60000,
    enableMemoryMonitor: true
  });
  ```

#### `stop()`

停止性能监控。

- **返回值**：PerfMonitor实例(支持链式调用)
- **示例**：
  ```javascript
  PerfMonitor.stop();
  ```

#### `clear()`

清空所有已收集的性能数据。

- **示例**：
  ```javascript
  PerfMonitor.clear();
  ```

### 3.2 性能数据收集API

#### `mark(name)`

设置一个时间点标记，用于后续测量。

- **参数**：`name` - 标记名称
- **返回值**：记录的时间戳
- **示例**：
  ```javascript
  PerfMonitor.mark('pageLoad.start');
  ```

#### `measure(name, startMark, endMark)`

测量两个标记点之间的时间差。

- **参数**：
  - `name` - 测量结果名称
  - `startMark` - 开始标记名称
  - `endMark` - 结束标记名称
- **返回值**：时间差(毫秒)，出错返回-1
- **示例**：
  ```javascript
  PerfMonitor.measure('pageLoad', 'pageLoad.start', 'pageLoad.end');
  ```

#### `startAction(name)`

开始记录某个操作的耗时。

- **参数**：`name` - 操作名称
- **返回值**：结束记录并获取耗时的函数
- **示例**：
  ```javascript
  const stopTimer = PerfMonitor.startAction('dataProcess');
  // ...执行操作
  const duration = stopTimer(); // 获取耗时
  ```

#### `timeAction(name, action)`

记录某个操作函数的执行耗时。

- **参数**：
  - `name` - 操作名称
  - `action` - 要执行的操作函数
- **返回值**：操作耗时(毫秒)
- **示例**：
  ```javascript
  const duration = PerfMonitor.timeAction('calculation', function() {
    // ...耗时操作
  });
  ```

### 3.3 页面与网络监控API

#### `monitorPageLifecycle(pageInstance)`

监控页面生命周期性能。

- **参数**：`pageInstance` - 页面实例
- **返回值**：修改后的页面实例
- **示例**：
  ```javascript
  // 在页面的onLoad中调用
  PerfMonitor.monitorPageLifecycle(this);
  ```

#### `recordSetData(pageInstance, name, data, callback)`

记录setData操作的性能。

- **参数**：
  - `pageInstance` - 页面实例
  - `name` - 记录名称
  - `data` - 要设置的数据
  - `callback` - setData回调
- **示例**：
  ```javascript
  PerfMonitor.recordSetData(this, 'updateList', {
    list: newList
  }, function() {
    console.log('数据更新完成');
  });
  ```

#### `monitorRequest(requestOptions)`

监控网络请求性能。

- **参数**：`requestOptions` - 请求参数
- **返回值**：修改后的请求参数
- **示例**：
  ```javascript
  wx.request(PerfMonitor.monitorRequest({
    url: 'https://api.example.com/data',
    success: function(res) {
      // 处理响应
    }
  }));
  ```

### 3.4 报告与导出API

#### `getAllMetrics()`

获取所有收集的性能数据。

- **返回值**：性能数据对象
- **示例**：
  ```javascript
  const metrics = PerfMonitor.getAllMetrics();
  console.log(metrics.measures);
  ```

#### `generateReport()`

生成性能报告。

- **返回值**：格式化的性能报告文本
- **示例**：
  ```javascript
  const report = PerfMonitor.generateReport();
  console.log(report);
  ```

#### `uploadMetrics(url, extraData)`

将性能数据上报到服务器。

- **参数**：
  - `url` - 服务器接口地址
  - `extraData` - 额外数据(可选)
- **示例**：
  ```javascript
  PerfMonitor.uploadMetrics('https://your-server.com/performance', {
    version: '1.0.0'
  });
  ```

## 4. 使用案例

### 4.1 监控页面加载性能

```javascript
// pages/index/index.js
const PerfMonitor = require('../../utils/PerfMonitor');

Page({
  onLoad: function(options) {
    // 监控页面生命周期
    PerfMonitor.monitorPageLifecycle(this);
    
    // 记录自定义加载开始时间点
    PerfMonitor.mark('page.customLoad.start');
    
    // 加载数据
    this.loadInitialData();
  },
  
  loadInitialData: function() {
    // 数据加载完成后标记结束时间点
    this.getData().then(() => {
      PerfMonitor.mark('page.customLoad.end');
      
      // 测量总耗时
      const duration = PerfMonitor.measure(
        'page.customLoad', 
        'page.customLoad.start', 
        'page.customLoad.end'
      );
      
      console.log('页面数据加载耗时:', duration, 'ms');
    });
  }
});
```

### 4.2 优化列表渲染性能

```javascript
// 使用recordSetData监控列表更新性能
function updateList(list) {
  // 记录setData性能
  PerfMonitor.recordSetData(this, 'updateList', {
    dataList: list
  }, () => {
    // 分析结果
    const metrics = PerfMonitor.getAllMetrics();
    const setDataRecords = metrics.performanceData.setData || [];
    
    // 找出最近的更新记录
    const lastRecord = setDataRecords[setDataRecords.length - 1];
    
    // 如果更新时间过长，考虑分批次更新或虚拟列表
    if (lastRecord && lastRecord.time > 100) {
      console.warn('列表更新耗时过长:', lastRecord.time, 'ms');
      // 考虑优化策略
    }
  });
}
```

## 5. 最佳实践

### 5.1 性能监控的合理使用

- **启动时机**：在app.js的onLaunch中启动，确保全程监控
- **选择性监控**：根据实际需要启用不同监控模块，避免过度监控影响性能
- **适当上报**：设置合理的上报间隔，避免频繁网络请求
- **关注重点**：重点监控核心页面和关键操作，而非所有页面

### 5.2 性能数据的有效利用

- **建立基准线**：记录优化前的性能数据作为基准线
- **持续比对**：在迭代过程中持续比对性能变化
- **设定阈值**：为关键指标设定性能阈值，超出时及时优化
- **结合用户反馈**：将性能数据与用户反馈结合分析

### 5.3 常见优化方向

- **优化setData**: 减少setData次数和数据量
- **合理分包**: 使用分包加载减小主包体积
- **延迟加载**: 非关键资源延迟加载
- **请求优化**: 合并请求、缓存策略、避免重复请求
- **减少阻塞**: 避免长时间同步操作阻塞主线程

## 6. 性能指标解读

### 6.1 关键性能指标

| 指标 | 优 | 中 | 差 | 说明 |
|------|-----|-----|-----|------|
| 启动时间 | <1.5s | 1.5-3s | >3s | 从打开到页面可交互的时间 |
| 页面切换 | <300ms | 300-500ms | >500ms | 页面间导航的耗时 |
| setData耗时 | <50ms | 50-100ms | >100ms | 单次setData操作的耗时 |
| 请求耗时 | <500ms | 500-1000ms | >1000ms | 单次网络请求的耗时 |
| JS执行时间 | <200ms | 200-500ms | >500ms | JS操作的执行时间 |
| 内存峰值 | <30MB | 30-50MB | >50MB | 内存使用的峰值 |

### 6.2 性能分析方法

1. **趋势分析**：关注性能指标的变化趋势，而非单一数值
2. **对比分析**：与历史版本、竞品或行业基准进行对比
3. **用户分群**：按设备性能、网络环境分析不同用户群体的体验
4. **关联分析**：将性能数据与用户行为、转化率等业务指标关联

## 7. 常见问题

### Q1: PerfMonitor会影响小程序性能吗？

**A**: PerfMonitor设计为低开销工具，但在完整启用所有监控模块时可能有轻微影响。建议：
- 开发环境全量监控，辅助优化
- 生产环境选择性开启关键监控
- 重点性能测试时临时关闭监控

### Q2: 如何减少setData性能问题？

**A**: 解决setData性能问题的关键策略：
- 减少setData调用频次，合并多次更新
- 精确更新，只传递变化的数据
- 使用纯数据字段减少渲染开销
- 大列表考虑虚拟列表方案

### Q3: 上报数据的服务端如何实现？

**A**: 服务端建议实现以下功能：
- 接收并存储性能数据
- 聚合分析不同维度的性能指标
- 设置告警阈值，异常时通知
- 提供可视化报表，便于分析

---

## 贡献与反馈

如发现工具问题或有功能建议，请提交Issue或联系开发团队。 