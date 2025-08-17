import { Marker, InfoWindow } from '@react-google-maps/api';
import { useState } from 'react';

const DepotMarker = ({ depot }) => {
  const [showInfo, setShowInfo] = useState(false);

  const lat = parseFloat(depot.Latitude);
  const lon = parseFloat(depot.Longitude);
  const capacity = parseInt(depot.Counts);

  // Using exact same styling from existing code
  const markerIcon = {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="5" width="20" height="20" fill="#e53e3e" stroke="white" stroke-width="2"/>
        <text x="15" y="18" text-anchor="middle" fill="white" font-family="Arial" font-size="10" font-weight="bold">W</text>
      </svg>
    `)}`,
    scaledSize: { width: 30, height: 30 },
    anchor: { x: 15, y: 15 }
  };

  // Using exact same popup content from existing code
  const popupContent = `
    <b>${depot['Parking Name']}</b><br>
    Capacity: ${capacity} buses<br>
    Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}
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

export default DepotMarker;
