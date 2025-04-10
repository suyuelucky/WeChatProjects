/**
 * 工作留痕系统核心服务
 * 负责管理留痕相关功能，包括留痕类型、数据存储和处理等
 */
var EventBus = require('../utils/eventBus.js');

var TraceService = {
  /**
   * 初始化服务
   * @return {object} 当前实例
   */
  init: function(container) {
    this.container = container;
    // 监听相关事件
    EventBus.on('trace:data:updated', this.handleDataUpdated.bind(this));
    console.log('工作留痕服务初始化完成');
    return this;
  },

  /**
   * 获取所有留痕类型
   * @return {Array} 留痕类型列表
   */
  getTraceTypes: function() {
    return [
      {
        id: 'article',
        name: '文章型留痕',
        icon: 'document',
        description: '记录工作中撰写的文章、报告等文字内容'
      },
      {
        id: 'story',
        name: '事迹型留痕',
        icon: 'flag',
        description: '记录工作事迹、成就和重要活动'
      },
      {
        id: 'daily',
        name: '日常型留痕',
        icon: 'clock',
        description: '记录日常工作内容和例行事务'
      },
      {
        id: 'project',
        name: '项目型留痕',
        icon: 'folder',
        description: '记录项目进展、里程碑和成果'
      }
    ];
  },

  /**
   * 获取所有留痕记录
   * @param {Object} options - 查询选项
   * @returns {Promise} 返回留痕记录数组的Promise
   */
  getAllTraces: function(options) {
    return new Promise(function(resolve) {
      // 模拟异步获取数据
      setTimeout(function() {
        resolve([
          {
            id: 'trace-001',
            title: '工作日志：项目启动会议',
            content: '参加了项目启动会议，讨论了项目目标和时间线',
            type: 'daily',
            createTime: '2023-12-01T09:00:00.000Z',
            updateTime: '2023-12-01T09:30:00.000Z',
            status: 'synced',
            images: []
          },
          {
            id: 'trace-002',
            title: '季度工作总结报告',
            content: '完成第三季度工作总结报告，分析了主要成果和挑战',
            type: 'article',
            createTime: '2023-11-25T14:20:00.000Z',
            updateTime: '2023-11-26T10:15:00.000Z',
            status: 'synced',
            images: ['cloud://example-1g5ab1sd.7878/images/report-cover.jpg']
          },
          {
            id: 'trace-003',
            title: '优秀员工表彰活动',
            content: '参加年度优秀员工表彰活动，获得"创新奖"',
            type: 'story',
            createTime: '2023-12-05T16:30:00.000Z',
            updateTime: '2023-12-05T16:30:00.000Z',
            status: 'local',
            images: [
              'cloud://example-1g5ab1sd.7878/images/award-1.jpg',
              'cloud://example-1g5ab1sd.7878/images/award-2.jpg'
            ]
          },
          {
            id: 'trace-004',
            title: '新产品开发项目',
            content: '完成新产品原型设计，准备进入开发阶段',
            type: 'project',
            createTime: '2023-11-10T08:45:00.000Z',
            updateTime: '2023-12-02T17:20:00.000Z',
            status: 'synced',
            images: ['cloud://example-1g5ab1sd.7878/images/prototype.jpg']
          }
        ]);
      }, 500);
    });
  },

  /**
   * 获取单个留痕记录详情
   * @param {String} id - 留痕记录ID
   * @returns {Promise} 返回留痕记录详情的Promise
   */
  getTraceById: function(id) {
    return new Promise(function(resolve, reject) {
      // 模拟异步获取数据
      setTimeout(function() {
        if (!id) {
          reject(new Error('留痕ID不能为空'));
          return;
        }
        
        // 模拟查找对应ID的记录
        var mockTraces = {
          'trace-001': {
            id: 'trace-001',
            title: '工作日志：项目启动会议',
            content: '参加了项目启动会议，讨论了项目目标和时间线。\n\n会议确定了关键里程碑和负责人，我被安排负责用户界面设计部分。\n\n接下来两周需要提交初步设计方案。',
            type: 'daily',
            createTime: '2023-12-01T09:00:00.000Z',
            updateTime: '2023-12-01T09:30:00.000Z',
            status: 'synced',
            images: [],
            location: '会议室A',
            tags: ['会议', '项目', '工作日志'],
            participants: ['张三', '李四', '王五']
          },
          'trace-002': {
            id: 'trace-002',
            title: '季度工作总结报告',
            content: '完成第三季度工作总结报告，分析了主要成果和挑战。\n\n本季度完成了三个主要项目的交付，客户满意度达到95%。\n\n面临的主要挑战是人力资源不足，建议下季度增加团队人员配置。',
            type: 'article',
            createTime: '2023-11-25T14:20:00.000Z',
            updateTime: '2023-11-26T10:15:00.000Z',
            status: 'synced',
            images: ['cloud://example-1g5ab1sd.7878/images/report-cover.jpg'],
            attachment: 'cloud://example-1g5ab1sd.7878/documents/Q3-Summary.pdf',
            tags: ['报告', '总结', '季度工作']
          }
        };
        
        if (mockTraces[id]) {
          resolve(mockTraces[id]);
        } else {
          reject(new Error('找不到对应ID的留痕记录'));
        }
      }, 300);
    });
  },

  /**
   * 创建新的留痕记录
   * @param {Object} traceData - 留痕数据
   * @returns {Promise} 返回新创建记录的Promise
   */
  createTrace: function(traceData) {
    return new Promise(function(resolve, reject) {
      // 验证必要字段
      if (!traceData.title || !traceData.type) {
        reject(new Error('标题和类型为必填字段'));
        return;
      }
      
      // 模拟异步创建
      setTimeout(function() {
        // 生成新ID
        var newId = 'trace-' + Date.now().toString().substring(6);
        
        // 创建新记录
        var newTrace = Object.assign({}, traceData, {
          id: newId,
          createTime: new Date().toISOString(),
          updateTime: new Date().toISOString(),
          status: 'local' // 新创建的记录初始为本地状态
        });
        
        resolve(newTrace);
      }, 600);
    });
  },

  /**
   * 更新留痕记录
   * @param {String} id - 留痕记录ID
   * @param {Object} updateData - 更新的数据
   * @returns {Promise} 返回更新后记录的Promise
   */
  updateTrace: function(id, updateData) {
    return new Promise(function(resolve, reject) {
      if (!id) {
        reject(new Error('留痕ID不能为空'));
        return;
      }
      
      // 模拟异步更新
      setTimeout(function() {
        // 更新时间戳
        updateData.updateTime = new Date().toISOString();
        
        // 返回更新后的完整记录
        resolve(Object.assign({
          id: id,
          createTime: new Date(Date.now() - 86400000).toISOString(), // 模拟创建时间为昨天
          status: 'local'
        }, updateData));
      }, 500);
    });
  },

  /**
   * 删除留痕记录
   * @param {String} id - 留痕记录ID
   * @returns {Promise} 返回操作结果的Promise
   */
  deleteTrace: function(id) {
    return new Promise(function(resolve, reject) {
      if (!id) {
        reject(new Error('留痕ID不能为空'));
        return;
      }
      
      // 模拟异步删除
      setTimeout(function() {
        resolve({
          success: true,
          id: id,
          deletedAt: new Date().toISOString()
        });
      }, 400);
    });
  },

  /**
   * 同步本地记录到服务器
   * @returns {Promise} 返回同步结果的Promise
   */
  syncTraces: function() {
    return new Promise(function(resolve) {
      // 模拟同步过程
      setTimeout(function() {
        resolve({
          success: true,
          syncedCount: 3,
          syncTime: new Date().toISOString()
        });
      }, 1000);
    });
  },

  /**
   * 处理数据更新事件
   * @param {Object} data - 更新的数据
   * @private
   */
  handleDataUpdated: function(data) {
    console.log('留痕数据已更新:', data.id);
    
    // 如果更新包含删除操作，可能需要特殊处理
    if (data.action === 'delete') {
      console.log('留痕记录已删除:', data.id);
      
      // 这里可以触发其他事件或执行清理操作
      EventBus.emit('trace:deleted', {
        id: data.id,
        timestamp: new Date().toISOString()
      });
    }
  }
};

module.exports = TraceService; 