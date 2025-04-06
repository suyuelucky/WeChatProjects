/**
 * 冲突解决器模块
 * 用于检测和解决数据同步冲突
 */

// 冲突解决策略类型
const ConflictStrategy = {
  SERVER_WINS: 'server_wins',    // 服务器数据优先
  CLIENT_WINS: 'client_wins',    // 客户端数据优先
  LAST_WRITE_WINS: 'last_write_wins', // 最后写入优先
  MERGE: 'merge',                // 智能合并
  MANUAL_RESOLVE: 'manual_resolve' // 手动解决
};

// 字段合并策略
const FieldMergeStrategy = {
  NEWER_WINS: 'newer_wins',      // 较新的值优先
  NON_EMPTY_WINS: 'non_empty_wins', // 非空值优先
  PRIMITIVE_ONLY: 'primitive_only', // 只合并基本类型字段
  ARRAY_CONCAT: 'array_concat'   // 数组采用连接方式合并
};

/**
 * 检查是否存在冲突
 * @param {Object} clientData - 客户端数据
 * @param {Object} serverData - 服务器数据
 * @param {Object} baseData - 基准数据（三向合并）
 * @returns {boolean} - 是否存在冲突
 */
function hasConflict(clientData, serverData, baseData) {
  // 如果没有服务器数据，说明是新数据，不存在冲突
  if (!serverData) return false;
    
  // 如果没有客户端数据，也不存在冲突
  if (!clientData) return false;
    
  // 如果没有基准数据，简单比较两个版本是否一致
  if (!baseData) {
    return JSON.stringify(clientData) !== JSON.stringify(serverData);
  }
    
  // 如果有基准数据，检查是否客户端和服务器都修改了相同字段
  if (baseData) {
    const clientChangedFields = getChangedFields(baseData, clientData);
    const serverChangedFields = getChangedFields(baseData, serverData);
      
    // 检查是否有相同的修改字段
    for (const field of clientChangedFields) {
      if (serverChangedFields.includes(field)) {
        // 字段值不同，说明存在冲突
        if (JSON.stringify(clientData[field]) !== JSON.stringify(serverData[field])) {
          return true;
        }
      }
    }
  }
    
  return false;
}

/**
 * 获取两个对象之间变化的字段
 * @param {Object} obj1 - 原始对象
 * @param {Object} obj2 - 新对象
 * @returns {Array} - 变化的字段列表
 */
function getChangedFields(obj1, obj2) {
  const changedFields = [];
    
  // 首先检查obj2中存在但与obj1不同的字段
  Object.keys(obj2).forEach(key => {
    // 如果是对象自身的属性
    if (obj2.hasOwnProperty(key)) {
      // 如果obj1中不存在该属性，或者值不同
      if (!obj1.hasOwnProperty(key) || 
          JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
        changedFields.push(key);
      }
    }
  });
    
  // 再检查obj1中存在但在obj2中被删除的字段
  Object.keys(obj1).forEach(key => {
    if (obj1.hasOwnProperty(key) && !obj2.hasOwnProperty(key)) {
      changedFields.push(key);
    }
  });
    
  return changedFields;
}

/**
 * 解决数据冲突
 * @param {Object} clientData - 客户端数据
 * @param {Object} serverData - 服务器数据
 * @param {Object} baseData - 基准数据（三向合并）
 * @param {ConflictStrategy} strategy - 冲突解决策略
 * @returns {Object} - 解决冲突后的数据
 */
function resolveConflict(clientData, serverData, baseData, 
  strategy = ConflictStrategy.LAST_WRITE_WINS) {
    
  // 如果没有冲突，直接返回客户端数据
  if (!hasConflict(clientData, serverData, baseData)) {
    return clientData;
  }
    
  // 根据不同策略处理冲突
  return handleConflictByStrategy(clientData, serverData, baseData, strategy);
}

/**
 * 根据策略处理冲突
 * @param {Object} clientData - 客户端数据
 * @param {Object} serverData - 服务器数据
 * @param {Object} baseData - 基准数据
 * @param {ConflictStrategy} strategy - 冲突解决策略
 * @returns {Object} - 解决冲突后的数据
 */
function handleConflictByStrategy(clientData, serverData, baseData, strategy) {
  switch (strategy) {
    case ConflictStrategy.SERVER_WINS:
      return serverData;
        
    case ConflictStrategy.CLIENT_WINS:
      return clientData;
        
    case ConflictStrategy.LAST_WRITE_WINS:
      // 比较时间戳，选择最新的数据
      return (clientData.updatedAt > serverData.updatedAt) ? clientData : serverData;
        
    case ConflictStrategy.MERGE:
      // 合并数据（仅当有基准数据时）
      if (baseData) {
        return mergeData(clientData, serverData, baseData);
      }
      // 如果没有基准数据，则默认使用最后写入优先策略
      return (clientData.updatedAt > serverData.updatedAt) ? clientData : serverData;
        
    case ConflictStrategy.MANUAL_RESOLVE:
      // 手动解决需要返回冲突信息，由UI层处理
      return {
        _conflict: true,
        clientData: clientData,
        serverData: serverData,
        baseData: baseData
      };
        
    default:
      // 默认使用最后写入优先策略
      return (clientData.updatedAt > serverData.updatedAt) ? clientData : serverData;
  }
}

/**
 * 合并数据
 * @param {Object} clientData - 客户端数据
 * @param {Object} serverData - 服务器数据
 * @param {Object} baseData - 基准数据
 * @returns {Object} - 合并后的数据
 */
function mergeData(clientData, serverData, baseData) {
  const result = { ...baseData };
  const clientChangedFields = getChangedFields(baseData, clientData);
  const serverChangedFields = getChangedFields(baseData, serverData);
    
  // 处理客户端的变更
  clientChangedFields.forEach(field => {
    // 如果服务器没有修改此字段，使用客户端的值
    if (!serverChangedFields.includes(field)) {
      result[field] = clientData[field];
    }
  });
    
  // 处理服务器的变更
  serverChangedFields.forEach(field => {
    // 如果客户端没有修改此字段，使用服务器的值
    if (!clientChangedFields.includes(field)) {
      result[field] = serverData[field];
    }
    // 如果客户端和服务器都修改了此字段
    else if (clientChangedFields.includes(field)) {
      // 对于数组类型，可以选择合并
      if (Array.isArray(clientData[field]) && Array.isArray(serverData[field])) {
        // 合并两个数组并去重
        result[field] = [...new Set([...clientData[field], ...serverData[field]])];
      }
      // 对于对象类型，可以递归合并
      else if (
        typeof clientData[field] === 'object' && clientData[field] !== null &&
        typeof serverData[field] === 'object' && serverData[field] !== null &&
        typeof baseData[field] === 'object' && baseData[field] !== null
      ) {
        result[field] = resolveConflict(
          clientData[field], 
          serverData[field], 
          baseData[field], 
          ConflictStrategy.MERGE
        );
      }
      // 对于简单类型，使用最后更新时间较新的值
      else {
        result[field] = (clientData.updatedAt > serverData.updatedAt) 
          ? clientData[field] 
          : serverData[field];
      }
    }
  });
    
  // 更新合并后的时间戳
  result.updatedAt = Math.max(
    clientData.updatedAt || 0,
    serverData.updatedAt || 0
  );
    
  return result;
}

// 导出冲突解决工具
module.exports = {
  resolveConflict,
  hasConflict,
  getChangedFields,
  handleConflictByStrategy,
  mergeData,
  ConflictStrategy,
  FieldMergeStrategy
}; 