import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FiHome, FiPlus, FiList, FiBarChart2, FiUser, FiLogOut, FiMenu, FiX, FiShield, FiCpu, FiMap, FiAward, FiSun, FiMoon, FiSettings } from 'react-icons/fi';
import AIChatbot from './AIChatbot';
import '../styles/layout.css';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: <FiHome />, label: 'Dashboard' },
    { to: '/submit-complaint', icon: <FiPlus />, label: 'Submit Complaint' },
    { to: '/complaints', icon: <FiList />, label: 'Complaints' },
    { to: '/heatmap', icon: <FiMap />, label: 'Campus Heatmap' },
    { to: '/leaderboard', icon: <FiAward />, label: 'Leaderboard' },
    ...(user?.role === 'admin' ? [{ to: '/analytics', icon: <FiBarChart2 />, label: 'Analytics' }] : []),
    ...(user?.role === 'admin' ? [{ to: '/admin', icon: <FiSettings />, label: 'Admin Panel' }] : []),
    { to: '/profile', icon: <FiUser />, label: 'Profile' }
  ];

  return (
    <div className={`app-layout ${sidebarOpen ? '' : 'collapsed'}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <FiShield className="brand-icon" />
            {sidebarOpen && <span>SmartCampus</span>}
          </div>
          <button className="sidebar-toggle desktop-only" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <FiX /> : <FiMenu />}
          </button>
          <button className="sidebar-toggle mobile-only" onClick={() => setMobileOpen(false)}>
            <FiX />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {sidebarOpen && (
            <div className="sidebar-ai-badge">
              <FiCpu /> <span>AI Engine Active</span>
            </div>
          )}
          <div className="sidebar-user">
            <div className="user-avatar">{user?.name?.charAt(0)}</div>
            {sidebarOpen && (
              <div className="user-info">
                <span className="user-name">{user?.name}</span>
                <span className="user-role">{user?.role}</span>
              </div>
            )}
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <FiLogOut />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-bar">
          <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
            <FiMenu />
          </button>
          <div className="topbar-right">
            <button className="theme-toggle-btn" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <FiSun /> : <FiMoon />}
            </button>
            <span className="topbar-role-badge">
              {user?.role === 'admin' ? '🛡️ Admin' : '🎓 Student'}
            </span>
          </div>
        </header>
        <div className="page-content">
          {children}
        </div>
      </main>

      {/* AI Chatbot */}
      <AIChatbot />

      {/* Mobile overlay */}
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)}></div>}
    </div>
  );
}
