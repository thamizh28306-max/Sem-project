/**
 * Map Configuration & OSM Policy Compliance
 *
 * Attribution requirements:
 * OpenStreetMap tile policy mandates clear attribution: (c) OpenStreetMap contributors (ODbL).
 * When falling back to CARTO basemaps, attribution updates to include CARTO.
 */

export interface TileLayerConfig {
  url: string;
  attribution: string;
  maxZoom: number;
}

export const MAP_CONFIG = {
  defaultCenter: {
    lat: 13.0827,
    lng: 80.2707,
    zoom: 12,
  },
  chennaiBounds: {
    lat_min: 12.7,
    lat_max: 13.3,
    lng_min: 79.9,
    lng_max: 80.4,
  },
  layers: {
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    },
    cartoFallback: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
      maxZoom: 20,
    },
  },
  tileErrorThreshold: 3,
};
