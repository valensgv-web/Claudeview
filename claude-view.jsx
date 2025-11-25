import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Search, Layers, Route, Compass, Maximize2, Minimize2, Star, Clock, Satellite, Map as MapIcon, Navigation2, AlertTriangle, Bell, BellOff, Shield, Cloud, CloudRain, Sun, Wind, Droplets, Eye, Gauge } from 'lucide-react';

export default function GPSMapApp() {
  const [userLocation, setUserLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapType, setMapType] = useState('standard');
  const [isTracking, setIsTracking] = useState(true);
  const [zoom, setZoom] = useState(13);
  const [bearing, setBearing] = useState(0);
  const [showRoute, setShowRoute] = useState(false);
  const [routeDistance, setRouteDistance] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [policeTraps, setPoliceTraps] = useState([]);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [activeAlert, setActiveAlert] = useState(null);
  const [notificationQueue, setNotificationQueue] = useState([]);
  const [weather, setWeather] = useState(null);
  const [showWeather, setShowWeather] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const mapRef = useRef(null);
  const audioRef = useRef(null);

  // Simulate getting user location
  useEffect(() => {
    if (navigator.geolocation && isTracking) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Fallback to default location (Naples, Florida)
          setUserLocation({ lat: 26.1420, lng: -81.7948 });
        }
      );
    } else {
      // Default location
      setUserLocation({ lat: 26.1420, lng: -81.7948 });
    }
  }, [isTracking]);

  // Generate random police traps along route
  useEffect(() => {
    if (userLocation) {
      // Simulate police trap data - in production, this would come from a crowdsourced API
      const generateTraps = () => {
        const traps = [];
        for (let i = 0; i < 3; i++) {
          traps.push({
            id: `trap-${i}`,
            lat: userLocation.lat + (Math.random() - 0.5) * 0.05,
            lng: userLocation.lng + (Math.random() - 0.5) * 0.05,
            type: Math.random() > 0.5 ? 'speed' : 'checkpoint',
            reportedBy: Math.floor(Math.random() * 50) + 10,
            timestamp: Date.now() - Math.random() * 3600000 // Random time in last hour
          });
        }
        return traps;
      };
      
      setPoliceTraps(generateTraps());
    }
  }, [userLocation]);

  // Monitor distance to police traps and trigger alerts
  useEffect(() => {
    if (userLocation && policeTraps.length > 0 && alertsEnabled && isTracking) {
      const checkDistance = () => {
        policeTraps.forEach(trap => {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            trap.lat,
            trap.lng
          );
          
          // Alert if within 2 miles (3.2 km)
          if (distance <= 3.2 && distance > 0.1) {
            const alertId = `alert-${trap.id}-${Math.floor(distance * 10)}`;
            
            // Check if we've already shown this alert
            if (!notificationQueue.includes(alertId)) {
              setActiveAlert({
                id: alertId,
                trap: trap,
                distance: distance.toFixed(1)
              });
              
              setNotificationQueue(prev => [...prev, alertId]);
              
              // Play alert sound
              playAlertSound();
              
              // Auto-dismiss after 8 seconds
              setTimeout(() => {
                setActiveAlert(null);
              }, 8000);
            }
          }
        });
      };
      
      checkDistance();
      const interval = setInterval(checkDistance, 5000); // Check every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [userLocation, policeTraps, alertsEnabled, isTracking, notificationQueue]);

  // Calculate distance between two points in km
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Play alert sound
  const playAlertSound = () => {
    // Create a simple beep using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  // Fetch weather data
  const fetchWeather = async (lat, lng) => {
    setWeatherLoading(true);
    try {
      // Using Open-Meteo API (free, no API key required)
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&timezone=auto`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Map weather codes to descriptions
        const weatherDescriptions = {
          0: { desc: 'Clear Sky', icon: '☀️' },
          1: { desc: 'Mainly Clear', icon: '🌤️' },
          2: { desc: 'Partly Cloudy', icon: '⛅' },
          3: { desc: 'Overcast', icon: '☁️' },
          45: { desc: 'Foggy', icon: '🌫️' },
          48: { desc: 'Foggy', icon: '🌫️' },
          51: { desc: 'Light Drizzle', icon: '🌦️' },
          53: { desc: 'Drizzle', icon: '🌦️' },
          55: { desc: 'Heavy Drizzle', icon: '🌧️' },
          61: { desc: 'Light Rain', icon: '🌧️' },
          63: { desc: 'Rain', icon: '🌧️' },
          65: { desc: 'Heavy Rain', icon: '⛈️' },
          71: { desc: 'Light Snow', icon: '🌨️' },
          73: { desc: 'Snow', icon: '❄️' },
          75: { desc: 'Heavy Snow', icon: '❄️' },
          77: { desc: 'Snow Grains', icon: '🌨️' },
          80: { desc: 'Light Showers', icon: '🌦️' },
          81: { desc: 'Showers', icon: '🌧️' },
          82: { desc: 'Heavy Showers', icon: '⛈️' },
          85: { desc: 'Light Snow Showers', icon: '🌨️' },
          86: { desc: 'Snow Showers', icon: '❄️' },
          95: { desc: 'Thunderstorm', icon: '⛈️' },
          96: { desc: 'Thunderstorm with Hail', icon: '⛈️' },
          99: { desc: 'Severe Thunderstorm', icon: '⛈️' }
        };
        
        const weatherCode = data.current.weather_code;
        const weatherInfo = weatherDescriptions[weatherCode] || { desc: 'Unknown', icon: '🌡️' };
        
        setWeather({
          temperature: Math.round(data.current.temperature_2m),
          feelsLike: Math.round(data.current.apparent_temperature),
          humidity: data.current.relative_humidity_2m,
          precipitation: data.current.precipitation,
          windSpeed: Math.round(data.current.wind_speed_10m),
          windDirection: data.current.wind_direction_10m,
          description: weatherInfo.desc,
          icon: weatherInfo.icon,
          code: weatherCode
        });
      }
    } catch (error) {
      console.error('Error fetching weather:', error);
      // Fallback to mock data
      setWeather({
        temperature: 75,
        feelsLike: 78,
        humidity: 65,
        precipitation: 0,
        windSpeed: 8,
        windDirection: 180,
        description: 'Partly Cloudy',
        icon: '⛅',
        code: 2
      });
    } finally {
      setWeatherLoading(false);
    }
  };

  // Fetch weather when location changes
  useEffect(() => {
    if (userLocation && showWeather) {
      fetchWeather(userLocation.lat, userLocation.lng);
    }
  }, [userLocation, showWeather]);

  const handleSearch = (query) => {
    if (query.trim()) {
      // Simulate geocoding - in production, use Google Maps Geocoding API
      const mockDestination = {
        lat: userLocation.lat + (Math.random() - 0.5) * 0.1,
        lng: userLocation.lng + (Math.random() - 0.5) * 0.1,
        name: query
      };
      setDestination(mockDestination);
      setShowRoute(true);
      
      // Calculate mock distance
      const distance = Math.sqrt(
        Math.pow(mockDestination.lat - userLocation.lat, 2) +
        Math.pow(mockDestination.lng - userLocation.lng, 2)
      ) * 111; // rough km conversion
      setRouteDistance(distance.toFixed(2));
      
      // Add to recent searches
      if (!recentSearches.includes(query)) {
        setRecentSearches([query, ...recentSearches.slice(0, 4)]);
      }
    }
  };

  const addToFavorites = (location) => {
    if (!favorites.find(f => f.name === location.name)) {
      setFavorites([...favorites, location]);
    }
  };

  const calculateBearing = () => {
    if (userLocation && destination) {
      const dLng = destination.lng - userLocation.lng;
      const y = Math.sin(dLng) * Math.cos(destination.lat);
      const x = Math.cos(userLocation.lat) * Math.sin(destination.lat) -
                Math.sin(userLocation.lat) * Math.cos(destination.lat) * Math.cos(dLng);
      const bearing = Math.atan2(y, x) * 180 / Math.PI;
      setBearing((bearing + 360) % 360);
    }
  };

  useEffect(() => {
    if (showRoute && userLocation && destination) {
      calculateBearing();
    }
  }, [userLocation, destination, showRoute]);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      margin: 0,
      padding: 0,
      fontFamily: '"DM Sans", -apple-system, sans-serif',
      background: '#0a0e27',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Map Background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: mapType === 'satellite' 
          ? 'linear-gradient(180deg, #8fb3db 0%, #8fb3db 50%, #f08fa3 50%, #f08fa3 100%)'
          : mapType === 'terrain'
          ? 'linear-gradient(180deg, #b5d4f0 0%, #b5d4f0 50%, #f7b8c6 50%, #f7b8c6 100%)'
          : 'linear-gradient(180deg, #a8c5e8 0%, #a8c5e8 50%, #f4a5b5 50%, #f4a5b5 100%)',
        transition: 'background 0.5s ease'
      }}>
        {/* Weather overlay */}
        {showWeather && weather && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: weather.code >= 61 && weather.code <= 82
              ? 'linear-gradient(180deg, rgba(100, 149, 237, 0.15) 0%, transparent 50%)'
              : weather.code >= 71 && weather.code <= 86
              ? 'linear-gradient(180deg, rgba(230, 230, 250, 0.2) 0%, transparent 50%)'
              : weather.code >= 95
              ? 'linear-gradient(180deg, rgba(75, 0, 130, 0.15) 0%, transparent 50%)'
              : 'none',
            pointerEvents: 'none'
          }}>
            {/* Animated weather effects */}
            {weather.code >= 61 && weather.code <= 82 && (
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'linear-gradient(transparent 0%, transparent 50%, rgba(100, 149, 237, 0.1) 50%, rgba(100, 149, 237, 0.1) 100%)',
                backgroundSize: '2px 20px',
                animation: 'rain 1s linear infinite'
              }} />
            )}
          </div>
        )}
        
        {/* Grid overlay for map effect */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.4
        }} />
        
        {/* Roads overlay */}
        {showRoute && userLocation && destination && (
          <svg style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
          }}>
            <defs>
              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0099ff" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <line
              x1="50%"
              y1="50%"
              x2={`${50 + (destination.lng - userLocation.lng) * 1000}%`}
              y2={`${50 + (destination.lat - userLocation.lat) * 1000}%`}
              stroke="url(#routeGradient)"
              strokeWidth="4"
              strokeDasharray="10,5"
              style={{
                filter: 'drop-shadow(0 0 8px rgba(0, 212, 255, 0.6))',
                animation: 'dashAnimation 1s linear infinite'
              }}
            />
          </svg>
        )}
        
        {/* User location marker */}
        {userLocation && (
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 20
          }}>
            <div style={{
              position: 'relative',
              width: '24px',
              height: '24px',
              background: 'linear-gradient(135deg, #00d4ff 0%, #0099ff 100%)',
              borderRadius: '50%',
              border: '4px solid white',
              boxShadow: '0 4px 16px rgba(0, 153, 255, 0.5), 0 0 0 8px rgba(0, 212, 255, 0.2)',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              {isTracking && (
                <div style={{
                  position: 'absolute',
                  inset: -16,
                  borderRadius: '50%',
                  border: '2px solid rgba(0, 212, 255, 0.3)',
                  animation: 'ripple 2s ease-out infinite'
                }} />
              )}
            </div>
          </div>
        )}
        
        {/* Police trap markers */}
        {policeTraps.map((trap) => {
          if (!userLocation) return null;
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            trap.lat,
            trap.lng
          );
          const isNearby = distance <= 3.2; // Within 2 miles
          
          return (
            <div
              key={trap.id}
              style={{
                position: 'absolute',
                left: `${50 + (trap.lng - userLocation.lng) * 1000}%`,
                top: `${50 + (trap.lat - userLocation.lat) * 1000}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 18
              }}
            >
              <div style={{
                position: 'relative',
                padding: '8px',
                background: isNearby 
                  ? 'linear-gradient(135deg, rgba(255, 71, 87, 0.95) 0%, rgba(255, 107, 107, 0.95) 100%)'
                  : 'rgba(255, 193, 7, 0.9)',
                borderRadius: '12px',
                border: '2px solid',
                borderColor: isNearby ? '#ff4757' : '#ffc107',
                boxShadow: isNearby 
                  ? '0 4px 16px rgba(255, 71, 87, 0.6), 0 0 0 4px rgba(255, 71, 87, 0.2)'
                  : '0 4px 16px rgba(255, 193, 7, 0.4)',
                animation: isNearby ? 'alertPulse 1s ease-in-out infinite' : 'none'
              }}>
                <Shield size={20} color="white" />
                {isNearby && (
                  <div style={{
                    position: 'absolute',
                    inset: -8,
                    borderRadius: '14px',
                    border: '2px solid rgba(255, 71, 87, 0.4)',
                    animation: 'alertRipple 2s ease-out infinite'
                  }} />
                )}
              </div>
              <div style={{
                marginTop: '6px',
                padding: '4px 8px',
                background: 'rgba(10, 14, 39, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: '6px',
                color: 'white',
                fontSize: '11px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                textAlign: 'center'
              }}>
                {distance.toFixed(1)} km
                <div style={{ fontSize: '9px', opacity: 0.7, marginTop: '2px' }}>
                  {trap.reportedBy} reports
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Destination marker */}
        {destination && (
          <div style={{
            position: 'absolute',
            left: `${50 + (destination.lng - userLocation.lng) * 1000}%`,
            top: `${50 + (destination.lat - userLocation.lat) * 1000}%`,
            transform: 'translate(-50%, -100%)',
            zIndex: 19
          }}>
            <MapPin size={40} color="#ff4757" fill="#ff4757" style={{
              filter: 'drop-shadow(0 4px 12px rgba(255, 71, 87, 0.5))',
              animation: 'bounce 1s ease-in-out infinite'
            }} />
            <div style={{
              marginTop: '8px',
              padding: '6px 12px',
              background: 'rgba(10, 14, 39, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '13px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              {destination.name}
            </div>
          </div>
        )}
      </div>

      {/* Control Panel */}
      {showPanel && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          width: '360px',
          maxHeight: 'calc(100vh - 40px)',
          background: 'rgba(10, 14, 39, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          zIndex: 30,
          animation: 'slideInLeft 0.4s ease-out'
        }}>
          {/* Header */}
          <div style={{
            padding: '24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(0, 153, 255, 0.1) 100%)'
          }}>
            <h1 style={{
              margin: '0 0 8px 0',
              fontSize: '24px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #00d4ff 0%, #0099ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.5px'
            }}>
              GPS Navigator
            </h1>
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.6)',
              fontWeight: '500'
            }}>
              Explore & Navigate
            </p>
          </div>

          {/* Search Bar */}
          <div style={{ padding: '20px' }}>
            <div style={{
              position: 'relative',
              marginBottom: '16px'
            }}>
              <Search size={18} style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255, 255, 255, 0.4)',
                pointerEvents: 'none'
              }} />
              <input
                type="text"
                placeholder="Search for places..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchQuery);
                    setSearchQuery('');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 48px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  outline: 'none',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.target.style.borderColor = 'rgba(0, 212, 255, 0.5)';
                }}
                onBlur={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              />
            </div>

            {/* Quick Actions */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px',
              marginBottom: '20px'
            }}>
              {[
                { icon: Navigation, label: 'Track', action: () => setIsTracking(!isTracking), active: isTracking },
                { icon: Route, label: 'Route', action: () => setShowRoute(!showRoute), active: showRoute },
                { icon: alertsEnabled ? Bell : BellOff, label: 'Alerts', action: () => setAlertsEnabled(!alertsEnabled), active: alertsEnabled },
                { icon: Star, label: 'Save', action: () => destination && addToFavorites(destination) }
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={item.action}
                  style={{
                    padding: '14px',
                    background: item.active 
                      ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(0, 153, 255, 0.2) 100%)'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid',
                    borderColor: item.active ? 'rgba(0, 212, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: item.active ? '#00d4ff' : 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = item.active 
                      ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.3) 0%, rgba(0, 153, 255, 0.3) 100%)'
                      : 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = item.active 
                      ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(0, 153, 255, 0.2) 100%)'
                      : 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <item.icon size={20} />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Route Info */}
            {showRoute && destination && routeDistance && (
              <div style={{
                padding: '16px',
                background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(0, 153, 255, 0.1) 100%)',
                borderRadius: '12px',
                border: '1px solid rgba(0, 212, 255, 0.2)',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', fontWeight: '600' }}>Distance</span>
                  <span style={{ color: '#00d4ff', fontSize: '18px', fontWeight: '700' }}>{routeDistance} km</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', fontWeight: '600' }}>Bearing</span>
                  <span style={{ color: '#00d4ff', fontSize: '18px', fontWeight: '700' }}>{Math.round(bearing)}°</span>
                </div>
              </div>
            )}

            {/* Police Traps Info */}
            {policeTraps.length > 0 && (
              <div style={{
                padding: '16px',
                background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 152, 0, 0.1) 100%)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                marginBottom: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <Shield size={18} color="#ffc107" />
                  <h3 style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#ffc107',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Police Traps Nearby
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {policeTraps.map((trap) => {
                    const distance = calculateDistance(
                      userLocation.lat,
                      userLocation.lng,
                      trap.lat,
                      trap.lng
                    );
                    const isNearby = distance <= 3.2;
                    
                    return (
                      <div
                        key={trap.id}
                        style={{
                          padding: '10px 12px',
                          background: isNearby 
                            ? 'rgba(255, 71, 87, 0.15)'
                            : 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid',
                          borderColor: isNearby 
                            ? 'rgba(255, 71, 87, 0.4)'
                            : 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: isNearby ? '#ff4757' : 'rgba(255, 255, 255, 0.9)',
                            marginBottom: '2px'
                          }}>
                            {trap.type === 'speed' ? '⚡ Speed Trap' : '🚓 Checkpoint'}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: 'rgba(255, 255, 255, 0.6)'
                          }}>
                            {trap.reportedBy} reports • {Math.floor((Date.now() - trap.timestamp) / 60000)}m ago
                          </div>
                        </div>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: '700',
                          color: isNearby ? '#ff4757' : '#ffc107'
                        }}>
                          {distance.toFixed(1)} km
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!alertsEnabled && (
                  <div style={{
                    marginTop: '12px',
                    padding: '8px 12px',
                    background: 'rgba(255, 71, 87, 0.1)',
                    border: '1px solid rgba(255, 71, 87, 0.3)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#ff4757',
                    textAlign: 'center',
                    fontWeight: '600'
                  }}>
                    ⚠️ Alerts are disabled
                  </div>
                )}
              </div>
            )}

            {/* Weather Info */}
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={() => {
                  setShowWeather(!showWeather);
                  if (!showWeather && userLocation && !weather) {
                    fetchWeather(userLocation.lat, userLocation.lng);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: showWeather 
                    ? 'linear-gradient(135deg, rgba(100, 149, 237, 0.2) 0%, rgba(135, 206, 235, 0.2) 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid',
                  borderColor: showWeather ? 'rgba(100, 149, 237, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: showWeather ? '#6495ed' : 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '14px',
                  fontWeight: '600',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = showWeather 
                    ? 'linear-gradient(135deg, rgba(100, 149, 237, 0.3) 0%, rgba(135, 206, 235, 0.3) 100%)'
                    : 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = showWeather 
                    ? 'linear-gradient(135deg, rgba(100, 149, 237, 0.2) 0%, rgba(135, 206, 235, 0.2) 100%)'
                    : 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Cloud size={20} />
                  <span>Weather Updates</span>
                </div>
                {weather && !weatherLoading && (
                  <span style={{ fontSize: '18px' }}>{weather.icon}</span>
                )}
              </button>

              {showWeather && (
                <div style={{
                  marginTop: '12px',
                  padding: '16px',
                  background: 'linear-gradient(135deg, rgba(100, 149, 237, 0.15) 0%, rgba(135, 206, 235, 0.15) 100%)',
                  borderRadius: '12px',
                  border: '1px solid rgba(100, 149, 237, 0.3)',
                  animation: 'slideDown 0.3s ease-out'
                }}>
                  {weatherLoading ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '20px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '14px'
                    }}>
                      Loading weather data...
                    </div>
                  ) : weather ? (
                    <>
                      {/* Main temperature display */}
                      <div style={{
                        textAlign: 'center',
                        marginBottom: '16px',
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px'
                      }}>
                        <div style={{ fontSize: '48px', marginBottom: '8px' }}>
                          {weather.icon}
                        </div>
                        <div style={{
                          fontSize: '42px',
                          fontWeight: '800',
                          color: 'white',
                          marginBottom: '4px',
                          textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                        }}>
                          {weather.temperature}°F
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: 'rgba(255, 255, 255, 0.8)',
                          fontWeight: '600'
                        }}>
                          {weather.description}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.6)',
                          marginTop: '4px'
                        }}>
                          Feels like {weather.feelsLike}°F
                        </div>
                      </div>

                      {/* Weather details grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '10px'
                      }}>
                        {[
                          { icon: Droplets, label: 'Humidity', value: `${weather.humidity}%`, color: '#6495ed' },
                          { icon: Wind, label: 'Wind', value: `${weather.windSpeed} mph`, color: '#87ceeb' },
                          { icon: CloudRain, label: 'Precipitation', value: `${weather.precipitation} mm`, color: '#4682b4' },
                          { icon: Gauge, label: 'Direction', value: `${weather.windDirection}°`, color: '#5f9ea0' }
                        ].map((item, i) => (
                          <div
                            key={i}
                            style={{
                              padding: '12px',
                              background: 'rgba(255, 255, 255, 0.1)',
                              borderRadius: '10px',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <item.icon size={16} color={item.color} />
                              <span style={{
                                fontSize: '11px',
                                color: 'rgba(255, 255, 255, 0.7)',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                {item.label}
                              </span>
                            </div>
                            <div style={{
                              fontSize: '18px',
                              fontWeight: '700',
                              color: 'white'
                            }}>
                              {item.value}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Refresh button */}
                      <button
                        onClick={() => fetchWeather(userLocation.lat, userLocation.lng)}
                        style={{
                          width: '100%',
                          marginTop: '12px',
                          padding: '10px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          fontFamily: 'inherit'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        }}
                      >
                        🔄 Refresh Weather
                      </button>
                    </>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '20px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '14px'
                    }}>
                      Unable to load weather data
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <Clock size={16} color="rgba(255, 255, 255, 0.6)" />
                  <h3 style={{
                    margin: 0,
                    fontSize: '13px',
                    fontWeight: '700',
                    color: 'rgba(255, 255, 255, 0.6)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Recent
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recentSearches.map((search, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSearchQuery(search);
                        handleSearch(search);
                      }}
                      style={{
                        padding: '12px 14px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        color: 'rgba(255, 255, 255, 0.8)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '14px',
                        fontWeight: '500',
                        fontFamily: 'inherit'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      }}
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Favorites */}
            {favorites.length > 0 && (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <Star size={16} color="rgba(255, 212, 0, 0.8)" />
                  <h3 style={{
                    margin: 0,
                    fontSize: '13px',
                    fontWeight: '700',
                    color: 'rgba(255, 255, 255, 0.6)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Favorites
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {favorites.map((fav, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setDestination(fav);
                        setShowRoute(true);
                      }}
                      style={{
                        padding: '12px 14px',
                        background: 'rgba(255, 212, 0, 0.05)',
                        border: '1px solid rgba(255, 212, 0, 0.2)',
                        borderRadius: '10px',
                        color: 'rgba(255, 255, 255, 0.8)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '14px',
                        fontWeight: '500',
                        fontFamily: 'inherit'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 212, 0, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(255, 212, 0, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 212, 0, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255, 212, 0, 0.2)';
                      }}
                    >
                      {fav.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map Type Selector */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 30
      }}>
        {/* Weather widget - compact view */}
        {showWeather && weather && !weatherLoading && (
          <div style={{
            width: '200px',
            padding: '16px',
            background: 'rgba(10, 14, 39, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            border: '1px solid rgba(100, 149, 237, 0.3)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            animation: 'slideInRight 0.4s ease-out'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <div style={{
                fontSize: '36px',
                fontWeight: '800',
                color: 'white'
              }}>
                {weather.temperature}°
              </div>
              <div style={{ fontSize: '32px' }}>
                {weather.icon}
              </div>
            </div>
            <div style={{
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.8)',
              fontWeight: '600',
              marginBottom: '12px'
            }}>
              {weather.description}
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.7)'
              }}>
                <span>💧 Humidity</span>
                <span style={{ fontWeight: '600', color: 'white' }}>{weather.humidity}%</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.7)'
              }}>
                <span>💨 Wind</span>
                <span style={{ fontWeight: '600', color: 'white' }}>{weather.windSpeed} mph</span>
              </div>
            </div>
          </div>
        )}
        
        {[
          { type: 'standard', icon: MapIcon, label: 'Standard' },
          { type: 'satellite', icon: Satellite, label: 'Satellite' },
          { type: 'terrain', icon: Layers, label: 'Terrain' }
        ].map((item) => (
          <button
            key={item.type}
            onClick={() => setMapType(item.type)}
            style={{
              width: '56px',
              height: '56px',
              background: mapType === item.type 
                ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(0, 153, 255, 0.2) 100%)'
                : 'rgba(10, 14, 39, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid',
              borderColor: mapType === item.type ? 'rgba(0, 212, 255, 0.5)' : 'rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              color: mapType === item.type ? '#00d4ff' : 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              animation: `slideInRight 0.4s ease-out ${item.type === 'standard' ? '0s' : item.type === 'satellite' ? '0.1s' : '0.2s'}`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)';
            }}
            title={item.label}
          >
            <item.icon size={24} />
          </button>
        ))}
      </div>

      {/* Navigation Compass */}
      {showRoute && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100px',
          height: '100px',
          background: 'rgba(10, 14, 39, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '50%',
          border: '2px solid rgba(0, 212, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
          zIndex: 30,
          animation: 'fadeIn 0.5s ease-out'
        }}>
          <Navigation2
            size={48}
            color="#00d4ff"
            style={{
              transform: `rotate(${bearing}deg)`,
              transition: 'transform 0.5s ease-out',
              filter: 'drop-shadow(0 0 8px rgba(0, 212, 255, 0.6))'
            }}
          />
        </div>
      )}

      {/* Active Alert Notification */}
      {activeAlert && (
        <div style={{
          position: 'absolute',
          top: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          minWidth: '400px',
          maxWidth: '500px',
          background: 'linear-gradient(135deg, rgba(255, 71, 87, 0.98) 0%, rgba(255, 107, 107, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 20px 60px rgba(255, 71, 87, 0.6), 0 0 0 4px rgba(255, 71, 87, 0.2)',
          zIndex: 50,
          animation: 'alertSlideDown 0.5s ease-out, alertPulse 1s ease-in-out infinite',
          overflow: 'hidden'
        }}>
          {/* Alert Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'bounce 1s ease-in-out infinite'
            }}>
              <AlertTriangle size={28} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                margin: '0 0 4px 0',
                fontSize: '20px',
                fontWeight: '800',
                color: 'white',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
              }}>
                ⚠️ POLICE TRAP AHEAD
              </h3>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: '600'
              }}>
                Slow down and drive safely
              </p>
            </div>
            <button
              onClick={() => setActiveAlert(null)}
              style={{
                width: '32px',
                height: '32px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '20px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              ×
            </button>
          </div>

          {/* Alert Details */}
          <div style={{ padding: '24px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
              marginBottom: '16px'
            }}>
              <div style={{
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '32px',
                  fontWeight: '800',
                  color: 'white',
                  marginBottom: '4px',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                }}>
                  {activeAlert.distance} km
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Distance Ahead
                </div>
              </div>
              <div style={{
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '32px',
                  fontWeight: '800',
                  color: 'white',
                  marginBottom: '4px',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                }}>
                  {activeAlert.trap.type === 'speed' ? '⚡' : '🚓'}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {activeAlert.trap.type === 'speed' ? 'Speed Trap' : 'Checkpoint'}
                </div>
              </div>
            </div>
            <div style={{
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.95)',
              fontWeight: '600',
              textAlign: 'center'
            }}>
              📊 Reported by {activeAlert.trap.reportedBy} drivers
            </div>
          </div>

          {/* Animated progress bar */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'rgba(255, 255, 255, 0.3)',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              background: 'white',
              animation: 'progressBar 8s linear forwards',
              boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
            }} />
          </div>
        </div>
      )}

      {/* Zoom Controls */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 30
      }}>
        <button
          onClick={() => setZoom(Math.min(zoom + 1, 18))}
          style={{
            width: '56px',
            height: '56px',
            background: 'rgba(10, 14, 39, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: '700',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            fontFamily: 'inherit'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.5)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(10, 14, 39, 0.95)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          +
        </button>
        <button
          onClick={() => setZoom(Math.max(zoom - 1, 1))}
          style={{
            width: '56px',
            height: '56px',
            background: 'rgba(10, 14, 39, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: '700',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            fontFamily: 'inherit'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.5)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(10, 14, 39, 0.95)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          −
        </button>
      </div>

      {/* Panel Toggle */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        style={{
          position: 'absolute',
          top: '20px',
          left: showPanel ? '400px' : '20px',
          width: '56px',
          height: '56px',
          background: 'rgba(10, 14, 39, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          color: 'white',
          cursor: 'pointer',
          transition: 'all 0.3s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
          zIndex: 31
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)';
          e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(10, 14, 39, 0.95)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }}
      >
        {showPanel ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
      </button>

      {/* Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.9; }
        }
        
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2); opacity: 0; }
        }
        
        @keyframes bounce {
          0%, 100% { transform: translate(-50%, -100%) translateY(0); }
          50% { transform: translate(-50%, -100%) translateY(-10px); }
        }
        
        @keyframes dashAnimation {
          to { stroke-dashoffset: -15; }
        }
        
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) scale(0.9); }
          to { opacity: 1; transform: translateX(-50%) scale(1); }
        }
        
        @keyframes alertPulse {
          0%, 100% { 
            box-shadow: 0 20px 60px rgba(255, 71, 87, 0.6), 0 0 0 4px rgba(255, 71, 87, 0.2);
          }
          50% { 
            box-shadow: 0 20px 60px rgba(255, 71, 87, 0.8), 0 0 0 8px rgba(255, 71, 87, 0.4);
          }
        }
        
        @keyframes alertRipple {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        
        @keyframes alertSlideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        
        @keyframes progressBar {
          from { width: 100%; }
          to { width: 0%; }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes rain {
          from { background-position: 0 0; }
          to { background-position: 0 20px; }
        }
      `}</style>
    </div>
  );
}