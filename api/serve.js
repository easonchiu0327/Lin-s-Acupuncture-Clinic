const fs = require('fs');
const path = require('path');

export default function handler(req, res) {
  // Read the HTML file
  let html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  
  // Get API key from environment variable
  const apiKey = process.env.LIN_CLINIC_GOOGLE_MAPS_KEY || '';
  
  // Inject the API key as a script before </head>
  const keyScript = `<script>window.LIN_CLINIC_GOOGLE_MAPS_KEY = '${apiKey}';</script>`;
  html = html.replace('</head>', keyScript + '\n  </head>');
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}
