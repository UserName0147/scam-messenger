import React, { createContext, useContext, useState, useEffect } from 'react';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [permission, setPermission] = useState(Notification.permission);
  const [enabled, setEnabled] = useState(() => {
    return localStorage.getItem('scam_notifications') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('scam_notifications', enabled);
  }, [enabled]);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Ваш браузер не поддерживает уведомления');
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  };

  const showNotification = (title, options = {}) => {
    if (!enabled) return;
    
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        ...options
      });
    } else if (Notification.permission !== 'denied') {
      requestPermission().then((granted) => {
        if (granted) {
          new Notification(title, {
            icon: '/favicon.ico',
            ...options
          });
        }
      });
    }
  };

  const toggleEnabled = () => {
    if (!enabled) {
      requestPermission().then((granted) => {
        if (granted) setEnabled(true);
      });
    } else {
      setEnabled(false);
    }
  };

  return (
    <NotificationContext.Provider value={{
      permission,
      enabled,
      showNotification,
      toggleEnabled,
      requestPermission
    }}>
      {children}
    </NotificationContext.Provider>
  );
};