import React, { useState, useEffect } from 'react';
import { getComplaints } from '../services/aiEngine';
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Filler, RadialLinearScale
} from 'chart.js';
import { FiTrendingUp, FiPieChart, FiBarChart2, FiActivity } from 'react-icons/fi';
import { motion } from 'framer-motion';
import '../styles/analytics.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, RadialLinearScale);

export default function Analytics() {
  const [complaints, setComplaints] = useState([]);
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => {
    setComplaints(getComplaints());
  }, []);

  // Helper
  const countBy = (arr, key) => {
    const map = {};
    arr.forEach(item => { map[item[key]] = (map[item[key]] || 0) + 1; });
    return map;
  };

  const categories = countBy(complaints, 'category');
  const priorities = countBy(complaints, 'priority');
  const statuses = countBy(complaints, 'status');
  const avgConfidence = complaints.length > 0 
    ? Math.round(complaints.reduce((s, c) => s + c.confidence, 0) / complaints.length) 
    : 0;

  // Charts
  const categoryDoughnut = {
    labels: Object.keys(categories),
    datasets: [{
      data: Object.values(categories),
      backgroundColor: ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316', '#14b8a6', '#64748b'],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  const priorityBar = {
    labels: ['High', 'Medium', 'Low'],
    datasets: [{
      label: 'Count',
      data: [priorities['High'] || 0, priorities['Medium'] || 0, priorities['Low'] || 0],
      backgroundColor: ['#ef444480', '#f59e0b80', '#22c55e80'],
      borderColor: ['#ef4444', '#f59e0b', '#22c55e'],
      borderWidth: 2,
      borderRadius: 8
    }]
  };

  const statusDoughnut = {
    labels: Object.keys(statuses),
    datasets: [{
      data: Object.values(statuses),
      backgroundColor: ['#ef4444', '#f59e0b', '#22c55e'],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  const monthlyTrend = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Complaints Filed',
        data: [12, 19, 15, 25, 18, complaints.length],
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Resolved',
        data: [10, 15, 13, 20, 16, complaints.filter(c => c.status === 'Resolved').length],
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const radarData = {
    labels: Object.keys(categories),
    datasets: [{
      label: 'Issue Distribution',
      data: Object.values(categories),
      backgroundColor: 'rgba(99, 102, 241, 0.2)',
      borderColor: '#6366f1',
      pointBackgroundColor: '#6366f1',
      pointBorderColor: '#fff',
      pointHoverRadius: 6
    }]
  };

  const confidenceDistribution = {
    labels: ['60-70%', '70-80%', '80-90%', '90-100%'],
    datasets: [{
      label: 'Complaints',
      data: [
        complaints.filter(c => c.confidence >= 60 && c.confidence < 70).length,
        complaints.filter(c => c.confidence >= 70 && c.confidence < 80).length,
        complaints.filter(c => c.confidence >= 80 && c.confidence < 90).length,
        complaints.filter(c => c.confidence >= 90).length
      ],
      backgroundColor: ['#f59e0b80', '#06b6d480', '#6366f180', '#22c55e80'],
      borderColor: ['#f59e0b', '#06b6d4', '#6366f1', '#22c55e'],
      borderWidth: 2,
      borderRadius: 8
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'bottom', labels: { padding: 15, usePointStyle: true } } }
  };

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div>
          <h1>📊 Analytics & Reports</h1>
          <p>Comprehensive analysis of campus complaint data and AI performance</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {[
          { label: 'Total Complaints', value: complaints.length, icon: <FiBarChart2 />, color: '#6366f1', trend: '+12%' },
          { label: 'Resolution Rate', value: `${complaints.length > 0 ? Math.round((statuses['Resolved'] || 0) / complaints.length * 100) : 0}%`, icon: <FiTrendingUp />, color: '#22c55e', trend: '+5%' },
          { label: 'Avg AI Confidence', value: `${avgConfidence}%`, icon: <FiPieChart />, color: '#f59e0b', trend: '+2%' },
          { label: 'Avg Response Time', value: '2.4h', icon: <FiActivity />, color: '#ec4899', trend: '-18%' }
        ].map((kpi, i) => (
          <motion.div 
            key={i} 
            className="kpi-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="kpi-icon" style={{ background: `${kpi.color}15`, color: kpi.color }}>{kpi.icon}</div>
            <div className="kpi-info">
              <span className="kpi-value">{kpi.value}</span>
              <span className="kpi-label">{kpi.label}</span>
            </div>
            <span className="kpi-trend" style={{ color: kpi.trend.startsWith('+') ? '#22c55e' : '#ef4444' }}>
              {kpi.trend}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="analytics-grid">
        <div className="analytics-card large">
          <h3><FiTrendingUp /> Monthly Complaint Trend</h3>
          <div className="chart-container">
            <Line data={monthlyTrend} options={{
              ...chartOptions,
              scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
              }
            }} />
          </div>
        </div>

        <div className="analytics-card">
          <h3><FiPieChart /> Category Distribution</h3>
          <div className="chart-container doughnut-chart">
            <Doughnut data={categoryDoughnut} options={{ ...chartOptions, cutout: '60%' }} />
          </div>
        </div>

        <div className="analytics-card">
          <h3>⚡ Priority Breakdown</h3>
          <div className="chart-container">
            <Bar data={priorityBar} options={{
              ...chartOptions,
              scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
              }
            }} />
          </div>
        </div>

        <div className="analytics-card">
          <h3>📋 Status Overview</h3>
          <div className="chart-container doughnut-chart">
            <Doughnut data={statusDoughnut} options={{ ...chartOptions, cutout: '60%' }} />
          </div>
        </div>

        <div className="analytics-card">
          <h3>🎯 AI Confidence Distribution</h3>
          <div className="chart-container">
            <Bar data={confidenceDistribution} options={{
              ...chartOptions,
              scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
              }
            }} />
          </div>
        </div>

        <div className="analytics-card">
          <h3>🕸️ Issue Category Radar</h3>
          <div className="chart-container">
            <Radar data={radarData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="analytics-card full-width">
        <h3>📈 Category-wise Summary</h3>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Total</th>
              <th>Open</th>
              <th>In Progress</th>
              <th>Resolved</th>
              <th>High Priority</th>
              <th>Avg Confidence</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(categories).map(cat => {
              const catComplaints = complaints.filter(c => c.category === cat);
              return (
                <tr key={cat}>
                  <td><span className="category-badge">{cat}</span></td>
                  <td>{catComplaints.length}</td>
                  <td>{catComplaints.filter(c => c.status === 'Open').length}</td>
                  <td>{catComplaints.filter(c => c.status === 'In Progress').length}</td>
                  <td>{catComplaints.filter(c => c.status === 'Resolved').length}</td>
                  <td>{catComplaints.filter(c => c.priority === 'High').length}</td>
                  <td>{Math.round(catComplaints.reduce((s, c) => s + c.confidence, 0) / catComplaints.length)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
