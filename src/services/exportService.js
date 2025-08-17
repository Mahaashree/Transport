// Export logic from existing opti_v1.html
import Papa from 'papaparse';

export const exportToCSV = (routes, shiftTime, dayOfWeek) => {
  // Prepare export data (from existing exportResults function)
  const exportData = [];
  
  routes.forEach((route, routeIndex) => {
    route.stops.forEach((stop, stopIndex) => {
      exportData.push({
        bus_id: route.busId,
        depot: route.depot,
        route_sequence: stopIndex + 1,
        stop_cluster: stop.cluster_number,
        stop_lat: stop.snapped_lat,
        stop_lon: stop.snapped_lon,
        students_pickup: stop.num_students,
        road_type: stop.route_type,
        road_name: stop.route_name,
        total_students_in_bus: route.totalStudents,
        bus_efficiency: route.efficiency,
        shift_time: shiftTime,
        day_of_week: dayOfWeek
      });
    });
  });
  
  // Convert to CSV (from existing code)
  const csv = Papa.unparse(exportData);
  
  // Create download (from existing code)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `optimized_routes_${shiftTime}_${dayOfWeek}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
