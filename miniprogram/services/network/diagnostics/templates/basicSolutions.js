/**
 * 基础网络问题解决方案模板
 * 提供针对常见网络问题的解决步骤，适用于一般用户
 * 
 * 创建时间: 2025-04-08 20:45:32
 * 创建者: Claude 3.7 Sonnet
 */

// 按问题类型组织的基础解决方案
const basicSolutions = {
  // 连接问题
  connectivity: {
    // 无网络连接
    no_connection: {
      steps: [
        '确保Wi-Fi或移动数据已开启',
        '尝试开启飞行模式几秒钟后再关闭',
        '重启您的设备',
        '重启您的路由器（如果使用Wi-Fi）'
      ],
      expectedOutcome: '恢复网络连接'
    },
    
    // Wi-Fi连接问题
    wifi_issues: {
      steps: [
        '确保您距离Wi-Fi路由器足够近',
        '重新连接Wi-Fi网络（断开后重新连接）',
        '重启您的路由器',
        '尝试连接其他可用的Wi-Fi网络'
      ],
      expectedOutcome: '建立稳定的Wi-Fi连接'
    },
    
    // 移动数据问题
    mobile_data_issues: {
      steps: [
        '确保移动数据已开启',
        '检查您的套餐是否有足够流量',
        '尝试开启飞行模式几秒钟后再关闭',
        '确认您所在地区有网络覆盖'
      ],
      expectedOutcome: '恢复移动数据连接'
    }
  },
  
  // 性能问题
  performance: {
    // 网络缓慢
    slow_network: {
      steps: [
        '关闭其他占用网络带宽的应用',
        '如果使用Wi-Fi，尝试靠近路由器',
        '重启您的网络设备',
        '尝试在非高峰时段使用网络'
      ],
      expectedOutcome: '提高网络速度和响应时间'
    },
    
    // 内容加载缓慢
    slow_loading: {
      steps: [
        '刷新页面或重启应用',
        '清除应用缓存',
        '检查您的网络连接速度',
        '联系客服确认服务器是否有问题'
      ],
      expectedOutcome: '加快内容加载速度'
    }
  },
  
  // 稳定性问题
  stability: {
    // 连接断断续续
    intermittent_connection: {
      steps: [
        '如果使用Wi-Fi，靠近路由器或减少障碍物',
        '避免在移动中或信号不稳定的区域使用应用',
        '重启您的网络设备',
        '检查是否有网络干扰源（如微波炉、蓝牙设备等）'
      ],
      expectedOutcome: '获得更稳定的网络连接'
    },
    
    // 频繁掉线
    frequent_disconnects: {
      steps: [
        '更新您的设备操作系统',
        '重启您的网络设备',
        '检查Wi-Fi路由器设置',
        '联系网络服务提供商'
      ],
      expectedOutcome: '减少网络断连情况'
    }
  },
  
  // 特定服务问题
  services: {
    // 无法访问特定网站或服务
    specific_service_access: {
      steps: [
        '检查该服务或网站是否正常运行',
        '清除浏览器缓存和Cookie',
        '尝试使用不同的浏览器或设备访问',
        '检查您的网络是否有访问限制'
      ],
      expectedOutcome: '恢复对特定服务的访问'
    },
    
    // 应用内特定功能不可用
    app_feature_unavailable: {
      steps: [
        '确保您使用的是最新版本的应用',
        '重启应用',
        '检查您的账户权限',
        '联系应用客服'
      ],
      expectedOutcome: '恢复应用功能正常使用'
    }
  }
};

module.exports = basicSolutions; 