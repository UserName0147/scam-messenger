import React, { createContext, useState, useContext, useEffect, useRef } from 'react';

const SoundContext = createContext();

export const useSound = () => useContext(SoundContext);

export const SoundProvider = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('scam_sound');
    return saved ? JSON.parse(saved) : true;
  });
  
  const audioContextRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Инициализация аудио-контекста при первом взаимодействии
  const initAudio = () => {
    if (isInitializedRef.current) return;
    
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      isInitializedRef.current = true;
    } catch (e) {
      console.log('Web Audio API не поддерживается');
    }
  };

  // Функция для воспроизведения простого звука
  const playTone = (frequency, duration, type = 'sine') => {
    if (!soundEnabled || !audioContextRef.current) return;
    
    try {
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      oscillator.start();
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.log('Ошибка воспроизведения звука:', e);
    }
  };

  useEffect(() => {
    localStorage.setItem('scam_sound', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  const playSendSound = () => {
    initAudio(); // Инициализируем при первом использовании
    playTone(800, 0.1, 'sine'); // Короткий высокий звук
  };

  const playReceiveSound = () => {
    initAudio();
    playTone(600, 0.15, 'triangle'); // Более низкий и длинный звук
  };

  const toggleSound = () => setSoundEnabled(prev => !prev);

  return (
    <SoundContext.Provider value={{ 
      soundEnabled, 
      toggleSound, 
      playSendSound, 
      playReceiveSound 
    }}>
      {children}
    </SoundContext.Provider>
  );
};