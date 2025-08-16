// UPDATED BUS_CONSTRAINTS - kept as is per your requirements
const BUS_CONSTRAINTS = {
    // Distance constraints - MUCH TIGHTER
    MAX_ROUTE_DISTANCE_KM: 50,         // Reduced from 45km
    MIN_ROUTE_DISTANCE_KM: 5,          // Minimum viable route distance
    MAX_DISTANCE_FROM_COLLEGE_KM: 40,  // Reduced from 40km - much tighter
    MAX_CLUSTER_RADIUS_KM: 12,         // NEW: max distance between stops in same cluster
    
    // Time constraints
    MAX_ROUTE_TIME_MINUTES: 120,       // Maximum route duration
    MIN_STOP_TIME_SECONDS: 180,        // Minimum time at each stop (3 minutes)
    MAX_STOP_TIME_SECONDS: 300,        // Maximum time at each stop (5 minutes)
    
    // Capacity constraints
    MIN_STUDENTS_PER_ROUTE: 8,         // Minimum students to justify a route
    MAX_STUDENTS_PER_BUS: 55,          // Maximum bus capacity
    MIN_EFFICIENCY_PERCENT: 40,        // Minimum capacity utilization
    
    // Geographic constraints - STRICTER
    MAX_DETOUR_RATIO: 1.7,             // Reduced from 1.8 - less winding allowed
    MAX_STOPS_PER_ROUTE: 12,           // Reduced from 15
    MIN_STOPS_PER_ROUTE: 1,            // Minimum stops per route
    
    // Road type restrictions
    AVOID_ROAD_TYPES: [
        'footway', 'path', 'cycleway', 
        'steps', 'track', 'bridleway'
    ],
    
    // Infrastructure requirements
    MIN_ROAD_WIDTH_METERS: 6,          // Minimum road width for buses
    ALLOW_TOLL_ROADS: true,            // Whether to use toll roads
};

// MAIN OPTIMIZATION FUNCTION - Updated with advanced strategies
async function optimizeWithGoogleAPI() {
    try {
        console.log('🎯 Starting enhanced route optimization with direct routes...');
        
        // Use the direct route approach for tight constraints
        return await optimizeWithDirectRoutes();
        
    } catch (error) {
        console.error('Route Optimization API Error:', error);
        showStatus(`⚠️ Route Optimization API failed: ${error.message}`, 'warning');
        return await simulateOptimization();
    }
}

// DIRECT ROUTES APPROACH - Optimized for tight constraints
async function optimizeWithDirectRoutes() {
    try {
        // Get stops within allowed radius
        const nearbyStops = stopsData.filter(stop => {
            const distance = calculateHaversineDistance(
                COLLEGE_COORDS[0], COLLEGE_COORDS[1],
                parseFloat(stop.snapped_lat), parseFloat(stop.snapped_lon)
            );
            return distance <= BUS_CONSTRAINTS.MAX_DISTANCE_FROM_COLLEGE_KM;
        });
        
        console.log(`📊 Working with ${nearbyStops.length} stops within ${BUS_CONSTRAINTS.MAX_DISTANCE_FROM_COLLEGE_KM}km radius`);
        
        if (nearbyStops.length === 0) {
            showStatus('⚠️ No stops found within allowed distance', 'warning');
            return [];
        }
        
        // Focus on single-stop direct routes - most likely to succeed with tight constraints
        // Only include stops with significant student counts
        const singleStopRoutes = [];
        
        // Calculate distance and add good candidates to routes
        nearbyStops.forEach(stop => {
            const distance = calculateHaversineDistance(
                COLLEGE_COORDS[0], COLLEGE_COORDS[1],
                parseFloat(stop.snapped_lat), parseFloat(stop.snapped_lon)
            );
            
            // Double the distance for round trip and add road factor
            const estimatedDistance = distance * 2 * 1.2;
            
            // Only include stops that will likely meet the distance constraint
            if (estimatedDistance <= BUS_CONSTRAINTS.MAX_ROUTE_DISTANCE_KM) {
                const students = parseInt(stop.num_students);
                const estimatedTime = (estimatedDistance * 2) + 5; // 2 min per km + 5 min for stop
                
                // Ensure route will likely meet time constraint
                if (estimatedTime <= BUS_CONSTRAINTS.MAX_ROUTE_TIME_MINUTES) {
                    singleStopRoutes.push({
                        stops: [stop],
                        students: students,
                        estimatedDistance: estimatedDistance,
                        estimatedTime: estimatedTime
                    });
                }
            }
        });
        
        // Sort routes by student count (efficiency)
        singleStopRoutes.sort((a, b) => b.students - a.students);
        
        // Only process the top 20-30 routes to avoid rate limiting
        const topRoutes = singleStopRoutes.slice(0, 30);
        
        console.log(`📊 Selected ${topRoutes.length} direct routes for optimization`);
        
        // Process routes with rate limiting
        const allRoutes = [];
        
        for (let i = 0; i < topRoutes.length; i++) {
            const route = topRoutes[i];
            
            try {
                console.log(`🚌 Optimizing route ${i + 1}/${topRoutes.length} with ${route.stops.length} stops, ${route.students} students`);
                console.log(`📏 Est. distance: ${route.estimatedDistance.toFixed(1)}km, time: ${route.estimatedTime.toFixed(0)} min`);
                
                const result = await optimizeCandidate(route, i);
                
                if (result) {
                    allRoutes.push(result);
                    console.log(`✅ Route ${i + 1} optimized successfully`);
                }
                
                // Add delay between API calls to avoid rate limiting
                if (i < topRoutes.length - 1) {
                    console.log('⏱️ Waiting between API calls to avoid rate limiting...');
                    await new Promise(resolve => setTimeout(resolve, 1200)); // 1.2 second delay
                }
            } catch (error) {
                console.error(`❌ Error optimizing route ${i + 1}:`, error);
            }
        }
        
        console.log(`📊 Final result: ${allRoutes.length} optimized routes`);
        
        if (allRoutes.length > 0) {
            showStatus(`✅ Generated ${allRoutes.length} feasible bus routes`, 'success');
            return allRoutes;
        } else {
            showStatus('❌ No feasible routes found. Try increasing MAX_ROUTE_DISTANCE_KM slightly.', 'error');
            return [];
        }
    } catch (error) {
        console.error('Direct routes optimization failed:', error);
        return [];
    }
}

// Optimize a single route with proper error handling
async function optimizeCandidate(route, index) {
    try {
        const maxCapacity = parseInt(document.getElementById('maxCapacity').value);
        
        const requestData = {
            model: {
                shipments: route.stops.map((stop, stopIndex) => ({
                    deliveries: [{
                        arrivalLocation: {
                            latitude: parseFloat(stop.snapped_lat),
                            longitude: parseFloat(stop.snapped_lon)
                        },
                        duration: "240s", // 4 minutes per stop
                        loadDemands: {
                            students: {
                                amount: parseInt(stop.num_students)
                            }
                        }
                    }],
                    label: `route_${index}_stop_${stopIndex}`
                })),
                vehicles: [{
                    startLocation: {
                        latitude: COLLEGE_COORDS[0],
                        longitude: COLLEGE_COORDS[1]
                    },
                    endLocation: {
                        latitude: COLLEGE_COORDS[0],  // Always return to college
                        longitude: COLLEGE_COORDS[1]
                    },
                    loadLimits: {
                        students: {
                            maxLoad: maxCapacity
                        }
                    },
                    label: `bus_route_${index}`,
                    routeModifiers: {
                        avoidTolls: false,
                        avoidHighways: false, // Allow highways for faster routes
                        avoidFerries: true
                    }
                }],
                globalStartTime: "2024-01-01T08:00:00Z",
                globalEndTime: "2024-01-01T12:00:00Z"
            },
            searchMode: "RETURN_FAST",
            considerRoadTraffic: false,
            populatePolylines: true
        };
        
        try {
            const response = await fetch('http://localhost:3000/api/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ API error for route ${index + 1}:`, errorText);
                return null;
            }
            
            const result = await response.json();
            if (!result.routes || result.routes.length === 0) {
                console.warn(`⚠️ No routes returned for candidate ${index + 1}`);
                return null;
            }
            
            const apiRoute = result.routes[0];
            
            // Extract stops safely with proper error checking
            const routeStops = extractRouteStopsSafely(apiRoute, route.stops);
            
            if (routeStops.length === 0) {
                console.warn(`⚠️ No stops extracted for route ${index + 1}`);
                return null;
            }
            
            const routeData = createRouteData(apiRoute, routeStops, index);
            const validation = validateBusRouteFeasibility(routeData, index);
            
            if (validation.isValid) {
                return {
                    ...routeData,
                    totalStudents: validation.metrics.students,
                    efficiency: `${validation.metrics.efficiency.toFixed(1)}%`,
                    totalDistance: `${validation.metrics.distance.toFixed(1)} km`,
                    totalTime: `${Math.round(validation.metrics.time)} min`,
                    feasibilityScore: calculateFeasibilityScore(validation.metrics),
                    warnings: validation.warnings
                };
            } else {
                console.warn(`❌ Route ${index + 1} failed validation:`, validation.issues);
            }
        } catch (error) {
            console.error(`❌ API request failed for route ${index + 1}:`, error);
        }
        
        return null;
    } catch (error) {
        console.error(`Error in optimizeCandidate for route ${index}:`, error);
        return null;
    }
}

// Safer version of extractRouteStops that handles array access issues
function extractRouteStopsSafely(apiRoute, candidateStops) {
    try {
        console.log('🔍 Debug: API route structure:', {
            hasVisits: !!apiRoute?.visits,
            visitsLength: apiRoute?.visits?.length,
            candidateStopsLength: candidateStops?.length,
            apiRouteKeys: Object.keys(apiRoute || {})
        });
        
        if (!apiRoute) {
            console.warn('❌ No API route provided');
            return [];
        }
        
        // Check multiple possible response structures
        let visits = apiRoute.visits;
        
        // Alternative structures the API might use
        if (!visits && apiRoute.routes?.[0]?.visits) {
            visits = apiRoute.routes[0].visits;
        }
        if (!visits && apiRoute.legs) {
            visits = apiRoute.legs;
        }
        if (!visits && apiRoute.waypoints) {
            visits = apiRoute.waypoints;
        }
        
        if (!visits || !Array.isArray(visits)) {
            console.warn('❌ No visits array found in API response structure');
            console.log('Available keys:', Object.keys(apiRoute));
            
            // FALLBACK: For single-stop routes, just return the candidate stop
            if (candidateStops && candidateStops.length === 1) {
                console.log('✅ Fallback: Using single candidate stop');
                return candidateStops;
            }
            
            return [];
        }
        
        console.log(`🔍 Found ${visits.length} visits in API response`);
        
        const stops = [];
        
        visits.forEach((visit, visitIndex) => {
            console.log(`🔍 Visit ${visitIndex}:`, {
                shipmentIndex: visit.shipmentIndex,
                hasShipmentIndex: visit.shipmentIndex !== undefined,
                visitKeys: Object.keys(visit)
            });
            
            // Try multiple ways to match stops
            let matchedStop = null;
            
            // Method 1: Direct shipmentIndex
            if (visit.shipmentIndex !== undefined && 
                candidateStops && 
                visit.shipmentIndex >= 0 && 
                visit.shipmentIndex < candidateStops.length) {
                
                matchedStop = candidateStops[visit.shipmentIndex];
                console.log(`✅ Method 1: Matched stop via shipmentIndex ${visit.shipmentIndex}`);
            }
            
            // Method 2: By visit order (fallback)
            else if (!matchedStop && candidateStops && visitIndex < candidateStops.length) {
                matchedStop = candidateStops[visitIndex];
                console.log(`✅ Method 2: Matched stop via visit order ${visitIndex}`);
            }
            
            // Method 3: By location matching (last resort)
            else if (!matchedStop && visit.location && candidateStops) {
                const visitLat = visit.location.latitude || visit.location.lat;
                const visitLon = visit.location.longitude || visit.location.lng || visit.location.lon;
                
                if (visitLat && visitLon) {
                    matchedStop = candidateStops.find(stop => {
                        const stopLat = parseFloat(stop.snapped_lat);
                        const stopLon = parseFloat(stop.snapped_lon);
                        const distance = calculateHaversineDistance(visitLat, visitLon, stopLat, stopLon);
                        return distance < 0.1; // Within 100m
                    });
                    
                    if (matchedStop) {
                        console.log(`✅ Method 3: Matched stop via location`);
                    }
                }
            }
            
            if (matchedStop) {
                stops.push(matchedStop);
                console.log(`✅ Added stop: ${matchedStop.cluster_number} with ${matchedStop.num_students} students`);
            } else {
                console.warn(`❌ Could not match visit ${visitIndex} to any candidate stop`);
            }
        });
        
        console.log(`📊 Final result: ${stops.length} stops extracted from ${visits.length} visits`);
        
        return stops;
        
    } catch (error) {
        console.error('❌ Error extracting route stops:', error);
        
        // EMERGENCY FALLBACK: For single-stop routes, return the candidate
        if (candidateStops && candidateStops.length === 1) {
            console.log('🆘 Emergency fallback: Using single candidate stop');
            return candidateStops;
        }
        
        return [];
    }
}

// HELPER FUNCTIONS
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

function createRouteData(route, routeStops, index) {
    const routeDistanceKm = route.metrics?.travelDistanceMeters ? 
        route.metrics.travelDistanceMeters / 1000 : 
        estimateRouteDistance(routeStops);
    
    return {
        busId: `Bus ${index + 1}`,
        depot: depotsData[index % depotsData.length]['Parking Name'],
        stops: routeStops,
        originalRoute: route,
        totalDistance: routeDistanceKm,
        totalTime: route.vehicleStartTime && route.vehicleEndTime ? 
                  calculateTimeDifference(route.vehicleStartTime, route.vehicleEndTime) : 
                  estimateRouteTime(routeStops),
        cost: route.metrics?.totalCost?.toFixed(2) || 'N/A'
    };
}

function optimizeRouteOrder(stops, startPoint = COLLEGE_COORDS) {
    if (!stops || !Array.isArray(stops) || stops.length <= 2) return stops;
    
    try {
        console.log(`🔄 Optimizing stop order for ${stops.length} stops`);
        
        // Simple nearest-neighbor TSP approximation to reduce winding
        const optimized = [];
        const remaining = [...stops];
        let current = startPoint;
        
        while (remaining.length > 0) {
            let nearestIndex = 0;
            let nearestDistance = Infinity;
            
            remaining.forEach((stop, index) => {
                if (!stop) return;
                
                try {
                    const lat = parseFloat(stop.snapped_lat);
                    const lon = parseFloat(stop.snapped_lon);
                    
                    if (isNaN(lat) || isNaN(lon)) return;
                    
                    const distance = calculateHaversineDistance(
                        current[0], current[1],
                        lat, lon
                    );
                    
                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestIndex = index;
                    }
                } catch (error) {
                    console.warn('Error calculating distance in optimizeRouteOrder:', error);
                }
            });
            
            const nearestStop = remaining.splice(nearestIndex, 1)[0];
            if (nearestStop) {
                optimized.push(nearestStop);
                
                try {
                    const lat = parseFloat(nearestStop.snapped_lat);
                    const lon = parseFloat(nearestStop.snapped_lon);
                    
                    if (!isNaN(lat) && !isNaN(lon)) {
                        current = [lat, lon];
                    }
                } catch (error) {
                    console.warn('Error updating current position in optimizeRouteOrder:', error);
                }
            }
        }
        
        return optimized;
    } catch (error) {
        console.error('Error in optimizeRouteOrder:', error);
        return stops; // Return original stops on error
    }
}

function validateBusRouteFeasibility(route, routeIndex) {
    try {
        const issues = [];
        const warnings = [];
        
        // 1. Distance validation - STRICTER
        let routeDistanceKm = 0;
        if (route.totalDistance) {
            routeDistanceKm = typeof route.totalDistance === 'number' ? 
                route.totalDistance : parseFloat(route.totalDistance);
        } else if (route.originalRoute?.metrics?.travelDistanceMeters) {
            routeDistanceKm = route.originalRoute.metrics.travelDistanceMeters / 1000;
        } else if (route.stops) {
            routeDistanceKm = estimateRouteDistance(route.stops);
        }
        
        if (routeDistanceKm > BUS_CONSTRAINTS.MAX_ROUTE_DISTANCE_KM) {
            issues.push(`Route too long: ${routeDistanceKm.toFixed(1)}km (max: ${BUS_CONSTRAINTS.MAX_ROUTE_DISTANCE_KM}km)`);
        }
        
        if (routeDistanceKm < BUS_CONSTRAINTS.MIN_ROUTE_DISTANCE_KM) {
            warnings.push(`Route very short: ${routeDistanceKm.toFixed(1)}km (min recommended: ${BUS_CONSTRAINTS.MIN_ROUTE_DISTANCE_KM}km)`);
        }
        
        // 2. Time validation
        let routeTimeMinutes = 0;
        if (route.originalRoute?.vehicleStartTime && route.originalRoute?.vehicleEndTime) {
            const timeDiff = new Date(route.originalRoute.vehicleEndTime) - new Date(route.originalRoute.vehicleStartTime);
            routeTimeMinutes = timeDiff / (1000 * 60);
        } else if (route.stops) {
            routeTimeMinutes = estimateRouteTime(route.stops);
        }
        
        if (routeTimeMinutes > BUS_CONSTRAINTS.MAX_ROUTE_TIME_MINUTES) {
            issues.push(`Route too long: ${routeTimeMinutes.toFixed(0)} minutes (max: ${BUS_CONSTRAINTS.MAX_ROUTE_TIME_MINUTES} minutes)`);
        }
        
        // 3. Student count validation
        const totalStudents = route.stops ? 
            route.stops.reduce((sum, stop) => sum + parseInt(stop.num_students || 0), 0) : 
            route.totalStudents || 0;
        
        if (totalStudents < BUS_CONSTRAINTS.MIN_STUDENTS_PER_ROUTE) {
            warnings.push(`Low student count: ${totalStudents} (min recommended: ${BUS_CONSTRAINTS.MIN_STUDENTS_PER_ROUTE})`);
        }
        
        if (totalStudents > BUS_CONSTRAINTS.MAX_STUDENTS_PER_BUS) {
            issues.push(`Exceeds bus capacity: ${totalStudents} students (max: ${BUS_CONSTRAINTS.MAX_STUDENTS_PER_BUS})`);
        }
        
        // 4. Efficiency validation
        const efficiency = (totalStudents / BUS_CONSTRAINTS.MAX_STUDENTS_PER_BUS) * 100;
        if (efficiency < BUS_CONSTRAINTS.MIN_EFFICIENCY_PERCENT) {
            warnings.push(`Low efficiency: ${efficiency.toFixed(1)}% (min recommended: ${BUS_CONSTRAINTS.MIN_EFFICIENCY_PERCENT}%)`);
        }
        
        // 5. Stop count validation - STRICTER
        const stopCount = route.stops?.length || 0;
        if (stopCount > BUS_CONSTRAINTS.MAX_STOPS_PER_ROUTE) {
            issues.push(`Too many stops: ${stopCount} (max: ${BUS_CONSTRAINTS.MAX_STOPS_PER_ROUTE})`);
        }
        
        if (stopCount < BUS_CONSTRAINTS.MIN_STOPS_PER_ROUTE) {
            warnings.push(`Few stops: ${stopCount} (min recommended: ${BUS_CONSTRAINTS.MIN_STOPS_PER_ROUTE})`);
        }
        
        // 6. Detour validation - STRICTER
        const detourRatio = calculateDetourRatio(route);
        if (detourRatio > BUS_CONSTRAINTS.MAX_DETOUR_RATIO) {
            warnings.push(`High detour ratio: ${detourRatio.toFixed(1)}x (max recommended: ${BUS_CONSTRAINTS.MAX_DETOUR_RATIO}x)`);
        }
        
        return {
            isValid: issues.length === 0,
            issues,
            warnings,
            metrics: {
                distance: routeDistanceKm,
                time: routeTimeMinutes,
                students: totalStudents,
                efficiency: efficiency,
                stops: stopCount,
                detourRatio
            }
        };
    } catch (error) {
        console.error('Error validating route:', error);
        return {
            isValid: false,
            issues: ['Validation error: ' + error.message],
            warnings: [],
            metrics: {
                distance: 0,
                time: 0,
                students: 0,
                efficiency: 0,
                stops: 0,
                detourRatio: 0
            }
        };
    }
}

function estimateRouteDistance(stops) {
    try {
        if (!stops || !Array.isArray(stops) || stops.length < 1) return 0;
        
        let totalDistance = 0;
        
        // Distance from college to first stop
        if (stops.length > 0) {
            totalDistance += calculateHaversineDistance(
                COLLEGE_COORDS[0], COLLEGE_COORDS[1],
                parseFloat(stops[0].snapped_lat), parseFloat(stops[0].snapped_lon)
            );
        }
        
        // Distance between consecutive stops
        for (let i = 0; i < stops.length - 1; i++) {
            totalDistance += calculateHaversineDistance(
                parseFloat(stops[i].snapped_lat), parseFloat(stops[i].snapped_lon),
                parseFloat(stops[i + 1].snapped_lat), parseFloat(stops[i + 1].snapped_lon)
            );
        }
        
        // Add return to college distance
        if (stops.length > 0) {
            totalDistance += calculateHaversineDistance(
                parseFloat(stops[stops.length - 1].snapped_lat), parseFloat(stops[stops.length - 1].snapped_lon),
                COLLEGE_COORDS[0], COLLEGE_COORDS[1]
            );
        }
        
        // Apply road network factor for more realistic estimates
        return totalDistance * 1.3;
    } catch (error) {
        console.error('Error estimating route distance:', error);
        return 0;
    }
}

function estimateRouteTime(stops) {
    try {
        if (!stops || !Array.isArray(stops) || stops.length === 0) return 0;
        
        const distance = estimateRouteDistance(stops);
        // More realistic time estimation
        const drivingTime = distance * 2; // ~2 minutes per km in city traffic
        const stopTime = stops.length * 4; // 4 minutes per stop (more realistic)
        const bufferTime = 10; // Add buffer for traffic, etc.
        
        return drivingTime + stopTime + bufferTime;
    } catch (error) {
        console.error('Error estimating route time:', error);
        return 0;
    }
}

function calculateDetourRatio(route) {
    try {
        if (!route.stops || !Array.isArray(route.stops) || route.stops.length < 2) return 1;
        
        // Calculate direct distance from college to farthest point and back
        const farthestStop = route.stops.reduce((farthest, stop) => {
            const distance = calculateHaversineDistance(
                COLLEGE_COORDS[0], COLLEGE_COORDS[1],
                parseFloat(stop.snapped_lat), parseFloat(stop.snapped_lon)
            );
            return distance > farthest.distance ? { stop, distance } : farthest;
        }, { distance: 0 });
        
        const directDistance = farthestStop.distance * 2; // Round trip
        const actualDistance = estimateRouteDistance(route.stops);
        
        return directDistance > 0 ? actualDistance / directDistance : 1;
    } catch (error) {
        console.error('Error calculating detour ratio:', error);
        return 1;
    }
}

function calculateFeasibilityScore(metrics) {
    try {
        let score = 100;
        
        // Distance penalty - STRICTER
        if (metrics.distance > BUS_CONSTRAINTS.MAX_ROUTE_DISTANCE_KM * 0.7) {
            score -= 25;
        }
        
        // Efficiency bonus/penalty
        if (metrics.efficiency > 70) {
            score += 15;
        } else if (metrics.efficiency < 40) {
            score -= 20;
        }
        
        // Time penalty
        if (metrics.time > BUS_CONSTRAINTS.MAX_ROUTE_TIME_MINUTES * 0.8) {
            score -= 15;
        }
        
        // Detour penalty - STRICTER
        if (metrics.detourRatio > BUS_CONSTRAINTS.MAX_DETOUR_RATIO) {
            score -= 20;
        }
        
        return Math.max(0, Math.min(100, score));
    } catch (error) {
        console.error('Error calculating feasibility score:', error);
        return 0;
    }
}

function calculateTimeDifference(startTime, endTime) {
    try {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const diffMs = end - start;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${diffHours}h ${diffMins}m`;
    } catch (error) {
        console.error('Error calculating time difference:', error);
        return 'N/A';
    }
}

// LEGACY SUPPORT - Updated existing functions
function processRouteOptimizationResponse(apiResponse) {
    console.log('⚠️ Using legacy processRouteOptimizationResponse - consider updating to direct routes approach');
    
    const validRoutes = [];
    const routeAnalytics = {
        totalRoutes: 0,
        validRoutes: 0,
        invalidRoutes: 0,
        issueBreakdown: {},
        warningBreakdown: {}
    };
    
    if (apiResponse.routes) {
        routeAnalytics.totalRoutes = apiResponse.routes.length;

        apiResponse.routes.forEach((route, index) => {
            const routeStops = extractRouteLegacyStops(route);
            if (routeStops.length === 0) return;
            
            const routeObj = createRouteData(route, routeStops, index);
            const validation = validateBusRouteFeasibility(routeObj, index);
            
            if (validation.isValid) {
                validRoutes.push({
                    ...routeObj,
                    totalStudents: validation.metrics.students,
                    efficiency: `${validation.metrics.efficiency.toFixed(1)}%`,
                    totalDistance: `${validation.metrics.distance.toFixed(1)} km`,
                    totalTime: `${Math.round(validation.metrics.time)} min`,
                    feasibilityScore: calculateFeasibilityScore(validation.metrics),
                    warnings: validation.warnings
                });
                routeAnalytics.validRoutes++;
            } else {
                routeAnalytics.invalidRoutes++;
            }
        });
    }
    
    const successRate = (routeAnalytics.validRoutes / routeAnalytics.totalRoutes * 100).toFixed(1);
    if (routeAnalytics.validRoutes > 0) {
        showStatus(`✅ Generated ${routeAnalytics.validRoutes} feasible bus routes (${successRate}% success rate)`, 'success');
    } else {
        showStatus(`⚠️ No feasible routes found. Consider using direct routes approach.`, 'warning');
    }
    
    return validRoutes;
}

function extractRouteLegacyStops(route) {
    try {
        const stops = [];
        if (route.visits) {
            route.visits.forEach(visit => {
                if (visit.shipmentIndex !== undefined) {
                    const matchingStop = findStopByShipmentIndex(visit.shipmentIndex);
                    if (matchingStop) {
                        stops.push(matchingStop);
                    }
                }
            });
        }
        return stops;
    } catch (error) {
        console.error('Error extracting legacy stops:', error);
        return [];
    }
}

function findStopByShipmentIndex(shipmentIndex) {
    try {
        if (shipmentIndex >= 0 && shipmentIndex < stopsData.length) {
            return stopsData[shipmentIndex];
        }
        return null;
    } catch (error) {
        console.error('Error finding stop by index:', error);
        return null;
    }
}

// Keep existing prepareOptimizationRequest for backwards compatibility
function prepareOptimizationRequest() {
    console.log('⚠️ Using legacy prepareOptimizationRequest - direct routes approach is recommended');
    
    try {
        const maxCapacity = parseInt(document.getElementById('maxCapacity').value);
        const filteredStops = filterStopsByDistance(stopsData, BUS_CONSTRAINTS.MAX_DISTANCE_FROM_COLLEGE_KM);
        
        // Limit to 10 buses maximum to avoid API rate limits
        const requiredBuses = Math.min(10, Math.max(1, Math.ceil(filteredStops.length / 12)));
        
        const shipments = filteredStops.map((stop, index) => ({
            deliveries: [{
                arrivalLocation: {
                    latitude: parseFloat(stop.snapped_lat),
                    longitude: parseFloat(stop.snapped_lon)
                },
                duration: "300s",
                loadDemands: {
                    students: {
                        amount: parseInt(stop.num_students)
                    }
                }
            }],
            label: `stop_${stop.cluster_number}`
        }));
        
        const vehicles = [];
        for (let i = 0; i < requiredBuses; i++) {
            vehicles.push({
                startLocation: {
                    latitude: COLLEGE_COORDS[0],
                    longitude: COLLEGE_COORDS[1]
                },
                endLocation: {
                    latitude: COLLEGE_COORDS[0],  // Changed to round trip back to college
                    longitude: COLLEGE_COORDS[1]  // Changed to round trip back to college
                },
                loadLimits: {
                    students: {
                        maxLoad: maxCapacity
                    }
                },
                label: `bus_${i + 1}`,
                routeModifiers: {
                    avoidTolls: false,
                    avoidHighways: false,
                    avoidFerries: true
                }
            });
        }
        
        return {
            model: {
                shipments: shipments,
                vehicles: vehicles,
                globalStartTime: "2024-01-01T08:00:00Z",
                globalEndTime: "2024-01-01T12:00:00Z"  // Shortened time window
            },
            searchMode: "RETURN_FAST"
        };
    } catch (error) {
        console.error('Error preparing optimization request:', error);
        
        // Return a minimal valid request
        return {
            model: {
                shipments: [],
                vehicles: [{
                    startLocation: {
                        latitude: COLLEGE_COORDS[0],
                        longitude: COLLEGE_COORDS[1]
                    },
                    endLocation: {
                        latitude: COLLEGE_COORDS[0],
                        longitude: COLLEGE_COORDS[1]
                    },
                    loadLimits: {
                        students: {
                            maxLoad: 55
                        }
                    }
                }],
                globalStartTime: "2024-01-01T08:00:00Z",
                globalEndTime: "2024-01-01T12:00:00Z"
            },
            searchMode: "RETURN_FAST"
        };
    }
}

function filterStopsByDistance(stopsData, maxRadiusKm = BUS_CONSTRAINTS.MAX_DISTANCE_FROM_COLLEGE_KM) {
    try {
        const filteredStops = [];
        const excludedStops = [];
        
        stopsData.forEach(stop => {
            try {
                const distanceToStop = calculateHaversineDistance(
                    COLLEGE_COORDS[0], COLLEGE_COORDS[1],
                    parseFloat(stop.snapped_lat), parseFloat(stop.snapped_lon)
                );
                
                if (distanceToStop <= maxRadiusKm) {
                    filteredStops.push(stop);
                } else {
                    console.warn(`⚠️ Stop ${stop.cluster_number} too far from college (${distanceToStop.toFixed(1)}km) - Excluding`);
                    excludedStops.push(stop);
                }
            } catch (error) {
                console.error('Error processing stop in filterStopsByDistance:', error);
            }
        });
        
        console.log(`📊 Pre-filtering: ${filteredStops.length}/${stopsData.length} stops within ${maxRadiusKm}km radius`);
        window.excludedStops = excludedStops;
        return filteredStops;
    } catch (error) {
        console.error('Error in filterStopsByDistance:', error);
        return [];
    }
}

// For backward compatibility
function optimizeWithDirectionalClusters() {
    console.log('⚠️ optimizeWithDirectionalClusters is deprecated - switching to optimizeWithDirectRoutes');
    return optimizeWithDirectRoutes();
}

// For backward compatibility
function optimizeWithMicroClusters() {
    console.log('⚠️ optimizeWithMicroClusters is deprecated - switching to optimizeWithDirectRoutes');
    return optimizeWithDirectRoutes();
}

// For backward compatibility
function optimizeWithHubAndSpoke() {
    console.log('⚠️ optimizeWithHubAndSpoke is deprecated - switching to optimizeWithDirectRoutes');
    return optimizeWithDirectRoutes();
}