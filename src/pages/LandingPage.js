import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiShield, FiCpu, FiBarChart2, FiZap, FiUsers, FiCheckCircle } from 'react-icons/fi';
import '../styles/landing.css';

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="nav-brand">
          <FiShield className="brand-icon" />
          <span>SmartCampus AI</span>
        </div>
        <div className="nav-links">
          <Link to="/login" className="nav-link">Login</Link>
          <Link to="/signup" className="nav-btn-primary">Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <motion.div 
          className="hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="hero-badge">🤖 Powered by Generative AI + RAG</div>
          <h1>Smart Campus<br/><span className="gradient-text">Problem Detection System</span></h1>
          <p className="hero-description">
            Automatically classify student complaints, predict priority levels, and generate 
            AI-powered action plans using Retrieval-Augmented Generation. Transform campus 
            management with intelligent automation.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="btn-hero-primary">
              <FiZap /> Start Free
            </Link>
            <Link to="/login" className="btn-hero-secondary">
              Admin Login →
            </Link>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <strong>95%</strong>
              <span>Classification Accuracy</span>
            </div>
            <div className="stat-item">
              <strong>10x</strong>
              <span>Faster Resolution</span>
            </div>
            <div className="stat-item">
              <strong>50+</strong>
              <span>SOPs Indexed</span>
            </div>
          </div>
        </motion.div>
        <motion.div 
          className="hero-visual"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="dashboard-preview">
            <div className="preview-header">
              <div className="preview-dots">
                <span></span><span></span><span></span>
              </div>
              <span>AI Analysis Dashboard</span>
            </div>
            <div className="preview-body">
              <div className="preview-card pc-blue">
                <FiCpu />
                <div>
                  <small>AI Classification</small>
                  <strong>Electrical Issue</strong>
                </div>
                <span className="confidence">92%</span>
              </div>
              <div className="preview-card pc-red">
                <FiShield />
                <div>
                  <small>Priority Level</small>
                  <strong>High Priority</strong>
                </div>
                <span className="priority-dot high"></span>
              </div>
              <div className="preview-card pc-green">
                <FiCheckCircle />
                <div>
                  <small>RAG Response</small>
                  <strong>8-Step Action Plan</strong>
                </div>
                <span className="sop-badge">3 SOPs</span>
              </div>
              <div className="preview-chart">
                <div className="chart-bar" style={{height: '60%'}}></div>
                <div className="chart-bar" style={{height: '80%'}}></div>
                <div className="chart-bar" style={{height: '45%'}}></div>
                <div className="chart-bar" style={{height: '90%'}}></div>
                <div className="chart-bar" style={{height: '70%'}}></div>
                <div className="chart-bar" style={{height: '55%'}}></div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <motion.h2 
          initial={{ opacity: 0 }} 
          whileInView={{ opacity: 1 }} 
          viewport={{ once: true }}
        >
          How It Works
        </motion.h2>
        <p className="section-subtitle">
          Our AI pipeline processes complaints in real-time using advanced NLP and RAG
        </p>
        <div className="features-grid">
          {[
            { icon: <FiCpu />, title: 'AI Classification', desc: 'Generative AI automatically analyzes complaint text and predicts the appropriate issue category with high confidence scores.', color: '#6366f1' },
            { icon: <FiZap />, title: 'Priority Prediction', desc: 'Intelligent priority engine evaluates urgency keywords and context to assign High, Medium, or Low priority levels instantly.', color: '#f59e0b' },
            { icon: <FiShield />, title: 'RAG-Powered Solutions', desc: 'Retrieval-Augmented Generation fetches relevant SOPs and generates step-by-step action plans for administrators.', color: '#22c55e' },
            { icon: <FiBarChart2 />, title: 'Interactive Dashboard', desc: 'Visual analytics showing complaint trends, category distribution, resolution rates, and performance metrics.', color: '#ec4899' },
            { icon: <FiUsers />, title: 'Smart Routing', desc: 'Complaints are automatically routed to the correct department based on AI classification, eliminating manual sorting.', color: '#06b6d4' },
            { icon: <FiCheckCircle />, title: 'Resolution Tracking', desc: 'End-to-end complaint lifecycle management with status updates, escalation triggers, and satisfaction feedback.', color: '#8b5cf6' }
          ].map((feature, i) => (
            <motion.div 
              key={i} 
              className="feature-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="feature-icon" style={{ background: `${feature.color}20`, color: feature.color }}>
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <motion.div 
          className="cta-content"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2>Ready to Transform Your Campus?</h2>
          <p>Join the AI-driven smart campus revolution. Start automating complaint management today.</p>
          <Link to="/signup" className="btn-cta">Get Started Free →</Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <FiShield /> SmartCampus AI
          </div>
          <p>© 2026 Smart Campus Problem Detection System. Built with Generative AI & RAG.</p>
        </div>
      </footer>
    </div>
  );
}
