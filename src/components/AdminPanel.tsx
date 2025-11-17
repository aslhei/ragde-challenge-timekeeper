import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface UserData {
  id: string;
  email?: string;
  role?: 'user' | 'admin';
  isAdmin?: boolean; // Legacy field for compatibility
  createdAt?: string;
}

export function AdminPanel() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (!isExpanded) return;

    setIsLoading(true);
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('createdAt', 'asc'));

    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData: UserData[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<UserData, 'id'>),
      }));
      setUsers(usersData);
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching users:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isExpanded]);

  const handleMakeAdmin = async (userId: string, email: string | undefined) => {
    if (!window.confirm(`Make ${email || userId} an admin?`)) {
      return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: 'admin',
        isAdmin: true, // Also set legacy field for compatibility
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role. Please try again.');
    }
  };

  const handleRemoveAdmin = async (userId: string, email: string | undefined) => {
    if (!window.confirm(`Remove admin status from ${email || userId}?`)) {
      return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: 'user',
        isAdmin: false,
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role. Please try again.');
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h2>Admin Panel - User Management</h2>
        <button className="collapse-toggle" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="admin-panel-content">
          {isLoading ? (
            <p className="loading-message">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="no-users">No users found.</p>
          ) : (
            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isAdmin = user.role === 'admin' || user.isAdmin === true;
                    const isCurrentUser = user.id === currentUser?.uid;
                    
                    return (
                      <tr key={user.id} className={isCurrentUser ? 'current-user' : ''}>
                        <td className="user-email">
                          {user.email || user.id}
                          {isCurrentUser && <span className="current-user-badge">(You)</span>}
                        </td>
                        <td>
                          <span className={`role-badge ${isAdmin ? 'admin' : 'user'}`}>
                            {isAdmin ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="user-created">
                          {user.createdAt 
                            ? new Date(user.createdAt).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="user-actions">
                          {isCurrentUser ? (
                            <span className="disabled-action">Current user</span>
                          ) : isAdmin ? (
                            <button
                              className="remove-admin-btn"
                              onClick={() => handleRemoveAdmin(user.id, user.email)}
                              title="Remove admin status"
                            >
                              Remove Admin
                            </button>
                          ) : (
                            <button
                              className="make-admin-btn"
                              onClick={() => handleMakeAdmin(user.id, user.email)}
                              title="Make this user an admin"
                            >
                              Make Admin
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

