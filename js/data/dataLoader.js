// Data loading and parsing functionality

// Parse CSV data
function parseCSV(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    reject(results.errors);
                } else {
                    resolve(results.data);
                }
            },
            error: reject
        });
    });
}

// Load and process data
async function loadData() {
    try {
        const studentFile = document.getElementById('studentFile').files[0];
        const stopsFile = document.getElementById('stopsFile').files[0];
        const depotsFile = document.getElementById('depotsFile').files[0];
        
        if (!studentFile || !stopsFile || !depotsFile) {
            showStatus('Please select all required CSV files', 'error');
            return;
        }
        
        showStatus('Loading and processing data...', 'info');
        
        // Parse CSV files and assign to global variables
        window.studentData = await parseCSV(studentFile);
        window.stopsData = await parseCSV(stopsFile);
        window.depotsData = await parseCSV(depotsFile);
        
        // Also assign to non-window global variables for backward compatibility
        studentData = window.studentData;
        stopsData = window.stopsData;
        depotsData = window.depotsData;
        
        console.log('Data loaded:', {
            students: window.studentData.length,
            stops: window.stopsData.length,
            depots: window.depotsData.length
        });
        
        // Validate and process data
        validateData();
        updateMetrics();
        
        document.getElementById('optimizeBtn').disabled = false;
        showStatus('Data loaded successfully! Ready for optimization.', 'success');
        
        // Initialize map if not already done
        if (typeof initMap === 'function') {
            initMap();
        }
        
        // Auto-visualize data after loading
        visualizeData();
        
    } catch (error) {
        showStatus(`Error loading data: ${error.message || error}`, 'error');
        console.error('Data loading error:', error);
    }
}