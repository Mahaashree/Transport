import { Marker, InfoWindow } from '@react-google-maps/api';
import { useState } from 'react';

const StopMarker = ({ stop, isVisible }) => {
  const [showInfo, setShowInfo] = useState(false);

  if (!isVisible) return null;

  const lat = parseFloat(stop.snapped_lat);
  const lon = parseFloat(stop.snapped_lon);
  const students = parseInt(stop.num_students);

  // Using exact same styling from existing code
  const markerIcon = {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
        <circle cx="15" cy="15" r="15" fill="#4299e1" stroke="white" stroke-width="2"/>
        <text x="15" y="20" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">${students}</text>
      </svg>
    `)}`,
    scaledSize: { width: 30, height: 30 },
    anchor: { x: 15, y: 15 }
  };

  // Using exact same popup content from existing code
  const popupContent = `
    <b>Stop ${stop.cluster_number}</b><br>
    Students: ${students}<br>
    Route: ${stop.route_name || 'Unknown'}<br>
    Type: ${stop.route_type || 'Unknown'}
  `;

  return (
    <Marker
      position={{ lat, lng: lon }}
      icon={markerIcon}
      onClick={() => setShowInfo(true)}
    >
      {showInfo && (
        <InfoWindow
          position={{ lat, lng: lon }}
          onCloseClick={() => setShowInfo(false)}
        >
          <div dangerouslySetInnerHTML={{ __html: popupContent }} />
        </InfoWindow>
      )}
    </Marker>
  );
};

export default StopMarker;
