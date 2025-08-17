// Route selector functionality

// ✅ SOLUTION 5: Display accessibility warnings in UI
function displayRouteWithAccessibilityInfo(route) {
    const routeElement = document.createElement('div');
    routeElement.className = 'route-item';
    
    if (route.accessibility?.isValid === false) {
        routeElement.classList.add('accessibility-warning');
    }
    
    const accessibilityStatus = route.accessibility?.isValid ? 
        '<span class="accessibility-ok">✅ Bus Accessible</span>' :
        '<span class="accessibility-warning">⚠️ Accessibility Concerns</span>';
    
    const warningDetails = route.accessibility?.issues?.length > 0 ?
        `<div class="warning-details">Issues: ${route.accessibility.issues.join(', ')}</div>` : '';
    
    routeElement.innerHTML = `
        <div class="route-header">
            <strong>${route.busId}</strong> - ${route.depot}
            ${accessibilityStatus}
        </div>
        <div class="route-stats">
            Students: ${route.totalStudents} | Distance: ${route.totalDistance} | Efficiency: ${route.efficiency}
        </div>
        ${warningDetails}
        <div class="route-stops">
            ${route.stops.map(stop => `<span class="stop">Stop ${stop.cluster_number} (${stop.num_students} students)</span>`).join(' → ')}
        </div>
    `;
    
    return routeElement;
}


// Initialize route selectors
function initializeRouteSelectors() {
    const routeSelectorSection = document.getElementById('routeSelectorSection');
    const individualSelectors = document.getElementById('individualRouteSelectors');
    individualSelectors.innerHTML = '';
    selectedRoute = null;

    if (!window.optimizationResults || !window.optimizationResults.length) {
        console.warn('No routes to display');
        return;
    }

    // Create floating route selector container
    const floatingSelector = document.createElement('div');
    floatingSelector.className = 'floating-route-selector';
    
    // Add header
    const header = document.createElement('div');
    header.className = 'route-selector-header';
    header.innerHTML = `
        <h4><i class="fas fa-route"></i> Route Selection</h4>
        <div class="route-summary">
            ${window.optimizationResults.length} Routes | 
            ${window.optimizationResults.reduce((sum, r) => sum + r.totalStudents, 0)} Students
        </div>
    `;
    floatingSelector.appendChild(header);

    // Add quick filters
    const filters = document.createElement('div');
    filters.className = 'quick-filters';
    filters.innerHTML = `
        <button class="filter-btn active" data-filter="all">
            <i class="fas fa-globe"></i> All Routes
        </button>
        <button class="filter-btn" data-filter="high">
            <i class="fas fa-star"></i> High Efficiency
        </button>
        <button class="filter-btn" data-filter="medium">
            <i class="fas fa-star-half-alt"></i> Medium
        </button>
        <button class="filter-btn" data-filter="low">
            <i class="fas fa-exclamation"></i> Low
        </button>
    `;
    floatingSelector.appendChild(filters);

    // Create route list container
    const routeList = document.createElement('div');
    routeList.className = 'route-list';

    // Add each route
    window.optimizationResults.forEach((route, index) => {
        const efficiency = parseFloat(route.efficiency.replace('%', ''));
        const efficiencyClass = efficiency > 80 ? 'high' : efficiency > 50 ? 'medium' : 'low';
        
        const routeElement = document.createElement('div');
        routeElement.className = `route-item ${efficiencyClass}`;
        routeElement.innerHTML = `
            <div class="route-header">
                <label class="route-toggle">
                    <input type="checkbox" class="route-checkbox" data-route-index="${index}" checked>
                    <span class="route-title">${route.busId}</span>
                </label>
                <span class="route-efficiency ${efficiencyClass}">
                    ${route.efficiency}
                </span>
            </div>
            <div class="route-details">
                <span><i class="fas fa-users"></i> ${route.totalStudents} students</span>
                <span><i class="fas fa-road"></i> ${route.totalDistance}</span>
                <span><i class="fas fa-map-marker-alt"></i> ${route.stops.length} stops</span>
            </div>
        `;
        
        routeList.appendChild(routeElement);
    });

    floatingSelector.appendChild(routeList);
    individualSelectors.appendChild(floatingSelector);

    // Add event listeners
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterRoutes(e.target.dataset.filter);
        });
    });

    document.querySelectorAll('.route-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateRouteVisibility);
    });
}

function filterRoutes(filter) {
    document.querySelectorAll('.route-item').forEach(item => {
        const efficiency = parseFloat(item.querySelector('.route-efficiency').textContent);
        switch(filter) {
            case 'high':
                item.style.display = efficiency >= 80 ? 'block' : 'none';
                break;
            case 'medium':
                item.style.display = efficiency >= 50 && efficiency < 80 ? 'block' : 'none';
                break;
            case 'low':
                item.style.display = efficiency < 50 ? 'block' : 'none';
                break;
            default:
                item.style.display = 'block';
        }
    });
}

function updateRouteDisplay() {
    const routeList = document.getElementById('routeList');
    const routeType = document.getElementById('routeTypeFilter').value;
    const direction = document.getElementById('directionFilter').value;
    const efficiency = document.getElementById('efficiencyFilter').value;
    
    routeList.innerHTML = '';
    
    window.optimizationResults.forEach((route, index) => {
        // Apply filters
        if (!shouldShowRoute(route, routeType, direction, efficiency)) {
            return;
        }
        
        const routeElement = createRouteElement(route, index);
        routeList.appendChild(routeElement);
    });
}

function shouldShowRoute(route, typeFilter, directionFilter, efficiencyFilter) {
    // Route type filter
    if (typeFilter !== 'all' && route.routeType !== typeFilter) {
        return false;
    }
    
    // Direction filter
    if (directionFilter !== 'all' && route.direction !== directionFilter) {
        return false;
    }
    
    // Efficiency filter
    const efficiency = parseFloat(route.efficiency.replace('%', ''));
    if (efficiencyFilter !== 'all') {
        if (efficiencyFilter === 'high' && efficiency <= 80) return false;
        if (efficiencyFilter === 'medium' && (efficiency < 50 || efficiency > 80)) return false;
        if (efficiencyFilter === 'low' && efficiency >= 50) return false;
    }
    
    return true;
}

function createRouteElement(route, index) {
    const routeElement = document.createElement('div');
    routeElement.className = 'route-item';
    routeElement.dataset.routeIndex = index;
    
    const routeTypeClass = route.routeType === 'optimized' ? 'optimized' : 
                          route.routeType === 'salvaged' ? 'salvaged' : 'basic';
    
    routeElement.innerHTML = `
        <div class="route-header ${routeTypeClass}">
            <strong>${route.busId}</strong>
            <span class="route-type">${route.routeType}</span>
            <span class="route-direction">${route.direction}</span>
        </div>
        <div class="route-stats">
            <span>Students: ${route.totalStudents}</span>
            <span>Distance: ${route.totalDistance}</span>
            <span>Efficiency: ${route.efficiency}</span>
        </div>
        <div class="route-stops">
            <strong>Stops:</strong> ${route.stops.map((stop, i) => 
                `<span class="stop" title="Stop ${i+1}: ${stop.num_students} students">
                    ${stop.cluster_number || i+1}
                </span>`).join(' → ')}
        </div>
    `;
    
    // Add click handler to show route on map
    routeElement.addEventListener('click', () => {
        // Remove previous selection
        document.querySelectorAll('.route-item.selected').forEach(el => 
            el.classList.remove('selected'));
        routeElement.classList.add('selected');
        
        // Update map
        window.selectedRoute = route;
        updateRouteVisibility();
    });
    
    return routeElement;
}

// Toggle all routes
function toggleAllRoutes() {
    if (document.getElementById('selectAllRoutes').checked) {
        selectedRoute = null;
        document.querySelectorAll('.route-selector-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector('.route-selector-item').classList.add('selected');
        updateRouteVisibility();
    }
}

// Select individual route
function selectRoute(routeId, index) {
    selectedRoute = routeId;
    
    // Update visual selection state
    document.querySelectorAll('.route-selector-item').forEach(item => {
        item.classList.remove('selected');
    });
    document.getElementById(routeId).parentElement.classList.add('selected');
    
    updateRouteVisibility();
}

// Update route visibility on map
function updateRouteVisibility() {
    if (!window.map) {
        console.error('Map not initialized');
        return;
    }

    console.log('Updating route visibility...');

    // Clear ALL existing routes and markers first
    window.map.eachLayer((layer) => {
        if (layer instanceof L.Polyline || (layer instanceof L.Marker && layer.options.title !== 'college')) {
            window.map.removeLayer(layer);
        }
    });

    // Get all checked routes
    const checkedRoutes = Array.from(document.querySelectorAll('.route-checkbox'))
        .filter(checkbox => checkbox.checked)
        .map(checkbox => parseInt(checkbox.dataset.routeIndex));

    console.log('Showing routes:', checkedRoutes);

    // Show only checked routes
    checkedRoutes.forEach(index => {
        const route = window.optimizationResults[index];
        if (!route) {
            console.warn(`No route found for index ${index}`);
            return;
        }

        console.log(`Visualizing route ${index}:`, route);

        // Get route color
        const color = ROUTE_COLORS[index % ROUTE_COLORS.length];

        // Draw route line
        const coordinates = [
            COLLEGE_COORDS,
            ...route.stops.map(stop => [
                parseFloat(stop.snapped_lat),
                parseFloat(stop.snapped_lon)
            ])
        ];

        const routeLine = L.polyline(coordinates, {
            color: color,
            weight: 3,
            opacity: 0.8,
            routeIndex: index  // Store route index for reference
        }).addTo(window.map);

        // Add markers for stops
        route.stops.forEach((stop, stopIndex) => {
            const marker = L.marker([
                parseFloat(stop.snapped_lat),
                parseFloat(stop.snapped_lon)
            ], {
                icon: createStopIcon(color, stop.num_students),
                routeIndex: index  // Store route index for reference
            }).addTo(window.map);

            // Add popup with stop info
            marker.bindPopup(`
                <strong>${route.busId} - Stop ${stopIndex + 1}</strong><br>
                Students: ${stop.num_students}<br>
                Distance: ${stop.distance?.toFixed(1) || 'N/A'} km
            `);
        });
    });

    // If no routes selected, show all stops as inactive
    if (checkedRoutes.length === 0) {
        window.optimizationResults.forEach(route => {
            route.stops.forEach(stop => {
                L.marker([
                    parseFloat(stop.snapped_lat),
                    parseFloat(stop.snapped_lon)
                ], {
                    icon: createStopIcon('#999', stop.num_students),
                    opacity: 0.5
                }).addTo(window.map);
            });
        });
    }
}

// Helper function to create stop icon
function createStopIcon(color, students) {
    return L.divIcon({
        className: 'custom-stop-icon',
        html: `<div style="background-color: ${color};">${students}</div>`,
        iconSize: [24, 24]
    });
}
