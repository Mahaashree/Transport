import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useOptimization } from '../../context/OptimizationContext';

const StatusDisplay = () => {
  const { state, dispatch } = useOptimization();

  if (!state.status.show) return null;

  const getStatusIcon = () => {
    switch (state.status.type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-600" />;
      case 'error':
        return <XCircle size={20} className="text-red-600" />;
      case 'warning':
        return <Info size={20} className="text-yellow-600" />;
      default:
        return <Info size={20} className="text-blue-600" />;
    }
  };

  const getStatusStyles = () => {
    switch (state.status.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const closeStatus = () => {
    dispatch({
      type: 'SET_STATUS',
      payload: { ...state.status, show: false }
    });
  };

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md border rounded-lg p-4 shadow-lg ${getStatusStyles()}`}>
      <div className="flex items-start space-x-3">
        {getStatusIcon()}
        <div className="flex-1">
          <p className="text-sm font-medium">{state.status.message}</p>
        </div>
        <button
          onClick={closeStatus}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default StatusDisplay;
