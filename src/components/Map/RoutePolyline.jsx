import { Polyline, InfoWindow } from '@react-google-maps/api';
import { useState } from 'react';

const RoutePolyline = ({ route, isVisible, color }) => {
  const [showInfo, setShowInfo] = useState(false);

  if (!isVisible) return null;

  // Create waypoints for the route (from existing code)
  const waypoints = [];
  
  // Start from college
  waypoints.push({ lat: 13.008867898985972, lng: 80.00353386796435 });
  
  // Add all stops in the route
  route.stops.forEach(stop => {
    waypoints.push({ 
      lat: parseFloat(stop.snapped_lat), 
      lng: parseFloat(stop.snapped_lon) 
    });
  });
  
  // End at depot (find depot coordinates)
  const depotCoords = { lat: 13.008867898985972, lng: 80.00353386796435 }; // Default fallback
  waypoints.push(depotCoords);

  // Using exact same popup content from existing code
  const popupContent = `
    <b>${route.busId}</b><br>
    Depot: ${route.depot}<br>
    Students: ${route.totalStudents}/55<br>
    Efficiency: ${route.efficiency}<br>
    Stops: ${route.stops.length}<br>
    <small>Route follows major roads & highways</small>
  `;

  return (
    <Polyline
      path={waypoints}
      options={{
        strokeColor: color,
        strokeWeight: 5,
        strokeOpacity: 0.8,
        geodesic: true,
        clickable: true
      }}
      onClick={() => setShowInfo(true)}
    >
      {showInfo && (
        <InfoWindow
          position={waypoints[Math.floor(waypoints.length / 2)]}
          onCloseClick={() => setShowInfo(false)}
        >
          <div dangerouslySetInnerHTML={{ __html: popupContent }} />
        </InfoWindow>
      )}
    </Polyline>
  );
};

export default RoutePolyline;
