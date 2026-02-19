import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

// Simulated user database (in production, this would be a real backend)
const USERS_KEY = 'smart_campus_users';
const SESSION_KEY = 'smart_campus_session';

function getUsers() {
  const stored = localStorage.getItem(USERS_KEY);
  if (stored) return JSON.parse(stored);
  // Default admin user
  const defaults = [
    {
      id: 'admin-001',
      name: 'Campus Admin',
      email: 'admin@smartcampus.edu',
      password: 'admin123',
      role: 'admin',
      department: 'Administration',
      studentId: 'ADM-001',
      createdAt: new Date().toISOString()
    }
  ];
  localStorage.setItem(USERS_KEY, JSON.stringify(defaults));
  return defaults;
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      const parsed = JSON.parse(session);
      const users = getUsers();
      const found = users.find(u => u.id === parsed.id);
      if (found) {
        setUser(found);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const users = getUsers();
    const found = users.find(u => u.email === email && u.password === password);
    if (!found) {
      throw new Error('Invalid email or password');
    }
    setUser(found);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: found.id }));
    return found;
  };

  const signup = async (userData) => {
    const users = getUsers();
    const exists = users.find(u => u.email === userData.email);
    if (exists) {
      throw new Error('An account with this email already exists');
    }
    // SECURITY: Force role to 'student' — admin accounts cannot be created via signup
    if (userData.role === 'admin') {
      throw new Error('Admin accounts cannot be created through signup. Contact your institution.');
    }
    const newUser = {
      id: 'user-' + Date.now(),
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: 'student', // Always student — enforced server-side
      department: userData.department,
      studentId: userData.studentId,
      phone: userData.phone || '',
      emailVerified: userData.emailVerified || false,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    saveUsers(users);
    setUser(newUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: newUser.id }));
    return newUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const updateProfile = (updates) => {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updates };
      saveUsers(users);
      setUser(users[idx]);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
