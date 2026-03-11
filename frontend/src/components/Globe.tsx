"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { X, MapPin, Loader2 } from 'lucide-react';

const GlobeGl = dynamic(() => import('react-globe.gl'), { ssr: false });

interface LocationData {
  lat: number;
  lng: number;
  name: string;
  color: string;
  type: 'origin' | 'target' | 'market';
  sub?: string;
  niche?: string;
  trend?: string;
}

interface MapInsight {
  text: string;
  links: { title: string; uri: string }[];
}

interface GlobeProps {
  onSelectCountry?: (countryName: string) => void;
  analysisLoading?: boolean;
  selectedTarget?: string | null;
}

const ORIGIN: LocationData = { 
  lat: 1.5535, 
  lng: 110.3593, 
  name: 'Malaysia', 
  sub: 'Terminal 42-A (Sarawak)', 
  color: '#00d4ff',
  type: 'origin', 
  niche: 'Raw Materials', 
  trend: 'Stable export volume' 
};

const POTENTIAL_MARKETS: LocationData[] = [
  { lat: -0.7893, lng: 113.9213, name: 'Indonesia', sub: 'Jakarta Port', color: '#00ff88', type: 'market', niche: 'Consumer Goods', trend: 'High demand for halal products' },
  { lat: 15.8700, lng: 100.9925, name: 'Thailand', sub: 'Bangkok Port', color: '#00ff88', type: 'market', niche: 'Agriculture Processing', trend: 'Seeking organic raw ingredients' },
  { lat: 12.8797, lng: 121.7740, name: 'Philippines', sub: 'Manila Port', color: '#00ff88', type: 'market', niche: 'Tech & Services', trend: 'Expanding service outsourcing' },
  { lat: 1.3521, lng: 103.8198, name: 'Singapore', sub: 'Jurong Port', color: '#00ff88', type: 'market', niche: 'Luxury Retail', trend: 'High spending on premium goods' },
  { lat: 4.5353, lng: 114.7277, name: 'Brunei', sub: 'Muara Port', color: '#00ff88', type: 'market', niche: 'Halal Food', trend: 'Consistent demand for basic necessities' },
  { lat: 16.0471, lng: 108.2062, name: 'Vietnam', sub: 'Da Nang Port', color: '#00ff88', type: 'market', niche: 'Manufacturing Hub', trend: 'Increasing demand for raw materials' },
  { lat: 35.6762, lng: 139.6503, name: 'Japan', niche: 'Premium Organic Matcha', trend: 'High demand for sustainable packaging', color: '#00ff88', type: 'market' },
  { lat: 51.5074, lng: -0.1278, name: 'United Kingdom', niche: 'Artisan Handicrafts', trend: 'Surge in eco-friendly home decor', color: '#00ff88', type: 'market' },
  { lat: -33.8688, lng: 151.2093, name: 'Australia', niche: 'Specialty Coffee Beans', trend: 'Growth in direct-trade imports', color: '#00ff88', type: 'market' },
  { lat: 37.7749, lng: -122.4194, name: 'United States', niche: 'Smart Home IoT', trend: 'Tariff exemptions for specific tech', color: '#00ff88', type: 'market' },
  { lat: 25.2048, lng: 55.2708, name: 'UAE', niche: 'Luxury Halal Cosmetics', trend: 'Booming premium beauty sector', color: '#00ff88', type: 'market' }
];

/* ── localStorage cache for maps grounding (24hr TTL) ── */
const MAPS_CACHE_KEY = 'pintar_maps_cache';
const MAPS_CACHE_TTL = 24 * 60 * 60 * 1000;

function getCachedMapInsight(country: string): MapInsight | null {
  try {
    const raw = localStorage.getItem(MAPS_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    const entry = cache[country];
    if (entry && Date.now() - entry.ts < MAPS_CACHE_TTL) return entry.data;
  } catch {}
  return null;
}

function setCachedMapInsight(country: string, data: MapInsight) {
  try {
    const raw = localStorage.getItem(MAPS_CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[country] = { data, ts: Date.now() };
    localStorage.setItem(MAPS_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Globe({ onSelectCountry, analysisLoading, selectedTarget }: GlobeProps) {
  const [countries, setCountries] = useState({ features: [] });
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 });
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [mapInsight, setMapInsight] = useState<MapInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const globeEl = useRef<any>(null);

  // Load GeoJSON
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
      .then(setCountries);
  }, []);

  // Initial setup
  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
      globeEl.current.pointOfView({ lat: 10, lng: 110, altitude: 1.8 });
    }
  }, [countries]);

  // Handle resize
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    window.addEventListener('resize', update);
    const timer = setTimeout(update, 200);
    return () => { window.removeEventListener('resize', update); clearTimeout(timer); };
  }, []);

  // Fetch maps grounding when a location is selected
  useEffect(() => {
    if (!selectedLocation) { setMapInsight(null); return; }
    
    const cached = getCachedMapInsight(selectedLocation.name);
    if (cached) { setMapInsight(cached); return; }

    setLoadingInsight(true);
    setMapInsight(null);
    
    // Try fetching from backend Gemini grounding
    fetch(`${API_URL}/api/compliance/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product: 'general trade logistics',
        origin: 'Sarawak',
        destination: selectedLocation.name,
      })
    })
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data) {
        const insight: MapInsight = {
          text: data.assessment || data.summary || `Key logistics intel for ${selectedLocation!.name}.`,
          links: data.grounding_sources || [],
        };
        setCachedMapInsight(selectedLocation!.name, insight);
        setMapInsight(insight);
      }
    })
    .catch(() => {})
    .finally(() => setLoadingInsight(false));
  }, [selectedLocation]);

  // Active markers
  const activeMarkers = useCallback(() => {
    let markers: LocationData[] = [ORIGIN];
    POTENTIAL_MARKETS.forEach(market => {
      if (selectedTarget && market.name === selectedTarget) {
        markers.push({ ...market, color: '#ff3366', type: 'target' });
      } else {
        markers.push(market);
      }
    });
    return markers;
  }, [selectedTarget]);

  // Active arcs
  const activeArcs = useCallback(() => {
    if (!selectedTarget) return [];
    const targetLoc = POTENTIAL_MARKETS.find(m => m.name === selectedTarget);
    if (!targetLoc) return [];
    return [{
      startLat: ORIGIN.lat,
      startLng: ORIGIN.lng,
      endLat: targetLoc.lat,
      endLng: targetLoc.lng,
      color: [ORIGIN.color, '#ff3366']
    }];
  }, [selectedTarget]);

  // Handle pin click — zoom and show card
  const handlePinClick = useCallback((loc: LocationData) => {
    setSelectedLocation(loc);
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = false;
      globeEl.current.pointOfView({ lat: loc.lat, lng: loc.lng, altitude: 0.8 }, 1000);
    }
  }, []);

  const handleClosePanel = () => {
    setSelectedLocation(null);
    setMapInsight(null);
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.pointOfView({ altitude: 1.8 }, 1000);
    }
  };

  return (
    <div ref={containerRef} className="relative flex items-center justify-center w-full h-full min-h-[500px] lg:min-h-[700px] cursor-grab active:cursor-grabbing">
      {/* Globe Atmospheric Glow */}
      <div className="absolute w-[420px] h-[420px] lg:w-[580px] lg:h-[580px] rounded-full border border-primary/20 blur-md pointer-events-none z-0"></div>
      <div className="absolute w-[440px] h-[440px] lg:w-[610px] lg:h-[610px] rounded-full border border-secondary/10 blur-xl pointer-events-none z-0"></div>
      
      <div className="z-10 absolute inset-0 flex items-center justify-center">
        {countries.features.length > 0 && (
          <GlobeGl
            ref={globeEl}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="rgba(0,0,0,0)"
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
            polygonsData={countries.features}
            polygonAltitude={0.01}
            polygonCapColor={() => 'rgba(20, 10, 30, 0.6)'}
            polygonSideColor={() => 'rgba(0, 0, 0, 0)'}
            polygonStrokeColor={() => 'rgba(0, 242, 255, 0.3)'}
            arcsData={activeArcs()}
            arcColor="color"
            arcDashLength={0.1}
            arcDashGap={0.05}
            arcDashAnimateTime={2000}
            arcAltitude={0.2}
            arcStroke={1.5}
            htmlElementsData={activeMarkers()}
            htmlElement={(d: any) => {
              const el = document.createElement('div');
              el.className = 'pin-marker';
              el.style.setProperty('--pin-color', d.color);
              
              el.innerHTML = `
                <svg width="28" height="28" viewBox="0 0 24 24" fill="${d.color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3" fill="white"></circle>
                </svg>
                <div class="pin-tooltip">
                  ${d.name}
                </div>
              `;
              
              el.onclick = () => handlePinClick(d);
              
              return el;
            }}
            htmlTransitionDuration={250}
          />
        )}
      </div>

      {/* Selected Location Card (Click Details) */}
      {selectedLocation && (
        <div className="absolute top-4 right-4 z-50 cyber-panel p-6 w-72 border-t-4 shadow-2xl transition-all duration-300" style={{ borderTopColor: selectedLocation.color, background: 'rgba(5, 5, 5, 0.95)' }}>
          <button 
            className="absolute top-3 right-3 text-primary/50 hover:text-primary transition-colors cursor-pointer"
            onClick={handleClosePanel}
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3" style={{ backgroundColor: selectedLocation.color, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}></div>
            <h3 className="font-bold text-white text-lg uppercase tracking-widest">{selectedLocation.name}</h3>
          </div>
          
          <p className="text-[10px] text-primary/60 mb-4 uppercase tracking-wider font-bold font-mono border-b border-white/10 pb-2">
            {selectedLocation.type === 'origin' ? 'MSME Location (From)' : 
             selectedLocation.type === 'target' ? 'Current Target (To)' : 'Potential Market'}
          </p>
          
          {selectedLocation.sub && (
            <div className="mb-3">
              <p className="text-[10px] text-primary/50 uppercase tracking-wider mb-1 font-mono">Facility</p>
              <p className="text-sm text-white font-mono">{selectedLocation.sub}</p>
            </div>
          )}

          {selectedLocation.niche && (
            <div className="mb-3">
              <p className="text-[10px] text-primary/50 uppercase tracking-wider mb-1 font-mono">Niche Market</p>
              <p className="text-sm text-white font-medium font-mono">{selectedLocation.niche}</p>
            </div>
          )}
          
          {selectedLocation.trend && (
            <div className="mb-4">
              <p className="text-[10px] text-primary/50 uppercase tracking-wider mb-1 font-mono">Current Trend</p>
              <p className="text-xs text-white/80 leading-relaxed font-mono">{selectedLocation.trend}</p>
            </div>
          )}

          {/* Live Maps Grounding Section */}
          {loadingInsight ? (
            <div className="mb-4 p-3 bg-primary/5 border border-primary/20" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
              <div className="h-2 skeleton-bone w-3/4 mb-2"></div>
              <div className="h-2 skeleton-bone w-1/2"></div>
            </div>
          ) : mapInsight ? (
            <div className="mb-4 p-3 bg-secondary/10 border border-secondary/30" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
              <p className="text-[10px] text-secondary uppercase tracking-wider mb-1 flex items-center gap-1 font-bold font-mono">
                <MapPin size={10} /> Live Maps Grounding
              </p>
              <p className="text-xs text-white/80 leading-relaxed mb-2 font-mono">{mapInsight.text}</p>
              {mapInsight.links.length > 0 && (
                <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-secondary/20">
                  {mapInsight.links.slice(0, 4).map((link, idx) => (
                    <a key={idx} href={link.uri} target="_blank" rel="noreferrer" className="text-[10px] text-secondary hover:underline truncate font-mono">
                      ↗ {link.title || link.uri}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* Simulate Export Button */}
          {(selectedLocation.type === 'market' || selectedLocation.type === 'target') && (
            <button 
              className="w-full py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              style={{ 
                backgroundColor: `${selectedLocation.color}20`,
                color: selectedLocation.color,
                border: `1px solid ${selectedLocation.color}50`,
                clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${selectedLocation.color}40`}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = `${selectedLocation.color}20`}
              onClick={() => { if (onSelectCountry) onSelectCountry(selectedLocation.name); }}
              disabled={analysisLoading}
            >
              {analysisLoading ? (
                <span className="flex items-center justify-center gap-2 animate-pulse">
                  <Loader2 size={14} className="animate-spin" /> Fusing Data...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <MapPin size={14} /> Simulate Export
                </span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
