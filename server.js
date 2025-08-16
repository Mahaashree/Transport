// server.js - FIXED VERSION
const express = require('express');
require('dotenv').config();
const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
// Enable CORS for your frontend
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000'],
    credentials: true
}));

const projectId = "stunning-shadow-454718-r7";


// Initialize Google Auth
const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    // Use service account key file or default credentials
    keyFilename: 'stunning-shadow-454718-r7-1eb800dfd42b.json' // Update this path
});



// Route to get authentication token (if needed separately)
app.get('/api/get-token', async (req, res) => {
    try {
        const authClient = await auth.getClient();
        const accessToken = await authClient.getAccessToken();
        
        res.json({ 
            token: accessToken.token,
            expires_in: 3600 // 1 hour
        });
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ 
            error: 'Failed to get access token', 
            details: error.message 
        });
    }
});

// Main optimization endpoint - Updated for Route Optimization API
app.post('/api/optimize', async (req, res) => {
    try {
        console.log('Received optimization request:', JSON.stringify(req.body, null, 2));
        
        // Get authenticated client
        const authClient = await auth.getClient();
        
        // CORRECTED: Use Route Optimization API endpoint
        const url = `https://routeoptimization.googleapis.com/v1/projects/${projectId}:optimizeTours`;
        
        // Make request to Google Route Optimization API
        const response = await authClient.request({
            url: url,
            method: 'POST',
            data: req.body,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'bus-route-optimizer/1.0'
            }
        });
        
        console.log('Google API Response Status:', response.status);
        console.log('Google API Response:', JSON.stringify(response.data, null, 2));
        
        // Return the optimization result
        res.json(response.data);
        
    } catch (error) {
        console.error('Route Optimization API Error:', error);
        
        let errorDetails = {
            message: error.message,
            status: error.response?.status || 500
        };
        
        if (error.response?.data) {
            errorDetails.apiError = error.response.data;
            console.error('Google API Error Details:', error.response.data);
        }
        
        res.status(errorDetails.status).json({
            error: 'Route Optimization API failed',
            details: errorDetails
        });
    }
});

// Google Maps Directions API endpoint
app.post('/api/directions', async (req, res) => {
    try {
        const { origin, destination, waypoints, optimizeWaypoints, travelMode, avoidHighways, avoidTolls, avoidFerries, units } = req.body;
        
        
        // Validate API key
        const API_KEY = process.env.GOOGLE_API_KEY;
        if (!API_KEY) {
            return res.status(500).json({ 
                error: 'Google Maps API key not configured',
                status: 'REQUEST_DENIED'
            });
        }
        
        // Build Google Maps API URL
        const baseUrl = 'https://maps.googleapis.com/maps/api/directions/json';
        const params = new URLSearchParams({
            origin: origin,
            destination: destination,
            mode: travelMode || 'driving',
            units: units || 'metric',
            key: API_KEY
        });
        
        // Add waypoints if provided
        if (waypoints && waypoints.length > 0) {
            const waypointStr = waypoints
                .map(wp => wp.location)
                .join('|');
            params.append('waypoints', waypointStr);
            
            if (optimizeWaypoints) {
                params.append('optimize', 'true');
            }
        }
        
        // Add avoidance options
        const avoid = [];
        if (avoidHighways) avoid.push('highways');
        if (avoidTolls) avoid.push('tolls');
        if (avoidFerries) avoid.push('ferries');
        
        if (avoid.length > 0) {
            params.append('avoid', avoid.join('|'));
        }
        
        console.log('🗺️ Calling Google Maps API:', baseUrl + '?' + params.toString());
        
        // Make request to Google Maps API
        const response = await axios.get(baseUrl + '?' + params.toString(), {
            timeout: 10000 // 10 second timeout
        });
        
        // Log API usage for monitoring
        console.log(`✅ Google Maps API response: ${response.data.status}`);
        
        // Return the response
        res.json(response.data);
        
    } catch (error) {
        console.error('Google Maps API Error:', error.message);
        
        if (error.response) {
            // API responded with error
            res.status(error.response.status).json({
                error: 'Google Maps API error',
                details: error.response.data,
                status: 'API_ERROR'
            });
        } else if (error.code === 'ECONNABORTED') {
            // Timeout
            res.status(408).json({
                error: 'Request timeout',
                message: 'Google Maps API request timed out',
                status: 'TIMEOUT'
            });
        } else {
            // Other errors
            res.status(500).json({
                error: 'Internal server error',
                message: error.message,
                status: 'SERVER_ERROR'
            });
        }
    }
});


// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'bus-route-optimizer',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ 
        error: 'Internal server error', 
        details: error.message 
    });
});

// Clean request data to remove undefined/null values
function cleanRequestData(data) {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => cleanRequestData(item)).filter(item => item !== undefined);
  }
  
  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      cleaned[key] = cleanRequestData(value);
    }
  }
  return cleaned;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});