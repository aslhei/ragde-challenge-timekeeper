import { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Person, ActiveRace, EstimatedSplits } from '../types';
import { RaceTimer } from './RaceTimer';
import { db } from '../firebase';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface ActiveRacesManagerProps {
  onRaceComplete: () => void;
  onActiveRacesChange?: (races: ActiveRace[]) => void;
}

export interface ActiveRacesManagerRef {
  startRace: (person: Person, estimatedSplits?: EstimatedSplits) => void;
}

export const ActiveRacesManager = forwardRef<ActiveRacesManagerRef, ActiveRacesManagerProps>(
  ({ onRaceComplete, onActiveRacesChange }, ref) => {
    const [activeRaces, setActiveRaces] = useState<ActiveRace[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const { user, isAdmin } = useAuth();

    // Subscribe to active races in Firestore so all clients share the same view
    useEffect(() => {
      const racesRef = collection(db, 'activeRaces');
      const q = query(racesRef, orderBy('startTime', 'asc'));
      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const races: ActiveRace[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ActiveRace, 'id'>),
          }));
          setActiveRaces(races);
        },
        (error) => {
          console.error('Error in active races Firestore listener:', error);
        }
      );

      return () => unsubscribe();
    }, []);

    // Notify parent of active races changes
    useEffect(() => {
      if (onActiveRacesChange) {
        onActiveRacesChange(activeRaces);
      }
    }, [activeRaces, onActiveRacesChange]);

    useImperativeHandle(ref, () => ({
      startRace: (person: Person, estimatedSplits?: EstimatedSplits) => {
        setActiveRaces((currentRaces) => {
          // Check if person already has an active race
          if (currentRaces.some(r => r.person.id === person.id)) {
            alert(`${person.name} already has an active race!`);
            return currentRaces;
          }

          const createdBy = user?.email || user?.uid || undefined;
          const newRace: ActiveRace = {
            id: crypto.randomUUID(),
            person,
            startTime: Date.now(),
            splits: [],
            currentDisciplineIndex: 0,
            estimatedSplits,
            createdBy,
          };

          const racesRef = collection(db, 'activeRaces');
          const ref = doc(racesRef, newRace.id);
          void setDoc(ref, {
            person: newRace.person,
            startTime: newRace.startTime,
            splits: newRace.splits,
            currentDisciplineIndex: newRace.currentDisciplineIndex,
            estimatedSplits: newRace.estimatedSplits ?? null,
            createdBy: newRace.createdBy ?? null,
          });

          // Local state will be updated by Firestore snapshot
          return currentRaces;
        });
      },
    }));

    const removeRace = (raceId: string) => {
      const race = activeRaces.find(r => r.id === raceId);
      const currentUserId = user?.email || user?.uid;
      
      // Check permissions: Admins can delete any race, users can only delete their own
      if (!isAdmin && race?.createdBy && race.createdBy !== currentUserId) {
        alert('You can only delete races that you started.');
        return;
      }
      
      const ref = doc(db, 'activeRaces', raceId);
      void deleteDoc(ref);
    };

    const handleRaceComplete = (raceId: string) => {
      removeRace(raceId);
      onRaceComplete();
    };

    if (activeRaces.length === 0) {
      return (
        <div className="active-races-manager">
          <div className="active-races-header" onClick={() => setIsExpanded(!isExpanded)}>
            <h2>Active Races</h2>
            <button className="collapse-toggle" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
              {isExpanded ? '▼' : '▶'}
            </button>
          </div>
          {isExpanded && (
            <p className="no-races">No active races. Start a race from the Person Management section.</p>
          )}
        </div>
      );
    }

    return (
      <div className="active-races-manager">
        <div className="active-races-header" onClick={() => setIsExpanded(!isExpanded)}>
          <h2>Active Races ({activeRaces.length})</h2>
          <button className="collapse-toggle" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
        {isExpanded && (
        <div className="races-grid">
          {activeRaces.map((race) => {
            const currentUserId = user?.email || user?.uid;
            const canModify = isAdmin || (!!race.createdBy && race.createdBy === currentUserId);
            
            return (
              <RaceTimer
                key={race.id}
                raceId={race.id}
                person={race.person}
                initialStartTime={race.startTime}
                initialSplits={race.splits}
                initialDisciplineIndex={race.currentDisciplineIndex}
                onRaceComplete={() => handleRaceComplete(race.id)}
                estimatedSplits={race.estimatedSplits}
                canModify={canModify}
                raceCreatedBy={race.createdBy}
                onUpdate={(splits, disciplineIndex) => {
                  const ref = doc(db, 'activeRaces', race.id);
                  void setDoc(ref, { splits, currentDisciplineIndex: disciplineIndex }, { merge: true });
                }}
                onUpdateEstimates={(estimatedSplits) => {
                  const ref = doc(db, 'activeRaces', race.id);
                  void setDoc(ref, { estimatedSplits }, { merge: true });
                }}
              />
            );
          })}
        </div>
        )}
      </div>
    );
  }
);

ActiveRacesManager.displayName = 'ActiveRacesManager';

