// Import existing optimization logic from js/optimization/
import { filterStopsByDistance } from './distanceFilter';

// Constants from existing code
const COLLEGE_COORDS = [13.008867898985972, 80.00353386796435];
const ROUTE_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'];

// Distance filtering function imported from distanceFilter.js

// Prepare optimization request (from existing googleAPI.js)
export const prepareOptimizationRequest = (stopsData, depotsData, config) => {
  const { filteredStops } = filterStopsByDistance(stopsData, 40);
  const requiredBuses = Math.max(1, Math.ceil(filteredStops.length * 0.7));
  
  console.log(`📊 Requesting ${requiredBuses} buses for route optimization`);
  
  const shipments = filteredStops.map((stop, index) => ({
    deliveries: [{
      arrivalLocation: {
        latitude: parseFloat(stop.snapped_lat),
        longitude: parseFloat(stop.snapped_lon)
      },
      duration: "300s",
      loadDemands: {
        students: {
          amount: parseInt(stop.num_students)
        }
      }
    }],
    label: `stop_${stop.cluster_number}`
  }));
  
  const vehicles = [];
  for (let i = 0; i < requiredBuses; i++) {
    vehicles.push({
      startLocation: {
        latitude: COLLEGE_COORDS[0],
        longitude: COLLEGE_COORDS[1]
      },
      endLocation: {
        latitude: parseFloat(depotsData[i % depotsData.length].Latitude),
        longitude: parseFloat(depotsData[i % depotsData.length].Longitude)
      },
      loadLimits: {
        students: {
          maxLoad: config.busCapacity
        }
      },
      label: `bus_${i + 1}`,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: true
      }
    });
  }
  
  return {
    model: {
      shipments: shipments,
      vehicles: vehicles,
      globalStartTime: "2024-01-01T08:00:00Z",
      globalEndTime: "2024-01-01T20:00:00Z"
    },
    searchMode: "RETURN_FAST"
  };
};

// Call optimization API (from existing code)
export const callOptimizationAPI = async (requestData) => {
  try {
    console.log('Calling Route Optimization API via server proxy...');
    
    const response = await fetch('/api/optimize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server Error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    return result;
    
  } catch (error) {
    console.error('Route Optimization API Error:', error);
    throw error;
  }
};

// Process optimization response (from existing code)
export const processOptimizationResponse = (apiResponse, stopsData, depotsData, busCapacity) => {
  const routes = [];
  
  if (apiResponse.routes) {
    apiResponse.routes.forEach((route, index) => {
      const routeStops = [];
      let totalStudents = 0;
      
      if (route.visits) {
        route.visits.forEach(visit => {
          if (visit.shipmentIndex !== undefined) {
            const stop = stopsData[visit.shipmentIndex];
            if (stop) {
              routeStops.push(stop);
              totalStudents += parseInt(stop.num_students);
            }
          }
        });
      }
      
      if (routeStops.length > 0) {
        routes.push({
          busId: `Bus ${index + 1}`,
          depot: depotsData[index % depotsData.length]['Parking Name'],
          stops: routeStops,
          totalStudents: totalStudents,
          efficiency: `${((totalStudents / busCapacity) * 100).toFixed(1)}%`,
          totalDistance: route.metrics?.totalDistance || 'N/A',
          totalTime: route.metrics?.totalTime || 'N/A'
        });
      }
    });
  }
  
  return routes;
};

// Simulate optimization (fallback algorithm from existing code)
export const simulateOptimization = (stopsData, depotsData, busCapacity) => {
  const routes = [];
  
  // Simple greedy algorithm for demonstration (from existing algorithms.js)
  let currentRoute = [];
  let currentLoad = 0;
  let routeIndex = 0;
  
  // Sort stops by distance from college (from existing code)
  const sortedStops = [...stopsData].sort((a, b) => {
    const distA = Math.sqrt(Math.pow(parseFloat(a.snapped_lat) - COLLEGE_COORDS[0], 2) + 
                          Math.pow(parseFloat(a.snapped_lon) - COLLEGE_COORDS[1], 2));
    const distB = Math.sqrt(Math.pow(parseFloat(b.snapped_lat) - COLLEGE_COORDS[0], 2) + 
                          Math.pow(parseFloat(b.snapped_lon) - COLLEGE_COORDS[1], 2));
    return distA - distB;
  });
  
  for (const stop of sortedStops) {
    const stopLoad = parseInt(stop.num_students);
    
    if (currentLoad + stopLoad <= busCapacity) {
      currentRoute.push(stop);
      currentLoad += stopLoad;
    } else {
      // Finalize current route
      if (currentRoute.length > 0) {
        routes.push({
          busId: `Bus ${routeIndex + 1}`,
          depot: depotsData[routeIndex % depotsData.length]['Parking Name'],
          stops: [...currentRoute],
          totalStudents: currentLoad,
          efficiency: `${((currentLoad / busCapacity) * 100).toFixed(1)}%`
        });
        routeIndex++;
      }
      
      // Start new route
      currentRoute = [stop];
      currentLoad = stopLoad;
    }
  }
  
  // Add the last route
  if (currentRoute.length > 0) {
    routes.push({
      busId: `Bus ${routeIndex + 1}`,
      depot: depotsData[routeIndex % depotsData.length]['Parking Name'],
      stops: currentRoute,
      totalStudents: currentLoad,
      efficiency: `${((currentLoad / busCapacity) * 100).toFixed(1)}%`
    });
  }
  
  return routes;
};

// Main optimization function (from existing code)
export const optimizeRoutes = async (stopsData, depotsData, config) => {
  try {
    if (!stopsData.length || !depotsData.length) {
      throw new Error('Please load data first');
    }
    
    console.log('Starting route optimization...');
    
    // Try Google API first
    try {
      const requestData = prepareOptimizationRequest(stopsData, depotsData, config);
      const apiResponse = await callOptimizationAPI(requestData);
      const routes = processOptimizationResponse(apiResponse, stopsData, depotsData, config.busCapacity);
      
      if (routes && routes.length > 0) {
        console.log(`Google API optimization completed: ${routes.length} routes generated`);
        return routes;
      }
    } catch (apiError) {
      console.warn('Google API optimization failed, falling back to simulation:', apiError.message);
    }
    
    // Fallback to simulation
    const routes = simulateOptimization(stopsData, depotsData, config.busCapacity);
    console.log(`Simulation optimization completed: ${routes.length} routes generated`);
    return routes;
    
  } catch (error) {
    console.error('Optimization failed:', error);
    throw error;
  }
};

// Calculate time difference (from existing code)
export const calculateTimeDifference = (startTime, endTime) => {
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const diffMins = Math.round(diffMs / 60000);
    return `${diffMins} min`;
  } catch (error) {
    return 'N/A';
  }
};

// Export constants for use in other components
export { COLLEGE_COORDS, ROUTE_COLORS };
