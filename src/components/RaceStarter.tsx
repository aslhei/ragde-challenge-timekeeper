import { useState, useEffect } from 'react';
import { Person, EstimatedSplits } from '../types';
import { storage } from '../storage';
import { EstimateInput } from './EstimateInput';

interface RaceStarterProps {
  onStartRace: (person: Person, estimatedSplits?: EstimatedSplits) => void;
}

export function RaceStarter({ onStartRace }: RaceStarterProps) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersons, setSelectedPersons] = useState<Set<string>>(new Set());
  const [showEstimateFor, setShowEstimateFor] = useState<Person | null>(null);
  const [pendingStart, setPendingStart] = useState<{ person: Person; withEstimate: boolean } | null>(null);
  const [massStartEstimates, setMassStartEstimates] = useState<Map<string, EstimatedSplits>>(new Map());
  const [massStartQueue, setMassStartQueue] = useState<Person[]>([]);
  const [currentMassStartPerson, setCurrentMassStartPerson] = useState<Person | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadPersons();
    // Refresh persons periodically
    const interval = setInterval(loadPersons, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadPersons = () => {
    setPersons(storage.getPersons());
  };

  const filteredPersons = persons.filter(person =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const togglePersonSelection = (personId: string) => {
    setSelectedPersons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(personId)) {
        newSet.delete(personId);
      } else {
        newSet.add(personId);
      }
      return newSet;
    });
  };

  const handleStartSingleRace = (person: Person, withEstimate: boolean = false) => {
    if (withEstimate) {
      setShowEstimateFor(person);
      setPendingStart({ person, withEstimate: true });
    } else {
      onStartRace(person);
    }
  };

  const handleEstimateConfirm = (estimates: EstimatedSplits) => {
    if (pendingStart?.person) {
      onStartRace(pendingStart.person, estimates);
      setPendingStart(null);
      setShowEstimateFor(null);
    }
  };

  const handleEstimateCancel = () => {
    if (pendingStart?.person && !pendingStart.withEstimate) {
      // Start without estimate
      onStartRace(pendingStart.person);
    }
    setPendingStart(null);
    setShowEstimateFor(null);
  };

  const handleMassStart = () => {
    if (selectedPersons.size === 0) {
      alert('Please select at least one person for mass start');
      return;
    }

    const selectedPersonList = Array.from(selectedPersons)
      .map(id => persons.find(p => p.id === id))
      .filter((p): p is Person => p !== undefined);

    selectedPersonList.forEach(person => {
      onStartRace(person);
    });

    // Clear selection after starting
    setSelectedPersons(new Set());
  };

  const handleMassStartWithEstimates = () => {
    if (selectedPersons.size === 0) {
      alert('Please select at least one person for mass start');
      return;
    }

    const selectedPersonList = Array.from(selectedPersons)
      .map(id => persons.find(p => p.id === id))
      .filter((p): p is Person => p !== undefined);

    // Start collecting estimates for each person
    setMassStartEstimates(new Map());
    setMassStartQueue(selectedPersonList);
    if (selectedPersonList.length > 0) {
      setCurrentMassStartPerson(selectedPersonList[0]);
    }
  };

  const handleMassEstimateConfirm = (estimates: EstimatedSplits) => {
    if (currentMassStartPerson) {
      // Store estimates for current person
      const newEstimates = new Map(massStartEstimates);
      newEstimates.set(currentMassStartPerson.id, estimates);
      setMassStartEstimates(newEstimates);

      // Move to next person in queue
      const remainingQueue = massStartQueue.slice(1);
      setMassStartQueue(remainingQueue);

      if (remainingQueue.length > 0) {
        // Show estimate input for next person
        setCurrentMassStartPerson(remainingQueue[0]);
      } else {
        // All estimates collected, start all races
        const allSelectedPersons = Array.from(selectedPersons)
          .map(id => persons.find(p => p.id === id))
          .filter((p): p is Person => p !== undefined);

        allSelectedPersons.forEach(person => {
          const personEstimates = newEstimates.get(person.id);
          onStartRace(person, personEstimates);
        });

        // Clean up
        setCurrentMassStartPerson(null);
        setMassStartQueue([]);
        setMassStartEstimates(new Map());
        setSelectedPersons(new Set());
      }
    }
  };

  const handleMassEstimateCancel = () => {
    if (currentMassStartPerson) {
      // Skip estimates for current person, move to next
      const remainingQueue = massStartQueue.slice(1);
      setMassStartQueue(remainingQueue);

      if (remainingQueue.length > 0) {
        setCurrentMassStartPerson(remainingQueue[0]);
      } else {
        // All done, start races with collected estimates
        const allSelectedPersons = Array.from(selectedPersons)
          .map(id => persons.find(p => p.id === id))
          .filter((p): p is Person => p !== undefined);

        allSelectedPersons.forEach(person => {
          const personEstimates = massStartEstimates.get(person.id);
          onStartRace(person, personEstimates);
        });

        // Clean up
        setCurrentMassStartPerson(null);
        setMassStartQueue([]);
        setMassStartEstimates(new Map());
        setSelectedPersons(new Set());
      }
    }
  };

  return (
    <>
      {showEstimateFor && (
        <EstimateInput
          personName={showEstimateFor.name}
          onConfirm={handleEstimateConfirm}
          onCancel={handleEstimateCancel}
        />
      )}
      {currentMassStartPerson && (
        <EstimateInput
          personName={`${currentMassStartPerson.name} (${massStartQueue.length - 1} remaining after this)`}
          onConfirm={handleMassEstimateConfirm}
          onCancel={handleMassEstimateCancel}
        />
      )}
      <div className="race-starter">
        <div className="race-starter-header" onClick={() => setIsExpanded(!isExpanded)}>
          <h2>Start Race</h2>
          <button className="collapse-toggle" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      
      {isExpanded && (
        <>
      <div className="search-section">
        <input
          type="text"
          placeholder="Search persons to start race..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {selectedPersons.size > 0 && (
        <div className="mass-start-controls">
          <div className="mass-start-info">
            {selectedPersons.size} person{selectedPersons.size !== 1 ? 's' : ''} selected for mass start
          </div>
          <div className="mass-start-buttons">
            <button className="mass-start-btn" onClick={handleMassStart}>
              Start All Selected
            </button>
            <button className="mass-start-with-estimate-btn" onClick={handleMassStartWithEstimates}>
              Start All w/ Estimates
            </button>
          </div>
        </div>
      )}

      <div className="race-starter-person-list">
        {filteredPersons.length === 0 ? (
          <p className="no-results">
            {searchTerm ? 'No persons found matching your search.' : 'No persons created yet.'}
          </p>
        ) : (
          filteredPersons.map((person) => {
            const isSelected = selectedPersons.has(person.id);
            return (
              <div key={person.id} className="race-starter-person-item">
                <div className="race-starter-person-content">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => togglePersonSelection(person.id)}
                    />
                    <span className="person-name">{person.name}</span>
                  </label>
                  <div className="start-race-buttons">
                    <button
                      className="start-race-btn-small"
                      onClick={() => handleStartSingleRace(person, false)}
                    >
                      Start Now
                    </button>
                    <button
                      className="start-with-estimate-btn"
                      onClick={() => handleStartSingleRace(person, true)}
                      title="Start with estimated splits"
                    >
                      Start w/ Estimate
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
        </>
      )}
      </div>
    </>
  );
}

