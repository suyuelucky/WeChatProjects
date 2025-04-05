/**
 * 数据同步冲突解决策略
 * 处理多端同步可能发生的数据冲突
 */

// 冲突解决策略类型
export const ConflictStrategy = {
  SERVER_WINS: 'server_wins',    // 服务器数据优先
  CLIENT_WINS: 'client_wins',    // 客户端数据优先
  LAST_WRITE_WINS: 'last_write_wins',  // 最后修改时间优先
  MANUAL_RESOLVE: 'manual_resolve',    // 手动解决冲突
  MERGE: 'merge'                 // 合并数据
};

/**
 * 检测数据冲突
 * @param {Object} clientData - 客户端数据
 * @param {Object} serverData - 服务器数据
 * @param {Object} baseData - 基准数据（上次同步时的数据）
 * @returns {boolean} - 是否存在冲突
 */
export const hasConflict = (clientData, serverData, baseData) => {
  // 如果没有服务器数据，说明是新数据，不存在冲突
  if (!serverData) return false;
  
  // 如果没有客户端数据，也不存在冲突
  if (!clientData) return false;
  
  // 检查版本或时间戳
  if (clientData.version !== serverData.version) {
    return true;
  }
  
  // 如果有基准数据，检查是否客户端和服务器都修改了相同字段
  if (baseData) {
    const clientChangedFields = getChangedFields(baseData, clientData);
    const serverChangedFields = getChangedFields(baseData, serverData);
    
    // 检查是否有相同的修改字段
    for (const field of clientChangedFields) {
      if (serverChangedFields.includes(field)) {
        return true;
      }
    }
  }
  
  return false;
};

/**
 * 获取两个对象之间变化的字段
 * @param {Object} obj1 - 对象1
 * @param {Object} obj2 - 对象2
 * @returns {Array} - 变化的字段列表
 */
const getChangedFields = (obj1, obj2) => {
  const changedFields = [];
  
  // 获取所有字段
  const allFields = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
  
  // 检查每个字段
  for (const field of allFields) {
    // 如果字段在两个对象中值不同，则添加到变化列表
    if (JSON.stringify(obj1[field]) !== JSON.stringify(obj2[field])) {
      changedFields.push(field);
    }
  }
  
  return changedFields;
};

/**
 * 解决数据冲突
 * @param {Object} clientData - 客户端数据
 * @param {Object} serverData - 服务器数据
 * @param {Object} baseData - 基准数据（上次同步时的数据）
 * @param {string} strategy - 冲突解决策略（默认为最后写入优先）
 * @returns {Object} - 解决冲突后的数据
 */
export const resolveConflict = (clientData, serverData, baseData, 
  strategy = ConflictStrategy.LAST_WRITE_WINS) => {
  
  // 如果没有冲突，直接返回客户端数据
  if (!hasConflict(clientData, serverData, baseData)) {
    return clientData;
  }
  
  // 根据不同策略处理冲突
  return handleConflictByStrategy(clientData, serverData, baseData, strategy);
};

/**
 * 根据策略处理冲突
 * @param {Object} clientData - 客户端数据
 * @param {Object} serverData - 服务器数据
 * @param {Object} baseData - 基准数据
 * @param {string} strategy - 冲突解决策略
 * @returns {Object} - 解决冲突后的数据
 */
const handleConflictByStrategy = (clientData, serverData, baseData, strategy) => {
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
        clientData,
        serverData,
        baseData
      };
      
    default:
      return (clientData.updatedAt > serverData.updatedAt) ? clientData : serverData;
  }
};

/**
 * 合并两个对象的数据，基于基准数据
 * @param {Object} clientData - 客户端数据
 * @param {Object} serverData - 服务器数据
 * @param {Object} baseData - 基准数据
 * @returns {Object} - 合并后的数据
 */
const mergeData = (clientData, serverData, baseData) => {
  const result = { ...baseData };
  const clientChangedFields = getChangedFields(baseData, clientData);
  const serverChangedFields = getChangedFields(baseData, serverData);
  
  // 处理客户端的变更
  for (const field of clientChangedFields) {
    if (!serverChangedFields.includes(field)) {
      // 如果服务器没有修改此字段，使用客户端的值
      result[field] = clientData[field];
    } else if (JSON.stringify(clientData[field]) === JSON.stringify(serverData[field])) {
      // 如果两边都修改了，但值相同，直接使用新值
      result[field] = clientData[field];
    } else {
      // 如果两边都修改了，但值不同，则取时间戳较新的
      const useClientValue = clientData.updatedAt > serverData.updatedAt;
      result[field] = useClientValue ? clientData[field] : serverData[field];
    }
  }
  
  // 处理服务器端独有的变更
  for (const field of serverChangedFields) {
    if (!clientChangedFields.includes(field)) {
      result[field] = serverData[field];
    }
  }
  
  // 更新版本和时间戳
  result.version = Math.max(clientData.version || 0, serverData.version || 0) + 1;
  result.updatedAt = Date.now();
  
  return result;
}; 