/**
 * 冲突解决测试用模拟数据
 * 
 * 创建时间: 2025-04-08 21:54:10
 * 创建者: Claude-3.7-Sonnet
 * 文档分类: 测试数据
 */

'use strict';

/**
 * 冲突测试模拟数据
 */
module.exports = {
  /**
   * 无冲突测试数据
   */
  noConflict: {
    local: {
      id: 'record-001',
      value: {
        name: '测试数据',
        count: 1,
        tags: ['test']
      },
      version: '1.0.0',
      timestamp: Date.now() - 86400000, // 1天前
      baseVersion: '0.9.0'
    },
    server: {
      id: 'record-001',
      value: {
        name: '测试数据',
        count: 1,
        tags: ['test']
      },
      version: '1.0.0',
      timestamp: Date.now() - 86400000, // 1天前
      baseVersion: '0.9.0'
    },
    base: {
      id: 'record-001',
      value: {
        name: '测试数据',
        count: 1,
        tags: ['test']
      },
      version: '0.9.0',
      timestamp: Date.now() - 172800000 // 2天前
    }
  },
  
  /**
   * 版本冲突测试数据
   */
  versionConflict: {
    local: {
      id: 'record-002',
      value: {
        name: '本地修改数据',
        count: 5,
        tags: ['test', 'local']
      },
      version: '1.0.1',
      timestamp: Date.now() - 3600000, // 1小时前
      baseVersion: '1.0.0'
    },
    server: {
      id: 'record-002',
      value: {
        name: '服务器修改数据',
        count: 10,
        tags: ['test', 'server']
      },
      version: '1.0.2',
      timestamp: Date.now() - 7200000, // 2小时前
      baseVersion: '1.0.0'
    },
    base: {
      id: 'record-002',
      value: {
        name: '原始数据',
        count: 1,
        tags: ['test']
      },
      version: '1.0.0',
      timestamp: Date.now() - 86400000 // 1天前
    }
  },
  
  /**
   * 更新冲突测试数据
   */
  updateConflict: {
    id: 'conflict-001',
    type: 'update',
    path: 'records/record-003',
    timestamp: Date.now(),
    clientData: {
      id: 'record-003',
      value: {
        name: '客户端更新',
        count: 7,
        tags: ['test', 'client']
      },
      version: '1.1.0',
      timestamp: Date.now() - 3600000 // 1小时前
    },
    serverData: {
      id: 'record-003',
      value: {
        name: '服务器更新',
        count: 12,
        tags: ['test', 'server']
      },
      version: '1.1.0',
      timestamp: Date.now() - 7200000 // 2小时前
    }
  },
  
  /**
   * 删除冲突测试数据
   */
  deleteConflict: {
    id: 'conflict-002',
    type: 'delete',
    path: 'records/record-004',
    timestamp: Date.now(),
    clientData: {
      id: 'record-004',
      deleted: true,
      timestamp: Date.now() - 3600000 // 1小时前
    },
    serverData: {
      id: 'record-004',
      value: {
        name: '服务器修改了已删除项',
        count: 15,
        tags: ['test', 'modified']
      },
      version: '1.2.0',
      timestamp: Date.now() - 7200000 // 2小时前
    }
  },
  
  /**
   * 字段级冲突测试数据
   */
  fieldLevelConflict: {
    id: 'conflict-003',
    type: 'update',
    path: 'records/record-005',
    timestamp: Date.now(),
    clientData: {
      id: 'record-005',
      value: {
        field1: '客户端值1',
        field2: '客户端值2',
        field4: '客户端专有字段'
      },
      version: '1.3.0',
      timestamp: Date.now() - 3600000 // 1小时前
    },
    serverData: {
      id: 'record-005',
      value: {
        field1: '服务器值1',
        field3: '服务器值3',
        field5: '服务器专有字段'
      },
      version: '1.3.0',
      timestamp: Date.now() - 7200000 // 2小时前
    },
    base: {
      id: 'record-005',
      value: {
        field1: '原始值1',
        field2: '原始值2',
        field3: '原始值3'
      },
      version: '1.2.0',
      timestamp: Date.now() - 86400000 // 1天前
    }
  },
  
  /**
   * 结构冲突测试数据
   */
  structureConflict: {
    id: 'conflict-004',
    type: 'structure',
    path: 'records/record-006',
    timestamp: Date.now(),
    clientData: {
      id: 'record-006',
      value: {
        name: '客户端数据',
        details: {
          type: 'complex',
          items: [
            { id: 1, value: 'one' },
            { id: 2, value: 'two' }
          ]
        }
      },
      metadata: {
        schemaVersion: '2.0.0'
      },
      version: '1.4.0',
      timestamp: Date.now() - 3600000 // 1小时前
    },
    serverData: {
      id: 'record-006',
      value: {
        name: '服务器数据',
        details: [
          { itemId: 1, itemValue: 'one' },
          { itemId: 2, itemValue: 'two' }
        ]
      },
      metadata: {
        schemaVersion: '1.0.0'
      },
      version: '1.4.0',
      timestamp: Date.now() - 7200000 // 2小时前
    }
  },
  
  /**
   * 迁移冲突测试数据
   */
  migrationConflict: {
    local: {
      id: 'record-007',
      value: {
        fullName: '迁移后数据',
        age: 30,
        displayName: '迁移后数据'
      },
      metadata: {
        schemaVersion: '3.0.0'
      },
      version: '1.5.0',
      timestamp: Date.now() - 3600000 // 1小时前
    },
    server: {
      id: 'record-007',
      value: {
        name: '旧格式数据',
        age: '25' // 字符串格式
      },
      metadata: {
        schemaVersion: '2.0.0'
      },
      version: '1.5.0',
      timestamp: Date.now() - 7200000 // 2小时前
    }
  },
  
  /**
   * 生成批量测试数据
   * @param {number} count 数据量
   * @param {string} target 目标类型(local|server)
   * @returns {Array} 生成的数据数组
   */
  generateBatchChanges: function(count, target) {
    var changes = [];
    
    for (var i = 0; i < count; i++) {
      var id = 'batch-' + (10000 + i);
      
      // 为了模拟冲突，使部分记录ID相同
      if (target === 'server' && i % 10 === 0) {
        id = 'batch-' + (10000 + i - 1);
      }
      
      changes.push({
        id: id,
        value: {
          name: target + '-' + i,
          count: i,
          tags: [target, 'test']
        },
        version: '1.0.' + i,
        timestamp: Date.now() - (i * 1000)
      });
    }
    
    return changes;
  },
  
  /**
   * 生成基础数据
   * @param {number} count 数据量
   * @returns {Object} 基础数据对象
   */
  generateBaseData: function(count) {
    var baseData = {};
    
    for (var i = 0; i < count; i++) {
      var id = 'batch-' + (10000 + i);
      
      baseData[id] = {
        id: id,
        value: {
          name: 'base-' + i,
          count: i,
          tags: ['base', 'test']
        },
        version: '0.9.' + i,
        timestamp: Date.now() - (86400000 + i * 1000)
      };
    }
    
    return baseData;
  },
  
  /**
   * 生成指定数量的冲突对象
   * @param {number} count 冲突数量
   * @returns {Array} 冲突对象数组
   */
  generateConflicts: function(count) {
    var conflicts = [];
    var types = ['update', 'delete', 'update', 'structure', 'update'];
    
    for (var i = 0; i < count; i++) {
      var type = types[i % types.length];
      
      conflicts.push({
        id: 'gen-conflict-' + i,
        type: type,
        path: 'records/record-gen-' + i,
        timestamp: Date.now() - (i * 100),
        clientData: {
          id: 'record-gen-' + i,
          value: {
            name: '客户端生成数据-' + i,
            count: i,
            tags: ['client', 'test']
          },
          version: '1.0.' + i,
          timestamp: Date.now() - (3600000 + i * 100)
        },
        serverData: {
          id: 'record-gen-' + i,
          value: {
            name: '服务器生成数据-' + i,
            count: i * 2,
            tags: ['server', 'test']
          },
          version: '1.0.' + i,
          timestamp: Date.now() - (7200000 + i * 100)
        },
        // 只有结构冲突有额外的元数据
        metadata: type === 'structure' ? {
          clientSchema: '2.0.0',
          serverSchema: '1.0.0'
        } : undefined
      });
    }
    
    return conflicts;
  }
}; 