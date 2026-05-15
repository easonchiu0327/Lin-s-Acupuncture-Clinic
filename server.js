require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const REVIEWS_QUERY = "Lin's Acupuncture Clinic Saskatoon";
const REVIEWS_LIMIT = 5;
const REVIEWS_CACHE_TTL = 24 * 60 * 60 * 1000;
let reviewsCache = { timestamp: 0, data: null };

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'), (err) => {
    if (err) {
      console.error('Error serving root:', err);
      res.status(500).send('Error loading page');
    }
  });
});

async function fetchGoogleReviews() {
  const apiKey = process.env.LIN_CLINIC_GOOGLE_MAPS_KEY || '';
  if (!apiKey) {
    throw new Error('Missing Google Maps API key.');
  }

  const textSearchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  textSearchUrl.searchParams.set('query', REVIEWS_QUERY);
  textSearchUrl.searchParams.set('key', apiKey);

  const textSearchResponse = await fetch(textSearchUrl.toString());
  if (!textSearchResponse.ok) {
    throw new Error('Google Places Text Search failed.');
  }

  const textSearchData = await textSearchResponse.json();
  if (textSearchData.status !== 'OK' || !Array.isArray(textSearchData.results) || !textSearchData.results.length) {
    throw new Error('No Google Places results found.');
  }

  const placeId = textSearchData.results[0].place_id;
  const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  detailsUrl.searchParams.set('place_id', placeId);
  detailsUrl.searchParams.set('fields', 'name,rating,user_ratings_total,reviews,url');
  detailsUrl.searchParams.set('reviews_sort', 'newest');
  detailsUrl.searchParams.set('key', apiKey);

  const detailsResponse = await fetch(detailsUrl.toString());
  if (!detailsResponse.ok) {
    throw new Error('Google Places Details failed.');
  }

  const detailsData = await detailsResponse.json();
  if (detailsData.status !== 'OK' || !detailsData.result) {
    throw new Error('No Google Places details available.');
  }

  const place = detailsData.result;
  const rawReviews = Array.isArray(place.reviews) ? place.reviews.slice() : [];
  rawReviews.sort(function(a, b) {
    return (b.time || 0) - (a.time || 0);
  });

  const reviews = rawReviews.slice(0, REVIEWS_LIMIT).map(function(review) {
    return {
      author_name: review.author_name || 'Google Review',
      rating: Number(review.rating || 0),
      text: review.text || '',
      time: review.time || 0,
      relative_time_description: review.relative_time_description || ''
    };
  });

  return {
    place: {
      name: place.name || "Lin's Acupuncture Clinic",
      rating: Number(place.rating || 0),
      total: Number(place.user_ratings_total || 0),
      url: place.url || ''
    },
    reviews: reviews,
    fetchedAt: new Date().toISOString()
  };
}

// Reviews endpoint
app.get('/api/reviews', async (req, res) => {
  try {
    const now = Date.now();
    if (reviewsCache.data && (now - reviewsCache.timestamp) < REVIEWS_CACHE_TTL) {
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
      return res.json(reviewsCache.data);
    }

    const data = await fetchGoogleReviews();
    reviewsCache = { timestamp: now, data: data };
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    return res.json(data);
  } catch (error) {
    console.error('Reviews error:', error);
    return res.status(500).json({ message: 'Failed to load Google reviews.' });
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

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🏥 Lin's Acupuncture Clinic website running at http://localhost:${PORT}`);
    const keyStatus = process.env.LIN_CLINIC_GOOGLE_MAPS_KEY ? '✓ Loaded' : '✗ Missing (check .env file)';
    console.log(`Google Reviews API Key: ${keyStatus}`);
  });
}

module.exports = app;
