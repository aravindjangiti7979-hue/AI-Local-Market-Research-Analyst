import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  MapPin,
  Navigation,
  ZoomIn,
  ZoomOut,
  Filter,
  Layers,
  Target,
  Building,
  Star,
  Users,
  DollarSign,
  Clock,
  TrendingUp,
  X,
  Maximize2,
  Minimize2,
  Download,
  Share2,
  Info,
  Search,
  Loader,
} from 'lucide-react';

// CORRECTED map tile providers with working URLs
const MAP_STYLES = {
  streets: {
    name: 'Streets',
    url: 'https://tiles.openfreemap.org/styles/positron',
    attribution: '© OpenFreeMap'
  },
  satellite: {
    name: 'Satellite',
    // Using OpenStreetMap satellite layer (free, no key required)
    url: 'https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}.jpg',
    attribution: '© Stamen Design'
  },
  terrain: {
    name: 'Terrain',
    url: 'https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}.png',
    attribution: '© Stamen Design'
  },
  dark: {
    name: 'Dark',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png',
    attribution: '© Stamen Design'
  },
  light: {
    name: 'Light',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png',
    attribution: '© Stamen Design'
  }
};

const MarketMap = ({
  businesses = [],
  center = { lat: 40.7128, lng: -74.0060 },
  zoom = 12,
  onMarkerClick,
  isLoading = false,
  filters = {},
  onFilterChange,
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  
  const [mapZoom, setMapZoom] = useState(zoom);
  const [mapCenter, setMapCenter] = useState(center);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [viewMode, setViewMode] = useState('individual');
  const [showFilters, setShowFilters] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapStyle, setMapStyle] = useState('streets');
  const [hoveredBusiness, setHoveredBusiness] = useState(null);
  const [showLegend, setShowLegend] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const containerRef = useRef(null);

  // Filter businesses based on filters
  const filteredBusinesses = useCallback(() => {
    return businesses.filter(business => {
      if (filters.minRating && (business.rating || 0) < parseFloat(filters.minRating)) return false;
      if (filters.minReviews && (business.review_count || 0) < parseInt(filters.minReviews)) return false;
      if (filters.priceLevel && (business.price_level || 1) !== parseInt(filters.priceLevel)) return false;
      return true;
    });
  }, [businesses, filters]);

  const visibleBusinesses = filteredBusinesses();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLES[mapStyle].url,
      center: [mapCenter.lng, mapCenter.lat],
      zoom: mapZoom,
      attributionControl: true
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(new maplibregl.FullscreenControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    map.current.on('move', () => {
      const newCenter = map.current.getCenter();
      const newZoom = map.current.getZoom();
      setMapCenter({ lat: newCenter.lat, lng: newCenter.lng });
      setMapZoom(newZoom);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update map style when changed
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    map.current.setStyle(MAP_STYLES[mapStyle].url);
  }, [mapStyle, mapLoaded]);

  // Update markers when businesses change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove old markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers with labels
    visibleBusinesses.forEach((business) => {
      if (!business.latitude || !business.longitude) return;

      // Create container for marker and label
      const container = document.createElement('div');
      container.style.position = 'relative';
      container.style.cursor = 'pointer';
      
      // Create marker element
      const markerEl = document.createElement('div');
      markerEl.style.width = '30px';
      markerEl.style.height = '30px';
      markerEl.style.borderRadius = '50%';
      markerEl.style.backgroundColor = getRatingColor(business.rating);
      markerEl.style.border = '2px solid white';
      markerEl.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
      markerEl.style.transition = 'all 0.2s ease';
      markerEl.style.position = 'relative';
      markerEl.style.zIndex = '10';

      // Add rating star for high-rated businesses
      if (business.rating >= 4.5) {
        const star = document.createElement('div');
        star.innerHTML = '★';
        star.style.position = 'absolute';
        star.style.top = '50%';
        star.style.left = '50%';
        star.style.transform = 'translate(-50%, -50%)';
        star.style.color = 'white';
        star.style.fontSize = '14px';
        star.style.fontWeight = 'bold';
        markerEl.appendChild(star);
      }

      // Add review count badge for popular businesses
      if (business.review_count > 100) {
        const badge = document.createElement('div');
        badge.innerHTML = business.review_count > 500 ? '🔥' : '👍';
        badge.style.position = 'absolute';
        badge.style.top = '-5px';
        badge.style.right = '-5px';
        badge.style.width = '16px';
        badge.style.height = '16px';
        badge.style.borderRadius = '50%';
        badge.style.backgroundColor = '#f59e0b';
        badge.style.color = 'white';
        badge.style.fontSize = '10px';
        badge.style.display = 'flex';
        badge.style.alignItems = 'center';
        badge.style.justifyContent = 'center';
        markerEl.appendChild(badge);
      }

      // Create label element (business name)
      const labelEl = document.createElement('div');
      labelEl.innerHTML = business.name;
      labelEl.style.position = 'absolute';
      labelEl.style.top = '35px'; // Position below marker
      labelEl.style.left = '50%';
      labelEl.style.transform = 'translateX(-50%)';
      labelEl.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
      labelEl.style.color = '#1f2937';
      labelEl.style.padding = '4px 8px';
      labelEl.style.borderRadius = '4px';
      labelEl.style.fontSize = '12px';
      labelEl.style.fontWeight = '500';
      labelEl.style.whiteSpace = 'nowrap';
      labelEl.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
      labelEl.style.border = '1px solid #e5e7eb';
      labelEl.style.zIndex = '20';
      labelEl.style.pointerEvents = 'none'; // Don't block clicks
      labelEl.style.maxWidth = '150px';
      labelEl.style.overflow = 'hidden';
      labelEl.style.textOverflow = 'ellipsis';

      // Add hover effect
      labelEl.style.transition = 'all 0.2s ease';
      labelEl.style.opacity = '0.9';
      
      container.appendChild(markerEl);
      container.appendChild(labelEl);

      // Add hover effects to show/hide label more prominently
      container.addEventListener('mouseenter', () => {
        markerEl.style.transform = 'scale(1.2)';
        labelEl.style.opacity = '1';
        labelEl.style.backgroundColor = 'white';
        labelEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        setHoveredBusiness(business);
      });

      container.addEventListener('mouseleave', () => {
        markerEl.style.transform = 'scale(1)';
        labelEl.style.opacity = '0.9';
        labelEl.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        labelEl.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
        setHoveredBusiness(null);
      });

      // Create popup
      const popup = new maplibregl.Popup({ offset: [0, -30] }).setHTML(`
        <div style="padding: 12px; min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">
            ${business.name}
          </h3>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="display: flex; gap: 2px;">
              ${Array(5).fill(0).map((_, i) => `
                <span style="color: ${i < Math.round(business.rating || 0) ? '#f59e0b' : '#d1d5db'}">★</span>
              `).join('')}
            </div>
            <span style="font-size: 14px; color: #6b7280;">
              ${business.rating ? business.rating.toFixed(1) : 'N/A'}
            </span>
          </div>
          <div style="font-size: 14px; color: #4b5563; margin-bottom: 4px;">
            📍 ${business.address || 'Address not available'}
          </div>
          <div style="font-size: 14px; color: #4b5563; margin-bottom: 8px;">
            💬 ${business.review_count?.toLocaleString() || 0} reviews
          </div>
          <button 
            onclick="window.dispatchEvent(new CustomEvent('selectBusiness', {detail: ${JSON.stringify(business)}}))"
            style="width: 100%; padding: 8px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer;"
          >
            View Details
          </button>
        </div>
      `);

      // Create marker with custom element
      const marker = new maplibregl.Marker({ 
        element: container,
        offset: [0, -15] // Adjust offset to account for label
      })
        .setLngLat([business.longitude, business.latitude])
        .setPopup(popup)
        .addTo(map.current);

      markersRef.current.push(marker);
    });

    // Listen for business selection from popup
    const handleSelectBusiness = (e) => {
      setSelectedBusiness(e.detail);
      if (onMarkerClick) onMarkerClick(e.detail);
    };

    window.addEventListener('selectBusiness', handleSelectBusiness);
    return () => window.removeEventListener('selectBusiness', handleSelectBusiness);
  }, [visibleBusinesses, mapLoaded]);

  // Get color based on rating
  const getRatingColor = (rating) => {
    if (!rating) return '#94a3b8';
    if (rating >= 4.5) return '#10b981';
    if (rating >= 4.0) return '#3b82f6';
    if (rating >= 3.5) return '#f59e0b';
    if (rating >= 3.0) return '#f97316';
    return '#ef4444';
  };

  // Handle zoom
  const handleZoomIn = () => {
    if (map.current) map.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (map.current) map.current.zoomOut();
  };

  // Handle center map
  const handleCenterMap = () => {
    if (visibleBusinesses.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      visibleBusinesses.forEach(b => {
        if (b.longitude && b.latitude) {
          bounds.extend([b.longitude, b.latitude]);
        }
      });
      map.current.fitBounds(bounds, { padding: 50 });
    } else {
      map.current.flyTo({
        center: [center.lng, center.lat],
        zoom: zoom
      });
    }
  };

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery) return;

    try {
      // Using Nominatim geocoder (free, no key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        map.current.flyTo({
          center: [lng, lat],
          zoom: 14
        });
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Export map data
  const handleExport = () => {
    const dataStr = JSON.stringify(visibleBusinesses, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `market-map-data-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-12 flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto mb-3 animate-pulse" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`glass-card rounded-xl overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
    >
      {/* COMPLETELY SCROLLABLE HEADER - EVERYTHING NOW SCROLLS */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        {/* Single scrollable container for ALL header content */}
        <div className="overflow-x-auto pb-2 hide-scrollbar">
          <div className="flex items-center gap-6 min-w-max">
            {/* Title and Stats Section */}
            <div className="flex-shrink-0">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap">
                Market Map
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {visibleBusinesses.length} businesses
                </p>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {markersRef.current.length} markers
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-10 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />

            {/* Search */}
            <div className="relative flex-shrink-0">
              <input
                type="text"
                placeholder="Search location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="input-field text-sm py-1.5 pl-8 pr-3 rounded-lg w-48"
              />
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>

            {/* Map Style Selector */}
            <select
              value={mapStyle}
              onChange={(e) => setMapStyle(e.target.value)}
              className="input-field text-sm py-1.5 px-3 rounded-lg flex-shrink-0"
            >
              {Object.entries(MAP_STYLES).map(([key, style]) => (
                <option key={key} value={key}>{style.name}</option>
              ))}
            </select>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary flex items-center px-3 py-1.5 whitespace-nowrap flex-shrink-0 ${
                showFilters ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {Object.keys(filters).length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                  {Object.keys(filters).length}
                </span>
              )}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="btn-secondary p-2 flex-shrink-0"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Filters Panel (separate, not scrollable) */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 overflow-hidden"
            >
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Minimum Rating
                    </label>
                    <select
                      className="input-field w-full"
                      value={filters.minRating || ''}
                      onChange={(e) => onFilterChange?.('minRating', e.target.value)}
                    >
                      <option value="">Any</option>
                      <option value="4.5">4.5+ Stars</option>
                      <option value="4.0">4.0+ Stars</option>
                      <option value="3.5">3.5+ Stars</option>
                      <option value="3.0">3.0+ Stars</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Minimum Reviews
                    </label>
                    <select
                      className="input-field w-full"
                      value={filters.minReviews || ''}
                      onChange={(e) => onFilterChange?.('minReviews', e.target.value)}
                    >
                      <option value="">Any</option>
                      <option value="10">10+ reviews</option>
                      <option value="50">50+ reviews</option>
                      <option value="100">100+ reviews</option>
                      <option value="500">500+ reviews</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Price Level
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((level) => (
                        <button
                          key={level}
                          onClick={() => onFilterChange?.('priceLevel', level === filters.priceLevel ? '' : level)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                            filters.priceLevel == level
                              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          {'$'.repeat(level)}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        onFilterChange?.('reset', true);
                        setShowFilters(false);
                      }}
                      className="w-full btn-secondary py-2"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Map Container */}
      <div className="relative p-4 bg-gray-900">
        <div 
          ref={mapContainer}
          className="w-full h-[600px] rounded-xl overflow-hidden"
        />

        {/* Map Controls */}
        <div className="absolute top-8 right-8 flex flex-col gap-2">
          <button
            onClick={handleZoomIn}
            className="w-10 h-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-900 transition-all border border-gray-200 dark:border-gray-700"
            title="Zoom in"
          >
            <ZoomIn className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-10 h-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-900 transition-all border border-gray-200 dark:border-gray-700"
            title="Zoom out"
          >
            <ZoomOut className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <button
            onClick={handleCenterMap}
            className="w-10 h-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-900 transition-all border border-gray-200 dark:border-gray-700"
            title="Center map"
          >
            <Target className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Legend */}
        <AnimatePresence>
          {showLegend && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute bottom-8 left-8 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl p-5 shadow-xl border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  Legend
                </h4>
                <button
                  onClick={() => setShowLegend(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-lg" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">4.5+ Rating</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-blue-500 shadow-lg" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">4.0+ Rating</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-amber-500 shadow-lg" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">3.5+ Rating</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-orange-500 shadow-lg" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">3.0+ Rating</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-red-500 shadow-lg" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Below 3.0</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Show Legend button */}
        {!showLegend && (
          <button
            onClick={() => setShowLegend(true)}
            className="absolute bottom-8 left-8 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-900 transition-all"
          >
            Show Legend
          </button>
        )}
      </div>

      {/* Selected Business Panel */}
      <AnimatePresence>
        {selectedBusiness && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute right-6 top-6 bottom-6 w-96 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Header */}
            <div className="relative h-32 bg-gradient-to-br from-blue-500 to-purple-600 p-6">
              <button
                onClick={() => setSelectedBusiness(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute -bottom-8 left-6">
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-900 shadow-xl flex items-center justify-center">
                  <Building className="w-8 h-8 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="pt-12 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {selectedBusiness.name}
              </h3>
              
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedBusiness.address || 'Address not available'}
                </span>
              </div>

              {/* Rating Card */}
              <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 mb-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Customer Rating</span>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.round(selectedBusiness.rating || 0)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedBusiness.rating?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Based on {selectedBusiness.review_count?.toLocaleString() || 0} customer reviews
                </p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                  <Building className="w-4 h-4 text-blue-500 mb-2" />
                  <div className="text-xs text-gray-500 dark:text-gray-400">Type</div>
                  <div className="font-medium text-gray-900 dark:text-white capitalize">
                    {selectedBusiness.business_type || 'N/A'}
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                  <DollarSign className="w-4 h-4 text-green-500 mb-2" />
                  <div className="text-xs text-gray-500 dark:text-gray-400">Price</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {'$'.repeat(selectedBusiness.price_level || 1)}
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                  <Users className="w-4 h-4 text-purple-500 mb-2" />
                  <div className="text-xs text-gray-500 dark:text-gray-400">Popularity</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {selectedBusiness.review_count ? 
                      selectedBusiness.review_count > 500 ? 'High' :
                      selectedBusiness.review_count > 100 ? 'Medium' : 'Low'
                      : 'Unknown'
                    }
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                  <Clock className="w-4 h-4 text-amber-500 mb-2" />
                  <div className="text-xs text-gray-500 dark:text-gray-400">Status</div>
                  <div className="font-medium text-green-600 dark:text-green-400">Active</div>
                </div>
              </div>

              {/* Market Position */}
              <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Market Position
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Market Share</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedBusiness.market_share_estimate ? 
                          `${(selectedBusiness.market_share_estimate * 100).toFixed(1)}%` : 'N/A'
                        }
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(selectedBusiness.market_share_estimate || 0) * 100}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Strength Score</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedBusiness.strength_score ? 
                          `${selectedBusiness.strength_score}/10` : 'N/A'
                        }
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(selectedBusiness.strength_score || 0) * 10}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-600"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-b from-transparent to-white/80 dark:to-gray-900/80 backdrop-blur-sm">
              <div className="flex gap-3">
                <button className="flex-1 btn-primary py-2.5">
                  Full Analysis
                </button>
                <button className="btn-secondary p-2.5" onClick={handleExport}>
                  <Download className="w-5 h-5" />
                </button>
                <button className="btn-secondary p-2.5">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Stats */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {visibleBusinesses.length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total Businesses</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {visibleBusinesses.length > 0 ? 
                (visibleBusinesses.reduce((sum, b) => sum + (b.rating || 0), 0) / visibleBusinesses.length).toFixed(1) : '0.0'
              }
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Avg Rating</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {markersRef.current.length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Markers</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {visibleBusinesses.reduce((sum, b) => sum + (b.review_count || 0), 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total Reviews</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {mapZoom.toFixed(1)}x
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Zoom Level</div>
          </div>
        </div>

        {/* Attribution */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Info className="w-3 h-3" />
            <span>Map data © {MAP_STYLES[mapStyle].attribution}</span>
          </div>
        </div>
      </div>

      {/* Fullscreen close button */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="fixed top-4 right-4 z-[60] p-3 rounded-full bg-white dark:bg-gray-900 shadow-xl hover:shadow-2xl transition-all border border-gray-200 dark:border-gray-700"
        >
          <Minimize2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
      )}
    </div>
  );
};

export default MarketMap;