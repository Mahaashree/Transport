// Zone-based routing UI management
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for zone-based toggle
    const zoneToggle = document.getElementById('useZoneBased');
    if (zoneToggle) {
        zoneToggle.addEventListener('change', function(e) {
            if (e.target.checked) {
                showStatus('✅ Zone-based routing enabled - eliminates loops and U-turns', 'success');
            } else {
                showStatus('⚠️ Using Google API - may create loops in complex areas', 'warning');
            }
        });
    }
});

// Get zone-based setting
function isZoneBasedEnabled() {
    const toggle = document.getElementById('useZoneBased');
    return toggle ? toggle.checked : true; // Default to true if toggle not found
}