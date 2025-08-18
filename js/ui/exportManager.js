// Export functionality

// Export results to CSV
function exportResults() {
    console.log('🔄 Starting export process...');
    
    // Check multiple possible data sources
    let dataToExport = [];
    let exportType = 'unknown';
    
    // Check for optimization results
    if (window.optimizationResults && window.optimizationResults.length > 0) {
        dataToExport = window.optimizationResults;
        exportType = 'optimization';
        console.log('📊 Found optimization results:', dataToExport.length);
    }
    // Check for route data from visualization
    else if (window.routeData && window.routeData.routes) {
        dataToExport = Object.values(window.routeData.routes);
        exportType = 'routes';
        console.log('📊 Found route data:', dataToExport.length);
    }
    // Check for student data
    else if (window.studentData && window.studentData.length > 0) {
        dataToExport = window.studentData;
        exportType = 'students';
        console.log('📊 Found student data:', dataToExport.length);
    }
    // Check for stop coordinates data
    else if (window.stopsData && window.stopsData.length > 0) {
        dataToExport = window.stopsData;
        exportType = 'stops';
        console.log('📊 Found stops data:', dataToExport.length);
    }
    // Check for depots data
    else if (window.depotsData && window.depotsData.length > 0) {
        dataToExport = window.depotsData;
        exportType = 'depots';
        console.log('📊 Found depots data:', dataToExport.length);
    }
    // Check for any loaded data in the global scope
    else if (window.loadedData) {
        dataToExport = window.loadedData;
        exportType = 'loaded';
        console.log('📊 Found loaded data');
    }
    
    if (!dataToExport || dataToExport.length === 0) {
        showStatus('No data available to export. Please load or process data first.', 'error');
        console.log('❌ No exportable data found');
        return;
    }
    
    console.log(`📊 Exporting ${exportType} data with ${dataToExport.length} records`);
    
    // Prepare export data based on type
    let exportData = [];
    const timestamp = new Date().toISOString().split('T')[0];
    
    try {
        switch (exportType) {
            case 'optimization':
                exportData = prepareOptimizationData(dataToExport);
                break;
            case 'routes':
                exportData = prepareRouteData(dataToExport);
                break;
            case 'students':
                exportData = prepareStudentData(dataToExport);
                break;
            case 'stops':
                exportData = prepareStopData(dataToExport);
                break;
            case 'depots':
                exportData = prepareDepotData(dataToExport);
                break;
            case 'loaded':
                exportData = prepareLoadedData(dataToExport);
                break;
            default:
                exportData = prepareGenericData(dataToExport);
        }
        
        if (exportData.length === 0) {
            throw new Error('No data could be prepared for export');
        }
        
        // Convert to CSV using Papa Parse if available, otherwise manual CSV
        let csvContent;
        if (typeof Papa !== 'undefined' && Papa.unparse) {
            csvContent = Papa.unparse(exportData);
        } else {
            csvContent = convertToCSV(exportData);
        }
        
        // Create download
        downloadCSV(csvContent, `transport_data_${exportType}_${timestamp}.csv`);
        
        showStatus(`Successfully exported ${exportData.length} records as ${exportType} data!`, 'success');
        console.log('✅ Export completed successfully');
        
    } catch (error) {
        console.error('❌ Export failed:', error);
        showStatus(`Export failed: ${error.message}`, 'error');
    }
}

// Prepare optimization results data
function prepareOptimizationData(optimizationResults) {
    const exportData = [];
    
    optimizationResults.forEach((route, routeIndex) => {
        if (route.stops && route.stops.length > 0) {
            route.stops.forEach((stop, stopIndex) => {
                exportData.push({
                    bus_id: route.busId || `Bus_${routeIndex + 1}`,
                    depot: route.depot || 'Unknown',
                    route_sequence: stopIndex + 1,
                    stop_cluster: stop.cluster_number || stop.clusterId || stopIndex + 1,
                    included_in_route: true,
                    stop_lat: stop.snapped_lat || stop.lat || stop.latitude,
                    stop_lon: stop.snapped_lon || stop.lng || stop.longitude,
                    students_pickup: stop.num_students || stop.studentCount || 0,
                    road_type: stop.route_type || stop.roadType || 'Unknown',
                    road_name: stop.route_name || stop.roadName || 'Unknown',
                    total_students_in_bus: route.totalStudents || 0,
                    bus_efficiency: route.efficiency || 0,
                    route_distance_km: route.actualDistance ? route.actualDistance.toFixed(1) : 'N/A',
                    estimated_time_min: route.estimatedTime || 'N/A',
                    shift_time: getElementValue('shiftTime') || '8am',
                    day_of_week: getElementValue('dayOfWeek') || 'monday'
                });
            });
        }
    });
    
    // Add excluded stops if available
    if (window.excludedStops && window.excludedStops.length) {
        window.excludedStops.forEach(stop => {
            exportData.push({
                bus_id: "N/A",
                depot: "N/A",
                route_sequence: "N/A",
                stop_cluster: stop.cluster_number || 'Unknown',
                included_in_route: false,
                stop_lat: stop.snapped_lat || stop.lat,
                stop_lon: stop.snapped_lon || stop.lng,
                students_pickup: stop.num_students || 0,
                road_type: stop.route_type || 'Unknown',
                road_name: stop.route_name || 'Unknown',
                total_students_in_bus: "N/A",
                bus_efficiency: "N/A",
                route_distance_km: "N/A",
                estimated_time_min: "N/A",
                shift_time: getElementValue('shiftTime') || '8am',
                day_of_week: getElementValue('dayOfWeek') || 'monday',
                exclusion_reason: `Distance from college (${(stop.distanceFromCollege || 0).toFixed(1)}km) exceeds limit`
            });
        });
    }
    
    return exportData;
}

// Prepare route visualization data
function prepareRouteData(routes) {
    const exportData = [];
    
    routes.forEach((route, routeIndex) => {
        if (route.coordinates && route.coordinates.length > 0) {
            route.coordinates.forEach((coord, coordIndex) => {
                exportData.push({
                    route_id: route.id || `route_${routeIndex}`,
                    route_name: route.name || `Route ${routeIndex + 1}`,
                    point_sequence: coordIndex + 1,
                    latitude: coord.lat,
                    longitude: coord.lng,
                    extraction_method: route.extractionMethod || 'unknown',
                    total_points: route.coordinates.length,
                    route_color: route.color || '#000000',
                    visible: route.visible || false
                });
            });
        }
    });
    
    return exportData;
}

// Prepare student data
function prepareStudentData(students) {
    return students.map((student, index) => ({
        student_id: student.student_id || student.id || `student_${index + 1}`,
        student_name: student.name || student.student_name || 'Unknown',
        student_lat: student.student_lat || student.lat || student.latitude,
        student_lon: student.student_lon || student.lng || student.longitude,
        route_assigned: student.route || student.assigned_route || 'Unassigned',
        cluster_id: student.cluster_id || student.clusterId || 'Unknown',
        distance_from_college: student.distance_from_college || student.distanceFromCollege || 0
    }));
}

// Prepare stop coordinates data
function prepareStopData(stops) {
    return stops.map((stop, index) => ({
        stop_id: stop.stop_id || stop.id || `stop_${index + 1}`,
        stop_name: stop.stop_name || stop.name || 'Unknown',
        route_name: stop.route_name || stop.routeName || 'Unknown',
        latitude: stop.snapped_lat || stop.lat || stop.snapped_latitude,
        longitude: stop.snapped_lon || stop.lng || stop.snapped_longitude,
        original_latitude: stop.original_latitude || stop.originalLatitude,
        original_longitude: stop.original_longitude || stop.originalLongitude,
        formatted_address: stop.formatted_address || stop.formattedAddress || '',
        distance_from_college: stop.distance_from_college || stop.distanceFromCollege || 0,
        num_students: stop.num_students || stop.studentCount || 0,
        cluster_number: stop.cluster_number || stop.clusterId || 'Unknown',
        route_type: stop.route_type || stop.roadType || 'Unknown',
        visible: stop.visible !== undefined ? stop.visible : true,
        status: stop.isGenerated ? 'estimated' : 'geocoded'
    }));
}

// Prepare depot data
function prepareDepotData(depots) {
    return depots.map((depot, index) => ({
        depot_id: depot.depot_id || depot.id || `depot_${index + 1}`,
        depot_name: depot['Parking Name'] || depot.name || depot.depot_name || 'Unknown',
        latitude: depot.Latitude || depot.lat || depot.latitude,
        longitude: depot.Longitude || depot.lng || depot.longitude,
        capacity: depot.Counts || depot.capacity || 0,
        address: depot.Address || depot.address || ''
    }));
}

// Prepare loaded data (combination of all data types)
function prepareLoadedData(loadedData) {
    const exportData = [];
    
    if (loadedData.students && loadedData.students.length > 0) {
        const studentData = prepareStudentData(loadedData.students);
        studentData.forEach(item => {
            item.data_type = 'student';
            exportData.push(item);
        });
    }
    
    if (loadedData.stops && loadedData.stops.length > 0) {
        const stopData = prepareStopData(loadedData.stops);
        stopData.forEach(item => {
            item.data_type = 'stop';
            exportData.push(item);
        });
    }
    
    if (loadedData.depots && loadedData.depots.length > 0) {
        const depotData = prepareDepotData(loadedData.depots);
        depotData.forEach(item => {
            item.data_type = 'depot';
            exportData.push(item);
        });
    }
    
    return exportData;
}

// Prepare generic data (fallback)
function prepareGenericData(data) {
    if (!Array.isArray(data)) {
        // Convert object to array
        if (typeof data === 'object') {
            data = Object.values(data);
        } else {
            return [];
        }
    }
    
    // Flatten complex objects and return as is
    return data.map((item, index) => {
        if (typeof item === 'object') {
            const flattened = {};
            Object.keys(item).forEach(key => {
                if (typeof item[key] === 'object' && item[key] !== null) {
                    // Flatten nested objects
                    Object.keys(item[key]).forEach(nestedKey => {
                        flattened[`${key}_${nestedKey}`] = item[key][nestedKey];
                    });
                } else {
                    flattened[key] = item[key];
                }
            });
            return flattened;
        }
        return { value: item, index: index };
    });
}

// Helper function to get element value safely
function getElementValue(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.value : null;
}

// Manual CSV conversion if Papa Parse is not available
function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.map(header => `"${header}"`).join(','));
    
    // Add data rows
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '""';
            return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
}

// Download CSV file
function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
    
    console.log(`📁 Downloaded: ${filename}`);
}

// Enhanced export function with debug info
function exportResultsWithDebug() {
    console.log('🔍 Debug: Checking all possible data sources...');
    
    // Log all available global variables
    const globalVars = [
        'optimizationResults',
        'routeData', 
        'studentData',
        'stopsData',
        'depotsData',
        'stopCoordinatesData',
        'loadedData',
        'currentMarkers',
        'routeLines'
    ];
    
    globalVars.forEach(varName => {
        if (window[varName]) {
            console.log(`✅ Found ${varName}:`, typeof window[varName], window[varName]);
        } else {
            console.log(`❌ Missing ${varName}`);
        }
    });
    
    // Call the main export function
    exportResults();
}

// Export all available data in one comprehensive file
function exportAllData() {
    console.log('🔄 Starting comprehensive data export...');
    
    const allData = [];
    let hasData = false;
    
    // Collect all available data
    if (window.studentData && window.studentData.length > 0) {
        const studentExport = prepareStudentData(window.studentData);
        studentExport.forEach(item => {
            item.data_source = 'students';
            allData.push(item);
        });
        hasData = true;
        console.log(`📊 Added ${studentExport.length} student records`);
    }
    
    if (window.stopsData && window.stopsData.length > 0) {
        const stopsExport = prepareStopData(window.stopsData);
        stopsExport.forEach(item => {
            item.data_source = 'stops';
            allData.push(item);
        });
        hasData = true;
        console.log(`📊 Added ${stopsExport.length} stop records`);
    }
    
    if (window.depotsData && window.depotsData.length > 0) {
        const depotsExport = prepareDepotData(window.depotsData);
        depotsExport.forEach(item => {
            item.data_source = 'depots';
            allData.push(item);
        });
        hasData = true;
        console.log(`📊 Added ${depotsExport.length} depot records`);
    }
    
    if (window.optimizationResults && window.optimizationResults.length > 0) {
        const optimizationExport = prepareOptimizationData(window.optimizationResults);
        optimizationExport.forEach(item => {
            item.data_source = 'optimization_results';
            allData.push(item);
        });
        hasData = true;
        console.log(`📊 Added ${optimizationExport.length} optimization records`);
    }
    
    if (!hasData) {
        showStatus('No data available to export. Please load data first.', 'error');
        return;
    }
    
    try {
        // Convert to CSV
        let csvContent;
        if (typeof Papa !== 'undefined' && Papa.unparse) {
            csvContent = Papa.unparse(allData);
        } else {
            csvContent = convertToCSV(allData);
        }
        
        // Download
        const timestamp = new Date().toISOString().split('T')[0];
        downloadCSV(csvContent, `all_transport_data_${timestamp}.csv`);
        
        showStatus(`Successfully exported ${allData.length} total records from all data sources!`, 'success');
        console.log('✅ Comprehensive export completed successfully');
        
    } catch (error) {
        console.error('❌ Comprehensive export failed:', error);
        showStatus(`Export failed: ${error.message}`, 'error');
    }
}

// Make functions globally available
window.exportResults = exportResults;
window.exportResultsWithDebug = exportResultsWithDebug;
window.exportAllData = exportAllData;
