# 数据同步框架2.0

## 项目概述

数据同步框架2.0是专为微信小程序环境打造的高可靠、工业级数据同步解决方案。该框架采用分层架构和组件化设计，提供了全面的数据同步管理能力，包括数据同步、冲突解决、版本控制、离线操作、数据迁移等核心功能。

本框架遵循最高工业级标准开发，致力于解决基层工作场景中数据同步的各种挑战，特别是弱网环境、多设备操作和大量数据处理场景，确保数据的一致性、完整性和可靠性。

## 核心特性

- **高度模块化**: 分层架构，组件解耦，支持按需组合和替换
- **智能冲突解决**: 自动检测并解决数据冲突，提供多种冲突解决策略
- **高效版本控制**: 精确跟踪数据变更，支持细粒度的版本管理
- **差量同步机制**: 仅传输变更部分，大幅降低流量消耗
- **强大离线支持**: 完整支持离线操作，网络恢复后自动同步
- **数据迁移能力**: 无缝支持数据结构升级和历史数据迁移
- **自适应同步策略**: 根据网络状况和数据重要性动态调整同步策略
- **全面监控体系**: 内置同步状态监控，实时可视化同步进度和问题
- **安全同步机制**: 数据传输加密，确保敏感信息安全
- **多端数据一致性**: 确保不同设备间数据的一致性和完整性

## 基层工作场景增强功能

为适应中国基层工作人员的实际工作环境和需求，数据同步框架2.0特别增强了以下功能：

- **极端弱网适应**: 在2G甚至更弱网络环境下仍能保证核心数据同步
- **断点续传**: 网络中断时自动保存同步进度，恢复连接后从断点继续
- **优先级同步**: 根据数据重要性设定同步优先级，确保关键数据优先同步
- **自动恢复机制**: 遇到同步故障时智能尝试多种恢复策略
- **本地优先策略**: 采用本地数据优先模式，确保操作无延迟体验
- **增量快照**: 定期创建增量数据快照，防止数据丢失
- **冲突预防**: 智能预测可能的数据冲突并提前采取措施
- **智能批处理**: 自动将小量数据更新合并批量处理，减少同步次数
- **资源占用优化**: 针对低端设备优化资源使用，降低CPU和内存占用

## 架构设计

```
┌───────────────────────────────────────────────────────────┐
│                      SyncService                           │
├───────┬───────┬────────┬───────┬──────────┬───────────────┤
│SyncAda│DataVer│Conflict│Change │LocalStore│SyncScheduler  │
│pter   │sionMgr│Resolver│Tracker│Manager   │               │
├───────┴──┬────┴────────┴───┬───┴──────────┼───────────────┤
│OfflineMode│                 │    Migration │  DiffGenerator│
│Manager    │                 │    Manager   │               │
└───────────┴─────────────────┴─────────────┴───────────────┘
```

### 核心组件

| 组件名称 | 职责 |
|---------|------|
| SyncService | 核心引擎，整合和协调各个组件，提供统一的API接口 |
| SyncAdapter | 适配底层同步实现，使得核心逻辑与具体API实现解耦 |
| DataVersionManager | 管理数据版本，跟踪变更历史，支持版本回退 |
| ConflictResolver | 检测和解决数据冲突，确保数据一致性 |
| ChangeTracker | 跟踪本地数据变化，为差量同步提供支持 |
| LocalStorageManager | 管理本地数据存储，提供高效的读写和查询能力 |
| SyncScheduler | 调度同步任务，管理同步频率和优先级 |
| MigrationManager | 处理数据结构变更和数据迁移 |
| DiffGenerator | 生成数据差异，支持高效的差量同步 |
| OfflineModeManager | 管理离线模式下的数据操作和同步 |

## 快速使用指南

### 基础同步

```javascript
// 导入模块
const A4Sync = require('../sync/A4Sync');

// 创建同步实例
const syncManager = new A4Sync({
  storageKey: 'workRecords',
  serverUrl: 'https://api.example.com/sync',
  syncInterval: 60000, // 1分钟同步一次
  conflictStrategy: 'server-wins', // 冲突时服务器数据优先
  offlineEnabled: true // 启用离线支持
});

// 初始化同步
syncManager.init()
  .then(() => {
    console.log('同步初始化完成');
  })
  .catch(error => {
    console.error('同步初始化失败:', error);
  });

// 获取数据
syncManager.getData('taskList')
  .then(data => {
    console.log('获取数据成功:', data);
    // 处理数据...
  })
  .catch(error => {
    console.error('获取数据失败:', error);
    // 处理错误...
  });

// 更新数据
syncManager.updateData('taskList', {
  id: 'task001',
  title: '基层走访记录',
  content: '今日走访了5户农户...',
  updateTime: Date.now()
})
.then(() => {
  console.log('数据更新成功，将在下次同步时上传');
})
.catch(error => {
  console.error('数据更新失败:', error);
});

// 手动触发同步
syncManager.sync()
  .then(result => {
    console.log('同步完成:', result);
    // result.added - 新增数据条数
    // result.updated - 更新数据条数
    // result.deleted - 删除数据条数
    // result.conflicts - 冲突数据条数
  })
  .catch(error => {
    console.error('同步失败:', error);
  });
```

### 冲突处理

```javascript
// 自定义冲突解决策略
syncManager.setConflictResolver(function(localData, serverData, metadata) {
  // 根据业务逻辑解决冲突
  if (localData.priority > serverData.priority) {
    return localData; // 本地数据优先
  } else if (serverData.updateTime > localData.updateTime) {
    return serverData; // 更新时间较新的优先
  } else {
    // 合并数据
    return {
      ...serverData,
      localNotes: localData.localNotes,
      // 保留其他需要的本地字段
    };
  }
});

// 监听冲突事件
syncManager.on('conflict', function(conflict) {
  console.log('检测到数据冲突:', conflict);
  // conflict.local - 本地数据
  // conflict.server - 服务器数据
  // conflict.resolved - 解决后的数据
  // conflict.path - 冲突数据路径
});
```

### 离线操作

```javascript
// 检查离线状态
if (syncManager.isOffline()) {
  console.log('当前处于离线状态，操作将在网络恢复后同步');
}

// 监听同步状态变化
syncManager.on('statusChange', function(status) {
  if (status === 'offline') {
    showOfflineIndicator();
  } else if (status === 'online') {
    hideOfflineIndicator();
  } else if (status === 'syncing') {
    showSyncingIndicator();
  } else if (status === 'completed') {
    showLastSyncTime(syncManager.getLastSyncTime());
  }
});

// 预缓存关键数据
syncManager.prefetchData(['importantForms', 'userProfile', 'recentTasks'])
  .then(() => {
    console.log('关键数据已预缓存，可在离线状态下使用');
  });
```

### 数据迁移

```javascript
// 注册数据迁移脚本
syncManager.registerMigration({
  version: '2.0',
  up: function(data) {
    // 将旧格式数据升级到新格式
    return data.map(item => {
      if (item.type === 'oldFormat') {
        return {
          id: item.id,
          type: 'newFormat',
          content: {
            text: item.content,
            attachments: item.files || []
          },
          // 其他字段转换...
        };
      }
      return item;
    });
  },
  down: function(data) {
    // 将新格式数据降级到旧格式（可选）
    // ...
  }
});

// 执行数据迁移
syncManager.migrate()
  .then(result => {
    console.log('数据迁移完成:', result);
    // result.fromVersion - 起始版本
    // result.toVersion - 目标版本
    // result.migratedItems - 迁移的数据项数量
  })
  .catch(error => {
    console.error('数据迁移失败:', error);
  });
```

## 更多文档

- [开发者指南](./标准/开发者指南.md)
- [数据同步策略接口](./标准/数据同步策略接口.md)
- [数据迁移接口](./标准/数据迁移接口.md)
- [冲突解决规范](./标准/冲突解决规范.md)
- [代码示例集](./标准/代码示例集.md)
- [组件关系图谱](./标准/组件关系图谱.md)

## 预期性能

数据同步框架2.0设计性能目标：

| 性能指标 | 目标值 | 描述 |
|---------|-------|------|
| 同步耗时 | <200ms | 小型数据集(100条)的同步时间 |
| 大数据同步 | <3s | 大型数据集(1000条)的同步时间 |
| 内存占用 | <5MB | 框架运行时的内存占用 |
| 存储效率 | >70% | 差量同步相比全量同步的流量节省率 |
| 离线恢复 | 100% | 离线操作恢复成功率 |
| 冲突解决 | 99.9% | 自动冲突解决成功率 |
| CPU占用 | <10% | 同步过程中CPU占用率 |
| 弱网完成率 | >95% | 2G网络下同步完成率 |

## 适用场景

数据同步框架2.0特别适合以下场景：

1. **基层工作数据采集**：村(社区)干部下乡走访数据采集与上报
2. **多设备数据同步**：用户在手机和平板间无缝切换使用
3. **弱网环境工作**：在网络条件不佳的农村或偏远地区工作
4. **大量照片数据同步**：包含大量照片的工作记录同步
5. **表单数据实时保存**：长表单填写过程中的实时保存与恢复
6. **离线工作模式**：完全离线环境下的数据录入与后续同步
7. **敏感数据安全同步**：需要安全传输的个人或敏感信息 