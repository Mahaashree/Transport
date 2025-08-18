// Visualization functions for existing routes

// Visualize all stops on the map
function visualizeAllStops() {
    // Clear existing markers
    clearAllMarkers();
    
    if (!stopCoordinatesData || stopCoordinatesData.length === 0) {
        showStatus('No stop data to visualize', 'error');
        return;
    }
    
    console.log(`🎨 Visualizing ${stopCoordinatesData.length} actual stops...`);
    
    // Get visible stops
    const visibleStops = stopCoordinatesData.filter(s => s.visible);
    
    // Log coordinate range for verification
    if (visibleStops.length > 0) {
        const lats = visibleStops.map(s => s.lat);
        const lngs = visibleStops.map(s => s.lng);
        console.log(`📍 Coordinate range: Lat ${Math.min(...lats).toFixed(6)} to ${Math.max(...lats).toFixed(6)}, Lng ${Math.min(...lngs).toFixed(6)} to ${Math.max(...lngs).toFixed(6)}`);
    }
    
    visibleStops.forEach((stop, index) => {
        createStopMarker(stop, index);
    });
    
    // Create route lines if enabled
    if (showRouteLines) {
        createRouteLines();
    }
    
    updateStatistics();
    
    // Fit map to show all actual coordinates (not just Chennai)
    if (visibleStops.length > 0) {
        const group = new L.featureGroup();
        visibleStops.forEach(stop => {
            L.marker([stop.lat, stop.lng]).addTo(group);
        });
        
        // Add college to bounds
        L.marker(COLLEGE_COORDS).addTo(group);
        
        // Fit map to show all markers with proper padding
        map.fitBounds(group.getBounds().pad(0.1));
        console.log(`🗺️ Map fitted to show all ${visibleStops.length} actual stop locations`);
    }
    
    showStatus(`Displayed ${visibleStops.length} actual stops on map`, 'success');
}

// Create a marker for a stop
function createStopMarker(stop, index) {
    // Create custom icon based on stop type
    const iconHtml = createStopIconHtml(stop);
    
    const customIcon = L.divIcon({
        html: iconHtml,
        iconSize: [24, 24],
        className: 'stop-marker',
        popupAnchor: [0, -12]
    });
    
    // Create marker
    const marker = L.marker([stop.lat, stop.lng], {
        icon: customIcon,
        title: `${stop.stop_name} (${stop.route_name})`
    }).addTo(map);
    
    // Create popup content
    const popupContent = createStopPopupContent(stop);
    marker.bindPopup(popupContent);
    
    // Add click event for highlighting
    marker.on('click', () => highlightStop(stop));
    
    // Store reference
    marker.stopData = stop;
    currentMarkers.push(marker);
    
    return marker;
}

// Create HTML for stop icon with status indication
function createStopIconHtml(stop) {
    const isGenerated = stop.isGenerated;
    const bgColor = isGenerated ? '#ed8936' : stop.color || '#4299e1';
    const icon = isGenerated ? 'question' : 'map-marker-alt';
    const size = 24;
    
    return `
        <div style="
            background: ${bgColor};
            color: white;
            border-radius: 50%;
            width: ${size}px;
            height: ${size}px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            cursor: pointer;
        ">
            <i class="fas fa-${icon}"></i>
        </div>
    `;
}

// Create popup content for a stop with accurate information
function createStopPopupContent(stop) {
    const isGenerated = stop.isGenerated;
    const statusBadge = isGenerated ? 
        '<span style="background: #ed8936; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">ESTIMATED</span>' :
        '<span style="background: #48bb78; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">ACTUAL COORDINATES</span>';
    
    return `
        <div style="min-width: 250px;">
            <h4 style="margin: 0 0 8px 0; color: #2d3748; font-size: 14px;">
                ${stop.stop_name}
                ${statusBadge}
            </h4>
            <p style="margin: 4px 0; font-size: 12px; color: #4a5568;">
                <strong>Route:</strong> ${stop.route_name}
            </p>
            <p style="margin: 4px 0; font-size: 12px; color: #4a5568;">
                <strong>Stop ID:</strong> ${stop.stop_id || 'N/A'}
            </p>
            <p style="margin: 4px 0; font-size: 12px; color: #4a5568;">
                <strong>Distance from College:</strong> ${stop.distanceFromCollege?.toFixed(1) || 'N/A'} km
            </p>
            <p style="margin: 4px 0; font-size: 12px; color: #4a5568;">
                <strong>Coordinates:</strong> ${stop.lat.toFixed(6)}, ${stop.lng.toFixed(6)}
            </p>
            ${stop.formatted_address ? `
                <p style="margin: 4px 0; font-size: 11px; color: #718096;">
                    <strong>Address:</strong> ${stop.formatted_address}
                </p>
            ` : ''}
            ${stop.search_query ? `
                <p style="margin: 4px 0; font-size: 11px; color: #718096;">
                    <strong>Search Query:</strong> ${stop.search_query}
                </p>
            ` : ''}
            <div style="margin-top: 8px; text-align: center;">
                <button onclick="zoomToStop(${stop.index})" style="
                    background: #4299e1; color: white; border: none; 
                    padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;
                ">
                    <i class="fas fa-search-plus"></i> Zoom Here
                </button>
                <button onclick="highlightRoute('${stop.route_name}')" style="
                    background: #48bb78; color: white; border: none; 
                    padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; margin-left: 4px;
                ">
                    <i class="fas fa-route"></i> Show Route
                </button>
            </div>
        </div>
    `;
}

// Create route lines connecting stops in the same route
function createRouteLines() {
    if (!showRouteLines) return;
    
    // Clear existing route lines
    clearRouteLines();
    
    // Group stops by route
    const routeGroups = {};
    stopCoordinatesData.filter(s => s.visible).forEach(stop => {
        if (!routeGroups[stop.route_name]) {
            routeGroups[stop.route_name] = [];
        }
        routeGroups[stop.route_name].push(stop);
    });
    
    // Create lines for each route
    Object.entries(routeGroups).forEach(([routeName, stops]) => {
        if (stops.length < 2) return; // Need at least 2 stops for a line
        
        // Sort stops by stop_id or distance from college
        stops.sort((a, b) => {
            const stopIdA = a.stop_id?.replace('stop', '') || '0';
            const stopIdB = b.stop_id?.replace('stop', '') || '0';
            return parseInt(stopIdA) - parseInt(stopIdB);
        });
        
        // Create line coordinates
        const lineCoords = stops.map(stop => [stop.lat, stop.lng]);
        
        // Add college as starting point
        lineCoords.unshift(COLLEGE_COORDS);
        
        const routeIndex = getRouteIndex(routeName);
        const color = ROUTE_COLORS[routeIndex % ROUTE_COLORS.length];
        
        // Create polyline
        const routeLine = L.polyline(lineCoords, {
            color: color,
            weight: 3,
            opacity: 0.7,
            dashArray: '5, 10'
        }).addTo(map);
        
        // Add popup to line
        routeLine.bindPopup(`
            <b>${routeName}</b><br>
            ${stops.length} stops<br>
            <small>Click to highlight this route</small>
        `);
        
        // Add click event
        routeLine.on('click', () => highlightRoute(routeName));
        
        routeLines.push(routeLine);
    });
    
    console.log(`✅ Created route lines for ${Object.keys(routeGroups).length} routes`);
}

// Highlight a specific stop
function highlightStop(stop) {
    // Remove existing highlights
    currentMarkers.forEach(marker => {
        if (marker.stopData) {
            const originalIcon = createStopIconHtml(marker.stopData);
            marker.setIcon(L.divIcon({
                html: originalIcon,
                iconSize: [24, 24],
                className: 'stop-marker'
            }));
        }
    });
    
    // Highlight the selected stop
    const highlightedIcon = createHighlightedStopIcon(stop);
    const targetMarker = currentMarkers.find(m => m.stopData && m.stopData.index === stop.index);
    
    if (targetMarker) {
        targetMarker.setIcon(L.divIcon({
            html: highlightedIcon,
            iconSize: [32, 32],
            className: 'stop-marker highlighted'
        }));
        
        // Pan to the stop
        map.panTo([stop.lat, stop.lng]);
        
        showStatus(`Highlighted: ${stop.stop_name}`, 'info');
    }
}

// Create highlighted stop icon
function createHighlightedStopIcon(stop) {
    return `
        <div style="
            background: #ff4757;
            color: white;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            border: 3px solid white;
            box-shadow: 0 4px 8px rgba(0,0,0,0.4);
            cursor: pointer;
            animation: pulse 1s infinite;
        ">
            <i class="fas fa-star"></i>
        </div>
        <style>
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
        </style>
    `;
}

// Highlight all stops in a route
function highlightRoute(routeName) {
    // Reset all stops to normal
    stopCoordinatesData.forEach(stop => {
        stop.highlighted = false;
    });
    
    // Highlight stops in the selected route
    const routeStops = stopCoordinatesData.filter(s => s.route_name === routeName);
    routeStops.forEach(stop => {
        stop.highlighted = true;
    });
    
    // Re-visualize with highlights
    visualizeAllStops();
    
    // Focus map on route stops
    if (routeStops.length > 0) {
        const group = new L.featureGroup();
        routeStops.forEach(stop => {
            L.marker([stop.lat, stop.lng]).addTo(group);
        });
        map.fitBounds(group.getBounds().pad(0.1));
        
        showStatus(`Highlighted route: ${routeName} (${routeStops.length} stops)`, 'success');
    }
}

// Zoom to a specific stop
function zoomToStop(stopIndex) {
    const stop = stopCoordinatesData.find(s => s.index === stopIndex);
    if (stop) {
        map.setView([stop.lat, stop.lng], 16);
        highlightStop(stop);
    }
}

// Clear all markers from map
function clearAllMarkers() {
    currentMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    currentMarkers = [];
}

// Clear route lines from map
function clearRouteLines() {
    routeLines.forEach(line => {
        map.removeLayer(line);
    });
    routeLines = [];
}

// Toggle route lines visibility
function toggleRouteLines() {
    showRouteLines = !showRouteLines;
    
    if (showRouteLines) {
        createRouteLines();
        showStatus('Route lines enabled', 'info');
    } else {
        clearRouteLines();
        showStatus('Route lines disabled', 'info');
    }
}

// Toggle stop labels (placeholder for future implementation)
function toggleStopLabels() {
    showStopLabels = !showStopLabels;
    
    // Re-visualize with updated label settings
    visualizeAllStops();
    
    showStatus(`Stop labels ${showStopLabels ? 'enabled' : 'disabled'}`, 'info');
}

// Export visible data
function exportVisibleData() {
    const visibleStops = stopCoordinatesData.filter(s => s.visible);
    
    if (visibleStops.length === 0) {
        showStatus('No visible data to export', 'error');
        return;
    }
    
    // Create CSV content
    const headers = ['route_name', 'stop_name', 'stop_id', 'latitude', 'longitude', 'distance_from_college', 'status'];
    const csvContent = [
        headers.join(','),
        ...visibleStops.map(stop => [
            `"${stop.route_name}"`,
            `"${stop.stop_name}"`,
            `"${stop.stop_id || ''}"`,
            stop.lat,
            stop.lng,
            stop.distanceFromCollege?.toFixed(2) || '',
            stop.isGenerated ? 'estimated' : 'geocoded'
        ].join(','))
    ].join('\n');
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `existing_routes_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showStatus(`Exported ${visibleStops.length} stops to CSV`, 'success');
}
