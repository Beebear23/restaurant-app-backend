const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Yelp API Configuration
const YELP_API_KEY = process.env.YELP_API_KEY;
const YELP_API_URL = 'https://api.yelp.com/v3/businesses/search';

// Mock restaurant data
const mockRestaurants = [
  {
    id: 'rest-1',
    name: 'Spur Steak Ranch - Sandton',
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    rating: 4.5,
    review_count: 342,
    categories: [{ title: 'Steakhouse' }, { title: 'Family Dining' }],
    location: {
      address1: 'Nelson Mandela Square',
      city: 'Sandton',
      state: 'Gauteng',
      display_address: ['Nelson Mandela Square', 'Sandton, Gauteng']
    },
    phone: '+27115551234',
    display_phone: '011 555 1234',
    price: '$$'
  },
  {
    id: 'rest-2',
    name: 'Spur Steak Ranch - Waterfront',
    image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
    rating: 4.7,
    review_count: 567,
    categories: [{ title: 'Steakhouse' }, { title: 'Grill' }],
    location: {
      address1: 'V&A Waterfront',
      city: 'Cape Town',
      state: 'Western Cape',
      display_address: ['V&A Waterfront', 'Cape Town, Western Cape']
    },
    phone: '+27215555678',
    display_phone: '021 555 5678',
    price: '$$'
  },
  {
    id: 'rest-3',
    name: 'Spur Steak Ranch - Gateway',
    image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    rating: 4.3,
    review_count: 234,
    categories: [{ title: 'American' }, { title: 'Family Restaurant' }],
    location: {
      address1: 'Gateway Theatre of Shopping',
      city: 'Durban',
      state: 'KwaZulu-Natal',
      display_address: ['Gateway Theatre', 'Durban, KZN']
    },
    phone: '+27315559012',
    display_phone: '031 555 9012',
    price: '$$'
  },
  {
    id: 'rest-4',
    name: 'Spur Steak Ranch - Menlyn',
    image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    rating: 4.6,
    review_count: 456,
    categories: [{ title: 'Steakhouse' }, { title: 'Bar' }],
    location: {
      address1: 'Menlyn Park Shopping Centre',
      city: 'Pretoria',
      state: 'Gauteng',
      display_address: ['Menlyn Park', 'Pretoria, Gauteng']
    },
    phone: '+27125553456',
    display_phone: '012 555 3456',
    price: '$$'
  },
  {
    id: 'rest-5',
    name: 'Spur Steak Ranch - Eastgate',
    image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800',
    rating: 4.4,
    review_count: 289,
    categories: [{ title: 'Grill' }, { title: 'Family Dining' }],
    location: {
      address1: 'Eastgate Shopping Centre',
      city: 'Johannesburg',
      state: 'Gauteng',
      display_address: ['Eastgate', 'Johannesburg, Gauteng']
    },
    phone: '+27115557890',
    display_phone: '011 555 7890',
    price: '$$'
  },
  {
    id: 'rest-6',
    name: 'Spur Steak Ranch - Canal Walk',
    image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800',
    rating: 4.8,
    review_count: 623,
    categories: [{ title: 'Steakhouse' }, { title: 'American' }],
    location: {
      address1: 'Canal Walk Shopping Centre',
      city: 'Cape Town',
      state: 'Western Cape',
      display_address: ['Canal Walk', 'Cape Town, Western Cape']
    },
    phone: '+27215552345',
    display_phone: '021 555 2345',
    price: '$$'
  }
];

// ===== RESTAURANT ROUTES =====

// Get restaurants
app.get('/api/restaurants', async (req, res) => {
  try {
    const { location = 'South Africa' } = req.query;
    console.log('Fetching restaurants for:', location);
    res.json({ businesses: mockRestaurants });
  } catch (error) {
    console.error('Error fetching restaurants:', error.message);
    res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
});

// Search restaurants
app.get('/api/restaurants/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.json({ businesses: mockRestaurants });
    }
    
    const filtered = mockRestaurants.filter(r => 
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.location.city.toLowerCase().includes(query.toLowerCase())
    );
    
    res.json({ businesses: filtered });
  } catch (error) {
    console.error('Error searching restaurants:', error.message);
    res.status(500).json({ error: 'Failed to search restaurants' });
  }
});

// Get single restaurant
app.get('/api/restaurants/:id', async (req, res) => {
  try {
    console.log('Looking for restaurant with ID:', req.params.id);
    const restaurant = mockRestaurants.find(r => r.id === req.params.id);
    
    if (restaurant) {
      console.log('Found restaurant:', restaurant.name);
      res.json(restaurant);
    } else {
      console.error('Restaurant not found with ID:', req.params.id);
      console.log('Available IDs:', mockRestaurants.map(r => r.id));
      res.status(404).json({ error: 'Restaurant not found' });
    }
  } catch (error) {
    console.error('Error fetching restaurant:', error.message);
    res.status(500).json({ error: 'Failed to fetch restaurant details' });
  }
});

// ===== REVIEW ROUTES =====

// Get reviews for a restaurant
app.get('/api/reviews/:restaurantId', async (req, res) => {
  try {
    const snapshot = await db.collection('reviews')
      .where('restaurantId', '==', req.params.restaurantId)
      .get();

    const reviews = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      reviews.push({ 
        id: doc.id, 
        ...data,
        createdAt: data.createdAt ? { _seconds: data.createdAt._seconds } : null,
        updatedAt: data.updatedAt ? { _seconds: data.updatedAt._seconds } : null
      });
    });

    reviews.sort((a, b) => {
      const dateA = a.createdAt?._seconds || 0;
      const dateB = b.createdAt?._seconds || 0;
      return dateB - dateA;
    });

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get user's reviews
app.get('/api/user-reviews/:userId', async (req, res) => {
  try {
    const snapshot = await db.collection('reviews')
      .where('userId', '==', req.params.userId)
      .get();

    const reviews = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      reviews.push({ 
        id: doc.id, 
        ...data,
        createdAt: data.createdAt ? { _seconds: data.createdAt._seconds } : null,
        updatedAt: data.updatedAt ? { _seconds: data.updatedAt._seconds } : null
      });
    });

    reviews.sort((a, b) => {
      const dateA = a.createdAt?._seconds || 0;
      const dateB = b.createdAt?._seconds || 0;
      return dateB - dateA;
    });

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ error: 'Failed to fetch user reviews' });
  }
});

// Create review
app.post('/api/reviews', async (req, res) => {
  try {
    const { restaurantId, restaurantName, restaurantImage, userId, userName, rating, comment } = req.body;

    console.log('Creating review:', { restaurantId, userId, rating });

    if (!restaurantId || !userId || !rating || !comment) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const review = {
      restaurantId: String(restaurantId),
      restaurantName: restaurantName || 'Restaurant',
      restaurantImage: restaurantImage || '',
      userId: String(userId),
      userName: userName || 'Anonymous',
      rating: Number(rating),
      comment: String(comment).trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('reviews').add(review);
    
    console.log('✅ Review created:', docRef.id);
    
    res.status(201).json({ 
      id: docRef.id, 
      ...review,
      createdAt: null,
      updatedAt: null
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Update review
app.put('/api/reviews/:id', async (req, res) => {
  try {
    const { rating, comment, userId } = req.body;
    const reviewId = req.params.id;

    const reviewDoc = await db.collection('reviews').doc(reviewId).get();
    
    if (!reviewDoc.exists) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (reviewDoc.data().userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updates = {
      rating: Number(rating),
      comment: String(comment).trim(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('reviews').doc(reviewId).update(updates);
    
    res.json({ id: reviewId, ...updates });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Delete review
app.delete('/api/reviews/:id', async (req, res) => {
  try {
    const { userId } = req.query;
    const reviewId = req.params.id;

    const reviewDoc = await db.collection('reviews').doc(reviewId).get();
    
    if (!reviewDoc.exists) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (reviewDoc.data().userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await db.collection('reviews').doc(reviewId).delete();
    
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// ===== USER ROUTES =====

app.get('/api/users/:userId', async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.params.userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ id: userDoc.id, ...userDoc.data() });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { userId, email, displayName } = req.body;

    const userData = {
      email,
      displayName,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(userId).set(userData, { merge: true });
    
    res.json({ id: userId, ...userData });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});