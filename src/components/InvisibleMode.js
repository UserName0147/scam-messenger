import React, { useState, useEffect } from 'react';
import { useSubscription } from '../SubscriptionContext';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const InvisibleMode = ({ currentUser, onClose }) => {
  const { hasFeature } = useSubscription();
  const [invisible, setInvisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const canUseInvisible = hasFeature('invisibleMode');

  useEffect(() => {
    // Загружаем текущий статус
    const saved = localStorage.getItem(`invisible_${currentUser}`);
    if (saved) {
      setInvisible(JSON.parse(saved));
    }
  }, [currentUser]);

  const toggleInvisible = async () => {
    if (!canUseInvisible) {
      alert('Режим невидимки доступен только на тарифе Premium');
      return;
    }

    setLoading(true);
    const newState = !invisible;
    setInvisible(newState);
    localStorage.setItem(`invisible_${currentUser}`, JSON.stringify(newState));

    // Обновляем статус в Firestore
    const userRef = doc(db, 'users', currentUser);
    await setDoc(userRef, {
      invisible: newState,
      lastSeen: serverTimestamp(),
    }, { merge: true });

    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>👻 Режим невидимки</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          {!canUseInvisible ? (
            <div className="premium-locked">
              <p>🔒 Режим невидимки доступен только на тарифе Premium</p>
              <button className="upgrade-btn" onClick={onClose}>
                Улучшить подписку
              </button>
            </div>
          ) : (
            <>
              <p className="invisible-description">
                Когда режим включён, вы не отображаетесь как «онлайн» для других пользователей.
                Вы можете читать сообщения, и отправители не увидят отметку «прочитано».
              </p>
              
              <div className="invisible-toggle">
                <span>Режим невидимки</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={invisible} 
                    onChange={toggleInvisible}
                    disabled={loading}
                  />
                  <span className="slider"></span>
                </label>
              </div>
              
              {invisible && (
                <div className="invisible-active">
                  ✅ Режим невидимки активен. Ваш онлайн-статус скрыт.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvisibleMode;