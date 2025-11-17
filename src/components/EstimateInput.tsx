import { useState, useEffect } from 'react';
import { EstimatedSplits, Split } from '../types';

interface EstimateInputProps {
  onConfirm: (estimates: EstimatedSplits) => void;
  onCancel: () => void;
  personName: string;
  existingEstimates?: EstimatedSplits;
  completedSplits?: Split[];
}

// Convert milliseconds to MM:SS or HH:MM:SS format
function msToTimeString(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Parse time string (MM:SS or HH:MM:SS) to milliseconds
function parseTimeToMs(timeString: string): number | null {
  const trimmed = timeString.trim();
  if (!trimmed) return null;

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

export function EstimateInput({ onConfirm, onCancel, personName, existingEstimates, completedSplits = [] }: EstimateInputProps) {
  const [treadmillEst, setTreadmillEst] = useState('');
  const [skiErgEst, setSkiErgEst] = useState('');
  const [rowingEst, setRowingEst] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-populate with existing estimates
  useEffect(() => {
    if (existingEstimates) {
      if (existingEstimates.treadmill && !completedSplits.find(s => s.discipline === 'treadmill')) {
        setTreadmillEst(msToTimeString(existingEstimates.treadmill));
      }
      if (existingEstimates.skiErg && !completedSplits.find(s => s.discipline === 'skiErg')) {
        setSkiErgEst(msToTimeString(existingEstimates.skiErg));
      }
      if (existingEstimates.rowing && !completedSplits.find(s => s.discipline === 'rowing')) {
        setRowingEst(msToTimeString(existingEstimates.rowing));
      }
    }
  }, [existingEstimates, completedSplits]);

  const isTreadmillCompleted = completedSplits.some(s => s.discipline === 'treadmill');
  const isSkiErgCompleted = completedSplits.some(s => s.discipline === 'skiErg');
  const isRowingCompleted = completedSplits.some(s => s.discipline === 'rowing');

  const handleConfirm = () => {
    const newErrors: Record<string, string> = {};
    const estimates: EstimatedSplits = { ...existingEstimates }; // Start with existing estimates

    // Only update estimates for fields that were changed and are not completed
    if (!isTreadmillCompleted && treadmillEst.trim()) {
      const ms = parseTimeToMs(treadmillEst);
      if (ms) {
        estimates.treadmill = ms;
      } else {
        newErrors.treadmill = 'Invalid time format';
      }
    } else if (!isTreadmillCompleted && !treadmillEst.trim() && existingEstimates?.treadmill) {
      // If field is cleared, remove the estimate
      delete estimates.treadmill;
    }

    if (!isSkiErgCompleted && skiErgEst.trim()) {
      const ms = parseTimeToMs(skiErgEst);
      if (ms) {
        estimates.skiErg = ms;
      } else {
        newErrors.skiErg = 'Invalid time format';
      }
    } else if (!isSkiErgCompleted && !skiErgEst.trim() && existingEstimates?.skiErg) {
      delete estimates.skiErg;
    }

    if (!isRowingCompleted && rowingEst.trim()) {
      const ms = parseTimeToMs(rowingEst);
      if (ms) {
        estimates.rowing = ms;
      } else {
        newErrors.rowing = 'Invalid time format';
      }
    } else if (!isRowingCompleted && !rowingEst.trim() && existingEstimates?.rowing) {
      delete estimates.rowing;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Recalculate total if we have all three splits
    if (estimates.treadmill && estimates.skiErg && estimates.rowing) {
      estimates.total = estimates.treadmill + estimates.skiErg + estimates.rowing;
    } else if (existingEstimates?.total) {
      // If we had a total before but don't have all splits now, remove total
      delete estimates.total;
    }

    onConfirm(estimates);
  };

  return (
    <div className="estimate-input-overlay">
      <div className="estimate-input-modal">
        <h3>Enter Estimated Splits for {personName}</h3>
        <p className="estimate-help">Leave fields empty to skip estimation. Format: MM:SS or HH:MM:SS</p>
        
        <div className="estimate-form">
          <div className="form-group">
            <label htmlFor="treadmill-est">
              5000m Treadmill (optional)
              {isTreadmillCompleted && <span className="completed-badge">Completed</span>}
            </label>
            <input
              id="treadmill-est"
              type="text"
              placeholder="e.g., 15:30"
              value={treadmillEst}
              onChange={(e) => {
                setTreadmillEst(e.target.value);
                setErrors({ ...errors, treadmill: '' });
              }}
              className={errors.treadmill ? 'error' : ''}
              disabled={isTreadmillCompleted}
            />
            {errors.treadmill && <span className="error-message">{errors.treadmill}</span>}
            {isTreadmillCompleted && <span className="disabled-hint">This split is already completed</span>}
          </div>

          <div className="form-group">
            <label htmlFor="skierg-est">
              5000m SkiErg (optional)
              {isSkiErgCompleted && <span className="completed-badge">Completed</span>}
            </label>
            <input
              id="skierg-est"
              type="text"
              placeholder="e.g., 18:45"
              value={skiErgEst}
              onChange={(e) => {
                setSkiErgEst(e.target.value);
                setErrors({ ...errors, skiErg: '' });
              }}
              className={errors.skiErg ? 'error' : ''}
              disabled={isSkiErgCompleted}
            />
            {errors.skiErg && <span className="error-message">{errors.skiErg}</span>}
            {isSkiErgCompleted && <span className="disabled-hint">This split is already completed</span>}
          </div>

          <div className="form-group">
            <label htmlFor="rowing-est">
              2000m Rowing (optional)
              {isRowingCompleted && <span className="completed-badge">Completed</span>}
            </label>
            <input
              id="rowing-est"
              type="text"
              placeholder="e.g., 7:30"
              value={rowingEst}
              onChange={(e) => {
                setRowingEst(e.target.value);
                setErrors({ ...errors, rowing: '' });
              }}
              className={errors.rowing ? 'error' : ''}
              disabled={isRowingCompleted}
            />
            {errors.rowing && <span className="error-message">{errors.rowing}</span>}
            {isRowingCompleted && <span className="disabled-hint">This split is already completed</span>}
          </div>
        </div>

        <div className="estimate-actions">
          <button className="cancel-btn" onClick={onCancel}>
            Skip
          </button>
          <button className="confirm-btn" onClick={handleConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

