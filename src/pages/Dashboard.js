import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getComplaints } from '../services/aiEngine';
import { Doughnut, Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Filler
} from 'chart.js';
import { FiAlertCircle, FiCheckCircle, FiClock, FiTrendingUp, FiPlus, FiArrowRight, FiCpu } from 'react-icons/fi';
import { motion } from 'framer-motion';
import '../styles/dashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler);

export default function Dashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => {
    setComplaints(getComplaints());
  }, []);

  const stats = {
    total: complaints.length,
    open: complaints.filter(c => c.status === 'Open').length,
    inProgress: complaints.filter(c => c.status === 'In Progress').length,
    resolved: complaints.filter(c => c.status === 'Resolved').length,
    highPriority: complaints.filter(c => c.priority === 'High').length
  };

  // Category Distribution
  const categoryData = () => {
    const cats = {};
    complaints.forEach(c => { cats[c.category] = (cats[c.category] || 0) + 1; });
    return {
      labels: Object.keys(cats),
      datasets: [{
        data: Object.values(cats),
        backgroundColor: ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316', '#14b8a6', '#64748b'],
        borderWidth: 0,
        hoverOffset: 8
      }]
    };
  };

  // Priority Distribution
  const priorityData = {
    labels: ['High', 'Medium', 'Low'],
    datasets: [{
      data: [
        complaints.filter(c => c.priority === 'High').length,
        complaints.filter(c => c.priority === 'Medium').length,
        complaints.filter(c => c.priority === 'Low').length
      ],
      backgroundColor: ['#ef4444', '#f59e0b', '#22c55e'],
      borderWidth: 0
    }]
  };

  // Weekly Trend
  const trendData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Complaints',
      data: [3, 5, 2, 8, 4, 1, 2],
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#6366f1',
      pointBorderWidth: 2,
      pointRadius: 4
    }]
  };

  // Category Bar Chart
  const barData = () => {
    const cats = {};
    complaints.forEach(c => { cats[c.category] = (cats[c.category] || 0) + 1; });
    return {
      labels: Object.keys(cats),
      datasets: [{
        label: 'Complaints',
        data: Object.values(cats),
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderRadius: 8,
        barThickness: 30
      }]
    };
  };

  const recentComplaints = complaints.slice(0, 5);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } }
  };

  return (
    <div className="dashboard-page">
      {/* Welcome Header */}
      <div className="dashboard-header">
        <div>
          <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </motion.h1>
          <p>Here's what's happening on campus today</p>
        </div>
        <div className="header-actions">
          <Link to="/submit-complaint" className="btn-primary">
            <FiPlus /> New Complaint
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {[
          { label: 'Total Complaints', value: stats.total, icon: <FiTrendingUp />, color: '#6366f1', bg: '#eef2ff' },
          { label: 'Open Issues', value: stats.open, icon: <FiAlertCircle />, color: '#ef4444', bg: '#fef2f2' },
          { label: 'In Progress', value: stats.inProgress, icon: <FiClock />, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Resolved', value: stats.resolved, icon: <FiCheckCircle />, color: '#22c55e', bg: '#f0fdf4' }
        ].map((stat, i) => (
          <motion.div 
            key={i} 
            className="stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="stat-icon" style={{ background: stat.bg, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* AI Insight Banner */}
      <motion.div 
        className="ai-insight-banner"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="ai-icon"><FiCpu /></div>
        <div className="ai-text">
          <strong>AI Insight:</strong> {stats.highPriority} high-priority issues detected. 
          {stats.open > 0 ? ` ${stats.open} complaints awaiting attention.` : ' All complaints are being handled.'} 
          {' '}Most reported category: <strong>
            {(() => {
              const cats = {};
              complaints.forEach(c => { cats[c.category] = (cats[c.category] || 0) + 1; });
              return Object.entries(cats).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';
            })()}
          </strong>
        </div>
      </motion.div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Category Distribution</h3>
          <div className="chart-wrapper doughnut-wrapper">
            <Doughnut data={categoryData()} options={{
              ...chartOptions,
              plugins: { legend: { position: 'bottom', labels: { padding: 15, usePointStyle: true, pointStyle: 'circle' } } },
              cutout: '65%'
            }} />
          </div>
        </div>

        <div className="chart-card">
          <h3>Complaint Trend (This Week)</h3>
          <div className="chart-wrapper">
            <Line data={trendData} options={{
              ...chartOptions,
              scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
              }
            }} />
          </div>
        </div>

        <div className="chart-card">
          <h3>Priority Breakdown</h3>
          <div className="chart-wrapper doughnut-wrapper">
            <Doughnut data={priorityData} options={{
              ...chartOptions,
              plugins: { legend: { position: 'bottom', labels: { padding: 15, usePointStyle: true, pointStyle: 'circle' } } },
              cutout: '65%'
            }} />
          </div>
        </div>

        <div className="chart-card">
          <h3>Complaints by Category</h3>
          <div className="chart-wrapper">
            <Bar data={barData()} options={{
              ...chartOptions,
              scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
              }
            }} />
          </div>
        </div>
      </div>

      {/* Recent Complaints */}
      <div className="recent-section">
        <div className="section-header">
          <h3>Recent Complaints</h3>
          <Link to="/complaints" className="view-all-link">View All <FiArrowRight /></Link>
        </div>
        <div className="complaints-table-wrapper">
          <table className="complaints-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>AI Confidence</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentComplaints.map(c => (
                <tr key={c.id}>
                  <td><Link to={`/complaint/${c.id}`} className="complaint-id">{c.id}</Link></td>
                  <td className="complaint-title-cell">{c.title}</td>
                  <td><span className="category-badge">{c.category}</span></td>
                  <td>
                    <span className={`priority-badge priority-${c.priority.toLowerCase()}`}>
                      {c.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${c.status.toLowerCase().replace(' ', '-')}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>
                    <div className="confidence-bar-mini">
                      <div className="confidence-fill-mini" style={{ width: `${c.confidence}%` }}></div>
                      <span>{c.confidence}%</span>
                    </div>
                  </td>
                  <td className="date-cell">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
