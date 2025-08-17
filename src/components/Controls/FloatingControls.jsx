import { Play, Download, Settings, Users, Bus, MapPin, Warehouse } from 'lucide-react';
import { useOptimization } from '../../context/OptimizationContext';
import FileUpload from './FileUpload';
import ConfigurationPanel from './ConfigurationPanel';
import { optimizeRoutes } from '../../services/optimizationService';
import { exportToCSV } from '../../services/exportService';

const FloatingControls = () => {
  const { state, dispatch } = useOptimization();

  const handleOptimize = async () => {
    if (!state.stopsData.length || !state.depotsData.length) {
      dispatch({
        type: 'SET_STATUS',
        payload: { message: 'Please load data first', type: 'error', show: true }
      });
      return;
    }

    dispatch({ type: 'SET_OPTIMIZING', payload: true });
    dispatch({
      type: 'SET_STATUS',
      payload: { message: 'Optimizing routes... This may take a moment.', type: 'info', show: true }
    });

    try {
      const config = {
        busCapacity: state.busCapacity,
        shiftTime: state.shiftTime,
        dayOfWeek: state.dayOfWeek
      };

      // Using exact same optimization logic from existing code
      const results = await optimizeRoutes(state.stopsData, state.depotsData, config);
      
      if (!results || results.length === 0) {
        throw new Error('No optimization results generated');
      }
      
      dispatch({ type: 'SET_OPTIMIZATION_RESULTS', payload: results });
      dispatch({
        type: 'SET_STATUS',
        payload: { 
          message: `Route optimization completed! Generated ${results.length} efficient routes.`, 
          type: 'success', 
          show: true 
        }
      });
    } catch (error) {
      dispatch({
        type: 'SET_STATUS',
        payload: { message: `Optimization failed: ${error.message}`, type: 'error', show: true }
      });
    } finally {
      dispatch({ type: 'SET_OPTIMIZING', payload: false });
    }
  };

  const handleExport = () => {
    if (!state.optimizationResults.length) {
      dispatch({
        type: 'SET_STATUS',
        payload: { message: 'No results to export', type: 'error', show: true }
      });
      return;
    }

    try {
      exportToCSV(state.optimizationResults, state.shiftTime, state.dayOfWeek);
      dispatch({
        type: 'SET_STATUS',
        payload: { message: 'Results exported successfully!', type: 'success', show: true }
      });
    } catch (error) {
      dispatch({
        type: 'SET_STATUS',
        payload: { message: `Export failed: ${error.message}`, type: 'error', show: true }
      });
    }
  };

  return (
    <div className="absolute top-6 left-6 z-50">
      <div className="floating-card p-6 space-y-6 min-w-[400px] max-w-[500px]">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            Route Optimizer
          </h2>
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings size={20} />
          </button>
        </div>
        
        <FileUpload />
        <ConfigurationPanel />
        
        {/* Action Buttons */}
        <div className="space-y-3">
          <button 
            onClick={handleOptimize}
            disabled={state.isOptimizing || !state.stopsData.length}
            className="w-full flex items-center justify-center p-3 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.isOptimizing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Play size={16} className="mr-2" />
            )}
            {state.isOptimizing ? 'Optimizing...' : 'Optimize Routes'}
          </button>
          
          <button 
            onClick={handleExport}
            disabled={!state.optimizationResults.length}
            className="w-full flex items-center justify-center p-3 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} className="mr-2" />
            Export Results
          </button>
        </div>
        
        <MetricsPanel />
      </div>
    </div>
  );
};

const MetricsPanel = () => {
  const { state } = useOptimization();

  const metrics = [
    { 
      icon: Users, 
      label: 'Students', 
      value: state.metrics.totalStudents, 
      color: 'text-blue-600' 
    },
    { 
      icon: Bus, 
      label: 'Buses', 
      value: state.metrics.requiredBuses, 
      color: 'text-green-600' 
    },
    { 
      icon: MapPin, 
      label: 'Stops', 
      value: state.metrics.totalStops, 
      color: 'text-purple-600' 
    },
    { 
      icon: Warehouse, 
      label: 'Depots', 
      value: state.metrics.totalDepots, 
      color: 'text-orange-600' 
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {metrics.map((metric, index) => (
        <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
          <metric.icon size={20} className={`mx-auto mb-1 ${metric.color}`} />
          <div className="text-lg font-semibold text-gray-800">{metric.value}</div>
          <div className="text-xs text-gray-500">{metric.label}</div>
        </div>
      ))}
    </div>
  );
};

export default FloatingControls;