import React from 'react';

// Проверенный набор эмодзи (работают во всех версиях Windows)
const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊',
  '😋', '😎', '😍', '🥰', '😘', '😗', '😙', '😚', '🙂', '🤗',
  '🤔', '🤫', '🤭', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒',
  '🙄', '😬', '😌', '😔', '😪', '😴', '😷', '🤒', '🤕', '🤢',
  '🤮', '🤧', '😇', '🥳', '🥺', '🤠', '🤡', '🤥', '🤤', '🤓',
  '👍', '👎', '👊', '✊', '👏', '🙌', '👐', '🙏', '💪', '🦾',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💕',
  '💞', '💓', '💗', '💖', '💘', '💝', '🔥', '💯', '✨', '🎉',
  '🎊', '🎈', '🎂', '🎁', '🏆', '⚡', '💡', '❓', '❗', '💬',
  '💭', '🗯️', '💤', '💢', '💦', '💨', '🕶️', '👓', '🎮', '📱',
  '💻', '🖥️', '⌨️', '🖱️', '💾', '💿', '📀', '🎵', '🎶', '🎤',
];

const EmojiPicker = ({ onSelectEmoji, onClose }) => {
  return (
    <>
      <div className="emoji-picker-backdrop" onClick={onClose} />
      <div className="emoji-picker">
        <div className="emoji-picker-header">
          <span>Выберите эмодзи</span>
          <button className="emoji-picker-close" onClick={onClose}>✕</button>
        </div>
        <div className="emoji-grid">
          {EMOJIS.map((emoji, index) => (
            <button
              key={index}
              className="emoji-btn"
              onClick={() => {
                onSelectEmoji(emoji);
                onClose();
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default EmojiPicker;