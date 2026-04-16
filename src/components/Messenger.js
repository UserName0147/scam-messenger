import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ContactList from './ContactList';
import ChatWindow from './ChatWindow';
import CreateGroupModal from './CreateGroupModal';
import { useSound } from '../SoundContext';
import { v4 as uuidv4 } from 'uuid';

const CONTACTS = [
  { id: '1', name: 'Иван Петров', type: 'user', online: true },
  { id: '2', name: 'Мария Иванова', type: 'user', online: false },
  { id: '3', name: 'Скам Бот', type: 'bot', online: true },
];

const OPENROUTER_API_KEY = process.env.REACT_APP_OPENROUTER_KEY;

const Messenger = ({ currentUser, isDev }) => {
  const STORAGE_KEY = `scam_messages_${currentUser}`;
  const GROUPS_STORAGE_KEY = `scam_groups_${currentUser}`;

  const [selectedChat, setSelectedChat] = useState(null);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const { playSendSound, playReceiveSound } = useSound();
  const prevMessagesRef = useRef({});

  const [groups, setGroups] = useState(() => {
    const saved = localStorage.getItem(GROUPS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const allChats = useMemo(() => {
    const contactsWithOnline = CONTACTS.map(c => ({
      ...c,
      online: c.type === 'bot' ? true : (c.online || false)
    }));
    return [...contactsWithOnline, ...groups.map(g => ({ ...g, type: 'group' }))];
  }, [groups]);

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.keys(parsed).forEach(chatId => {
          parsed[chatId] = parsed[chatId].map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
        });
        return parsed;
      } catch (e) {
        console.error('Ошибка загрузки сообщений:', e);
      }
    }
    return {
      '1': [{ id: uuidv4(), text: 'Привет! Ты уже в Скаме?', sender: 'Иван Петров', timestamp: new Date() }],
      '2': [{ id: uuidv4(), text: 'Купил новый телефон', sender: 'Мария Иванова', timestamp: new Date() }],
      '3': [{ id: uuidv4(), text: 'Я AI-бот. Скам — зеркало Макса 😈', sender: 'Скам Бот', timestamp: new Date() }],
    };
  });

  useEffect(() => {
    if (allChats.length > 0 && !selectedChat) {
      setSelectedChat(allChats[0]);
    }
  }, [allChats, selectedChat]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages, STORAGE_KEY]);

  useEffect(() => {
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
  }, [groups, GROUPS_STORAGE_KEY]);

  useEffect(() => {
    Object.keys(messages).forEach(chatId => {
      const prevMessages = prevMessagesRef.current[chatId] || [];
      const currentMessages = messages[chatId] || [];
      
      if (currentMessages.length > prevMessages.length) {
        const newMsg = currentMessages[currentMessages.length - 1];
        if (newMsg.sender !== currentUser) {
          playReceiveSound();
        }
      }
      
      prevMessagesRef.current[chatId] = currentMessages;
    });
  }, [messages, currentUser, playReceiveSound]);

  const callOpenRouter = async (userMessage) => {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-lite-001',
          messages: [
            { role: 'system', content: 'Ты — Скам Бот. Отвечай на русском, с юмором, коротко. Используй эмодзи.' },
            { role: 'user', content: userMessage }
          ],
          max_tokens: 150,
        }),
      });

      const data = await response.json();
      
      if (data.choices && data.choices[0]?.message?.content) {
        return data.choices[0].message.content;
      }
      
      return 'Что-то я завис... 🤔';
    } catch (error) {
      console.error('OpenRouter error:', error);
      return 'Нет связи с нейросетью 🛠️';
    }
  };

  const handleBotResponse = useCallback(async (userMessage) => {
    setIsBotTyping(true);
    
    const aiResponse = await callOpenRouter(userMessage);
    
    const botMessage = {
      id: uuidv4(),
      text: aiResponse,
      sender: 'Скам Бот',
      timestamp: new Date(),
    };
    
    setMessages(prev => ({
      ...prev,
      '3': [...(prev['3'] || []), botMessage],
    }));
    
    setIsBotTyping(false);
  }, []);

  useEffect(() => {
    if (!selectedChat || selectedChat.id !== '3') return;

    const botMessages = messages['3'] || [];
    const lastMessage = botMessages[botMessages.length - 1];
    
    if (!lastMessage || lastMessage.sender === 'Скам Бот' || isBotTyping) return;

    handleBotResponse(lastMessage.text);
  }, [messages, selectedChat, isBotTyping, handleBotResponse]);

  const handleSendMessage = (text, file, replyTo) => {
    if (!selectedChat) return;
    
    const newMsg = {
      id: uuidv4(),
      text: text || '',
      type: file ? (file.type?.startsWith('image/') ? 'image' : 'file') : 'text',
      content: file ? (file.type?.startsWith('image/') ? null : file) : text,
      fileName: file?.name,
      fileSize: file?.size,
      sender: currentUser,
      timestamp: new Date(),
      replyTo: replyTo?.id || null,
    };
    
    if (file && file.type?.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        newMsg.content = e.target.result;
        setMessages(prev => ({
          ...prev,
          [selectedChat.id]: [...(prev[selectedChat.id] || []), newMsg],
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setMessages(prev => ({
        ...prev,
        [selectedChat.id]: [...(prev[selectedChat.id] || []), newMsg],
      }));
    }
    
    playSendSound();
  };

  const handleEditMessage = (messageId, newText) => {
    if (!selectedChat) return;
    
    setMessages(prev => {
      const chatMessages = [...(prev[selectedChat.id] || [])];
      const index = chatMessages.findIndex(m => m.id === messageId);
      if (index !== -1) {
        chatMessages[index] = { ...chatMessages[index], text: newText, edited: true };
      }
      return { ...prev, [selectedChat.id]: chatMessages };
    });
  };

  const handleDeleteMessage = (messageId) => {
    if (!selectedChat) return;
    
    setMessages(prev => {
      const chatMessages = prev[selectedChat.id]?.filter(m => m.id !== messageId) || [];
      return { ...prev, [selectedChat.id]: chatMessages };
    });
  };

  const handleCreateGroup = (name, memberIds) => {
    const newGroup = {
      id: uuidv4(),
      name: name || `Группа ${groups.length + 1}`,
      members: memberIds,
    };
    setGroups(prev => [...prev, newGroup]);
    setSelectedChat(newGroup);
    setShowCreateGroup(false);
  };

  const clearHistory = () => {
    if (window.confirm('Очистить всю историю сообщений?')) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  if (!selectedChat) return <div className="loading">Загрузка...</div>;

  const isChatTyping = selectedChat.id === '3' ? isBotTyping : typingUsers[selectedChat.id];

  return (
    <>
      <div className="messenger-container">
        <ContactList
          contacts={allChats}
          selectedId={selectedChat.id}
          onSelect={setSelectedChat}
          onAddGroup={() => setShowCreateGroup(true)}
        />
        <ChatWindow
          chat={selectedChat}
          messages={messages[selectedChat.id] || []}
          currentUser={currentUser}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          isTyping={isChatTyping}
          contacts={CONTACTS}
          onTyping={(typing) => {
            if (selectedChat.type === 'user') {
              setTypingUsers(prev => ({ ...prev, [selectedChat.id]: typing }));
            }
          }}
        />
      </div>
      
      {showCreateGroup && (
        <CreateGroupModal
          contacts={CONTACTS.filter(c => c.type === 'user')}
          onCreate={handleCreateGroup}
          onClose={() => setShowCreateGroup(false)}
        />
      )}
      
      {isDev && (
        <button 
          onClick={clearHistory}
          style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            opacity: 0.3,
            padding: '4px 8px',
            fontSize: '10px',
            background: '#333',
            color: '#999',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          🗑️ Очистить историю
        </button>
      )}
    </>
  );
};

export default Messenger;