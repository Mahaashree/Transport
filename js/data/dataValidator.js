// Data validation logic

// Validate loaded data
function validateData() {
    // Use window.stopsData instead of stopsData to ensure we're accessing the right variable
    const students = window.studentData || studentData || [];
    const stops = window.stopsData || stopsData || [];
    const depots = window.depotsData || depotsData || [];
    
    // Validate student data
    if (!students.length || !students[0].student_lat) {
        throw new Error('Invalid student assignments data format');
    }
    
    // Validate stops data
    if (!stops.length || !stops[0].snapped_lat) {
        throw new Error('Invalid snapped stops data format');
    }
    
    // Validate depots data
    if (!depots.length || !depots[0].Latitude) {
        throw new Error('Invalid depots data format');
    }
    
    console.log(`Loaded ${students.length} students, ${stops.length} stops, ${depots.length} depots`);
    
    // Log sample of stops data to verify structure
    console.log('Sample stop data:', stops[0]);
}
