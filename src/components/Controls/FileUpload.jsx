import { FileText, CheckCircle } from 'lucide-react';
import { useOptimization } from '../../context/OptimizationContext';
import { parseCSV, validateData, calculateMetrics } from '../../services/csvService';

const FileUpload = () => {
  const { state, dispatch } = useOptimization();

  const handleFileChange = async (event, fileType) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      dispatch({
        type: 'SET_STATUS',
        payload: { message: `Loading ${fileType} data...`, type: 'info', show: true }
      });

      // Using exact same CSV parsing logic from existing code
      const data = await parseCSV(file);
      
      switch (fileType) {
        case 'student':
          dispatch({ type: 'SET_STUDENT_DATA', payload: data });
          break;
        case 'stops':
          dispatch({ type: 'SET_STOPS_DATA', payload: data });
          break;
        case 'depots':
          dispatch({ type: 'SET_DEPOTS_DATA', payload: data });
          break;
      }

      // Update metrics if we have data (from existing updateMetrics logic)
      const currentStudentData = fileType === 'student' ? data : state.studentData;
      const currentStopsData = fileType === 'stops' ? data : state.stopsData;
      const currentDepotsData = fileType === 'depots' ? data : state.depotsData;

      if (currentStudentData.length > 0 || currentStopsData.length > 0 || currentDepotsData.length > 0) {
        const metrics = calculateMetrics(currentStudentData, currentStopsData, currentDepotsData, state.busCapacity);
        dispatch({ type: 'UPDATE_METRICS', payload: metrics });
      }

      dispatch({
        type: 'SET_STATUS',
        payload: { message: `${fileType} data loaded successfully!`, type: 'success', show: true }
      });

    } catch (error) {
      dispatch({
        type: 'SET_STATUS',
        payload: { message: `Error loading ${fileType} data: ${error.message}`, type: 'error', show: true }
      });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-700 flex items-center">
        <FileText size={18} className="mr-2" />
        Data Input
      </h3>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Student Assignments CSV:
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => handleFileChange(e, 'student')}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
          />
          {state.studentData.length > 0 && (
            <div className="flex items-center mt-1 text-green-600 text-xs">
              <CheckCircle size={12} className="mr-1" />
              {state.studentData.length} students loaded
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Snapped Stops CSV:
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => handleFileChange(e, 'stops')}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
          />
          {state.stopsData.length > 0 && (
            <div className="flex items-center mt-1 text-green-600 text-xs">
              <CheckCircle size={12} className="mr-1" />
              {state.stopsData.length} stops loaded
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Depots CSV:
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => handleFileChange(e, 'depots')}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
          />
          {state.depotsData.length > 0 && (
            <div className="flex items-center mt-1 text-green-600 text-xs">
              <CheckCircle size={12} className="mr-1" />
              {state.depotsData.length} depots loaded
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;