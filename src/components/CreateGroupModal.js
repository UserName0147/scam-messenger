import React, { useState } from 'react';

const CreateGroupModal = ({ contacts, onCreate, onClose }) => {
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const toggleMember = (id) => {
    setSelectedMembers(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedMembers.length > 0) {
      onCreate(groupName, selectedMembers);
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal">
        <div className="modal-header">
          <h3>Создать группу</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Название группы"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="group-name-input"
            autoFocus
          />
          <div className="modal-subtitle">Выберите участников:</div>
          <div className="member-list">
            {contacts.map(contact => (
              <label key={contact.id} className="member-item">
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(contact.id)}
                  onChange={() => toggleMember(contact.id)}
                />
                <span className="member-avatar" style={{ backgroundColor: getAvatarColor(contact.name) }}>
                  {contact.name.charAt(0)}
                </span>
                <span className="member-name">{contact.name}</span>
              </label>
            ))}
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Отмена</button>
            <button type="submit" disabled={selectedMembers.length === 0}>
              Создать
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

const getAvatarColor = (name) => {
  const colors = ['#e94560', '#4a90e2', '#50c878', '#f5a623', '#9b59b6', '#1abc9c'];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export default CreateGroupModal;