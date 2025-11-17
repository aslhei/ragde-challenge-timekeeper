import { useEffect, useState, useMemo } from 'react';
import { RaceResult, ActiveRace } from '../types';
import { storage } from '../storage';
import { formatTimeHMS, formatTreadmillPace, formatPacePer500m, formatRowingPace, calculateTreadmillPace, calculateSkiErgPace, calculateRowingPace } from '../utils/timeFormat';

type ViewMode = 'simple' | 'splits' | 'detailed';
type SortField = 'total' | 'treadmill' | 'skiErg' | 'rowing';
type SortDirection = 'asc' | 'desc';

interface LeaderboardProps {
  activeRaces?: ActiveRace[];
}

export function Leaderboard({ activeRaces = [] }: LeaderboardProps) {
  const [results, setResults] = useState<RaceResult[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('splits');
  const [sortField, setSortField] = useState<SortField>('total');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = () => {
    setResults(storage.getResults());
  };

  // Calculate pace statistics for color coding (only from completed results)
  const paceStats = useMemo(() => {
    const treadmillPaces: number[] = [];
    const skiErgPaces: number[] = [];
    const rowingPaces: number[] = [];

    results.forEach(result => {
      const treadmillSplit = result.splits.find(s => s.discipline === 'treadmill');
      const skiErgSplit = result.splits.find(s => s.discipline === 'skiErg');
      const rowingSplit = result.splits.find(s => s.discipline === 'rowing');

      if (treadmillSplit) {
        treadmillPaces.push(calculateTreadmillPace(treadmillSplit.time));
      }
      if (skiErgSplit) {
        skiErgPaces.push(calculateSkiErgPace(skiErgSplit.time));
      }
      if (rowingSplit) {
        rowingPaces.push(calculateRowingPace(rowingSplit.time));
      }
    });

    const getStats = (values: number[]) => {
      if (values.length === 0) return { min: 0, max: 0 };
      const sorted = [...values].sort((a, b) => a - b);
      return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
      };
    };

    return {
      treadmill: getStats(treadmillPaces), // Higher is better (km/h)
      skiErg: getStats(skiErgPaces), // Lower is better (time per 500m)
      rowing: getStats(rowingPaces), // Lower is better (time per 500m)
    };
  }, [results]);

  // Get color for pace based on percentile
  const getPaceColor = (pace: number, discipline: 'treadmill' | 'skiErg' | 'rowing'): string => {
    const stats = paceStats[discipline];
    if (stats.min === stats.max || stats.min === 0) return '';

    let percentile: number;
    if (discipline === 'treadmill') {
      // Higher is better for treadmill (km/h)
      percentile = (pace - stats.min) / (stats.max - stats.min);
    } else {
      // Lower is better for skiErg and rowing (time per 500m)
      percentile = 1 - (pace - stats.min) / (stats.max - stats.min);
    }

    // Color gradient from red (slow) to green (fast)
    if (percentile >= 0.8) return 'pace-excellent'; // Top 20%
    if (percentile >= 0.6) return 'pace-good'; // Top 40%
    if (percentile >= 0.4) return 'pace-average'; // Middle 20%
    if (percentile >= 0.2) return 'pace-slow'; // Bottom 40%
    return 'pace-very-slow'; // Bottom 20%
  };

  // Create estimated results for active races - update in real-time
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const estimatedResults = useMemo(() => {
    if (!activeRaces || !Array.isArray(activeRaces)) {
      return [];
    }
    
    return activeRaces
      .filter(race => race && race.estimatedSplits)
      .map(race => {
        // Create splits: use actual splits where available, estimated where not
        const combinedSplits: any[] = [];
        
        // Check each discipline - use actual if available, otherwise estimated
        const treadmillSplit = race.splits?.find(s => s.discipline === 'treadmill');
        const treadmillTime = treadmillSplit 
          ? treadmillSplit.time 
          : (race.estimatedSplits?.treadmill || 0);
        
        if (treadmillSplit) {
          combinedSplits.push(treadmillSplit);
        } else if (race.estimatedSplits?.treadmill) {
          combinedSplits.push({
            discipline: 'treadmill',
            time: race.estimatedSplits.treadmill,
            timestamp: new Date().toISOString(),
            isEstimated: true,
          });
        }
        
        const skiErgSplit = race.splits?.find(s => s.discipline === 'skiErg');
        const skiErgTime = skiErgSplit 
          ? skiErgSplit.time 
          : (race.estimatedSplits?.skiErg || 0);
        
        if (skiErgSplit) {
          combinedSplits.push(skiErgSplit);
        } else if (race.estimatedSplits?.skiErg) {
          combinedSplits.push({
            discipline: 'skiErg',
            time: race.estimatedSplits.skiErg,
            timestamp: new Date().toISOString(),
            isEstimated: true,
          });
        }
        
        const rowingSplit = race.splits?.find(s => s.discipline === 'rowing');
        const rowingTime = rowingSplit 
          ? rowingSplit.time 
          : (race.estimatedSplits?.rowing || 0);
        
        if (rowingSplit) {
          combinedSplits.push(rowingSplit);
        } else if (race.estimatedSplits?.rowing) {
          combinedSplits.push({
            discipline: 'rowing',
            time: race.estimatedSplits.rowing,
            timestamp: new Date().toISOString(),
            isEstimated: true,
          });
        }
        
        // Calculate adjusted estimated total: use actual splits when available, estimates otherwise
        const adjustedEstimatedTotal = treadmillTime + skiErgTime + rowingTime;
        
        return {
          id: `estimated-${race.id}`,
          personId: race.person?.id || '',
          personName: race.person?.name || 'Unknown',
          splits: combinedSplits,
          totalTime: adjustedEstimatedTotal,
          completedAt: new Date(race.startTime).toISOString(),
          isEstimated: true,
          activeRace: race,
        } as RaceResult & { isEstimated: boolean; activeRace: ActiveRace };
      });
  }, [activeRaces, currentTime]);

  // Combine actual and estimated results
  const allResults = useMemo(() => {
    return [...results, ...estimatedResults];
  }, [results, estimatedResults]);

  // Sort results
  const sortedResults = useMemo(() => {
    const sorted = [...allResults].sort((a, b) => {
      let aValue: number = 0;
      let bValue: number = 0;

      switch (sortField) {
        case 'total':
          aValue = a.totalTime;
          bValue = b.totalTime;
          break;
        case 'treadmill':
          const aTreadmill = a.splits.find(s => s.discipline === 'treadmill');
          const bTreadmill = b.splits.find(s => s.discipline === 'treadmill');
          aValue = aTreadmill?.time || Infinity;
          bValue = bTreadmill?.time || Infinity;
          break;
        case 'skiErg':
          const aSkiErg = a.splits.find(s => s.discipline === 'skiErg');
          const bSkiErg = b.splits.find(s => s.discipline === 'skiErg');
          aValue = aSkiErg?.time || Infinity;
          bValue = bSkiErg?.time || Infinity;
          break;
        case 'rowing':
          const aRowing = a.splits.find(s => s.discipline === 'rowing');
          const bRowing = b.splits.find(s => s.discipline === 'rowing');
          aValue = aRowing?.time || Infinity;
          bValue = bRowing?.time || Infinity;
          break;
      }

      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    return sorted;
  }, [allResults, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };


  // Reload when storage changes (could be improved with event listeners)
  useEffect(() => {
    const interval = setInterval(loadResults, 1000);
    return () => clearInterval(interval);
  }, []);

  if (results.length === 0 && estimatedResults.length === 0) {
    return (
      <div className="leaderboard">
        <div className="leaderboard-title-section" onClick={() => setIsExpanded(!isExpanded)}>
          <h2>Leaderboard</h2>
          <button className="collapse-toggle" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
        {isExpanded && (
          <p>No race results yet. Complete a race to see times here.</p>
        )}
      </div>
    );
  }

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <div className="leaderboard-title-section" onClick={() => setIsExpanded(!isExpanded)}>
          <h2>Leaderboard</h2>
          <button className="collapse-toggle" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
        {isExpanded && (
        <div className="leaderboard-controls">
          <div className="view-mode-selector">
            <button
              className={`view-mode-btn ${viewMode === 'simple' ? 'active' : ''}`}
              onClick={() => setViewMode('simple')}
            >
              Simple
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'splits' ? 'active' : ''}`}
              onClick={() => setViewMode('splits')}
            >
              Splits
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'detailed' ? 'active' : ''}`}
              onClick={() => setViewMode('detailed')}
            >
              Detailed
            </button>
          </div>
        </div>
        )}
      </div>
      {isExpanded && (
        <>
          {/* Table view */}
          <div className="results-table">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  {viewMode !== 'simple' && (
                    <>
                      <th 
                        className="sortable" 
                        onClick={() => handleSort('treadmill')}
                        title="Click to sort by Treadmill"
                      >
                        Treadmill {sortField === 'treadmill' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      {viewMode === 'detailed' && <th className="pace-header-desktop">Treadmill Pace</th>}
                      <th 
                        className="sortable" 
                        onClick={() => handleSort('skiErg')}
                        title="Click to sort by SkiErg"
                      >
                        SkiErg {sortField === 'skiErg' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      {viewMode === 'detailed' && <th className="pace-header-desktop">SkiErg Pace</th>}
                      <th 
                        className="sortable" 
                        onClick={() => handleSort('rowing')}
                        title="Click to sort by Rowing"
                      >
                        Rowing {sortField === 'rowing' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      {viewMode === 'detailed' && <th className="pace-header-desktop">Rowing Pace</th>}
                    </>
                  )}
                  <th 
                    className="sortable" 
                    onClick={() => handleSort('total')}
                    title="Click to sort by Total Time"
                  >
                    Total Time {sortField === 'total' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
            {sortedResults.map((result, index) => {
              const treadmillSplit = result.splits.find(s => s.discipline === 'treadmill');
              const skiErgSplit = result.splits.find(s => s.discipline === 'skiErg');
              const rowingSplit = result.splits.find(s => s.discipline === 'rowing');
              const isEstimated = 'isEstimated' in result && Boolean(result.isEstimated);
              
              return (
                    <tbody key={result.id} className={`leaderboard-row-group ${isEstimated ? 'estimated-row' : ''}`}>
                      <tr className="leaderboard-row-main">
                        <td className="rank">{index + 1}</td>
                        <td className="name">
                          {result.personName}
                          {isEstimated && <span className="estimated-badge">(Est.)</span>}
                        </td>
                        {viewMode !== 'simple' && (
                          <>
                            <td className={treadmillSplit && (treadmillSplit as any).isEstimated ? 'estimated-split' : ''}>
                              <div className="split-time-wrapper">
                                <div className="split-time">
                                  {treadmillSplit ? formatTimeHMS(treadmillSplit.time) : '-'}
                                </div>
                                {viewMode === 'detailed' && treadmillSplit && (
                                  <div className={`pace pace-mobile ${getPaceColor(calculateTreadmillPace(treadmillSplit.time), 'treadmill')}`}>
                                    {calculateTreadmillPace(treadmillSplit.time).toFixed(1)}
                                  </div>
                                )}
                              </div>
                            </td>
                            {viewMode === 'detailed' && (
                              <td className={`pace pace-desktop ${treadmillSplit ? getPaceColor(calculateTreadmillPace(treadmillSplit.time), 'treadmill') : ''}`}>
                                {treadmillSplit ? formatTreadmillPace(treadmillSplit.time) : '-'}
                              </td>
                            )}
                            <td className={skiErgSplit && (skiErgSplit as any).isEstimated ? 'estimated-split' : ''}>
                              <div className="split-time-wrapper">
                                <div className="split-time">
                                  {skiErgSplit ? formatTimeHMS(skiErgSplit.time) : '-'}
                                </div>
                                {viewMode === 'detailed' && skiErgSplit && (
                                  <div className={`pace pace-mobile ${getPaceColor(calculateSkiErgPace(skiErgSplit.time), 'skiErg')}`}>
                                    {formatPacePer500m(skiErgSplit.time)}
                                  </div>
                                )}
                              </div>
                            </td>
                            {viewMode === 'detailed' && (
                              <td className={`pace pace-desktop ${skiErgSplit ? getPaceColor(calculateSkiErgPace(skiErgSplit.time), 'skiErg') : ''}`}>
                                {skiErgSplit ? formatPacePer500m(skiErgSplit.time) : '-'}
                              </td>
                            )}
                            <td className={rowingSplit && (rowingSplit as any).isEstimated ? 'estimated-split' : ''}>
                              <div className="split-time-wrapper">
                                <div className="split-time">
                                  {rowingSplit ? formatTimeHMS(rowingSplit.time) : '-'}
                                </div>
                                {viewMode === 'detailed' && rowingSplit && (
                                  <div className={`pace pace-mobile ${getPaceColor(calculateRowingPace(rowingSplit.time), 'rowing')}`}>
                                    {formatRowingPace(rowingSplit.time)}
                                  </div>
                                )}
                              </div>
                            </td>
                            {viewMode === 'detailed' && (
                              <td className={`pace pace-desktop ${rowingSplit ? getPaceColor(calculateRowingPace(rowingSplit.time), 'rowing') : ''}`}>
                                {rowingSplit ? formatRowingPace(rowingSplit.time) : '-'}
                              </td>
                            )}
                          </>
                        )}
                        <td className={`total-time ${viewMode === 'detailed' ? 'total-time-detailed' : ''}`}>
                          {formatTimeHMS(result.totalTime)}
                          {isEstimated && <span className="estimated-indicator">*</span>}
                        </td>
                      </tr>
                    </tbody>
                  );
                })}
            </table>
          </div>
        </>
      )}
    </div>
  );
}

