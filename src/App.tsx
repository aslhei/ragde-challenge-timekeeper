import { useState, useRef } from 'react';
import { Person, ActiveRace } from './types';
import { RaceStarter } from './components/RaceStarter';
import { ActiveRacesManager, ActiveRacesManagerRef } from './components/ActiveRacesManager';
import { AddPerson } from './components/AddPerson';
import { PersonBrowser } from './components/PersonBrowser';
import { ManualResultEntry } from './components/ManualResultEntry';
import { Leaderboard } from './components/Leaderboard';
import { AdminPanel } from './components/AdminPanel';
import { Logo } from './components/Logo';
import './App.css';
import { useAuth } from './context/AuthContext';

function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeRaces, setActiveRaces] = useState<ActiveRace[]>([]);
  const activeRacesRef = useRef<ActiveRacesManagerRef>(null);
  const { isUser, isAdmin, isLoading, user, login, signup, logout } = useAuth();
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSignupMode, setIsSignupMode] = useState(false);

  const handleRaceComplete = () => {
    // Trigger refresh of leaderboard
    setRefreshKey(prev => prev + 1);
  };

  const handleResultSaved = () => {
    // Trigger refresh of leaderboard
    setRefreshKey(prev => prev + 1);
  };

  const handleStartRace = (person: Person, estimatedSplits?: any) => {
    activeRacesRef.current?.startRace(person, estimatedSplits);
  };

  const handlePersonAdded = () => {
    // Person was added, components will refresh automatically
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-content">
          {isLoading ? (
            <span className="auth-loading">Loading...</span>
          ) : isUser ? (
            <>
              <span className="auth-status">Logged in as {user?.email || 'User'}</span>
              <button className="logout-btn" onClick={logout}>Logout</button>
            </>
          ) : (
            <div className="auth-section">
              <div className="auth-mode-toggle">
                <button
                  type="button"
                  className={`auth-mode-btn ${!isSignupMode ? 'active' : ''}`}
                  onClick={() => {
                    setIsSignupMode(false);
                    setLoginError(null);
                  }}
                >
                  Login
                </button>
                <button
                  type="button"
                  className={`auth-mode-btn ${isSignupMode ? 'active' : ''}`}
                  onClick={() => {
                    setIsSignupMode(true);
                    setLoginError(null);
                  }}
                >
                  Sign Up
                </button>
              </div>
              <form
                className="login-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setLoginError(null);
                  const result = isSignupMode
                    ? await signup(emailInput.trim(), passwordInput.trim())
                    : await login(emailInput.trim(), passwordInput.trim());
                  if (result.success) {
                    setEmailInput('');
                    setPasswordInput('');
                  } else {
                    setLoginError(result.error || (isSignupMode ? 'Signup failed' : 'Login failed'));
                  }
                }}
              >
                <input
                  type="email"
                  placeholder="Email"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setLoginError(null);
                  }}
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setLoginError(null);
                  }}
                  required
                  minLength={6}
                />
                <button type="submit" className="login-btn">
                  {isSignupMode ? 'Sign Up' : 'Login'}
                </button>
                {loginError && <span className="login-error">{loginError}</span>}
              </form>
            </div>
          )}
        </div>
      </nav>

      <header>
        <div className="header-top">
          <div className="logo-left">
            <Logo />
          </div>
          <div className="header-title-section">
            <h1>Ragde Challenge</h1>
            <p>Den ultimate challenge: 5000m @ 10% Mølle → 5000m SkiErg → 2000m Roing</p>
          </div>
          <div className="logo-right">
            <Logo />
          </div>
        </div>
      </header>

      <main>
        <div className="main-content">
          <div className="right-panel">
            <Leaderboard key={refreshKey} activeRaces={activeRaces || []} />
          </div>
          <div className="left-panel">
            <ActiveRacesManager 
              ref={activeRacesRef} 
              onRaceComplete={handleRaceComplete}
              onActiveRacesChange={setActiveRaces}
            />
            {isUser && <RaceStarter onStartRace={handleStartRace} />}
            {isUser && <AddPerson onPersonAdded={handlePersonAdded} />}
            <PersonBrowser />
            {isUser && <ManualResultEntry onResultSaved={handleResultSaved} />}
            {isAdmin && <AdminPanel />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

