import { Injectable } from '@angular/core';

export type DogAddressSuggestion = {
  id: string;
  label: string;
  subtitle: string;
  lat: number;
  lng: number;
};

type PhotonProps = {
  name?: string;
  street?: string;
  housenumber?: string;
  postcode?: string;
  city?: string;
  town?: string;
  village?: string;
  district?: string;
  state?: string;
  country?: string;
  type?: string;
};

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: PhotonProps;
};

@Injectable({ providedIn: 'root' })
export class DogGeocodeService {
  async suggest(query: string, limit = 6): Promise<DogAddressSuggestion[]> {
    const q = query.trim();
    if (q.length < 2) return [];

    try {
      const url = new URL('https://photon.komoot.io/api/');
      url.searchParams.set('q', q);
      url.searchParams.set('lang', 'de');
      url.searchParams.set('limit', String(limit));

      const res = await fetch(url.toString());
      if (!res.ok) return [];
      const data = (await res.json()) as { features?: PhotonFeature[] };
      return (data.features ?? [])
        .map((f, i) => this.toSuggestion(f, i))
        .filter((s): s is DogAddressSuggestion => s != null);
    } catch {
      return [];
    }
  }

  private toSuggestion(f: PhotonFeature, index: number): DogAddressSuggestion | null {
    const [lng, lat] = f.geometry.coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const p = f.properties;
    const locality = p.city || p.town || p.village || p.district || '';
    const streetLine = p.street
      ? [p.street, p.housenumber].filter(Boolean).join(' ')
      : '';

    let label = '';
    if (streetLine && locality) {
      label = `${streetLine}, ${locality}`;
    } else if (streetLine) {
      label = streetLine;
    } else if (locality) {
      label = [p.postcode, locality].filter(Boolean).join(' ');
    } else if (p.name) {
      label = p.name;
    } else {
      return null;
    }

    if (p.postcode && !label.includes(p.postcode)) {
      label = `${p.postcode} ${label}`;
    }

    const subtitleParts = [p.state, p.country === 'Deutschland' ? '' : p.country].filter(Boolean);
    const typeLabel = this.typeLabel(p.type);
    const subtitle = [typeLabel, ...subtitleParts].filter(Boolean).join(' · ');

    return {
      id: `${lat.toFixed(5)}:${lng.toFixed(5)}:${index}`,
      label,
      subtitle,
      lat,
      lng,
    };
  }

  private typeLabel(type?: string): string {
    switch (type) {
      case 'house':
      case 'building':
        return 'Adresse';
      case 'street':
        return 'Straße';
      case 'city':
      case 'town':
        return 'Stadt';
      case 'village':
        return 'Ort';
      case 'district':
        return 'Stadtteil';
      case 'locality':
        return 'Gebiet';
      default:
        return '';
    }
  }
}
