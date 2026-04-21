import React, { createContext, useState, useContext, useEffect } from 'react';
import { db } from './firebase';
import { doc, setDoc, onSnapshot, serverTimestamp, increment } from 'firebase/firestore';

const ScoinContext = createContext();

export const useScoin = () => useContext(ScoinContext);

export const ScoinProvider = ({ children, currentUser }) => {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setBalance(0);
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'scoin_balances', currentUser);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setBalance(docSnap.data().balance || 0);
      } else {
        setBalance(0);
        // Создаём документ при первом входе
        setDoc(userRef, { balance: 0, updatedAt: serverTimestamp() }, { merge: true });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const updateBalance = async (userId, newBalance) => {
    const userRef = doc(db, 'scoin_balances', userId);
    await setDoc(userRef, {
      balance: newBalance,
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  const addScoin = async (userId, amount) => {
    if (!userId || amount <= 0) return;
    const userRef = doc(db, 'scoin_balances', userId);
    await setDoc(userRef, {
      balance: increment(amount),
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  const spendScoin = async (userId, amount) => {
    if (!userId || amount <= 0) return false;
    const currentBalance = balance;
    if (currentBalance < amount) return false;
    
    const userRef = doc(db, 'scoin_balances', userId);
    await setDoc(userRef, {
      balance: increment(-amount),
      updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  };

  return (
    <ScoinContext.Provider value={{
      balance,
      loading,
      addScoin,
      spendScoin,
      updateBalance
    }}>
      {children}
    </ScoinContext.Provider>
  );
};