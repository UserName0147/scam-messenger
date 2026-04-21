import React, { createContext, useState, useContext, useEffect } from 'react';
import { db } from './firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

const SubscriptionContext = createContext();

export const useSubscription = () => useContext(SubscriptionContext);

export const SUBSCRIPTION_LEVELS = {
  FREE: 'free',
  PRO: 'pro',
  MAX: 'max',
  PREMIUM: 'premium'
};

export const SUBSCRIPTION_LIMITS = {
  [SUBSCRIPTION_LEVELS.FREE]: {
    maxGroups: 3,
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    botMessagesPerDay: 10,
    editWindow: 0,
    deleteForAllWindow: 0,
    pinnedChats: 1,
    voiceMessageMaxLength: 0,
    searchHistoryDays: 7,
    themes: ['dark', 'light'],
  },
  [SUBSCRIPTION_LEVELS.PRO]: {
    maxGroups: 10,
    maxFileSize: 100 * 1024 * 1024, // 100 MB
    botMessagesPerDay: 100,
    editWindow: 60,
    deleteForAllWindow: 10,
    pinnedChats: 3,
    voiceMessageMaxLength: 60,
    searchHistoryDays: 30,
    themes: ['dark', 'light', 'pro_blue', 'pro_green', 'pro_purple'],
  },
  [SUBSCRIPTION_LEVELS.MAX]: {
    maxGroups: 50,
    maxFileSize: 500 * 1024 * 1024, // 500 MB
    botMessagesPerDay: 500,
    editWindow: 24 * 60,
    deleteForAllWindow: 60,
    pinnedChats: 10,
    voiceMessageMaxLength: 300,
    searchHistoryDays: 365,
    themes: ['dark', 'light', 'pro_blue', 'pro_green', 'pro_purple', 'max_gold', 'max_crimson', 'max_ocean', 'custom'],
  },
  [SUBSCRIPTION_LEVELS.PREMIUM]: {
    maxGroups: Infinity,
    maxFileSize: 2 * 1024 * 1024 * 1024, // 2 GB
    botMessagesPerDay: Infinity,
    editWindow: 7 * 24 * 60,
    deleteForAllWindow: 24 * 60,
    pinnedChats: Infinity,
    voiceMessageMaxLength: 900,
    searchHistoryDays: Infinity,
    themes: ['dark', 'light', 'pro_blue', 'pro_green', 'pro_purple', 'max_gold', 'max_crimson', 'max_ocean', 'custom', 'premium_animated'],
    invisibleMode: true,
    secretChats: true,
    prioritySupport: true,
  }
};

export const getLevelName = (level) => {
  const names = {
    [SUBSCRIPTION_LEVELS.FREE]: 'Free',
    [SUBSCRIPTION_LEVELS.PRO]: 'Pro',
    [SUBSCRIPTION_LEVELS.MAX]: 'Max',
    [SUBSCRIPTION_LEVELS.PREMIUM]: 'Premium',
  };
  return names[level] || 'Free';
};

export const getLevelBadge = (level) => {
  const badges = {
    [SUBSCRIPTION_LEVELS.FREE]: '',
    [SUBSCRIPTION_LEVELS.PRO]: '⭐',
    [SUBSCRIPTION_LEVELS.MAX]: '👑',
    [SUBSCRIPTION_LEVELS.PREMIUM]: '🔥',
  };
  return badges[level] || '';
};

export const SubscriptionProvider = ({ children, currentUser }) => {
  const [subscription, setSubscription] = useState({
    level: SUBSCRIPTION_LEVELS.FREE,
    expiresAt: null,
    loading: true,
  });

  const [dailyBotMessages, setDailyBotMessages] = useState(0);
  const [lastBotMessageDate, setLastBotMessageDate] = useState('');

  useEffect(() => {
    if (!currentUser) {
      setSubscription({ level: SUBSCRIPTION_LEVELS.FREE, expiresAt: null, loading: false });
      return;
    }

    const subRef = doc(db, 'subscriptions', currentUser);
    const unsubscribe = onSnapshot(subRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
          setSubscription({ level: SUBSCRIPTION_LEVELS.FREE, expiresAt: null, loading: false });
        } else {
          setSubscription({
            level: data.level || SUBSCRIPTION_LEVELS.FREE,
            expiresAt: data.expiresAt?.toDate() || null,
            loading: false,
          });
        }
      } else {
        setSubscription({ level: SUBSCRIPTION_LEVELS.FREE, expiresAt: null, loading: false });
      }
    });

    // Загружаем счётчик сообщений боту
    const today = new Date().toDateString();
    const saved = localStorage.getItem(`bot_messages_${currentUser}`);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.date === today) {
        setDailyBotMessages(data.count);
        setLastBotMessageDate(data.date);
      } else {
        setDailyBotMessages(0);
        setLastBotMessageDate(today);
      }
    } else {
      setLastBotMessageDate(today);
    }

    return () => unsubscribe();
  }, [currentUser]);

  const incrementBotMessages = () => {
    const today = new Date().toDateString();
    if (lastBotMessageDate !== today) {
      setDailyBotMessages(1);
      setLastBotMessageDate(today);
      localStorage.setItem(`bot_messages_${currentUser}`, JSON.stringify({ date: today, count: 1 }));
    } else {
      const newCount = dailyBotMessages + 1;
      setDailyBotMessages(newCount);
      localStorage.setItem(`bot_messages_${currentUser}`, JSON.stringify({ date: today, count: newCount }));
    }
  };

  const checkLimit = (limitName, value) => {
    const limit = SUBSCRIPTION_LIMITS[subscription.level]?.[limitName];
    if (limit === undefined) return true;
    if (limit === Infinity) return true;
    return value <= limit;
  };

  const getLimit = (limitName) => {
    return SUBSCRIPTION_LIMITS[subscription.level]?.[limitName] ?? 0;
  };

  const hasFeature = (featureName) => {
    return SUBSCRIPTION_LIMITS[subscription.level]?.[featureName] === true;
  };

  const canSendBotMessage = () => {
    const limit = SUBSCRIPTION_LIMITS[subscription.level]?.botMessagesPerDay;
    if (limit === Infinity) return true;
    return dailyBotMessages < limit;
  };

  const setUserSubscription = async (userId, level, days = 30) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    
    await setDoc(doc(db, 'subscriptions', userId), {
      level,
      expiresAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  };

  return (
    <SubscriptionContext.Provider value={{
      level: subscription.level,
      expiresAt: subscription.expiresAt,
      loading: subscription.loading,
      checkLimit,
      getLimit,
      hasFeature,
      setUserSubscription,
      levelName: getLevelName(subscription.level),
      levelBadge: getLevelBadge(subscription.level),
      canSendBotMessage,
      incrementBotMessages,
      dailyBotMessages,
      botMessagesLimit: SUBSCRIPTION_LIMITS[subscription.level]?.botMessagesPerDay,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};