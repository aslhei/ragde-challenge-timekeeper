import { useState } from 'react';
import { storage } from '../storage';
import { useAuth } from '../context/AuthContext';

interface AddPersonProps {
  onPersonAdded: () => void;
}

export function AddPerson({ onPersonAdded }: AddPersonProps) {
  const [newPersonName, setNewPersonName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();

  const handleCreatePerson = () => {
    if (newPersonName.trim()) {
      const createdBy = user?.email || user?.uid || undefined;
      storage.createPerson(newPersonName.trim(), createdBy);
      setNewPersonName('');
      onPersonAdded();
    }
  };

  return (
    <div className="add-person">
      <div className="add-person-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h2>Add Person</h2>
        <button className="collapse-toggle" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>
      {isExpanded && (
      <div className="create-person">
        <input
          type="text"
          placeholder="Enter person name"
          value={newPersonName}
          onChange={(e) => setNewPersonName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleCreatePerson()}
        />
        <button onClick={handleCreatePerson}>Create Person</button>
      </div>
      )}
    </div>
  );
}

