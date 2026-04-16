import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Messenger from './components/Messenger';
import { ThemeProvider, useTheme } from './ThemeContext';
import { SoundProvider, useSound } from './SoundContext';
import './App.css';

const CURRENT_USER_KEY = 'scam_current_user';

function AppContent() {
  const [user, setUser] = useState(null);
  const { isDark, toggleTheme } = useTheme();
  const { soundEnabled, toggleSound } = useSound();

  useEffect(() => {
    const savedUser = localStorage.getItem(CURRENT_USER_KEY);
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>💬 СКАМ</h1>
        <div className="header-controls">
          {user && (
            <>
              <span className={`user-badge ${user.isDev ? 'dev' : ''}`}>
                {user.username}
                {user.isDev && ' 👑'}
              </span>
              <button className="logout-btn" onClick={handleLogout} title="Выйти">
                🚪
              </button>
            </>
          )}
          <button className="theme-toggle" onClick={toggleSound} title={soundEnabled ? 'Выключить звук' : 'Включить звук'}>
            {soundEnabled ? '🔔' : '🔕'}
          </button>
          <button className="theme-toggle" onClick={toggleTheme}>
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </header>
      <div className="App-content">
        {!user ? (
          <Auth onLogin={handleLogin} />
        ) : (
          <Messenger currentUser={user.username} isDev={user.isDev} />
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <SoundProvider>
        <AppContent />
      </SoundProvider>
    </ThemeProvider>
  );
}

export default App;