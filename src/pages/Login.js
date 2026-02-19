import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiEye, FiEyeOff, FiShield } from 'react-icons/fi';
import { motion } from 'framer-motion';
import '../styles/auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const errs = {};
    if (!email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email format';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back! 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      
      <motion.div 
        className="auth-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-left">
          <div className="auth-left-content">
            <FiShield className="auth-logo-icon" />
            <h2>SmartCampus AI</h2>
            <p>AI-Powered Campus Problem Detection & Resolution System</p>
            <div className="auth-features-list">
              <div className="auth-feature-item">
                <span className="feature-dot"></span>
                Generative AI Classification
              </div>
              <div className="auth-feature-item">
                <span className="feature-dot"></span>
                RAG-Powered Action Plans
              </div>
              <div className="auth-feature-item">
                <span className="feature-dot"></span>
                Interactive Analytics Dashboard
              </div>
              <div className="auth-feature-item">
                <span className="feature-dot"></span>
                Real-time Priority Detection
              </div>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-form-wrapper">
            <h1>Welcome Back</h1>
            <p className="auth-subtitle">Sign in to your account to continue</p>

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <div className={`form-group ${errors.email ? 'error' : ''}`}>
                <label>Email Address</label>
                <div className="input-wrapper">
                  <FiMail className="input-icon" />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({...prev, email: ''})); }}
                  />
                </div>
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              <div className={`form-group ${errors.password ? 'error' : ''}`}>
                <label>Password</label>
                <div className="input-wrapper">
                  <FiLock className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({...prev, password: ''})); }}
                  />
                  <button 
                    type="button" 
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {errors.password && <span className="error-text">{errors.password}</span>}
              </div>

              <button type="submit" className="btn-auth-submit" disabled={loading}>
                {loading ? <span className="btn-spinner"></span> : 'Sign In'}
              </button>
            </form>

            <div className="auth-divider">
              <span>Admin Login</span>
            </div>
            <div className="demo-credentials">
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '6px' }}>For authorized administrators only</p>
              <code>vardhaman@gmail.com / helloworld123</code>
            </div>

            <p className="auth-switch">
              Don't have an account? <Link to="/signup">Create Account</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
