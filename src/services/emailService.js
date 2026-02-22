// =====================================================
// Email Service using EmailJS
// =====================================================
// 
// FOR VERCEL DEPLOYMENT:
// Set these environment variables in Vercel Dashboard → Settings → Environment Variables:
//   REACT_APP_EMAILJS_PUBLIC_KEY  = your EmailJS public key
//   REACT_APP_EMAILJS_SERVICE_ID  = your EmailJS service ID
//   REACT_APP_EMAILJS_TEMPLATE_OTP = your OTP template ID (default: template_otp)
//   REACT_APP_EMAILJS_TEMPLATE_URGENT = your urgent template ID (default: template_urgent)
//
// FOR LOCAL DEVELOPMENT:
// Create a .env file in project root with the same variables above.
//
// EMAILJS SETUP:
// 1. Go to https://www.emailjs.com/ and create a free account
// 2. Add an Email Service (Gmail recommended) → get SERVICE_ID
// 3. Create TWO email templates:
//
//    Template 1: OTP Verification
//    Subject: "Smart Campus - Your OTP Verification Code"
//    Body: 
//      Hello {{to_name}},
//      Your OTP verification code is: {{otp_code}}
//      This code expires in 5 minutes.
//      If you didn't request this, please ignore this email.
//      - Smart Campus AI Team
//
//    Template 2: Urgent Complaint Alert
//    Subject: "🚨 URGENT: {{complaint_title}}"
//    Body:
//      Dear {{to_name}},
//      A HIGH PRIORITY complaint has been filed:
//      ID: {{complaint_id}}
//      Title: {{complaint_title}}
//      Category: {{category}}
//      Location: {{location}}
//      Description: {{description}}
//      Filed by: {{student_name}} ({{student_email}})
//      AI Action Plan has been generated. Please login to review.
//      - Smart Campus AI System
//
// 4. Get your PUBLIC_KEY from Account > API Keys
// 5. Set environment variables in Vercel or .env
// =====================================================

// Read from environment variables (works on Vercel + local .env)
const EMAILJS_CONFIG = {
  PUBLIC_KEY: process.env.REACT_APP_EMAILJS_PUBLIC_KEY || '',
  SERVICE_ID: process.env.REACT_APP_EMAILJS_SERVICE_ID || '',
  TEMPLATE_OTP: process.env.REACT_APP_EMAILJS_TEMPLATE_OTP || 'template_otp',
  TEMPLATE_URGENT: process.env.REACT_APP_EMAILJS_TEMPLATE_URGENT || 'template_urgent'
};

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

    return { success: true, demo: false };
  } catch (error) {
    console.error('EmailJS OTP Error:', error);
    return { success: false, demo: false, error: error.message };
  }
}

// Send urgent complaint email to admins
export async function sendUrgentComplaintEmail(complaint) {
  const users = JSON.parse(localStorage.getItem('smart_campus_users') || '[]');
  const admins = users.filter(u => u.role === 'admin');

  if (admins.length === 0) {
    return { success: false, message: 'No admins to notify' };
  }

  try {
    const emailjs = await import('@emailjs/browser');
    const results = [];

    for (const admin of admins) {
      try {
        await emailjs.send(
          EMAILJS_CONFIG.SERVICE_ID,
          EMAILJS_CONFIG.TEMPLATE_URGENT,
          {
            to_email: admin.email,
            to_name: admin.name,
            complaint_id: complaint.id,
            complaint_title: complaint.title,
            category: complaint.category,
            location: complaint.location,
            description: complaint.description.substring(0, 500),
            student_name: complaint.userName,
            student_email: complaint.userEmail,
            priority: complaint.priority
          },
          EMAILJS_CONFIG.PUBLIC_KEY
        );
        results.push({ email: admin.email, sent: true });
      } catch (err) {
        results.push({ email: admin.email, sent: false, error: err.message });
      }
    }

    return { success: true, demo: false, results };
  } catch (error) {
    console.error('EmailJS Urgent Alert Error:', error);
    return { success: false, message: error.message };
  }
}

// Admin email list for display
export function getAdminEmails() {
  const users = JSON.parse(localStorage.getItem('smart_campus_users') || '[]');
  return users.filter(u => u.role === 'admin').map(a => ({ name: a.name, email: a.email }));
}
