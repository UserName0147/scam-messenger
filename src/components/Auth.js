import React, { useState } from 'react';

const USERS_STORAGE_KEY = 'scam_users';

// Данные разработчика берутся из переменных окружения
const DEV_USERNAME = process.env.REACT_APP_DEV_USERNAME;
const DEV_PASSWORD = process.env.REACT_APP_DEV_PASSWORD;

const Auth = ({ onLogin }) => {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const getUsers = () => {
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  };

  const saveUsers = (users) => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Заполните все поля');
      return;
    }

    // Проверка на аккаунт разработчика (данные из .env)
    if (username === DEV_USERNAME && password === DEV_PASSWORD) {
      onLogin({ 
        username, 
        isDev: true,
        role: 'developer'
      });
      return;
    }

    const users = getUsers();

    if (mode === 'register') {
      if (users[username]) {
        setError('Пользователь уже существует');
        return;
      }
      if (password !== confirmPassword) {
        setError('Пароли не совпадают');
        return;
      }
      if (password.length < 4) {
        setError('Пароль должен быть не менее 4 символов');
        return;
      }
      users[username] = { password, createdAt: new Date().toISOString() };
      saveUsers(users);
      onLogin({ username, isDev: false });
    } else {
      const user = users[username];
      if (!user) {
        setError('Пользователь не найден');
        return;
      }
      if (user.password !== password) {
        setError('Неверный пароль');
        return;
      }
      onLogin({ username, isDev: false });
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-tabs">
          <button 
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            Вход
          </button>
          <button 
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
          >
            Регистрация
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <h2>{mode === 'login' ? 'Войти в Скам' : 'Создать аккаунт'}</h2>
          
          <div className="input-group">
            <input
              type="text"
              placeholder="Логин"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="input-group">
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          {mode === 'register' && (
            <div className="input-group">
              <input
                type="password"
                placeholder="Подтвердите пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}
          
          {error && <div className="auth-error">{error}</div>}
          
          <button type="submit" className="auth-submit">
            {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
          
          {/* Подсказка с паролем разработчика УДАЛЕНА — безопасность! */}
        </form>
      </div>
    </div>
  );
};

export default Auth;