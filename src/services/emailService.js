// =====================================================
// Email Service — ALL emails via Vercel Serverless + Nodemailer
// =====================================================
// OTP, admin notifications, approval/rejection, urgent alerts
// all go through /api/send-email (Vercel serverless function)
// =====================================================

const ADMIN_KEY = process.env.REACT_APP_ADMIN_KEY || 'dev-admin-key';

// ── Helper: send email via serverless function ───────
async function sendViaBackend(to, subject, body) {
  try {
    const res = await fetch('/api/send-email', {
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

// Send OTP email via serverless function
export async function sendOTPEmail(toEmail, toName, otp) {
  return await sendViaBackend(
    toEmail,
    'Smart Campus - Your OTP Verification Code',
    `<h2>OTP Verification</h2>
     <p>Hello ${toName},</p>
     <p>Your OTP verification code is:</p>
     <h1 style="letter-spacing:8px; color:#4f46e5; text-align:center;">${otp}</h1>
     <p>This code expires in <b>5 minutes</b>.</p>
     <p>If you didn't request this, please ignore this email.</p>
     <br><p>— Smart Campus AI Team</p>`
  );
}

// Send urgent complaint email to admins via backend
export async function sendUrgentComplaintEmail(complaint) {
  const { fbGetUsers } = await import('./firebase');
  const users = await fbGetUsers();
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
export async function getAdminEmails() {
  const { fbGetUsers } = await import('./firebase');
  const users = await fbGetUsers();
  return users.filter(u => u.role === 'admin').map(a => ({ name: a.name, email: a.email }));
}

// Send notification to admin when a new user signs up
export async function sendNewUserNotification(newUser) {
  // Always notify the site admin directly (localStorage may not have admin on new user's browser)
  const ADMIN_EMAIL = 'samrtcampusdetection@gmail.com';

  const result = await sendViaBackend(
    ADMIN_EMAIL,
    `New signup request: ${newUser.name}`,
    `<h2>New User Signup — Awaiting Approval</h2>
     <p><b>Name:</b> ${newUser.name}</p>
     <p><b>Email:</b> ${newUser.email}</p>
     <p><b>Department:</b> ${newUser.department || 'N/A'}</p>
     <p><b>Student ID:</b> ${newUser.studentId || 'N/A'}</p>
     <p><b>Signed up:</b> ${newUser.createdAt}</p>
     <br><p>Please log into the <a href="https://smartcampusdetection.vercel.app/admin">Admin Panel</a> to approve or reject this request.</p>
     <p>— Smart Campus AI System</p>`
  );
  return { success: result.success !== false, results: [{ email: ADMIN_EMAIL, sent: result.success !== false }] };
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
     ${approved ? '<p><a href="https://smartcampusdetection.vercel.app/login" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Login Now</a></p>' : ''}
     <br><p>— Smart Campus AI System</p>`
  );
}

// Send complaint to department admin for forwarding
export async function sendComplaintToDepartment(complaint, deptAdmin) {
  return await sendViaBackend(
    deptAdmin.email,
    `🚨 Problem Detected — ${complaint.category}: ${complaint.title}`,
    `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">🚨 Smart Campus — Problem Alert</h1>
        <p style="color: #c7d2fe; margin: 8px 0 0; font-size: 14px;">A problem has been forwarded to your department</p>
      </div>
      <div style="background: #fff; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px;">
          <tr><td style="padding: 8px 0; color: #64748b; width: 120px;"><b>Department:</b></td><td style="padding: 8px 0; color: #1e293b;">${deptAdmin.departmentType}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;"><b>Problem ID:</b></td><td style="padding: 8px 0; color: #6366f1; font-weight: 600;">${complaint.id}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;"><b>Category:</b></td><td style="padding: 8px 0; color: #1e293b;">${complaint.category}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;"><b>Priority:</b></td><td style="padding: 8px 0;"><span style="display:inline-block;padding:2px 12px;border-radius:12px;font-weight:600;font-size:12px;${complaint.priority === 'High' ? 'background:#fee2e2;color:#dc2626;' : complaint.priority === 'Medium' ? 'background:#fef3c7;color:#d97706;' : 'background:#dcfce7;color:#16a34a;'}">${complaint.priority}</span></td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;"><b>Location:</b></td><td style="padding: 8px 0; color: #1e293b;">📍 ${complaint.location}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;"><b>Reported by:</b></td><td style="padding: 8px 0; color: #1e293b;">${complaint.userName}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;"><b>Date:</b></td><td style="padding: 8px 0; color: #1e293b;">${new Date(complaint.createdAt).toLocaleString()}</td></tr>
        </table>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h3 style="margin: 0 0 8px; font-size: 15px; color: #1e293b;">${complaint.title}</h3>
          <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.5;">${complaint.description?.substring(0, 800) || 'No description provided.'}</p>
        </div>
        <p style="font-size: 13px; color: #64748b;">Dear <b>${deptAdmin.name}</b>, please take necessary action on this reported problem. Log in to the <a href="https://smartcampusdetection.vercel.app" style="color: #6366f1; font-weight: 600;">Smart Campus Portal</a> for more details.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">— Smart Campus AI Detection System</p>
      </div>
    </div>`
  );
}

