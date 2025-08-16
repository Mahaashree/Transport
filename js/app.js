// Main application controller

// Global variables for data storage
window.studentData = [];
window.stopsData = [];
window.depotsData = [];
window.map = null;
window.optimizationResults = [];
window.selectedRoute = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    
    // Add event listeners for real-time validation
    document.getElementById('maxCapacity').addEventListener('change', function() {
        if (studentData.length > 0) {
            updateMetrics();
        }
    });
    
    // API key is now hardcoded in the code
    
    showStatus('System initialized. Please load your CSV files to begin.', 'info');
});