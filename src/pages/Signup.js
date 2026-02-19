import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiShield, FiPhone, FiBookOpen, FiHash } from 'react-icons/fi';
import { motion } from 'framer-motion';
import '../styles/auth.css';

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    department: '',
    studentId: '',
    phone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const departments = [
    'Computer Science', 'Electrical Engineering', 'Mechanical Engineering',
    'Civil Engineering', 'Electronics & Communication', 'Information Technology',
    'Chemical Engineering', 'Biotechnology', 'Mathematics', 'Physics',
    'Chemistry', 'Business Administration', 'Arts & Humanities', 'Other'
  ];

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateStep1 = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';
    else if (formData.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!formData.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Invalid email format';
    if (!formData.password) errs.password = 'Password is required';
    else if (formData.password.length < 6) errs.password = 'Password must be at least 6 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) errs.password = 'Must include uppercase, lowercase, and number';
    if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!formData.department) errs.department = 'Please select a department';
    if (formData.role === 'student' && !formData.studentId.trim()) errs.studentId = 'Student ID is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    try {
      await signup(formData);
      toast.success('Account created successfully! 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const p = formData.password;
    if (!p) return { width: '0%', color: '#e2e8f0', label: '' };
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    const levels = [
      { width: '20%', color: '#ef4444', label: 'Weak' },
      { width: '40%', color: '#f59e0b', label: 'Fair' },
      { width: '60%', color: '#eab308', label: 'Good' },
      { width: '80%', color: '#22c55e', label: 'Strong' },
      { width: '100%', color: '#16a34a', label: 'Very Strong' }
    ];
    return levels[Math.min(score, 4)];
  };

  const strength = getPasswordStrength();

  return (
    <div className="auth-page">
      <div className="auth-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <motion.div 
        className="auth-container signup-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-left">
          <div className="auth-left-content">
            <FiShield className="auth-logo-icon" />
            <h2>Join SmartCampus</h2>
            <p>Create your account to report and track campus issues efficiently</p>
            <div className="auth-features-list">
              <div className="auth-feature-item">
                <span className="feature-dot"></span>
                Submit complaints instantly
              </div>
              <div className="auth-feature-item">
                <span className="feature-dot"></span>
                AI-powered issue classification
              </div>
              <div className="auth-feature-item">
                <span className="feature-dot"></span>
                Track resolution progress
              </div>
              <div className="auth-feature-item">
                <span className="feature-dot"></span>
                Get notified on updates
              </div>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-form-wrapper">
            <h1>Create Account</h1>
            <p className="auth-subtitle">Step {step} of 2 — {step === 1 ? 'Account Details' : 'Campus Information'}</p>

            {/* Progress Bar */}
            <div className="signup-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: step === 1 ? '50%' : '100%' }}></div>
              </div>
              <div className="progress-steps">
                <span className={`progress-step ${step >= 1 ? 'active' : ''}`}>1</span>
                <span className={`progress-step ${step >= 2 ? 'active' : ''}`}>2</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={`form-group ${errors.name ? 'error' : ''}`}>
                    <label>Full Name</label>
                    <div className="input-wrapper">
                      <FiUser className="input-icon" />
                      <input
                        type="text"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={(e) => updateField('name', e.target.value)}
                      />
                    </div>
                    {errors.name && <span className="error-text">{errors.name}</span>}
                  </div>

                  <div className={`form-group ${errors.email ? 'error' : ''}`}>
                    <label>Email Address</label>
                    <div className="input-wrapper">
                      <FiMail className="input-icon" />
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
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
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={(e) => updateField('password', e.target.value)}
                      />
                      <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                    {formData.password && (
                      <div className="password-strength">
                        <div className="strength-bar">
                          <div className="strength-fill" style={{ width: strength.width, backgroundColor: strength.color }}></div>
                        </div>
                        <span style={{ color: strength.color }}>{strength.label}</span>
                      </div>
                    )}
                    {errors.password && <span className="error-text">{errors.password}</span>}
                  </div>

                  <div className={`form-group ${errors.confirmPassword ? 'error' : ''}`}>
                    <label>Confirm Password</label>
                    <div className="input-wrapper">
                      <FiLock className="input-icon" />
                      <input
                        type="password"
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={(e) => updateField('confirmPassword', e.target.value)}
                      />
                    </div>
                    {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                  </div>

                  <button type="button" className="btn-auth-submit" onClick={handleNext}>
                    Continue →
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="form-group">
                    <label>I am a</label>
                    <div className="role-selector">
                      <button
                        type="button"
                        className={`role-btn ${formData.role === 'student' ? 'active' : ''}`}
                        onClick={() => updateField('role', 'student')}
                      >
                        🎓 Student
                      </button>
                      <button
                        type="button"
                        className={`role-btn ${formData.role === 'admin' ? 'active' : ''}`}
                        onClick={() => updateField('role', 'admin')}
                      >
                        🛡️ Admin
                      </button>
                    </div>
                  </div>

                  <div className={`form-group ${errors.department ? 'error' : ''}`}>
                    <label>Department</label>
                    <div className="input-wrapper">
                      <FiBookOpen className="input-icon" />
                      <select
                        value={formData.department}
                        onChange={(e) => updateField('department', e.target.value)}
                      >
                        <option value="">Select Department</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    {errors.department && <span className="error-text">{errors.department}</span>}
                  </div>

                  {formData.role === 'student' && (
                    <div className={`form-group ${errors.studentId ? 'error' : ''}`}>
                      <label>Student ID / Roll Number</label>
                      <div className="input-wrapper">
                        <FiHash className="input-icon" />
                        <input
                          type="text"
                          placeholder="e.g., CS2024001"
                          value={formData.studentId}
                          onChange={(e) => updateField('studentId', e.target.value)}
                        />
                      </div>
                      {errors.studentId && <span className="error-text">{errors.studentId}</span>}
                    </div>
                  )}

                  <div className="form-group">
                    <label>Phone Number (Optional)</label>
                    <div className="input-wrapper">
                      <FiPhone className="input-icon" />
                      <input
                        type="tel"
                        placeholder="Enter phone number"
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <button type="button" className="btn-auth-back" onClick={() => setStep(1)}>
                      ← Back
                    </button>
                    <button type="submit" className="btn-auth-submit" disabled={loading}>
                      {loading ? <span className="btn-spinner"></span> : 'Create Account'}
                    </button>
                  </div>
                </motion.div>
              )}
            </form>

            <p className="auth-switch">
              Already have an account? <Link to="/login">Sign In</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
