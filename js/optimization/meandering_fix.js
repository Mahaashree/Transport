// =======================================
// ANTI-MEANDERING OPTIMIZATION FIX
// =======================================

// Fix for the spread operator error in createDirectionalRoutesInCorridor
const originalCreateDirectionalRoutesInCorridor = createDirectionalRoutesInCorridor;

createDirectionalRoutesInCorridor = function(stops, maxCapacity, corridor, corridorIndex) {
    // Check if stops is iterable before using spread
    if (!stops || !Array.isArray(stops)) {
        console.warn(`⚠️ Invalid stops data for corridor ${corridorIndex}, using fallback`);
        return []; // Return empty array as fallback
    }
    
    try {
        // Sort stops by distance for optimal flow (safely)
        const sortedStops = Array.isArray(stops) ? [...stops].sort((a, b) => a.distance - b.distance) : [];
        
        // Calculate directional efficiency score for this corridor
        const directionalScore = calculateDirectionalEfficiency(sortedStops);
        console.log(`📊 Corridor ${corridorIndex + 1} directional efficiency: ${directionalScore.toFixed(2)}`);
        
        // If corridor has poor directional flow, try to fix it
        if (directionalScore < 0.7) {
            console.log(`🔧 Optimizing corridor ${corridorIndex + 1} for better flow...`);
            return createOptimizedDirectionalRoutes(sortedStops, maxCapacity, corridor);
        }
        
        // Create routes normally but with directional validation
        return createValidatedDirectionalRoutes(sortedStops, maxCapacity, corridor);
    } catch (error) {
        console.error(`Error in directional routes for corridor ${corridorIndex}:`, error);
        return []; // Return empty array on error
    }
};

// Add missing function if needed
if (typeof calculateMeanderingScore !== 'function') {
    calculateMeanderingScore = function(stops) {
        if (!stops || !Array.isArray(stops) || stops.length < 3) return 0;
        
        let totalAngularChange = 0;
        let directionalFlips = 0;
        let previousDirection = null;
        
        // Analyze each triplet of stops
        for (let i = 0; i < stops.length - 2; i++) {
            const current = stops[i];
            const next = stops[i + 1];
            const afterNext = stops[i + 2];
            
            if (!current || !next || !afterNext) continue;
            
            // Get coordinates safely
            const currentLat = parseFloat(current.lat || current.snapped_lat || 0);
            const currentLng = parseFloat(current.lng || current.snapped_lon || 0);
            const nextLat = parseFloat(next.lat || next.snapped_lat || 0);
            const nextLng = parseFloat(next.lng || next.snapped_lon || 0);
            const afterNextLat = parseFloat(afterNext.lat || afterNext.snapped_lat || 0);
            const afterNextLng = parseFloat(afterNext.lng || afterNext.snapped_lon || 0);
            
            // Skip invalid coordinates
            if (!currentLat || !currentLng || !nextLat || !nextLng || !afterNextLat || !afterNextLng) continue;
            
            // Calculate bearings between consecutive stops
            const bearing1 = calculateBearing(currentLat, currentLng, nextLat, nextLng);
            const bearing2 = calculateBearing(nextLat, nextLng, afterNextLat, afterNextLng);
            
            // Calculate angular change (how much the route turns)
            let angularChange = Math.abs(bearing2 - bearing1);
            if (angularChange > 180) angularChange = 360 - angularChange;
            
            totalAngularChange += angularChange;
            
            // Check if we're moving toward or away from college
            const distanceCurrentToCollege = current.distance || 
                calculateHaversineDistance(currentLat, currentLng, COLLEGE_COORDS[0], COLLEGE_COORDS[1]);
            
            const distanceNextToCollege = next.distance || 
                calculateHaversineDistance(nextLat, nextLng, COLLEGE_COORDS[0], COLLEGE_COORDS[1]);
            
            const currentDirection = distanceNextToCollege > distanceCurrentToCollege ? 'away' : 'toward';
            
            // Count direction changes (toward/away from college)
            if (previousDirection !== null && currentDirection !== previousDirection) {
                directionalFlips++;
            }
            
            previousDirection = currentDirection;
        }
        
        // Calculate normalization factors
        const segmentCount = Math.max(1, stops.length - 2);
        const avgAngularChange = totalAngularChange / segmentCount;
        const normalizedFlips = directionalFlips / segmentCount;
        
        // Combined meandering score (0-1, lower is better)
        return Math.min(1, (avgAngularChange / 180) * 0.6 + normalizedFlips * 0.4);
    };
}

// Create a safer version of optimizeForDirectionalFlow
const originalOptimizeForDirectionalFlow = optimizeForDirectionalFlow;

optimizeForDirectionalFlow = function(stops) {
    if (!stops || !Array.isArray(stops) || stops.length === 0) {
        return []; // Return empty array for invalid inputs
    }
    
    try {
        return originalOptimizeForDirectionalFlow(stops);
    } catch (error) {
        console.error("Error in optimizeForDirectionalFlow:", error);
        
        // Fallback to simple distance-based sorting
        return [...stops].sort((a, b) => {
            const distA = a.distance || calculateHaversineDistance(
                COLLEGE_COORDS[0], COLLEGE_COORDS[1],
                parseFloat(a.lat || a.snapped_lat), parseFloat(a.lng || a.snapped_lon)
            );
            const distB = b.distance || calculateHaversineDistance(
                COLLEGE_COORDS[0], COLLEGE_COORDS[1],
                parseFloat(b.lat || b.snapped_lat), parseFloat(b.lng || b.snapped_lon)
            );
            return distA - distB;
        });
    }
};

// Apply safer versions of other key functions
const originalCreateOptimizedDirectionalRoutes = createOptimizedDirectionalRoutes;

createOptimizedDirectionalRoutes = function(stops, maxCapacity, corridor) {
    if (!stops || !Array.isArray(stops) || stops.length === 0) {
        return []; // Return empty array for invalid inputs
    }
    
    try {
        return originalCreateOptimizedDirectionalRoutes(stops, maxCapacity, corridor);
    } catch (error) {
        console.error("Error in createOptimizedDirectionalRoutes:", error);
        
        // Fallback to simple capacity-based splitting with distance sorting
        const sortedStops = [...stops].sort((a, b) => {
            const distA = a.distance || calculateHaversineDistance(
                COLLEGE_COORDS[0], COLLEGE_COORDS[1],
                parseFloat(a.lat || a.snapped_lat), parseFloat(a.lng || a.snapped_lon)
            );
            const distB = b.distance || calculateHaversineDistance(
                COLLEGE_COORDS[0], COLLEGE_COORDS[1],
                parseFloat(b.lat || b.snapped_lat), parseFloat(b.lng || b.snapped_lon)
            );
            return distA - distB;
        });
        
        // Simple route with basic properties
        return [{
            busId: `Bus ${corridor ? corridor.id : 'fallback'}-1`,
            stops: sortedStops,
            totalStudents: sortedStops.reduce((sum, stop) => sum + parseInt(stop.num_students || 0), 0),
            routeType: 'fallback'
        }];
    }
};

// =======================================
// ANTI-MEANDERING ROUTE OPTIMIZER
// =======================================

/**
 * Helper function to optimize a route's stop order to reduce meandering
 * This can be applied to existing routes
 */
function optimizeRouteStopOrder(route) {
    if (!route || !route.stops || !Array.isArray(route.stops) || route.stops.length <= 3) {
        return route; // Not enough stops to optimize
    }
    
    // Calculate current meandering score
    const currentScore = calculateMeanderingScore(route.stops);
    
    // Only optimize if meandering is high
    if (currentScore < 0.4) {
        return route; // Route is already good
    }
    
    console.log(`⚠️ Route ${route.busId} has high meandering (${currentScore.toFixed(2)}), optimizing...`);
    
    // Copy route to avoid modifying original
    const optimizedRoute = { ...route };
    
    // Start with the stop closest to college
    const stops = [...route.stops];
    stops.sort((a, b) => {
        const distA = a.distance || calculateHaversineDistance(
            COLLEGE_COORDS[0], COLLEGE_COORDS[1],
            parseFloat(a.lat || a.snapped_lat), parseFloat(a.lng || a.snapped_lon)
        );
        const distB = b.distance || calculateHaversineDistance(
            COLLEGE_COORDS[0], COLLEGE_COORDS[1],
            parseFloat(b.lat || b.snapped_lat), parseFloat(b.lng || b.snapped_lon)
        );
        return distA - distB;
    });
    
    // Start with closest stop to college
    const result = [stops[0]];
    const remaining = stops.slice(1);
    
    // Build route by selecting the next best stop each time
    while (remaining.length > 0) {
        const current = result[result.length - 1];
        let bestStop = null;
        let bestScore = Infinity;
        
        // Find stop that causes least meandering when added
        for (const candidate of remaining) {
            // Create temp route with this candidate added
            const tempRoute = [...result, candidate];
            const tempScore = calculateMeanderingScore(tempRoute);
            
            // Also factor in distance to current stop
            const distance = calculateHaversineDistance(
                parseFloat(current.lat || current.snapped_lat), parseFloat(current.lng || current.snapped_lon),
                parseFloat(candidate.lat || candidate.snapped_lat), parseFloat(candidate.lng || candidate.snapped_lon)
            );
            
            // Combined score (lower is better)
            const combinedScore = tempScore * 0.7 + (distance / 10) * 0.3;
            
            if (combinedScore < bestScore) {
                bestScore = combinedScore;
                bestStop = candidate;
            }
        }
        
        // Add best stop to result
        if (bestStop) {
            result.push(bestStop);
            
            // Remove from remaining
            const index = remaining.findIndex(s => 
                s.cluster_number === bestStop.cluster_number || 
                (s.lat === bestStop.lat && s.lng === bestStop.lng)
            );
            
            if (index >= 0) {
                remaining.splice(index, 1);
            }
        } else {
            // Fallback - just take the first remaining stop
            result.push(remaining[0]);
            remaining.shift();
        }
    }
    
    // Update route with optimized stops
    optimizedRoute.stops = result;
    
    // Calculate new meandering score
    const newScore = calculateMeanderingScore(result);
    console.log(`✅ Optimized ${route.busId}: meandering reduced from ${currentScore.toFixed(2)} to ${newScore.toFixed(2)}`);
    
    // Add optimization info
    optimizedRoute.meanderingBefore = currentScore;
    optimizedRoute.meanderingAfter = newScore;
    optimizedRoute.optimizationType = 'anti-meandering';
    
    return optimizedRoute;
}

// Override the main getBusOptimizedRoutes function to apply anti-meandering at the final stage
const originalGetBusOptimizedRoutes = getBusOptimizedRoutes;

getBusOptimizedRoutes = async function() {
    try {
        // Get routes using the original function
        const routes = await originalGetBusOptimizedRoutes();
        
        if (!routes || !Array.isArray(routes)) {
            return routes; // Return as-is if not an array
        }
        
        console.log(`🔍 Applying anti-meandering optimization to ${routes.length} routes...`);
        
        // Apply anti-meandering optimization to each route
        const optimizedRoutes = routes.map(route => optimizeRouteStopOrder(route));
        
        return optimizedRoutes;
    } catch (error) {
        console.error("Error in enhanced getBusOptimizedRoutes:", error);
        // Fall back to original function
        return await originalGetBusOptimizedRoutes();
    }
};

console.log('🧭 Anti-meandering fixes applied successfully');