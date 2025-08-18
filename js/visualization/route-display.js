// Route Display Script - Visualizes all routes from routes.json
// This script loads and displays all existing routes with interactive features

class RouteDisplay {
    constructor() {
        this.map = null;
        this.routes = {};
        this.routePolylines = {};
        this.routeMarkers = {};
        this.isInitialized = false;
        this.routeColors = [
            '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
            '#FFA500', '#800080', '#008000', '#FFC0CB', '#A52A2A', '#808080',
            '#FFD700', '#4B0082', '#FF1493', '#00CED1', '#32CD32', '#FF4500',
            '#DA70D6', '#00FA9A', '#FF69B4', '#4169E1', '#8B4513', '#2E8B57',
            '#FF6347', '#40E0D0', '#EE82EE', '#F0E68C', '#90EE90', '#FFB6C1',
            '#20B2AA', '#87CEEB', '#DDA0DD', '#98FB98', '#F0F8FF', '#FFE4B5'
        ];
        this.currentColorIndex = 0;
        this.selectedRoutes = new Set();
        this.routeInfoWindow = null;
        this.routeList = [];
        this.filteredRoutes = [];
        this.searchTerm = '';
    }

    // Initialize the display
    async initialize() {
        try {
            console.log('🗺️ Initializing Route Display...');
            
            // Load routes from routes.json
            await this.loadRoutes();
            
            // Initialize map if Google Maps is available
            if (typeof google !== 'undefined' && google.maps) {
                this.initializeMap();
            } else {
                console.log('⏳ Waiting for Google Maps to load...');
                // Wait for Google Maps to load
                const checkInterval = setInterval(() => {
                    if (typeof google !== 'undefined' && google.maps) {
                        clearInterval(checkInterval);
                        this.initializeMap();
                    }
                }, 100);
            }
            
        } catch (error) {
            console.error('❌ Error initializing Route Display:', error);
        }
    }

    // Load routes from routes.json
    async loadRoutes() {
        try {
            const response = await fetch('../Routes_Data/Existing-Routes/routes.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.routes = data.routes;
            this.routeList = Object.keys(this.routes);
            this.filteredRoutes = [...this.routeList];
            
            console.log(`✅ Loaded ${Object.keys(this.routes).length} routes from routes.json`);
            console.log(`📊 Total routes: ${data.totalRoutes}`);
            console.log(`🔍 Extraction methods:`, data.extractionMethods);
            
            // Display route summary
            this.displayRouteSummary();
            
        } catch (error) {
            console.error('❌ Error loading routes:', error);
            throw error;
        }
    }

    // Initialize Google Map
    initializeMap() {
        try {
            // Create map centered on Chennai
            this.map = new google.maps.Map(document.getElementById('route-display-map'), {
                zoom: 10,
                center: { lat: 13.0827, lng: 80.2707 }, // Chennai center
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                styles: [
                    {
                        featureType: 'poi',
                        elementType: 'labels',
                        stylers: [{ visibility: 'off' }]
                    }
                ]
            });

            // Create info window for route details
            this.routeInfoWindow = new google.maps.InfoWindow();

            // Add map controls
            this.addMapControls();

            // Plot all routes
            this.plotAllRoutes();

            this.isInitialized = true;
            console.log('✅ Map initialized successfully');

        } catch (error) {
            console.error('❌ Error initializing map:', error);
        }
    }

    // Add map controls
    addMapControls() {
        // Create control panel
        const controlPanel = document.createElement('div');
        controlPanel.className = 'route-display-controls';
        controlPanel.innerHTML = `
            <div class="control-header">
                <h3>Route Display (${Object.keys(this.routes).length})</h3>
                <div class="search-container">
                    <input type="text" id="route-search" placeholder="Search routes..." class="search-input">
                    <button id="clear-search" class="control-btn">Clear</button>
                </div>
                <div class="control-buttons">
                    <button id="select-all-routes" class="control-btn">Select All</button>
                    <button id="deselect-all-routes" class="control-btn">Deselect All</button>
                    <button id="fit-to-routes" class="control-btn">Fit to Routes</button>
                    <button id="clear-routes" class="control-btn">Clear All</button>
                    <button id="export-coordinates" class="control-btn">Export CSV</button>
                </div>
            </div>
            <div class="route-list" id="route-list">
                <!-- Route checkboxes will be added here -->
            </div>
        `;

        // Add control panel to map
        this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(controlPanel);

        // Add event listeners
        this.addControlEventListeners();
    }

    // Add event listeners for controls
    addControlEventListeners() {
        document.getElementById('select-all-routes').addEventListener('click', () => {
            this.selectAllRoutes();
        });

        document.getElementById('deselect-all-routes').addEventListener('click', () => {
            this.deselectAllRoutes();
        });

        document.getElementById('fit-to-routes').addEventListener('click', () => {
            this.fitMapToRoutes();
        });

        document.getElementById('clear-routes').addEventListener('click', () => {
            this.clearAllRoutes();
        });

        document.getElementById('export-coordinates').addEventListener('click', () => {
            this.exportCoordinatesToCSV();
        });

        // Search functionality
        document.getElementById('route-search').addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterRoutes();
        });

        document.getElementById('clear-search').addEventListener('click', () => {
            document.getElementById('route-search').value = '';
            this.searchTerm = '';
            this.filterRoutes();
        });
    }

    // Filter routes based on search term
    filterRoutes() {
        this.filteredRoutes = this.routeList.filter(routeName => 
            routeName.toLowerCase().includes(this.searchTerm)
        );
        this.populateRouteList();
    }

    // Plot all routes on the map
    plotAllRoutes() {
        console.log('🎨 Plotting all routes on map...');
        
        Object.keys(this.routes).forEach((routeName, index) => {
            this.plotRoute(routeName, this.routes[routeName]);
        });

        // Populate route list
        this.populateRouteList();
    }

    // Plot a single route
    plotRoute(routeName, routeData) {
        try {
            const color = this.getNextColor();
            
            // Create polyline
            const polyline = new google.maps.Polyline({
                path: routeData.coordinates,
                geodesic: true,
                strokeColor: color,
                strokeOpacity: 0.8,
                strokeWeight: 3,
                map: this.map
            });

            // Create start and end markers
            const startMarker = new google.maps.Marker({
                position: routeData.coordinates[0],
                map: this.map,
                title: `${routeName} - Start`,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 6,
                    fillColor: color,
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2
                }
            });

            const endMarker = new google.maps.Marker({
                position: routeData.coordinates[routeData.coordinates.length - 1],
                map: this.map,
                title: `${routeName} - End`,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 6,
                    fillColor: color,
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2
                }
            });

            // Add click listener to polyline
            polyline.addListener('click', (event) => {
                this.showRouteInfo(routeName, routeData, event.latLng);
            });

            // Store references
            this.routePolylines[routeName] = {
                polyline: polyline,
                startMarker: startMarker,
                endMarker: endMarker,
                color: color,
                visible: true
            };

        } catch (error) {
            console.error(`❌ Error plotting route ${routeName}:`, error);
        }
    }

    // Show route information
    showRouteInfo(routeName, routeData, position) {
        const content = `
            <div class="route-info">
                <h4>${routeName}</h4>
                <p><strong>Points:</strong> ${routeData.pointCount}</p>
                <p><strong>Extraction Method:</strong> ${routeData.extractionMethod}</p>
                <p><strong>Distance:</strong> ${this.calculateRouteDistance(routeData.coordinates).toFixed(2)} km</p>
                <div class="route-actions">
                    <button onclick="routeDisplay.toggleRoute('${routeName}')" class="info-btn">
                        ${this.routePolylines[routeName]?.visible ? 'Hide' : 'Show'}
                    </button>
                    <button onclick="routeDisplay.fitToRoute('${routeName}')" class="info-btn">
                        Fit to Route
                    </button>
                    <button onclick="routeDisplay.showRouteCoordinates('${routeName}')" class="info-btn">
                        Show Coordinates
                    </button>
                </div>
            </div>
        `;

        this.routeInfoWindow.setContent(content);
        this.routeInfoWindow.setPosition(position);
        this.routeInfoWindow.open(this.map);
    }

    // Show route coordinates in a modal
    showRouteCoordinates(routeName) {
        const routeData = this.routes[routeName];
        const coordinates = routeData.coordinates;
        
        let coordinatesText = `Route: ${routeName}\nPoints: ${routeData.pointCount}\n\nCoordinates:\n`;
        coordinates.forEach((coord, index) => {
            coordinatesText += `${index + 1}. Lat: ${coord.lat}, Lng: ${coord.lng}\n`;
        });

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'coordinates-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${routeName} Coordinates</h3>
                    <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <pre>${coordinatesText}</pre>
                </div>
                <div class="modal-footer">
                    <button onclick="routeDisplay.copyToClipboard('${coordinatesText}')" class="control-btn">Copy to Clipboard</button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="control-btn">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // Copy text to clipboard
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            alert('Coordinates copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    }

    // Calculate route distance
    calculateRouteDistance(coordinates) {
        let totalDistance = 0;
        for (let i = 1; i < coordinates.length; i++) {
            const prev = coordinates[i - 1];
            const curr = coordinates[i];
            totalDistance += google.maps.geometry.spherical.computeDistanceBetween(
                new google.maps.LatLng(prev.lat, prev.lng),
                new google.maps.LatLng(curr.lat, curr.lng)
            ) / 1000; // Convert to km
        }
        return totalDistance;
    }

    // Get next color from color palette
    getNextColor() {
        const color = this.routeColors[this.currentColorIndex];
        this.currentColorIndex = (this.currentColorIndex + 1) % this.routeColors.length;
        return color;
    }

    // Populate route list with checkboxes
    populateRouteList() {
        const routeList = document.getElementById('route-list');
        routeList.innerHTML = '';

        this.filteredRoutes.forEach((routeName, index) => {
            const routeData = this.routes[routeName];
            const routeItem = document.createElement('div');
            routeItem.className = 'route-item';
            routeItem.innerHTML = `
                <label class="route-checkbox">
                    <input type="checkbox" id="route-${index}" data-route="${routeName}" checked>
                    <span class="route-color" style="background-color: ${this.routePolylines[routeName]?.color || '#000'}"></span>
                    <span class="route-name">${routeName}</span>
                    <span class="route-stats">(${routeData.pointCount} pts)</span>
                </label>
            `;

            // Add event listener
            const checkbox = routeItem.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                this.toggleRoute(routeName, e.target.checked);
            });

            routeList.appendChild(routeItem);
        });
    }

    // Toggle route visibility
    toggleRoute(routeName, visible = null) {
        const routeData = this.routePolylines[routeName];
        if (!routeData) return;

        const newVisible = visible !== null ? visible : !routeData.visible;
        routeData.visible = newVisible;

        routeData.polyline.setMap(newVisible ? this.map : null);
        routeData.startMarker.setMap(newVisible ? this.map : null);
        routeData.endMarker.setMap(newVisible ? this.map : null);

        // Update checkbox
        const checkbox = document.querySelector(`input[data-route="${routeName}"]`);
        if (checkbox) {
            checkbox.checked = newVisible;
        }

        console.log(`${newVisible ? '✅' : '❌'} ${routeName} ${newVisible ? 'shown' : 'hidden'}`);
    }

    // Select all routes
    selectAllRoutes() {
        this.filteredRoutes.forEach(routeName => {
            this.toggleRoute(routeName, true);
        });
        console.log('✅ All routes selected');
    }

    // Deselect all routes
    deselectAllRoutes() {
        this.filteredRoutes.forEach(routeName => {
            this.toggleRoute(routeName, false);
        });
        console.log('❌ All routes deselected');
    }

    // Fit map to visible routes
    fitMapToRoutes() {
        const bounds = new google.maps.LatLngBounds();
        let hasVisibleRoutes = false;

        this.filteredRoutes.forEach(routeName => {
            const routeData = this.routePolylines[routeName];
            if (routeData && routeData.visible) {
                routeData.polyline.getPath().forEach(latLng => {
                    bounds.extend(latLng);
                });
                hasVisibleRoutes = true;
            }
        });

        if (hasVisibleRoutes) {
            this.map.fitBounds(bounds);
            console.log('🎯 Map fitted to visible routes');
        } else {
            console.log('⚠️ No visible routes to fit to');
        }
    }

    // Fit map to specific route
    fitToRoute(routeName) {
        const routeData = this.routePolylines[routeName];
        if (!routeData) return;

        const bounds = new google.maps.LatLngBounds();
        routeData.polyline.getPath().forEach(latLng => {
            bounds.extend(latLng);
        });

        this.map.fitBounds(bounds);
        console.log(`🎯 Map fitted to route: ${routeName}`);
    }

    // Clear all routes
    clearAllRoutes() {
        Object.keys(this.routePolylines).forEach(routeName => {
            const routeData = this.routePolylines[routeName];
            routeData.polyline.setMap(null);
            routeData.startMarker.setMap(null);
            routeData.endMarker.setMap(null);
        });

        this.routePolylines = {};
        console.log('🗑️ All routes cleared');
    }

    // Export coordinates to CSV
    exportCoordinatesToCSV() {
        let csvContent = 'Route Name,Point Number,Latitude,Longitude\n';
        
        Object.keys(this.routes).forEach(routeName => {
            const routeData = this.routes[routeName];
            routeData.coordinates.forEach((coord, index) => {
                csvContent += `${routeName},${index + 1},${coord.lat},${coord.lng}\n`;
            });
        });

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'route_coordinates.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        
        console.log('📄 Coordinates exported to CSV');
    }

    // Display route summary
    displayRouteSummary() {
        console.log('\n📊 Route Summary:');
        console.log('='.repeat(50));
        
        Object.keys(this.routes).forEach((routeName, index) => {
            const route = this.routes[routeName];
            console.log(`${index + 1}. ${routeName}: ${route.pointCount} points (${route.extractionMethod})`);
        });

        // Calculate statistics
        const totalPoints = Object.values(this.routes).reduce((sum, route) => sum + route.pointCount, 0);
        const avgPoints = totalPoints / Object.keys(this.routes).length;
        
        console.log('\n📈 Statistics:');
        console.log(`Total Routes: ${Object.keys(this.routes).length}`);
        console.log(`Total Points: ${totalPoints}`);
        console.log(`Average Points per Route: ${avgPoints.toFixed(1)}`);
        
        // Group by extraction method
        const methodCounts = {};
        Object.values(this.routes).forEach(route => {
            methodCounts[route.extractionMethod] = (methodCounts[route.extractionMethod] || 0) + 1;
        });
        
        console.log('\n🔍 Extraction Methods:');
        Object.keys(methodCounts).forEach(method => {
            console.log(`${method}: ${methodCounts[method]} routes`);
        });
    }

    // Get route statistics
    getRouteStatistics() {
        const stats = {
            totalRoutes: Object.keys(this.routes).length,
            totalPoints: Object.values(this.routes).reduce((sum, route) => sum + route.pointCount, 0),
            extractionMethods: {},
            routeLengths: {}
        };

        Object.values(this.routes).forEach(route => {
            stats.extractionMethods[route.extractionMethod] = (stats.extractionMethods[route.extractionMethod] || 0) + 1;
        });

        Object.keys(this.routes).forEach(routeName => {
            const route = this.routes[routeName];
            stats.routeLengths[routeName] = this.calculateRouteDistance(route.coordinates);
        });

        return stats;
    }
}

// Global instance
let routeDisplay;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    routeDisplay = new RouteDisplay();
    routeDisplay.initialize();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RouteDisplay;
}

