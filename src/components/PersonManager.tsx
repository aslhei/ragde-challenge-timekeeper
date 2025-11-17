import { useState, useEffect } from 'react';
import { Person } from '../types';
import { storage } from '../storage';

interface PersonManagerProps {
  onStartRace: (person: Person) => void;
}

export function PersonManager({ onStartRace }: PersonManagerProps) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [newPersonName, setNewPersonName] = useState('');

  useEffect(() => {
    loadPersons();
  }, []);

  const loadPersons = () => {
    setPersons(storage.getPersons());
  };

  const handleCreatePerson = () => {
    if (newPersonName.trim()) {
      storage.createPerson(newPersonName.trim());
      setNewPersonName('');
      loadPersons();
    }
  };

  const handleStartRace = (person: Person) => {
    onStartRace(person);
  };

  const handleDeletePerson = (person: Person, event: React.MouseEvent) => {
    event.stopPropagation();
    const hasResults = storage.getResultsByPerson(person.id).length > 0;
    const message = hasResults
      ? `Delete ${person.name}? This will remove the person but keep their race results.`
      : `Delete ${person.name}?`;
    
    if (window.confirm(message)) {
      storage.deletePerson(person.id);
      loadPersons();
    }
  };

  return (
    <div className="person-manager">
      <h2>Person Management</h2>
      
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

      <div className="person-list">
        <h3>Persons</h3>
        {persons.length === 0 ? (
          <p>No persons created yet. Create one above to get started.</p>
        ) : (
          <div className="person-list-items">
            {persons.map((person) => (
              <div key={person.id} className="person-item">
                <div className="person-item-content">
                  <span className="person-name">{person.name}</span>
                  <div className="person-actions">
                    <button
                      className="start-race-btn-small"
                      onClick={() => handleStartRace(person)}
                    >
                      Start Race
                    </button>
                    <button
                      className="delete-btn"
                      onClick={(e) => handleDeletePerson(person, e)}
                      title="Delete person"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

