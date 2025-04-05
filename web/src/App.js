import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [networkStatus, setNetworkStatus] = useState('online');
  const [lastPage, setLastPage] = useState('');

  useEffect(() => {
    // 检查网络状态
    const handleNetworkChange = () => {
      setNetworkStatus(navigator.onLine ? 'online' : 'offline');
      if (!navigator.onLine) {
        // 显示离线提示
        alert('网络已断开，应用将使用本地数据');
      }
    };

    // 读取上次页面
    try {
      const savedPage = localStorage.getItem('lastPage');
      if (savedPage) {
        setLastPage(savedPage);
      }
    } catch (e) {
      console.error('读取lastPage失败', e);
    }

    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, []);

  const navigateToDiary = () => {
    // 在实际应用中，这里会使用路由导航
    console.log('导航到日记页面');
    localStorage.setItem('lastPage', 'diary');
  };

  const takePicture = () => {
    // 在实际应用中，这里会调用相机API
    console.log('启动相机');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>绣花针</h1>
        <p>多用户日记系统</p>
      </header>

      <div className="content">
        <div className="motto">
          欢迎使用绣花针
        </div>

        <div className="actions">
          <button className="chanel-btn diary-btn" onClick={navigateToDiary}>我的日记</button>
          <button className="chanel-btn camera-btn" onClick={takePicture}>
            <span className="camera-icon">📷</span> 拍照
          </button>
        </div>
      </div>

      <footer className="App-footer">
        <p>绣花针 - 工业级零容错多用户日记系统</p>
        {networkStatus === 'offline' && (
          <p className="offline-warning">当前为离线模式</p>
        )}
      </footer>
    </div>
  );
}

export default App;
      