import React, { useState } from 'react';
import { useScoin } from '../ScoinContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const CASE_PRICE = 50;

const SKINS = [
  { name: 'Лазурный дракон', emoji: '🐉', rarity: 'legendary', color: '#ffd700', chance: 1 },
  { name: 'Кровавый тигр', emoji: '🐅', rarity: 'mythical', color: '#ff4500', chance: 3 },
  { name: 'Золотой калаш', emoji: '🔫', rarity: 'rare', color: '#4169e1', chance: 10 },
  { name: 'Серебряный нож', emoji: '🔪', rarity: 'uncommon', color: '#c0c0c0', chance: 20 },
  { name: 'Тактический шлем', emoji: '⛑️', rarity: 'common', color: '#888', chance: 30 },
  { name: 'Дымовая граната', emoji: '💨', rarity: 'common', color: '#888', chance: 36 },
];

const CaseSimulator = ({ currentUser, onClose, chatId }) => {
  const { balance, spendScoin } = useScoin();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const openCase = async () => {
    setError('');
    
    if (balance < CASE_PRICE) {
      setError(`Недостаточно Scoin! Нужно ${CASE_PRICE}`);
      return;
    }

    const success = await spendScoin(currentUser, CASE_PRICE);
    if (!success) {
      setError('Ошибка списания');
      return;
    }

    setSpinning(true);
    setResult(null);

    setTimeout(async () => {
      const rand = Math.random() * 100;
      let cumulative = 0;
      let wonSkin = SKINS[SKINS.length - 1];
      
      for (const skin of SKINS) {
        cumulative += skin.chance;
        if (rand < cumulative) {
          wonSkin = skin;
          break;
        }
      }

      setResult(wonSkin);
      setSpinning(false);

      // Отправляем сообщение в чат о дропе
      if (chatId) {
        await addDoc(collection(db, 'messages'), {
          text: `🎁 ${currentUser} открыл кейс и получил: ${wonSkin.emoji} ${wonSkin.name} (${wonSkin.rarity})!`,
          sender: 'system',
          chatId: chatId,
          timestamp: serverTimestamp(),
          type: 'system',
        });
      }
    }, 1500);
  };

  return (
    <div className="case-simulator-overlay" onClick={onClose}>
      <div className="case-simulator" onClick={(e) => e.stopPropagation()}>
        <div className="case-header">
          <h2>🎁 Кейс CS2</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="case-balance">
          💰 Баланс: {balance} Scoin
        </div>
        
        <div className="case-preview">
          {spinning ? (
            <div className="spinner">🎰 Крутим...</div>
          ) : result ? (
            <div className="case-result" style={{ borderColor: result.color }}>
              <span className="result-emoji">{result.emoji}</span>
              <span className="result-name" style={{ color: result.color }}>{result.name}</span>
              <span className="result-rarity">({result.rarity})</span>
            </div>
          ) : (
            <div className="case-closed">🎁 Нажми «Открыть»</div>
          )}
        </div>
        
        {error && <div className="case-error">{error}</div>}
        
        <button 
          className="open-case-btn" 
          onClick={openCase} 
          disabled={spinning}
        >
          {spinning ? 'Открываем...' : `🔓 Открыть (${CASE_PRICE} Scoin)`}
        </button>
      </div>
    </div>
  );
};

export default CaseSimulator;