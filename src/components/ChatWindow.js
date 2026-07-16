import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from './EmojiPicker';

const ChatWindow = ({ chat, messages, currentUser, onSendMessage, onEditMessage, onDeleteMessage, isTyping, contacts, onTyping, onBack, isMobile, isMuted, isPinned, onToggleMute, onTogglePin }) => {
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
  const [isDragging, setIsDragging] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const listRef = useRef(null);
  const nearBottomRef = useRef(true);

  const draftKey = (id) => `scam_draft_${currentUser}_${id}`;

  // Автопрокрутка вниз только если пользователь уже внизу — иначе не мешаем читать историю
  useEffect(() => {
    if (nearBottomRef.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Черновик: подгружаем сохранённый текст при переключении чата
  useEffect(() => {
    setText(localStorage.getItem(`scam_draft_${currentUser}_${chat.id}`) || '');
    nearBottomRef.current = true;
    setShowScrollBtn(false);
  }, [chat.id, currentUser]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setText(value);

    // Черновик: сохраняем/чистим по мере набора
    if (value.trim()) localStorage.setItem(draftKey(chat.id), value);
    else localStorage.removeItem(draftKey(chat.id));

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
      localStorage.removeItem(draftKey(chat.id));
      setText('');
      setSelectedFile(null);
      setFilePreview(null);
      setReplyingTo(null);
      nearBottomRef.current = true;
    }
  };

  const handleEmojiSelect = (emoji) => {
    setText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const processFile = (file) => {
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`Файл слишком большой! Максимальный размер: 5 МБ.\nВаш файл: ${(file.size / 1024 / 1024).toFixed(1)} МБ`);
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview({ type: 'image', url: ev.target.result, name: file.name });
      reader.readAsDataURL(file);
    } else {
      setFilePreview({ type: 'file', name: file.name, size: file.size });
    }
  };

  const handleFileSelect = (e) => {
    processFile(e.target.files[0]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // #21 Вставка изображения из буфера обмена (Ctrl+V)
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          processFile(file);
          e.preventDefault();
        }
        break;
      }
    }
  };

  // #22 Drag-and-drop файла в окно чата
  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  };

  // #15 Кнопка «вниз» + отслеживание позиции прокрутки
  const handleListScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    nearBottomRef.current = dist < 120;
    setShowScrollBtn(dist > 300);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    nearBottomRef.current = true;
    setShowScrollBtn(false);
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

  // #6 Форматирование: **жирный**, *курсив*, `код`, ~~зачёркнутый~~, ||спойлер||
  const renderFormatted = (str) => {
    if (!str) return null;
    const regex = /(\*\*[^*]+\*\*|~~[^~]+~~|\|\|[^|]+\|\||`[^`]+`|\*[^*]+\*|_[^_]+_)/g;
    const parts = [];
    let last = 0;
    let key = 0;
    let m;
    while ((m = regex.exec(str)) !== null) {
      if (m.index > last) parts.push(str.slice(last, m.index));
      const tok = m[0];
      if (tok.startsWith('**')) parts.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
      else if (tok.startsWith('~~')) parts.push(<s key={key++}>{tok.slice(2, -2)}</s>);
      else if (tok.startsWith('||')) parts.push(
        <span key={key++} className="spoiler" onClick={(e) => { e.stopPropagation(); e.currentTarget.classList.toggle('revealed'); }}>
          {tok.slice(2, -2)}
        </span>
      );
      else if (tok.startsWith('`')) parts.push(<code key={key++}>{tok.slice(1, -1)}</code>);
      else parts.push(<em key={key++}>{tok.slice(1, -1)}</em>);
      last = m.index + tok.length;
    }
    if (last < str.length) parts.push(str.slice(last));
    return parts;
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
    <div
      className="chat-window"
      onClick={closeContextMenu}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-overlay-inner">📎 Отпустите файл, чтобы прикрепить</div>
        </div>
      )}
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
        <button
          className="search-toggle-btn"
          onClick={onTogglePin}
          title={isPinned ? 'Открепить чат' : 'Закрепить чат наверх'}
        >
          {isPinned ? '📌' : '📍'}
        </button>
        <button
          className="search-toggle-btn"
          onClick={onToggleMute}
          title={isMuted ? 'Включить уведомления' : 'Заглушить чат'}
        >
          {isMuted ? '🔕' : '🔔'}
        </button>
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
      
      <div className="message-list" ref={listRef} onScroll={handleListScroll}>
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
                <div className="message-text">{renderFormatted(msg.text)}</div>
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

      {showScrollBtn && (
        <button className="scroll-down-btn" onClick={scrollToBottom} title="Вниз" aria-label="Прокрутить вниз">
          ↓
        </button>
      )}

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
          onPaste={handlePaste}
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