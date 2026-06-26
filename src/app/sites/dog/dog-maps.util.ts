/** Google Maps — Ort öffnen */
export function dogGoogleMapsOpen(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** Google Maps — Route vom Standort zum Ziel */
export function dogGoogleMapsRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=walking`;
}

/** OpenStreetMap — Ort in neuem Tab */
export function dogOsmLink(lat: number, lng: number, zoom = 16): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
}
