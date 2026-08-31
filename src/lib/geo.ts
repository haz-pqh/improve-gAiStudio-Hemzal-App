import { STORE_LAT, STORE_LNG } from './constants';
import { GeoLocationPoint } from '../types';

export function getDistanceInMeters(lat1: number, lon1: number, lat2: number = STORE_LAT, lon2: number = STORE_LNG): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function getCurrentLocation(): Promise<GeoLocationPoint> {
  return new Promise(async (resolve) => {
    if (!navigator.geolocation) {
      resolve({
        status: 'FAILED',
        lat: null,
        lng: null,
        error: 'Geolocation is not supported by your browser.',
      });
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (perm.state === 'denied') {
          resolve({
            status: 'FAILED',
            lat: null,
            lng: null,
            error: 'Location permission blocked. Please enable location access in browser settings.',
          });
          return;
        }
      } catch {
        // Permissions API query not supported
      }
    }

    const attempt = (options: PositionOptions): Promise<GeoLocationPoint> =>
      new Promise((res) => {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            res({
              status: 'SUCCESS',
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            }),
          (err) =>
            res({
              status: 'FAILED',
              lat: null,
              lng: null,
              error:
                err.code === err.PERMISSION_DENIED
                  ? 'Location permission denied by user.'
                  : err.code === err.POSITION_UNAVAILABLE
                  ? 'Position unavailable. Please ensure GPS is active.'
                  : 'Location request timed out.',
            }),
          options
        );
      });

    // High accuracy attempt first
    let result = await attempt({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });

    // Fallback attempt if timeout or unavailable
    if (result.status === 'FAILED' && result.error && !result.error.includes('denied')) {
      result = await attempt({ enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 });
    }

    resolve(result);
  });
}
