import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
  FiUsers, FiUserPlus, FiMail, FiPhone, FiBriefcase,
  FiTrash2, FiEdit, FiRefreshCw, FiSave, FiX, FiSend
} from 'react-icons/fi';
import { fbGetDeptAdmins, fbCreateDeptAdmin, fbUpdateDeptAdmin, fbDeleteDeptAdmin } from '../services/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/deptadmin.css';

const DEPARTMENT_TYPES = [
  'Transport',
  'Infrastructure',
  'Electrical',
  'Plumbing',
  'Cleanliness',
  'Security',
  'IT / Network',
  'Academics',
  'Hostel',
  'Canteen',
  'Other'
];

export default function DepartmentAdmins() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    departmentType: '',
    mobile: ''
  });
  const [errors, setErrors] = useState({});

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fbGetDeptAdmins();
      setAdmins(data);
    } catch (err) {
      toast.error('Failed to load department admins');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const validateForm = () => {
    const errs = {};
    if (!form.name || form.name.trim().length < 2) errs.name = 'Name is required';
    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email format';
    if (!form.departmentType) errs.departmentType = 'Department type is required';
    if (!form.mobile) errs.mobile = 'Mobile number is required';
    else if (!/^\d{10}$/.test(form.mobile)) errs.mobile = 'Enter a valid 10-digit mobile number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      if (editingId) {
        await fbUpdateDeptAdmin(editingId, {
          name: form.name,
          email: form.email,
          departmentType: form.departmentType,
          mobile: form.mobile,
          updatedAt: new Date().toISOString(),
          updatedBy: user.name
        });
        toast.success('Department admin updated!');
      } else {
        await fbCreateDeptAdmin({
          name: form.name,
          email: form.email,
          departmentType: form.departmentType,
          mobile: form.mobile,
          createdAt: new Date().toISOString(),
          addedBy: user.name
        });
        toast.success('Department admin added!');
      }
      resetForm();
      loadAdmins();
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
  };

  const handleEdit = (admin) => {
    setForm({
      name: admin.name,
      email: admin.email,
      departmentType: admin.departmentType,
      mobile: admin.mobile
    });
    setEditingId(admin.id);
    setShowForm(true);
    setErrors({});
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete department admin "${name}"?`)) return;
    try {
      await fbDeleteDeptAdmin(id);
      toast.success('Department admin deleted');
      loadAdmins();
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
  };

  const resetForm = () => {
    setForm({ name: '', email: '', departmentType: '', mobile: '' });
    setEditingId(null);
    setShowForm(false);
    setErrors({});
  };

  const sendTestEmail = async (admin) => {
    try {
      const ADMIN_KEY = process.env.REACT_APP_ADMIN_KEY || 'dev-admin-key';
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
        body: JSON.stringify({
          to: admin.email,
          subject: '🔔 Smart Campus — Department Registration Confirmation',
          body: `<h2>Department Admin Registration</h2>
                 <p>Hello <b>${admin.name}</b>,</p>
                 <p>You have been registered as the department admin for <b>${admin.departmentType}</b> on the Smart Campus Detection System.</p>
                 <p>When problems related to your department are detected, you will receive notifications at this email address.</p>
                 <br><p>— Smart Campus AI System</p>`
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Confirmation email sent to ${admin.email}`);
      } else {
        toast.warning('Email could not be sent: ' + (data.error || 'SMTP not configured'));
      }
    } catch (err) {
      toast.error('Failed to send email: ' + err.message);
    }
  };

  // Group admins by department
  const groupedAdmins = admins.reduce((acc, admin) => {
    const dept = admin.departmentType || 'Other';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(admin);
    return acc;
  }, {});

  return (
    <div className="dept-admin-page">
      <div className="dept-header">
        <div>
          <h1>🏢 Department Admins</h1>
          <p>Manage department contacts for problem forwarding • {admins.length} department{admins.length !== 1 ? 's' : ''} registered</p>
        </div>
        <div className="dept-header-actions">
          <button className="btn-refresh-dept" onClick={loadAdmins} disabled={loading}>
            <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button className="btn-add-dept" onClick={() => { resetForm(); setShowForm(true); }}>
            <FiUserPlus /> Add Department Admin
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="dept-form-card"
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="dept-form-header">
              <h2>{editingId ? '✏️ Edit Department Admin' : '➕ Add New Department Admin'}</h2>
              <button className="btn-close-form" onClick={resetForm}><FiX /></button>
            </div>
            <div className="dept-form-grid">
              <div className={`dept-form-group ${errors.name ? 'error' : ''}`}>
                <label><FiUsers size={14} /> Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Mr. Rajesh Kumar"
                  value={form.name}
                  onChange={(e) => { setForm(f => ({ ...f, name: e.target.value })); setErrors(e2 => ({ ...e2, name: '' })); }}
                />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>

              <div className={`dept-form-group ${errors.email ? 'error' : ''}`}>
                <label><FiMail size={14} /> Email Address *</label>
                <input
                  type="email"
                  placeholder="e.g., transport@college.edu"
                  value={form.email}
                  onChange={(e) => { setForm(f => ({ ...f, email: e.target.value })); setErrors(e2 => ({ ...e2, email: '' })); }}
                />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>

              <div className={`dept-form-group ${errors.departmentType ? 'error' : ''}`}>
                <label><FiBriefcase size={14} /> Department Type *</label>
                <select
                  value={form.departmentType}
                  onChange={(e) => { setForm(f => ({ ...f, departmentType: e.target.value })); setErrors(e2 => ({ ...e2, departmentType: '' })); }}
                >
                  <option value="">Select Department</option>
                  {DEPARTMENT_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                {errors.departmentType && <span className="form-error">{errors.departmentType}</span>}
              </div>

              <div className={`dept-form-group ${errors.mobile ? 'error' : ''}`}>
                <label><FiPhone size={14} /> Mobile Number *</label>
                <input
                  type="tel"
                  placeholder="e.g., 9876543210"
                  value={form.mobile}
                  onChange={(e) => { setForm(f => ({ ...f, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })); setErrors(e2 => ({ ...e2, mobile: '' })); }}
                  maxLength={10}
                />
                {errors.mobile && <span className="form-error">{errors.mobile}</span>}
              </div>
            </div>
            <div className="dept-form-actions">
              <button className="btn-save-dept" onClick={handleSubmit}>
                <FiSave /> {editingId ? 'Update' : 'Add Department Admin'}
              </button>
              <button className="btn-cancel-dept" onClick={resetForm}>Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Cards by Department */}
      {loading ? (
        <div className="dept-loading">
          <div className="spinner"></div>
          <p>Loading department admins...</p>
        </div>
      ) : admins.length === 0 ? (
        <div className="dept-empty">
          <div className="dept-empty-icon">🏢</div>
          <h3>No Department Admins Yet</h3>
          <p>Add department contacts to enable problem forwarding via email & WhatsApp</p>
          <button className="btn-add-dept" onClick={() => setShowForm(true)}>
            <FiUserPlus /> Add First Department
          </button>
        </div>
      ) : (
        <div className="dept-grid">
          {Object.entries(groupedAdmins).map(([dept, deptAdmins]) => (
            <div key={dept} className="dept-group-card">
              <div className="dept-group-header">
                <span className="dept-group-icon">
                  {dept === 'Transport' ? '🚌' :
                   dept === 'Infrastructure' ? '🏗️' :
                   dept === 'Electrical' ? '⚡' :
                   dept === 'Plumbing' ? '🔧' :
                   dept === 'Cleanliness' ? '🧹' :
                   dept === 'Security' ? '🔒' :
                   dept === 'IT / Network' ? '💻' :
                   dept === 'Academics' ? '📚' :
                   dept === 'Hostel' ? '🏠' :
                   dept === 'Canteen' ? '🍽️' : '📋'}
                </span>
                <h3>{dept}</h3>
                <span className="dept-count">{deptAdmins.length}</span>
              </div>

              {deptAdmins.map(admin => (
                <motion.div
                  key={admin.id}
                  className="dept-admin-card"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  layout
                >
                  <div className="dac-info">
                    <div className="dac-avatar">{admin.name.charAt(0).toUpperCase()}</div>
                    <div className="dac-details">
                      <h4>{admin.name}</h4>
                      <p className="dac-email"><FiMail size={12} /> {admin.email}</p>
                      <p className="dac-phone"><FiPhone size={12} /> +91 {admin.mobile}</p>
                    </div>
                  </div>
                  <div className="dac-actions">
                    <button
                      className="dac-btn dac-btn-email"
                      onClick={() => sendTestEmail(admin)}
                      title="Send confirmation email"
                    >
                      <FiSend size={14} />
                    </button>
                    <a
                      href={`https://wa.me/91${admin.mobile}?text=${encodeURIComponent(`Hello ${admin.name}, this is a test message from Smart Campus Detection System.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dac-btn dac-btn-wa"
                      title="WhatsApp"
                    >
                      💬
                    </a>
                    <button
                      className="dac-btn dac-btn-edit"
                      onClick={() => handleEdit(admin)}
                      title="Edit"
                    >
                      <FiEdit size={14} />
                    </button>
                    <button
                      className="dac-btn dac-btn-delete"
                      onClick={() => handleDelete(admin.id, admin.name)}
                      title="Delete"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
