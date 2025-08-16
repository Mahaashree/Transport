// Route visualization

// Visualize current data on map
function visualizeData() {
    if (!map || !stopsData.length || !depotsData.length) {
        showStatus('Please load data first', 'error');
        return;
    }
    
    // Clear existing markers except college
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker && layer.options.title !== 'college') {
            map.removeLayer(layer);
        }
    });
    
    // Add bus stop markers
    stopsData.forEach((stop, index) => {
        const lat = parseFloat(stop.snapped_lat);
        const lon = parseFloat(stop.snapped_lon);
        const students = parseInt(stop.num_students);
        
        L.marker([lat, lon], {
            icon: L.divIcon({
                html: `<div style="background: #4299e1; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${students}</div>`,
                iconSize: [30, 30],
                className: 'stop-icon'
            })
        }).addTo(map)
          .bindPopup(`<b>Stop ${stop.cluster_number}</b><br>
                     Students: ${students}<br>
                     Route: ${stop.route_name || 'Unknown'}<br>
                     Type: ${stop.route_type || 'Unknown'}`);
    });
    
    // Add depot markers
    depotsData.forEach((depot, index) => {
        const lat = parseFloat(depot.Latitude);
        const lon = parseFloat(depot.Longitude);
        const capacity = parseInt(depot.Counts);
        
        L.marker([lat, lon], {
            icon: L.divIcon({
                html: `<i class="fas fa-warehouse" style="color: #e53e3e; font-size: 20px;"></i>`,
                iconSize: [30, 30],
                className: 'depot-icon'
            })
        }).addTo(map)
          .bindPopup(`<b>${depot['Parking Name']}</b><br>
                     Capacity: ${capacity} buses<br>
                     Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    });
    
    // Fit map to show all markers
    const group = new L.featureGroup();
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            group.addLayer(layer);
        }
    });
    
    if (group.getLayers().length > 0) {
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

// Visualize optimized routes on the map
function visualizeOptimizedRoutes() {
    if (!map || !window.optimizationResults) return;
    
    // Clear existing routes and markers
    map.eachLayer((layer) => {
        if (layer instanceof L.Polyline || (layer instanceof L.Marker && layer.options.title !== 'college')) {
            map.removeLayer(layer);
        }
    });
    
    // Add routes to map
    optimizationResults.forEach((route, index) => {
        const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
        const coordinates = [];
        
        // Start from college
        coordinates.push(COLLEGE_COORDS);
        
        // Add each stop
        route.stops.forEach(stop => {
            coordinates.push([
                parseFloat(stop.snapped_lat),
                parseFloat(stop.snapped_lon)
            ]);
            
            // Add stop marker
            L.marker([parseFloat(stop.snapped_lat), parseFloat(stop.snapped_lon)], {
                icon: L.divIcon({
                    html: `<div style="background: ${color}; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${stop.num_students}</div>`,
                    iconSize: [24, 24],
                    className: 'stop-icon'
                })
            }).addTo(map)
              .bindPopup(`<b>Stop ${stop.cluster_number}</b><br>
                         Students: ${stop.num_students}<br>
                         Bus: ${route.busId}`);
        });
        
        // Add depot
        const depot = depotsData[index % depotsData.length];
        coordinates.push([parseFloat(depot.Latitude), parseFloat(depot.Longitude)]);
        
        // Draw route line
        L.polyline(coordinates, {
            color: color,
            weight: 4,
            opacity: 0.8,
            lineJoin: 'round'
        }).addTo(map)
          .bindPopup(`<b>${route.busId}</b><br>
                     Stops: ${route.stops.length}<br>
                     Students: ${route.totalStudents}<br>
                     Efficiency: ${route.efficiency}`);
    });
    
    // Add depot markers
    depotsData.forEach(depot => {
        L.marker([parseFloat(depot.Latitude), parseFloat(depot.Longitude)], {
            icon: L.divIcon({
                html: `<i class="fas fa-warehouse" style="color: #e53e3e; font-size: 20px;"></i>`,
                iconSize: [30, 30],
                className: 'depot-icon'
            })
        }).addTo(map)
          .bindPopup(`<b>${depot['Parking Name']}</b><br>
                     Capacity: ${depot.Counts} buses`);
    });
    
    // Fit map to show all routes
    const group = new L.featureGroup();
    map.eachLayer((layer) => {
        if (layer instanceof L.Polyline || layer instanceof L.Marker) {
            group.addLayer(layer);
        }
    });
    
    if (group.getLayers().length > 0) {
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

// Display optimization results
function displayResults() {
    const routesList = document.getElementById('routesList');
    routesList.innerHTML = '';
    
    optimizationResults.forEach((route, index) => {
        const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
        const routeItem = document.createElement('div');
        routeItem.className = 'route-item';
        routeItem.style.borderLeftColor = color;
        
        const stopsList = route.stops.map(stop => 
            `Stop ${stop.cluster_number} (${stop.num_students} students)`
        ).join(', ');

        const distanceInfo = route.actualDistance ?
            `<p><strong>RouteDistance: </strong> ${route.actualDistance.toFixed(1)} km</p>
            <p><strong>Est. time: </strong> ${route.estimatedTime} min</p>` : '';
        
        routeItem.innerHTML = `
            <h5 style="color: ${color};">${route.busId}</h5>
            <p><strong>Depot:</strong> ${route.depot}</p>
            <p><strong>Total Students:</strong> ${route.totalStudents}/55 (${route.efficiency})</p>
            ${distanceInfo}
            <p><strong>Stops (${route.stops.length}):</strong> ${stopsList}</p>
            <p><strong>Route Type:</strong> Major roads and highways prioritized</p>
        `;
        
        routesList.appendChild(routeItem);
    });
    
    document.getElementById('resultsPanel').style.display = 'block';
}
