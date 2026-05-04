require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Root route - inject API key (MUST come BEFORE static middleware)
app.get('/', (req, res) => {
  try {
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    
    const apiKey = process.env.LIN_CLINIC_GOOGLE_MAPS_KEY || '';
    
    if (apiKey) {
      const keyScript = `<script>window.LIN_CLINIC_GOOGLE_MAPS_KEY = '${apiKey}';</script>`;
      const replaced = html.replace('</head>', keyScript + '\n</head>');
      if (replaced !== html) {
        html = replaced;
        console.log('✓ API key script injected');
      } else {
        console.log('✗ Failed to inject - </head> not found');
      }
    }
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('Error serving root:', err);
    res.status(500).send('Error loading page');
  }
});

// Email endpoint
app.post('/api/send-email', async (req, res) => {
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

    res.json({ message: 'Email sent successfully!' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ message: 'Failed to send email. Please try again later.' });
  }
});

// Helper function to escape HTML
function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Serve static files AFTER route handlers
app.use(express.static('.'));

app.listen(PORT, () => {
  console.log(`🏥 Lin's Acupuncture Clinic website running at http://localhost:${PORT}`);
  const keyStatus = process.env.LIN_CLINIC_GOOGLE_MAPS_KEY ? '✓ Loaded' : '✗ Missing (check .env file)';
  console.log(`API Key: ${keyStatus}`);
});
