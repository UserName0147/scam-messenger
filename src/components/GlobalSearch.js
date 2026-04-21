import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collectionGroup, query, where, orderBy, getDocs } from 'firebase/firestore';

const GlobalSearch = ({ currentUser, messages, allChats, onSelectResult, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState('local'); // 'local' или 'global'

  // Локальный поиск по уже загруженным сообщениям (мгновенный)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    if (searchMode === 'local') {
      const term = searchTerm.toLowerCase();
      const found = [];
      
      Object.keys(messages).forEach(chatId => {
        messages[chatId].forEach(msg => {
          if (msg.text?.toLowerCase().includes(term) && msg.sender === currentUser) {
            found.push({
              ...msg,
              chatId,
              chatName: allChats.find(c => c.id === chatId)?.name || chatId
            });
          }
        });
      });
      
      // Сортируем по дате (новые сверху)
      found.sort((a, b) => b.timestamp - a.timestamp);
      setResults(found.slice(0, 50)); // Ограничиваем 50 результатами
    }
  }, [searchTerm, messages, currentUser, allChats, searchMode]);

  // Глобальный поиск через Firestore (медленнее, но ищет всё)
  const handleGlobalSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    setSearchMode('global');
    
    try {
      const messagesQuery = query(
        collectionGroup(db, 'messages'),
        where('sender', '==', currentUser),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(messagesQuery);
      const term = searchTerm.toLowerCase();
      const found = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date(),
            chatId: data.chatId,
            chatName: allChats.find(c => c.id === data.chatId)?.name || data.chatId
          };
        })
        .filter(msg => msg.text?.toLowerCase().includes(term))
        .slice(0, 50);
      
      setResults(found);
    } catch (error) {
      console.error('Ошибка глобального поиска:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      handleGlobalSearch();
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="global-search-overlay" onClick={onClose}>
      <div className="global-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="global-search-header">
          <input
            type="text"
            placeholder="Поиск по всем сообщениям..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSearchMode('local');
            }}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button className="global-search-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="global-search-actions">
          <button 
            className={`search-mode-btn ${searchMode === 'local' ? 'active' : ''}`}
            onClick={() => setSearchMode('local')}
          >
            📁 Локально
          </button>
          <button 
            className={`search-mode-btn ${searchMode === 'global' ? 'active' : ''}`}
            onClick={handleGlobalSearch}
            disabled={loading}
          >
            {loading ? '🔍 Поиск...' : '🌐 Глобально'}
          </button>
        </div>
        
        <div className="global-search-results">
          {results.length === 0 && searchTerm ? (
            <div className="no-results">Ничего не найдено</div>
          ) : (
            results.map(msg => (
              <div 
                key={msg.id}
                className="search-result-item"
                onClick={() => onSelectResult(msg.chatId, msg.id)}
              >
                <div className="search-result-chat">{msg.chatName}</div>
                <div className="search-result-text">{msg.text}</div>
                <div className="search-result-time">{formatTime(msg.timestamp)}</div>
              </div>
            ))
          )}
        </div>
        
        <div className="global-search-footer">
          <span>Нажмите Enter для глобального поиска</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;