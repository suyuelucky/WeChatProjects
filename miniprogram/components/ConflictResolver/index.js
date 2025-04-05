/**
 * 同步冲突可视化解决组件
 * 提供数据冲突的可视化交互界面
 */

import { ConflictStrategy } from '../../utils/syncConflictResolver';

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 冲突数据
    conflictData: {
      type: Object,
      value: null
    },
    // 数据类型名称
    resourceTypeName: {
      type: String,
      value: '数据'
    },
    // 是否自动显示
    autoShow: {
      type: Boolean,
      value: true
    },
    // 默认解决策略
    defaultStrategy: {
      type: String,
      value: ConflictStrategy.MANUAL_RESOLVE
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    visible: false,
    selected: 'manual', // 默认选中手动解决
    expandDiff: false,  // 是否展开差异视图
    resolvedData: null, // 解决后的数据
    diffFields: [],     // 存在差异的字段
    currentField: '',   // 当前选中的字段
    detailView: false,  // 是否显示详细视图
    compareMode: 'side-by-side', // 对比模式
    activeTab: 'diff',  // 活动标签页
    diffDetails: [],    // 差异详情
    loading: false      // 加载状态
  },

  /**
   * 数据监听器
   */
  observers: {
    'conflictData': function(conflict) {
      if (!conflict) return;
      
      // 当冲突数据更新时，处理差异信息
      if (this.data.autoShow) {
        this.setData({ visible: true });
      }
      
      // 处理冲突数据
      this.processConflictData(conflict);
    },
    'defaultStrategy': function(strategy) {
      // 当默认策略更新时，更新选中的策略
      let selected = 'manual';
      
      switch (strategy) {
        case ConflictStrategy.CLIENT_WINS:
          selected = 'client';
          break;
        case ConflictStrategy.SERVER_WINS:
          selected = 'server';
          break;
        case ConflictStrategy.LAST_WRITE_WINS:
          selected = 'lastWrite';
          break;
        case ConflictStrategy.MERGE:
          selected = 'merge';
          break;
        case ConflictStrategy.MANUAL_RESOLVE:
        default:
          selected = 'manual';
      }
      
      this.setData({ selected });
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 处理冲突数据
     * @param {Object} conflict 冲突数据
     */
    processConflictData(conflict) {
      if (!conflict || !conflict.clientData || !conflict.serverData) {
        return;
      }
      
      const { clientData, serverData, baseData } = conflict;
      
      // 计算差异字段
      const diffFields = this.getDiffFields(clientData, serverData, baseData);
      
      // 初始化解决后的数据
      const resolvedData = this.initResolvedData(clientData, serverData, baseData);
      
      // 生成差异详情
      const diffDetails = this.generateDiffDetails(clientData, serverData, baseData, diffFields);
      
      // 设置初始当前字段
      const currentField = diffFields.length > 0 ? diffFields[0].field : '';
      
      this.setData({
        diffFields,
        resolvedData,
        currentField,
        diffDetails,
        loading: false
      });
    },
    
    /**
     * 获取差异字段
     * @param {Object} clientData 客户端数据
     * @param {Object} serverData 服务器数据
     * @param {Object} baseData 基准数据
     * @returns {Array} 差异字段列表
     */
    getDiffFields(clientData, serverData, baseData) {
      const allFields = new Set([
        ...Object.keys(clientData || {}), 
        ...Object.keys(serverData || {})
      ]);
      
      const diffFields = [];
      
      for (const field of allFields) {
        // 跳过系统字段
        if (field.startsWith('_') || ['id', 'version'].includes(field)) {
          continue;
        }
        
        const clientValue = clientData ? clientData[field] : undefined;
        const serverValue = serverData ? serverData[field] : undefined;
        
        // 检查字段是否有差异
        if (JSON.stringify(clientValue) !== JSON.stringify(serverValue)) {
          let changeType = 'modified';
          
          if (baseData) {
            const baseValue = baseData[field];
            const clientChanged = JSON.stringify(clientValue) !== JSON.stringify(baseValue);
            const serverChanged = JSON.stringify(serverValue) !== JSON.stringify(baseValue);
            
            if (clientChanged && !serverChanged) {
              changeType = 'client_changed';
            } else if (!clientChanged && serverChanged) {
              changeType = 'server_changed';
            } else if (clientChanged && serverChanged) {
              changeType = 'both_changed';
            }
          } else if (clientValue === undefined) {
            changeType = 'server_only';
          } else if (serverValue === undefined) {
            changeType = 'client_only';
          }
          
          diffFields.push({
            field,
            changeType,
            clientValue,
            serverValue
          });
        }
      }
      
      return diffFields;
    },
    
    /**
     * 初始化解决后的数据
     * @param {Object} clientData 客户端数据
     * @param {Object} serverData 服务器数据
     * @param {Object} baseData 基准数据
     * @returns {Object} 初始解决数据
     */
    initResolvedData(clientData, serverData, baseData) {
      // 默认基于客户端数据
      return JSON.parse(JSON.stringify(clientData || {}));
    },
    
    /**
     * 生成差异详情
     * @param {Object} clientData 客户端数据
     * @param {Object} serverData 服务器数据
     * @param {Object} baseData 基准数据
     * @param {Array} diffFields 差异字段
     * @returns {Array} 差异详情列表
     */
    generateDiffDetails(clientData, serverData, baseData, diffFields) {
      return diffFields.map(diff => {
        const { field, changeType, clientValue, serverValue } = diff;
        
        // 获取基准值
        const baseValue = baseData ? baseData[field] : null;
        
        // 格式化值为字符串（用于显示）
        const formatValue = (value) => {
          if (value === undefined) return '未定义';
          if (value === null) return '空值';
          
          try {
            return typeof value === 'object' 
              ? JSON.stringify(value, null, 2) 
              : String(value);
          } catch (e) {
            return '格式化错误';
          }
        };
        
        return {
          field,
          changeType,
          clientValueDisplay: formatValue(clientValue),
          serverValueDisplay: formatValue(serverValue),
          baseValueDisplay: formatValue(baseValue),
          clientValue,
          serverValue,
          baseValue,
          // 默认建议，根据变更类型选择更可能正确的值
          suggestedValue: 
            changeType === 'client_changed' ? clientValue :
            changeType === 'server_changed' ? serverValue :
            clientData.updatedAt > serverData.updatedAt ? clientValue : serverValue
        };
      });
    },
    
    /**
     * 显示冲突解决器
     */
    show() {
      this.setData({ visible: true });
    },
    
    /**
     * 隐藏冲突解决器
     */
    hide() {
      this.setData({ visible: false });
    },
    
    /**
     * 切换解决策略
     * @param {Object} e 事件对象
     */
    onSelectStrategy(e) {
      const selected = e.currentTarget.dataset.strategy;
      this.setData({ selected });
      
      // 根据选择的策略预览解决结果
      this.previewResolvedData(selected);
    },
    
    /**
     * 预览解决数据
     * @param {string} strategy 解决策略
     */
    previewResolvedData(strategy) {
      const { conflictData } = this.data;
      if (!conflictData) return;
      
      const { clientData, serverData, baseData } = conflictData;
      let resolvedData;
      
      switch (strategy) {
        case 'client':
          resolvedData = JSON.parse(JSON.stringify(clientData));
          break;
        case 'server':
          resolvedData = JSON.parse(JSON.stringify(serverData));
          break;
        case 'lastWrite':
          resolvedData = (clientData.updatedAt > serverData.updatedAt) 
            ? JSON.parse(JSON.stringify(clientData))
            : JSON.parse(JSON.stringify(serverData));
          break;
        case 'merge':
          // 合并策略：自动尝试合并修改
          resolvedData = this.mergeData(clientData, serverData, baseData);
          break;
        case 'manual':
          // 手动解决：使用当前的解决状态
          break;
        default:
          resolvedData = JSON.parse(JSON.stringify(clientData));
      }
      
      if (strategy !== 'manual') {
        this.setData({ resolvedData });
      }
    },
    
    /**
     * 合并数据
     * @param {Object} clientData 客户端数据
     * @param {Object} serverData 服务器数据
     * @param {Object} baseData 基准数据
     * @returns {Object} 合并后的数据
     */
    mergeData(clientData, serverData, baseData) {
      const result = baseData ? { ...baseData } : {};
      const allFields = new Set([
        ...Object.keys(clientData || {}), 
        ...Object.keys(serverData || {})
      ]);
      
      for (const field of allFields) {
        const clientValue = clientData[field];
        const serverValue = serverData[field];
        
        // 系统字段处理
        if (field === 'id' || field === 'version' || field.startsWith('_')) {
          // 对于id，保持一致
          if (field === 'id') {
            result[field] = clientData.id || serverData.id;
          }
          // 对于版本，取最大值
          else if (field === 'version') {
            result[field] = Math.max(
              clientData.version || 0, 
              serverData.version || 0
            ) + 1;
          }
          // 其他系统字段使用客户端值
          else {
            result[field] = clientData[field];
          }
          continue;
        }
        
        // 普通字段合并逻辑
        if (baseData) {
          const baseValue = baseData[field];
          const clientChanged = JSON.stringify(clientValue) !== JSON.stringify(baseValue);
          const serverChanged = JSON.stringify(serverValue) !== JSON.stringify(baseValue);
          
          if (clientChanged && !serverChanged) {
            // 只有客户端修改，使用客户端值
            result[field] = clientValue;
          } else if (!clientChanged && serverChanged) {
            // 只有服务器修改，使用服务器值
            result[field] = serverValue;
          } else if (clientChanged && serverChanged) {
            // 两端都修改，选择时间戳较新的
            result[field] = (clientData.updatedAt > serverData.updatedAt) 
              ? clientValue : serverValue;
          } else {
            // 都没修改，保持原值
            result[field] = baseValue;
          }
        } else {
          // 没有基准数据，选择非空值
          if (clientValue !== undefined && clientValue !== null) {
            result[field] = clientValue;
          } else if (serverValue !== undefined && serverValue !== null) {
            result[field] = serverValue;
          }
        }
      }
      
      // 更新时间戳
      result.updatedAt = Date.now();
      
      return result;
    },
    
    /**
     * 切换字段选择
     * @param {Object} e 事件对象
     */
    onSelectField(e) {
      const field = e.currentTarget.dataset.field;
      this.setData({ currentField: field });
    },
    
    /**
     * 选择某个字段的值来源
     * @param {Object} e 事件对象
     */
    onSelectFieldValue(e) {
      const { field, source } = e.currentTarget.dataset;
      const { resolvedData, diffDetails, conflictData } = this.data;
      
      if (!resolvedData || !conflictData) return;
      
      // 获取字段详情
      const detail = diffDetails.find(d => d.field === field);
      if (!detail) return;
      
      // 根据选择的来源设置值
      let value;
      switch (source) {
        case 'client':
          value = conflictData.clientData[field];
          break;
        case 'server':
          value = conflictData.serverData[field];
          break;
        case 'base':
          value = conflictData.baseData ? conflictData.baseData[field] : undefined;
          break;
        default:
          value = undefined;
      }
      
      // 更新解决数据
      resolvedData[field] = value;
      
      // 更新状态
      this.setData({ 
        resolvedData,
        selected: 'manual' // 切换到手动模式
      });
    },
    
    /**
     * 切换对比模式
     * @param {Object} e 事件对象
     */
    onToggleCompareMode(e) {
      const mode = e.currentTarget.dataset.mode;
      this.setData({ compareMode: mode });
    },
    
    /**
     * 切换标签页
     * @param {Object} e 事件对象
     */
    onChangeTab(e) {
      const tab = e.currentTarget.dataset.tab;
      this.setData({ activeTab: tab });
    },
    
    /**
     * 切换差异视图展开状态
     */
    onToggleDiff() {
      this.setData({ expandDiff: !this.data.expandDiff });
    },
    
    /**
     * 切换详细视图
     */
    onToggleDetailView() {
      this.setData({ detailView: !this.data.detailView });
    },
    
    /**
     * 编辑字段值
     * @param {Object} e 事件对象
     */
    onEditFieldValue(e) {
      const { field, value } = e.detail;
      const { resolvedData } = this.data;
      
      if (!resolvedData) return;
      
      try {
        // 尝试解析JSON，处理对象/数组类型
        const parsedValue = typeof value === 'string' && (
          value.startsWith('{') || value.startsWith('[')
        ) ? JSON.parse(value) : value;
        
        // 更新解决数据
        resolvedData[field] = parsedValue;
        
        // 更新状态
        this.setData({ 
          resolvedData,
          selected: 'manual' // 切换到手动模式
        });
      } catch (error) {
        // JSON解析错误处理
        wx.showToast({
          title: 'JSON格式错误',
          icon: 'none'
        });
      }
    },
    
    /**
     * 提交解决方案
     */
    onSubmit() {
      const { resolvedData, selected, conflictData } = this.data;
      
      this.setData({ loading: true });
      
      // 根据所选策略获取最终解决方案
      let finalResolution;
      
      switch (selected) {
        case 'client':
          finalResolution = conflictData.clientData;
          break;
        case 'server':
          finalResolution = conflictData.serverData;
          break;
        case 'lastWrite':
          finalResolution = (conflictData.clientData.updatedAt > conflictData.serverData.updatedAt) 
            ? conflictData.clientData : conflictData.serverData;
          break;
        case 'merge': 
          finalResolution = this.mergeData(
            conflictData.clientData, 
            conflictData.serverData, 
            conflictData.baseData
          );
          break;
        case 'manual':
          finalResolution = resolvedData;
          break;
        default:
          finalResolution = resolvedData;
      }
      
      // 触发解决事件
      this.triggerEvent('resolve', { 
        resolvedData: finalResolution,
        strategy: selected
      });
      
      // 隐藏对话框
      setTimeout(() => {
        this.setData({ visible: false, loading: false });
      }, 300);
    },
    
    /**
     * 取消解决
     */
    onCancel() {
      this.setData({ visible: false });
      this.triggerEvent('cancel');
    }
  }
}) 