# Ragde Challenge Timekeeper

A web application for tracking times and splits for the Ragde Challenge race/workout.

## The Challenge

The Ragde Challenge consists of three disciplines:
1. **5000m Treadmill** with 10% incline
2. **5000m SkiErg**
3. **2000m Rowing Machine**

## Features

- **Person Management**: Create and save persons to track multiple attempts
- **Race Timing**: Start a race and take splits after each discipline
- **Historical Results**: All race results are saved with splits and total times
- **Leaderboard**: View all race results sorted by total time with individual splits

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

## Usage

1. **Create a Person**: Enter a name and click "Create Person"
2. **Select Person**: Click on a person's name to select them
3. **Start Race**: Click "Start Race" to begin timing
4. **Take Splits**: After completing each discipline, click "Take Split" to record the time
5. **View Leaderboard**: All completed races appear in the leaderboard with splits and total times

## Data Storage

All data is stored in Firebase Firestore. This means:
- Data is synchronized across all devices and browsers in real-time
- Data persists in the cloud
- Requires internet connection
- Multiple users can view and interact with the same data simultaneously

## Technologies

- React 18
- TypeScript
- Vite
- CSS3
- Firebase (Authentication & Firestore)

## Setup

Before running the application, you need to configure Firebase:

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Set up environment variables (see `FIREBASE_AUTH_SETUP.md` for details)

Create a `.env.local` file with your Firebase configuration:

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

See `FIREBASE_AUTH_SETUP.md` for detailed setup instructions.

