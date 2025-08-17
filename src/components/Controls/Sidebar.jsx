import { ChevronLeft, Filter, Route, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useOptimization } from '../../context/OptimizationContext';

const Sidebar = () => {
  const { state, dispatch } = useOptimization();
  const [isOpen, setIsOpen] = useState(false);

  const handleRouteToggle = (routeId) => {
    dispatch({ type: 'TOGGLE_ROUTE_SELECTION', payload: routeId });
  };

  const handleSelectAll = () => {
    dispatch({ type: 'SELECT_ALL_ROUTES' });
  };

  const handleClearSelection = () => {
    dispatch({ type: 'CLEAR_SELECTION' });
  };

  // Route colors from existing code
  const getRouteColor = (index) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'];
    return colors[index % colors.length];
  };

  return (
    <div className={`absolute top-6 right-6 z-50 transition-all duration-300 ${
      isOpen ? 'translate-x-0' : 'translate-x-[calc(100%-60px)]'
    }`}>
      <div className="floating-card p-6 w-80">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">
            Route Selection
          </h2>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        {isOpen && (
          <div className="space-y-4">
            <RouteFilter 
              onSelectAll={handleSelectAll}
              onClearSelection={handleClearSelection}
            />
            <RouteList 
              routes={state.optimizationResults}
              selectedRoutes={state.selectedRoutes}
              onRouteToggle={handleRouteToggle}
              getRouteColor={getRouteColor}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const RouteFilter = ({ onSelectAll, onClearSelection }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Filter size={16} className="text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Filters</span>
      </div>
      
      <div className="space-y-2">
        <button
          onClick={onSelectAll}
          className="w-full text-left p-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <Eye size={16} className="inline mr-2" />
          Show all routes
        </button>
        
        <button
          onClick={onClearSelection}
          className="w-full text-left p-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <EyeOff size={16} className="inline mr-2" />
          Hide all routes
        </button>
      </div>
    </div>
  );
};

const RouteList = ({ routes, selectedRoutes, onRouteToggle, getRouteColor }) => {
  if (routes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Route size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No routes available</p>
        <p className="text-xs">Run optimization to see routes</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Route size={16} className="text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Routes ({routes.length})</span>
      </div>
      
      <div className="max-h-64 overflow-y-auto space-y-2">
        {routes.map((route, index) => {
          const isSelected = selectedRoutes.length === 0 || selectedRoutes.includes(route.busId);
          
          return (
            <div 
              key={route.busId} 
              className={`p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border ${
                isSelected ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => onRouteToggle(route.busId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: getRouteColor(index) }}
                  />
                  <span className="font-medium text-gray-800">{route.busId}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">{route.efficiency}</span>
                  {isSelected ? (
                    <Eye size={14} className="text-blue-600" />
                  ) : (
                    <EyeOff size={14} className="text-gray-400" />
                  )}
                </div>
              </div>
              <div className="mt-1 text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>{route.totalStudents} students</span>
                  <span>{route.stops.length} stops</span>
                </div>
                <div className="flex justify-between">
                  <span>Distance: {route.totalDistance}</span>
                  <span>Time: {route.totalTime}</span>
                </div>
                <div className="text-gray-400">
                  Depot: {route.depot}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;