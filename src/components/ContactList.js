import React from 'react';

const ContactList = ({ 
  contacts, 
  selectedId, 
  onSelect, 
  onAddGroup, 
  onGlobalSearch, 
  unreadCounts = {},
  onSubscriptionClick,
  currentUser,
  level,
  levelBadge,
  isDev,
  onInvisibleClick,
  onSecretChatClick,
  onChannelClick,
  hasFeature,
  onCaseClick
}) => {
  const getAvatarColor = (name) => {
    const colors = ['#e94560', '#4a90e2', '#50c878', '#f5a623', '#9b59b6', '#1abc9c'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getStatus = (contact) => {
    if (contact.type === 'group') return { text: `${contact.members?.length || 0} участников`, online: false };
    if (contact.id === '3') return { text: 'бот', online: true };
    if (contact.online) return { text: 'онлайн', online: true };
    return { text: 'был недавно', online: false };
  };

  return (
    <div className="contact-list">
      <div className="contact-list-header">
        <h3>📋 Чаты</h3>
        <div className="contact-list-actions">
          <button className="add-group-btn" onClick={onGlobalSearch} title="Глобальный поиск">
            🔍
          </button>
          {hasFeature && hasFeature('invisibleMode') && (
            <button className="add-group-btn" onClick={onInvisibleClick} title="Режим невидимки">
              👻
            </button>
          )}
          {hasFeature && hasFeature('secretChats') && (
            <button className="add-group-btn" onClick={onSecretChatClick} title="Секретный чат">
              🔐
            </button>
          )}
          <button className="add-group-btn" onClick={onChannelClick} title="Создать канал">
            📢
          </button>
          <button className="add-group-btn" onClick={onAddGroup} title="Создать группу">
            ➕
          </button>
          <button className="add-group-btn" onClick={onCaseClick} title="Открыть кейс CS2">
            🎁
          </button>
          <span 
            className={`user-badge-mini subscription-${level}`}
            onClick={onSubscriptionClick}
            title={`${currentUser} • ${level} • Нажмите для управления подпиской`}
            style={{ cursor: 'pointer', marginLeft: '5px' }}
          >
            {levelBadge}
            {isDev && ' 👑'}
          </span>
        </div>
      </div>
      <ul>
        {contacts.map(contact => {
          const status = getStatus(contact);
          const isGroup = contact.type === 'group';
          const unreadCount = unreadCounts[contact.id] || 0;
          
          return (
            <li
              key={contact.id}
              className={contact.id === selectedId ? 'active' : ''}
              onClick={() => onSelect(contact)}
            >
              <div 
                className="contact-avatar"
                style={{ backgroundColor: getAvatarColor(contact.name) }}
              >
                {isGroup ? '👥' : contact.name.charAt(0)}
              </div>
              <div className="contact-info">
                <div className="contact-name">{contact.name}</div>
                <div className="contact-status">
                  {!isGroup && contact.id !== '3' && (
                    <span className={`status-dot ${status.online ? 'online' : ''}`}></span>
                  )}
                  {contact.id === '3' && <span className="status-dot online"></span>}
                  {status.text}
                </div>
              </div>
              {unreadCount > 0 && (
                <div className="unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ContactList;