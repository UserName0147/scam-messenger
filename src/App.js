import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Messenger from './components/Messenger';
import { ThemeProvider, useTheme } from './ThemeContext';
import { SoundProvider, useSound } from './SoundContext';
import { NotificationProvider, useNotification } from './NotificationContext';
import { SubscriptionProvider, useSubscription } from './SubscriptionContext';
import { ScoinProvider } from './ScoinContext';
import { db } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import './App.css';

const CURRENT_USER_KEY = 'scam_current_user';

const MaintenanceScreen = ({ onAdminLogin }) => {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const DEV_EMAIL = process.env.REACT_APP_DEV_EMAIL || 'devscammessenger@scam.local';
    const DEV_PASSWORD = process.env.REACT_APP_DEV_PASSWORD;

    if (adminEmail === DEV_EMAIL && adminPassword === DEV_PASSWORD) {
      onAdminLogin({ email: adminEmail, isDev: true });
    } else {
      setError('Только создатель может войти во время обновления');
    }
    setLoading(false);
  };

  return (
    <div className="maintenance-screen">
      <button className="hidden-admin-trigger" onClick={() => setShowAdminLogin(true)} title="" />
      
      {showAdminLogin && (
        <div className="maintenance-modal">
          <div className="maintenance-modal-content">
            <h3>Вход для создателя</h3>
            <form onSubmit={handleAdminSubmit}>
              <input type="email" placeholder="Email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} autoFocus disabled={loading} />
              <input type="password" placeholder="Пароль" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} disabled={loading} />
              {error && <div className="auth-error">{error}</div>}
              <div className="maintenance-modal-actions">
                <button type="submit" disabled={loading}>{loading ? 'Вход...' : 'Войти'}</button>
                <button type="button" onClick={() => setShowAdminLogin(false)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="maintenance-content">
        <h1>🚧 СКАМ</h1>
        <p>Сайт на обновлении. Зайдите попозже.</p>
      </div>
    </div>
  );
};

function AppContent() {
  const [user, setUser] = useState(null);
  const [maintenance, setMaintenance] = useState({ enabled: false, message: '' });
  const { isDark, toggleTheme } = useTheme();
  const { soundEnabled, toggleSound } = useSound();
  const { enabled: notifyEnabled, toggleEnabled: toggleNotify } = useNotification();
  const { level, levelBadge } = useSubscription();

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

  useEffect(() => {
    const maintenanceRef = doc(db, 'settings', 'maintenance');
    return onSnapshot(maintenanceRef, (docSnap) => {
      if (docSnap.exists()) {
        setMaintenance(docSnap.data());
      } else {
        setMaintenance({ enabled: false, message: '' });
      }
    });
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  const toggleMaintenance = async () => {
    const maintenanceRef = doc(db, 'settings', 'maintenance');
    await setDoc(maintenanceRef, {
      enabled: !maintenance.enabled,
      message: 'Сайт на обновлении. Зайдите попозже.'
    }, { merge: true });
  };

  if (maintenance.enabled && (!user || !user.isDev)) {
    return (
      <ThemeProvider>
        <MaintenanceScreen onAdminLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>💬 СКАМ</h1>
        <div className="header-controls">
          {user && (
            <>
              <span 
                className={`user-badge ${user.isDev ? 'dev' : ''} subscription-${level}`}
                onClick={() => setShowSubscriptionPage?.(true)}
                style={{ cursor: 'pointer' }}
              >
                {user.username || user.email?.split('@')[0]}
                {user.isDev && ' 👑'}
                {!user.isDev && levelBadge && ` ${levelBadge}`}
              </span>
              {user.isDev && (
                <button className={`maintenance-toggle ${maintenance.enabled ? 'active' : ''}`} onClick={toggleMaintenance} title={maintenance.enabled ? 'Выключить обновление' : 'Включить обновление'}>
                  🚧
                </button>
              )}
              <button className="logout-btn" onClick={handleLogout} title="Выйти">
                🚪
              </button>
            </>
          )}
          <button className="theme-toggle" onClick={toggleNotify} title={notifyEnabled ? 'Выключить уведомления' : 'Включить уведомления'}>
            {notifyEnabled ? '🔔' : '🔕'}
          </button>
          <button className="theme-toggle" onClick={toggleSound} title={soundEnabled ? 'Выключить звук' : 'Включить звук'}>
            {soundEnabled ? '🔊' : '🔇'}
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
          <Messenger currentUser={user.email?.split('@')[0] || user.username} isDev={user.isDev} />
        )}
      </div>
    </div>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(CURRENT_USER_KEY);
    if (saved) {
      try {
        const user = JSON.parse(saved);
        setCurrentUser(user.email?.split('@')[0] || user.username);
      } catch (e) {}
    }
  }, []);

  return (
    <ThemeProvider>
      <SoundProvider>
        <NotificationProvider>
          <SubscriptionProvider currentUser={currentUser}>
            <ScoinProvider currentUser={currentUser}>
              <AppContent />
            </ScoinProvider>
          </SubscriptionProvider>
        </NotificationProvider>
      </SoundProvider>
    </ThemeProvider>
  );
}

export default App;