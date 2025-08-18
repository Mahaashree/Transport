// Filter functionality for existing routes

// Populate route filter dropdown
function populateRouteFilter() {
    const routeFilter = document.getElementById('routeFilter');
    if (!routeFilter || !stopCoordinatesData) return;
    
    // Get unique routes
    const uniqueRoutes = [...new Set(stopCoordinatesData.map(s => s.route_name))].sort();
    
    // Clear existing options (keep "All Routes")
    routeFilter.innerHTML = '<option value="">All Routes</option>';
    
    // Add route options
    uniqueRoutes.forEach(routeName => {
        const option = document.createElement('option');
        option.value = routeName;
        option.textContent = `${routeName} (${getStopCountForRoute(routeName)} stops)`;
        routeFilter.appendChild(option);
    });
    
    console.log(`✅ Populated filter with ${uniqueRoutes.length} routes`);
}

// Get stop count for a specific route
function getStopCountForRoute(routeName) {
    return stopCoordinatesData.filter(s => s.route_name === routeName).length;
}

// Handle route search
function handleRouteSearch() {
    const searchInput = document.getElementById('routeSearch');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    // Reset all stops visibility
    stopCoordinatesData.forEach(stop => {
        stop.visible = true;
    });
    
    if (searchTerm) {
        // Filter stops based on search term
        stopCoordinatesData.forEach(stop => {
            const matchesRoute = stop.route_name.toLowerCase().includes(searchTerm);
            const matchesStop = stop.stop_name.toLowerCase().includes(searchTerm);
            const matchesAddress = stop.formatted_address?.toLowerCase().includes(searchTerm) || false;
            
            stop.visible = matchesRoute || matchesStop || matchesAddress;
        });
        
        const visibleCount = stopCoordinatesData.filter(s => s.visible).length;
        showStatus(`Found ${visibleCount} stops matching "${searchTerm}"`, 'info');
    } else {
        showStatus('Search cleared - showing all stops', 'info');
    }
    
    // Re-visualize with filtered data
    visualizeAllStops();
}

// Handle route filter dropdown
function handleRouteFilter() {
    const routeFilter = document.getElementById('routeFilter');
    if (!routeFilter) return;
    
    const selectedRoute = routeFilter.value;
    
    // Reset search input
    const searchInput = document.getElementById('routeSearch');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Filter stops by route
    stopCoordinatesData.forEach(stop => {
        stop.visible = selectedRoute ? stop.route_name === selectedRoute : true;
    });
    
    const visibleCount = stopCoordinatesData.filter(s => s.visible).length;
    
    if (selectedRoute) {
        showStatus(`Showing ${visibleCount} stops from route: ${selectedRoute}`, 'info');
        
        // Auto-fit map to selected route
        setTimeout(() => {
            fitAllStops();
        }, 100);
    } else {
        showStatus(`Showing all ${visibleCount} stops`, 'info');
    }
    
    // Re-visualize with filtered data
    visualizeAllStops();
}

// Clear all filters
function clearFilters() {
    // Reset search input
    const searchInput = document.getElementById('routeSearch');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Reset route filter
    const routeFilter = document.getElementById('routeFilter');
    if (routeFilter) {
        routeFilter.value = '';
    }
    
    // Reset all stops visibility
    stopCoordinatesData.forEach(stop => {
        stop.visible = true;
        stop.highlighted = false;
    });
    
    // Re-visualize all data
    visualizeAllStops();
    
    showStatus('All filters cleared', 'success');
}

// Advanced filtering functions
function filterByDistance(maxDistance) {
    stopCoordinatesData.forEach(stop => {
        stop.visible = stop.distanceFromCollege <= maxDistance;
    });
    
    const visibleCount = stopCoordinatesData.filter(s => s.visible).length;
    showStatus(`Showing ${visibleCount} stops within ${maxDistance}km`, 'info');
    
    visualizeAllStops();
}

function filterByStatus(status) {
    stopCoordinatesData.forEach(stop => {
        if (status === 'geocoded') {
            stop.visible = !stop.isGenerated;
        } else if (status === 'estimated') {
            stop.visible = stop.isGenerated;
        } else {
            stop.visible = true;
        }
    });
    
    const visibleCount = stopCoordinatesData.filter(s => s.visible).length;
    showStatus(`Showing ${visibleCount} ${status} stops`, 'info');
    
    visualizeAllStops();
}

// Search stops by coordinates (for debugging)
function searchByCoordinates(lat, lng, radius = 1) {
    const targetLat = parseFloat(lat);
    const targetLng = parseFloat(lng);
    
    if (isNaN(targetLat) || isNaN(targetLng)) {
        showStatus('Invalid coordinates provided', 'error');
        return;
    }
    
    stopCoordinatesData.forEach(stop => {
        const distance = calculateDistance(targetLat, targetLng, stop.lat, stop.lng);
        stop.visible = distance <= radius;
    });
    
    const visibleCount = stopCoordinatesData.filter(s => s.visible).length;
    showStatus(`Found ${visibleCount} stops within ${radius}km of coordinates`, 'info');
    
    visualizeAllStops();
}

// Bulk operations
function selectAllStops() {
    stopCoordinatesData.forEach(stop => {
        stop.visible = true;
        stop.selected = true;
    });
    
    visualizeAllStops();
    showStatus(`Selected all ${stopCoordinatesData.length} stops`, 'success');
}

function selectVisibleStops() {
    let selectedCount = 0;
    stopCoordinatesData.forEach(stop => {
        if (stop.visible) {
            stop.selected = true;
            selectedCount++;
        }
    });
    
    showStatus(`Selected ${selectedCount} visible stops`, 'success');
}

function clearSelection() {
    stopCoordinatesData.forEach(stop => {
        stop.selected = false;
    });
    
    visualizeAllStops();
    showStatus('Selection cleared', 'info');
}

// Route-specific operations
function getRouteStatistics(routeName) {
    const routeStops = stopCoordinatesData.filter(s => s.route_name === routeName);
    
    if (routeStops.length === 0) {
        return null;
    }
    
    const geocodedStops = routeStops.filter(s => !s.isGenerated).length;
    const estimatedStops = routeStops.filter(s => s.isGenerated).length;
    const avgDistance = routeStops.reduce((sum, s) => sum + s.distanceFromCollege, 0) / routeStops.length;
    const maxDistance = Math.max(...routeStops.map(s => s.distanceFromCollege));
    const minDistance = Math.min(...routeStops.map(s => s.distanceFromCollege));
    
    return {
        routeName: routeName,
        totalStops: routeStops.length,
        geocodedStops: geocodedStops,
        estimatedStops: estimatedStops,
        successRate: (geocodedStops / routeStops.length * 100).toFixed(1),
        avgDistanceFromCollege: avgDistance.toFixed(1),
        maxDistanceFromCollege: maxDistance.toFixed(1),
        minDistanceFromCollege: minDistance.toFixed(1)
    };
}

// Export filtered data with statistics
function exportFilteredDataWithStats() {
    const visibleStops = stopCoordinatesData.filter(s => s.visible);
    const routes = [...new Set(visibleStops.map(s => s.route_name))];
    
    // Generate statistics for each route
    const routeStats = routes.map(routeName => getRouteStatistics(routeName));
    
    // Create comprehensive export
    const exportData = {
        exportDate: new Date().toISOString(),
        totalStops: visibleStops.length,
        totalRoutes: routes.length,
        routeStatistics: routeStats,
        stopDetails: visibleStops.map(stop => ({
            route_name: stop.route_name,
            stop_name: stop.stop_name,
            stop_id: stop.stop_id,
            latitude: stop.lat,
            longitude: stop.lng,
            distance_from_college_km: stop.distanceFromCollege?.toFixed(2),
            status: stop.isGenerated ? 'estimated' : 'geocoded',
            formatted_address: stop.formatted_address || ''
        }))
    };
    
    // Download as JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `existing_routes_detailed_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showStatus(`Exported detailed data for ${visibleStops.length} stops`, 'success');
}
