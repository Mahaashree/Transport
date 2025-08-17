// server.js - ES MODULE VERSION
import express from 'express';
import { GoogleAuth } from 'google-auth-library';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Enable CORS for your frontend
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));

const projectId = "stunning-shadow-454718-r7";

const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    // Use service account key file or default credentials
    keyFilename: join(__dirname, 'stunning-shadow-454718-r7-1eb800dfd42b.json') // Update this path
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