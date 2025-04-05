import React, { useState, useEffect } from 'react';
import { useNetworkStatus } from '../../utils/networkDetector';
import { syncQueue } from '../../utils/storageUtils';
import './style.css';

/**
 * 网络状态显示组件
 * 显示当前网络连接状态和离线操作队列
 */
const NetworkStatus = ({ showDebug = false, onSyncNow }) => {
  const isOnline = useNetworkStatus();
  const [queueStats, setQueueStats] = useState({
    length: 0,
    lastSync: null
  });

  // 获取同步队列状态
  const fetchQueueStats = async () => {
    try {
      const queue = await syncQueue.getAll();
      const stats = {
        length: queue.length,
        lastSync: localStorage.getItem('lastSync')
          ? new Date(parseInt(localStorage.getItem('lastSync'), 10)).toLocaleString()
          : null
      };
      setQueueStats(stats);
    } catch (error) {
      console.error('获取同步队列状态失败', error);
    }
  };

  // 处理手动同步
  const handleSyncNow = () => {
    if (!isOnline) {
      alert('当前无网络连接，无法同步');
      return;
    }

    if (typeof onSyncNow === 'function') {
      onSyncNow();
    }

    // 更新最后同步时间
    localStorage.setItem('lastSync', Date.now().toString());
    fetchQueueStats();
  };

  // 监听网络状态变化
  useEffect(() => {
    fetchQueueStats();

    // 网络恢复时刷新队列状态
    if (isOnline) {
      fetchQueueStats();
    }

    // 定时刷新队列状态
    const interval = setInterval(() => {
      fetchQueueStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline]);

  return (
    <div className={`network-status ${isOnline ? 'online' : 'offline'}`}>
      <div className="status-indicator">
        <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
        <span className="status-text">
          {isOnline ? '网络已连接' : '当前处于离线状态'}
        </span>
      </div>
      
      {showDebug && (
        <div className="queue-info">
          <div className="queue-stats">
            待同步项: {queueStats.length}
          </div>
          {queueStats.lastSync && (
            <div className="last-sync">
              上次同步: {queueStats.lastSync}
            </div>
          )}
        </div>
      )}
      
      {queueStats.length > 0 && isOnline && (
        <button 
          className="sync-button" 
          onClick={handleSyncNow}
        >
          立即同步
        </button>
      )}
    </div>
  );
};

export default NetworkStatus; 