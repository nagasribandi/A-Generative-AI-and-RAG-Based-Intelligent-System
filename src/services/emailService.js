// =====================================================
// Email Service — sends via backend (Nodemailer)
// =====================================================
// OTP emails still use EmailJS (client-side, no backend needed).
// All other emails (admin notifications, approval/rejection)
// go through the Express backend → Nodemailer → Gmail SMTP.
//
// Backend URL:  REACT_APP_API_URL  (e.g. http://localhost:4000)
// Admin key:    REACT_APP_ADMIN_KEY (must match server's ADMIN_API_KEY)
// =====================================================

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
const ADMIN_KEY = process.env.REACT_APP_ADMIN_KEY || 'dev-admin-key';

// EmailJS config — only used for OTP emails
const EMAILJS_CONFIG = {
  PUBLIC_KEY: process.env.REACT_APP_EMAILJS_PUBLIC_KEY || '_NYIsUgyId5xv6-z_',
  SERVICE_ID: process.env.REACT_APP_EMAILJS_SERVICE_ID || 'service_bjbum8z',
  TEMPLATE_OTP: process.env.REACT_APP_EMAILJS_TEMPLATE_OTP || 'template_c9trkaj'
};

// ── Helper: send email via backend ───────────────────
async function sendViaBackend(to, subject, body) {
  try {
    const res = await fetch(`${API_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
      body: JSON.stringify({ to, subject, body })
    });
    return await res.json();
  } catch (err) {
    console.warn('[Email] Backend unreachable, email skipped:', err.message);
    return { success: false, error: err.message };
  }
}

// Generate a 6-digit OTP
export function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Store OTP with expiry (5 minutes)
const OTP_STORE_KEY = 'smart_campus_otp_store';

export function storeOTP(email, otp) {
  const store = JSON.parse(localStorage.getItem(OTP_STORE_KEY) || '{}');
  store[email] = {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    attempts: 0
  };
  localStorage.setItem(OTP_STORE_KEY, JSON.stringify(store));
}

export function verifyOTP(email, inputOtp) {
  const store = JSON.parse(localStorage.getItem(OTP_STORE_KEY) || '{}');
  const record = store[email];

  if (!record) {
    return { valid: false, message: 'No OTP found. Please request a new one.' };
  }

  if (Date.now() > record.expiresAt) {
    delete store[email];
    localStorage.setItem(OTP_STORE_KEY, JSON.stringify(store));
    return { valid: false, message: 'OTP has expired. Please request a new one.' };
  }

  record.attempts += 1;
  if (record.attempts > 5) {
    delete store[email];
    localStorage.setItem(OTP_STORE_KEY, JSON.stringify(store));
    return { valid: false, message: 'Too many attempts. Please request a new OTP.' };
  }

  if (record.otp !== inputOtp) {
    store[email] = record;
    localStorage.setItem(OTP_STORE_KEY, JSON.stringify(store));
    return { valid: false, message: `Incorrect OTP. ${5 - record.attempts} attempts remaining.` };
  }

  // Valid
  delete store[email];
  localStorage.setItem(OTP_STORE_KEY, JSON.stringify(store));
  return { valid: true, message: 'OTP verified successfully!' };
}

// Send OTP email via EmailJS
export async function sendOTPEmail(toEmail, toName, otp) {
  try {
    const emailjs = await import('@emailjs/browser');

    await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_OTP,
      {
        to_email: toEmail,
        to_name: toName,
        otp_code: otp
      },
      EMAILJS_CONFIG.PUBLIC_KEY
    );

    return { success: true };
  } catch (error) {
    console.error('EmailJS OTP Error:', error);
    return { success: false, error: error?.text || error?.message || 'Unknown error' };
  }
}

// Send urgent complaint email to admins via backend
export async function sendUrgentComplaintEmail(complaint) {
  const users = JSON.parse(localStorage.getItem('smart_campus_users') || '[]');
  const admins = users.filter(u => u.role === 'admin');

  if (admins.length === 0) {
    return { success: false, message: 'No admins to notify' };
  }

  const results = [];
  for (const admin of admins) {
    const result = await sendViaBackend(
      admin.email,
      `🚨 URGENT: ${complaint.title}`,
      `<h2>High Priority Complaint Filed</h2>
       <p><b>ID:</b> ${complaint.id}</p>
       <p><b>Title:</b> ${complaint.title}</p>
       <p><b>Category:</b> ${complaint.category}</p>
       <p><b>Location:</b> ${complaint.location}</p>
       <p><b>Description:</b> ${complaint.description?.substring(0, 500)}</p>
       <p><b>Filed by:</b> ${complaint.userName} (${complaint.userEmail})</p>
       <p><b>Priority:</b> ${complaint.priority}</p>
       <br><p>AI Action Plan has been generated. Please login to review.</p>
       <p>— Smart Campus AI System</p>`
    );
    results.push({ email: admin.email, sent: result.success !== false });
  }

  return { success: true, results };
}

// Admin email list for display
export function getAdminEmails() {
  const users = JSON.parse(localStorage.getItem('smart_campus_users') || '[]');
  return users.filter(u => u.role === 'admin').map(a => ({ name: a.name, email: a.email }));
}

// Send notification to all admins when a new user signs up
export async function sendNewUserNotification(newUser) {
  const users = JSON.parse(localStorage.getItem('smart_campus_users') || '[]');
  const admins = users.filter(u => u.role === 'admin');
  if (admins.length === 0) return { success: false, message: 'No admins configured' };

  const results = [];
  for (const admin of admins) {
    const result = await sendViaBackend(
      admin.email,
      `New signup request: ${newUser.name}`,
      `<h2>New User Signup — Awaiting Approval</h2>
       <p><b>Name:</b> ${newUser.name}</p>
       <p><b>Email:</b> ${newUser.email}</p>
       <p><b>Department:</b> ${newUser.department || 'N/A'}</p>
       <p><b>Student ID:</b> ${newUser.studentId || 'N/A'}</p>
       <p><b>Signed up:</b> ${newUser.createdAt}</p>
       <br><p>Please log into the Admin Panel to approve or reject this request.</p>
       <p>— Smart Campus AI System</p>`
    );
    results.push({ email: admin.email, sent: result.success !== false });
  }
  return { success: true, results };
}

// Send approval/rejection email to a user after admin decision
export async function sendSignupDecisionEmail(toEmail, toName, approved, adminName, reason = '') {
  const status = approved ? 'approved' : 'rejected';
  const extra = reason || (approved ? 'You can now log in to your account.' : 'Please contact the administrator for more details.');

  return await sendViaBackend(
    toEmail,
    `Your signup has been ${status}`,
    `<h2>Signup ${status.charAt(0).toUpperCase() + status.slice(1)}</h2>
     <p>Hello ${toName},</p>
     <p>Your signup request for the Smart Campus system has been <b>${status}</b> by ${adminName || 'Site Admin'}.</p>
     <p>${extra}</p>
     <br><p>— Smart Campus AI System</p>`
  );
}
