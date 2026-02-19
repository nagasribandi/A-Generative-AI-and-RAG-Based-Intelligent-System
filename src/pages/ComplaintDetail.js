import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getComplaints, updateComplaint } from '../services/aiEngine';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiCpu, FiFileText, FiMapPin, FiUser, FiCalendar, FiAlertTriangle, FiCheckCircle, FiClock } from 'react-icons/fi';
import { motion } from 'framer-motion';
import '../styles/detail.css';

export default function ComplaintDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const complaints = getComplaints();
    const found = complaints.find(c => c.id === id);
    if (found) setComplaint(found);
    else navigate('/complaints');
  }, [id, navigate]);

  if (!complaint) return <div className="loading-screen"><div className="spinner"></div></div>;

  const handleStatusUpdate = (newStatus) => {
    const updated = updateComplaint(complaint.id, { status: newStatus, updatedAt: new Date().toISOString() });
    if (updated) {
      setComplaint(updated);
      toast.success(`Status updated to ${newStatus}`);
    }
  };

  const statusIcon = {
    'Open': <FiAlertTriangle />,
    'In Progress': <FiClock />,
    'Resolved': <FiCheckCircle />
  };

  return (
    <div className="detail-page">
      <div className="detail-nav">
        <button onClick={() => navigate(-1)} className="btn-back"><FiArrowLeft /> Back</button>
        <span className="complaint-id-badge">{complaint.id}</span>
      </div>

      <motion.div 
        className="detail-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="detail-title-row">
          <h1>{complaint.title}</h1>
          <div className="detail-badges">
            <span className={`priority-badge priority-${complaint.priority.toLowerCase()}`}>
              {complaint.priority} Priority
            </span>
            <span className={`status-badge status-${complaint.status.toLowerCase().replace(' ', '-')}`}>
              {statusIcon[complaint.status]} {complaint.status}
            </span>
          </div>
        </div>
        <div className="detail-meta">
          <span><FiUser /> {complaint.userName}</span>
          <span><FiMapPin /> {complaint.location}</span>
          <span><FiCalendar /> {new Date(complaint.createdAt).toLocaleString()}</span>
          <span><FiCpu /> AI Confidence: {complaint.confidence}%</span>
        </div>
      </motion.div>

      {/* Admin Status Controls */}
      {user.role === 'admin' && (
        <div className="admin-controls">
          <span>Update Status:</span>
          {['Open', 'In Progress', 'Resolved'].map(s => (
            <button
              key={s}
              className={`status-btn ${complaint.status === s ? 'active' : ''}`}
              onClick={() => handleStatusUpdate(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="detail-tabs">
        {['overview', 'ai-analysis', 'action-plan', 'sops'].map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' && '📄 Overview'}
            {tab === 'ai-analysis' && '🤖 AI Analysis'}
            {tab === 'action-plan' && '📋 Action Plan'}
            {tab === 'sops' && '📚 SOPs'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div 
        className="detail-content"
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'overview' && (
          <div className="tab-overview">
            <div className="info-grid">
              <div className="info-card">
                <h4>Description</h4>
                <p>{complaint.description}</p>
              </div>
              <div className="info-card">
                <h4>Details</h4>
                <div className="detail-list">
                  <div className="detail-item">
                    <span className="detail-label">Complaint ID</span>
                    <span className="detail-val">{complaint.id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Submitted By</span>
                    <span className="detail-val">{complaint.userName} ({complaint.userEmail})</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Location</span>
                    <span className="detail-val">{complaint.location}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Category</span>
                    <span className="detail-val category-badge">{complaint.category}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Priority</span>
                    <span className={`detail-val priority-badge priority-${complaint.priority.toLowerCase()}`}>{complaint.priority}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status</span>
                    <span className={`detail-val status-badge status-${complaint.status.toLowerCase().replace(' ', '-')}`}>{complaint.status}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Created</span>
                    <span className="detail-val">{new Date(complaint.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Last Updated</span>
                    <span className="detail-val">{new Date(complaint.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ai-analysis' && (
          <div className="tab-ai">
            <div className="ai-results-grid">
              <div className="ai-card">
                <div className="ai-card-icon" style={{ background: '#eef2ff', color: '#6366f1' }}><FiCpu /></div>
                <h4>Predicted Category</h4>
                <div className="ai-value">{complaint.predictedCategory || complaint.category}</div>
                <div className="confidence-bar-detail">
                  <div className="confidence-fill-detail" style={{ width: `${complaint.confidence}%` }}></div>
                </div>
                <span className="confidence-text">{complaint.confidence}% confidence</span>
              </div>

              <div className="ai-card">
                <div className="ai-card-icon" style={{ background: '#fef2f2', color: '#ef4444' }}><FiAlertTriangle /></div>
                <h4>Priority Level</h4>
                <div className={`ai-value priority-text-${complaint.priority.toLowerCase()}`}>
                  {complaint.priority}
                </div>
                <p className="ai-desc">
                  {complaint.priority === 'High' ? 'Requires immediate attention' : 
                   complaint.priority === 'Medium' ? 'Standard response timeline' : 'Routine handling'}
                </p>
              </div>

              <div className="ai-card full-width">
                <h4>🤖 AI-Generated Summary</h4>
                <p className="ai-summary">{complaint.aiSummary}</p>
              </div>

              {complaint.ragResponse && (
                <div className="ai-card full-width">
                  <h4>📊 RAG Analysis</h4>
                  <p className="ai-summary">{complaint.ragResponse.generatedSummary}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'action-plan' && complaint.ragResponse && (
          <div className="tab-action-plan">
            <div className="action-plan-header">
              <h3>🎯 AI-Generated Action Plan</h3>
              <p>Step-by-step resolution guide generated by RAG pipeline based on relevant SOPs</p>
            </div>
            <div className="action-steps">
              {complaint.ragResponse.actionPlan.map((step, i) => (
                <motion.div 
                  key={i} 
                  className="action-step"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="step-number">{i + 1}</div>
                  <div className="step-content">
                    <p>{step}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'sops' && complaint.ragResponse && (
          <div className="tab-sops">
            <div className="sops-header">
              <h3>📚 Retrieved Standard Operating Procedures</h3>
              <p>Relevant SOPs retrieved through RAG pipeline for {complaint.category} category</p>
            </div>
            <div className="sop-cards">
              {complaint.ragResponse.sops.map((sop, i) => (
                <motion.div 
                  key={i} 
                  className="sop-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <FiFileText className="sop-icon" />
                  <div>
                    <h4>{sop}</h4>
                    <p>Standard operating procedure for handling {complaint.category.toLowerCase()} related issues on campus.</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="rag-note">
              <strong>RAG Pipeline Note:</strong> These SOPs were retrieved from the campus knowledge base 
              using semantic similarity matching against the complaint text. The action plan was generated 
              by the GenAI model using these SOPs as context.
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
