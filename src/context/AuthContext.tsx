import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { 
	signInWithEmailAndPassword, 
	createUserWithEmailAndPassword,
	signOut, 
	onAuthStateChanged, 
	User
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export type UserRole = 'guest' | 'user' | 'admin';

interface AuthContextValue {
	isAdmin: boolean;
	isUser: boolean; // true if logged in (either user or admin)
	role: UserRole; // 'guest', 'user', or 'admin'
	isLoading: boolean;
	user: User | null;
	login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
	signup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
	logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Admin email addresses - you can manage this in Firestore or environment variables
const ADMIN_EMAILS = import.meta.env.VITE_ADMIN_EMAILS 
	? import.meta.env.VITE_ADMIN_EMAILS.split(',').map((e: string) => e.trim())
	: [];

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [role, setRole] = useState<UserRole>('guest');
	const [isLoading, setIsLoading] = useState<boolean>(true);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			setUser(firebaseUser);
			
			if (firebaseUser) {
				// Check if user is admin
				// Option 1: Check against admin emails list
				const isAdminEmail = ADMIN_EMAILS.length > 0 
					? ADMIN_EMAILS.includes(firebaseUser.email || '')
					: false;
				
				// Option 2: Check Firestore for admin role
				try {
					const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
					const userData = userDoc.data();
					const isAdminInDb = userData?.role === 'admin' || userData?.isAdmin === true;
					
					const isAdmin = isAdminEmail || isAdminInDb;
					setRole(isAdmin ? 'admin' : 'user');
				} catch (error) {
					console.error('Error checking admin status:', error);
					setRole(isAdminEmail ? 'admin' : 'user');
				}
			} else {
				setRole('guest');
			}
			
			setIsLoading(false);
		});

		return () => unsubscribe();
	}, []);

	const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
		try {
			await signInWithEmailAndPassword(auth, email, password);
			return { success: true };
		} catch (error: any) {
			let errorMessage = 'Login failed';
			if (error.code === 'auth/user-not-found') {
				errorMessage = 'No account found with this email';
			} else if (error.code === 'auth/wrong-password') {
				errorMessage = 'Incorrect password';
			} else if (error.code === 'auth/invalid-email') {
				errorMessage = 'Invalid email address';
			} else if (error.code === 'auth/too-many-requests') {
				errorMessage = 'Too many failed attempts. Please try again later';
			}
			return { success: false, error: errorMessage };
		}
	}, []);

	const signup = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
		try {
			const userCredential = await createUserWithEmailAndPassword(auth, email, password);
			
			// Create user document in Firestore with default role 'user'
			try {
				await setDoc(doc(db, 'users', userCredential.user.uid), {
					email: userCredential.user.email,
					role: 'user',
					createdAt: new Date().toISOString(),
				});
			} catch (dbError) {
				console.error('Error creating user document:', dbError);
				// Don't fail signup if Firestore write fails, user is still created in Auth
			}
			
			return { success: true };
		} catch (error: any) {
			let errorMessage = 'Signup failed';
			if (error.code === 'auth/email-already-in-use') {
				errorMessage = 'Email is already registered';
			} else if (error.code === 'auth/invalid-email') {
				errorMessage = 'Invalid email address';
			} else if (error.code === 'auth/operation-not-allowed') {
				errorMessage = 'Signup is currently disabled';
			} else if (error.code === 'auth/weak-password') {
				errorMessage = 'Password is too weak (minimum 6 characters)';
			} else if (error.code === 'auth/too-many-requests') {
				errorMessage = 'Too many attempts. Please try again later';
			}
			return { success: false, error: errorMessage };
		}
	}, []);

	const logout = useCallback(async () => {
		try {
			await signOut(auth);
		} catch (error) {
			console.error('Error signing out:', error);
		}
	}, []);

	const isAdmin = role === 'admin';
	const isUser = role === 'user' || role === 'admin';

	const value = useMemo<AuthContextValue>(
		() => ({ isAdmin, isUser, role, isLoading, user, login, signup, logout }), 
		[isAdmin, isUser, role, isLoading, user, login, signup, logout]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error('useAuth must be used within AuthProvider');
	return ctx;
}


