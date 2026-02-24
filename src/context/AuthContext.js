import React, { createContext, useContext, useState, useEffect } from 'react';
import { sendSignupDecisionEmail } from '../services/emailService';

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
  const defaultAdmin = {
    id: 'admin-001',
    name: 'Vardhaman Admin',
    email: 'vardhaman@gmail.com',
    password: 'helloworld123',
    role: 'admin',
    department: 'Administration',
    studentId: 'ADM-001',
    createdAt: new Date().toISOString()
  };

  if (stored) {
    const users = JSON.parse(stored);
    // Ensure admin account always exists and is up-to-date
    const adminIdx = users.findIndex(u => u.id === 'admin-001');
    if (adminIdx === -1) {
      users.push(defaultAdmin);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } else {
      // Update admin credentials if they changed
      users[adminIdx] = { ...users[adminIdx], ...defaultAdmin };
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    return users;
  }

  // Default admin user
  const defaults = [defaultAdmin];
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
    // Block login for students whose account is not yet approved by admin
    if (found.role !== 'admin' && !found.approved) {
      if (found.rejected) {
        throw new Error('Your signup request was rejected by the admin. Please contact the institution.');
      }
      throw new Error('Your account is pending admin approval. You will receive an email once approved.');
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
      approved: false, // admin must approve before login
      rejected: false,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    saveUsers(users);
    // Do NOT auto-login. Admin must approve account.
    return newUser;
  };

  // Admin functions
  const getPendingUsers = () => {
    const users = getUsers();
    return users.filter(u => !u.approved && !u.rejected && u.role !== 'admin');
  };

  const approveUser = async (userId) => {
    if (!user || user.role !== 'admin') throw new Error('Only admins can approve users');
    const users = getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error('User not found');
    users[idx].approved = true;
    users[idx].rejected = false;
    saveUsers(users);
    // Notify the user via email
    try {
      await sendSignupDecisionEmail(users[idx].email, users[idx].name, true, user.name);
    } catch (err) {
      console.error('Failed to send approval email:', err);
    }
    return users[idx];
  };

  const rejectUser = async (userId, reason = '') => {
    if (!user || user.role !== 'admin') throw new Error('Only admins can reject users');
    const users = getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error('User not found');
    users[idx].approved = false;
    users[idx].rejected = true;
    saveUsers(users);
    try {
      await sendSignupDecisionEmail(users[idx].email, users[idx].name, false, user.name, reason);
    } catch (err) {
      console.error('Failed to send rejection email:', err);
    }
    return users[idx];
  };

  const adminCreateUser = (userData) => {
    if (!user || user.role !== 'admin') throw new Error('Only admins can create users');
    const users = getUsers();
    const exists = users.find(u => u.email === userData.email);
    if (exists) throw new Error('User with this email already exists');
    const newUser = {
      id: 'user-' + Date.now(),
      name: userData.name,
      email: userData.email,
      password: userData.password || 'changeme123',
      role: userData.role || 'student',
      department: userData.department || '',
      studentId: userData.studentId || '',
      phone: userData.phone || '',
      emailVerified: true,
      approved: true,
      rejected: false,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    saveUsers(users);
    return newUser;
  };

  const adminDeleteUser = (userId) => {
    if (!user || user.role !== 'admin') throw new Error('Only admins can delete users');
    if (userId === 'admin-001') throw new Error('Default admin cannot be deleted');
    const users = getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error('User not found');
    users.splice(idx, 1);
    saveUsers(users);
    return true;
  };

  const adminChangePassword = (userId, newPassword) => {
    if (!user || user.role !== 'admin') throw new Error('Only admins can change passwords');
    const users = getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error('User not found');
    users[idx].password = newPassword;
    saveUsers(users);
    return users[idx];
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
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      signup,
      logout,
      updateProfile,
      // Admin utilities
      getPendingUsers,
      approveUser,
      rejectUser,
      adminCreateUser,
      adminDeleteUser,
      adminChangePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
}
