import { useState, useEffect } from 'react';
import { Person, RaceResult } from '../types';
import { storage } from '../storage';
import { formatTimeHMS } from '../utils/timeFormat';
import { useAuth } from '../context/AuthContext';

export function PersonBrowser() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personResults, setPersonResults] = useState<RaceResult[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    loadPersons();
    // Refresh persons periodically
    const interval = setInterval(loadPersons, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedPerson) {
      loadPersonResults(selectedPerson.id);
      // Refresh results periodically
      const interval = setInterval(() => loadPersonResults(selectedPerson.id), 2000);
      return () => clearInterval(interval);
    } else {
      setPersonResults([]);
    }
  }, [selectedPerson]);

  const loadPersons = () => {
    const updatedPersons = storage.getPersons();
    setPersons(updatedPersons);
    
    // Preserve selected person if it still exists (using functional update to avoid stale closure)
    setSelectedPerson(prevSelected => {
      if (prevSelected) {
        const stillExists = updatedPersons.find(p => p.id === prevSelected.id);
        return stillExists || null;
      }
      return prevSelected;
    });
  };

  const loadPersonResults = (personId: string) => {
    const results = storage.getResultsByPerson(personId);
    // Sort by completion date, newest first
    results.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    setPersonResults(results);
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
      if (selectedPerson?.id === person.id) {
        setSelectedPerson(null);
      }
    }
  };

  const filteredPersons = persons.filter(person =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="person-browser">
      <div className="person-browser-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h2>Person Browser</h2>
        <button className="collapse-toggle" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>
      
      {isExpanded && (
        <>
      <div className="search-section">
        <input
          type="text"
          placeholder="Search persons..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="person-browser-content">
        <div className="person-list-section">
          <h3>Persons ({filteredPersons.length})</h3>
          {filteredPersons.length === 0 ? (
            <p className="no-results">
              {searchTerm ? 'No persons found matching your search.' : 'No persons created yet.'}
            </p>
          ) : (
            <div className="person-list-items">
              {filteredPersons.map((person) => {
                const resultCount = storage.getResultsByPerson(person.id).length;
                return (
                  <div
                    key={person.id}
                    className={`person-item ${selectedPerson?.id === person.id ? 'selected' : ''}`}
                    onClick={() => setSelectedPerson(person)}
                  >
                    <div className="person-item-content">
                      <div className="person-info">
                        <span className="person-name">{person.name}</span>
                        <span className="person-result-count">{resultCount} result{resultCount !== 1 ? 's' : ''}</span>
                      </div>
                      {isAdmin && (
                        <button
                          className="delete-btn"
                          onClick={(e) => handleDeletePerson(person, e)}
                          title="Delete person"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedPerson && (
          <div className="person-results-section">
            <h3>{selectedPerson.name}'s Results</h3>
            {personResults.length === 0 ? (
              <p className="no-results">No race results for this person yet.</p>
            ) : (
              <div className="person-results-list">
                {personResults.map((result) => {
                  const treadmillSplit = result.splits.find(s => s.discipline === 'treadmill');
                  const skiErgSplit = result.splits.find(s => s.discipline === 'skiErg');
                  const rowingSplit = result.splits.find(s => s.discipline === 'rowing');
                  
                  return (
                    <div key={result.id} className="person-result-item">
                      <div className="result-header">
                        <span className="result-date">
                          {new Date(result.completedAt).toLocaleDateString()}
                        </span>
                        <span className="result-total-time">{formatTimeHMS(result.totalTime)}</span>
                      </div>
                      <div className="result-splits">
                        <div className="split-info">
                          <span className="split-label">Treadmill:</span>
                          <span>{treadmillSplit ? formatTimeHMS(treadmillSplit.time) : '-'}</span>
                        </div>
                        <div className="split-info">
                          <span className="split-label">SkiErg:</span>
                          <span>{skiErgSplit ? formatTimeHMS(skiErgSplit.time) : '-'}</span>
                        </div>
                        <div className="split-info">
                          <span className="split-label">Rowing:</span>
                          <span>{rowingSplit ? formatTimeHMS(rowingSplit.time) : '-'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}

