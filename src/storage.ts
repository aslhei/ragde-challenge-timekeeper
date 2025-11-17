import { Person, RaceResult } from './types';
import { db } from './firebase';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';

let personsCache: Person[] = [];
let resultsCache: RaceResult[] = [];
let listenersInitialized = false;

function initListeners() {
	if (listenersInitialized) return;
	listenersInitialized = true;

	// Persons
	const personsRef = collection(db, 'persons');
	onSnapshot(
		query(personsRef, orderBy('createdAt', 'asc')),
		(snap) => {
			personsCache = snap.docs.map((d) => ({
				id: d.id,
				...(d.data() as Omit<Person, 'id'>),
			}));
		},
		(error) => {
			console.error('Error in persons Firestore listener:', error);
		}
	);

	// Results
	const resultsRef = collection(db, 'results');
	onSnapshot(
		query(resultsRef, orderBy('totalTime', 'asc')),
		(snap) => {
			resultsCache = snap.docs.map((d) => ({
				id: d.id,
				...(d.data() as Omit<RaceResult, 'id'>),
			}));
		},
		(error) => {
			console.error('Error in results Firestore listener:', error);
		}
	);
}

export const storage = {
	// Call once at app start
	init() {
		initListeners();
	},

	// Person management (sync getters backed by real-time cache)
	getPersons(): Person[] {
		initListeners();
		return personsCache;
	},

	savePerson(person: Person): void {
		initListeners();
		const personsRef = collection(db, 'persons');
		// Ensure deterministic id: use existing id or create a doc with that id
		const ref = doc(personsRef, person.id);
		const data: Omit<Person, 'id'> = {
			name: person.name,
			createdAt: person.createdAt,
		};
		if (person.createdBy) {
			data.createdBy = person.createdBy;
		}
		void setDoc(ref, data);
	},

	createPerson(name: string, createdBy?: string): Person {
		initListeners();
		// Construct object and write; Firestore id is generated, but we keep API returning a Person
		const temp: Omit<Person, 'id'> = {
			name,
			createdAt: new Date().toISOString(),
		};
		if (createdBy) {
			temp.createdBy = createdBy;
		}
		const personsRef = collection(db, 'persons');
		void addDoc(personsRef, temp);
		// Return a placeholder object; UI does not rely on return value currently
		return {
			id: crypto.randomUUID(),
			...temp,
		};
	},

	getPerson(id: string): Person | undefined {
		initListeners();
		return personsCache.find(p => p.id === id);
	},

	deletePerson(id: string): void {
		initListeners();
		const ref = doc(db, 'persons', id);
		void deleteDoc(ref);
	},

	// Race results management
	getResults(): RaceResult[] {
		initListeners();
		return resultsCache;
	},

	saveResult(result: RaceResult): void {
		initListeners();
		const resultsRef = collection(db, 'results');
		// Use provided id as doc id to keep delete logic simple
		const ref = doc(resultsRef, result.id);
		const data: Omit<RaceResult, 'id'> = {
			personId: result.personId,
			personName: result.personName,
			splits: result.splits,
			totalTime: result.totalTime,
			completedAt: result.completedAt,
		};
		if (result.createdBy) {
			data.createdBy = result.createdBy;
		}
		void setDoc(ref, data);
	},

	getResultsByPerson(personId: string): RaceResult[] {
		initListeners();
		return resultsCache.filter(r => r.personId === personId);
	},

	getAllResults(): RaceResult[] {
		initListeners();
		return [...resultsCache].sort((a, b) => a.totalTime - b.totalTime);
	},

	deleteResult(id: string): void {
		initListeners();
		const ref = doc(db, 'results', id);
		void deleteDoc(ref);
	},
};

