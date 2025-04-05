const { getConfig } = require('../config/exobrain.config');

class ExoBrainService {
  constructor() {
    this.config = getConfig();
    this.baseUrl = this.config.baseUrl;
  }

  // 发送请求到外脑系统
  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const defaultOptions = {
      timeout: this.config.timeout,
      header: {
        'content-type': 'application/json'
      }
    };

    try {
      const response = await wx.request({
        url,
        ...defaultOptions,
        ...options
      });

      if (response.statusCode === 200) {
        return response.data;
      }
      throw new Error(`请求失败: ${response.statusCode}`);
    } catch (error) {
      console.error('外脑系统请求错误:', error);
      throw error;
    }
  }

  // 代码分析
  async analyzeCode(file, options = {}) {
    return this.request('/api/analyze', {
      method: 'POST',
      data: {
        file,
        ...options
      }
    });
  }

  // 获取智能建议
  async getSuggestions(context) {
    return this.request('/api/suggestions', {
      method: 'POST',
      data: { context }
    });
  }

  // 创建开发会话
  async createSession() {
    return this.request('/api/session/create', {
      method: 'POST'
    });
  }

  // 更新会话上下文
  async updateContext(sessionId, context) {
    return this.request(`/api/session/${sessionId}/context`, {
      method: 'PUT',
      data: { context }
    });
  }
}

// 创建单例
const exoBrain = new ExoBrainService();

module.exports = exoBrain; 