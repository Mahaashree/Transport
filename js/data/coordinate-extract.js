const fs = require('fs');
const https = require('https');
const { createObjectCsvWriter } = require('csv-writer');

// Configuration
const GOOGLE_API_KEY = "AIzaSyAiVn2TbI7qSuTzw1EKvY4urq7V5aTZkZg"; // Replace with your actual API key
const GEOCODING_API_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const ROADS_API_URL = "https://roads.googleapis.com/v1/snapToRoads";

// Chennai region bounds
const CHENNAI_BOUNDS = {
    northeast: { lat: 13.3, lng: 80.5 },
    southwest: { lat: 12.7, lng: 79.8 }
};

class StopCoordinateExtractor {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.extractedCoordinates = [];
        this.failedStops = [];
    }

    async makeRequest(url) {
        return new Promise((resolve, reject) => {
            https.get(url, (response) => {
                let data = '';
                response.on('data', (chunk) => {
                    data += chunk;
                });
                response.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(error);
                    }
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
    }

    async geocodeStop(stopName, routeName = null) {
        const searchQueries = [
            `${stopName}, Chennai, Tamil Nadu, India`,
            `${stopName}, Chennai`,
            `${stopName} bus stop, Chennai`,
            `${stopName} Chennai Tamil Nadu`
        ];

        if (routeName) {
            searchQueries.unshift(`${stopName}, ${routeName}, Chennai`);
        }

        for (const query of searchQueries) {
            try {
                const encodedQuery = encodeURIComponent(query);
                const bounds = `${CHENNAI_BOUNDS.southwest.lat},${CHENNAI_BOUNDS.southwest.lng}|${CHENNAI_BOUNDS.northeast.lat},${CHENNAI_BOUNDS.northeast.lng}`;
                const url = `${GEOCODING_API_URL}?address=${encodedQuery}&key=${this.apiKey}&region=in&bounds=${bounds}`;

                const data = await this.makeRequest(url);

                if (data.status === 'OK' && data.results.length > 0) {
                    const result = data.results[0];
                    const location = result.geometry.location;

                    if (this.isWithinChennai(location.lat, location.lng)) {
                        console.log(`✅ Found: ${stopName} -> ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
                        return {
                            stopName: stopName,
                            routeName: routeName,
                            latitude: location.lat,
                            longitude: location.lng,
                            formattedAddress: result.formatted_address,
                            placeId: result.place_id || '',
                            searchQuery: query
                        };
                    }
                }

                // Rate limiting
                await this.sleep(100);

            } catch (error) {
                console.log(`❌ Error geocoding ${stopName} with query '${query}': ${error.message}`);
                continue;
            }
        }

        console.log(`⚠️  Failed to find coordinates for: ${stopName}`);
        return null;
    }

    isWithinChennai(lat, lng) {
        return (CHENNAI_BOUNDS.southwest.lat <= lat <= CHENNAI_BOUNDS.northeast.lat &&
                CHENNAI_BOUNDS.southwest.lng <= lng <= CHENNAI_BOUNDS.northeast.lng);
    }

    async snapToRoad(lat, lng) {
        try {
            const url = `${ROADS_API_URL}?path=${lat},${lng}&key=${this.apiKey}`;
            const data = await this.makeRequest(url);

            if (data.snappedPoints && data.snappedPoints.length > 0) {
                const snapped = data.snappedPoints[0].location;
                console.log(`🛣️  Snapped to road: ${lat.toFixed(6)},${lng.toFixed(6)} -> ${snapped.latitude.toFixed(6)},${snapped.longitude.toFixed(6)}`);
                return [snapped.latitude, snapped.longitude];
            }

        } catch (error) {
            console.log(`⚠️  Road snapping failed for ${lat},${lng}: ${error.message}`);
        }

        return [lat, lng];
    }

    async processRoutesFile(jsonFilePath) {
        console.log(`📂 Loading routes from: ${jsonFilePath}`);

        let data;
        try {
            const fileContent = fs.readFileSync(jsonFilePath, 'utf8');
            data = JSON.parse(fileContent);
        } catch (error) {
            console.log(`❌ Error loading JSON file: ${error.message}`);
            return [];
        }

        const routes = data.routes || [];
        console.log(`📊 Found ${routes.length} routes to process`);

        const allCoordinates = [];
        let totalStops = 0;
        let successfulStops = 0;

        for (let routeIdx = 0; routeIdx < routes.length; routeIdx++) {
            const route = routes[routeIdx];
            const routeName = route.routename || `Route_${routeIdx}`;
            const stops = route.stops || {};

            console.log(`\n🚌 Processing route: ${routeName} (${Object.keys(stops).length} stops)`);

            for (const [stopKey, stopName] of Object.entries(stops)) {
                totalStops++;
                console.log(`   📍 Processing stop ${stopKey}: ${stopName}`);

                const coordData = await this.geocodeStop(stopName, routeName);

                if (coordData) {
                    const [snappedLat, snappedLng] = await this.snapToRoad(
                        coordData.latitude,
                        coordData.longitude
                    );

                    const finalCoordData = {
                        ...coordData,
                        originalLatitude: coordData.latitude,
                        originalLongitude: coordData.longitude,
                        snappedLatitude: snappedLat,
                        snappedLongitude: snappedLng,
                        stopId: stopKey,
                        routeIndex: routeIdx
                    };

                    allCoordinates.push(finalCoordData);
                    successfulStops++;
                } else {
                    this.failedStops.push({
                        routeName: routeName,
                        stopId: stopKey,
                        stopName: stopName
                    });
                }

                await this.sleep(200);
            }
        }

        console.log(`\n📊 Processing Summary:`);
        console.log(`   Total stops processed: ${totalStops}`);
        console.log(`   Successfully geocoded: ${successfulStops}`);
        console.log(`   Failed to geocode: ${this.failedStops.length}`);
        console.log(`   Success rate: ${((successfulStops/totalStops)*100).toFixed(1)}%`);

        return allCoordinates;
    }

    async saveToCSV(coordinates, outputFile) {
        console.log(`\n💾 Saving coordinates to: ${outputFile}`);

        if (!coordinates.length) {
            console.log("❌ No coordinates to save");
            return;
        }

        const csvWriter = createObjectCsvWriter({
            path: outputFile,
            header: [
                { id: 'routeName', title: 'route_name' },
                { id: 'routeIndex', title: 'route_index' },
                { id: 'stopId', title: 'stop_id' },
                { id: 'stopName', title: 'stop_name' },
                { id: 'originalLatitude', title: 'original_latitude' },
                { id: 'originalLongitude', title: 'original_longitude' },
                { id: 'snappedLatitude', title: 'snapped_latitude' },
                { id: 'snappedLongitude', title: 'snapped_longitude' },
                { id: 'formattedAddress', title: 'formatted_address' },
                { id: 'placeId', title: 'place_id' },
                { id: 'searchQuery', title: 'search_query' }
            ]
        });

        try {
            await csvWriter.writeRecords(coordinates);
            console.log(`✅ Successfully saved ${coordinates.length} coordinates to ${outputFile}`);
        } catch (error) {
            console.log(`❌ Error saving to CSV: ${error.message}`);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

async function main() {
    console.log("🚀 Starting Stop Coordinate Extraction");
    console.log("=".repeat(50));

    const extractor = new StopCoordinateExtractor(GOOGLE_API_KEY);

    const inputFile = "/Users/mito_1315_/Documents/Workspace/Transport/Routes_Data/Existing-Routes/routes.json";
    const outputFile = "/Users/mito_1315_/Documents/Workspace/Transport/Routes_Data/extracted_stop_coordinates.csv";

    const coordinates = await extractor.processRoutesFile(inputFile);

    if (coordinates.length > 0) {
        await extractor.saveToCSV(coordinates, outputFile);

        console.log(`\n🔍 Sample coordinates:`);
        for (let i = 0; i < Math.min(5, coordinates.length); i++) {
            const coord = coordinates[i];
            console.log(`   ${coord.stopName}: ${coord.snappedLatitude.toFixed(6)}, ${coord.snappedLongitude.toFixed(6)}`);
        }
    }

    console.log(`\n✅ Coordinate extraction completed!`);
    console.log(`📁 Results saved to: ${outputFile}`);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = StopCoordinateExtractor;
