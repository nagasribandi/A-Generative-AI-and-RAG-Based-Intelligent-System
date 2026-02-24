import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSiteConfig, toggleFeature as localToggle, resetConfig } from '../services/siteConfig';
import { toast } from 'react-toastify';
import { FiUsers, FiUserPlus, FiKey, FiToggleLeft, FiToggleRight, FiSearch, FiDownload, FiCheckCircle, FiXCircle, FiClock, FiList, FiRefreshCw, FiTrash2, FiEdit } from 'react-icons/fi';
import {
  backendEnabled,
  fetchUsers as apiFetchUsers,
  createUser as apiCreateUser,
  approveUserRemote,
  rejectUserRemote,
  deleteUserRemote,
  changePasswordRemote,
  fetchConfig as apiFetchConfig,
  toggleFeatureRemote,
  fetchAudit as apiFetchAudit,
  getUsersCsvUrl
} from '../services/backendClient';
import '../styles/admin.css';

const PAGE_SIZE = 8;

/* ---------- localStorage audit fallback ---------- */
const AUDIT_KEY = 'smart_campus_audit';
function readLocalAudit() {
  try { return JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]'); } catch (e) { return []; } // eslint-disable-line no-unused-vars
}
function writeLocalAudit(entry) {
  const list = readLocalAudit();
  list.push({ ...entry, id: Date.now(), at: new Date().toISOString() });
  localStorage.setItem(AUDIT_KEY, JSON.stringify(list));
}

export default function AdminPanel() {
  const { user, approveUser, rejectUser, adminCreateUser, adminDeleteUser, adminChangePassword } = useAuth();

  const [tab, setTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState({ features: {} });
  const [audit, setAudit] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'student', department: '', studentId: '' });
  const [pwModal, setPwModal] = useState(null);
  const [newPw, setNewPw] = useState('');
  const [busy, setBusy] = useState(false);

  /* -------- data fetch -------- */
  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      if (backendEnabled) {
        const u = await apiFetchUsers();
        setUsers(u);
        setPending(u.filter(x => !x.approved && !x.rejected && x.role !== 'admin'));
        const c = await apiFetchConfig();
        setConfig(c);
        const a = await apiFetchAudit();
        setAudit(a.reverse());
      } else {
        const all = JSON.parse(localStorage.getItem('smart_campus_users') || '[]');
        setUsers(all);
        setPending(all.filter(x => !x.approved && !x.rejected && x.role !== 'admin'));
        setConfig(getSiteConfig());
        setAudit(readLocalAudit().reverse());
      }
    } catch (err) {
      toast.error('Failed to load data: ' + err.message);
    }
    setBusy(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  /* -------- actions -------- */
  const doApprove = async (id) => {
    try {
      if (backendEnabled) { await approveUserRemote(id, user.name); }
      else { await approveUser(id); writeLocalAudit({ type: 'approve', userId: id, admin: user.name }); }
      toast.success('User approved & notified');
      refresh();
    } catch (err) { toast.error(err.message); }
  };

  const doReject = async (id) => {
    const reason = window.prompt('Reason for rejection (optional)');
    try {
      if (backendEnabled) { await rejectUserRemote(id, user.name, reason || ''); }
      else { await rejectUser(id, reason || ''); writeLocalAudit({ type: 'reject', userId: id, admin: user.name, reason }); }
      toast.success('User rejected & notified');
      refresh();
    } catch (err) { toast.error(err.message); }
  };

  const doCreate = async () => {
    if (!createForm.name || !createForm.email) { toast.error('Name and email required'); return; }
    try {
      if (backendEnabled) { await apiCreateUser(createForm); }
      else { adminCreateUser(createForm); writeLocalAudit({ type: 'createUser', email: createForm.email, admin: user.name }); }
      toast.success('User ' + createForm.email + ' created');
      setCreateForm({ name: '', email: '', password: '', role: 'student', department: '', studentId: '' });
      setCreating(false);
      refresh();
    } catch (err) { toast.error(err.message); }
  };

  const doDelete = async (id) => {
    if (!window.confirm('Delete this user permanently?')) return;
    try {
      if (backendEnabled) { await deleteUserRemote(id, user.name); }
      else { adminDeleteUser(id); writeLocalAudit({ type: 'delete', userId: id, admin: user.name }); }
      toast.success('User deleted');
      refresh();
    } catch (err) { toast.error(err.message); }
  };

  const doChangePw = async () => {
    if (!newPw || newPw.length < 4) { toast.error('Password too short'); return; }
    try {
      if (backendEnabled) { await changePasswordRemote(pwModal, newPw, user.name); }
      else { adminChangePassword(pwModal, newPw); writeLocalAudit({ type: 'changePassword', userId: pwModal, admin: user.name }); }
      toast.success('Password changed');
      setPwModal(null); setNewPw('');
    } catch (err) { toast.error(err.message); }
  };

  const doToggle = async (key) => {
    try {
      if (backendEnabled) {
        const c = await toggleFeatureRemote(key, user.name);
        setConfig(c);
      } else {
        localToggle(key);
        writeLocalAudit({ type: 'toggleFeature', key, admin: user.name });
        setConfig(getSiteConfig());
      }
      toast.success(key + ' toggled');
    } catch (err) { toast.error(err.message); }
  };

  const doReset = () => {
    resetConfig();
    writeLocalAudit({ type: 'resetConfig', admin: user.name });
    setConfig(getSiteConfig());
    toast.info('Config reset to defaults');
  };

  /* -------- CSV -------- */
  const exportCsv = () => {
    if (backendEnabled) { window.open(getUsersCsvUrl(), '_blank'); return; }
    const header = ['ID', 'Name', 'Email', 'Role', 'Department', 'StudentID', 'Approved'];
    const rows = users.map(u => [u.id, u.name, u.email, u.role, u.department || '', u.studentId || '', u.approved ? 'Yes' : 'No']);
    const csv = [header.join(',')].concat(rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'users.csv';
    a.click();
  };

  /* -------- filter & paginate -------- */
  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.department || '').toLowerCase().includes(q) ||
      (u.studentId || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* -------- tab config -------- */
  const tabs = [
    { key: 'pending', label: 'Pending Signups', icon: <FiClock />, badge: pending.length },
    { key: 'users', label: 'All Users', icon: <FiUsers />, badge: 0 },
    { key: 'features', label: 'Features', icon: <FiToggleLeft />, badge: 0 },
    { key: 'audit', label: 'Audit Log', icon: <FiList />, badge: 0 }
  ];

  /* ========== RENDER ========== */
  return (
    <div className="admin-panel">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1 className="admin-title">🛡️ Developer Admin Panel</h1>
          <p className="admin-subtitle">Welcome, <strong>{user?.name}</strong> — full site management {backendEnabled && <span className="badge-live">BACKEND</span>}</p>
        </div>
        <button className="btn-icon" onClick={refresh} title="Refresh" disabled={busy}>
          <FiRefreshCw className={busy ? 'spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {tabs.map(t => (
          <button key={t.key} className={'admin-tab' + (tab === t.key ? ' active' : '')} onClick={() => { setTab(t.key); setPage(1); }}>
            {t.icon} {t.label}
            {t.badge > 0 && <span className="tab-badge">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ===== PENDING ===== */}
      {tab === 'pending' && (
        <section className="admin-card">
          <h2><FiClock /> Pending Signup Requests ({pending.length})</h2>
          {pending.length === 0 ? (
            <div className="empty-state">No pending requests 🎉</div>
          ) : (
            <div className="table-wrap">
              <table className="admin-table">
                <thead><tr><th>Name</th><th>Email</th><th>Dept</th><th>Roll No</th><th>Signed Up</th><th>Actions</th></tr></thead>
                <tbody>
                  {pending.map(p => (
                    <tr key={p.id}>
                      <td className="td-name">{p.name}</td>
                      <td>{p.email}</td>
                      <td>{p.department || '—'}</td>
                      <td>{p.studentId || '—'}</td>
                      <td className="td-date">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</td>
                      <td className="td-actions">
                        <button className="btn-approve" onClick={() => doApprove(p.id)}><FiCheckCircle /> Approve</button>
                        <button className="btn-reject" onClick={() => doReject(p.id)}><FiXCircle /> Reject</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ===== ALL USERS ===== */}
      {tab === 'users' && (
        <section className="admin-card">
          <div className="card-toolbar">
            <h2><FiUsers /> All Users ({filtered.length})</h2>
            <div className="toolbar-right">
              <div className="search-box"><FiSearch /><input placeholder="Search name, email, dept…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
              <button className="btn-primary" onClick={() => setCreating(true)}><FiUserPlus /> Create User</button>
              <button className="btn-outline" onClick={exportCsv}><FiDownload /> CSV</button>
            </div>
          </div>

          {creating && (
            <div className="inline-form">
              <h3>Create New User</h3>
              <div className="form-grid">
                <input placeholder="Full name *" value={createForm.name} onChange={e => setCreateForm(s => ({ ...s, name: e.target.value }))} />
                <input placeholder="Email *" value={createForm.email} onChange={e => setCreateForm(s => ({ ...s, email: e.target.value }))} />
                <input placeholder="Password" type="text" value={createForm.password} onChange={e => setCreateForm(s => ({ ...s, password: e.target.value }))} />
                <select value={createForm.role} onChange={e => setCreateForm(s => ({ ...s, role: e.target.value }))}>
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
                <input placeholder="Department" value={createForm.department} onChange={e => setCreateForm(s => ({ ...s, department: e.target.value }))} />
                <input placeholder="Student / Roll ID" value={createForm.studentId} onChange={e => setCreateForm(s => ({ ...s, studentId: e.target.value }))} />
              </div>
              <div className="form-actions">
                <button className="btn-primary" onClick={doCreate}><FiUserPlus /> Create</button>
                <button className="btn-outline" onClick={() => setCreating(false)}>Cancel</button>
              </div>
            </div>
          )}

          {pwModal && (
            <div className="inline-form pw-form">
              <h3>Change Password — {users.find(u => u.id === pwModal)?.email}</h3>
              <input placeholder="New password" value={newPw} onChange={e => setNewPw(e.target.value)} />
              <div className="form-actions">
                <button className="btn-primary" onClick={doChangePw}><FiKey /> Save</button>
                <button className="btn-outline" onClick={() => { setPwModal(null); setNewPw(''); }}>Cancel</button>
              </div>
            </div>
          )}

          <div className="table-wrap">
            <table className="admin-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Dept</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {paged.map(u => (
                  <tr key={u.id} className={u.id === 'admin-001' ? 'row-admin' : ''}>
                    <td className="td-name">{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className={'role-badge ' + u.role}>{u.role}</span></td>
                    <td>{u.department || '—'}</td>
                    <td>{u.approved ? <span className="status-ok">Approved</span> : u.rejected ? <span className="status-bad">Rejected</span> : <span className="status-pending">Pending</span>}</td>
                    <td className="td-date">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="td-actions">
                      <button title="Change password" onClick={() => { setPwModal(u.id); setNewPw(''); }}><FiEdit /></button>
                      {u.id !== 'admin-001' && <button title="Delete" className="btn-danger-icon" onClick={() => doDelete(u.id)}><FiTrash2 /></button>}
                      {!u.approved && !u.rejected && u.role !== 'admin' && (
                        <>
                          <button className="btn-approve-sm" onClick={() => doApprove(u.id)} title="Approve"><FiCheckCircle /></button>
                          <button className="btn-reject-sm" onClick={() => doReject(u.id)} title="Reject"><FiXCircle /></button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span>Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </section>
      )}

      {/* ===== FEATURES ===== */}
      {tab === 'features' && (
        <section className="admin-card">
          <h2><FiToggleLeft /> Feature Toggles</h2>
          <div className="feature-grid">
            {Object.keys(config.features || {}).map(k => (
              <div key={k} className={'feature-card ' + (config.features[k] ? 'on' : 'off')}>
                <div className="feature-name">{k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</div>
                <div className="feature-status">{config.features[k] ? 'Enabled' : 'Disabled'}</div>
                <button onClick={() => doToggle(k)}>
                  {config.features[k] ? <><FiToggleRight /> Disable</> : <><FiToggleLeft /> Enable</>}
                </button>
              </div>
            ))}
          </div>
          <button className="btn-outline" style={{ marginTop: 16 }} onClick={doReset}><FiRefreshCw /> Reset All to Defaults</button>
        </section>
      )}

      {/* ===== AUDIT LOG ===== */}
      {tab === 'audit' && (
        <section className="admin-card">
          <h2><FiList /> Audit Log ({audit.length})</h2>
          {audit.length === 0 ? (
            <div className="empty-state">No audit entries yet.</div>
          ) : (
            <div className="table-wrap">
              <table className="admin-table audit-table">
                <thead><tr><th>Time</th><th>Action</th><th>Target</th><th>Admin</th><th>Details</th></tr></thead>
                <tbody>
                  {audit.slice(0, 50).map((a, i) => (
                    <tr key={a.id || i}>
                      <td className="td-date">{a.at ? new Date(a.at).toLocaleString() : '—'}</td>
                      <td><span className={'audit-action ' + a.type}>{a.type}</span></td>
                      <td>{a.userId || a.email || a.key || '—'}</td>
                      <td>{a.admin || '—'}</td>
                      <td className="td-detail">{a.reason || (a.value !== undefined ? String(a.value) : '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
