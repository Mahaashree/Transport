import { createContext, useContext, useReducer, useEffect } from 'react';

const OptimizationContext = createContext();

const initialState = {
  studentData: [],
  stopsData: [],
  depotsData: [],
  optimizationResults: [],
  selectedRoutes: [],
  isOptimizing: false,
  status: { message: '', type: 'info', show: false },
  metrics: {
    totalStudents: 0,
    requiredBuses: 0,
    totalStops: 0,
    totalDepots: 0
  },
  busCapacity: 55,
  shiftTime: '8am',
  dayOfWeek: 'monday',
  googleMapsError: false
};

const optimizationReducer = (state, action) => {
  switch (action.type) {
    case 'SET_STUDENT_DATA':
      return { ...state, studentData: action.payload };
    
    case 'SET_STOPS_DATA':
      return { ...state, stopsData: action.payload };
    
    case 'SET_DEPOTS_DATA':
      return { ...state, depotsData: action.payload };
    
    case 'SET_OPTIMIZATION_RESULTS':
      return { ...state, optimizationResults: action.payload };
    
    case 'SET_OPTIMIZING':
      return { ...state, isOptimizing: action.payload };
    
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    
    case 'UPDATE_METRICS':
      return { ...state, metrics: action.payload };
    
    case 'SET_BUS_CAPACITY':
      return { ...state, busCapacity: action.payload };
    
    case 'SET_SHIFT_TIME':
      return { ...state, shiftTime: action.payload };
    
    case 'SET_DAY_OF_WEEK':
      return { ...state, dayOfWeek: action.payload };
    
    case 'TOGGLE_ROUTE_SELECTION':
      const routeId = action.payload;
      if (state.selectedRoutes.includes(routeId)) {
        return { 
          ...state, 
          selectedRoutes: state.selectedRoutes.filter(id => id !== routeId) 
        };
      } else {
        return { 
          ...state, 
          selectedRoutes: [...state.selectedRoutes, routeId] 
        };
      }
    
    case 'SELECT_ALL_ROUTES':
      return { ...state, selectedRoutes: [] };
    
    case 'CLEAR_SELECTION':
      return { ...state, selectedRoutes: [] };
    
    case 'SET_GOOGLE_MAPS_ERROR':
      return { ...state, googleMapsError: action.payload };
    
    default:
      return state;
  }
};

export const OptimizationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(optimizationReducer, initialState);

  // Auto-hide success status after 5 seconds
  useEffect(() => {
    if (state.status.type === 'success' && state.status.show) {
      const timer = setTimeout(() => {
        dispatch({
          type: 'SET_STATUS',
          payload: { ...state.status, show: false }
        });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.status]);

  return (
    <OptimizationContext.Provider value={{ state, dispatch }}>
      {children}
    </OptimizationContext.Provider>
  );
};

export const useOptimization = () => {
  const context = useContext(OptimizationContext);
  if (!context) {
    throw new Error('useOptimization must be used within an OptimizationProvider');
  }
  return context;
};