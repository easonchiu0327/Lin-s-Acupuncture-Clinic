require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Serve static files AFTER route handlers
app.use(express.static('.'));

app.listen(PORT, () => {
  console.log(`🏥 Lin's Acupuncture Clinic website running at http://localhost:${PORT}`);
  const keyStatus = process.env.LIN_CLINIC_GOOGLE_MAPS_KEY ? '✓ Loaded' : '✗ Missing (check .env file)';
  console.log(`API Key: ${keyStatus}`);
});
