const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Helper function to escape HTML
function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default async function handler(req, res) {
  // Handle email endpoint
  if (req.method === 'POST' && req.url === '/api/send-email') {
    try {
      const { name, email, message } = req.body;

      // Validate input
      if (!name || !email || !message) {
        return res.status(400).json({ message: 'Please provide name, email, and message.' });
      }

      // Create transporter using Gmail
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.CLINIC_EMAIL || 'lin5002223@gmail.com',
          pass: process.env.CLINIC_EMAIL_PASSWORD
        }
      });

      // Email content
      const mailOptions = {
        from: process.env.CLINIC_EMAIL || 'lin5002223@gmail.com',
        to: 'lin5002223@gmail.com',
        subject: `New Contact Form Submission from ${name}`,
        html: `
          <h2>New Message from Website Contact Form</h2>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
        `
      };

      // Send email
      await transporter.sendMail(mailOptions);

      return res.json({ message: 'Email sent successfully!' });
    } catch (error) {
      console.error('Email error:', error);
      return res.status(500).json({ message: 'Failed to send email. Please try again later.' });
    }
  }

  // Handle HTML serving
  let html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  
  // Get API key from environment variable
  const apiKey = process.env.LIN_CLINIC_GOOGLE_MAPS_KEY || '';
  
  // Inject the API key as a script before </head>
  const keyScript = `<script>window.LIN_CLINIC_GOOGLE_MAPS_KEY = '${apiKey}';</script>`;
  html = html.replace('</head>', keyScript + '\n  </head>');
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}
