function addImprovedRoutingControls() {
    const controlsSection = document.querySelector('.optimization-controls') || 
                           document.querySelector('#optimizationControls') ||
                           document.querySelector('.controls') ||
                           document.body;
    
    const controlsHTML = `
        <div class="routing-controls" style="margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <h4>🚌 Route Optimization Method</h4>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="radio" name="routingMethod" id="useClusterBased" value="cluster" checked>
                    <span><strong>Cluster-Based Routing</strong> (Recommended)</span>
                    <small style="color: #666; margin-left: 10px;">Groups nearby stops, eliminates loops</small>
                </label>
                <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="radio" name="routingMethod" id="useZoneBased" value="zone">
                    <span><strong>Zone-Based Routing</strong></span>
                    <small style="color: #666; margin-left: 10px;">Divides area into radial zones</small>
                </label>
                <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="radio" name="routingMethod" id="useGoogleAPI" value="google">
                    <span><strong>Google API Routing</strong></span>
                    <small style="color: #666; margin-left: 10px;">May create loops, use with caution</small>
                </label>
            </div>
        </div>
    `;
    
    // Remove old controls if they exist
    const oldControls = document.querySelector('.routing-controls');
    if (oldControls) oldControls.remove();
    
    controlsSection.insertAdjacentHTML('beforeend', controlsHTML);
    
    // Add event listeners
    document.querySelectorAll('input[name="routingMethod"]').forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'cluster') {
                showStatus('✅ Cluster-based routing selected - best for your data distribution', 'success');
            } else if (this.value === 'zone') {
                showStatus('✅ Zone-based routing selected - good for scattered stops', 'info');
            } else {
                showStatus('⚠️ Google API selected - may create loops in complex areas', 'warning');
            }
        });
    });
}
