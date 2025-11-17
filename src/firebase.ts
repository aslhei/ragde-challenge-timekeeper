import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate required environment variables
const requiredEnvVars = {
	apiKey: firebaseConfig.apiKey,
	authDomain: firebaseConfig.authDomain,
	projectId: firebaseConfig.projectId,
	storageBucket: firebaseConfig.storageBucket,
	messagingSenderId: firebaseConfig.messagingSenderId,
	appId: firebaseConfig.appId,
};

const missingVars = Object.entries(requiredEnvVars)
	.filter(([_, value]) => !value)
	.map(([key]) => `VITE_${key.toUpperCase()}`);

if (missingVars.length > 0) {
	console.error(
		'Missing Firebase configuration. Please set the following environment variables:\n',
		missingVars.join('\n')
	);
	throw new Error(`Missing Firebase environment variables: ${missingVars.join(', ')}`);
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);


