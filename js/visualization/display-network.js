// Route Network Visualization with Google Maps

// Global variables
let map = null;
let routeData = null;
let routePolylines = [];
let routeMarkers = [];
let collegeMarker = null;
let infoWindow = null;
let showLabels = true;

// College coordinates (Rajalakshmi Engineering College)
const COLLEGE_COORDS = { lat: 13.008867898985972, lng: 80.00353386796435 };

// Route colors for visualization
const ROUTE_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', 
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#1DD1A1', '#FD79A8', '#FDCB6E', '#6C5CE7', '#74B9FF',
    '#00B894', '#E17055', '#81ECEC', '#A29BFE', '#FD63C3',
    '#55A3FF', '#26DE81', '#FC7676', '#F8C291', '#786FA6'
];

// Initialize Google Map
function initMap() {
    console.log('🗺️ Initializing Google Maps...');
    
    // Create map
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 10,
        center: COLLEGE_COORDS,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
            {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
            }
        ]
    });
    
    // Create info window
    infoWindow = new google.maps.InfoWindow();
    
    // Add college marker with simple circle icon (avoiding btoa issues)
    collegeMarker = new google.maps.Marker({
        position: COLLEGE_COORDS,
        map: map,
        title: 'Rajalakshmi Engineering College',
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 15,
            fillColor: '#2d3748',
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 2
        },
        zIndex: 1000
    });
    
    // Add college marker click event
    collegeMarker.addListener('click', () => {
        infoWindow.setContent(`
            <div style="padding: 10px;">
                <h3 style="margin: 0 0 10px 0; color: #2d3748;">Rajalakshmi Engineering College</h3>
                <p style="margin: 0; color: #4a5568;">Main Campus</p>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #718096;">
                    Coordinates: ${COLLEGE_COORDS.lat.toFixed(6)}, ${COLLEGE_COORDS.lng.toFixed(6)}
                </p>
            </div>
        `);
        infoWindow.open(map, collegeMarker);
    });
    
    console.log('✅ Google Maps initialized successfully');
    console.log('✅ Google Maps initialized successfully');
    showStatus('Google Maps loaded successfully', 'success');
}
// Load route data from inner-routes.json
// Load route data from inner-routes.json
async function loadRouteData() {
    try {howStatus('Loading route data...', 'info');
        showStatus('Loading route data...', 'info');
        // Fix the file path - use the correct path from the server
        const response = await fetch('../Routes_Data/Existing-Routes/inner-routes.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        routeData = await response.json();
        console.log('📊 Route data loaded:', routeData);
        
        // Process and display the data
        processRouteData();
        populateRouteList();
        updateStatistics();
        
        showStatus(`Successfully loaded ${Object.keys(routeData.routes).length} routes`, 'success');
        
        // Show legend
        document.getElementById('routeLegend').style.display = 'block';
        
    } catch (error) {
        console.error('❌ Failed to load route data:', error);
        showStatus(`Failed to load route data: ${error.message}`, 'error');
    }
}

// Process route data for visualization
function processRouteData() {
    if (!routeData || !routeData.routes) {
        console.error('No route data to process');
        return;
    }
    
    console.log(`🔄 Processing ${Object.keys(routeData.routes).length} routes...`);
    
    // Clear existing visualization
    clearMap();
    
    // Process each route
    Object.entries(routeData.routes).forEach(([routeId, route], index) => {
        if (route.coordinates && route.coordinates.length > 0) {
            console.log(`📍 Processing route: ${route.name} (${route.coordinates.length} points)`);
            
            // Add route to map but don't display yet
            route.color = ROUTE_COLORS[index % ROUTE_COLORS.length];
            route.id = routeId;
            route.visible = false; // Initially hidden
        }
    });
    
    console.log('✅ Route data processed');
}

// Populate route list in control panel
function populateRouteList() {
    const routeListContainer = document.getElementById('routeList');
    
    if (!routeData || !routeData.routes) {
        routeListContainer.innerHTML = '<p style="text-align: center; color: #e53e3e;">No route data available</p>';
        return;
    }
    
    let routeListHtml = '';
    
    Object.entries(routeData.routes).forEach(([routeId, route], index) => {
        const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
        const pointCount = route.coordinates ? route.coordinates.length : 0;
        
        routeListHtml += `
            <div class="route-item" data-route-id="${routeId}" onclick="toggleRoute('${routeId}')" 
                 style="border-left: 4px solid ${color};">
                <div style="font-weight: 600; margin-bottom: 2px;">${route.name}</div>
                <div style="font-size: 12px; color: #718096;">${pointCount} points</div>
            </div>
        `;
    });
    
    routeListContainer.innerHTML = routeListHtml;
    console.log('✅ Route list populated');
}

// Toggle individual route visibility
function toggleRoute(routeId) {
    if (!routeData || !routeData.routes[routeId]) {
        console.error('Route not found:', routeId);
        return;
    }
    
    const route = routeData.routes[routeId];
    const routeItem = document.querySelector(`[data-route-id="${routeId}"]`);
    
    if (route.visible) {
        // Hide route
        hideRoute(routeId);
        routeItem.classList.remove('selected');
        showStatus(`Hidden route: ${route.name}`, 'info');
    } else {
        // Show route
        showRoute(routeId);
        routeItem.classList.add('selected');
        showStatus(`Showing route: ${route.name}`, 'info');
    }
    
    updateStatistics();
}

// Show specific route on map
function showRoute(routeId) {
    const route = routeData.routes[routeId];
    if (!route || !route.coordinates || route.coordinates.length === 0) {
        console.error('Invalid route data for:', routeId);
        return;
    }
    
    // Create path coordinates
    const path = route.coordinates.map(coord => ({
        lat: coord.lat,
        lng: coord.lng
    }));
    
    // Create polyline
    const polyline = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: route.color,
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map: map
    });
    
    // Add click event to polyline
    polyline.addListener('click', (event) => {
        infoWindow.setContent(`
            <div style="padding: 10px;">
                <h3 style="margin: 0 0 10px 0; color: #2d3748;">${route.name}</h3>
                <p style="margin: 0; color: #4a5568;"><strong>Points:</strong> ${route.coordinates.length}</p>
                <p style="margin: 5px 0; color: #4a5568;"><strong>Method:</strong> ${route.extractionMethod}</p>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #718096;">
                    Click coordinates: ${event.latLng.lat().toFixed(6)}, ${event.latLng.lng().toFixed(6)}
                </p>
            </div>
        `);
        infoWindow.setPosition(event.latLng);
        infoWindow.open(map);
    });
    
    // Create markers for route points using simple symbols
    const markers = [];
    route.coordinates.forEach((coord, index) => {
        const marker = new google.maps.Marker({
            position: { lat: coord.lat, lng: coord.lng },
            map: showLabels ? map : null,
            title: `${route.name} - Point ${index + 1}`,
            icon: {
                url: 'data:image/svg+xml;base64,' + btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
                        <circle cx="6" cy="6" r="5" fill="${route.color}" stroke="white" stroke-width="1"/>
                    </svg>y: 1,
                `),okeColor: 'white',
                scaledSize: new google.maps.Size(12, 12)
            }
        });
        
        // Add marker click event
        marker.addListener('click', () => {
            infoWindow.setContent(`
                <div style="padding: 10px;">
                    <h3 style="margin: 0 0 10px 0; color: #2d3748;">${route.name}</h3>
                    <p style="margin: 0; color: #4a5568;"><strong>Point:</strong> ${index + 1} of ${route.coordinates.length}</p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #718096;">
                        Coordinates: ${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}
                    </p>
                </div>
            `);
            infoWindow.open(map, marker);
        });
        
        markers.push(marker);
    });
    
    // Store polyline and markers for later removal
    routePolylines.push({ id: routeId, polyline: polyline, markers: markers });
    route.visible = true;
    
    console.log(`✅ Route ${route.name} displayed with ${route.coordinates.length} points`);
}

// Hide specific route from map
function hideRoute(routeId) {
    const routeData = routePolylines.find(r => r.id === routeId);
    if (routeData) {
        // Remove polyline
        routeData.polyline.setMap(null);
        
        // Remove markers
        routeData.markers.forEach(marker => marker.setMap(null));
        
        // Remove from array
        const index = routePolylines.indexOf(routeData);
        routePolylines.splice(index, 1);
        
        // Update route visibility
        if (window.routeData && window.routeData.routes[routeId]) {
            window.routeData.routes[routeId].visible = false;
        }
        
        console.log(`✅ Route ${routeId} hidden`);
    }
}

// Show all routes
function showAllRoutes() {
    if (!routeData || !routeData.routes) {
        showStatus('No route data loaded', 'error');
        return;
    }
    
    console.log('🎨 Showing all routes...');
    
    Object.keys(routeData.routes).forEach(routeId => {
        if (!routeData.routes[routeId].visible) {
            showRoute(routeId);
            const routeItem = document.querySelector(`[data-route-id="${routeId}"]`);
            if (routeItem) routeItem.classList.add('selected');
        }
    });
    
    updateStatistics();
    fitToRoutes();
    showStatus(`Showing all ${Object.keys(routeData.routes).length} routes`, 'success');
}

// Clear all routes from map
function clearMap() {
    console.log('🧹 Clearing map...');
    
    // Clear polylines
    routePolylines.forEach(routeData => {
        routeData.polyline.setMap(null);
        routeData.markers.forEach(marker => marker.setMap(null));
    });
    routePolylines = [];
    
    // Update route visibility
    if (routeData && routeData.routes) {
        Object.values(routeData.routes).forEach(route => {
            route.visible = false;
        });
    }
    
    // Clear selection in UI
    document.querySelectorAll('.route-item.selected').forEach(item => {
        item.classList.remove('selected');
    });
    
    updateStatistics();
    showStatus('Map cleared', 'info');
}

// Fit map to show all visible routes
function fitToRoutes() {
    const visibleRoutes = routePolylines;
    if (visibleRoutes.length === 0) {
        showStatus('No routes to fit to', 'error');
        return;
    }
    
    const bounds = new google.maps.LatLngBounds();
    
    // Add college to bounds
    bounds.extend(COLLEGE_COORDS);
    
    // Add all route points to bounds
    visibleRoutes.forEach(routeData => {
        routeData.polyline.getPath().getArray().forEach(point => {
            bounds.extend(point);
        });
    });
    
    map.fitBounds(bounds);
    showStatus(`Map fitted to ${visibleRoutes.length} routes`, 'success');
}

// Center map on college
function centerOnCollege() {
    map.setCenter(COLLEGE_COORDS);
    map.setZoom(12);
    showStatus('Map centered on college', 'info');
}

// Toggle route point labels
function toggleRouteLabels() {
    showLabels = !showLabels;
    
    routePolylines.forEach(routeData => {
        routeData.markers.forEach(marker => {
            marker.setMap(showLabels ? map : null);
        });
    });
    
    showStatus(`Route labels ${showLabels ? 'enabled' : 'disabled'}`, 'info');
}

// Update statistics display
function updateStatistics() {
    const totalRoutes = routeData ? Object.keys(routeData.routes).length : 0;
    const activeRoutes = routePolylines.length;
    
    let totalPoints = 0;
    if (routeData && routeData.routes) {
        totalPoints = Object.values(routeData.routes).reduce((sum, route) => {
            return sum + (route.coordinates ? route.coordinates.length : 0);
        }, 0);
    }
    
    // Calculate average distance from college for visible routes
    let avgDistance = '-';
    if (routePolylines.length > 0) {
        let totalDistance = 0;
        let pointCount = 0;
        
        routePolylines.forEach(routeData => {
            const routeId = routeData.id;
            const route = window.routeData.routes[routeId];
            if (route && route.coordinates) {
                route.coordinates.forEach(coord => {
                    const distance = calculateDistance(
                        COLLEGE_COORDS.lat, COLLEGE_COORDS.lng,
                        coord.lat, coord.lng
                    );
                    totalDistance += distance;
                    pointCount++;
                });
            }
        });
        
        if (pointCount > 0) {
            avgDistance = `${(totalDistance / pointCount).toFixed(1)} km`;
        }
    }
    
    document.getElementById('totalRoutes').textContent = totalRoutes;
    document.getElementById('totalPoints').textContent = totalPoints;
    document.getElementById('activeRoutes').textContent = activeRoutes;
    document.getElementById('collegeDistance').textContent = avgDistance;
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

// Show status message
function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = 'block';
    
    console.log(`📊 Status: ${message}`);
    
    // Auto-hide after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }
}

// Global function for Google Maps callback
window.initMap = initMap;

// Make sure all functions are globally accessible
window.loadRouteData = loadRouteData;
window.showAllRoutes = showAllRoutes;
window.clearMap = clearMap;
window.toggleRouteLabels = toggleRouteLabels;
window.fitToRoutes = fitToRoutes;
window.centerOnCollege = centerOnCollege;
window.toggleRoute = toggleRoute;
window.showStatus = showStatus;
