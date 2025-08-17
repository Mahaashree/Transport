import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useEffect } from 'react';
import { useOptimization } from '../../context/OptimizationContext';

const StatusToast = () => {
  const { state, dispatch } = useOptimization();
  const { status } = state;

  useEffect(() => {
    if (status.show && status.type === 'success') {
      const timer = setTimeout(() => {
        dispatch({
          type: 'SET_STATUS',
          payload: { ...status, show: false }
        });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [status, dispatch]);

  if (!status.show) return null;

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  };

  const colors = {
    success: 'text-green-600 bg-green-50 border-green-200',
    error: 'text-red-600 bg-red-50 border-red-200',
    info: 'text-blue-600 bg-blue-50 border-blue-200',
  };

  const Icon = icons[status.type];

  const handleClose = () => {
    dispatch({
      type: 'SET_STATUS',
      payload: { ...status, show: false }
    });
  };

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className={`floating-card px-4 py-3 flex items-center space-x-3 border ${colors[status.type]}`}>
        <Icon size={20} />
        <span className="text-sm font-medium text-gray-800">{status.message}</span>
        <button
          onClick={handleClose}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default StatusToast;
