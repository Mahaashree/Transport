import { Marker } from '@react-google-maps/api';

const CollegeMarker = ({ position }) => {
  return (
    <Marker
      position={position}
      icon={{
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
            <circle cx="15" cy="15" r="15" fill="#2d3748" stroke="white" stroke-width="2"/>
            <text x="15" y="20" text-anchor="middle" fill="white" font-size="16" font-family="Arial">🏫</text>
          </svg>
        `),
        scaledSize: { width: 30, height: 30 }
      }}
      title="Rajalakshmi Engineering College"
    />
  );
};

export default CollegeMarker;
