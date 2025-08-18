// STREAMLINED BUS ROUTE OPTIMIZATION ALGORITHM
// Consolidated approach prioritizing straight-line, efficient routes

// ===== CONSTANTS AND CONFIGURATION =====
const HARD_CONSTRAINTS = {
    MAX_BUS_CAPACITY: 55,
    MAX_ROUTE_DISTANCE_KM: 50,
    MAX_RADIUS_FROM_COLLEGE_KM: 40,
    MIN_EFFICIENCY_THRESHOLD: 70, // 70% capacity utilization
    MAX_BEARING_SPREAD_DEGREES: 45, // Tight directional control
    MAX_BACKTRACK_RATIO: 0.2, // Max 20% backtracking allowed
    PREFERRED_STOPS_PER_ROUTE: 8 // Optimal number of stops per route
};

// ===== MAIN OPTIMIZATION FUNCTIONS =====

/**
 * Main optimization function - consolidated approach
 */
async function optimizeWithGoogleAPI() {
    try {
        console.log('🎯 Starting streamlined bus route optimization...');
        
        const finalRoutes = await getBusOptimizedRoutes();
        
        if (!finalRoutes || finalRoutes.length === 0) {
            throw new Error('No valid routes generated');
        }

        console.log(`✅ Generated ${finalRoutes.length} optimized routes`);
        return finalRoutes;
        
    } catch (error) {
        console.error('Route Optimization Error:', error);
        showStatus(`⚠️ Route Optimization failed: ${error.message}`, 'warning');
        return await simulateOptimization();
    }
}

/**
 * Streamlined route optimization with integrated approach
 */
async function getBusOptimizedRoutes() {
    try {
        // Step 1: Pre-filter stops by distance constraint
        const filteredStops = filterStopsByDistance(stopsData, HARD_CONSTRAINTS.MAX_RADIUS_FROM_COLLEGE_KM);
        const maxCapacity = parseInt(document.getElementById('maxCapacity').value) || HARD_CONSTRAINTS.MAX_BUS_CAPACITY;
        
        console.log(`🚌 Optimizing routes for ${filteredStops.length} stops within ${HARD_CONSTRAINTS.MAX_RADIUS_FROM_COLLEGE_KM}km`);

        // Step 2: Create directional sectors with enhanced data
        const enhancedStops = enhanceStopsWithMetrics(filteredStops);
        
        // Step 3: Create primary routes using integrated clustering
        const primaryRoutes = await createIntegratedOptimalRoutes(enhancedStops, maxCapacity);
        
        // Step 4: Validate and filter routes
        const validRoutes = primaryRoutes.filter(route => validateIntegratedRoute(route));
        
        // Step 5: Analyze coverage and create salvage routes if needed
        const { finalRoutes } = await ensureOptimalCoverage(validRoutes, enhancedStops, maxCapacity);
        
        // Step 6: Apply final optimizations
        const optimizedRoutes = applyFinalOptimizations(finalRoutes, maxCapacity);
        
        console.log(`🎯 Final solution: ${optimizedRoutes.length} streamlined routes`);
        return optimizedRoutes;
        
    } catch (error) {
        console.error('Enhanced route optimization failed:', error);
        return await simulateOptimization();
    }
}

// ===== INTEGRATED CLUSTERING APPROACH =====

/**
 * Enhanced stops with all necessary metrics for optimization
 */
function enhanceStopsWithMetrics(stops) {
    return stops.map(stop => {
        const lat = parseFloat(stop.snapped_lat);
        const lng = parseFloat(stop.snapped_lon);
        const bearing = calculateBearing(COLLEGE_COORDS[0], COLLEGE_COORDS[1], lat, lng);
        const distance = calculateHaversineDistance(COLLEGE_COORDS[0], COLLEGE_COORDS[1], lat, lng);
        
        return {
            ...stop,
            lat,
            lng,
            bearing,
            distance,
            students: parseInt(stop.num_students),
            // Sector classification (16 sectors of 22.5° each)
            sector: Math.floor((bearing + 11.25) / 22.5) % 16,
            // Distance band (near: 0-15km, medium: 15-25km, far: 25-40km)
            distanceBand: distance <= 15 ? 'near' : distance <= 25 ? 'medium' : 'far',
            // Efficiency score for stop selection
            efficiencyScore: parseInt(stop.num_students) / Math.max(1, distance)
        };
    });
}

/**
 * Integrated optimal route creation combining all strategies
 */
async function createIntegratedOptimalRoutes(stops, maxCapacity) {
    const routes = [];
    
    // Group stops by sectors for directional consistency
    const sectorGroups = groupStopsBySector(stops);
    
    // Process each sector to create straight-line routes
    for (const [sectorId, sectorStops] of Object.entries(sectorGroups)) {
        if (sectorStops.length === 0) continue;
        
        console.log(`📍 Processing Sector ${sectorId}: ${sectorStops.length} stops`);
        
        // Create distance-based routes within sector
        const sectorRoutes = createDistanceBasedRoutes(sectorStops, maxCapacity, sectorId);
        routes.push(...sectorRoutes);
    }
    
    // Sort routes by efficiency and directional quality
    routes.sort((a, b) => {
        const scoreA = calculateRouteQualityScore(a);
        const scoreB = calculateRouteQualityScore(b);
        return scoreB - scoreA;
    });
    
    return routes;
}

/**
 * Group stops by directional sectors (16 sectors of 22.5°)
 */
function groupStopsBySector(stops) {
    const sectors = {};
    
    // Initialize all 16 sectors
    for (let i = 0; i < 16; i++) {
        sectors[i] = [];
    }
    
    // Assign stops to sectors
    stops.forEach(stop => {
        sectors[stop.sector].push(stop);
    });
    
    // Sort stops within each sector by distance (for radial routing)
    Object.keys(sectors).forEach(sectorId => {
        sectors[sectorId].sort((a, b) => a.distance - b.distance);
    });
    
    return sectors;
}

/**
 * Create distance-based routes within a sector
 */
function createDistanceBasedRoutes(sectorStops, maxCapacity, sectorId) {
    const routes = [];
    
    // Group by distance bands to prevent long routes
    const distanceBands = {
        near: sectorStops.filter(s => s.distanceBand === 'near'),
        medium: sectorStops.filter(s => s.distanceBand === 'medium'),
        far: sectorStops.filter(s => s.distanceBand === 'far')
    };
    
    // Process each distance band
    Object.entries(distanceBands).forEach(([band, bandStops]) => {
        if (bandStops.length === 0) return;
        
        // Create capacity-limited routes within each band
        const bandRoutes = createCapacityLimitedRoutes(bandStops, maxCapacity, `S${sectorId}-${band}`);
        routes.push(...bandRoutes);
    });
    
    return routes;
}

/**
 * Create routes limited by capacity within a group of stops
 */
function createCapacityLimitedRoutes(stops, maxCapacity, routePrefix) {
    const routes = [];
    
    // Sort by efficiency score (students per km) to prioritize high-value stops
    stops.sort((a, b) => b.efficiencyScore - a.efficiencyScore);
    
    let currentRoute = {
        stops: [],
        totalStudents: 0,
        routeId: `${routePrefix}-1`
    };
    
    stops.forEach(stop => {
        const wouldExceedCapacity = currentRoute.totalStudents + stop.students > maxCapacity;
        const wouldExceedStopLimit = currentRoute.stops.length >= HARD_CONSTRAINTS.PREFERRED_STOPS_PER_ROUTE;
        
        if ((wouldExceedCapacity || wouldExceedStopLimit) && currentRoute.stops.length > 0) {
            // Finalize current route
            const finalizedRoute = finalizeOptimalRoute(currentRoute, routes.length + 1);
            if (finalizedRoute) routes.push(finalizedRoute);
            
            // Start new route
            currentRoute = {
                stops: [stop],
                totalStudents: stop.students,
                routeId: `${routePrefix}-${routes.length + 2}`
            };
        } else {
            currentRoute.stops.push(stop);
            currentRoute.totalStudents += stop.students;
        }
    });
    
    // Add final route
    if (currentRoute.stops.length > 0) {
        const finalizedRoute = finalizeOptimalRoute(currentRoute, routes.length + 1);
        if (finalizedRoute) routes.push(finalizedRoute);
    }
    
    return routes;
}

/**
 * Finalize route with optimal stop ordering and metrics
 */
function finalizeOptimalRoute(route, routeIndex) {
    if (route.stops.length === 0) return null;
    
    // Ensure radial ordering (college → closest → farthest)
    route.stops.sort((a, b) => a.distance - b.distance);
    
    // Calculate route metrics
    const routeMetrics = calculateRouteMetrics(route.stops);
    
    // Validate route doesn't violate constraints
    if (!validateRouteConstraints(routeMetrics)) {
        console.warn(`⚠️ Route ${route.routeId} violates constraints - skipping`);
        return null;
    }
    
    // Calculate sector info for direction
    const avgBearing = route.stops.reduce((sum, s) => sum + s.bearing, 0) / route.stops.length;
    const sectorName = getSectorName(avgBearing);
    
    return {
        busId: `Bus ${routeIndex}`,
        depot: findOptimalDepot(route),
        stops: route.stops,
        totalStudents: route.totalStudents,
        efficiency: `${((route.totalStudents / HARD_CONSTRAINTS.MAX_BUS_CAPACITY) * 100).toFixed(1)}%`,
        totalDistance: `${Math.min(HARD_CONSTRAINTS.MAX_ROUTE_DISTANCE_KM, routeMetrics.totalDistance).toFixed(1)} km`,
        totalTime: `${Math.round(routeMetrics.estimatedTime)} min`,
        direction: `${sectorName} (${Math.round(avgBearing)}°)`,
        accessibility: { isValid: true, issues: [] },
        routeType: 'integrated-optimal',
        // Quality metrics
        straightnessScore: routeMetrics.straightnessScore,
        efficiencyScore: routeMetrics.efficiencyScore,
        backtrackRatio: routeMetrics.backtrackRatio,
        bearingSpread: routeMetrics.bearingSpread
    };
}

// ===== ROUTE METRICS AND VALIDATION =====

/**
 * Calculate comprehensive route metrics
 */
function calculateRouteMetrics(stops) {
    if (stops.length === 0) return { totalDistance: 0, straightnessScore: 0 };
    
    // Calculate total distance
    let totalDistance = 0;
    for (let i = 0; i < stops.length - 1; i++) {
        totalDistance += calculateHaversineDistance(
            stops[i].lat, stops[i].lng,
            stops[i + 1].lat, stops[i + 1].lng
        );
    }
    
    // Add distance from last stop to college
    if (stops.length > 0) {
        const lastStop = stops[stops.length - 1];
        totalDistance += calculateHaversineDistance(
            lastStop.lat, lastStop.lng,
            COLLEGE_COORDS[0], COLLEGE_COORDS[1]
        );
    }
    
    // Add routing overhead (30% for real roads)
    totalDistance *= 1.3;
    
    // Calculate straightness score
    const straightnessScore = calculateStraightnessScore(stops);
    
    // Calculate backtrack ratio
    const backtrackRatio = calculateBacktrackRatio(stops);
    
    // Calculate bearing spread
    const bearingSpread = calculateBearingSpread(stops);
    
    // Calculate efficiency score
    const totalStudents = stops.reduce((sum, s) => sum + s.students, 0);
    const efficiencyScore = totalStudents / Math.max(1, totalDistance);
    
    return {
        totalDistance,
        straightnessScore,
        backtrackRatio,
        bearingSpread,
        efficiencyScore,
        estimatedTime: totalDistance * 2 + stops.length * 2 // 2 min per km + 2 min per stop
    };
}

/**
 * Calculate how straight a route is (higher = straighter)
 */
function calculateStraightnessScore(stops) {
    if (stops.length < 3) return 1.0;
    
    let totalDeviation = 0;
    const maxDeviations = stops.length - 2;
    
    for (let i = 0; i < stops.length - 2; i++) {
        const bearing1 = calculateBearing(
            stops[i].lat, stops[i].lng,
            stops[i + 1].lat, stops[i + 1].lng
        );
        const bearing2 = calculateBearing(
            stops[i + 1].lat, stops[i + 1].lng,
            stops[i + 2].lat, stops[i + 2].lng
        );
        
        let deviation = Math.abs(bearing2 - bearing1);
        if (deviation > 180) deviation = 360 - deviation;
        
        totalDeviation += deviation / 180; // Normalize to 0-1
    }
    
    return Math.max(0, 1 - (totalDeviation / maxDeviations));
}

/**
 * Calculate backtrack ratio (lower = less backtracking)
 */
function calculateBacktrackRatio(stops) {
    if (stops.length < 2) return 0;
    
    let backtrackDistance = 0;
    let totalDistance = 0;
    
    for (let i = 0; i < stops.length - 1; i++) {
        const currentDistance = stops[i].distance;
        const nextDistance = stops[i + 1].distance;
        const segmentDistance = calculateHaversineDistance(
            stops[i].lat, stops[i].lng,
            stops[i + 1].lat, stops[i + 1].lng
        );
        
        totalDistance += segmentDistance;
        
        // If next stop is closer to college, we're backtracking
        if (nextDistance < currentDistance) {
            backtrackDistance += (currentDistance - nextDistance);
        }
    }
    
    return totalDistance > 0 ? backtrackDistance / totalDistance : 0;
}

/**
 * Calculate bearing spread of stops
 */
function calculateBearingSpread(stops) {
    if (stops.length < 2) return 0;
    
    const bearings = stops.map(s => s.bearing);
    const minBearing = Math.min(...bearings);
    const maxBearing = Math.max(...bearings);
    
    let spread = maxBearing - minBearing;
    if (spread > 180) spread = 360 - spread;
    
    return spread;
}

/**
 * Validate route against hard constraints
 */
function validateRouteConstraints(metrics) {
    return metrics.totalDistance <= HARD_CONSTRAINTS.MAX_ROUTE_DISTANCE_KM &&
           metrics.backtrackRatio <= HARD_CONSTRAINTS.MAX_BACKTRACK_RATIO &&
           metrics.bearingSpread <= HARD_CONSTRAINTS.MAX_BEARING_SPREAD_DEGREES;
}

/**
 * Comprehensive route validation
 */
function validateIntegratedRoute(route) {
    const distanceKm = getRouteDistance(route);
    
    // Hard constraint checks
    if (distanceKm > HARD_CONSTRAINTS.MAX_ROUTE_DISTANCE_KM) {
        console.warn(`❌ Route ${route.busId} exceeds distance limit: ${distanceKm.toFixed(1)}km`);
        return false;
    }
    
    if (route.backtrackRatio > HARD_CONSTRAINTS.MAX_BACKTRACK_RATIO) {
        console.warn(`❌ Route ${route.busId} has excessive backtracking: ${(route.backtrackRatio * 100).toFixed(1)}%`);
        return false;
    }
    
    if (route.bearingSpread > HARD_CONSTRAINTS.MAX_BEARING_SPREAD_DEGREES) {
        console.warn(`❌ Route ${route.busId} has excessive bearing spread: ${route.bearingSpread.toFixed(1)}°`);
        return false;
    }
    
    // Efficiency check
    const efficiencyPercent = parseFloat(route.efficiency.replace('%', ''));
    if (efficiencyPercent < HARD_CONSTRAINTS.MIN_EFFICIENCY_THRESHOLD) {
        console.warn(`❌ Route ${route.busId} below efficiency threshold: ${efficiencyPercent}%`);
        return false;
    }
    
    console.log(`✅ Route ${route.busId} validated: ${distanceKm.toFixed(1)}km, ${efficiencyPercent}% efficient`);
    return true;
}

/**
 * Calculate overall route quality score
 */
function calculateRouteQualityScore(route) {
    const efficiencyPercent = parseFloat(route.efficiency.replace('%', ''));
    const straightness = route.straightnessScore || 0.5;
    const backtrackPenalty = (route.backtrackRatio || 0) * 100;
    
    // Weighted score: efficiency (40%) + straightness (40%) - backtrack penalty (20%)
    return (efficiencyPercent * 0.4) + (straightness * 40) - (backtrackPenalty * 0.2);
}

// ===== COVERAGE OPTIMIZATION =====

/**
 * Ensure optimal coverage of all stops
 */
async function ensureOptimalCoverage(validRoutes, allStops, maxCapacity) {
    // Analyze current coverage
    const coverage = analyzeRouteCoverage(validRoutes, allStops);
    const totalStudents = allStops.reduce((sum, stop) => sum + stop.students, 0);
    const coveragePercent = (coverage.servedStudents / totalStudents * 100);
    
    console.log(`📊 Coverage Analysis: ${coveragePercent.toFixed(1)}% students served`);
    console.log(`📊 Unserved stops: ${coverage.unservedStops.length}, Duplicate coverage: ${coverage.duplicateStops}`);
    
    let finalRoutes = [...validRoutes];
    
    // If coverage is insufficient, create targeted routes for unserved stops
    if (coveragePercent < 85 && coverage.unservedStops.length > 0) {
        console.log(`🔧 Creating targeted routes for ${coverage.unservedStops.length} unserved stops...`);
        
        const salvageRoutes = createTargetedSalvageRoutes(coverage.unservedStops, maxCapacity);
        const validSalvageRoutes = salvageRoutes.filter(route => validateIntegratedRoute(route));
        
        console.log(`✅ Created ${validSalvageRoutes.length} additional targeted routes`);
        finalRoutes.push(...validSalvageRoutes);
    }
    
    // Remove duplicate coverage by selecting best routes for each stop
    finalRoutes = removeDuplicateCoverage(finalRoutes);
    
    return { finalRoutes };
}

/**
 * Create targeted routes specifically for unserved stops
 */
function createTargetedSalvageRoutes(unservedStops, maxCapacity) {
    // Group unserved stops by proximity
    const proximityGroups = groupStopsByProximity(unservedStops, 8); // 8km max distance
    
    const salvageRoutes = [];
    
    proximityGroups.forEach((group, index) => {
        // Sort by efficiency score
        group.sort((a, b) => b.efficiencyScore - a.efficiencyScore);
        
        // Create route from this group
        let currentRoute = {
            stops: [],
            totalStudents: 0
        };
        
        group.forEach(stop => {
            if (currentRoute.totalStudents + stop.students <= maxCapacity) {
                currentRoute.stops.push(stop);
                currentRoute.totalStudents += stop.students;
            } else if (currentRoute.stops.length > 0) {
                // Finalize current route and start new one
                const route = finalizeOptimalRoute(currentRoute, salvageRoutes.length + 1);
                if (route) {
                    route.routeType = 'targeted-salvage';
                    salvageRoutes.push(route);
                }
                
                currentRoute = {
                    stops: [stop],
                    totalStudents: stop.students
                };
            }
        });
        
        // Add final route
        if (currentRoute.stops.length > 0) {
            const route = finalizeOptimalRoute(currentRoute, salvageRoutes.length + 1);
            if (route) {
                route.routeType = 'targeted-salvage';
                salvageRoutes.push(route);
            }
        }
    });
    
    return salvageRoutes;
}

/**
 * Group stops by proximity for targeted routing
 */
function groupStopsByProximity(stops, maxDistanceKm) {
    const groups = [];
    const processed = new Set();
    
    stops.forEach(stop => {
        if (processed.has(stop.cluster_number)) return;
        
        const group = [stop];
        processed.add(stop.cluster_number);
        
        // Find other stops within max distance
        stops.forEach(other => {
            if (processed.has(other.cluster_number)) return;
            
            const distance = calculateHaversineDistance(
                stop.lat, stop.lng,
                other.lat, other.lng
            );
            
            if (distance <= maxDistanceKm) {
                group.push(other);
                processed.add(other.cluster_number);
            }
        });
        
        if (group.length > 0) {
            groups.push(group);
        }
    });
    
    return groups;
}

/**
 * Remove duplicate coverage by selecting best route for each stop
 */
function removeDuplicateCoverage(routes) {
    const stopToRouteMap = new Map();
    
    // Map each stop to the routes that serve it
    routes.forEach((route, routeIndex) => {
        route.stops.forEach(stop => {
            const stopId = stop.cluster_number;
            if (!stopToRouteMap.has(stopId)) {
                stopToRouteMap.set(stopId, []);
            }
            stopToRouteMap.get(stopId).push({ route, routeIndex });
        });
    });
    
    // For stops served by multiple routes, keep only the best route
    const routesToKeep = new Set();
    
    stopToRouteMap.forEach((routeData, stopId) => {
        if (routeData.length === 1) {
            // Stop served by only one route - keep it
            routesToKeep.add(routeData[0].routeIndex);
        } else {
            // Stop served by multiple routes - keep the best one
            routeData.sort((a, b) => calculateRouteQualityScore(b.route) - calculateRouteQualityScore(a.route));
            routesToKeep.add(routeData[0].routeIndex);
        }
    });
    
    return routes.filter((route, index) => routesToKeep.has(index));
}

// ===== FINAL OPTIMIZATIONS =====

/**
 * Apply final optimizations to routes
 */
function applyFinalOptimizations(routes, maxCapacity) {
    // Limit total number of routes based on student capacity needs
    const totalStudents = routes.reduce((sum, route) => sum + route.totalStudents, 0);
    const maxRoutesNeeded = Math.ceil(totalStudents / maxCapacity);
    
    // Sort by quality score and take the best routes
    routes.sort((a, b) => calculateRouteQualityScore(b) - calculateRouteQualityScore(a));
    
    const finalRoutes = routes.slice(0, maxRoutesNeeded);
    
    // Assign optimal depots to each route
    finalRoutes.forEach(route => {
        if (!route.depot || typeof route.depot === 'object') {
            const optimalDepot = findOptimalDepot(route);
            route.depot = optimalDepot['Parking Name'] || optimalDepot.name;
        }
    });
    
    // Add final quality metrics
    finalRoutes.forEach((route, index) => {
        route.qualityScore = calculateRouteQualityScore(route);
        console.log(`🏆 Final Route ${index + 1}: ${route.busId} - Quality Score: ${route.qualityScore.toFixed(1)}`);
    });
    
    return finalRoutes;
}

// ===== UTILITY FUNCTIONS =====

function filterStopsByDistance(stopsData, maxRadiusKm = 40) {
    const filteredStops = [];
    const excludedStops = [];
    
    stopsData.forEach(stop => {
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
    });
    
    console.log(`📊 Pre-filtering: ${filteredStops.length}/${stopsData.length} stops within ${maxRadiusKm}km radius`);
    window.excludedStops = excludedStops;
    return filteredStops;
}

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

function calculateBearing(lat1, lng1, lat2, lng2) {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    
    const bearingRad = Math.atan2(y, x);
    const bearingDeg = (bearingRad * 180 / Math.PI + 360) % 360;
    
    return bearingDeg;
}

function getSectorName(bearing) {
    const sectors = [
        'North', 'NNE', 'NE', 'ENE', 'East', 'ESE', 'SE', 'SSE',
        'South', 'SSW', 'SW', 'WSW', 'West', 'WNW', 'NW', 'NNW'
    ];
    return sectors[Math.floor((bearing + 11.25) / 22.5) % 16];
}

function findOptimalDepot(route) {
    if (!route.stops || route.stops.length === 0 || !depotsData) {
        return depotsData?.[0] || { 'Parking Name': 'Default Depot' };
    }
    
    // Calculate route centroid
    const centroidLat = route.stops.reduce((sum, stop) => sum + (stop.lat || parseFloat(stop.snapped_lat)), 0) / route.stops.length;
    const centroidLng = route.stops.reduce((sum, stop) => sum + (stop.lng || parseFloat(stop.snapped_lon)), 0) / route.stops.length;
    
    // Find closest depot to route centroid
    let bestDepot = depotsData[0];
    let minDistance = Infinity;
    
    depotsData.forEach(depot => {
        const distance = calculateHaversineDistance(
            centroidLat, centroidLng,
            parseFloat(depot.Latitude), parseFloat(depot.Longitude)
        );
        
        if (distance < minDistance) {
            minDistance = distance;
            bestDepot = depot;
        }
    });
    
    return bestDepot;
}

function getRouteDistance(route) {
    if (route.totalDistance) {
        const match = route.totalDistance.toString().match(/[~]?(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : 30;
    }
    return route.estimatedDistance || 30;
}

function analyzeRouteCoverage(routes, allStops) {
    const servedStopIds = new Set();
    const duplicateStops = new Set();
    let servedStudents = 0;
    
    // Track served stops
    routes.forEach(route => {
        route.stops.forEach(stop => {
            const stopId = stop.cluster_number || stop.id;
            if (servedStopIds.has(stopId)) {
                duplicateStops.add(stopId);
            } else {
                servedStopIds.add(stopId);
                servedStudents += parseInt(stop.num_students) || stop.students || 0;
            }
        });
    });
    
    // Find unserved stops
    const unservedStops = allStops.filter(stop => {
        const stopId = stop.cluster_number || stop.id;
        return !servedStopIds.has(stopId);
    });
    
    return {
        servingRoutes: routes,
        servedStops: Array.from(servedStopIds),
        unservedStops,
        duplicateStops: duplicateStops.size,
        servedStudents
    };
}

// ===== PROCESS OPTIMIZED ROUTES (Maintains existing interface) =====

/**
 * Process route optimization response - maintains existing function signature
 */
async function processRouteOptimizationResponse(apiResponse) {
    const routes = [];
    const MAX_DISTANCE_KM = HARD_CONSTRAINTS.MAX_ROUTE_DISTANCE_KM;
    
    if (apiResponse.routes) {
        for (let index = 0; index < apiResponse.routes.length; index++) {
            const route = apiResponse.routes[index];
            const routeStops = [];
            let totalStudents = 0;
            let routeDistanceKm = 0;
            
            // Calculate route distance
            if (route.metrics?.travelDistanceMeters) {
                routeDistanceKm = route.metrics.travelDistanceMeters / 1000;
            }
            
            // Skip routes that exceed distance limit
            if (routeDistanceKm > MAX_DISTANCE_KM) {
                console.warn(`⚠️ Route ${index + 1} exceeds ${MAX_DISTANCE_KM}km (${routeDistanceKm.toFixed(1)}km) - Filtering out`);
                continue;
            }
            
            // Build route stops
            if (route.visits) {
                route.visits.forEach(visit => {
                    if (visit.shipmentIndex !== undefined) {
                        const matchingStop = findStopByShipmentIndex(visit.shipmentIndex);
                        if (matchingStop) {
                            routeStops.push(matchingStop);
                            totalStudents += parseInt(matchingStop.num_students);
                        }
                    }
                });
            }
            
            // Only process routes with actual stops
            if (routeStops.length > 0) {
                const maxCapacity = parseInt(document.getElementById('maxCapacity').value);
                
                const routeData = {
                    busId: `Bus ${index + 1}`,
                    depot: depotsData[index % depotsData.length]['Parking Name'],
                    stops: routeStops,
                    totalStudents: totalStudents,
                    efficiency: `${((totalStudents / maxCapacity) * 100).toFixed(1)}%`,
                    totalDistance: `${routeDistanceKm.toFixed(1)} km`,
                    totalTime: route.vehicleStartTime && route.vehicleEndTime ? 
                              calculateTimeDifference(route.vehicleStartTime, route.vehicleEndTime) : 'N/A',
                    cost: route.metrics?.totalCost?.toFixed(2) || 'N/A',
                    withinDistanceLimit: true,
                    geometry: route.geometry || extractRouteGeometry(route)
                };
                
                // Enhanced validation using streamlined approach
                const validation = await validateRouteAccessibilityStreamlined(routeData);
                
                routeData.accessibility = {
                    isValid: validation.isValid,
                    issues: validation.issues,
                    validatedDistance: validation.validatedDistance,
                    roadValidation: validation.roadValidation || 'passed'
                };
                
                if (validation.isValid) {
                    routes.push(routeData);
                    console.log(`✅ ${routeData.busId} passed streamlined validation`);
                } else {
                    console.warn(`⚠️ ${routeData.busId} has concerns:`, validation.issues);
                    routeData.hasAccessibilityWarnings = true;
                    routeData.warningMessage = validation.issues.join(', ');
                    routes.push(routeData); // Still include with warnings
                }
            }
        }
    }

    // Provide feedback
    const validRoutes = routes.filter(r => r.accessibility?.isValid !== false);
    const problemRoutes = routes.filter(r => r.accessibility?.isValid === false);
    
    if (problemRoutes.length > 0) {
        showStatus(`⚠️ ${problemRoutes.length} routes have concerns. Check route details.`, 'warning');
    } else if (validRoutes.length > 0) {
        showStatus(`✅ Generated ${validRoutes.length} optimized routes`, 'success');
    }
    
    return routes;
}

/**
 * Streamlined route accessibility validation
 */
async function validateRouteAccessibilityStreamlined(route) {
    try {
        const stops = route.stops;
        if (stops.length === 0) return { isValid: true, issues: [] };
        
        const issues = [];
        let isValid = true;
        
        // Check route distance constraint
        const distanceKm = parseFloat(route.totalDistance.replace(' km', '').replace('~', ''));
        if (distanceKm > HARD_CONSTRAINTS.MAX_ROUTE_DISTANCE_KM) {
            issues.push(`Route exceeds ${HARD_CONSTRAINTS.MAX_ROUTE_DISTANCE_KM}km limit`);
            isValid = false;
        }
        
        // Check stop density (too many stops in small area indicates narrow roads)
        if (stops.length > HARD_CONSTRAINTS.PREFERRED_STOPS_PER_ROUTE * 1.5) {
            issues.push('High stop density - possible narrow road access');
        }
        
        // Check average distance between stops
        const avgDistanceBetweenStops = distanceKm / Math.max(1, stops.length - 1);
        if (avgDistanceBetweenStops < 1.5) {
            issues.push('Stops very close together - possible accessibility issues');
        }
        
        // Optional: Road width validation (if available)
        try {
            const roadValidation = await validateRoadWidthForBusRoute(route);
            if (!roadValidation.isValid) {
                issues.push(...roadValidation.issues);
                isValid = isValid && roadValidation.isValid;
            }
        } catch (error) {
            // Road validation is optional - don't fail the route if it errors
            console.warn('Road width validation skipped:', error.message);
        }
        
        return {
            isValid: isValid && issues.length <= 1, // Allow minor issues
            issues: issues,
            validatedDistance: distanceKm,
            roadValidation: isValid ? 'passed' : 'failed'
        };
        
    } catch (error) {
        console.error('Route validation failed:', error);
        return { 
            isValid: true, 
            issues: ['Validation skipped due to error'],
            validatedDistance: 0
        };
    }
}

// ===== ROAD WIDTH VALIDATION (Optional Enhancement) =====

/**
 * Validate road width for bus routes - enhanced version
 */
async function validateRoadWidthForBusRoute(route) {
    // Extract route geometry
    const routeGeometry = extractRouteGeometry(route);
    
    try {
        // Call road validation API if available
        const response = await fetch('https://road-data-api.example.com/validate-route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                routeGeometry: routeGeometry,
                vehicleType: 'bus',
                vehicleSpecs: {
                    width: 2.6,  // meters
                    height: 3.5, // meters
                    length: 12,  // meters
                    weight: 15000 // kg
                }
            })
        });
        
        if (!response.ok) throw new Error('Road validation API failed');
        
        const roadData = await response.json();
        
        // Check for road issues
        const issues = [];
        let isValid = true;
        
        roadData.segments?.forEach(segment => {
            if (segment.isTooNarrow) {
                issues.push(`Road too narrow (${segment.width}m) at ${segment.locationName}`);
                isValid = false;
            }
            
            if (segment.hasLowClearance) {
                issues.push(`Low clearance (${segment.clearance}m) at ${segment.locationName}`);
                isValid = false;
            }
            
            if (segment.hasTightTurn) {
                issues.push(`Turn radius too tight at ${segment.locationName}`);
                isValid = false;
            }
        });
        
        return {
            isValid: isValid,
            issues: issues,
            roadData: roadData
        };
    } catch (error) {
        console.warn('Road validation API unavailable:', error.message);
        // Fallback to basic heuristics
        return performBasicRoadValidation(route);
    }
}

/**
 * Basic road validation using route characteristics
 */
function performBasicRoadValidation(route) {
    const issues = [];
    let isValid = true;
    
    // Check for potential narrow roads based on stop characteristics
    if (route.stops.length > HARD_CONSTRAINTS.PREFERRED_STOPS_PER_ROUTE) {
        const avgStudentsPerStop = route.totalStudents / route.stops.length;
        if (avgStudentsPerStop < 5) {
            issues.push('Many small stops - possible narrow residential roads');
        }
    }
    
    // Check route straightness as indicator of road quality
    if (route.straightnessScore && route.straightnessScore < 0.7) {
        issues.push('Winding route - may indicate narrow or poor road conditions');
    }
    
    return {
        isValid: issues.length === 0,
        issues: issues,
        isEstimate: true
    };
}

/**
 * Extract route geometry for validation
 */
function extractRouteGeometry(route) {
    const geometry = [];
    
    // Add depot location
    const depot = depotsData.find(d => d['Parking Name'] === route.depot) || depotsData[0];
    if (depot) {
        geometry.push({
            lat: parseFloat(depot.Latitude),
            lng: parseFloat(depot.Longitude),
            type: 'depot'
        });
    }
    
    // Add stop locations in order
    route.stops.forEach(stop => {
        geometry.push({
            lat: parseFloat(stop.lat || stop.snapped_lat),
            lng: parseFloat(stop.lng || stop.snapped_lon),
            type: 'stop',
            stopId: stop.cluster_number
        });
    });
    
    // Add college location
    geometry.push({
        lat: COLLEGE_COORDS[0],
        lng: COLLEGE_COORDS[1],
        type: 'destination'
    });
    
    return geometry;
}

/**
 * Helper function to find stop by shipment index
 */
function findStopByShipmentIndex(shipmentIndex) {
    const filteredStops = filterStopsByDistance(stopsData, HARD_CONSTRAINTS.MAX_RADIUS_FROM_COLLEGE_KM);
    return filteredStops[shipmentIndex] || null;
}

/**
 * Calculate time difference between two timestamps
 */
function calculateTimeDifference(startTime, endTime) {
    try {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const diffMs = end - start;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${diffHours}h ${diffMins}m`;
    } catch (error) {
        return 'N/A';
    }
}

// ===== FALLBACK SIMULATION (Maintains existing interface) =====

/**
 * Simulation fallback when API fails - maintains existing interface
 */
async function simulateOptimization() {
    console.log('🔄 Falling back to streamlined simulation...');
    
    try {
        // Use the streamlined optimization approach as simulation
        const filteredStops = filterStopsByDistance(stopsData, HARD_CONSTRAINTS.MAX_RADIUS_FROM_COLLEGE_KM);
        const maxCapacity = parseInt(document.getElementById('maxCapacity').value) || HARD_CONSTRAINTS.MAX_BUS_CAPACITY;
        
        // Enhance stops
        const enhancedStops = enhanceStopsWithMetrics(filteredStops);
        
        // Create routes using integrated approach
        const routes = await createIntegratedOptimalRoutes(enhancedStops, maxCapacity);
        
        // Apply basic validation
        const validRoutes = routes.filter(route => validateIntegratedRoute(route));
        
        // Ensure coverage
        const { finalRoutes } = await ensureOptimalCoverage(validRoutes, enhancedStops, maxCapacity);
        
        // Apply final optimizations
        const optimizedRoutes = applyFinalOptimizations(finalRoutes, maxCapacity);
        
        console.log(`✅ Simulation completed: ${optimizedRoutes.length} routes generated`);
        return optimizedRoutes;
        
    } catch (error) {
        console.error('Simulation failed:', error);
        return []; // Return empty array as fallback
    }
}

// ===== DEBUGGING AND STATUS FUNCTIONS =====

/**
 * Show status message (maintains existing interface)
 */
function showStatus(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // If there's a status element in the UI, update it
    const statusElement = document.getElementById('optimizationStatus');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
    }
}

/**
 * Check server status for debugging
 */
function checkServerStatus() {
    fetch('http://localhost:3000/health')
        .then(response => {
            if (response.ok) {
                console.log('✅ Server is running');
            } else {
                console.warn('⚠️ Server responded but may have issues');
            }
        })
        .catch(error => {
            console.error('❌ Server is not running:', error);
            console.log('💡 Make sure your Node.js server is running on port 3000');
        });
}

// ===== INITIALIZATION =====

/**
 * Initialize the streamlined optimization system
 */
function initializeStreamlinedOptimization() {
    console.log('🚀 Streamlined Bus Route Optimization System Initialized');
    console.log('📋 Hard Constraints:');
    console.log(`   • Max Bus Capacity: ${HARD_CONSTRAINTS.MAX_BUS_CAPACITY} students`);
    console.log(`   • Max Route Distance: ${HARD_CONSTRAINTS.MAX_ROUTE_DISTANCE_KM}km`);
    console.log(`   • Max College Radius: ${HARD_CONSTRAINTS.MAX_RADIUS_FROM_COLLEGE_KM}km`);
    console.log(`   • Min Efficiency: ${HARD_CONSTRAINTS.MIN_EFFICIENCY_THRESHOLD}%`);
    console.log(`   • Max Bearing Spread: ${HARD_CONSTRAINTS.MAX_BEARING_SPREAD_DEGREES}°`);
    console.log(`   • Max Backtrack Ratio: ${HARD_CONSTRAINTS.MAX_BACKTRACK_RATIO * 100}%`);
    
    // Check if required globals are available
    if (typeof COLLEGE_COORDS === 'undefined') {
        console.warn('⚠️ COLLEGE_COORDS not defined - optimization may fail');
    }
    
    if (typeof depotsData === 'undefined') {
        console.warn('⚠️ depotsData not defined - depot assignment may fail');
    }
    
    if (typeof stopsData === 'undefined') {
        console.warn('⚠️ stopsData not defined - optimization will fail');
    }
    
    console.log('✅ System ready for route optimization');
}

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
    // Browser environment
    window.addEventListener('load', initializeStreamlinedOptimization);
} else if (typeof module !== 'undefined') {
    // Node.js environment
    module.exports = {
        optimizeWithGoogleAPI,
        getBusOptimizedRoutes,
        processRouteOptimizationResponse,
        simulateOptimization,
        HARD_CONSTRAINTS
    };
}

console.log('🎯 Streamlined Bus Route Optimization Algorithm Loaded');