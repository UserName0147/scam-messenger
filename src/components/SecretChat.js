import React, { useState } from 'react';
import { useSubscription } from '../SubscriptionContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const SecretChat = ({ currentUser, contacts, onClose, onChatCreated }) => {
  const { hasFeature } = useSubscription();
  const [selectedContact, setSelectedContact] = useState('');
  const [selfDestructTime, setSelfDestructTime] = useState(60); // секунд
  const [loading, setLoading] = useState(false);

  const canUseSecretChats = hasFeature('secretChats');

  const handleCreateSecretChat = async () => {
    if (!canUseSecretChats) {
      alert('Секретные чаты доступны только на тарифах Max и Premium');
      return;
    }

    if (!selectedContact) {
      alert('Выберите собеседника');
      return;
    }

    setLoading(true);

    const chatId = uuidv4();
    const secretChat = {
      id: chatId,
      type: 'secret',
      name: `🔐 ${selectedContact}`,
      members: [currentUser, selectedContact],
      selfDestructTime,
      createdAt: serverTimestamp(),
      createdBy: currentUser,
    };

    await addDoc(collection(db, 'secretChats'), secretChat);

    // Отправляем системное сообщение
    await addDoc(collection(db, 'messages'), {
      text: `🔐 Секретный чат создан. Сообщения будут удаляться через ${selfDestructTime} секунд.`,
      sender: 'system',
      chatId,
      timestamp: serverTimestamp(),
      type: 'system',
    });

    setLoading(false);
    onChatCreated(secretChat);
    onClose();
  };

  const timeOptions = [
    { value: 10, label: '10 секунд' },
    { value: 30, label: '30 секунд' },
    { value: 60, label: '1 минута' },
    { value: 300, label: '5 минут' },
    { value: 3600, label: '1 час' },
    { value: 86400, label: '24 часа' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🔐 Секретный чат</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          {!canUseSecretChats ? (
            <div className="premium-locked">
              <p>🔒 Секретные чаты доступны на тарифах Max и Premium</p>
              <button className="upgrade-btn" onClick={onClose}>
                Улучшить подписку
              </button>
            </div>
          ) : (
            <>
              <p className="secret-description">
                Сообщения в секретном чате автоматически удаляются через заданное время.
                Скриншоты запрещены (по возможности), пересылка сообщений отключена.
              </p>
              
              <div className="form-group">
                <label>Выберите собеседника</label>
                <select 
                  value={selectedContact} 
                  onChange={(e) => setSelectedContact(e.target.value)}
                >
                  <option value="">— Выберите —</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Время автоудаления</label>
                <select 
                  value={selfDestructTime} 
                  onChange={(e) => setSelfDestructTime(parseInt(e.target.value))}
                >
                  {timeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <button 
                className="create-secret-btn" 
                onClick={handleCreateSecretChat}
                disabled={loading || !selectedContact}
              >
                {loading ? 'Создание...' : '🔐 Создать секретный чат'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecretChat;