import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from './EmojiPicker';

const ChatWindow = ({ chat, messages, currentUser, onSendMessage, onEditMessage, onDeleteMessage, isTyping, contacts, onTyping, onBack, isMobile }) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showFullImage, setShowFullImage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, message: null });
  
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleInputChange = (e) => {
    setText(e.target.value);
    
    if (onTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      onTyping(true);
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingMessage) {
      onEditMessage(editingMessage.id, text);
      setEditingMessage(null);
      setText('');
      setReplyingTo(null);
      return;
    }
    
    if (text.trim() || selectedFile) {
      onSendMessage(text.trim(), selectedFile, replyingTo);
      setText('');
      setSelectedFile(null);
      setFilePreview(null);
      setReplyingTo(null);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`Файл слишком большой! Максимальный размер: 5 МБ.\nВаш файл: ${(file.size / 1024 / 1024).toFixed(1)} МБ`);
      fileInputRef.current.value = '';
      return;
    }
    
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview({ type: 'image', url: e.target.result, name: file.name });
      reader.readAsDataURL(file);
    } else {
      setFilePreview({ type: 'file', name: file.name, size: file.size });
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReply = (message) => {
    setReplyingTo(message);
    setEditingMessage(null);
    inputRef.current?.focus();
  };

  const handleEdit = (message) => {
    setEditingMessage(message);
    setText(message.text || '');
    setReplyingTo(null);
    inputRef.current?.focus();
  };

  const handleDelete = (messageId) => {
    if (window.confirm('Удалить сообщение?')) {
      onDeleteMessage(messageId);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    setContextMenu({ show: false, x: 0, y: 0, message: null });
  };

  const handleContextMenu = (e, message) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      message
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ show: false, x: 0, y: 0, message: null });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getAvatarColor = (name) => {
    const colors = ['#e94560', '#4a90e2', '#50c878', '#f5a623', '#9b59b6', '#1abc9c'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getChatStatus = () => {
    if (chat.type === 'group') return `👥 ${chat.members?.length || 0} участников`;
    if (chat.id === '3') return '🤖 Бот всегда онлайн';
    return chat.online ? '🟢 онлайн' : '⚫ был недавно';
  };

  const getSenderName = (senderId) => {
    if (senderId === currentUser) return currentUser;
    const contact = contacts?.find(c => c.id === senderId);
    return contact?.name || senderId;
  };

  const getReplyMessage = (replyId) => {
    return messages.find(m => m.id === replyId);
  };

  const filteredMessages = searchTerm 
    ? messages.filter(m => (m.text || '').toLowerCase().includes(searchTerm.toLowerCase()))
    : messages;

  return (
    <div className="chat-window" onClick={closeContextMenu}>
      <div className="chat-header">
        {isMobile && (
          <button className="mobile-back-btn" onClick={onBack}>
            ←
          </button>
        )}
        <div className="chat-avatar" style={{ backgroundColor: getAvatarColor(chat.name) }}>
          {chat.type === 'group' ? '👥' : chat.name.charAt(0)}
        </div>
        <div className="chat-header-info">
          <h3>{chat.name}</h3>
          <span className="chat-status">{getChatStatus()}</span>
        </div>
        <button className="search-toggle-btn" onClick={() => setShowSearch(!showSearch)} title="Поиск">
          🔍
        </button>
      </div>
      
      {showSearch && (
        <div className="search-bar">
          <input
            type="text"
            placeholder="Поиск по сообщениям..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => setSearchTerm('')}>✕</button>
          )}
          <button className="close-search-btn" onClick={() => { setShowSearch(false); setSearchTerm(''); }}>✕</button>
        </div>
      )}
      
      <div className="message-list">
        {filteredMessages.map(msg => {
          const senderName = msg.sender === currentUser ? currentUser : getSenderName(msg.sender);
          const isImage = msg.type === 'image';
          const isFile = msg.type === 'file';
          const replyTo = msg.replyTo ? getReplyMessage(msg.replyTo) : null;
          const isEdited = msg.edited;
          
          return (
            <div
              key={msg.id}
              id={`msg-${msg.id}`}
              className={`message ${msg.sender === currentUser ? 'sent' : 'received'} ${isImage || isFile ? 'file-message' : ''}`}
              onContextMenu={(e) => handleContextMenu(e, msg)}
              onClick={() => navigator.clipboard?.writeText(msg.text || '')}
              title="Кликните, чтобы скопировать"
            >
              <div className="message-sender">{senderName}</div>
              
              {replyTo && (
                <div className="message-reply" onClick={() => {
                  const element = document.getElementById(`msg-${replyTo.id}`);
                  element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  element?.classList.add('highlight');
                  setTimeout(() => element?.classList.remove('highlight'), 2000);
                }}>
                  <div className="reply-line"></div>
                  <div className="reply-content">
                    <div className="reply-sender">{getSenderName(replyTo.sender)}</div>
                    <div className="reply-text">{replyTo.text || (replyTo.type === 'image' ? '🖼️ Изображение' : '📎 Файл')}</div>
                  </div>
                </div>
              )}
              
              {isImage ? (
                <div 
                  className="message-image" 
                  style={{ maxWidth: '200px', maxHeight: '200px', overflow: 'hidden', display: 'inline-block', cursor: 'pointer' }}
                  onClick={() => setShowFullImage(msg.content)}
                >
                  <img 
                    src={msg.content} 
                    alt="Изображение" 
                    style={{ maxWidth: '200px', maxHeight: '200px', width: 'auto', height: 'auto', objectFit: 'cover', borderRadius: '12px', display: 'block' }}
                  />
                </div>
              ) : isFile ? (
                <div className="message-file">
                  <span className="file-icon">📎</span>
                  <span className="file-name">{msg.fileName}</span>
                  <span className="file-size">{formatFileSize(msg.fileSize)}</span>
                </div>
              ) : (
                <div className="message-text">{msg.text}</div>
              )}
              
              <div className="message-time">
                {formatTime(msg.timestamp)}
                {isEdited && <span className="edited-mark"> (изм.)</span>}
              </div>
            </div>
          );
        })}
        
        {isTyping && (
          <div className="message received typing">
            <div className="message-sender">{chat.name}</div>
            <div className="message-text">
              <span className="typing-dot">●</span>
              <span className="typing-dot">●</span>
              <span className="typing-dot">●</span>
            </div>
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>
      
      {(replyingTo || editingMessage) && (
        <div className="reply-bar">
          <div className="reply-bar-content">
            {replyingTo && (
              <>
                <span className="reply-label">Ответ на:</span>
                <span className="reply-preview">{replyingTo.text?.substring(0, 50) || 'Сообщение'}</span>
              </>
            )}
            {editingMessage && (
              <>
                <span className="reply-label">✏️ Редактирование</span>
                <span className="reply-preview">{editingMessage.text?.substring(0, 50)}</span>
              </>
            )}
          </div>
          <button className="cancel-reply-btn" onClick={() => { setReplyingTo(null); setEditingMessage(null); }}>✕</button>
        </div>
      )}
      
      {filePreview && (
        <div className="file-preview-container">
          <div className="file-preview">
            {filePreview.type === 'image' ? (
              <img src={filePreview.url} alt="Предпросмотр" style={{ maxWidth: '100px', maxHeight: '100px' }} />
            ) : (
              <div className="file-info">
                <span>📎</span>
                <span>{filePreview.name}</span>
                <span>{formatFileSize(filePreview.size)}</span>
              </div>
            )}
            <button className="remove-file-btn" onClick={removeFile}>✕</button>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="message-input-form">
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
        <button type="button" className="emoji-toggle-btn" onClick={() => fileInputRef.current?.click()} title="Прикрепить файл">📎</button>
        <button type="button" className="emoji-toggle-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>
        <input
          ref={inputRef}
          type="text"
          placeholder={editingMessage ? "Редактировать сообщение..." : "Написать сообщение..."}
          value={text}
          onChange={handleInputChange}
        />
        <button type="submit">{editingMessage ? '💾' : '➤'}</button>
      </form>
      
      {showEmojiPicker && (
        <EmojiPicker onSelectEmoji={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
      )}
      
      {showFullImage && (
        <div className="fullscreen-image-overlay" onClick={() => setShowFullImage(null)}>
          <img src={showFullImage} alt="Полноразмерное изображение" />
          <button className="close-fullscreen-btn" onClick={() => setShowFullImage(null)}>✕</button>
        </div>
      )}
      
      {contextMenu.show && contextMenu.message && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { handleReply(contextMenu.message); closeContextMenu(); }}>↩️ Ответить</button>
          {contextMenu.message.sender === currentUser && (
            <button onClick={() => { handleEdit(contextMenu.message); closeContextMenu(); }}>✏️ Редактировать</button>
          )}
          <button onClick={() => { handleCopy(contextMenu.message.text || ''); closeContextMenu(); }}>📋 Копировать</button>
          {(contextMenu.message.sender === currentUser || currentUser === 'devscammessenger') && (
            <button onClick={() => { handleDelete(contextMenu.message.id); closeContextMenu(); }}>🗑️ Удалить</button>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatWindow;