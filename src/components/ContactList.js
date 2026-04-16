import React from 'react';

const ContactList = ({ contacts, selectedId, onSelect, onAddGroup }) => {
  const getAvatarColor = (name) => {
    const colors = ['#e94560', '#4a90e2', '#50c878', '#f5a623', '#9b59b6', '#1abc9c'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getStatus = (contact) => {
    if (contact.type === 'group') return { text: `${contact.members.length} участников`, online: false };
    if (contact.id === '3') return { text: 'бот', online: true };
    const statuses = {
      '1': { text: 'онлайн', online: true },
      '2': { text: 'был 5 мин назад', online: false },
    };
    return statuses[contact.id] || { text: 'офлайн', online: false };
  };

  return (
    <div className="contact-list">
      <div className="contact-list-header">
        <h3>📋 Чаты</h3>
        <button className="add-group-btn" onClick={onAddGroup} title="Создать группу">
          ➕
        </button>
      </div>
      <ul>
        {contacts.map(contact => {
          const status = getStatus(contact);
          const isGroup = contact.type === 'group';
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
                  {!isGroup && <span className={`status-dot ${status.online ? 'online' : ''}`}></span>}
                  {status.text}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ContactList;