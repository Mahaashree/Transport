import { OptimizationProvider } from './context/OptimizationContext';
import GoogleMap from './components/Map/GoogleMap';
import FloatingControls from './components/Controls/FloatingControls';
import Sidebar from './components/Controls/Sidebar';
import StatusDisplay from './components/UI/StatusDisplay';
import './index.css';

function App() {
  return (
    <OptimizationProvider>
      <div className="App relative w-full h-screen overflow-hidden">
        <GoogleMap />
        <FloatingControls />
        <Sidebar />
        <StatusDisplay />
      </div>
    </OptimizationProvider>
  );
}

export default App;
