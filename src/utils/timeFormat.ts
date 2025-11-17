export function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const ms = Math.floor((milliseconds % 1000) / 10);

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
  return `${seconds}.${ms.toString().padStart(2, '0')}`;
}

export function formatTimeMS(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${seconds}`;
}

// Format time for timer display (MM:SS.s or HH:MM:SS.s, with tenths)
export function formatTimeTimer(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((milliseconds % 1000) / 100);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
}

export function formatTimeLong(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ms = Math.floor((milliseconds % 1000) / 10);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export function formatTimeHMS(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Calculate pace for treadmill in km/h
export function calculateTreadmillPace(timeMs: number): number {
  // Distance: 5000m = 5km
  // Time in hours: timeMs / 3600000
  // Pace = distance / time = 5 / (timeMs / 3600000) = 5 * 3600000 / timeMs
  return (5 * 3600000) / timeMs;
}

// Calculate pace for SkiErg in time per 500m (seconds)
export function calculateSkiErgPace(timeMs: number): number {
  // Distance: 5000m
  // Time per 500m = (time in seconds) / (5000 / 500) = timeMs / 10000
  return timeMs / 10000;
}

// Calculate pace for Rowing in time per 500m (seconds)
export function calculateRowingPace(timeMs: number): number {
  // Distance: 2000m
  // Time per 500m = (time in seconds) / (2000 / 500) = timeMs / 4000
  return timeMs / 4000;
}

// Format pace for treadmill (km/h)
export function formatTreadmillPace(timeMs: number): string {
  const pace = calculateTreadmillPace(timeMs);
  return `${pace.toFixed(1)} km/h`;
}

// Format pace for SkiErg/Rowing (time per 500m)
export function formatPacePer500m(timeMs: number): string {
  const paceSeconds = calculateSkiErgPace(timeMs);
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.floor(paceSeconds % 60);
  const ms = Math.floor((paceSeconds % 1) * 10);
  
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms}`;
  }
  return `${seconds}.${ms}`;
}

// Format pace for Rowing (time per 500m)
export function formatRowingPace(timeMs: number): string {
  const paceSeconds = calculateRowingPace(timeMs);
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.floor(paceSeconds % 60);
  const ms = Math.floor((paceSeconds % 1) * 10);
  
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms}`;
  }
  return `${seconds}.${ms}`;
}

