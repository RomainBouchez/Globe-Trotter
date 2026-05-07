import exifr from 'exifr';
import { City, SubCity } from '../types';

export interface GpsCoords {
  lat: number;
  lng: number;
}

export interface GeoResult {
  city: string | null;
  country: string | null;
  display: string;
}

export interface CityTarget {
  cityName: string;       // City.name (e.g. "France")
  subCityName?: string;   // SubCity.name (e.g. "Paris")
  display: string;        // Label shown in UI
}

// Extract GPS coords from image file using EXIF
export async function extractGPS(file: File): Promise<GpsCoords | null> {
  try {
    const gps = await exifr.gps(file);
    if (gps?.latitude && gps?.longitude) {
      return { lat: gps.latitude, lng: gps.longitude };
    }
    return null;
  } catch {
    return null;
  }
}

// Reverse geocode via Nominatim (OpenStreetMap, no API key needed)
// Rate limit: 1 req/sec — callers must throttle
export async function reverseGeocode(coords: GpsCoords): Promise<GeoResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&accept-language=fr`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RomMikGlob/1.0' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    const city = addr.city || addr.town || addr.village || addr.municipality || null;
    const country = addr.country || null;
    const display = [city, country].filter(Boolean).join(', ');
    return { city, country, display: display || data.display_name?.split(',')[0] || 'Lieu inconnu' };
  } catch {
    return null;
  }
}

// Flatten all cities + subCities into selectable targets
export function flattenCities(cities: City[]): CityTarget[] {
  const targets: CityTarget[] = [];
  for (const city of cities) {
    if (city.subCities?.length) {
      for (const sub of city.subCities) {
        targets.push({
          cityName: city.name,
          subCityName: sub.name,
          display: `${sub.name} (${city.name})`,
        });
      }
      // Also allow assigning directly to country (no sub-city)
      targets.push({
        cityName: city.name,
        display: city.name,
      });
    } else {
      targets.push({
        cityName: city.name,
        display: city.name,
      });
    }
  }
  return targets;
}

// Try to match a geo result to an existing city target
export function findBestMatch(geo: GeoResult, targets: CityTarget[]): CityTarget | null {
  if (!geo.city && !geo.country) return null;

  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const geoCity    = geo.city    ? normalize(geo.city)    : '';
  const geoCountry = geo.country ? normalize(geo.country) : '';

  // 1. Exact sub-city match
  for (const t of targets) {
    if (t.subCityName && normalize(t.subCityName) === geoCity) return t;
  }

  // 2. Exact city match
  for (const t of targets) {
    if (normalize(t.cityName) === geoCity) return t;
  }

  // 3. Country/city name partial match
  for (const t of targets) {
    const tName = normalize(t.subCityName ?? t.cityName);
    if (geoCountry && (geoCountry.includes(tName) || tName.includes(geoCountry))) return t;
    if (geoCity && (geoCity.includes(tName) || tName.includes(geoCity))) return t;
  }

  return null;
}

// Sleep helper for rate-limiting Nominatim calls
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
