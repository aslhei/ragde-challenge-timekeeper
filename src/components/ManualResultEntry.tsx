import { useState, useEffect } from 'react';
import { Person, RaceResult, Split } from '../types';
import { storage } from '../storage';
import { useAuth } from '../context/AuthContext';

interface ManualResultEntryProps {
  onResultSaved: () => void;
}

// Parse time string (MM:SS or HH:MM:SS) to milliseconds
function parseTimeToMs(timeString: string): number | null {
  const trimmed = timeString.trim();
  if (!trimmed) return null;

  // Remove any whitespace
  const parts = trimmed.split(':').map(p => p.trim());
  
  if (parts.length === 2) {
    // MM:SS format
    const minutes = parseInt(parts[0], 10);
    const seconds = parseFloat(parts[1]);
    if (isNaN(minutes) || isNaN(seconds) || minutes < 0 || seconds < 0) {
      return null;
    }
    return (minutes * 60 + seconds) * 1000;
  } else if (parts.length === 3) {
    // HH:MM:SS format
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2]);
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds) || hours < 0 || minutes < 0 || seconds < 0) {
      return null;
    }
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }
  
  return null;
}

export function ManualResultEntry({ onResultSaved }: ManualResultEntryProps) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [treadmillTime, setTreadmillTime] = useState('');
  const [skiErgTime, setSkiErgTime] = useState('');
  const [rowingTime, setRowingTime] = useState('');
  const [completionDate, setCompletionDate] = useState<string>(() => {
    // Default to today's date in YYYY-MM-DD format
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadPersons();
  }, []);

  // Reload persons when section is expanded
  useEffect(() => {
    if (isExpanded) {
      loadPersons();
      // Also set up periodic refresh while expanded
      const interval = setInterval(loadPersons, 1000);
      return () => clearInterval(interval);
    }
  }, [isExpanded]);

  const loadPersons = () => {
    setPersons(storage.getPersons());
  };

  const validateAndSave = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedPersonId) {
      newErrors.person = 'Please select a person';
    }

    const treadmillMs = parseTimeToMs(treadmillTime);
    const skiErgMs = parseTimeToMs(skiErgTime);
    const rowingMs = parseTimeToMs(rowingTime);

    if (!treadmillMs) {
      newErrors.treadmill = 'Invalid time format (use MM:SS or HH:MM:SS)';
    }
    if (!skiErgMs) {
      newErrors.skiErg = 'Invalid time format (use MM:SS or HH:MM:SS)';
    }
    if (!rowingMs) {
      newErrors.rowing = 'Invalid time format (use MM:SS or HH:MM:SS)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const selectedPerson = persons.find(p => p.id === selectedPersonId);
    if (!selectedPerson) {
      newErrors.person = 'Selected person not found';
      setErrors(newErrors);
      return;
    }

    // Create splits
    const splits: Split[] = [
      {
        discipline: 'treadmill',
        time: treadmillMs!,
        timestamp: new Date().toISOString(),
      },
      {
        discipline: 'skiErg',
        time: skiErgMs!,
        timestamp: new Date().toISOString(),
      },
      {
        discipline: 'rowing',
        time: rowingMs!,
        timestamp: new Date().toISOString(),
      },
    ];

    // Calculate total time
    const totalTime = splits.reduce((sum, split) => sum + split.time, 0);

    // Parse the date and set time to end of day (23:59:59) or use current time if today
    const selectedDate = new Date(completionDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    
    let completedAt: string;
    if (selectedDateOnly.getTime() === today.getTime()) {
      // If today, use current time
      completedAt = new Date().toISOString();
    } else {
      // If past date, set to end of that day
      selectedDate.setHours(23, 59, 59, 999);
      completedAt = selectedDate.toISOString();
    }

    // Create result
    const createdBy = user?.email || user?.uid || undefined;
    const result: RaceResult = {
      id: crypto.randomUUID(),
      personId: selectedPerson.id,
      personName: selectedPerson.name,
      splits,
      totalTime,
      completedAt,
      createdBy,
    };

    // Save result
    storage.saveResult(result);
    
    // Reset form
    setSelectedPersonId('');
    setTreadmillTime('');
    setSkiErgTime('');
    setRowingTime('');
    setCompletionDate(new Date().toISOString().split('T')[0]);
    setErrors({});
    
    // Notify parent
    onResultSaved();
  };

  return (
    <div className="manual-result-entry">
      <div className="manual-entry-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h2>Manual Result Entry</h2>
        <button className="collapse-toggle" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="manual-entry-form">
        <div className="form-group">
          <label htmlFor="person-select">Person</label>
          <select
            id="person-select"
            value={selectedPersonId}
            onChange={(e) => {
              setSelectedPersonId(e.target.value);
              setErrors({ ...errors, person: '' });
            }}
            className={errors.person ? 'error' : ''}
          >
            <option value="">Select a person</option>
            {persons.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
          {errors.person && <span className="error-message">{errors.person}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="treadmill-time">5000m Treadmill (MM:SS or HH:MM:SS)</label>
          <input
            id="treadmill-time"
            type="text"
            placeholder="e.g., 15:30 or 0:15:30"
            value={treadmillTime}
            onChange={(e) => {
              setTreadmillTime(e.target.value);
              setErrors({ ...errors, treadmill: '' });
            }}
            className={errors.treadmill ? 'error' : ''}
          />
          {errors.treadmill && <span className="error-message">{errors.treadmill}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="skierg-time">5000m SkiErg (MM:SS or HH:MM:SS)</label>
          <input
            id="skierg-time"
            type="text"
            placeholder="e.g., 18:45 or 0:18:45"
            value={skiErgTime}
            onChange={(e) => {
              setSkiErgTime(e.target.value);
              setErrors({ ...errors, skiErg: '' });
            }}
            className={errors.skiErg ? 'error' : ''}
          />
          {errors.skiErg && <span className="error-message">{errors.skiErg}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="rowing-time">2000m Rowing (MM:SS or HH:MM:SS)</label>
          <input
            id="rowing-time"
            type="text"
            placeholder="e.g., 7:30 or 0:07:30"
            value={rowingTime}
            onChange={(e) => {
              setRowingTime(e.target.value);
              setErrors({ ...errors, rowing: '' });
            }}
            className={errors.rowing ? 'error' : ''}
          />
          {errors.rowing && <span className="error-message">{errors.rowing}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="completion-date">Completion Date</label>
          <input
            id="completion-date"
            type="date"
            value={completionDate}
            onChange={(e) => {
              setCompletionDate(e.target.value);
            }}
          />
        </div>

        <button className="save-result-btn" onClick={validateAndSave}>
          Save Result
        </button>
        </div>
      )}
    </div>
  );
}

