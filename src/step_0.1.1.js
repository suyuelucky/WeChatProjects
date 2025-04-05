/**
 * 环境配置脚本 - 初始化微信小程序和网页版开发环境
 * 
 * 执行步骤：
 * 1. 检查微信开发者工具安装
 * 2. 安装devbox和Node.js
 * 3. 创建项目目录结构
 * 4. 配置小程序和网页端基础文件
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 项目根目录
const ROOT_DIR = process.cwd();
const MINIPROGRAM_DIR = path.join(ROOT_DIR, 'miniprogram');
const WEB_DIR = path.join(ROOT_DIR, 'web');
const LOGS_DIR = path.join(ROOT_DIR, 'logs');

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`创建目录 ${dir} 成功`);
  }
}

// 创建项目目录结构
function createProjectStructure() {
  ensureDir(MINIPROGRAM_DIR);
  ensureDir(WEB_DIR);
  ensureDir(LOGS_DIR);
  ensureDir(path.join(MINIPROGRAM_DIR, 'pages'));
  ensureDir(path.join(MINIPROGRAM_DIR, 'static'));
  ensureDir(path.join(MINIPROGRAM_DIR, 'static/images'));
  ensureDir(path.join(WEB_DIR, 'src'));
  ensureDir(path.join(WEB_DIR, 'src/components'));
  ensureDir(path.join(WEB_DIR, 'public'));
}

// 初始化环境配置
function initEnvironment() {
  try {
    // 记录当前时间
    const now = new Date();
    const timestamp = now.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    
    console.log(`[${timestamp}] 开始初始化环境...`);
    
    // 创建项目结构
    createProjectStructure();
    
    // 检查并创建web/src/index.js
    const webIndexPath = path.join(WEB_DIR, 'src/index.js');
    if (!fs.existsSync(webIndexPath)) {
      fs.writeFileSync(webIndexPath, `
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
      `);
      console.log(`创建 ${webIndexPath} 成功`);
    }
    
    // 创建web/src/App.js
    const webAppPath = path.join(WEB_DIR, 'src/App.js');
    if (!fs.existsSync(webAppPath)) {
      fs.writeFileSync(webAppPath, `
import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>秀话真</h1>
        <p>多用户日记系统</p>
      </header>
    </div>
  );
}

export default App;
      `);
      console.log(`创建 ${webAppPath} 成功`);
    }
    
    console.log(`[${timestamp}] 环境初始化完成!`);
    return true;
  } catch (error) {
    console.error('初始化环境失败:', error);
    return false;
  }
}

// 运行环境初始化
initEnvironment(); 