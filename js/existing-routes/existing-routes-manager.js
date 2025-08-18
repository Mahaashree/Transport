// Main manager for existing routes functionality

// Global variables
let map = null;
let stopCoordinatesData = [];
let currentMarkers = [];
let routeLines = [];
let showRouteLines = false;
let showStopLabels = true;

// College coordinates
const COLLEGE_COORDS = [13.008867898985972, 80.00353386796435];

// Route colors for visualization
const ROUTE_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', 
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#54A0FF', '#5F27CD', '#1DD1A1', '#FD79A8', '#FDCB6E',
    '#6C5CE7', '#74B9FF', '#00B894', '#E17055', '#81ECEC'
];

// Initialize the existing routes viewer
function initializeExistingRoutes() {
    try {
        console.log('🗺️ Initializing map...');
        initializeMap();
        
        console.log('🎛️ Setting up controls...');
        setupEventListeners();
        
        console.log('📊 Updating initial stats...');
        updateStatistics();
        
        showStatus('Ready to load existing route data', 'info');
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        showStatus('Failed to initialize application', 'error');
    }
}

// Initialize the Leaflet map
function initializeMap() {
    // Initialize map centered on college
    map = L.map('map').setView(COLLEGE_COORDS, 11);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);
    
    // Add college marker
    const collegeIcon = L.divIcon({
        html: '<i class="fas fa-university" style="color: #2d3748; font-size: 20px;"></i>',
        iconSize: [30, 30],
        className: 'college-marker'
    });
    
    L.marker(COLLEGE_COORDS, { 
        icon: collegeIcon,
        title: 'Rajalakshmi Engineering College'
    }).addTo(map)
    .bindPopup('<b>Rajalakshmi Engineering College</b><br>Main Campus')
    .openPopup();
    
    console.log('✅ Map initialized successfully');
}

// Set up event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('routeSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleRouteSearch, 300));
    }
    
    // Route filter
    const routeFilter = document.getElementById('routeFilter');
    if (routeFilter) {
        routeFilter.addEventListener('change', handleRouteFilter);
    }
    
    console.log('✅ Event listeners set up');
}

// Load stop coordinates data
async function loadStopCoordinates() {
    try {
        showStatus('Loading stop coordinates data...', 'info');
        
        // Load the actual extracted coordinates CSV
        const csvData = await loadCSVData();
        if (csvData && csvData.length > 0) {
            stopCoordinatesData = csvData;
            console.log(`📊 Loaded ${stopCoordinatesData.length} actual stops from extracted_stop_coordinates.csv`);
            
            // Process and visualize the data
            processStopData();
            visualizeAllStops();
            populateRouteFilter();
            updateStatistics();
            
            showStatus(`Successfully loaded ${stopCoordinatesData.length} actual stops from ${getUniqueRouteCount()} routes`, 'success');
        } else {
            throw new Error('Could not load extracted_stop_coordinates.csv - please ensure the file exists');
        }
        
    } catch (error) {
        console.error('❌ Failed to load stop coordinates:', error);
        showStatus(`Failed to load data: ${error.message}`, 'error');
    }
}

// Load CSV data from the actual extracted coordinates file
async function loadCSVData() {
    try {
        // Try multiple possible paths for the CSV file
        const possiblePaths = [
            'Routes_Data/extracted_stop_coordinates.csv',
            '/Routes_Data/extracted_stop_coordinates.csv',
            './Routes_Data/extracted_stop_coordinates.csv',
            '../Routes_Data/extracted_stop_coordinates.csv'
        ];
        
        let response = null;
        let csvText = null;
        
        for (const path of possiblePaths) {
            try {
                console.log(`🔍 Trying to load from: ${path}`);
                response = await fetch(path);
                if (response.ok) {
                    csvText = await response.text();
                    console.log(`✅ Successfully loaded CSV from: ${path}`);
                    break;
                }
            } catch (err) {
                console.log(`❌ Failed to load from ${path}: ${err.message}`);
                continue;
            }
        }
        
        if (!csvText) {
            console.log('📄 Could not load CSV file from any path');
            return null;
        }
        
        return parseCSVText(csvText);
        
    } catch (error) {
        console.log('📄 CSV loading failed:', error);
        return null;
    }
}

// Parse CSV text with proper handling of the extracted coordinates format
function parseCSVText(csvText) {
    const lines = csvText.split('\n');
    if (lines.length < 2) {
        console.error('CSV file appears to be empty or invalid');
        return [];
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log(`📋 CSV Headers found: ${headers.join(', ')}`);
    
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = parseCSVLine(line);
        if (values.length >= headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] ? values[index].replace(/"/g, '') : '';
            });
            
            // Validate and normalize the required fields for extracted coordinates
            const lat = parseFloat(row.snapped_latitude || row.snapped_lat || row.latitude);
            const lng = parseFloat(row.snapped_longitude || row.snapped_lng || row.longitude);
            const routeName = row.route_name || row.routeName || 'Unknown Route';
            const stopName = row.stop_name || row.stopName || 'Unknown Stop';
            
            if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                // Create normalized data structure
                const normalizedStop = {
                    route_name: routeName,
                    stop_name: stopName,
                    stop_id: row.stop_id || row.stopId || `stop_${i}`,
                    snapped_latitude: lat.toString(),
                    snapped_longitude: lng.toString(),
                    original_latitude: row.original_latitude || row.originalLatitude || lat.toString(),
                    original_longitude: row.original_longitude || row.originalLongitude || lng.toString(),
                    formatted_address: row.formatted_address || row.formattedAddress || `${stopName}, India`,
                    place_id: row.place_id || row.placeId || '',
                    search_query: row.search_query || row.searchQuery || `${stopName}`,
                    route_index: row.route_index || row.routeIndex || 0,
                    isGenerated: false // These are real extracted coordinates
                };
                
                data.push(normalizedStop);
                
                if (data.length <= 5) {
                    console.log(`📍 Sample stop: ${stopName} at ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                }
            } else {
                console.warn(`⚠️ Invalid coordinates for stop: ${stopName} (${lat}, ${lng})`);
            }
        }
    }
    
    console.log(`✅ Parsed ${data.length} valid stops from CSV`);
    return data;
}

// Remove the generateStopCoordinates function since we're using real data
// Don't generate fake coordinates - use actual extracted data only

// Process stop data for better visualization
function processStopData() {
    console.log(`🔄 Processing ${stopCoordinatesData.length} actual stop coordinates...`);
    
    // Add additional properties for visualization
    stopCoordinatesData.forEach((stop, index) => {
        stop.index = index;
        stop.lat = parseFloat(stop.snapped_latitude);
        stop.lng = parseFloat(stop.snapped_longitude);
        stop.visible = true;
        
        // Calculate distance from college
        stop.distanceFromCollege = calculateDistance(
            COLLEGE_COORDS[0], COLLEGE_COORDS[1],
            stop.lat, stop.lng
        );
        
        // Assign color based on route
        const routeIndex = getRouteIndex(stop.route_name);
        stop.color = ROUTE_COLORS[routeIndex % ROUTE_COLORS.length];
        
        // Log a few samples to verify coordinates
        if (index < 3) {
            console.log(`📍 Stop ${index + 1}: ${stop.stop_name} (${stop.route_name}) at ${stop.lat.toFixed(6)}, ${stop.lng.toFixed(6)} - Distance: ${stop.distanceFromCollege.toFixed(2)}km`);
        }
    });
    
    // Sort by route name for better organization
    stopCoordinatesData.sort((a, b) => a.route_name.localeCompare(b.route_name));
    
    // Log coordinate bounds to verify they're not all in Chennai
    const latitudes = stopCoordinatesData.map(s => s.lat);
    const longitudes = stopCoordinatesData.map(s => s.lng);
    const bounds = {
        minLat: Math.min(...latitudes),
        maxLat: Math.max(...latitudes),
        minLng: Math.min(...longitudes),
        maxLng: Math.max(...longitudes)
    };
    
    console.log(`📊 Coordinate bounds:`, bounds);
    console.log(`   Latitude range: ${bounds.minLat.toFixed(6)} to ${bounds.maxLat.toFixed(6)}`);
    console.log(`   Longitude range: ${bounds.minLng.toFixed(6)} to ${bounds.maxLng.toFixed(6)}`);
    
    console.log('✅ Stop data processed with actual coordinates');
}

// Get unique route index for color assignment
function getRouteIndex(routeName) {
    const uniqueRoutes = [...new Set(stopCoordinatesData.map(s => s.route_name))];
    return uniqueRoutes.indexOf(routeName);
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Get count of unique routes
function getUniqueRouteCount() {
    return [...new Set(stopCoordinatesData.map(s => s.route_name))].length;
}

// Update statistics display
function updateStatistics() {
    const totalRoutes = getUniqueRouteCount();
    const totalStops = stopCoordinatesData.length;
    const visibleStops = stopCoordinatesData.filter(s => s.visible).length;
    const actualCoordinates = stopCoordinatesData.filter(s => !s.isGenerated).length;
    const successRate = (actualCoordinates / totalStops * 100);
    
    document.getElementById('totalRoutes').textContent = totalRoutes;
    document.getElementById('totalStops').textContent = totalStops;
    document.getElementById('visibleStops').textContent = visibleStops;
    document.getElementById('successRate').textContent = `${successRate.toFixed(1)}%`;
    
    // Log statistics for verification
    console.log(`📊 Statistics: ${totalRoutes} routes, ${totalStops} stops, ${successRate.toFixed(1)}% success rate`);
}

// Show status message
function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = 'block';
    
    // Auto-hide after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Center map on college
function centerMapOnCollege() {
    if (map) {
        map.setView(COLLEGE_COORDS, 11);
        showStatus('Map centered on college', 'info');
    }
}

// Fit map to show all visible stops
function fitAllStops() {
    const visibleStops = stopCoordinatesData.filter(s => s.visible);
    if (visibleStops.length === 0) {
        showStatus('No visible stops to fit', 'error');
        return;
    }
    
    const group = new L.featureGroup();
    visibleStops.forEach(stop => {
        L.marker([stop.lat, stop.lng]).addTo(group);
    });
    
    // Add college to the bounds
    L.marker(COLLEGE_COORDS).addTo(group);
    
    map.fitBounds(group.getBounds().pad(0.1));
    showStatus(`Map fitted to ${visibleStops.length} visible stops`, 'success');
}
