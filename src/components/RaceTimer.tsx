import { useState, useEffect, useRef } from 'react';
import { Person, Split, RaceResult, EstimatedSplits } from '../types';
import { storage } from '../storage';
import { formatTimeMS, formatTimeTimer } from '../utils/timeFormat';
import { EstimateInput } from './EstimateInput';
import { useAuth } from '../context/AuthContext';

interface RaceTimerProps {
  raceId: string;
  person: Person;
  initialStartTime: number;
  initialSplits: Split[];
  initialDisciplineIndex: number;
  estimatedSplits?: EstimatedSplits;
  onRaceComplete: () => void;
  onUpdate?: (splits: Split[], disciplineIndex: number) => void;
  onUpdateEstimates?: (estimatedSplits: EstimatedSplits) => void;
  canModify?: boolean; // Can this user modify this race?
  raceCreatedBy?: string; // Who created this race (for tracking)
}

const DISCIPLINES = [
  { key: 'treadmill' as const, name: '5000m Treadmill (10% incline)', distance: '5000m' },
  { key: 'skiErg' as const, name: '5000m SkiErg', distance: '5000m' },
  { key: 'rowing' as const, name: '2000m Rowing', distance: '2000m' },
];

export function RaceTimer({
  raceId,
  person,
  initialStartTime,
  initialSplits,
  initialDisciplineIndex,
  estimatedSplits: initialEstimatedSplits,
  onRaceComplete,
  onUpdate,
  onUpdateEstimates,
  canModify = false,
  raceCreatedBy,
}: RaceTimerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [splits, setSplits] = useState<Split[]>(initialSplits);
  const [currentDisciplineIndex, setCurrentDisciplineIndex] = useState(initialDisciplineIndex);
  const [estimatedSplits, setEstimatedSplits] = useState<EstimatedSplits | undefined>(initialEstimatedSplits);
  const [showEstimateEdit, setShowEstimateEdit] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(initialStartTime);
  const { user } = useAuth();

  // Keep local state in sync with upstream Firestore-backed props
  useEffect(() => {
    setSplits(initialSplits);
  }, [initialSplits]);

  useEffect(() => {
    setCurrentDisciplineIndex(initialDisciplineIndex);
  }, [initialDisciplineIndex]);

  useEffect(() => {
    setEstimatedSplits(initialEstimatedSplits);
  }, [initialEstimatedSplits]);

  useEffect(() => {
    // Always run the timer since the race is already started
    intervalRef.current = window.setInterval(() => {
      setCurrentTime(Date.now() - startTimeRef.current);
    }, 10);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleSplit = () => {
    const discipline = DISCIPLINES[currentDisciplineIndex].key;
    const splitTime = Date.now() - startTimeRef.current - splits.reduce((sum, s) => sum + s.time, 0);
    
    const split: Split = {
      discipline,
      time: splitTime,
      timestamp: new Date().toISOString(),
    };

    const newSplits = [...splits, split];
    const newDisciplineIndex = currentDisciplineIndex + 1;
    
    setSplits(newSplits);
    setCurrentDisciplineIndex(newDisciplineIndex);

    // Notify parent of update
    if (onUpdate) {
      onUpdate(newSplits, newDisciplineIndex);
    }

    if (newDisciplineIndex >= DISCIPLINES.length) {
      // Race complete
      handleComplete(newSplits);
    }
  };

  const handleEstimateConfirm = (newEstimates: EstimatedSplits) => {
    // Merge with existing estimates to preserve unchanged values
    const mergedEstimates: EstimatedSplits = {
      ...estimatedSplits,
      ...newEstimates,
    };
    
    // Recalculate total if we have all three splits
    if (mergedEstimates.treadmill && mergedEstimates.skiErg && mergedEstimates.rowing) {
      mergedEstimates.total = mergedEstimates.treadmill + mergedEstimates.skiErg + mergedEstimates.rowing;
    }
    
    setEstimatedSplits(mergedEstimates);
    if (onUpdateEstimates) {
      onUpdateEstimates(mergedEstimates);
    }
    setShowEstimateEdit(false);
  };

  const getEstimateComparison = (discipline: 'treadmill' | 'skiErg' | 'rowing'): { ahead: boolean; diff: number } | null => {
    if (!estimatedSplits) return null;
    
    const estimatedTime = estimatedSplits[discipline];
    if (!estimatedTime) return null;

    const actualSplit = splits.find(s => s.discipline === discipline);
    if (!actualSplit) return null;

    const diff = actualSplit.time - estimatedTime;
    return {
      ahead: diff < 0, // Negative means faster (ahead)
      diff: Math.abs(diff),
    };
  };

  const getTotalEstimateComparison = (): { ahead: boolean; diff: number } | null => {
    if (!estimatedSplits) return null;
    
    // Calculate adjusted estimated total: use actual splits when available, estimates otherwise
    const treadmillTime = splits.find(s => s.discipline === 'treadmill')?.time || estimatedSplits.treadmill || 0;
    const skiErgTime = splits.find(s => s.discipline === 'skiErg')?.time || estimatedSplits.skiErg || 0;
    const rowingTime = splits.find(s => s.discipline === 'rowing')?.time || estimatedSplits.rowing || 0;
    
    const adjustedEstimatedTotal = treadmillTime + skiErgTime + rowingTime;
    if (adjustedEstimatedTotal === 0) return null;
    
    const elapsedTime = currentTime;
    const estimatedElapsed = adjustedEstimatedTotal;
    
    const diff = elapsedTime - estimatedElapsed;
    return {
      ahead: diff < 0,
      diff: Math.abs(diff),
    };
  };

  const getNextSplitComparison = (): { ahead: boolean; diff: number; discipline: string } | null => {
    if (!estimatedSplits) return null;
    
    // Check if race is complete
    if (currentDisciplineIndex >= DISCIPLINES.length) return null;
    
    const currentDiscipline = DISCIPLINES[currentDisciplineIndex];
    const estimatedTime = estimatedSplits[currentDiscipline.key];
    if (!estimatedTime) return null;

    // Calculate elapsed time for current discipline
    const completedSplitsTime = splits.reduce((sum, s) => sum + s.time, 0);
    const currentDisciplineElapsed = currentTime - completedSplitsTime;
    
    const diff = currentDisciplineElapsed - estimatedTime;
    return {
      ahead: diff < 0, // Negative means faster (ahead)
      diff: Math.abs(diff),
      discipline: currentDiscipline.name,
    };
  };

  const handleComplete = (finalSplits: Split[]) => {
    const totalTime = Date.now() - startTimeRef.current;
    
    // Use the race creator as createdBy, or fall back to current user if completing
    const createdBy = raceCreatedBy || user?.email || user?.uid || undefined;

    const result: RaceResult = {
      id: raceId,
      personId: person.id,
      personName: person.name,
      splits: finalSplits,
      totalTime,
      completedAt: new Date().toISOString(),
      createdBy,
    };

    storage.saveResult(result);
    onRaceComplete();
  };

  const handleStop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onRaceComplete();
  };

  const currentDiscipline = DISCIPLINES[currentDisciplineIndex];
  const isComplete = currentDisciplineIndex >= DISCIPLINES.length;
  const totalComparison = getTotalEstimateComparison();
  const nextSplitComparison = getNextSplitComparison();

  return (
    <>
      {showEstimateEdit && (
        <EstimateInput
          personName={person.name}
          onConfirm={handleEstimateConfirm}
          onCancel={() => setShowEstimateEdit(false)}
          existingEstimates={estimatedSplits}
          completedSplits={splits}
        />
      )}
      <div className="race-timer-card">
        <div className="timer-header">
          <h3>{person.name}</h3>
          <div className="timer-header-actions">
            {estimatedSplits && canModify && (
              <button 
                className="edit-estimate-btn" 
                onClick={() => setShowEstimateEdit(true)}
                title="Edit estimates"
              >
                ✏️
              </button>
            )}
            {canModify && (
              <button className="stop-btn" onClick={handleStop} title="Stop race">
                ×
              </button>
            )}
          </div>
        </div>
        
        <div className="timer-display">
          <div className="time">{formatTimeTimer(currentTime)}</div>
          {nextSplitComparison && (
            <div className={`next-split-comparison ${nextSplitComparison.ahead ? 'ahead' : 'behind'}`}>
              {nextSplitComparison.ahead ? '⬆ Ahead' : '⬇ Behind'} {formatTimeMS(nextSplitComparison.diff)} on {nextSplitComparison.discipline}
            </div>
          )}
          {totalComparison && (
            <div className={`estimate-comparison ${totalComparison.ahead ? 'ahead' : 'behind'}`}>
              {totalComparison.ahead ? '⬆ Ahead' : '⬇ Behind'} {formatTimeMS(totalComparison.diff)} total
            </div>
          )}
          <div className="current-discipline">
            {isComplete ? (
              <span className="complete">Race Complete!</span>
            ) : (
              <span>{currentDiscipline.name}</span>
            )}
          </div>
        </div>

        <div className="timer-controls">
          {!isComplete && canModify && (
            <button className="split-btn" onClick={handleSplit}>
              Take Split ({currentDiscipline.distance})
            </button>
          )}
          {!estimatedSplits && canModify && (
            <button className="add-estimate-btn" onClick={() => setShowEstimateEdit(true)}>
              Add Estimate
            </button>
          )}
        </div>

        {splits.length > 0 && (
          <div className="splits">
            <h4>Splits</h4>
            <div className="splits-list">
              {splits.map((split, index) => {
                const comparison = getEstimateComparison(split.discipline);
                return (
                  <div key={index} className="split-item">
                    <span className="discipline">
                      {DISCIPLINES.find(d => d.key === split.discipline)?.name}
                    </span>
                    <div className="split-time-comparison">
                      <span className="time">{formatTimeTimer(split.time)}</span>
                      {comparison && (
                        <span className={`split-estimate-indicator ${comparison.ahead ? 'ahead' : 'behind'}`}>
                          {comparison.ahead ? '⬆' : '⬇'} {formatTimeMS(comparison.diff)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

