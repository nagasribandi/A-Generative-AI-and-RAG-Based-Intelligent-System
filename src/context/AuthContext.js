import React, { createContext, useContext, useState, useEffect } from 'react';
import { sendSignupDecisionEmail } from '../services/emailService';
import {
  fbGetUsers, fbGetUserById, fbGetUserByEmail,
  fbCreateUser, fbUpdateUser, fbDeleteUser, fbSeedAdmin
} from '../services/firebase';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

// Session is still localStorage (it's per-device, that's fine)
const SESSION_KEY = 'smart_campus_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: seed admin in Firebase, restore session
  useEffect(() => {
    (async () => {
      try {
        await fbSeedAdmin(); // ensures default admin exists in Firebase
        const session = localStorage.getItem(SESSION_KEY);
        if (session) {
          const parsed = JSON.parse(session);
          const found = await fbGetUserById(parsed.id);
          if (found) setUser(found);
        }
      } catch (err) {
        console.error('AuthProvider init error:', err);
      }
      setLoading(false);
    })();
  }, []);

  const login = async (email, password) => {
    const found = await fbGetUserByEmail(email);
    if (!found || found.password !== password) {
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
    const exists = await fbGetUserByEmail(userData.email);
    if (exists) {
      throw new Error('An account with this email already exists');
    }
    // SECURITY: Force role to 'student' — admin accounts cannot be created via signup
    if (userData.role === 'admin') {
      throw new Error('Admin accounts cannot be created through signup. Contact your institution.');
    }
    const newUser = await fbCreateUser({
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: 'student',
      department: userData.department,
      studentId: userData.studentId,
      phone: userData.phone || '',
      emailVerified: userData.emailVerified || false,
      approved: false,
      rejected: false,
      createdAt: new Date().toISOString()
    });
    // Do NOT auto-login. Admin must approve account.
    return newUser;
  };

  // Admin functions
  const getPendingUsers = async () => {
    const users = await fbGetUsers();
    return users.filter(u => !u.approved && !u.rejected && u.role !== 'admin');
  };

  const approveUser = async (userId) => {
    if (!user || user.role !== 'admin') throw new Error('Only admins can approve users');
    await fbUpdateUser(userId, { approved: true, rejected: false });
    const updated = await fbGetUserById(userId);
    // Notify the user via email
    try {
      await sendSignupDecisionEmail(updated.email, updated.name, true, user.name);
    } catch (err) {
      console.error('Failed to send approval email:', err);
    }
    return updated;
  };

  const rejectUser = async (userId, reason = '') => {
    if (!user || user.role !== 'admin') throw new Error('Only admins can reject users');
    await fbUpdateUser(userId, { approved: false, rejected: true });
    const updated = await fbGetUserById(userId);
    try {
      await sendSignupDecisionEmail(updated.email, updated.name, false, user.name, reason);
    } catch (err) {
      console.error('Failed to send rejection email:', err);
    }
    return updated;
  };

  const adminCreateUser = async (userData) => {
    if (!user || user.role !== 'admin') throw new Error('Only admins can create users');
    const exists = await fbGetUserByEmail(userData.email);
    if (exists) throw new Error('User with this email already exists');
    const newUser = await fbCreateUser({
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
    });
    return newUser;
  };

  const adminDeleteUser = async (userId) => {
    if (!user || user.role !== 'admin') throw new Error('Only admins can delete users');
    if (userId === 'admin-001') throw new Error('Default admin cannot be deleted');
    await fbDeleteUser(userId);
    return true;
  };

  const adminChangePassword = async (userId, newPassword) => {
    if (!user || user.role !== 'admin') throw new Error('Only admins can change passwords');
    await fbUpdateUser(userId, { password: newPassword });
    const updated = await fbGetUserById(userId);
    return updated;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const updateProfile = async (updates) => {
    await fbUpdateUser(user.id, updates);
    const updated = await fbGetUserById(user.id);
    setUser(updated);
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
