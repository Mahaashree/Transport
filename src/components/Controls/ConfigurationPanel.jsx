import { Settings } from 'lucide-react';
import { useOptimization } from '../../context/OptimizationContext';

const ConfigurationPanel = () => {
  const { state, dispatch } = useOptimization();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-700 flex items-center">
        <Settings size={18} className="mr-2" />
        Configuration
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bus Capacity:
          </label>
          <input
            type="number"
            value={state.busCapacity}
            onChange={(e) => dispatch({ type: 'SET_BUS_CAPACITY', payload: parseInt(e.target.value) })}
            min="1"
            max="100"
            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Shift Time:
          </label>
          <select
            value={state.shiftTime}
            onChange={(e) => dispatch({ type: 'SET_SHIFT_TIME', payload: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="8am">8:00 AM</option>
            <option value="10am">10:00 AM</option>
            <option value="3pm">3:00 PM</option>
            <option value="5pm">5:00 PM</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Day of Week:
          </label>
          <select
            value={state.dayOfWeek}
            onChange={(e) => dispatch({ type: 'SET_DAY_OF_WEEK', payload: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="monday">Monday</option>
            <option value="tuesday">Tuesday</option>
            <option value="wednesday">Wednesday</option>
            <option value="thursday">Thursday</option>
            <option value="friday">Friday</option>
            <option value="saturday">Saturday</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationPanel;
