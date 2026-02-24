const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE = path.join(__dirname, 'db.json');
const PORT = process.env.PORT || 4000;
const ADMIN_KEY = process.env.ADMIN_API_KEY || 'dev-admin-key';

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { users: [], config: { features: {} }, audit: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));

// Simple admin auth middleware
function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Admin key required' });
  }
  next();
}

// Users
app.get('/api/users', requireAdmin, (req, res) => {
  const data = readData();
  res.json({ users: data.users });
});

app.post('/api/users', requireAdmin, (req, res) => {
  const data = readData();
  const payload = req.body;
  if (data.users.find(u => u.email === payload.email)) {
    return res.status(400).json({ error: 'Email already exists' });
  }
  const newUser = {
    id: 'user-' + Date.now(),
    name: payload.name,
    email: payload.email,
    password: payload.password || 'changeme123',
    role: payload.role || 'student',
    department: payload.department || '',
    studentId: payload.studentId || '',
    phone: payload.phone || '',
    emailVerified: !!payload.emailVerified,
    approved: !!payload.approved,
    rejected: !!payload.rejected,
    createdAt: new Date().toISOString()
  };
  data.users.push(newUser);
  writeData(data);
  res.json({ user: newUser });
});

app.post('/api/users/:id/approve', requireAdmin, (req, res) => {
  const data = readData();
  const u = data.users.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  u.approved = true;
  u.rejected = false;
  writeData(data);
  // Audit
  data.audit.push({ id: uuidv4(), type: 'approve', userId: u.id, admin: req.body.admin || 'unknown', at: new Date().toISOString(), reason: req.body.reason || '' });
  writeData(data);
  res.json({ user: u });
});

app.post('/api/users/:id/reject', requireAdmin, (req, res) => {
  const data = readData();
  const u = data.users.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  u.approved = false;
  u.rejected = true;
  writeData(data);
  data.audit.push({ id: uuidv4(), type: 'reject', userId: u.id, admin: req.body.admin || 'unknown', at: new Date().toISOString(), reason: req.body.reason || '' });
  writeData(data);
  res.json({ user: u });
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
  const data = readData();
  const idx = data.users.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  if (data.users[idx].id === 'admin-001') return res.status(400).json({ error: 'Cannot delete default admin' });
  const removed = data.users.splice(idx, 1)[0];
  writeData(data);
  data.audit.push({ id: uuidv4(), type: 'delete', userId: removed.id, admin: req.body.admin || 'unknown', at: new Date().toISOString(), reason: req.body.reason || '' });
  writeData(data);
  res.json({ success: true });
});

app.post('/api/users/:id/password', requireAdmin, (req, res) => {
  const data = readData();
  const u = data.users.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  u.password = req.body.password;
  writeData(data);
  data.audit.push({ id: uuidv4(), type: 'changePassword', userId: u.id, admin: req.body.admin || 'unknown', at: new Date().toISOString() });
  writeData(data);
  res.json({ user: u });
});

// Config
app.get('/api/config', requireAdmin, (req, res) => {
  const data = readData();
  res.json({ config: data.config });
});

app.post('/api/config/toggle', requireAdmin, (req, res) => {
  const key = req.body.key;
  const data = readData();
  if (!data.config.features || typeof data.config.features[key] === 'undefined') {
    return res.status(400).json({ error: 'Unknown feature key' });
  }
  data.config.features[key] = !data.config.features[key];
  writeData(data);
  data.audit.push({ id: uuidv4(), type: 'toggleFeature', key, admin: req.body.admin || 'unknown', at: new Date().toISOString(), value: data.config.features[key] });
  writeData(data);
  res.json({ config: data.config });
});

// Audit
app.get('/api/audit', requireAdmin, (req, res) => {
  const data = readData();
  res.json({ audit: data.audit });
});

app.post('/api/audit', requireAdmin, (req, res) => {
  const data = readData();
  const entry = { id: uuidv4(), ...req.body, at: new Date().toISOString() };
  data.audit.push(entry);
  writeData(data);
  res.json({ entry });
});

// CSV export for users
app.get('/api/export/users.csv', requireAdmin, (req, res) => {
  const data = readData();
  const rows = data.users.map(u => [u.id, u.name, u.email, u.role, u.department, u.studentId, u.approved ? 'Yes' : 'No']);
  const header = ['id','name','email','role','department','studentId','approved'];
  const csv = [header.join(',')].concat(rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
  res.send(csv);
});

app.listen(PORT, () => {
  console.log(`Smart Campus API running on port ${PORT}`);
});
