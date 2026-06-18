import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getComplaints, updateComplaint } from '../services/aiEngine';
import { useAuth } from '../context/AuthContext';
import { awardPoints } from '../services/gamification';
import { toast } from 'react-toastify';
import { FiSearch, FiFilter, FiEye, FiChevronDown, FiRefreshCw, FiSend, FiMoreHorizontal } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { fbGetDeptAdmins } from '../services/firebase';
import { sendComplaintToDepartment } from '../services/emailService';
import '../styles/manage.css';

// Predefined problem types for tabs
const PROBLEM_TYPES = [
  'All',
  'Infrastructure',
  'Transport',
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

// How many tabs to show before "More" dropdown
const VISIBLE_TAB_COUNT = 6;

export default function ManageComplaints() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [editingStatus, setEditingStatus] = useState(null);
  const [deptAdmins, setDeptAdmins] = useState([]);
  const [sendingForward, setSendingForward] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  // Close "More" dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const loadComplaints = useCallback(async () => {
    const all = await getComplaints();
    if (user.role === 'student' || user.role === 'staff') {
      setComplaints(all.filter(c => c.userId === user.id));
    } else {
      setComplaints(all);
    }
  }, [user.role, user.id]);

  useEffect(() => {
    loadComplaints();
    fbGetDeptAdmins().then(admins => setDeptAdmins(admins)).catch(() => {});
  }, [loadComplaints]);

  // Build tabs: predefined + any dynamic ones not in predefined
  const complaintCategories = [...new Set(complaints.map(c => c.category))];
  const dynamicTabs = complaintCategories.filter(
    cat => !PROBLEM_TYPES.some(pt => pt.toLowerCase() === cat.toLowerCase())
  );
  const allTabs = [...PROBLEM_TYPES, ...dynamicTabs];

  // Split into visible and overflow
  const visibleTabs = allTabs.slice(0, VISIBLE_TAB_COUNT);
  const overflowTabs = allTabs.slice(VISIBLE_TAB_COUNT);

  // Count per tab
  const tabCounts = useMemo(() => {
    const counts = {};
    allTabs.forEach(tab => {
      if (tab === 'All') {
        counts[tab] = complaints.length;
      } else {
        counts[tab] = complaints.filter(c =>
          c.category.toLowerCase() === tab.toLowerCase()
        ).length;
      }
    });
    return counts;
  }, [complaints, allTabs]);

  const filtered = useMemo(() => {
    let result = [...complaints];

    if (activeTab !== 'All') {
      result = result.filter(c => c.category.toLowerCase() === activeTab.toLowerCase());
    }

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
  }, [complaints, search, activeTab, priorityFilter, statusFilter, sortBy]);

  const handleStatusChange = async (id, newStatus) => {
    const complaint = complaints.find(c => c.id === id);
    const updated = await updateComplaint(id, { status: newStatus, updatedAt: new Date().toISOString() });
    if (updated) {
      if (newStatus === 'Resolved' && complaint) {
        awardPoints(complaint.userId, complaint.userName, 'COMPLAINT_RESOLVED', id);
      }
      loadComplaints();
      toast.success(`Status updated to ${newStatus}`);
    }
    setEditingStatus(null);
  };

  // Forward complaint to department admin — email + WhatsApp/SMS auto
  const handleForwardToDept = async (complaint) => {
    const matchingAdmin = deptAdmins.find(da =>
      da.departmentType.toLowerCase() === complaint.category.toLowerCase()
    );

    if (!matchingAdmin) {
      toast.error(`No department admin found for "${complaint.category}". Add one in Dept Admins page.`);
      return;
    }

    setSendingForward(complaint.id);
    try {
      const result = await sendComplaintToDepartment(complaint, matchingAdmin);
      if (result.success) {
        toast.success(`✅ Problem forwarded to ${matchingAdmin.name} (${matchingAdmin.departmentType}) via email`);
      } else {
        toast.warning('Email might not have been delivered: ' + (result.error || 'SMTP issue'));
      }
    } catch (err) {
      toast.error('Error forwarding: ' + err.message);
    }
    setSendingForward(null);
  };

  // Check if active tab is in overflow
  const isActiveInOverflow = overflowTabs.includes(activeTab);

  return (
    <div className="manage-page">
      <div className="manage-header">
        <div>
          <h1>📋 Manage Complaints</h1>
          <p>{filtered.length} complaint{filtered.length !== 1 ? 's' : ''} found
            {activeTab !== 'All' && <span> in <strong>{activeTab}</strong></span>}
          </p>
        </div>
        <button className="btn-refresh" onClick={loadComplaints}>
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {/* ===== CATEGORY TABS WITH MORE DROPDOWN ===== */}
      <div className="category-tabs-bar">
        <div className="category-tabs">
          {visibleTabs.map(tab => (
            <button
              key={tab}
              className={`category-tab ${activeTab === tab ? 'active' : ''} ${tabCounts[tab] === 0 && tab !== 'All' ? 'empty-tab' : ''}`}
              onClick={() => { setActiveTab(tab); setMoreOpen(false); }}
            >
              <span className="tab-label">{tab}</span>
              <span className="tab-count">{tabCounts[tab] || 0}</span>
            </button>
          ))}

          {/* More dropdown for overflow tabs */}
          {overflowTabs.length > 0 && (
            <div className="more-dropdown-wrapper" ref={moreRef}>
              <button
                className={`category-tab more-tab ${isActiveInOverflow ? 'active' : ''}`}
                onClick={() => setMoreOpen(!moreOpen)}
              >
                <FiMoreHorizontal />
                <span className="tab-label">{isActiveInOverflow ? activeTab : 'More'}</span>
                <FiChevronDown className={`more-arrow ${moreOpen ? 'open' : ''}`} />
              </button>
              {moreOpen && (
                <div className="more-dropdown-menu">
                  {overflowTabs.map(tab => (
                    <button
                      key={tab}
                      className={`more-dropdown-item ${activeTab === tab ? 'active' : ''}`}
                      onClick={() => { setActiveTab(tab); setMoreOpen(false); }}
                    >
                      <span>{tab}</span>
                      <span className="more-item-count">{tabCounts[tab] || 0}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search complaints..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <FiFilter className="filter-icon-label" />
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
            <p>{activeTab !== 'All'
              ? `No complaints in "${activeTab}". Try a different tab.`
              : 'Try adjusting your filters or search query'}
            </p>
          </div>
        ) : (
          filtered.map((complaint, i) => (
            <motion.div
              key={complaint.id}
              className="complaint-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="complaint-card-header">
                <div className="complaint-meta">
                  <span className="complaint-id">{complaint.id.substring(0,8)}</span>
                  <span className={`priority-badge priority-${complaint.priority.toLowerCase()}`}>
                    {complaint.priority}
                  </span>
                  <span className="category-badge">{complaint.category}</span>
                  <span className="confidence-tag">AI: {complaint.confidence}%</span>
                </div>
                <div className="complaint-actions">
                  {user.role === 'admin' && (
                    <>
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
                      <button
                        className="btn-forward"
                        onClick={() => handleForwardToDept(complaint)}
                        disabled={sendingForward === complaint.id}
                        title="Forward to department (Email + WhatsApp)"
                      >
                        {sendingForward === complaint.id ? (
                          <span className="btn-spinner-sm"></span>
                        ) : (
                          <><FiSend /> Send</>
                        )}
                      </button>
                    </>
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
