import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiPhone, FiBookOpen, FiHash, FiSave, FiShield } from 'react-icons/fi';
import { motion } from 'framer-motion';
import '../styles/profile.css';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    department: user?.department || ''
  });

  const handleSave = () => {
    updateProfile(formData);
    setEditing(false);
    toast.success('Profile updated successfully!');
  };

  return (
    <div className="profile-page">
      <motion.div 
        className="profile-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="profile-header">
          <div className="profile-avatar">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <h1>{user?.name}</h1>
            <span className={`role-badge ${user?.role}`}>
              <FiShield /> {user?.role === 'admin' ? 'Administrator' : 'Student'}
            </span>
          </div>
        </div>

        <div className="profile-details">
          <div className="detail-row">
            <FiMail />
            <div>
              <label>Email</label>
              <span>{user?.email}</span>
            </div>
          </div>

          <div className="detail-row">
            <FiUser />
            <div>
              <label>Full Name</label>
              {editing ? (
                <input value={formData.name} onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} />
              ) : (
                <span>{user?.name}</span>
              )}
            </div>
          </div>

          <div className="detail-row">
            <FiBookOpen />
            <div>
              <label>Department</label>
              {editing ? (
                <input value={formData.department} onChange={(e) => setFormData(p => ({...p, department: e.target.value}))} />
              ) : (
                <span>{user?.department || 'Not set'}</span>
              )}
            </div>
          </div>

          <div className="detail-row">
            <FiHash />
            <div>
              <label>{user?.role === 'admin' ? 'Admin ID' : 'Student ID'}</label>
              <span>{user?.studentId || 'Not set'}</span>
            </div>
          </div>

          <div className="detail-row">
            <FiPhone />
            <div>
              <label>Phone</label>
              {editing ? (
                <input value={formData.phone} onChange={(e) => setFormData(p => ({...p, phone: e.target.value}))} />
              ) : (
                <span>{user?.phone || 'Not set'}</span>
              )}
            </div>
          </div>

          <div className="detail-row">
            <FiBookOpen />
            <div>
              <label>Member Since</label>
              <span>{new Date(user?.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="profile-actions">
          {editing ? (
            <>
              <button className="btn-save" onClick={handleSave}><FiSave /> Save Changes</button>
              <button className="btn-cancel" onClick={() => setEditing(false)}>Cancel</button>
            </>
          ) : (
            <button className="btn-edit" onClick={() => setEditing(true)}>Edit Profile</button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
