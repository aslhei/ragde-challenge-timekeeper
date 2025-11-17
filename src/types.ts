export interface Person {
  id: string;
  name: string;
  createdAt: string;
  createdBy?: string; // User ID or email
}

export interface Split {
  discipline: 'treadmill' | 'skiErg' | 'rowing';
  time: number; // time in milliseconds
  timestamp: string;
}

export interface RaceResult {
  id: string;
  personId: string;
  personName: string;
  splits: Split[];
  totalTime: number; // total time in milliseconds
  completedAt: string;
  createdBy?: string; // User ID or email - who created this result (via manual entry or race completion)
}

export interface EstimatedSplits {
  treadmill?: number; // time in milliseconds
  skiErg?: number; // time in milliseconds
  rowing?: number; // time in milliseconds
  total?: number; // total estimated time in milliseconds
}

export interface ActiveRace {
  id: string;
  person: Person;
  startTime: number;
  splits: Split[];
  currentDisciplineIndex: number;
  estimatedSplits?: EstimatedSplits;
  createdBy?: string; // User ID or email - who started this race
}

