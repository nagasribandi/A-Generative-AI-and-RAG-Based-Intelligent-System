import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { classifyComplaint, predictPriority, generateRAGResponse, generateAISummary, saveComplaint } from '../services/aiEngine';
import { sendUrgentComplaintEmail } from '../services/emailService';
import { FiSend, FiCpu, FiMapPin, FiFileText, FiAlertTriangle, FiCheckCircle, FiLoader, FiMail } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/submit.css';

export default function SubmitComplaint() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: ''
  });
  const [errors, setErrors] = useState({});
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const locations = [
    'Block 1 - Ground Floor',
    'Block 1 - 1st Floor',
    'Block 1 - 2nd Floor',
    'Block 1 - Computer Lab 1',
    'Block 1 - Computer Lab 2',
    'Block 1 - Server Room',
    'Block 2 - Ground Floor',
    'Block 2 - 1st Floor',
    'Block 2 - 2nd Floor',
    'Block 3 - Ground Floor',
    'Block 3 - 1st Floor',
    'Block 3 - Room 101-110',
    'Block 3 - Room 201-210',
    'Block 4 - Ground Floor',
    'Block 4 - 1st Floor',
    'Block 5 - Ground Floor',
    'Block 5 - 1st Floor',
    'Library - Ground Floor',
    'Library - 1st Floor',
    'Hostel - Boys Block A',
    'Hostel - Boys Block B',
    'Hostel - Girls Block A',
    'Hostel - Girls Block B',
    'Sports Ground',
    'Parking Area',
    'Campus Grounds',
    'Other'
  ];

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
    // Reset AI analysis when text changes
    if (field === 'description' && aiAnalysis) {
      setAiAnalysis(null);
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) errs.title = 'Title is required';
    else if (formData.title.trim().length < 5) errs.title = 'Title must be at least 5 characters';
    if (!formData.description.trim()) errs.description = 'Description is required';
    else if (formData.description.trim().length < 20) errs.description = 'Please provide a more detailed description (at least 20 characters)';
    if (!formData.location) errs.location = 'Please select a location';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAnalyze = async () => {
    if (!formData.description.trim() || formData.description.trim().length < 10) {
      toast.warning('Please enter a more detailed description for AI analysis');
      return;
    }

    setAnalyzing(true);
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const classification = classifyComplaint(formData.description);
    const priority = predictPriority(formData.description);
    const ragResponse = generateRAGResponse(classification.category);
    const summary = generateAISummary(formData.description, classification.category, priority.level);

    setAiAnalysis({
      ...classification,
      priority,
      ragResponse,
      summary
    });
    setAnalyzing(false);
    toast.info('AI analysis complete! Review the results below.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!aiAnalysis) {
      toast.warning('Please run AI analysis first before submitting');
      return;
    }

    setSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const complaint = {
      id: 'CMP-' + String(Date.now()).slice(-6),
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      title: formData.title,
      description: formData.description,
      location: formData.location,
      category: aiAnalysis.category,
      predictedCategory: aiAnalysis.category,
      confidence: aiAnalysis.confidence,
      priority: aiAnalysis.priority.level,
      status: 'Open',
      aiSummary: aiAnalysis.summary,
      ragResponse: aiAnalysis.ragResponse,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    saveComplaint(complaint);
    
    // Send urgent email to admins if complaint is High priority
    if (complaint.priority === 'High') {
      const emailResult = await sendUrgentComplaintEmail(complaint);
      if (emailResult.success) {
        if (emailResult.demo) {
          toast.info('📧 Demo: Admin notification would be sent for this urgent complaint');
        } else {
          toast.info('📧 Admins have been notified via email about this urgent complaint');
        }
      }
    }
    
    setSubmitted(true);
    setSubmitting(false);
    toast.success('Complaint submitted successfully!');
    
    setTimeout(() => navigate('/complaints'), 2000);
  };

  if (submitted) {
    return (
      <div className="submit-page">
        <motion.div 
          className="success-card"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <FiCheckCircle className="success-icon" />
          <h2>Complaint Submitted!</h2>
          <p>Your complaint has been classified as <strong>{aiAnalysis.category}</strong> with 
          <strong> {aiAnalysis.priority.level}</strong> priority.</p>
          <p>The AI has generated an action plan and it has been routed to the appropriate department.</p>
          {aiAnalysis.priority.level === 'High' && (
            <p className="urgent-email-notice"><FiMail /> 📧 Admin team has been notified via email for immediate action</p>
          )}
          <p className="redirect-text">Redirecting to complaints...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="submit-page">
      <div className="submit-header">
        <h1><FiFileText /> Submit New Complaint</h1>
        <p>Describe your issue and let AI classify and prioritize it automatically</p>
      </div>

      <div className="submit-layout">
        {/* Form Section */}
        <div className="submit-form-section">
          <form onSubmit={handleSubmit} noValidate>
            <div className={`form-group ${errors.title ? 'error' : ''}`}>
              <label>Complaint Title</label>
              <input
                type="text"
                placeholder="Brief title describing the issue"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                maxLength={100}
              />
              <div className="char-count">{formData.title.length}/100</div>
              {errors.title && <span className="error-text">{errors.title}</span>}
            </div>

            <div className={`form-group ${errors.description ? 'error' : ''}`}>
              <label>Detailed Description</label>
              <textarea
                placeholder="Describe the problem in detail. Include what, where, when, and severity. The more detail you provide, the better the AI classification will be..."
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={6}
                maxLength={2000}
              />
              <div className="char-count">{formData.description.length}/2000</div>
              {errors.description && <span className="error-text">{errors.description}</span>}
            </div>

            <div className={`form-group ${errors.location ? 'error' : ''}`}>
              <label><FiMapPin /> Location</label>
              <select
                value={formData.location}
                onChange={(e) => updateField('location', e.target.value)}
              >
                <option value="">Select location of the issue</option>
                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
              {errors.location && <span className="error-text">{errors.location}</span>}
            </div>

            {/* AI Analyze Button */}
            <button 
              type="button" 
              className="btn-analyze" 
              onClick={handleAnalyze}
              disabled={analyzing || !formData.description.trim()}
            >
              {analyzing ? (
                <>
                  <FiLoader className="spin" /> Analyzing with GenAI...
                </>
              ) : (
                <>
                  <FiCpu /> Analyze with AI
                </>
              )}
            </button>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="btn-submit-complaint"
              disabled={submitting || !aiAnalysis}
            >
              {submitting ? (
                <>
                  <FiLoader className="spin" /> Submitting...
                </>
              ) : (
                <>
                  <FiSend /> Submit Complaint
                </>
              )}
            </button>
          </form>
        </div>

        {/* AI Analysis Panel */}
        <div className="ai-analysis-panel">
          <AnimatePresence>
            {!aiAnalysis && !analyzing && (
              <motion.div 
                className="analysis-placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <FiCpu className="placeholder-icon" />
                <h3>AI Analysis</h3>
                <p>Enter your complaint description and click "Analyze with AI" to get automatic classification, priority prediction, and recommended action plan.</p>
              </motion.div>
            )}

            {analyzing && (
              <motion.div 
                className="analyzing-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="ai-pulse"></div>
                <h3>🤖 AI Processing...</h3>
                <p>Running GenAI classification model...</p>
                <p>Querying RAG pipeline for SOPs...</p>
                <p>Generating action plan...</p>
              </motion.div>
            )}

            {aiAnalysis && !analyzing && (
              <motion.div 
                className="analysis-results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3>🤖 AI Analysis Results</h3>

                {/* Category */}
                <div className="result-card">
                  <div className="result-header">
                    <span className="result-label">Predicted Category</span>
                    <span className="confidence-badge">{aiAnalysis.confidence}% confidence</span>
                  </div>
                  <div className="result-value category-value">{aiAnalysis.category}</div>
                  <div className="confidence-bar">
                    <div 
                      className="confidence-fill" 
                      style={{ width: `${aiAnalysis.confidence}%` }}
                    ></div>
                  </div>
                </div>

                {/* Priority */}
                <div className="result-card">
                  <div className="result-header">
                    <span className="result-label">Priority Level</span>
                    <FiAlertTriangle style={{ color: aiAnalysis.priority.color }} />
                  </div>
                  <div className="result-value">
                    <span 
                      className="priority-indicator"
                      style={{ backgroundColor: aiAnalysis.priority.color }}
                    ></span>
                    {aiAnalysis.priority.level} Priority
                  </div>
                </div>

                {/* AI Summary */}
                <div className="result-card">
                  <div className="result-header">
                    <span className="result-label">AI Summary</span>
                  </div>
                  <p className="ai-summary-text">{aiAnalysis.summary}</p>
                </div>

                {/* SOPs */}
                <div className="result-card">
                  <div className="result-header">
                    <span className="result-label">Retrieved SOPs (RAG)</span>
                  </div>
                  <ul className="sop-list">
                    {aiAnalysis.ragResponse.sops.map((sop, i) => (
                      <li key={i}><FiFileText /> {sop}</li>
                    ))}
                  </ul>
                </div>

                {/* Action Plan */}
                <div className="result-card action-plan-card">
                  <div className="result-header">
                    <span className="result-label">Generated Action Plan</span>
                  </div>
                  <ol className="action-plan-list">
                    {aiAnalysis.ragResponse.actionPlan.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
