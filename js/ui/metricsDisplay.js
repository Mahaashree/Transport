// Metrics and results display

// Update metrics display
function updateMetrics() {
    const studentDataSource = window.studentData || studentData || [];
    const stopsDataSource = window.stopsData || stopsData || [];
    const depotsDataSource = window.depotsData || depotsData || [];
    
    const totalStudents = studentDataSource.length;
    const requiredBuses = Math.ceil(totalStudents / parseInt(document.getElementById('maxCapacity').value));
    
    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('requiredBuses').textContent = requiredBuses;
    document.getElementById('totalStops').textContent = stopsDataSource.length;
    document.getElementById('totalDepots').textContent = depotsDataSource.length;
    
    document.getElementById('metrics').style.display = 'grid';
    
    // Log metrics for debugging
    console.log('Updated metrics:', {
        students: totalStudents,
        buses: requiredBuses,
        stops: stopsDataSource.length,
        depots: depotsDataSource.length
    });
}
