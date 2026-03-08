// Vercel Serverless Function — POST /api/send-email
// Sends email via Nodemailer + Gmail SMTP
const nodemailer = require('nodemailer');

const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || '';
const ADMIN_KEY = process.env.ADMIN_API_KEY || 'dev-admin-key';

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
  }
  return transporter;
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check
  const key = req.headers['x-admin-key'];
  if (!key || key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Admin key required' });
  }

  const { to, subject, body } = req.body || {};
  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'to, subject, and body are required' });
  }

  if (!SMTP_PASS) {
    console.log('[EMAIL SKIPPED] No SMTP_PASS env var set.');
    return res.json({ success: false, skipped: true, error: 'SMTP_PASS not configured' });
  }

  try {
    const info = await getTransporter().sendMail({ from: SMTP_FROM, to, subject, html: body });
    console.log('[EMAIL SENT]', to, '|', subject);
    return res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('[EMAIL ERROR]', err.message);
    return res.json({ success: false, error: err.message });
  }
};
