import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMapPin, FiAlertCircle, FiCheckCircle, FiClock, FiFilter, FiChevronRight, FiTrendingUp, FiShield } from 'react-icons/fi';
import CampusHeatmap, { CAMPUS_ZONES } from '../components/CampusHeatmap';
import { getComplaints } from '../services/aiEngine';
import { useAuth } from '../context/AuthContext';
import '../styles/heatmap.css';

export default function Heatmap() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedZone, setSelectedZone] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    getComplaints().then(data => setComplaints(data));
  }, []);

  // Get complaints for the selected zone
  const zoneComplaints = useMemo(() => {
    if (!selectedZone) return [];
    return complaints.filter(c =>
      selectedZone.matchPatterns.some(pattern =>
        c.location?.toLowerCase().includes(pattern.toLowerCase())
      )
    );
  }, [selectedZone, complaints]);

  // Filtered zone complaints based on status
  const filteredZoneComplaints = useMemo(() => {
    if (filterStatus === 'all') return zoneComplaints;
    return zoneComplaints.filter(c =>
      c.status?.toLowerCase().replace(/\s+/g, '-') === filterStatus
    );
  }, [zoneComplaints, filterStatus]);

  // Stats for selected zone
  const zoneStats = useMemo(() => {
    if (!zoneComplaints.length) return null;
    const open = zoneComplaints.filter(c => c.status === 'Open').length;
    const inProgress = zoneComplaints.filter(c => c.status === 'In Progress').length;
    const resolved = zoneComplaints.filter(c => c.status === 'Resolved').length;
    const highPriority = zoneComplaints.filter(c => c.priority === 'High').length;
    const categories = {};
    zoneComplaints.forEach(c => {
      categories[c.category] = (categories[c.category] || 0) + 1;
    });
    return { open, inProgress, resolved, highPriority, categories, total: zoneComplaints.length };
  }, [zoneComplaints]);

  // Campus-wide stats
  const campusStats = useMemo(() => {
    const total = complaints.length;
    const open = complaints.filter(c => c.status === 'Open').length;
    const highPriority = complaints.filter(c => c.priority === 'High').length;

    // Find hotspot zone
    let hotspotZone = null;
    let maxCount = 0;
    CAMPUS_ZONES.forEach(zone => {
      const count = complaints.filter(c =>
        zone.matchPatterns.some(p => c.location?.toLowerCase().includes(p.toLowerCase()))
      ).length;
      if (count > maxCount) {
        maxCount = count;
        hotspotZone = zone.label;
      }
    });

    return { total, open, highPriority, hotspotZone, hotspotCount: maxCount };
  }, [complaints]);

  const handleZoneSelect = useCallback((zone) => {
    setSelectedZone(prev => prev?.id === zone.id ? null : zone);
  }, []);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return '#e74c3c';
      case 'Medium': return '#f39c12';
      case 'Low': return '#2ecc71';
      default: return '#95a5a6';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Open': return <FiAlertCircle style={{ color: '#e74c3c' }} />;
      case 'In Progress': return <FiClock style={{ color: '#f39c12' }} />;
      case 'Resolved': return <FiCheckCircle style={{ color: '#2ecc71' }} />;
      default: return <FiAlertCircle />;
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffH = Math.floor((now - d) / 3600000);
    if (diffH < 1) return 'Just now';
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <motion.div
      className="heatmap-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Page Header */}
      <div className="heatmap-header">
        <div className="heatmap-title-section">
          <h1><FiMapPin /> Campus Heatmap</h1>
          <p>Interactive visualization of complaint density across campus zones</p>
        </div>
        <div className="heatmap-filter-bar">
          <FiFilter />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="heatmap-status-filter"
          >
            <option value="all">All Complaints</option>
            <option value="open">Open Only</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Campus-wide Quick Stats */}
      <div className="campus-quick-stats">
        <div className="quick-stat">
          <FiMapPin className="qs-icon" />
          <div>
            <span className="qs-value">{campusStats.total}</span>
            <span className="qs-label">Total Complaints</span>
          </div>
        </div>
        <div className="quick-stat alert">
          <FiAlertCircle className="qs-icon" />
          <div>
            <span className="qs-value">{campusStats.open}</span>
            <span className="qs-label">Open Issues</span>
          </div>
        </div>
        <div className="quick-stat danger">
          <FiShield className="qs-icon" />
          <div>
            <span className="qs-value">{campusStats.highPriority}</span>
            <span className="qs-label">High Priority</span>
          </div>
        </div>
        <div className="quick-stat hotspot">
          <FiTrendingUp className="qs-icon" />
          <div>
            <span className="qs-value">{campusStats.hotspotZone || 'N/A'}</span>
            <span className="qs-label">Hotspot ({campusStats.hotspotCount} issues)</span>
          </div>
        </div>
      </div>

      {/* Main Content: Map + Sidebar */}
      <div className="heatmap-content">
        {/* Map Area */}
        <div className="heatmap-map-area">
          <CampusHeatmap
            complaints={complaints}
            selectedZone={selectedZone}
            onZoneSelect={handleZoneSelect}
            filterStatus={filterStatus}
          />
        </div>

        {/* Sidebar Panel */}
        <AnimatePresence mode="wait">
          {selectedZone ? (
            <motion.div
              className="heatmap-sidebar"
              key={selectedZone.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.3 }}
            >
              {/* Zone Header */}
              <div className="zone-panel-header">
                <h2><FiMapPin /> {selectedZone.label}</h2>
                <button className="zone-close-btn" onClick={() => setSelectedZone(null)}>✕</button>
              </div>

              {/* Zone Stats */}
              {zoneStats && (
                <div className="zone-stats-grid">
                  <div className="zone-stat open">
                    <span className="zs-count">{zoneStats.open}</span>
                    <span className="zs-label">Open</span>
                  </div>
                  <div className="zone-stat progress">
                    <span className="zs-count">{zoneStats.inProgress}</span>
                    <span className="zs-label">In Progress</span>
                  </div>
                  <div className="zone-stat resolved">
                    <span className="zs-count">{zoneStats.resolved}</span>
                    <span className="zs-label">Resolved</span>
                  </div>
                  <div className="zone-stat high">
                    <span className="zs-count">{zoneStats.highPriority}</span>
                    <span className="zs-label">High Priority</span>
                  </div>
                </div>
              )}

              {/* Category Breakdown */}
              {zoneStats && Object.keys(zoneStats.categories).length > 0 && (
                <div className="zone-categories">
                  <h3>Category Breakdown</h3>
                  <div className="category-bars">
                    {Object.entries(zoneStats.categories)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, count]) => (
                        <div className="cat-bar-row" key={cat}>
                          <span className="cat-name">{cat}</span>
                          <div className="cat-bar-track">
                            <motion.div
                              className="cat-bar-fill"
                              initial={{ width: 0 }}
                              animate={{ width: `${(count / zoneStats.total) * 100}%` }}
                              transition={{ duration: 0.5, delay: 0.1 }}
                            />
                          </div>
                          <span className="cat-count">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Complaint List */}
              <div className="zone-complaints-list">
                <h3>
                  Complaints ({filteredZoneComplaints.length})
                  {filterStatus !== 'all' && <span className="filter-tag">{filterStatus}</span>}
                </h3>
                {filteredZoneComplaints.length === 0 ? (
                  <div className="zone-empty">
                    <p>No complaints found for this zone{filterStatus !== 'all' ? ` with status "${filterStatus}"` : ''}.</p>
                  </div>
                ) : (
                  filteredZoneComplaints.map(complaint => (
                    <motion.div
                      key={complaint.id}
                      className="zone-complaint-card"
                      onClick={() => navigate(`/complaint/${complaint.id}`)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="zcc-top">
                        <span className="zcc-status">{getStatusIcon(complaint.status)} {complaint.status}</span>
                        <span
                          className="zcc-priority"
                          style={{ color: getPriorityColor(complaint.priority) }}
                        >
                          {complaint.priority}
                        </span>
                      </div>
                      <h4 className="zcc-title">{complaint.title}</h4>
                      <div className="zcc-meta">
                        <span className="zcc-category">{complaint.category}</span>
                        <span className="zcc-date">{formatDate(complaint.createdAt)}</span>
                      </div>
                      <span className="zcc-arrow"><FiChevronRight /></span>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Admin Insight */}
              {user?.role === 'admin' && zoneStats && zoneStats.open > 0 && (
                <div className="zone-admin-insight">
                  <FiShield />
                  <p>
                    <strong>{selectedZone.label}</strong> has <strong>{zoneStats.open} unresolved</strong> issue{zoneStats.open > 1 ? 's' : ''}.
                    {zoneStats.highPriority > 0 && (
                      <span className="insight-warning"> {zoneStats.highPriority} require{zoneStats.highPriority === 1 ? 's' : ''} urgent attention!</span>
                    )}
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              className="heatmap-sidebar placeholder"
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="sidebar-placeholder-content">
                <div className="placeholder-icon">🗺️</div>
                <h3>Select a Zone</h3>
                <p>Click on any zone on the campus map to view detailed complaint information, category breakdown, and action items.</p>
                <div className="placeholder-tips">
                  <div className="tip">🎨 <span>Colors indicate complaint density</span></div>
                  <div className="tip">🖱️ <span>Hover over zones for quick stats</span></div>
                  <div className="tip">📋 <span>Click a zone to see all complaints</span></div>
                  <div className="tip">🔍 <span>Use the filter to narrow by status</span></div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
