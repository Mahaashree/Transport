// CSV processing logic from existing opti_v1.html
import Papa from 'papaparse';

// Parse CSV data (from existing code)
export const parseCSV = (file) => {
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
};

// Validate loaded data (from existing validateData function)
export const validateData = (studentData, stopsData, depotsData) => {
  // Validate student data
  if (!studentData.length || !studentData[0].student_lat) {
    throw new Error('Invalid student assignments data format');
  }
  
  // Validate stops data
  if (!stopsData.length || !stopsData[0].snapped_lat) {
    throw new Error('Invalid snapped stops data format');
  }
  
  // Validate depots data
  if (!depotsData.length || !depotsData[0].Latitude) {
    throw new Error('Invalid depots data format');
  }
  
  console.log(`Loaded ${studentData.length} students, ${stopsData.length} stops, ${depotsData.length} depots`);
};

// Update metrics display (from existing updateMetrics function)
export const calculateMetrics = (studentData, stopsData, depotsData, busCapacity) => {
  const totalStudents = studentData.length;
  const requiredBuses = Math.ceil(totalStudents / busCapacity);
  
  return {
    totalStudents: totalStudents,
    requiredBuses: requiredBuses,
    totalStops: stopsData.length,
    totalDepots: depotsData.length
  };
};
