import json
import requests
import csv
import time
from typing import Dict, List, Tuple, Optional

# Configuration
GOOGLE_API_KEY = "AIzaSyAiVn2TbI7qSuTzw1EKvY4urq7V5aTZkZg"  # Replace with your actual API key
GEOCODING_API_URL = "https://maps.googleapis.com/maps/api/geocode/json"
ROADS_API_URL = "https://roads.googleapis.com/v1/snapToRoads"

# Chennai region bounds for better geocoding accuracy
CHENNAI_BOUNDS = {
    "northeast": {"lat": 13.3, "lng": 80.5},
    "southwest": {"lat": 12.7, "lng": 79.8}
}

class StopCoordinateExtractor:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.extracted_coordinates = []
        self.failed_stops = []
        
    def geocode_stop(self, stop_name: str, route_name: str = None) -> Optional[Dict]:
        """
        Geocode a stop name to get coordinates using Google Maps Geocoding API
        """
        # Enhance search query with Chennai context
        search_queries = [
            f"{stop_name}, Chennai, Tamil Nadu, India",
            f"{stop_name}, Chennai",
            f"{stop_name} bus stop, Chennai",
            f"{stop_name} Chennai Tamil Nadu"
        ]
        
        # If route name is provided, try with route context
        if route_name:
            search_queries.insert(0, f"{stop_name}, {route_name}, Chennai")
        
        for query in search_queries:
            try:
                params = {
                    'address': query,
                    'key': self.api_key,
                    'region': 'in',  # India region bias
                    'bounds': f"{CHENNAI_BOUNDS['southwest']['lat']},{CHENNAI_BOUNDS['southwest']['lng']}|{CHENNAI_BOUNDS['northeast']['lat']},{CHENNAI_BOUNDS['northeast']['lng']}"
                }
                
                response = requests.get(GEOCODING_API_URL, params=params)
                data = response.json()
                
                if data['status'] == 'OK' and len(data['results']) > 0:
                    result = data['results'][0]
                    location = result['geometry']['location']
                    
                    # Check if the result is within Chennai bounds
                    if self.is_within_chennai(location['lat'], location['lng']):
                        print(f"✅ Found: {stop_name} -> {location['lat']:.6f}, {location['lng']:.6f}")
                        return {
                            'stop_name': stop_name,
                            'route_name': route_name,
                            'latitude': location['lat'],
                            'longitude': location['lng'],
                            'formatted_address': result['formatted_address'],
                            'place_id': result.get('place_id', ''),
                            'search_query': query
                        }
                
                # Rate limiting
                time.sleep(0.1)
                
            except Exception as e:
                print(f"❌ Error geocoding {stop_name} with query '{query}': {str(e)}")
                continue
        
        print(f"⚠️  Failed to find coordinates for: {stop_name}")
        return None
    
    def is_within_chennai(self, lat: float, lng: float) -> bool:
        """Check if coordinates are within Chennai bounds"""
        return (CHENNAI_BOUNDS['southwest']['lat'] <= lat <= CHENNAI_BOUNDS['northeast']['lat'] and
                CHENNAI_BOUNDS['southwest']['lng'] <= lng <= CHENNAI_BOUNDS['northeast']['lng'])
    
    def snap_to_road(self, lat: float, lng: float) -> Tuple[float, float]:
        """
        Snap coordinates to nearest road using Google Roads API
        """
        try:
            params = {
                'path': f"{lat},{lng}",
                'key': self.api_key
            }
            
            response = requests.get(ROADS_API_URL, params=params)
            data = response.json()
            
            if 'snappedPoints' in data and len(data['snappedPoints']) > 0:
                snapped = data['snappedPoints'][0]['location']
                print(f"🛣️  Snapped to road: {lat:.6f},{lng:.6f} -> {snapped['latitude']:.6f},{snapped['longitude']:.6f}")
                return snapped['latitude'], snapped['longitude']
            
        except Exception as e:
            print(f"⚠️  Road snapping failed for {lat},{lng}: {str(e)}")
        
        # Return original coordinates if snapping fails
        return lat, lng
    
    def process_routes_file(self, json_file_path: str) -> List[Dict]:
        """
        Process the routes.json file and extract coordinates for all stops
        """
        print(f"📂 Loading routes from: {json_file_path}")
        
        try:
            with open(json_file_path, 'r', encoding='utf-8') as file:
                data = json.load(file)
        except Exception as e:
            print(f"❌ Error loading JSON file: {str(e)}")
            return []
        
        routes = data.get('routes', [])
        print(f"📊 Found {len(routes)} routes to process")
        
        all_coordinates = []
        total_stops = 0
        successful_stops = 0
        
        for route_idx, route in enumerate(routes):
            route_name = route.get('routename', f'Route_{route_idx}')
            stops = route.get('stops', {})
            
            print(f"\n🚌 Processing route: {route_name} ({len(stops)} stops)")
            
            for stop_key, stop_name in stops.items():
                total_stops += 1
                print(f"   📍 Processing stop {stop_key}: {stop_name}")
                
                # Geocode the stop
                coord_data = self.geocode_stop(stop_name, route_name)
                
                if coord_data:
                    # Snap to road for better accuracy
                    snapped_lat, snapped_lng = self.snap_to_road(
                        coord_data['latitude'], 
                        coord_data['longitude']
                    )
                    
                    # Update with snapped coordinates
                    coord_data.update({
                        'original_latitude': coord_data['latitude'],
                        'original_longitude': coord_data['longitude'],
                        'snapped_latitude': snapped_lat,
                        'snapped_longitude': snapped_lng,
                        'stop_id': stop_key,
                        'route_index': route_idx
                    })
                    
                    all_coordinates.append(coord_data)
                    successful_stops += 1
                else:
                    self.failed_stops.append({
                        'route_name': route_name,
                        'stop_id': stop_key,
                        'stop_name': stop_name
                    })
                
                # Rate limiting to avoid API quota issues
                time.sleep(0.2)
        
        print(f"\n📊 Processing Summary:")
        print(f"   Total stops processed: {total_stops}")
        print(f"   Successfully geocoded: {successful_stops}")
        print(f"   Failed to geocode: {len(self.failed_stops)}")
        print(f"   Success rate: {(successful_stops/total_stops)*100:.1f}%")
        
        return all_coordinates
    
    def save_to_csv(self, coordinates: List[Dict], output_file: str):
        """
        Save extracted coordinates to CSV file
        """
        print(f"\n💾 Saving coordinates to: {output_file}")
        
        if not coordinates:
            print("❌ No coordinates to save")
            return
        
        fieldnames = [
            'route_name', 'route_index', 'stop_id', 'stop_name',
            'original_latitude', 'original_longitude',
            'snapped_latitude', 'snapped_longitude',
            'formatted_address', 'place_id', 'search_query'
        ]
        
        try:
            with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                
                for coord in coordinates:
                    writer.writerow(coord)
            
            print(f"✅ Successfully saved {len(coordinates)} coordinates to {output_file}")
            
        except Exception as e:
            print(f"❌ Error saving to CSV: {str(e)}")
    
    def save_failed_stops(self, output_file: str):
        """
        Save failed stops to CSV for manual review
        """
        if not self.failed_stops:
            print("✅ No failed stops to save")
            return
        
        print(f"💾 Saving failed stops to: {output_file}")
        
        try:
            with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=['route_name', 'stop_id', 'stop_name'])
                writer.writeheader()
                
                for failed in self.failed_stops:
                    writer.writerow(failed)
            
            print(f"⚠️  Saved {len(self.failed_stops)} failed stops to {output_file}")
            
        except Exception as e:
            print(f"❌ Error saving failed stops: {str(e)}")
    
    def create_summary_report(self, coordinates: List[Dict]) -> Dict:
        """
        Create a summary report of the extraction process
        """
        if not coordinates:
            return {}
        
        # Group by route
        routes_summary = {}
        for coord in coordinates:
            route_name = coord['route_name']
            if route_name not in routes_summary:
                routes_summary[route_name] = {
                    'total_stops': 0,
                    'stops': [],
                    'avg_lat': 0,
                    'avg_lng': 0
                }
            
            routes_summary[route_name]['total_stops'] += 1
            routes_summary[route_name]['stops'].append(coord['stop_name'])
        
        # Calculate average coordinates for each route
        for route_name in routes_summary:
            route_coords = [c for c in coordinates if c['route_name'] == route_name]
            if route_coords:
                avg_lat = sum(c['snapped_latitude'] for c in route_coords) / len(route_coords)
                avg_lng = sum(c['snapped_longitude'] for c in route_coords) / len(route_coords)
                routes_summary[route_name]['avg_lat'] = avg_lat
                routes_summary[route_name]['avg_lng'] = avg_lng
        
        return {
            'total_routes': len(routes_summary),
            'total_stops_extracted': len(coordinates),
            'total_failed': len(self.failed_stops),
            'routes_summary': routes_summary
        }

def main():
    print("🚀 Starting Stop Coordinate Extraction")
    print("=" * 50)
    
    # Initialize extractor
    extractor = StopCoordinateExtractor(GOOGLE_API_KEY)
    
    # File paths
    input_file = "/Users/mito_1315_/Documents/Workspace/Transport/Routes_Data/Existing-Routes/routes.json"
    output_file = "/Users/mito_1315_/Documents/Workspace/Transport/Routes_Data/extracted_stop_coordinates.csv"
    failed_file = "/Users/mito_1315_/Documents/Workspace/Transport/Routes_Data/failed_stops.csv"
    
    # Process the routes file
    coordinates = extractor.process_routes_file(input_file)
    
    # Save results
    if coordinates:
        extractor.save_to_csv(coordinates, output_file)
        
        # Create summary report
        summary = extractor.create_summary_report(coordinates)
        print(f"\n📊 Final Summary:")
        print(f"   Total routes processed: {summary.get('total_routes', 0)}")
        print(f"   Total stops extracted: {summary.get('total_stops_extracted', 0)}")
        print(f"   Total failed: {summary.get('total_failed', 0)}")
        
        # Save sample of coordinates for verification
        print(f"\n🔍 Sample coordinates:")
        for i, coord in enumerate(coordinates[:5]):
            print(f"   {coord['stop_name']}: {coord['snapped_latitude']:.6f}, {coord['snapped_longitude']:.6f}")
    
    # Save failed stops for manual review
    extractor.save_failed_stops(failed_file)
    
    print(f"\n✅ Coordinate extraction completed!")
    print(f"📁 Results saved to: {output_file}")
    if extractor.failed_stops:
        print(f"📁 Failed stops saved to: {failed_file}")

if __name__ == "__main__":
    main()
