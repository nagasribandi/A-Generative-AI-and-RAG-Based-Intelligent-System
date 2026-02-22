import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiShield, FiPhone, FiBookOpen, FiHash, FiAlertCircle, FiCheckCircle, FiInfo } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { generateOTP, storeOTP, verifyOTP, sendOTPEmail } from '../services/emailService';
import { validateRollNumber, validateStudentName, validateDepartmentMatch, checkDuplicateRoll, getValidDepartments, getDepartmentFromRoll } from '../services/studentValidation';
import '../styles/auth.css';

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
    studentId: '',
    phone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1); // 1: Account, 2: College Info, 3: OTP Verification
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false); // eslint-disable-line no-unused-vars
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [rollValidation, setRollValidation] = useState(null);
  const [nameValidation, setNameValidation] = useState(null);
  const [deptMatch, setDeptMatch] = useState(null);
  const otpRefs = useRef([]);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const departments = getValidDepartments();

  // OTP Timer countdown
  useEffect(() => {
    if (otpTimer > 0) {
      const interval = setInterval(() => setOtpTimer(prev => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [otpTimer]);

  // Auto-set department from roll number
  useEffect(() => {
    if (formData.studentId.length >= 8) {
      const dept = getDepartmentFromRoll(formData.studentId);
      if (dept) {
        setFormData(prev => ({ ...prev, department: dept }));
        setDeptMatch({ valid: true, message: `Auto-detected: ${dept}` });
      }
    }
  }, [formData.studentId]);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));

    // Live validation for roll number
    if (field === 'studentId' && value.length > 0) {
      const result = validateRollNumber(value);
      setRollValidation(result);
      if (result.valid && formData.department) {
        setDeptMatch(validateDepartmentMatch(value, formData.department));
      }
    } else if (field === 'studentId') {
      setRollValidation(null);
    }

    // Live validation for name
    if (field === 'name' && value.length > 0) {
      setNameValidation(validateStudentName(value));
    } else if (field === 'name') {
      setNameValidation(null);
    }

    // Department match check
    if (field === 'department' && formData.studentId) {
      setDeptMatch(validateDepartmentMatch(formData.studentId, value));
    }
  };

  // ===== STEP 1 VALIDATION =====
  const validateStep1 = () => {
    const errs = {};
    const nameResult = validateStudentName(formData.name);
    if (!nameResult.valid) errs.name = nameResult.message;
    if (!formData.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Invalid email format';
    if (!formData.password) errs.password = 'Password is required';
    else if (formData.password.length < 6) errs.password = 'Password must be at least 6 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) errs.password = 'Must include uppercase, lowercase, and number';
    if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ===== STEP 2 VALIDATION =====
  const validateStep2 = () => {
    const errs = {};
    const rollResult = validateRollNumber(formData.studentId);
    if (!rollResult.valid) {
      errs.studentId = rollResult.message;
    } else {
      const dupCheck = checkDuplicateRoll(formData.studentId);
      if (dupCheck.duplicate) errs.studentId = dupCheck.message;
    }
    if (!formData.department) errs.department = 'Department is required';
    else if (rollResult.valid) {
      const matchResult = validateDepartmentMatch(formData.studentId, formData.department);
      if (!matchResult.valid) errs.department = matchResult.message;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ===== NAVIGATION =====
  const handleNext1 = () => {
    if (validateStep1()) setStep(2);
  };

  const handleNext2 = async () => {
    if (!validateStep2()) return;
    await handleSendOTP();
    setStep(3);
  };

  // ===== OTP HANDLING =====
  const handleSendOTP = async () => {
    setOtpLoading(true);
    const code = generateOTP();
    storeOTP(formData.email, code);
    const result = await sendOTPEmail(formData.email, formData.name, code);
    if (result.success) {
      setOtpSent(true);
      setOtpTimer(120);
      toast.success('OTP sent to your email! Check your inbox.');
    } else {
      toast.error('Failed to send OTP. Please try again.');
    }
    setOtpLoading(false);
  };

  const handleResendOTP = async () => {
    if (otpTimer > 0) return;
    setOtp(['', '', '', '', '', '']);
    await handleSendOTP();
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  // ===== FINAL SUBMIT =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP');
      return;
    }
    const otpResult = verifyOTP(formData.email, otpCode);
    if (!otpResult.valid) {
      toast.error(otpResult.message);
      return;
    }
    setLoading(true);
    try {
      await signup({
        ...formData,
        role: 'student', // ALWAYS student — admin signup is restricted
        studentId: formData.studentId.toUpperCase(),
        emailVerified: true
      });
      toast.success('Account created successfully! Email verified ✅');
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
            <p>Create your student account to report and track campus issues</p>
            <div className="auth-features-list">
              <div className="auth-feature-item">
                <span className="feature-dot"></span>
                OTP-verified email registration
              </div>
              <div className="auth-feature-item">
                <span className="feature-dot"></span>
                College ID validated enrollment
              </div>
              <div className="auth-feature-item">
                <span className="feature-dot"></span>
                AI-powered issue classification
              </div>
              <div className="auth-feature-item">
                <span className="feature-dot"></span>
                Track resolution progress
              </div>
            </div>

            <div className="auth-notice">
              <FiAlertCircle />
              <div>
                <strong>Students Only</strong>
                <p>Only student accounts can be created here. Admin accounts are managed by the institution.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-form-wrapper">
            <h1>Create Student Account</h1>
            <p className="auth-subtitle">Step {step} of 3 — {step === 1 ? 'Account Details' : step === 2 ? 'College Information' : 'Email Verification'}</p>

            {/* Progress Bar */}
            <div className="signup-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(step / 3) * 100}%` }}></div>
              </div>
              <div className="progress-steps">
                <span className={`progress-step ${step >= 1 ? 'active' : ''}`}>1</span>
                <span className={`progress-step ${step >= 2 ? 'active' : ''}`}>2</span>
                <span className={`progress-step ${step >= 3 ? 'active' : ''}`}>3</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <AnimatePresence mode="wait">
              {/* ===== STEP 1: Account Details ===== */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Name Field */}
                  <div className={`form-group ${errors.name ? 'error' : ''}`}>
                    <label>Full Name <span className="label-hint">(as on College ID Card)</span></label>
                    <div className="input-wrapper">
                      <FiUser className="input-icon" />
                      <input
                        type="text"
                        placeholder="e.g., john wick"
                        value={formData.name}
                        onChange={(e) => updateField('name', e.target.value)}
                      />
                      {nameValidation && (
                        <span className={`validation-indicator ${nameValidation.valid ? 'valid' : 'invalid'}`}>
                          {nameValidation.valid ? <FiCheckCircle /> : <FiAlertCircle />}
                        </span>
                      )}
                    </div>
                    {errors.name && <span className="error-text">{errors.name}</span>}
                    {!errors.name && nameValidation && !nameValidation.valid && (
                      <span className="warning-text"><FiInfo size={12} /> {nameValidation.message}</span>
                    )}
                    <span className="field-hint">Enter your full name exactly as it appears on your college ID card</span>
                  </div>

                  {/* Email Field */}
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
                    <span className="field-hint">An OTP will be sent to verify this email</span>
                  </div>

                  {/* Password Field */}
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

                  {/* Confirm Password */}
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

                  <button type="button" className="btn-auth-submit" onClick={handleNext1}>
                    Continue to College Info →
                  </button>
                </motion.div>
              )}

              {/* ===== STEP 2: College Information ===== */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Role Notice */}
                  <div className="role-notice">
                    <FiShield />
                    <div>
                      <strong>🎓 Student Registration Only</strong>
                      <p>This signup is exclusively for students. Admin accounts cannot be created here and are managed by the institution.</p>
                    </div>
                  </div>

                  {/* Roll Number */}
                  <div className={`form-group ${errors.studentId ? 'error' : ''}`}>
                    <label>Roll Number <span className="label-hint">(College ID)</span></label>
                    <div className="input-wrapper">
                      <FiHash className="input-icon" />
                      <input
                        type="text"
                        placeholder="e.g., 23881A0501"
                        value={formData.studentId}
                        onChange={(e) => updateField('studentId', e.target.value.toUpperCase())}
                        maxLength={10}
                        style={{ textTransform: 'uppercase' }}
                      />
                      {rollValidation && (
                        <span className={`validation-indicator ${rollValidation.valid ? 'valid' : 'invalid'}`}>
                          {rollValidation.valid ? <FiCheckCircle /> : <FiAlertCircle />}
                        </span>
                      )}
                    </div>
                    {errors.studentId && <span className="error-text">{errors.studentId}</span>}
                    {!errors.studentId && rollValidation && !rollValidation.valid && formData.studentId.length >= 3 && (
                      <span className="warning-text"><FiInfo size={12} /> {rollValidation.message}</span>
                    )}
                    {rollValidation && rollValidation.valid && (
                      <span className="success-text">
                        <FiCheckCircle size={12} /> {rollValidation.parsed.department} — {rollValidation.parsed.branch} — Batch {rollValidation.parsed.admissionYear}
                      </span>
                    )}
                    <div className="field-hint-box">
                      <strong>Format: 23881A05XX</strong>
                      <ul>
                        <li><code>23</code> — Admission year</li>
                        <li><code>881</code> — College code</li>
                        <li><code>A</code> — Regular (B = Lateral)</li>
                        <li><code>05</code> — Department code (e.g., 05 = CSE)</li>
                        <li><code>XX</code> — Your roll number</li>
                      </ul>
                    </div>
                  </div>

                  {/* Department (auto-filled from roll number) */}
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
                    {deptMatch && deptMatch.valid && formData.department && (
                      <span className="success-text"><FiCheckCircle size={12} /> {deptMatch.message}</span>
                    )}
                    <span className="field-hint">Department is auto-detected from roll number.</span>
                  </div>

                  {/* Phone (Optional) */}
                  <div className="form-group">
                    <label>Phone Number <span className="label-hint">(Optional)</span></label>
                    <div className="input-wrapper">
                      <FiPhone className="input-icon" />
                      <input
                        type="tel"
                        placeholder="e.g., 9876543210"
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        maxLength={10}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <button type="button" className="btn-auth-back" onClick={() => setStep(1)}>
                      ← Back
                    </button>
                    <button type="button" className="btn-auth-submit" onClick={handleNext2} disabled={otpLoading}>
                      {otpLoading ? <span className="btn-spinner"></span> : 'Verify Email →'}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ===== STEP 3: OTP Verification ===== */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="otp-section">
                    <div className="otp-icon">📧</div>
                    <h3>Verify Your Email</h3>
                    <p>We've sent a 6-digit OTP to</p>
                    <p className="otp-email">{formData.email}</p>

                    {/* OTP Input Boxes */}
                    <div className="otp-inputs" onPaste={handleOtpPaste}>
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          ref={el => { otpRefs.current[i] = el; }}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value.replace(/\D/g, ''))}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          className="otp-input"
                          autoFocus={i === 0}
                        />
                      ))}
                    </div>

                    {/* Timer & Resend */}
                    <div className="otp-timer">
                      {otpTimer > 0 ? (
                        <span>Resend OTP in <strong>{Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, '0')}</strong></span>
                      ) : (
                        <button type="button" className="btn-resend" onClick={handleResendOTP} disabled={otpLoading}>
                          {otpLoading ? 'Sending...' : 'Resend OTP'}
                        </button>
                      )}
                    </div>

                    <div className="form-row">
                      <button type="button" className="btn-auth-back" onClick={() => setStep(2)}>
                        ← Back
                      </button>
                      <button type="submit" className="btn-auth-submit" disabled={loading || otp.join('').length !== 6}>
                        {loading ? <span className="btn-spinner"></span> : '✅ Verify & Create Account'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
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
