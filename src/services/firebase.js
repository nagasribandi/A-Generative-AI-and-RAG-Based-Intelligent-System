// =====================================================
// Firebase Configuration
// =====================================================
// 1. Go to https://console.firebase.google.com
// 2. Create a project (or use existing)
// 3. Add a Web App → copy the config below
// 4. Enable Realtime Database:
//    Build → Realtime Database → Create Database → Start in TEST MODE
// =====================================================

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, push, update, remove, onValue } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBSIm8GHueFZc0Uw_z6SnoWmTsCLH38xYI",
  authDomain: "smart-campus-detection.firebaseapp.com",
  databaseURL: "https://smart-campus-detection-default-rtdb.firebaseio.com",
  projectId: "smart-campus-detection",
  storageBucket: "smart-campus-detection.firebasestorage.app",
  messagingSenderId: "741439799951",
  appId: "1:741439799951:web:90623494f0196fb11b66fa",
  measurementId: "G-Q7NHNHL2WF"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ── Database References ──────────────────────────────
export const usersRef = ref(db, 'users');
export const complaintsRef = ref(db, 'complaints');
export const configRef = ref(db, 'config');
export const auditRef = ref(db, 'audit');

// ── User helpers ─────────────────────────────────────
export async function fbGetUsers() {
  const snap = await get(usersRef);
  if (!snap.exists()) return [];
  const data = snap.val();
  return Object.keys(data).map(key => ({ id: key, ...data[key] }));
}

export async function fbGetUserById(id) {
  const snap = await get(ref(db, `users/${id}`));
  if (!snap.exists()) return null;
  return { id, ...snap.val() };
}

export async function fbGetUserByEmail(email) {
  const users = await fbGetUsers();
  return users.find(u => u.email === email) || null;
}

export async function fbCreateUser(userData) {
  const newRef = push(usersRef);
  const user = { ...userData, id: newRef.key };
  await set(newRef, user);
  return user;
}

export async function fbUpdateUser(id, updates) {
  await update(ref(db, `users/${id}`), updates);
}

export async function fbDeleteUser(id) {
  await remove(ref(db, `users/${id}`));
}

// ── Complaints helpers ───────────────────────────────
export async function fbGetComplaints() {
  const snap = await get(complaintsRef);
  if (!snap.exists()) return [];
  const data = snap.val();
  return Object.keys(data).map(key => ({ id: key, ...data[key] }));
}

export async function fbCreateComplaint(complaint) {
  const newRef = push(complaintsRef);
  const item = { ...complaint, id: newRef.key };
  await set(newRef, item);
  return item;
}

export async function fbUpdateComplaint(id, updates) {
  await update(ref(db, `complaints/${id}`), updates);
}

export async function fbDeleteComplaint(id) {
  await remove(ref(db, `complaints/${id}`));
}

// ── Config helpers ───────────────────────────────────
export async function fbGetConfig() {
  const snap = await get(configRef);
  if (!snap.exists()) {
    // Default config
    const defaults = {
      features: { imageUpload: true, geminiAI: true, allowSignup: true, leaderboard: true }
    };
    await set(configRef, defaults);
    return defaults;
  }
  return snap.val();
}

export async function fbToggleFeature(key) {
  const config = await fbGetConfig();
  const newVal = !config.features[key];
  await update(ref(db, `config/features`), { [key]: newVal });
  return { ...config, features: { ...config.features, [key]: newVal } };
}

// ── Audit helpers ────────────────────────────────────
export async function fbGetAudit() {
  const snap = await get(auditRef);
  if (!snap.exists()) return [];
  const data = snap.val();
  return Object.keys(data).map(key => ({ id: key, ...data[key] }));
}

export async function fbAddAudit(entry) {
  const newRef = push(auditRef);
  await set(newRef, { ...entry, id: newRef.key, at: new Date().toISOString() });
}

// ── Seed default admin (runs once) ───────────────────
export async function fbSeedAdmin() {
  const users = await fbGetUsers();
  const adminExists = users.find(u => u.email === 'vardhaman@gmail.com' || u.role === 'admin');
  if (!adminExists) {
    const adminRef = ref(db, 'users/admin-001');
    await set(adminRef, {
      id: 'admin-001',
      name: 'Vardhaman Admin',
      email: 'vardhaman@gmail.com',
      password: 'helloworld123',
      role: 'admin',
      department: 'Administration',
      studentId: 'ADM-001',
      approved: true,
      rejected: false,
      emailVerified: true,
      createdAt: new Date().toISOString()
    });
  }
}

// ── Gamification / Points helpers ────────────────────
export const pointsRef = ref(db, 'points');

export async function fbGetPoints() {
  const snap = await get(pointsRef);
  if (!snap.exists()) return {};
  return snap.val();
}

export async function fbSavePoints(data) {
  await set(pointsRef, data);
}

export function onPointsChange(callback) {
  return onValue(pointsRef, (snap) => {
    if (!snap.exists()) { callback({}); return; }
    callback(snap.val());
  });
}

// Real-time listener
export function onUsersChange(callback) {
  return onValue(usersRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const data = snap.val();
    callback(Object.keys(data).map(key => ({ id: key, ...data[key] })));
  });
}

export function onComplaintsChange(callback) {
  return onValue(complaintsRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const data = snap.val();
    callback(Object.keys(data).map(key => ({ id: key, ...data[key] })));
  });
}

export { db, ref, get, set, push, update, remove, onValue };
