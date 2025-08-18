// Route visualization

// NEW FUNCTION: Display stops data in detailed table format
function displayStopsData() {
    // Try multiple ways to access the stops data
    const stopsDataSource = window.stopsData || stopsData || [];
    
    if (!stopsDataSource || !stopsDataSource.length) {
        console.error('No stops data found. Available variables:', {
            windowStopsData: window.stopsData,
            globalStopsData: typeof stopsData !== 'undefined' ? stopsData : 'undefined'
        });
        showStatus('No stops data available to display', 'error');
        return;
    }
    
    console.log(`Displaying ${stopsDataSource.length} stops`);
    
    // Show the stops data panel
    const stopsPanel = document.getElementById('stopsDataPanel');
    if (stopsPanel) {
        stopsPanel.style.display = 'block';
        
        // Generate summary statistics
        generateStopsSummary(stopsDataSource);
        
        // Populate route filter dropdown
        populateRouteFilter(stopsDataSource);
        
        // Display all stops initially
        renderStopsTable(stopsDataSource);
        
        // Add search and filter event listeners
        setupStopsFilters(stopsDataSource);
        
        // Scroll to the stops panel
        stopsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    showStatus('Stops data displayed successfully!', 'success');
}

// NEW FUNCTION: Generate summary statistics for stops
function generateStopsSummary(stopsDataSource) {
    const totalStops = stopsDataSource.length;
    const totalStudents = stopsDataSource.reduce((sum, stop) => sum + parseInt(stop.num_students || 0), 0);
    const uniqueRoutes = [...new Set(stopsDataSource.map(stop => stop.route_name).filter(Boolean))].length;
    const averageStudentsPerStop = (totalStudents / totalStops).toFixed(1);
    
    const summaryContainer = document.getElementById('stopsSummary');
    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div class="summary-card">
                <h4>Total Stops</h4>
                <div class="value">${totalStops}</div>
            </div>
            <div class="summary-card">
                <h4>Total Students</h4>
                <div class="value">${totalStudents}</div>
            </div>
            <div class="summary-card">
                <h4>Unique Routes</h4>
                <div class="value">${uniqueRoutes}</div>
            </div>
            <div class="summary-card">
                <h4>Avg Students/Stop</h4>
                <div class="value">${averageStudentsPerStop}</div>
            </div>
        `;
    }
}

// NEW FUNCTION: Populate route filter dropdown
function populateRouteFilter(stopsDataSource) {
    const routeFilter = document.getElementById('routeFilter');
    if (!routeFilter) return;
    
    const uniqueRoutes = [...new Set(stopsDataSource.map(stop => stop.route_name).filter(Boolean))];
    
    // Clear existing options except "All Routes"
    routeFilter.innerHTML = '<option value="">All Routes</option>';
    
    // Add unique routes
    uniqueRoutes.forEach(route => {
        const option = document.createElement('option');
        option.value = route;
        option.textContent = route;
        routeFilter.appendChild(option);
    });
}

// NEW FUNCTION: Render stops table with given data
function renderStopsTable(stopsToShow) {
    const tableBody = document.getElementById('stopsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    stopsToShow.forEach((stop, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="stop-number">${stop.cluster_number || (index + 1)}</td>
            <td><span class="student-count">${stop.num_students || 0}</span></td>
            <td>
                ${stop.route_name ? `<span class="route-badge">${stop.route_name}</span>` : 'N/A'}
            </td>
            <td>${stop.route_type || 'Unknown'}</td>
            <td class="coordinates">
                ${parseFloat(stop.snapped_lat).toFixed(5)}, ${parseFloat(stop.snapped_lon).toFixed(5)}
            </td>
            <td>
                <button class="btn-small" onclick="focusStopOnMap(${stop.snapped_lat}, ${stop.snapped_lon}, '${stop.cluster_number || index + 1}')">
                    <i class="fas fa-map-marker-alt"></i> View
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// NEW FUNCTION: Setup search and filter functionality
function setupStopsFilters(stopsDataSource) {
    const searchInput = document.getElementById('stopsSearch');
    const routeFilter = document.getElementById('routeFilter');
    const studentCountFilter = document.getElementById('studentCountFilter');
    
    if (!searchInput || !routeFilter || !studentCountFilter) return;
    
    function applyFilters() {
        let filteredStops = [...stopsDataSource];
        
        // Apply search filter
        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm) {
            filteredStops = filteredStops.filter(stop => 
                (stop.cluster_number && stop.cluster_number.toString().includes(searchTerm)) ||
                (stop.route_name && stop.route_name.toLowerCase().includes(searchTerm)) ||
                (stop.route_type && stop.route_type.toLowerCase().includes(searchTerm))
            );
        }
        
        // Apply route filter
        const selectedRoute = routeFilter.value;
        if (selectedRoute) {
            filteredStops = filteredStops.filter(stop => stop.route_name === selectedRoute);
        }
        
        // Apply student count filter
        const studentRange = studentCountFilter.value;
        if (studentRange) {
            filteredStops = filteredStops.filter(stop => {
                const studentCount = parseInt(stop.num_students || 0);
                switch(studentRange) {
                    case '1-5': return studentCount >= 1 && studentCount <= 5;
                    case '6-10': return studentCount >= 6 && studentCount <= 10;
                    case '11-15': return studentCount >= 11 && studentCount <= 15;
                    case '16+': return studentCount >= 16;
                    default: return true;
                }
            });
        }
        
        renderStopsTable(filteredStops);
    }
    
    // Add event listeners
    searchInput.addEventListener('input', applyFilters);
    routeFilter.addEventListener('change', applyFilters);
    studentCountFilter.addEventListener('change', applyFilters);
}

// NEW FUNCTION: Focus on a specific stop on the map
function focusStopOnMap(lat, lon, stopNumber) {
    if (!window.map) {
        showStatus('Map not initialized', 'error');
        return;
    }
    
    const coordinates = [parseFloat(lat), parseFloat(lon)];
    
    // Center map on the stop
    window.map.setView(coordinates, 15);
    
    // Add a temporary highlight marker
    const highlightMarker = L.marker(coordinates, {
        icon: L.divIcon({
            className: 'highlight-marker',
            html: `<div style="background: #ff4757; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 3px solid white; box-shadow: 0 2px 10px rgba(255,71,87,0.5); animation: pulse 2s infinite;">
                ${stopNumber}
            </div>`,
            iconSize: [40, 40]
        })
    }).addTo(window.map);
    
    // Add popup
    highlightMarker.bindPopup(`<strong>Stop ${stopNumber}</strong><br>Highlighted from stops table`).openPopup();
    
    // Remove highlight after 5 seconds
    setTimeout(() => {
        window.map.removeLayer(highlightMarker);
    }, 5000);
    
    // Add pulse animation CSS if not already added
    if (!document.getElementById('pulseAnimation')) {
        const style = document.createElement('style');
        style.id = 'pulseAnimation';
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.7; }
                100% { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Visualize current data on map
function visualizeData() {
    // Try multiple ways to access the data
    const mapInstance = window.map || map;
    const stopsDataSource = window.stopsData || stopsData || [];
    const depotsDataSource = window.depotsData || depotsData || [];
    const studentDataSource = window.studentData || studentData || [];
    
    // Check if we have the required variables
    if (!mapInstance) {
        showStatus('Map not initialized', 'error');
        return;
    }
    
    if (!stopsDataSource || !stopsDataSource.length) {
        showStatus('No stops data available. Please load the Snapped Stops CSV file first.', 'error');
        console.error('Stops data check failed:', {
            windowStopsData: window.stopsData,
            globalStopsData: typeof stopsData !== 'undefined' ? stopsData : 'undefined',
            stopsDataLength: stopsDataSource.length
        });
        return;
    }
    
    if (!depotsDataSource || !depotsDataSource.length) {
        showStatus('No depot data available. Please load the Depots CSV file first.', 'error');
        return;
    }
    
    console.log('Visualizing data...', {
        stopsCount: stopsDataSource.length,
        depotsCount: depotsDataSource.length,
        studentsCount: studentDataSource.length
    });
    
    // Clear existing markers except college (but keep the college marker)
    mapInstance.eachLayer((layer) => {
        if (layer instanceof L.Marker && !layer.options.icon?.options?.html?.includes('university')) {
            mapInstance.removeLayer(layer);
        }
        if (layer instanceof L.Polyline) {
            mapInstance.removeLayer(layer);
        }
        if (layer instanceof L.CircleMarker) {
            mapInstance.removeLayer(layer);
        }
    });
    
    // Add student assignment dots first (so they appear behind other markers)
    if (studentDataSource && studentDataSource.length > 0) {
        addStudentAssignmentDots(mapInstance, studentDataSource);
        
        // Show the assignment lines toggle button
        const toggleAssignmentsBtn = document.getElementById('toggleAssignmentsBtn');
        if (toggleAssignmentsBtn) {
            toggleAssignmentsBtn.style.display = 'inline-flex';
            toggleAssignmentsBtn.innerHTML = '<i class="fas fa-bezier-curve"></i> Hide Assignment Lines';
            toggleAssignmentsBtn.classList.remove('btn-info');
            toggleAssignmentsBtn.classList.add('btn-warning');
        }
    }
    
    // Add bus stop markers
    stopsDataSource.forEach((stop, index) => {
        const lat = parseFloat(stop.snapped_lat);
        const lon = parseFloat(stop.snapped_lon);
        const students = parseInt(stop.num_students || 0);
        
        if (!isNaN(lat) && !isNaN(lon)) {
            const marker = L.marker([lat, lon], {
                icon: L.divIcon({
                    html: `<div style="background: #4299e1; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${students}</div>`,
                    iconSize: [30, 30],
                    className: 'stop-icon'
                }),
                zIndexOffset: 1000
            }).addTo(mapInstance);
            
            marker.bindPopup(`<b>Stop ${stop.cluster_number || (index + 1)}</b><br>
                             Students: ${students}<br>
                             Route: ${stop.route_name || 'Unknown'}<br>
                             Type: ${stop.route_type || 'Unknown'}`);
        }
    });
    
    // Add depot markers
    depotsDataSource.forEach((depot, index) => {
        const lat = parseFloat(depot.Latitude);
        const lon = parseFloat(depot.Longitude);
        const capacity = parseInt(depot.Counts || 0);
        
        if (!isNaN(lat) && !isNaN(lon)) {
            const marker = L.marker([lat, lon], {
                icon: L.divIcon({
                    html: `<i class="fas fa-warehouse" style="color: #e53e3e; font-size: 20px;"></i>`,
                    iconSize: [30, 30],
                    className: 'depot-icon'
                }),
                zIndexOffset: 1000
            }).addTo(mapInstance);
            
            marker.bindPopup(`<b>${depot['Parking Name'] || 'Depot ' + (index + 1)}</b><br>
                             Capacity: ${capacity} buses<br>
                             Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        }
    });
    
    // Fit map to show all markers
    const group = new L.featureGroup();
    mapInstance.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            group.addLayer(layer);
        }
    });
    
    if (group.getLayers().length > 0) {
        mapInstance.fitBounds(group.getBounds().pad(0.1));
    }
    
    // Display stops data panel
    displayStopsData();
    
    const statusMessage = studentDataSource.length > 0 ? 
        `Displayed ${stopsDataSource.length} stops, ${depotsDataSource.length} depots, and ${studentDataSource.length} student assignments on map` :
        `Displayed ${stopsDataSource.length} stops and ${depotsDataSource.length} depots on map`;
    
    showStatus(statusMessage, 'success');
}

// NEW FUNCTION: Add student assignment dots to the map
function addStudentAssignmentDots(mapInstance, studentDataSource) {
    console.log(`Adding ${studentDataSource.length} student assignment dots...`);
    
    // Create a feature group for student dots for better performance
    const studentLayer = L.featureGroup();
    const assignmentLinesLayer = L.featureGroup();
    let validStudents = 0;
    let totalAssignmentDistance = 0;
    let assignedStudents = 0;
    
    studentDataSource.forEach((student, index) => {
        const studentLat = parseFloat(student.student_lat);
        const studentLon = parseFloat(student.student_lon);
        
        if (!isNaN(studentLat) && !isNaN(studentLon)) {
            // Create a very small circle marker for each student
            const studentDot = L.circleMarker([studentLat, studentLon], {
                radius: 2,
                fillColor: '#ff6b6b',
                color: '#ff4757',
                weight: 1,
                opacity: 0.8,
                fillOpacity: 0.6,
                className: 'student-assignment-dot'
            });
            
            // Find assigned stop for this student
            const assignedStop = findAssignedStop(student);
            let distanceToStop = null;
            
            if (assignedStop) {
                const stopLat = parseFloat(assignedStop.snapped_lat);
                const stopLon = parseFloat(assignedStop.snapped_lon);
                
                // Calculate distance between student and assigned stop
                distanceToStop = calculateHaversineDistance(studentLat, studentLon, stopLat, stopLon);
                totalAssignmentDistance += distanceToStop;
                assignedStudents++;
                
                // Create assignment line
                const assignmentLine = L.polyline([
                    [studentLat, studentLon],
                    [stopLat, stopLon]
                ], {
                    color: distanceToStop > 2 ? '#ff4757' : distanceToStop > 1 ? '#ffa502' : '#26de81',
                    weight: 1,
                    opacity: 0.6,
                    dashArray: '2, 4',
                    className: 'assignment-line'
                });
                
                // Add popup to assignment line showing distance
                assignmentLine.bindPopup(`
                    <b>Student Assignment</b><br>
                    Distance to Stop: ${distanceToStop.toFixed(2)} km<br>
                    Stop: ${assignedStop.cluster_number}<br>
                    Quality: ${getAssignmentQuality(distanceToStop)}
                `);
                
                assignmentLinesLayer.addLayer(assignmentLine);
                
                // Update student dot color based on distance
                studentDot.setStyle({
                    fillColor: distanceToStop > 2 ? '#ff4757' : distanceToStop > 1 ? '#ffa502' : '#26de81',
                    color: distanceToStop > 2 ? '#ff3742' : distanceToStop > 1 ? '#ff9000' : '#20bf6b'
                });
            }
            
            // Add popup with student info
            const studentInfo = [];
            if (student.student_id) studentInfo.push(`ID: ${student.student_id}`);
            if (student.name) studentInfo.push(`Name: ${student.name}`);
            if (student.route) studentInfo.push(`Route: ${student.route}`);
            if (assignedStop) {
                studentInfo.push(`Assigned Stop: ${assignedStop.cluster_number}`);
                studentInfo.push(`Distance: ${distanceToStop.toFixed(2)} km`);
                studentInfo.push(`Quality: ${getAssignmentQuality(distanceToStop)}`);
            } else {
                studentInfo.push(`Status: No assigned stop found`);
            }
            studentInfo.push(`Location: ${studentLat.toFixed(5)}, ${studentLon.toFixed(5)}`);
            
            studentDot.bindPopup(`<b>Student Assignment</b><br>${studentInfo.join('<br>')}`);
            
            studentLayer.addLayer(studentDot);
            validStudents++;
        }
    });
    
    // Add both layers to the map
    assignmentLinesLayer.addTo(mapInstance);
    studentLayer.addTo(mapInstance);
    
    console.log(`Added ${validStudents} student dots and ${assignedStudents} assignment lines`);
    
    if (assignedStudents > 0) {
        const averageDistance = totalAssignmentDistance / assignedStudents;
        console.log(`Average assignment distance: ${averageDistance.toFixed(2)} km`);
        
        // Show assignment statistics
        showAssignmentStatistics(assignedStudents, validStudents, averageDistance, totalAssignmentDistance);
    }
    
    // Store references for later use (e.g., toggling visibility)
    mapInstance.studentLayer = studentLayer;
    mapInstance.assignmentLinesLayer = assignmentLinesLayer;
}

// NEW FUNCTION: Find assigned stop for a student
function findAssignedStop(student) {
    const stopsDataSource = window.stopsData || stopsData || [];
    
    // Method 1: Try to match by route name if available
    if (student.route && student.route !== '') {
        const stopsByRoute = stopsDataSource.filter(stop => 
            stop.route_name && stop.route_name.toLowerCase() === student.route.toLowerCase()
        );
        if (stopsByRoute.length > 0) {
            return findClosestStop(student, stopsByRoute);
        }
    }
    
    // Method 2: Try to match by stop ID if available in student data
    if (student.assigned_stop || student.stop_id) {
        const stopId = student.assigned_stop || student.stop_id;
        const assignedStop = stopsDataSource.find(stop => 
            stop.cluster_number && stop.cluster_number.toString() === stopId.toString()
        );
        if (assignedStop) return assignedStop;
    }
    
    // Method 3: Find closest stop within reasonable distance (fallback)
    return findClosestStop(student, stopsDataSource, 5); // within 5km
}

// NEW FUNCTION: Find closest stop to a student
function findClosestStop(student, stops, maxDistance = null) {
    const studentLat = parseFloat(student.student_lat);
    const studentLon = parseFloat(student.student_lon);
    
    if (isNaN(studentLat) || isNaN(studentLon)) return null;
    
    let closestStop = null;
    let minDistance = Infinity;
    
    stops.forEach(stop => {
        const stopLat = parseFloat(stop.snapped_lat);
        const stopLon = parseFloat(stop.snapped_lon);
        
        if (!isNaN(stopLat) && !isNaN(stopLon)) {
            const distance = calculateHaversineDistance(studentLat, studentLon, stopLat, stopLon);
            
            if (distance < minDistance && (!maxDistance || distance <= maxDistance)) {
                minDistance = distance;
                closestStop = stop;
            }
        }
    });
    
    return closestStop;
}

// NEW FUNCTION: Get assignment quality based on distance
function getAssignmentQuality(distance) {
    if (distance <= 0.5) return 'Excellent';
    if (distance <= 1.0) return 'Good';
    if (distance <= 2.0) return 'Fair';
    if (distance <= 3.0) return 'Poor';
    return 'Very Poor';
}

// NEW FUNCTION: Calculate Haversine distance between two points
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
}

// NEW FUNCTION: Show assignment statistics
function showAssignmentStatistics(assignedStudents, totalStudents, averageDistance, totalDistance) {
    // Create or update assignment statistics panel
    let statsPanel = document.getElementById('assignmentStatsPanel');
    
    if (!statsPanel) {
        statsPanel = document.createElement('div');
        statsPanel.id = 'assignmentStatsPanel';
        statsPanel.className = 'assignment-stats-panel';
        
        // Insert after the stops data panel
        const stopsPanel = document.getElementById('stopsDataPanel');
        if (stopsPanel && stopsPanel.parentNode) {
            stopsPanel.parentNode.insertBefore(statsPanel, stopsPanel.nextSibling);
        } else {
            document.body.appendChild(statsPanel);
        }
    }
    
    const assignmentRate = ((assignedStudents / totalStudents) * 100).toFixed(1);
    const qualityDistribution = calculateQualityDistribution();
    
    statsPanel.innerHTML = `
        <h3><i class="fas fa-chart-bar"></i> Assignment Analysis</h3>
        <div class="stats-summary">
            <div class="stat-card">
                <h4>Assignment Rate</h4>
                <div class="value">${assignmentRate}%</div>
                <div class="subtitle">${assignedStudents}/${totalStudents} students</div>
            </div>
            <div class="stat-card">
                <h4>Average Distance</h4>
                <div class="value">${averageDistance.toFixed(2)} km</div>
                <div class="subtitle">Student to stop</div>
            </div>
            <div class="stat-card">
                <h4>Total Distance</h4>
                <div class="value">${totalDistance.toFixed(1)} km</div>
                <div class="subtitle">All assignments</div>
            </div>
        </div>
        <div class="quality-breakdown">
            <h4>Assignment Quality Distribution</h4>
            <div class="quality-bars">
                <div class="quality-item">
                    <span class="quality-label excellent">Excellent (≤0.5km)</span>
                    <div class="quality-bar">
                        <div class="quality-fill excellent" style="width: ${qualityDistribution.excellent}%"></div>
                    </div>
                    <span class="quality-percentage">${qualityDistribution.excellent.toFixed(1)}%</span>
                </div>
                <div class="quality-item">
                    <span class="quality-label good">Good (0.5-1km)</span>
                    <div class="quality-bar">
                        <div class="quality-fill good" style="width: ${qualityDistribution.good}%"></div>
                    </div>
                    <span class="quality-percentage">${qualityDistribution.good.toFixed(1)}%</span>
                </div>
                <div class="quality-item">
                    <span class="quality-label fair">Fair (1-2km)</span>
                    <div class="quality-bar">
                        <div class="quality-fill fair" style="width: ${qualityDistribution.fair}%"></div>
                    </div>
                    <span class="quality-percentage">${qualityDistribution.fair.toFixed(1)}%</span>
                </div>
                <div class="quality-item">
                    <span class="quality-label poor">Poor (2-3km)</span>
                    <div class="quality-bar">
                        <div class="quality-fill poor" style="width: ${qualityDistribution.poor}%"></div>
                    </div>
                    <span class="quality-percentage">${qualityDistribution.poor.toFixed(1)}%</span>
                </div>
                <div class="quality-item">
                    <span class="quality-label very-poor">Very Poor (>3km)</span>
                    <div class="quality-bar">
                        <div class="quality-fill very-poor" style="width: ${qualityDistribution.veryPoor}%"></div>
                    </div>
                    <span class="quality-percentage">${qualityDistribution.veryPoor.toFixed(1)}%</span>
                </div>
            </div>
        </div>
        <div class="legend-section">
            <h4>Line Color Legend</h4>
            <div class="line-legend">
                <div class="legend-line"><span class="line-sample excellent-line"></span> Excellent (≤0.5km)</div>
                <div class="legend-line"><span class="line-sample good-line"></span> Good (0.5-1km)</div>
                <div class="legend-line"><span class="line-sample fair-line"></span> Fair (1-2km)</div>
                <div class="legend-line"><span class="line-sample poor-line"></span> Poor (>2km)</div>
            </div>
        </div>
    `;
    
    statsPanel.style.display = 'block';
}

// NEW FUNCTION: Calculate quality distribution
function calculateQualityDistribution() {
    const studentDataSource = window.studentData || studentData || [];
    const qualities = { excellent: 0, good: 0, fair: 0, poor: 0, veryPoor: 0 };
    let totalAssigned = 0;
    
    studentDataSource.forEach(student => {
        const assignedStop = findAssignedStop(student);
        if (assignedStop) {
            const distance = calculateHaversineDistance(
                parseFloat(student.student_lat),
                parseFloat(student.student_lon),
                parseFloat(assignedStop.snapped_lat),
                parseFloat(assignedStop.snapped_lon)
            );
            
            totalAssigned++;
            if (distance <= 0.5) qualities.excellent++;
            else if (distance <= 1.0) qualities.good++;
            else if (distance <= 2.0) qualities.fair++;
            else if (distance <= 3.0) qualities.poor++;
            else qualities.veryPoor++;
        }
    });
    
    // Convert to percentages
    const total = totalAssigned || 1; // Avoid division by zero
    return {
        excellent: (qualities.excellent / total) * 100,
        good: (qualities.good / total) * 100,
        fair: (qualities.fair / total) * 100,
        poor: (qualities.poor / total) * 100,
        veryPoor: (qualities.veryPoor / total) * 100
    };
}

// MODIFIED FUNCTION: Toggle student assignments and lines visibility
function toggleStudentAssignments() {
    const mapInstance = window.map || map;
    
    if (!mapInstance || !mapInstance.studentLayer) {
        showStatus('No student assignments to toggle', 'info');
        return;
    }
    
    const studentLayer = mapInstance.studentLayer;
    const assignmentLinesLayer = mapInstance.assignmentLinesLayer;
    const toggleBtn = document.getElementById('toggleStudentsBtn');
    
    if (mapInstance.hasLayer(studentLayer)) {
        // Hide student assignments and lines
        mapInstance.removeLayer(studentLayer);
        if (assignmentLinesLayer) {
            mapInstance.removeLayer(assignmentLinesLayer);
        }
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Show Students';
            toggleBtn.classList.remove('btn-warning');
            toggleBtn.classList.add('btn-info');
        }
        showStatus('Student assignments and connection lines hidden', 'info');
    } else {
        // Show student assignments and lines
        mapInstance.addLayer(studentLayer);
        if (assignmentLinesLayer) {
            mapInstance.addLayer(assignmentLinesLayer);
        }
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Students';
            toggleBtn.classList.remove('btn-info');
            toggleBtn.classList.add('btn-warning');
        }
        showStatus('Student assignments and connection lines shown', 'info');
    }
}

// NEW FUNCTION: Toggle just the assignment lines (keep student dots)
function toggleAssignmentLines() {
    const mapInstance = window.map || map;
    
    if (!mapInstance || !mapInstance.assignmentLinesLayer) {
        showStatus('No assignment lines to toggle', 'info');
        return;
    }
    
    const assignmentLinesLayer = mapInstance.assignmentLinesLayer;
    const toggleBtn = document.getElementById('toggleAssignmentsBtn');
    
    if (mapInstance.hasLayer(assignmentLinesLayer)) {
        // Hide assignment lines
        mapInstance.removeLayer(assignmentLinesLayer);
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fas fa-bezier-curve"></i> Show Assignment Lines';
            toggleBtn.classList.remove('btn-warning');
            toggleBtn.classList.add('btn-info');
        }
        showStatus('Assignment lines hidden', 'info');
    } else {
        // Show assignment lines
        mapInstance.addLayer(assignmentLinesLayer);
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fas fa-bezier-curve"></i> Hide Assignment Lines';
            toggleBtn.classList.remove('btn-info');
            toggleBtn.classList.add('btn-warning');
        }
        showStatus('Assignment lines shown', 'info');
    }
}

// Display optimization results
function displayResults() {
    const routesList = document.getElementById('routesList');
    if (!routesList) return;
    
    routesList.innerHTML = '';
    
    if (!window.optimizationResults || !window.optimizationResults.length) {
        routesList.innerHTML = '<p>No optimization results available.</p>';
        return;
    }
    
    window.optimizationResults.forEach((route, index) => {
        const color = window.ROUTE_COLORS ? window.ROUTE_COLORS[index % window.ROUTE_COLORS.length] : '#4299e1';
        const routeItem = document.createElement('div');
        routeItem.className = 'route-item';
        routeItem.style.borderLeftColor = color;
        
        const stopsList = route.stops.map(stop => 
            `Stop ${stop.cluster_number} (${stop.num_students} students)`
        ).join(', ');

        const distanceInfo = route.actualDistance ?
            `<p><strong>Route Distance: </strong> ${route.actualDistance.toFixed(1)} km</p>
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
    
    const resultsPanel = document.getElementById('resultsPanel');
    if (resultsPanel) {
        resultsPanel.style.display = 'block';
    }
}

