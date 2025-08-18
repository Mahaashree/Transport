const fs = require('fs');
const path = require('path');

// Function to extract route coordinates from inner.txt
function extractRoutesFromInnerTxt() {
    try {
        // Read the inner.txt file
        const innerTxtPath = path.join(__dirname, '../../Routes_Data/Existing-Routes/outer.txt');
        const content = fs.readFileSync(innerTxtPath, 'utf8');
        
        console.log('🔍 Starting comprehensive route extraction...');
        
        const routes = {};
        let totalRoutesFound = 0;
        
        // Method 1: Find all const declarations that look like route arrays
        const constPattern = /const\s+(\w+)\s*=\s*\[/g;
        const routeNames = [];
        let match;
        
        while ((match = constPattern.exec(content)) !== null) {
            routeNames.push(match[1]);
        }
        
        console.log(`📊 Found ${routeNames.length} potential route declarations`);
        
        // Method 2: Extract each route individually
        routeNames.forEach(routeName => {
            if (routes[routeName]) return; // Skip if already processed
            
            const routeData = extractSingleRoute(content, routeName);
            if (routeData && routeData.coordinates.length > 0) {
                routes[routeName] = routeData;
                totalRoutesFound++;
            }
        });
        
        // Method 3: Look for inline routes (like ennoreRoute1)
        const inlineRoutes = extractInlineRoutes(content);
        Object.assign(routes, inlineRoutes);
        totalRoutesFound += Object.keys(inlineRoutes).length;
        
        // Method 4: Look for any remaining coordinate arrays
        const remainingRoutes = extractRemainingRoutes(content, routes);
        Object.assign(routes, remainingRoutes);
        totalRoutesFound += Object.keys(remainingRoutes).length;
        
        // Create the output JSON
        const outputData = {
            extractedAt: new Date().toISOString(),
            totalRoutes: Object.keys(routes).length,
            totalRoutesFound: totalRoutesFound,
            extractionMethods: {
                method1: routeNames.length,
                method2: Object.keys(routes).length - Object.keys(inlineRoutes).length - Object.keys(remainingRoutes).length,
                method3: Object.keys(inlineRoutes).length,
                method4: Object.keys(remainingRoutes).length
            },
            routes: routes
        };
        
        // Write to routes.json
        const outputPath = path.join(__dirname, '../../Routes_Data/Existing-Routes/routes.json');
        fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');
        
        console.log(`✅ Successfully extracted ${Object.keys(routes).length} routes`);
        console.log(`📁 Saved to: ${outputPath}`);
        
        // Display summary
        console.log('\n📊 Route Summary:');
        Object.keys(routes).forEach(routeName => {
            const route = routes[routeName];
            console.log(`  ${routeName}: ${route.pointCount} points`);
        });
        
        return routes;
        
    } catch (error) {
        console.error('❌ Error extracting routes:', error.message);
        return null;
    }
}

// Function to extract a single route by name
function extractSingleRoute(content, routeName) {
    try {
        // Multiple patterns to find the route
        const patterns = [
            // Pattern 1: const routeName = [...];
            new RegExp(`const\\s+${routeName}\\s*=\\s*\\[([\\s\\S]*?)\\];`, 'g'),
            // Pattern 2: const routeName =[...];
            new RegExp(`const\\s+${routeName}\\s*=\\s*\\[([\\s\\S]*?)\\];`, 'g'),
            // Pattern 3: const  routeName = [...];
            new RegExp(`const\\s{2,}${routeName}\\s*=\\s*\\[([\\s\\S]*?)\\];`, 'g')
        ];
        
        for (let pattern of patterns) {
            const match = pattern.exec(content);
            if (match) {
                const coordinatesText = match[1];
                const coordinates = extractCoordinatesFromText(coordinatesText);
                
                if (coordinates.length > 0) {
                    return {
                        name: routeName,
                        coordinates: coordinates,
                        pointCount: coordinates.length,
                        extractionMethod: 'single_route'
                    };
                }
            }
        }
        
        return null;
    } catch (error) {
        console.warn(`⚠️ Error extracting route ${routeName}:`, error.message);
        return null;
    }
}

// Function to extract inline routes (routes on the same line as other code)
function extractInlineRoutes(content) {
    const inlineRoutes = {};
    
    // Look for patterns like: const routeName = [{lat:...,lng:...},...];
    const inlinePattern = /const\s+(\w+)\s*=\s*\[([^;]+)\];/g;
    let match;
    
    while ((match = inlinePattern.exec(content)) !== null) {
        const routeName = match[1];
        const coordinatesText = match[2];
        
        // Skip if this looks like a simple array (not coordinates)
        if (!coordinatesText.includes('lat:') || !coordinatesText.includes('lng:')) {
            continue;
        }
        
        const coordinates = extractCoordinatesFromText(coordinatesText);
        if (coordinates.length > 0) {
            inlineRoutes[routeName] = {
                name: routeName,
                coordinates: coordinates,
                pointCount: coordinates.length,
                extractionMethod: 'inline_route'
            };
        }
    }
    
    console.log(`📝 Found ${Object.keys(inlineRoutes).length} inline routes`);
    return inlineRoutes;
}

// Function to extract any remaining coordinate arrays
function extractRemainingRoutes(content, existingRoutes) {
    const remainingRoutes = {};
    
    // Look for any array that contains coordinate-like data
    const arrayPattern = /\[([^\[\]]*{lat:[\d.-]+[^\[\]]*lng:[\d.-]+[^\[\]]*}[^\[\]]*)\]/g;
    let match;
    let routeCounter = 0;
    
    while ((match = arrayPattern.exec(content)) !== null) {
        const coordinatesText = match[1];
        const coordinates = extractCoordinatesFromText(coordinatesText);
        
        if (coordinates.length > 0) {
            // Check if this array is already captured by existing routes
            const isAlreadyCaptured = Object.values(existingRoutes).some(route => 
                route.coordinates.length === coordinates.length &&
                route.coordinates.every((coord, index) => 
                    coord.lat === coordinates[index].lat && 
                    coord.lng === coordinates[index].lng
                )
            );
            
            if (!isAlreadyCaptured) {
                const routeName = `unknown_route_${++routeCounter}`;
                remainingRoutes[routeName] = {
                    name: routeName,
                    coordinates: coordinates,
                    pointCount: coordinates.length,
                    extractionMethod: 'remaining_arrays',
                    originalText: coordinatesText.substring(0, 100) + '...'
                };
            }
        }
    }
    
    console.log(`🔍 Found ${Object.keys(remainingRoutes).length} remaining coordinate arrays`);
    return remainingRoutes;
}

// Function to extract coordinates from text using multiple patterns
function extractCoordinatesFromText(text) {
    const coordinates = [];
    
    // Multiple coordinate patterns to handle different formats
    const coordPatterns = [
        // Pattern 1: {lat:13.123456,lng:80.123456}
        /{lat:([\d.-]+),lng:([\d.-]+)}/g,
        // Pattern 2: {lat: 13.123456, lng: 80.123456} (with spaces)
        /{lat:\s*([\d.-]+),\s*lng:\s*([\d.-]+)}/g,
        // Pattern 3: { lat:13.123456, lng:80.123456 } (with spaces around braces)
        /{\s*lat:([\d.-]+),\s*lng:([\d.-]+)\s*}/g,
        // Pattern 4: { lat: 13.123456, lng: 80.123456 } (all spaces)
        /{\s*lat:\s*([\d.-]+),\s*lng:\s*([\d.-]+)\s*}/g,
        // Pattern 5: {lat:13.123456, lng:80.123456} (no spaces, different order)
        /{lng:([\d.-]+),lat:([\d.-]+)}/g,
        // Pattern 6: {lng: 13.123456, lat: 80.123456} (with spaces, different order)
        /{lng:\s*([\d.-]+),\s*lat:\s*([\d.-]+)}/g
    ];
    
    coordPatterns.forEach(pattern => {
        let coordMatch;
        pattern.lastIndex = 0; // Reset regex state
        
        while ((coordMatch = pattern.exec(text)) !== null) {
            let lat, lng;
            
            // Handle different coordinate orders
            if (pattern.source.includes('lat:') && pattern.source.includes('lng:')) {
                if (pattern.source.indexOf('lat:') < pattern.source.indexOf('lng:')) {
                    lat = parseFloat(coordMatch[1]);
                    lng = parseFloat(coordMatch[2]);
                } else {
                    lng = parseFloat(coordMatch[1]);
                    lat = parseFloat(coordMatch[2]);
                }
            } else {
                lat = parseFloat(coordMatch[1]);
                lng = parseFloat(coordMatch[2]);
            }
            
            // Check if coordinates are valid numbers
            if (!isNaN(lat) && !isNaN(lng)) {
                // Check if this coordinate is already added (avoid duplicates)
                const isDuplicate = coordinates.some(coord => 
                    Math.abs(coord.lat - lat) < 0.000001 && Math.abs(coord.lng - lng) < 0.000001
                );
                
                if (!isDuplicate) {
                    coordinates.push({ lat, lng });
                }
            }
        }
    });
    
    return coordinates;
}

// Function to validate extracted coordinates
function validateCoordinates(routes) {
    console.log('\n🔍 Validating coordinates...');
    
    let validRoutes = 0;
    let totalPoints = 0;
    let invalidRoutes = [];
    
    Object.keys(routes).forEach(routeName => {
        const route = routes[routeName];
        let isValid = true;
        
        route.coordinates.forEach((coord, index) => {
            if (isNaN(coord.lat) || isNaN(coord.lng)) {
                console.warn(`⚠️ Invalid coordinate in ${routeName} at index ${index}:`, coord);
                isValid = false;
            }
            
            // Check if coordinates are within reasonable bounds for Chennai area
            if (coord.lat < 12 || coord.lat > 14 || coord.lng < 79 || coord.lng > 81) {
                console.warn(`⚠️ Coordinate out of Chennai bounds in ${routeName} at index ${index}:`, coord);
            }
        });
        
        if (isValid) {
            validRoutes++;
            totalPoints += route.coordinates.length;
        } else {
            invalidRoutes.push(routeName);
        }
    });
    
    console.log(`✅ Valid routes: ${validRoutes}/${Object.keys(routes).length}`);
    console.log(`📍 Total valid points: ${totalPoints}`);
    
    if (invalidRoutes.length > 0) {
        console.log(`❌ Invalid routes: ${invalidRoutes.join(', ')}`);
    }
    
    return validRoutes === Object.keys(routes).length;
}

// Function to analyze the file and show what patterns exist
function analyzeFilePatterns() {
    try {
        const innerTxtPath = path.join(__dirname, '../../Routes_Data/Existing-Routes/inner.txt');
        const content = fs.readFileSync(innerTxtPath, 'utf8');
        
        console.log('🔍 Analyzing file patterns...');
        
        // Find all const declarations
        const constPattern = /const\s+(\w+)\s*=\s*\[/g;
        const routes = [];
        let match;
        
        while ((match = constPattern.exec(content)) !== null) {
            routes.push(match[1]);
        }
        
        console.log(`📊 Found ${routes.length} route declarations:`);
        routes.forEach((route, index) => {
            console.log(`  ${index + 1}. ${route}`);
        });
        
        // Count coordinate patterns
        const coordPattern = /{lat:[\d.-]+[^}]*lng:[\d.-]+[^}]*}/g;
        const coordMatches = content.match(coordPattern) || [];
        console.log(`📍 Found ${coordMatches.length} coordinate patterns`);
        
        return routes;
        
    } catch (error) {
        console.error('❌ Error analyzing file:', error.message);
        return [];
    }
}

// Main execution
if (require.main === module) {
    console.log('🚀 Starting comprehensive route extraction from inner.txt...\n');
    
    // First analyze the file to see what patterns exist
    analyzeFilePatterns();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Extract routes
    const routes = extractRoutesFromInnerTxt();
    
    if (routes) {
        // Validate coordinates
        validateCoordinates(routes);
        
        console.log('\n🎉 Route extraction completed successfully!');
    } else {
        console.log('\n❌ Route extraction failed!');
    }
}

// Export functions for use in other modules
module.exports = {
    extractRoutesFromInnerTxt,
    validateCoordinates,
    analyzeFilePatterns
};
