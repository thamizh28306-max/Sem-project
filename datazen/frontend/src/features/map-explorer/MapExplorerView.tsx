import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { useLeafletMap } from '../../hooks/useLeafletMap';
import { useCoverage } from '../../state/CoverageContext';
import { useNearby } from '../../hooks/useNearby';
import { usePredict } from '../../hooks/usePredict';
import { searchPlacesApi } from '../../api/places';
import { fetchSoilSummaryApi } from '../../api/soil';
import { CATEGORIES_ORDER, CATEGORY_META } from '../../config/constants';
import { PlaceItem, LocalSuggestion, SearchResult } from '../../types/places';
import { SoilSummaryResponse } from '../../types/soil';
import { escapeHtml } from '../../utils/escapeHtml';

import { DynamicEstimationForm, EstimationFormState } from './DynamicEstimationForm';
import { PredictionResultCard } from './PredictionResultCard';
import { SurroundingsPanel } from './SurroundingsPanel';

export interface MapExplorerViewProps {
  onUseDistances?: (school: number, metro: number) => void;
}

export const MapExplorerView: React.FC<MapExplorerViewProps> = ({ onUseDistances }) => {
  const { localities, resolveCoverageBadge } = useCoverage();
  const { places, groupedPlaces, nearestPerCategory, isLoading: nearbyLoading, fetchNearby } = useNearby();
  const { prediction, isLoading: isPredicting, error: predictError, predict } = usePredict();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<LocalSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);

  // Selected location & radius
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    locality: string;
    label: string;
  } | null>(null);
  const [radiusMeters, setRadiusMeters] = useState(1000);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(CATEGORIES_ORDER)
  );

  // Soil data state
  const [soilSummary, setSoilSummary] = useState<SoilSummaryResponse | null>(null);
  const [soilLoading, setSoilLoading] = useState(false);

  // Form state
  const [form, setForm] = useState<EstimationFormState>({
    property_type: 'Apartment/Flat',
    area: '1000',
    built_up_area: '',
    road_width: '30',
    approved: 'CMDA/DTCP approved',
    corner: 'no',
    flood_prone: 'no',
    bhk: '2',
    bathrooms: '2',
    floor: '2',
    total_floors: '5',
    age: '3',
    parking: '1 car',
    furnished: '0',
    lift: 'yes',
    power_backup: 'yes',
    gated: 'yes',
    facing: 'North',
    plot_shape: 'regular',
    boundary_wall: 'yes',
    commercial_subtype: 'Shop',
    frontage_ft: '20',
    parking_slots: '2',
    comm_furnished: 'unfurnished',
    main_road_facing: 'yes',
    notes: '',
    school_dist: '',
    college_dist: '',
    hospital_dist: '',
    clinic_dist: '',
    supermarket_dist: '',
    restaurant_dist: '',
    bank_dist: '',
    park_dist: '',
    bus_dist: '',
    metro_dist: '',
    amenity_score: 75,
  });

  // Map layer references
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const categoryMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const categoryMarkersMapRef = useRef<Map<string, L.Marker>>(new Map());
  const searchReqIdRef = useRef(0);

  // ── Location Selector Action ─────────────────────────────────────────────
  const selectLocation = useCallback((lat: number, lng: number, label: string) => {
    setSelectedLocation({
      lat,
      lng,
      locality: label,
      label,
    });
  }, []);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    selectLocation(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  }, [selectLocation]);

  const { mapContainerRef, map } = useLeafletMap({
    onMapClick: handleMapClick,
  });

  // Setup category layer group
  useEffect(() => {
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
    categoryMarkersLayerRef.current = layer;
    return () => {
      layer.remove();
    };
  }, [map]);

  // Update selected point marker and radius circle on map
  useEffect(() => {
    if (!map || !selectedLocation) return;

    const { lat, lng, label } = selectedLocation;
    map.flyTo([lat, lng], 15, { duration: 1.0 });

    if (markerRef.current) markerRef.current.remove();
    if (circleRef.current) circleRef.current.remove();

    const marker = L.marker([lat, lng])
      .addTo(map)
      .bindPopup(`<strong>${escapeHtml(label)}</strong>`)
      .openPopup();
    markerRef.current = marker;

    const circle = L.circle([lat, lng], {
      radius: radiusMeters,
      color: '#16a34a',
      fillColor: '#22c55e',
      fillOpacity: 0.12,
      weight: 2,
      dashArray: '4, 6',
    }).addTo(map);
    circleRef.current = circle;

    // Trigger surroundings fetch
    fetchNearby(lat, lng, radiusMeters);

    // Fetch soil summary if applicable
    setSoilLoading(true);
    fetchSoilSummaryApi('default')
      .then(setSoilSummary)
      .catch(() => setSoilSummary(null))
      .finally(() => setSoilLoading(false));
  }, [map, selectedLocation, radiusMeters, fetchNearby]);

  // Render category markers on map
  useEffect(() => {
    if (!map || !categoryMarkersLayerRef.current) return;
    const layer = categoryMarkersLayerRef.current;
    layer.clearLayers();
    categoryMarkersMapRef.current.clear();

    places.forEach((place) => {
      if (!activeCategories.has(place.category)) return;

      const meta = CATEGORY_META[place.category] || {
        emoji: '📍',
        label: 'Place',
        color: '#64748b',
      };

      const icon = L.divIcon({
        html: `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;background:white;border:2px solid ${escapeHtml(
          meta.color
        )};border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.18);font-size:14px;">${escapeHtml(
          meta.emoji
        )}</div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const distLabel =
        place.distance_km != null ? `${place.distance_km} km` : `${place.distance_m || 0} m`;

      const marker = L.marker([place.lat, place.lng], { icon }).bindPopup(
        `<div style="min-width:130px;font-family:sans-serif;">
          <strong>${escapeHtml(place.name)}</strong><br/>
          <span style="color:${escapeHtml(meta.color)};font-weight:600">${escapeHtml(meta.emoji)} ${escapeHtml(
          meta.label
        )}</span><br/>
          <span style="color:#64748b;font-size:0.75rem">${escapeHtml(distLabel)} away</span>
        </div>`
      );

      marker.addTo(layer);
      if (place.id) {
        categoryMarkersMapRef.current.set(place.id, marker);
      }
    });
  }, [map, places, activeCategories]);

  // Autofill form nearby text when nearest places update
  useEffect(() => {
    if (Object.keys(nearestPerCategory).length === 0) return;

    setForm((prev) => ({
      ...prev,
      school_dist: nearestPerCategory['school']?.distance_km?.toFixed(1) || prev.school_dist,
      hospital_dist: nearestPerCategory['hospital']?.distance_km?.toFixed(1) || prev.hospital_dist,
      metro_dist: nearestPerCategory['metro']?.distance_km?.toFixed(1) || prev.metro_dist,
      bus_dist: nearestPerCategory['bus']?.distance_km?.toFixed(1) || prev.bus_dist,
    }));
  }, [nearestPerCategory]);

  // ── Autocomplete Search Handling ─────────────────────────────────────────
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    setActiveSuggestionIdx(-1);

    if (q.trim().length >= 2) {
      const qLower = q.trim().toLowerCase();
      const matches: LocalSuggestion[] = [];

      localities.forEach((loc) => {
        if (loc.name.toLowerCase().includes(qLower)) {
          matches.push({
            name: loc.name,
            centroid: loc.centroid,
            status: loc.status,
            matchType: 'name',
          });
        } else {
          const matchedAlias = loc.aliases?.find((a) => a.toLowerCase().includes(qLower));
          if (matchedAlias) {
            matches.push({
              name: loc.name,
              centroid: loc.centroid,
              status: loc.status,
              matchType: 'alias',
              matchedAlias,
            });
          }
        }
      });

      setSuggestions(matches.slice(0, 5));
      setShowDropdown(true);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const handleSelectSuggestion = (sug: LocalSuggestion) => {
    setSearchQuery(sug.name);
    setShowDropdown(false);
    selectLocation(sug.centroid.lat, sug.centroid.lng, sug.name);
  };

  // Perform geocode search on Enter or button click
  const performGeocodeSearch = async () => {
    if (searchQuery.trim().length < 3 || searchLoading) return;

    setShowDropdown(false);
    setSearchLoading(true);
    const reqId = ++searchReqIdRef.current;

    try {
      const results: SearchResult[] = await searchPlacesApi(searchQuery);
      if (reqId === searchReqIdRef.current && results && results.length > 0) {
        const top = results[0];
        const lat = parseFloat(top.lat);
        const lng = parseFloat(top.lon);
        selectLocation(lat, lng, top.display_name.split(',')[0]);
      }
    } catch {
      // Ignored
    } finally {
      if (reqId === searchReqIdRef.current) {
        setSearchLoading(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === 'Enter') {
        performGeocodeSearch();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIdx((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIdx((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestionIdx >= 0 && activeSuggestionIdx < suggestions.length) {
        handleSelectSuggestion(suggestions[activeSuggestionIdx]);
      } else {
        performGeocodeSearch();
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Focus place marker from surroundings list
  const handleFocusPlace = (place: PlaceItem) => {
    if (!map) return;
    map.panTo([place.lat, place.lng]);
    if (place.id && categoryMarkersMapRef.current.has(place.id)) {
      categoryMarkersMapRef.current.get(place.id)!.openPopup();
    }
  };

  const coverageBadgeState = selectedLocation
    ? resolveCoverageBadge(selectedLocation.lat, selectedLocation.lng, selectedLocation.locality)
    : null;

  // Predict handler
  const handlePredictSubmit = async () => {
    const areaVal = Number(form.area);
    if (!areaVal || areaVal <= 0) return;

    await predict({
      property_type: form.property_type,
      locality: selectedLocation?.locality || 'Anna Nagar',
      lat: selectedLocation?.lat,
      lng: selectedLocation?.lng,
      area_sqft: areaVal,
      built_up_sqft: form.built_up_area ? Number(form.built_up_area) : undefined,
      road_width_ft: Number(form.road_width) || 30,
      approved: form.approved,
      corner: form.corner === 'yes' ? 1 : 0,
      flood_prone: form.flood_prone === 'yes' ? 1 : 0,
      bhk: Number(form.bhk) || 2,
      bathrooms: Number(form.bathrooms) || 2,
      floor: Number(form.floor) || 0,
      total_floors: Number(form.total_floors) || 1,
      age_years: Number(form.age) || 0,
      parking: form.parking === '1 car' ? 1 : form.parking === '2+ cars' ? 2 : 0,
      furnished: Number(form.furnished) || 0,
      lift: form.lift === 'yes' ? 1 : 0,
      power_backup: form.power_backup === 'yes' ? 1 : 0,
      gated: form.gated === 'yes' ? 1 : 0,
      facing: form.facing,
      school_dist_km: form.school_dist ? Number(form.school_dist) : null,
      hospital_dist_km: form.hospital_dist ? Number(form.hospital_dist) : null,
      bus_dist_km: form.bus_dist ? Number(form.bus_dist) : null,
      metro_dist_km: form.metro_dist ? Number(form.metro_dist) : null,
    });
  };

  return (
    <div className="section" style={{ paddingTop: 90 }}>
      <div className="map-layout">
        {/* ── Left Map Canvas ────────────────────────────────────────── */}
        <div style={{ position: 'relative', height: '100%', minHeight: 600 }}>
          <div ref={mapContainerRef} className="leaflet-map-wrap" />

          {/* Map Search Overlay */}
          <div className="map-search-bar" style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, width: 340 }}>
            <div style={{ position: 'relative' }}>
              <input
                className="map-search-input"
                type="text"
                placeholder="Search neighborhood or street..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={performGeocodeSearch}
                disabled={searchQuery.trim().length < 3 || searchLoading}
                style={{ position: 'absolute', right: 4, top: 4, bottom: 4, padding: '0 12px', fontSize: '0.78rem' }}
              >
                {searchLoading ? '...' : 'Search'}
              </button>
            </div>

            {/* Suggestions Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="map-search-dropdown">
                {suggestions.map((sug, idx) => (
                  <div
                    key={sug.name}
                    className={`map-search-item ${idx === activeSuggestionIdx ? 'active' : ''}`}
                    onClick={() => handleSelectSuggestion(sug)}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--slate)' }}>{sug.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                      {sug.matchType === 'alias' ? `Matched: ${sug.matchedAlias}` : 'Chennai Locality'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel (Order: location/radius -> form -> result -> surroundings) */}
        <div
          style={{
            height: 'calc(100vh - 100px)',
            overflowY: 'auto',
            paddingRight: 10,
          }}
        >
          {/* 1. Location & Radius Status */}
          {selectedLocation ? (
            <div
              className="location-selected"
              style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '14px 16px',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div
                  className="location-dot"
                  style={{
                    background:
                      coverageBadgeState?.type === 'green'
                        ? '#16a34a'
                        : coverageBadgeState?.type === 'amber'
                          ? '#d97706'
                          : '#dc2626',
                  }}
                />
                <span className="location-name">{selectedLocation.label}</span>
              </div>
              <div className="location-coords">
                Lat: {selectedLocation.lat.toFixed(4)}, Lng: {selectedLocation.lng.toFixed(4)}
              </div>

              {coverageBadgeState && (
                <div
                  style={{
                    marginTop: 8,
                    padding: '6px 10px',
                    borderRadius: 6,
                    fontSize: '0.74rem',
                    background:
                      coverageBadgeState.type === 'green'
                        ? '#f0fdf4'
                        : coverageBadgeState.type === 'amber'
                          ? '#fffbeb'
                          : '#fef2f2',
                    color:
                      coverageBadgeState.type === 'green'
                        ? '#15803d'
                        : coverageBadgeState.type === 'amber'
                          ? '#92400e'
                          : '#991b1b',
                    border: `1px solid ${
                      coverageBadgeState.type === 'green'
                        ? '#bbf7d0'
                        : coverageBadgeState.type === 'amber'
                          ? '#fde68a'
                          : '#fecaca'
                    }`,
                  }}
                >
                  <strong>{coverageBadgeState.title}:</strong> {coverageBadgeState.text}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                background: '#f8fafc',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius)',
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: '0.82rem',
              }}
            >
              👈 Click anywhere on the Chennai map to drop a pin and inspect surroundings.
            </div>
          )}

          {/* 2. Dynamic Estimation Form */}
          <DynamicEstimationForm
            form={form}
            setForm={setForm}
            coverageState={coverageBadgeState}
            nearbyPlaces={places}
            nearestPerCategory={nearestPerCategory}
            nearbyLoading={nearbyLoading}
            radiusMeters={radiusMeters}
            onPredict={handlePredictSubmit}
            isPredicting={isPredicting}
            predictError={predictError}
            soilData={soilSummary?.metrics.ph ? { ph: soilSummary.metrics.ph.median, moisture: soilSummary.metrics.moisture?.median } : null}
          />

          {/* 3. Prediction Result Card */}
          {prediction && (
            <PredictionResultCard
              prediction={prediction}
              locality={selectedLocation?.locality}
              distances={{
                school: nearestPerCategory['school']?.distance_km,
                metro: nearestPerCategory['metro']?.distance_km,
              }}
              onUseDistances={onUseDistances}
            />
          )}

          {/* 4. Surroundings Panel (Positioned BELOW the estimation form and result card) */}
          <SurroundingsPanel
            radiusMeters={radiusMeters}
            setRadiusMeters={setRadiusMeters}
            groupedPlaces={groupedPlaces}
            activeCategories={activeCategories}
            toggleCategory={(cat) => {
              setActiveCategories((prev) => {
                const next = new Set(prev);
                if (next.has(cat)) next.delete(cat);
                else next.add(cat);
                return next;
              });
            }}
            onFocusPlace={handleFocusPlace}
            soilSummary={soilSummary}
            soilLoading={soilLoading}
          />
        </div>
      </div>
    </div>
  );
};
