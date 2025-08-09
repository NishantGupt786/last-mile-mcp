import axios from "axios";

export async function getLatLngFromAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("Missing GOOGLE_MAPS_API_KEY env variable");

  const encodedAddress = encodeURIComponent(address);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

  const res = await axios.get(url);
  if (res.status !== 200) throw new Error(`Geocoding API error: ${res.statusText}`);

  const data = res.data;
  if (data.status !== "OK" || !data.results || data.results.length === 0) {
    return null;
  }

  const location = data.results[0].geometry.location;
  return {
    lat: location.lat,
    lng: location.lng,
  };
}

export function haversineDistance(coord1: { latitude: number; longitude: number }, coord2: { latitude: number; longitude: number }) {
  const toRad = (x: number) => (x * Math.PI) / 180;

  const R = 6371000; // Earth radius in meters
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}