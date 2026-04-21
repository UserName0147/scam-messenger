import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const ChannelModal = ({ currentUser, onClose, onChannelCreated }) => {
  const [channelName, setChannelName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateChannel = async () => {
    if (!channelName.trim()) {
      alert('Введите название канала');
      return;
    }

    setLoading(true);

    const channelId = uuidv4();
    const channel = {
      id: channelId,
      type: 'channel',
      name: channelName.trim(),
      description: description.trim(),
      isPrivate,
      owner: currentUser,
      subscribers: [currentUser],
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, 'channels'), channel);

    // Отправляем приветственное сообщение
    await addDoc(collection(db, 'messages'), {
      text: `📢 Добро пожаловать в канал «${channelName}»!`,
      sender: 'system',
      chatId: channelId,
      timestamp: serverTimestamp(),
      type: 'system',
    });

    setLoading(false);
    onChannelCreated(channel);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📢 Создать канал</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          <div className="form-group">
            <label>Название канала</label>
            <input
              type="text"
              placeholder="Например: Новости Скама"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label>Описание (необязательно)</label>
            <textarea
              placeholder="О чём этот канал..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              Приватный канал (только по приглашению)
            </label>
          </div>
          
          <button 
            className="create-channel-btn" 
            onClick={handleCreateChannel}
            disabled={loading || !channelName.trim()}
          >
            {loading ? 'Создание...' : '📢 Создать канал'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChannelModal;