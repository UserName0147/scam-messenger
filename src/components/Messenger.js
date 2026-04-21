import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ContactList from './ContactList';
import ChatWindow from './ChatWindow';
import CreateGroupModal from './CreateGroupModal';
import GlobalSearch from './GlobalSearch';
import SubscriptionPage from './SubscriptionPage';
import InvisibleMode from './InvisibleMode';
import SecretChat from './SecretChat';
import ChannelModal from './ChannelModal';
import CaseSimulator from './CaseSimulator';
import { useSound } from '../SoundContext';
import { useNotification } from '../NotificationContext';
import { useSubscription } from '../SubscriptionContext';
import { useScoin } from '../ScoinContext';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
} from 'firebase/firestore';

const CONTACTS = [
  { id: '1', name: 'Иван Петров', type: 'user' },
  { id: '2', name: 'Мария Иванова', type: 'user' },
  { id: '3', name: 'Скам Бот', type: 'bot' },
];

const OPENROUTER_API_KEY = process.env.REACT_APP_OPENROUTER_KEY;

const Messenger = ({ currentUser, isDev }) => {
  const GROUPS_STORAGE_KEY = `scam_groups_${currentUser}`;
  const LAST_READ_KEY = `scam_last_read_${currentUser}`;

  const [selectedChat, setSelectedChat] = useState(null);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showSubscriptionPage, setShowSubscriptionPage] = useState(false);
  const [showInvisibleMode, setShowInvisibleMode] = useState(false);
  const [showSecretChat, setShowSecretChat] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showCaseSimulator, setShowCaseSimulator] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const { playSendSound, playReceiveSound } = useSound();
  const { showNotification } = useNotification();
  const { 
    level, 
    levelBadge, 
    getLimit, 
    canSendBotMessage, 
    incrementBotMessages,
    dailyBotMessages,
    botMessagesLimit,
    hasFeature
  } = useSubscription();
  const { addScoin } = useScoin();
  const prevMessagesRef = useRef({});

  const [messages, setMessages] = useState({});
  const [groups, setGroups] = useState(() => {
    const saved = localStorage.getItem(GROUPS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [onlineUsers, setOnlineUsers] = useState({});
  const [allUsers, setAllUsers] = useState([]);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);

  const [lastReadMessages, setLastReadMessages] = useState(() => {
    const saved = localStorage.getItem(LAST_READ_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  // Ежедневный бонус Scoin при входе
  useEffect(() => {
    if (!currentUser) return;
    const lastBonus = localStorage.getItem(`scoin_bonus_${currentUser}`);
    const today = new Date().toDateString();
    if (lastBonus !== today) {
      addScoin(currentUser, 100);
      localStorage.setItem(`scoin_bonus_${currentUser}`, today);
    }
  }, [currentUser, addScoin]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem(LAST_READ_KEY, JSON.stringify(lastReadMessages));
  }, [lastReadMessages]);

  useEffect(() => {
    const userRef = doc(db, 'users', currentUser);
    setDoc(userRef, { online: true, lastSeen: serverTimestamp() }, { merge: true });

    const handleUnload = () => {
      setDoc(userRef, { online: false, lastSeen: serverTimestamp() }, { merge: true });
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      handleUnload();
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [currentUser]);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    return onSnapshot(q, (snapshot) => {
      const users = {};
      snapshot.forEach((doc) => {
        users[doc.id] = doc.data();
      });
      setOnlineUsers(users);
      setAllUsers(Object.keys(users));
    });
  }, []);

  useEffect(() => {
    if (!selectedChat) return;
    const typingRef = doc(db, 'typing', selectedChat.id);
    return onSnapshot(typingRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTypingUsers((prev) => ({ ...prev, [selectedChat.id]: data.users || {} }));
      }
    });
  }, [selectedChat]);

  const allChats = useMemo(() => {
    const userChats = allUsers
      .filter((u) => u !== currentUser)
      .map((u) => ({
        id: u,
        name: u,
        type: 'user',
        online: onlineUsers[u]?.online || false,
      }));
    return [...CONTACTS, ...userChats, ...groups.map((g) => ({ ...g, type: 'group' }))];
  }, [groups, allUsers, currentUser, onlineUsers]);

  useEffect(() => {
    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMessages = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const chatId = data.chatId;
        if (!allMessages[chatId]) allMessages[chatId] = [];
        allMessages[chatId].push({
          id: docSnap.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
        });
      });
      setMessages(allMessages);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (allChats.length > 0 && !selectedChat) {
      setSelectedChat(allChats[0]);
    }
  }, [allChats, selectedChat]);

  useEffect(() => {
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
  }, [groups, GROUPS_STORAGE_KEY]);

  const getUnreadCount = (chatId) => {
    const chatMessages = messages[chatId] || [];
    const lastReadId = lastReadMessages[chatId];
    
    if (!lastReadId) {
      return chatMessages.filter(msg => msg.sender !== currentUser).length;
    }
    
    const lastReadIndex = chatMessages.findIndex(msg => msg.id === lastReadId);
    if (lastReadIndex === -1) return chatMessages.filter(msg => msg.sender !== currentUser).length;
    
    return chatMessages
      .slice(lastReadIndex + 1)
      .filter(msg => msg.sender !== currentUser).length;
  };

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    if (isMobile) setShowChatOnMobile(true);
    
    const chatMessages = messages[chat.id] || [];
    if (chatMessages.length > 0) {
      const lastMessage = chatMessages[chatMessages.length - 1];
      setLastReadMessages(prev => ({
        ...prev,
        [chat.id]: lastMessage.id
      }));
    }
  };

  const handleBackToContacts = () => {
    setShowChatOnMobile(false);
  };

  useEffect(() => {
    Object.keys(messages).forEach((chatId) => {
      const prevMessages = prevMessagesRef.current[chatId] || [];
      const currentMessages = messages[chatId] || [];

      if (currentMessages.length > prevMessages.length) {
        const newMsg = currentMessages[currentMessages.length - 1];
        if (newMsg.sender !== currentUser) {
          playReceiveSound();
          
          if (document.visibilityState !== 'visible') {
            showNotification(`${newMsg.sender}`, {
              body: newMsg.text || (newMsg.type === 'image' ? '📷 Изображение' : '📎 Файл'),
            });
          }
        }
      }

      prevMessagesRef.current[chatId] = currentMessages;
    });
  }, [messages, currentUser, playReceiveSound, showNotification]);

  const callOpenRouter = async (userMessage) => {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-lite-001',
          messages: [
            {
              role: 'system',
              content: 'Ты — Скам Бот. Отвечай на русском, с юмором, коротко. Используй эмодзи.',
            },
            { role: 'user', content: userMessage },
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
    if (!canSendBotMessage()) {
      const botMessage = {
        text: `⚠️ Достигнут дневной лимит сообщений боту (${dailyBotMessages}/${botMessagesLimit}). Обновите подписку!`,
        sender: 'Скам Бот',
        chatId: '3',
        timestamp: serverTimestamp(),
      };
      await addDoc(collection(db, 'messages'), botMessage);
      return;
    }

    setIsBotTyping(true);

    const aiResponse = await callOpenRouter(userMessage);

    const botMessage = {
      text: aiResponse,
      sender: 'Скам Бот',
      chatId: '3',
      timestamp: serverTimestamp(),
    };

    await addDoc(collection(db, 'messages'), botMessage);
    incrementBotMessages();

    setIsBotTyping(false);
  }, [canSendBotMessage, dailyBotMessages, botMessagesLimit, incrementBotMessages]);

  useEffect(() => {
    if (!selectedChat || selectedChat.id !== '3') return;

    const botMessages = messages['3'] || [];
    const lastMessage = botMessages[botMessages.length - 1];

    if (!lastMessage || lastMessage.sender === 'Скам Бот' || isBotTyping) return;

    handleBotResponse(lastMessage.text);
  }, [messages, selectedChat, isBotTyping, handleBotResponse]);

  const handleSendMessage = async (text, file, replyTo) => {
    if (!selectedChat) return;

    if (file) {
      const maxSize = getLimit('maxFileSize');
      if (file.size > maxSize) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        const maxMB = (maxSize / 1024 / 1024).toFixed(0);
        alert(`Файл слишком большой (${sizeMB} МБ). Ваш тариф позволяет отправлять файлы до ${maxMB} МБ.`);
        return;
      }
    }

    const newMsg = {
      text: text || '',
      type: file ? (file.type?.startsWith('image/') ? 'image' : 'file') : 'text',
      fileName: file?.name,
      fileSize: file?.size,
      sender: currentUser,
      chatId: selectedChat.id,
      timestamp: serverTimestamp(),
      replyTo: replyTo?.id || null,
    };

    if (file && file.type?.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        newMsg.content = e.target.result;
        await addDoc(collection(db, 'messages'), newMsg);
      };
      reader.readAsDataURL(file);
    } else {
      newMsg.content = file || text;
      await addDoc(collection(db, 'messages'), newMsg);
    }

    playSendSound();
  };

  const handleEditMessage = async (messageId, newText) => {
    const editWindow = getLimit('editWindow');
    if (editWindow === 0) {
      alert('Редактирование сообщений недоступно на вашем тарифе.');
      return;
    }

    const messageRef = doc(db, 'messages', messageId);
    await updateDoc(messageRef, { text: newText, edited: true });
  };

  const handleDeleteMessage = async (messageId) => {
    const messageRef = doc(db, 'messages', messageId);
    await deleteDoc(messageRef);
  };

  const handleCreateGroup = (name, memberIds) => {
    const maxGroups = getLimit('maxGroups');
    if (groups.length >= maxGroups) {
      alert(`Достигнут лимит групп (${maxGroups}). Обновите подписку, чтобы создавать больше групп.`);
      return;
    }

    const newGroup = {
      id: uuidv4(),
      name: name || `Группа ${groups.length + 1}`,
      members: memberIds,
    };
    setGroups((prev) => [...prev, newGroup]);
    setSelectedChat(newGroup);
    if (isMobile) setShowChatOnMobile(true);
    setShowCreateGroup(false);
  };

  const handleTyping = async (isTyping) => {
    if (!selectedChat) return;
    const typingRef = doc(db, 'typing', selectedChat.id);
    const typingData = { users: { [currentUser]: isTyping } };
    await setDoc(typingRef, typingData, { merge: true });
  };

  const handleSelectSearchResult = (chatId, messageId) => {
    const targetChat = allChats.find(c => c.id === chatId);
    if (targetChat) {
      setSelectedChat(targetChat);
      if (isMobile) setShowChatOnMobile(true);
      setTimeout(() => {
        const element = document.getElementById(`msg-${messageId}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element?.classList.add('highlight');
        setTimeout(() => element?.classList.remove('highlight'), 2000);
      }, 100);
    }
    setShowGlobalSearch(false);
  };

  if (!selectedChat) return <div className="loading">Загрузка...</div>;

  const isChatTyping =
    selectedChat.id === '3'
      ? isBotTyping
      : typingUsers[selectedChat.id]?.[currentUser] || false;

  const unreadCounts = Object.keys(messages).reduce((acc, chatId) => {
    acc[chatId] = getUnreadCount(chatId);
    return acc;
  }, {});

  if (isMobile && !showChatOnMobile) {
    return (
      <>
        <div className="messenger-container mobile-contacts-only">
          <ContactList
            contacts={allChats}
            selectedId={selectedChat.id}
            onSelect={handleSelectChat}
            onAddGroup={() => setShowCreateGroup(true)}
            onGlobalSearch={() => setShowGlobalSearch(true)}
            unreadCounts={unreadCounts}
            onSubscriptionClick={() => setShowSubscriptionPage(true)}
            currentUser={currentUser}
            level={level}
            levelBadge={levelBadge}
            isDev={isDev}
            onInvisibleClick={() => setShowInvisibleMode(true)}
            onSecretChatClick={() => setShowSecretChat(true)}
            onChannelClick={() => setShowChannelModal(true)}
            hasFeature={hasFeature}
            onCaseClick={() => setShowCaseSimulator(true)}
          />
        </div>
        {showCreateGroup && (
          <CreateGroupModal
            contacts={CONTACTS.filter((c) => c.type === 'user')}
            onCreate={handleCreateGroup}
            onClose={() => setShowCreateGroup(false)}
          />
        )}
        {showGlobalSearch && (
          <GlobalSearch
            currentUser={currentUser}
            messages={messages}
            allChats={allChats}
            onSelectResult={handleSelectSearchResult}
            onClose={() => setShowGlobalSearch(false)}
          />
        )}
        {showSubscriptionPage && (
          <SubscriptionPage
            onClose={() => setShowSubscriptionPage(false)}
            currentUser={currentUser}
            isDev={isDev}
          />
        )}
        {showInvisibleMode && (
          <InvisibleMode
            currentUser={currentUser}
            onClose={() => setShowInvisibleMode(false)}
          />
        )}
        {showSecretChat && (
          <SecretChat
            currentUser={currentUser}
            contacts={CONTACTS.filter((c) => c.type === 'user')}
            onClose={() => setShowSecretChat(false)}
            onChatCreated={(chat) => {
              setGroups((prev) => [...prev, chat]);
              setSelectedChat(chat);
            }}
          />
        )}
        {showChannelModal && (
          <ChannelModal
            currentUser={currentUser}
            onClose={() => setShowChannelModal(false)}
            onChannelCreated={(channel) => {
              setGroups((prev) => [...prev, channel]);
              setSelectedChat(channel);
            }}
          />
        )}
        {showCaseSimulator && (
          <CaseSimulator
            currentUser={currentUser}
            onClose={() => setShowCaseSimulator(false)}
            chatId={selectedChat?.id}
          />
        )}
      </>
    );
  }

  if (isMobile && showChatOnMobile) {
    return (
      <div className="messenger-container mobile-chat-only">
        <ChatWindow
          chat={selectedChat}
          messages={messages[selectedChat.id] || []}
          currentUser={currentUser}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          isTyping={isChatTyping}
          contacts={CONTACTS}
          onTyping={handleTyping}
          onBack={handleBackToContacts}
          isMobile={true}
        />
      </div>
    );
  }

  return (
    <>
      <div className="messenger-container">
        <ContactList
          contacts={allChats}
          selectedId={selectedChat.id}
          onSelect={handleSelectChat}
          onAddGroup={() => setShowCreateGroup(true)}
          onGlobalSearch={() => setShowGlobalSearch(true)}
          unreadCounts={unreadCounts}
          onSubscriptionClick={() => setShowSubscriptionPage(true)}
          currentUser={currentUser}
          level={level}
          levelBadge={levelBadge}
          isDev={isDev}
          onInvisibleClick={() => setShowInvisibleMode(true)}
          onSecretChatClick={() => setShowSecretChat(true)}
          onChannelClick={() => setShowChannelModal(true)}
          hasFeature={hasFeature}
          onCaseClick={() => setShowCaseSimulator(true)}
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
          onTyping={handleTyping}
        />
      </div>

      {showCreateGroup && (
        <CreateGroupModal
          contacts={CONTACTS.filter((c) => c.type === 'user')}
          onCreate={handleCreateGroup}
          onClose={() => setShowCreateGroup(false)}
        />
      )}

      {showGlobalSearch && (
        <GlobalSearch
          currentUser={currentUser}
          messages={messages}
          allChats={allChats}
          onSelectResult={handleSelectSearchResult}
          onClose={() => setShowGlobalSearch(false)}
        />
      )}

      {showSubscriptionPage && (
        <SubscriptionPage
          onClose={() => setShowSubscriptionPage(false)}
          currentUser={currentUser}
          isDev={isDev}
        />
      )}

      {showInvisibleMode && (
        <InvisibleMode
          currentUser={currentUser}
          onClose={() => setShowInvisibleMode(false)}
        />
      )}

      {showSecretChat && (
        <SecretChat
          currentUser={currentUser}
          contacts={CONTACTS.filter((c) => c.type === 'user')}
          onClose={() => setShowSecretChat(false)}
          onChatCreated={(chat) => {
            setGroups((prev) => [...prev, chat]);
            setSelectedChat(chat);
          }}
        />
      )}

      {showChannelModal && (
        <ChannelModal
          currentUser={currentUser}
          onClose={() => setShowChannelModal(false)}
          onChannelCreated={(channel) => {
            setGroups((prev) => [...prev, channel]);
            setSelectedChat(channel);
          }}
        />
      )}

      {showCaseSimulator && (
        <CaseSimulator
          currentUser={currentUser}
          onClose={() => setShowCaseSimulator(false)}
          chatId={selectedChat?.id}
        />
      )}
    </>
  );
};

export default Messenger;