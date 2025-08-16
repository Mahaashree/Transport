// Map initialization and management
window.map = null;  // Make map globally accessible

// Initialize map
function initMap() {
    if (window.map) return;
    
    window.map = L.map('map').setView(COLLEGE_COORDS, 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(window.map);
    
    // Add college marker
    L.marker(COLLEGE_COORDS, {
        icon: L.divIcon({
            html: '<i class="fas fa-university" style="color: #2d3748; font-size: 20px;"></i>',
            iconSize: [30, 30],
            className: 'college-icon'
        })
    }).addTo(window.map).bindPopup('<b>Rajalakshmi Engineering College</b><br>Starting Point');
}
