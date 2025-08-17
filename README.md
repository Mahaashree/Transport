# College Bus Route Optimizer - React

A modern React application for optimizing college bus routes using Google Maps and the Google Route Optimization API.

## Features

- **Full-screen Google Maps** integration
- **Drag & drop CSV upload** for student assignments, stops, and depots
- **Real-time route optimization** with Google Route Optimization API
- **Interactive route selection** - toggle individual routes on/off
- **Modern UI** with floating controls and collapsible sidebar
- **Real-time metrics** display
- **Status notifications** with toast messages
- **Responsive design** with Tailwind CSS

## Tech Stack

- **React 18** with Vite
- **Google Maps API** for map visualization
- **Tailwind CSS** for styling
- **React Dropzone** for file uploads
- **PapaParse** for CSV processing
- **Lucide React** for icons
- **Context API** for state management

## Prerequisites

1. **Node.js** (version 16 or higher)
2. **Google Maps API Key** with Maps JavaScript API enabled
3. **Backend server** running (your existing `server.js`)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 3. Start the Backend Server

Make sure your backend server is running:

```bash
# In your original project directory
node server.js
```

### 4. Start the React Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3001`

## Usage

### 1. Upload Data

- **Drag & drop** or click to upload CSV files
- Supported files:
  - **Student Assignments**: Contains `student_lat`, `student_lon` columns
  - **Stops**: Contains `snapped_lat`, `snapped_lon`, `num_students`, `cluster_number` columns
  - **Depots**: Contains `Latitude`, `Longitude`, `Parking Name` columns

### 2. Optimize Routes

- Click **"Optimize Routes"** to generate optimized bus routes
- The system will:
  - Filter stops within 40km of the college
  - Call the Google Route Optimization API
  - Display results on the map

### 3. Route Selection

- Use the **collapsible sidebar** on the right to:
  - View all generated routes
  - Toggle individual routes on/off
  - See route details (students, stops, distance, efficiency)
  - Show/hide all routes

### 4. Map Interaction

- **Click markers** to see details
- **Click route lines** to see route information
- **Zoom and pan** to explore the map
- **Toggle routes** to focus on specific buses

## Project Structure

```
src/
├── components/
│   ├── Map/
│   │   ├── GoogleMap.jsx          # Main map component
│   │   ├── CollegeMarker.jsx      # College location marker
│   │   ├── StopMarker.jsx         # Bus stop markers
│   │   ├── DepotMarker.jsx        # Depot markers
│   │   └── RoutePolyline.jsx      # Route visualization
│   ├── Controls/
│   │   ├── FloatingControls.jsx   # Main control panel
│   │   ├── FileUpload.jsx         # File upload component
│   │   └── Sidebar.jsx            # Route selector sidebar
│   └── UI/
│       └── StatusToast.jsx        # Notification system
├── context/
│   └── OptimizationContext.jsx    # State management
├── services/
│   ├── optimizationService.js     # API calls and optimization logic
│   └── csvService.js              # CSV processing
└── App.jsx                        # Main application component
```

## Key Features

### Route Selector
- **Individual route toggles**: Click any route to show/hide it on the map
- **Bulk actions**: Show all routes or hide all routes
- **Visual feedback**: Selected routes are highlighted
- **Route details**: See efficiency, distance, time, and depot information

### Modern UI
- **Floating cards** with backdrop blur effects
- **Smooth animations** and transitions
- **Responsive design** that works on all screen sizes
- **Clean typography** and modern color scheme

### Real-time Updates
- **Live metrics** update as data is loaded
- **Status notifications** for all operations
- **Loading states** with spinners and progress indicators
- **Error handling** with user-friendly messages

## API Integration

The React app communicates with your existing backend server:

- **Proxy configuration**: API calls are proxied to `localhost:3000`
- **Same optimization logic**: All original business logic is preserved
- **Error handling**: Graceful fallbacks and user feedback

## Customization

### Colors and Styling
- Modify `tailwind.config.js` for theme colors
- Update route colors in `GoogleMap.jsx`
- Customize card styles in `index.css`

### Map Configuration
- Adjust map center and zoom in `GoogleMap.jsx`
- Modify marker styles and icons
- Add custom map controls

### Route Visualization
- Enhance polyline rendering in `RoutePolyline.jsx`
- Add route animations or effects
- Implement real-time route updates

## Troubleshooting

### Common Issues

1. **"Google Maps API key not found"**
   - Check your `.env` file has the correct API key
   - Ensure the API key has Maps JavaScript API enabled

2. **"Server connection failed"**
   - Make sure your backend server is running on port 3000
   - Check the proxy configuration in `vite.config.js`

3. **"CSV parsing errors"**
   - Verify your CSV files have the required columns
   - Check file encoding (should be UTF-8)

4. **"Routes not showing"**
   - Ensure optimization completed successfully
   - Check the route selector sidebar is open
   - Verify routes are selected in the sidebar

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the console for error messages
3. Verify your API keys and server configuration
