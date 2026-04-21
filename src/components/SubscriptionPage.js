import React, { useState, useEffect } from 'react';
import { useSubscription, SUBSCRIPTION_LEVELS, getLevelName, SUBSCRIPTION_LIMITS } from '../SubscriptionContext';
import { db } from '../firebase';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

const SubscriptionPage = ({ onClose, currentUser, isDev }) => {
  const { level, expiresAt, setUserSubscription, dailyBotMessages, botMessagesLimit } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [days, setDays] = useState(30);
  const [message, setMessage] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [stats, setStats] = useState({ free: 0, pro: 0, max: 0, premium: 0 });
  const [notifyUser, setNotifyUser] = useState(true);

  const currentLimits = SUBSCRIPTION_LIMITS[level] || SUBSCRIPTION_LIMITS[SUBSCRIPTION_LEVELS.FREE];

  // Загружаем список пользователей и статистику
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const subsSnapshot = await getDocs(collection(db, 'subscriptions'));
        const users = [];
        const newStats = { free: 0, pro: 0, max: 0, premium: 0 };
        
        subsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          users.push({
            id: docSnap.id,
            level: data.level || SUBSCRIPTION_LEVELS.FREE,
            expiresAt: data.expiresAt?.toDate(),
          });
          newStats[data.level || SUBSCRIPTION_LEVELS.FREE]++;
        });
        
        setAllUsers(users);
        setStats(newStats);
      } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
      }
    };
    
    if (isDev) loadUsers();
  }, [isDev]);

  const formatFileSize = (bytes) => {
    if (bytes === Infinity) return 'Безлимит';
    if (bytes === 0) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(0) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const formatWindow = (minutes) => {
    if (minutes === 0) return '—';
    if (minutes === Infinity) return 'Безлимит';
    if (minutes < 60) return `${minutes} мин`;
    if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} ч`;
    return `${Math.floor(minutes / (24 * 60))} дн`;
  };

  const formatValue = (value) => {
    if (value === Infinity) return '∞';
    if (value === 0) return '—';
    return value;
  };

  const handleUpgrade = async (newLevel) => {
    if (!currentUser) return;
    setLoading(true);
    setMessage('');
    
    setTimeout(() => {
      setMessage(`✅ Запрос на ${getLevelName(newLevel)} отправлен! Свяжитесь с администратором для оплаты.`);
      setLoading(false);
    }, 1000);
  };

  const handleAdminSetSubscription = async (e) => {
    e.preventDefault();
    if (!selectedUser || !selectedLevel) {
      setMessage('❌ Укажите пользователя и уровень');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      await setUserSubscription(selectedUser, selectedLevel, days);
      
      // Отправляем уведомление пользователю
      if (notifyUser) {
        await addDoc(collection(db, 'notifications'), {
          userId: selectedUser,
          title: '🎉 Подписка активирована!',
          body: `Ваша подписка ${getLevelName(selectedLevel)} активирована на ${days} дней.`,
          read: false,
          createdAt: serverTimestamp(),
        });
      }
      
      setMessage(`✅ Подписка ${getLevelName(selectedLevel)} выдана пользователю ${selectedUser} на ${days} дней!`);
      setSelectedUser('');
      setSelectedLevel('');
      
      // Обновляем список пользователей
      const subsSnapshot = await getDocs(collection(db, 'subscriptions'));
      const users = [];
      const newStats = { free: 0, pro: 0, max: 0, premium: 0 };
      subsSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        users.push({
          id: docSnap.id,
          level: data.level || SUBSCRIPTION_LEVELS.FREE,
          expiresAt: data.expiresAt?.toDate(),
        });
        newStats[data.level || SUBSCRIPTION_LEVELS.FREE]++;
      });
      setAllUsers(users);
      setStats(newStats);
    } catch (error) {
      setMessage('❌ Ошибка: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatExpiresDate = () => {
    if (!expiresAt) return 'Бессрочно';
    const date = new Date(expiresAt);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="subscription-page-overlay" onClick={onClose}>
      <div className="subscription-page" onClick={(e) => e.stopPropagation()}>
        <div className="subscription-header">
          <h2>💎 Управление подпиской</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        {isDev && (
          <div className="stats-bar">
            <span className="stat-item">🆓 {stats.free}</span>
            <span className="stat-item">⭐ {stats.pro}</span>
            <span className="stat-item">👑 {stats.max}</span>
            <span className="stat-item">🔥 {stats.premium}</span>
          </div>
        )}
        
        <div className="current-subscription">
          <div className="current-level">
            <span className={`level-badge level-${level}`}>
              {getLevelName(level)}
            </span>
            <span className="expires-date">
              {expiresAt ? `Действует до ${formatExpiresDate()}` : 'Бессрочная подписка'}
            </span>
          </div>
          
          <div className="limits-grid">
            <div className="limit-item">
              <span className="limit-label">👥 Группы</span>
              <span className="limit-value">{formatValue(currentLimits.maxGroups)}</span>
            </div>
            <div className="limit-item">
              <span className="limit-label">📎 Размер файла</span>
              <span className="limit-value">{formatFileSize(currentLimits.maxFileSize)}</span>
            </div>
            <div className="limit-item">
              <span className="limit-label">🤖 Сообщений боту</span>
              <span className="limit-value">
                {dailyBotMessages} / {botMessagesLimit === Infinity ? '∞' : botMessagesLimit}
              </span>
            </div>
            <div className="limit-item">
              <span className="limit-label">✏️ Редактирование</span>
              <span className="limit-value">{formatWindow(currentLimits.editWindow)}</span>
            </div>
            <div className="limit-item">
              <span className="limit-label">📌 Закреплено чатов</span>
              <span className="limit-value">{formatValue(currentLimits.pinnedChats)}</span>
            </div>
            <div className="limit-item">
              <span className="limit-label">🎤 Голосовые</span>
              <span className="limit-value">{currentLimits.voiceMessageMaxLength ? `${currentLimits.voiceMessageMaxLength} сек` : '—'}</span>
            </div>
            <div className="limit-item">
              <span className="limit-label">👻 Режим невидимки</span>
              <span className="limit-value">{currentLimits.invisibleMode ? '✅' : '❌'}</span>
            </div>
            <div className="limit-item">
              <span className="limit-label">🔐 Секретные чаты</span>
              <span className="limit-value">{currentLimits.secretChats ? '✅' : '❌'}</span>
            </div>
          </div>
        </div>
        
        {level !== SUBSCRIPTION_LEVELS.PREMIUM && (
          <div className="upgrade-section">
            <h3>🚀 Улучшить подписку</h3>
            <div className="upgrade-cards">
              {level === SUBSCRIPTION_LEVELS.FREE && (
                <>
                  <div className="upgrade-card" onClick={() => handleUpgrade(SUBSCRIPTION_LEVELS.PRO)}>
                    <div className="card-header">
                      <span className="card-level">⭐ Pro</span>
                      <span className="card-price">59 ₽/мес</span>
                    </div>
                    <ul className="card-features">
                      <li>👥 До 10 групп</li>
                      <li>📎 Файлы до 100 МБ</li>
                      <li>🤖 100 сообщений боту</li>
                      <li>✏️ Редактирование 1 час</li>
                    </ul>
                    <button className="upgrade-btn" disabled={loading}>Выбрать Pro</button>
                  </div>
                  <div className="upgrade-card" onClick={() => handleUpgrade(SUBSCRIPTION_LEVELS.MAX)}>
                    <div className="card-header">
                      <span className="card-level">👑 Max</span>
                      <span className="card-price">99 ₽/мес</span>
                    </div>
                    <ul className="card-features">
                      <li>👥 До 50 групп</li>
                      <li>📎 Файлы до 500 МБ</li>
                      <li>🤖 500 сообщений боту</li>
                      <li>✏️ Редактирование 24 часа</li>
                      <li>🎤 Голосовые до 5 мин</li>
                    </ul>
                    <button className="upgrade-btn" disabled={loading}>Выбрать Max</button>
                  </div>
                  <div className="upgrade-card premium" onClick={() => handleUpgrade(SUBSCRIPTION_LEVELS.PREMIUM)}>
                    <div className="card-header">
                      <span className="card-level">🔥 Premium</span>
                      <span className="card-price">149 ₽/мес</span>
                    </div>
                    <ul className="card-features">
                      <li>👥 Безлимит групп</li>
                      <li>📎 Файлы до 2 ГБ</li>
                      <li>🤖 Безлимит бот</li>
                      <li>👻 Режим невидимки</li>
                      <li>🔐 Секретные чаты</li>
                      <li>🎤 Расшифровка голосовых</li>
                    </ul>
                    <button className="upgrade-btn" disabled={loading}>Выбрать Premium</button>
                  </div>
                </>
              )}
              {level === SUBSCRIPTION_LEVELS.PRO && (
                <>
                  <div className="upgrade-card" onClick={() => handleUpgrade(SUBSCRIPTION_LEVELS.MAX)}>
                    <div className="card-header">
                      <span className="card-level">👑 Max</span>
                      <span className="card-price">99 ₽/мес</span>
                    </div>
                    <ul className="card-features">
                      <li>👥 До 50 групп</li>
                      <li>📎 Файлы до 500 МБ</li>
                      <li>🤖 500 сообщений боту</li>
                      <li>✏️ Редактирование 24 часа</li>
                      <li>🎤 Голосовые до 5 мин</li>
                    </ul>
                    <button className="upgrade-btn" disabled={loading}>Улучшить до Max</button>
                  </div>
                  <div className="upgrade-card premium" onClick={() => handleUpgrade(SUBSCRIPTION_LEVELS.PREMIUM)}>
                    <div className="card-header">
                      <span className="card-level">🔥 Premium</span>
                      <span className="card-price">149 ₽/мес</span>
                    </div>
                    <ul className="card-features">
                      <li>👥 Безлимит групп</li>
                      <li>📎 Файлы до 2 ГБ</li>
                      <li>🤖 Безлимит бот</li>
                      <li>👻 Режим невидимки</li>
                      <li>🔐 Секретные чаты</li>
                    </ul>
                    <button className="upgrade-btn" disabled={loading}>Улучшить до Premium</button>
                  </div>
                </>
              )}
              {level === SUBSCRIPTION_LEVELS.MAX && (
                <div className="upgrade-card premium" onClick={() => handleUpgrade(SUBSCRIPTION_LEVELS.PREMIUM)}>
                  <div className="card-header">
                    <span className="card-level">🔥 Premium</span>
                    <span className="card-price">149 ₽/мес</span>
                  </div>
                  <ul className="card-features">
                    <li>👥 Безлимит групп</li>
                    <li>📎 Файлы до 2 ГБ</li>
                    <li>🤖 Безлимит бот</li>
                    <li>👻 Режим невидимки</li>
                    <li>🔐 Секретные чаты</li>
                  </ul>
                  <button className="upgrade-btn" disabled={loading}>Улучшить до Premium</button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {isDev && (
          <div className="admin-section">
            <h3>🛠️ Админ-панель</h3>
            <form onSubmit={handleAdminSetSubscription} className="admin-form">
              <select 
                value={selectedUser} 
                onChange={(e) => setSelectedUser(e.target.value)} 
                disabled={loading}
              >
                <option value="">Выберите пользователя</option>
                {allUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.id} ({getLevelName(user.level)})
                  </option>
                ))}
              </select>
              <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} disabled={loading}>
                <option value="">Уровень</option>
                <option value={SUBSCRIPTION_LEVELS.FREE}>Free</option>
                <option value={SUBSCRIPTION_LEVELS.PRO}>Pro</option>
                <option value={SUBSCRIPTION_LEVELS.MAX}>Max</option>
                <option value={SUBSCRIPTION_LEVELS.PREMIUM}>Premium</option>
              </select>
              <input
                type="number"
                placeholder="Дней"
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value) || 30)}
                min="1"
                max="365"
                disabled={loading}
              />
              <label className="notify-checkbox">
                <input 
                  type="checkbox" 
                  checked={notifyUser} 
                  onChange={(e) => setNotifyUser(e.target.checked)}
                />
                Уведомить
              </label>
              <button type="submit" disabled={loading || !selectedUser || !selectedLevel}>
                {loading ? 'Выдача...' : 'Выдать подписку'}
              </button>
            </form>
          </div>
        )}
        
        {message && <div className="subscription-message">{message}</div>}
      </div>
    </div>
  );
};

export default SubscriptionPage;