import React, { useState } from 'react';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential
} from 'firebase/auth';

const Auth = ({ onLogin }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Phone state
  const [phoneMode, setPhoneMode] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);

  const isAnyLoading = loading || googleLoading || githubLoading || phoneLoading;

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      const auth = getAuth();
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {}
      });
    }
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!phoneNumber.trim()) {
      setError('Введите номер телефона');
      return;
    }

    setPhoneLoading(true);
    setupRecaptcha();

    const auth = getAuth();
    
    try {
      const confirmationResult = await signInWithPhoneNumber(
        auth, 
        phoneNumber, 
        window.recaptchaVerifier
      );
      setVerificationId(confirmationResult.verificationId);
      setCodeSent(true);
    } catch (err) {
      console.error('Phone error:', err);
      if (err.code === 'auth/invalid-phone-number') {
        setError('Неверный формат номера. Пример: +79123456789');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Слишком много попыток. Попробуйте позже.');
      } else {
        setError('Ошибка отправки кода: ' + err.message);
      }
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setPhoneLoading(true);

    try {
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
      const auth = getAuth();
      const result = await signInWithCredential(auth, credential);
      
      const isDev = result.user.phoneNumber === process.env.REACT_APP_DEV_PHONE;
      
      onLogin({
        username: result.user.phoneNumber,
        phoneNumber: result.user.phoneNumber,
        uid: result.user.uid,
        isDev: isDev
      });
    } catch (err) {
      setError('Неверный код подтверждения');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim() || !password.trim()) {
      setError('Заполните все поля');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    setLoading(true);
    const auth = getAuth();

    try {
      let userCredential;
      let username = email.split('@')[0];

      if (mode === 'register') {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }

      const isDev = email === process.env.REACT_APP_DEV_EMAIL || email === 'devscammessenger@scam.local';
      
      onLogin({ 
        username: username,
        email: email,
        uid: userCredential.user.uid,
        isDev: isDev,
        photoURL: userCredential.user.photoURL
      });
    } catch (err) {
      if (err.code === 'auth/user-not-found') setError('Пользователь не найден');
      else if (err.code === 'auth/wrong-password') setError('Неверный пароль');
      else if (err.code === 'auth/email-already-in-use') setError('Email уже используется');
      else if (err.code === 'auth/invalid-email') setError('Некорректный email');
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const isDev = user.email === process.env.REACT_APP_DEV_EMAIL || user.email === 'devscammessenger@scam.local';
      
      onLogin({
        username: user.displayName || user.email?.split('@')[0],
        email: user.email,
        uid: user.uid,
        isDev: isDev,
        photoURL: user.photoURL
      });
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Окно входа было закрыто');
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('Аккаунт уже существует с другим способом входа');
      } else {
        setError('Ошибка входа через Google: ' + err.message);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setError('');
    setGithubLoading(true);
    
    const auth = getAuth();
    const provider = new GithubAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const isDev = user.email === process.env.REACT_APP_DEV_EMAIL;
      
      onLogin({
        username: user.displayName || user.email?.split('@')[0] || 'github_user',
        email: user.email,
        uid: user.uid,
        isDev: isDev,
        photoURL: user.photoURL
      });
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Окно входа было закрыто');
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('Аккаунт уже существует с другим способом входа');
      } else {
        setError('Ошибка входа через GitHub: ' + err.message);
      }
    } finally {
      setGithubLoading(false);
    }
  };

  const resetPhoneMode = () => {
    setPhoneMode(false);
    setCodeSent(false);
    setPhoneNumber('');
    setVerificationCode('');
    setVerificationId('');
  };

  return (
    <div className="auth-container">
      <div id="recaptcha-container"></div>
      
      <div className="auth-card">
        {!phoneMode ? (
          <>
            <div className="auth-tabs">
              <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>
                Вход
              </button>
              <button className={`auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>
                Регистрация
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="auth-form">
              <h2>{mode === 'login' ? 'Войти в Скам' : 'Создать аккаунт'}</h2>
              
              <div className="input-group">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  disabled={isAnyLoading}
                />
              </div>
              
              <div className="input-group">
                <input
                  type="password"
                  placeholder="Пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isAnyLoading}
                />
              </div>
              
              {mode === 'register' && (
                <div className="input-group">
                  <input
                    type="password"
                    placeholder="Подтвердите пароль"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isAnyLoading}
                  />
                </div>
              )}
              
              {error && <div className="auth-error">{error}</div>}
              
              <button type="submit" className="auth-submit" disabled={isAnyLoading}>
                {loading ? 'Загрузка...' : (mode === 'login' ? 'Войти' : 'Зарегистрироваться')}
              </button>
            </form>
            
            <div className="auth-divider">
              <span>или</span>
            </div>
            
            <div className="social-buttons">
              <button 
                className="social-btn google"
                onClick={handleGoogleSignIn}
                disabled={isAnyLoading}
              >
                {googleLoading ? '...' : 'G'} Google
              </button>
              
              <button 
                className="social-btn github"
                onClick={handleGithubSignIn}
                disabled={isAnyLoading}
              >
                {githubLoading ? '...' : '🐙'} GitHub
              </button>
              
              <button 
                className="social-btn phone"
                onClick={() => setPhoneMode(true)}
                disabled={isAnyLoading}
              >
                📱 Телефон
              </button>
            </div>
          </>
        ) : (
          <div className="phone-auth">
            <button className="back-btn" onClick={resetPhoneMode}>
              ← Назад
            </button>
            
            <h2>{codeSent ? 'Введите код' : 'Вход по номеру'}</h2>
            
            {!codeSent ? (
              <form onSubmit={handleSendCode}>
                <div className="input-group">
                  <input
                    type="tel"
                    placeholder="+79123456789"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    autoFocus
                    disabled={phoneLoading}
                  />
                </div>
                
                {error && <div className="auth-error">{error}</div>}
                
                <button type="submit" className="auth-submit" disabled={phoneLoading}>
                  {phoneLoading ? 'Отправка...' : 'Получить код'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode}>
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    autoFocus
                    disabled={phoneLoading}
                  />
                </div>
                
                {error && <div className="auth-error">{error}</div>}
                
                <button type="submit" className="auth-submit" disabled={phoneLoading}>
                  {phoneLoading ? 'Проверка...' : 'Подтвердить'}
                </button>
                
                <button 
                  type="button" 
                  className="resend-btn"
                  onClick={handleSendCode}
                  disabled={phoneLoading}
                >
                  Отправить код повторно
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;