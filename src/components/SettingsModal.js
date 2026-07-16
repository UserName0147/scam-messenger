import React from 'react';
import { useTheme, ACCENT_PRESETS, THEMES, FONT_SIZES } from '../ThemeContext';

const SettingsModal = ({ onClose }) => {
  const { theme, setTheme, accent, setAccent, resetAccent, fontSize, setFontSize } = useTheme();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⚙️ Настройки</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* #69 Темы + AMOLED */}
          <div className="form-group">
            <label>Тема</label>
            <div className="settings-row">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`settings-chip ${theme === t.id ? 'active' : ''}`}
                  onClick={() => setTheme(t.id)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* #67 Акцентный цвет */}
          <div className="form-group">
            <label>Акцентный цвет</label>
            <div className="settings-row">
              {ACCENT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  className={`accent-dot ${accent.toLowerCase() === p.color.toLowerCase() ? 'active' : ''}`}
                  style={{ backgroundColor: p.color }}
                  onClick={() => setAccent(p.color)}
                  title={p.name}
                  aria-label={p.name}
                />
              ))}
            </div>
            <div className="settings-row" style={{ marginTop: '10px' }}>
              <label className="settings-custom-color">
                Свой цвет
                <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
              </label>
              <button className="settings-chip" onClick={resetAccent}>Сбросить</button>
            </div>
          </div>

          {/* #70 Размер шрифта */}
          <div className="form-group">
            <label>Размер шрифта</label>
            <div className="settings-row">
              {FONT_SIZES.map((f) => (
                <button
                  key={f.id}
                  className={`settings-chip ${fontSize === f.id ? 'active' : ''}`}
                  onClick={() => setFontSize(f.id)}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-preview">
            <div className="message received" style={{ maxWidth: '100%' }}>
              <div className="message-text">Так выглядит входящее сообщение</div>
            </div>
            <div className="message sent" style={{ maxWidth: '100%' }}>
              <div className="message-text">А так — твоё</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
