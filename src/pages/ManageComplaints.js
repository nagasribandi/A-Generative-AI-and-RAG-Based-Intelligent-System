import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getComplaints, updateComplaint } from '../services/aiEngine';
import { useAuth } from '../context/AuthContext';
import { awardPoints } from '../services/gamification';
import { toast } from 'react-toastify';
import { FiSearch, FiFilter, FiEye, FiChevronDown, FiRefreshCw } from 'react-icons/fi';
import { motion } from 'framer-motion';
import '../styles/manage.css';

export default function ManageComplaints() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [editingStatus, setEditingStatus] = useState(null);

  const loadComplaints = useCallback(() => {
    const all = getComplaints();
    if (user.role === 'student') {
      setComplaints(all.filter(c => c.userId === user.id));
    } else {
      setComplaints(all);
    }
  }, [user.role, user.id]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const categories = [...new Set(complaints.map(c => c.category))];

  const filtered = useMemo(() => {
    let result = [...complaints];
    
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => 
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.userName.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== 'all') result = result.filter(c => c.category === categoryFilter);
    if (priorityFilter !== 'all') result = result.filter(c => c.priority === priorityFilter);
    if (statusFilter !== 'all') result = result.filter(c => c.status === statusFilter);

    switch (sortBy) {
      case 'newest': result.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
      case 'oldest': result.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
      case 'priority': {
        const order = { 'High': 0, 'Medium': 1, 'Low': 2 };
        result.sort((a,b) => order[a.priority] - order[b.priority]);
        break;
      }
      case 'confidence': result.sort((a,b) => b.confidence - a.confidence); break;
      default: break;
    }

    return result;
  }, [complaints, search, categoryFilter, priorityFilter, statusFilter, sortBy]);

  const handleStatusChange = (id, newStatus) => {
    const complaint = complaints.find(c => c.id === id);
    const updated = updateComplaint(id, { status: newStatus, updatedAt: new Date().toISOString() });
    if (updated) {
      // Award points to the complaint author when resolved
      if (newStatus === 'Resolved' && complaint) {
        awardPoints(complaint.userId, complaint.userName, 'COMPLAINT_RESOLVED', id);
      }
      loadComplaints();
      toast.success(`Status updated to ${newStatus}`);
    }
    setEditingStatus(null);
  };

  return (
    <div className="manage-page">
      <div className="manage-header">
        <div>
          <h1>📋 Manage Complaints</h1>
          <p>{filtered.length} complaint{filtered.length !== 1 ? 's' : ''} found</p>
        </div>
        <button className="btn-refresh" onClick={loadComplaints}>
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search complaints by title, ID, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <FiFilter />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="all">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="priority">By Priority</option>
            <option value="confidence">By AI Confidence</option>
          </select>
        </div>
      </div>

      {/* Complaints List */}
      <div className="complaints-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <h3>No complaints found</h3>
            <p>Try adjusting your filters or search query</p>
          </div>
        ) : (
          filtered.map((complaint, i) => (
            <motion.div 
              key={complaint.id} 
              className="complaint-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="complaint-card-header">
                <div className="complaint-meta">
                  <span className="complaint-id">{complaint.id}</span>
                  <span className={`priority-badge priority-${complaint.priority.toLowerCase()}`}>
                    {complaint.priority}
                  </span>
                  <span className="category-badge">{complaint.category}</span>
                  <span className="confidence-tag">AI: {complaint.confidence}%</span>
                </div>
                <div className="complaint-actions">
                  {user.role === 'admin' && (
                    <div className="status-dropdown">
                      <button 
                        className={`status-badge status-${complaint.status.toLowerCase().replace(' ', '-')}`}
                        onClick={() => setEditingStatus(editingStatus === complaint.id ? null : complaint.id)}
                      >
                        {complaint.status} <FiChevronDown />
                      </button>
                      {editingStatus === complaint.id && (
                        <div className="status-menu">
                          {['Open', 'In Progress', 'Resolved'].map(s => (
                            <button key={s} onClick={() => handleStatusChange(complaint.id, s)}>{s}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {user.role !== 'admin' && (
                    <span className={`status-badge status-${complaint.status.toLowerCase().replace(' ', '-')}`}>
                      {complaint.status}
                    </span>
                  )}
                  <Link to={`/complaint/${complaint.id}`} className="btn-view">
                    <FiEye /> View
                  </Link>
                </div>
              </div>

              <h3 className="complaint-title">{complaint.title}</h3>
              <p className="complaint-desc">{complaint.description.substring(0, 200)}...</p>

              <div className="complaint-footer">
                <div className="complaint-info">
                  <span>📍 {complaint.location}</span>
                  <span>👤 {complaint.userName}</span>
                  <span>📅 {new Date(complaint.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
