/**
 * 高级网络问题解决方案模板
 * 提供针对常见网络问题的技术性解决步骤，适用于技术水平较高的用户
 * 
 * 创建时间: 2025-04-08 20:47:51
 * 创建者: Claude 3.7 Sonnet
 */

// 按问题类型组织的高级解决方案
const expertSolutions = {
  // 连接问题
  connectivity: {
    // DNS问题
    dns_issues: {
      steps: [
        '切换到公共DNS服务器（如Google DNS: 8.8.8.8, 8.8.4.4或Cloudflare: 1.1.1.1）',
        '清除DNS缓存（在命令行运行 ipconfig /flushdns）',
        '检查防火墙是否阻止了DNS查询',
        '使用nslookup或dig工具排查特定域名的DNS解析问题',
        '检查hosts文件是否有冲突条目'
      ],
      expectedOutcome: '解决DNS解析问题，恢复域名访问'
    },
    
    // 路由问题
    routing_issues: {
      steps: [
        '使用traceroute或pathping工具分析网络路由路径',
        '检查您的VPN连接是否影响了路由',
        '联系ISP报告可能的路由问题',
        '尝试使用网络路由优化服务',
        '检查路由表并重置网络堆栈'
      ],
      expectedOutcome: '优化网络路由，减少延迟和丢包'
    },
    
    // MTU问题
    mtu_issues: {
      steps: [
        '测试最佳MTU值（使用ping命令和DF标志）',
        '调整网络适配器的MTU设置',
        '检查ISP是否限制了MTU大小',
        '对于VPN连接，确保MTU设置适当',
        '将MTU设置为1492或更小值以解决某些ISP的问题'
      ],
      expectedOutcome: '优化MTU设置，减少分片和丢包'
    }
  },
  
  // 性能问题
  performance: {
    // TCP优化
    tcp_optimization: {
      steps: [
        '调整TCP窗口大小和缓冲区设置',
        '启用TCP扩展或禁用过时的TCP选项',
        '修改拥塞控制算法（如BBR、CUBIC）',
        '优化TCP超时和重传设置',
        '禁用不必要的TCP扩展和选项'
      ],
      expectedOutcome: '提高TCP传输效率和网络吞吐量'
    },
    
    // 带宽管理
    bandwidth_management: {
      steps: [
        '设置QoS (Quality of Service) 规则，优先处理关键流量',
        '使用流量整形工具限制非关键应用的带宽使用',
        '配置智能队列管理（如fq_codel）减少缓冲膨胀',
        '监控和识别带宽密集型应用',
        '为关键应用分配专用带宽'
      ],
      expectedOutcome: '优化带宽分配，提高关键应用性能'
    },
    
    // 网络缓存优化
    caching_optimization: {
      steps: [
        '配置本地DNS缓存服务',
        '使用内容分发网络（CDN）加速内容传输',
        '调整浏览器缓存设置',
        '设置透明代理服务器进行本地缓存',
        '优化TCP缓存参数'
      ],
      expectedOutcome: '减少网络请求，加快内容加载速度'
    }
  },
  
  // 稳定性问题
  stability: {
    // 干扰问题
    interference_issues: {
      steps: [
        '使用Wi-Fi分析工具识别信道拥塞情况',
        '切换Wi-Fi频段（2.4GHz或5GHz）避开干扰',
        '更改Wi-Fi信道，避开拥挤信道',
        '进行环境射频调查，识别干扰源',
        '优化天线位置和方向'
      ],
      expectedOutcome: '减少无线干扰，提高连接稳定性'
    },
    
    // 驱动和固件问题
    driver_firmware_issues: {
      steps: [
        '更新网络适配器驱动至最新版本',
        '更新路由器固件',
        '检查网络驱动是否有已知问题',
        '尝试回滚到之前稳定的驱动版本',
        '禁用网络适配器的电源管理功能'
      ],
      expectedOutcome: '解决驱动和固件相关的网络问题'
    },
    
    // 高级故障排除
    advanced_troubleshooting: {
      steps: [
        '使用Wireshark或类似工具进行网络数据包分析',
        '识别并解决TCP重置和连接终止问题',
        '检查并修复网络堆栈错误配置',
        '解决NAT和端口转发问题',
        '进行完整的网络性能基准测试'
      ],
      expectedOutcome: '系统性识别和解决复杂网络问题'
    }
  },
  
  // 安全问题
  security: {
    // 连接安全
    connection_security: {
      steps: [
        '验证SSL/TLS证书是否有效',
        '检查是否存在中间人攻击或SSL剥离',
        '确保使用最新的TLS协议版本',
        '禁用不安全的加密算法',
        '实施证书锁定以防止证书欺骗'
      ],
      expectedOutcome: '确保网络连接安全和数据传输加密'
    },
    
    // 网络安全
    network_security: {
      steps: [
        '检查并更新路由器安全设置',
        '配置防火墙规则限制不必要的网络访问',
        '实施DNS过滤阻止恶意域名',
        '扫描网络查找未授权设备',
        '启用网络流量加密（如WPA3或VPN）'
      ],
      expectedOutcome: '提高网络整体安全性，防止未授权访问'
    }
  }
};

module.exports = expertSolutions; 