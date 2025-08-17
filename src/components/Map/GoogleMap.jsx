import { GoogleMap as GoogleMapComponent, LoadScript } from '@react-google-maps/api';
import { useOptimization } from '../../context/OptimizationContext';
import { useEffect } from 'react';
import CollegeMarker from './CollegeMarker';
import StopMarker from './StopMarker';
import DepotMarker from './DepotMarker';
import RoutePolyline from './RoutePolyline';

const GoogleMap = () => {
  const { state, dispatch } = useOptimization();
  
  const mapOptions = {
    zoom: 10,
    center: { lat: 13.008867898985972, lng: 80.00353386796435 },
    mapTypeId: 'roadmap',
    disableDefaultUI: false, // Enable default UI to remove watermarks
    zoomControl: true,
    streetViewControl: true,
    mapTypeControl: true,
    fullscreenControl: true,
    // Remove custom styles to get proper Google Maps UI
  };

  // Route colors from existing code
  const getRouteColor = (index) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'];
    return colors[index % colors.length];
  };

  const isStopVisible = (stop) => {
    if (state.selectedRoutes.length === 0) return true;
    
    return state.optimizationResults.some(route => 
      route.stops.some(s => s.cluster_number === stop.cluster_number) &&
      state.selectedRoutes.includes(route.busId)
    );
  };

  const isRouteVisible = (route) => {
    return state.selectedRoutes.length === 0 || state.selectedRoutes.includes(route.busId);
  };

  // Check for Google Maps API errors
  useEffect(() => {
    const checkGoogleMapsError = () => {
      // Check if there are any Google Maps related errors in the console
      const originalError = console.error;
      let hasError = false;
      
      console.error = (...args) => {
        const errorMessage = args.join(' ');
        if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('ggpht.com')) {
          hasError = true;
          dispatch({ type: 'SET_GOOGLE_MAPS_ERROR', payload: true });
        }
        originalError.apply(console, args);
      };

      // Reset after a delay
      setTimeout(() => {
        console.error = originalError;
      }, 1000);
    };

    checkGoogleMapsError();
  }, [dispatch]);

  // Check if API key is available
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Google Maps API Key Missing</h3>
          <p className="text-gray-600 mb-4">
            Please create a .env file with your Google Maps API key:
          </p>
          <code className="bg-gray-100 p-2 rounded text-sm">
            VITE_GOOGLE_MAPS_API_KEY=AIzaSyAiVn2TbI7qSuTzw1EKvY4urq7V5aTZkZg
          </code>
        </div>
      </div>
    );
  }

  // Fallback display when Google Maps fails (e.g., quota exceeded)
  if (state.googleMapsError) {
    return (
      <div className="w-full h-full bg-gray-100 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Route Optimization Results</h2>
            <p className="text-gray-600 mb-4">
              Google Maps is currently unavailable due to API quota limits. 
              Here are your optimized routes in table format:
            </p>
            <button 
              onClick={() => dispatch({ type: 'SET_GOOGLE_MAPS_ERROR', payload: false })}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry Google Maps
            </button>
          </div>
          
          {/* Route Results Table */}
          {state.optimizationResults.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Optimized Routes</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bus ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Depot</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Efficiency</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stops</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route Details</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {state.optimizationResults.map((route, index) => (
                      <tr key={route.busId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded-full mr-3" 
                              style={{ backgroundColor: getRouteColor(index) }}
                            />
                            <span className="font-medium text-gray-900">{route.busId}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.depot}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.totalStudents}/55</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.efficiency}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.stops.length}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs">
                            {route.stops.map((stop, stopIndex) => (
                              <div key={stopIndex} className="text-xs text-gray-600 mb-1">
                                Stop {stop.cluster_number}: {stop.num_students} students
                                {stop.route_name && ` (${stop.route_name})`}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Data Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-lg shadow-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{state.metrics.totalStudents}</div>
              <div className="text-sm text-gray-600">Total Students</div>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{state.metrics.requiredBuses}</div>
              <div className="text-sm text-gray-600">Required Buses</div>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{state.metrics.totalStops}</div>
              <div className="text-sm text-gray-600">Total Stops</div>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{state.metrics.totalDepots}</div>
              <div className="text-sm text-gray-600">Available Depots</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={apiKey}>
      <GoogleMapComponent
        mapContainerStyle={{ 
          width: '100%', 
          height: '100vh',
          position: 'relative'
        }}
        options={mapOptions}
        onError={() => {
          // Handle Google Maps loading errors (e.g., quota exceeded)
          console.warn('Google Maps failed to load, showing fallback display');
          dispatch({ type: 'SET_GOOGLE_MAPS_ERROR', payload: true });
        }}
      >
        {/* College Marker */}
        <CollegeMarker 
          position={{ lat: 13.008867898985972, lng: 80.00353386796435 }} 
        />
        
        {/* Stop Markers - Using exact same logic from existing code */}
        {state.stopsData.map((stop) => (
          <StopMarker 
            key={stop.cluster_number}
            stop={stop}
            isVisible={isStopVisible(stop)}
          />
        ))}
        
        {/* Depot Markers - Using exact same logic from existing code */}
        {state.depotsData.map((depot, index) => (
          <DepotMarker 
            key={index}
            depot={depot}
          />
        ))}
        
        {/* Route Polylines - Using exact same logic from existing code */}
        {state.optimizationResults.map((route, index) => (
          <RoutePolyline
            key={route.busId}
            route={route}
            isVisible={isRouteVisible(route)}
            color={getRouteColor(index)}
          />
        ))}
      </GoogleMapComponent>
    </LoadScript>
  );
};

export default GoogleMap;