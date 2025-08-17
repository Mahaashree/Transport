// Distance filtering logic from existing js/optimization/ code
const COLLEGE_COORDS = [13.008867898985972, 80.00353386796435];

// Distance filtering function (from existing code)
export const filterStopsByDistance = (stopsData, maxRadiusKm = 40) => {
  const filteredStops = [];
  const excludedStops = [];
  
  stopsData.forEach(stop => {
    const stopLat = parseFloat(stop.snapped_lat);
    const stopLon = parseFloat(stop.snapped_lon);
    
    const distance = getDistanceBetweenPoints(
      COLLEGE_COORDS[0], COLLEGE_COORDS[1],
      stopLat, stopLon
    );
    
    if (distance <= maxRadiusKm) {
      filteredStops.push(stop);
    } else {
      excludedStops.push(stop);
    }
  });
  
  console.log(`📊 Using ${filteredStops.length}/${stopsData.length} stops within ${maxRadiusKm}km radius`);
  return { filteredStops, excludedStops };
};

// Haversine distance calculation (from existing code)
function getDistanceBetweenPoints(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
