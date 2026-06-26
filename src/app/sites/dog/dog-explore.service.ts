import { Injectable, computed, inject, signal } from '@angular/core';
import {
  DOG_DEFAULT_FILTERS,
  DOG_SPOT_LABELS,
  type DogAlert,
  type DogExploreFilters,
  type DogSpot,
  type DogSpotKind,
  type DogTip,
  dogDefaultCenter,
  dogDistanceKm,
} from './dog.data';
import { DogThemeService } from './dog-theme.service';
import { DogCookieService } from './dog-cookie.service';
import { DogWeatherService } from './dog-weather.service';
import { DogSpotSocialService } from './dog-spot-social.service';
import { DogPinsService } from './dog-pins.service';
import { DogAuthService } from './dog-auth.service';
import { DogGeocodeService } from './dog-geocode.service';
import { getDogTip, tipIdForLeashMonth } from './dog-tips.data';
import type { DogTipArticle, DogWeatherBundle, DogWeatherSlot } from './dog-tips.data';
import { enrichSpotImages } from './dog-spot-enrich';
import { buildOverpassSpotQuery, osmElementToSpot } from './dog-spot-osm';
import { leashLabel, sourceLabel } from './dog-spot-media';
import type { DogMapPopupTarget } from './dog.data';
import type { DogUserPin } from './dog.data';

type LeashStatus = {
  headline: string;
  detail: string;
  mood: 'calm' | 'warm' | 'alert';
  tipId: string;
};

@Injectable({ providedIn: 'root' })
export class DogExploreService {
  private readonly theme = inject(DogThemeService);
  private readonly cookies = inject(DogCookieService);
  private readonly weatherService = inject(DogWeatherService);
  private readonly spotSocial = inject(DogSpotSocialService);
  private readonly pinsService = inject(DogPinsService);
  private readonly auth = inject(DogAuthService);
  private readonly geocode = inject(DogGeocodeService);

  readonly center = signal(this.loadCenter());
  readonly addressQuery = signal('');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly spots = signal<DogSpot[]>([]);
  readonly alerts = signal<DogAlert[]>([]);
  readonly tips = signal<DogTip[]>([]);
  readonly selectedSpotId = signal<string | null>(null);
  readonly selectedAlertId = signal<string | null>(null);
  readonly mapPopupOpen = signal(false);
  readonly filters = signal<DogExploreFilters>(this.loadFilters());
  readonly panelOpen = signal(true);
  readonly panelScrollTick = signal(0);
  readonly panelDetailScrollTick = signal(0);
  readonly tipArticle = signal<DogTipArticle | null>(null);
  readonly weather = signal<DogWeatherBundle | null>(null);
  readonly weatherSlotId = signal('now');
  readonly spotsWithCommunity = signal<Set<string>>(new Set());
  readonly blockedSpotIds = signal<Set<string>>(new Set());
  readonly hiddenAlertIds = signal<Set<string>>(new Set(this.loadHiddenAlertIds()));
  readonly userPins = signal<DogUserPin[]>([]);
  readonly pinPickActive = computed(() => this.pinsService.mapPickActive());

  private loadingStartedAt = 0;
  private persistTimer = 0;

  readonly filteredSpots = computed(() => {
    const f = this.filters();
    const c = this.center();
    const blocked = this.blockedSpotIds();
    return this.spots()
      .filter((s) => !blocked.has(s.id))
      .filter((s) => f.kinds[s.kind])
      .map((s) => ({ ...s, distanceKm: dogDistanceKm(c.lat, c.lng, s.lat, s.lng) }))
      .filter((s) => (s.distanceKm ?? 0) <= f.radiusKm)
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  });

  readonly activeWeather = computed((): DogWeatherSlot | null => {
    const bundle = this.weather();
    if (!bundle?.slots.length) return null;
    const id = this.weatherSlotId();
    return bundle.slots.find((s) => s.id === id) ?? bundle.slots[0];
  });

  readonly filteredUserPins = computed(() => {
    const f = this.filters();
    const c = this.center();
    const blocked = this.blockedSpotIds();
    const userId = this.auth.user()?.id ?? null;

    return this.userPins()
      .filter((p) => !blocked.has(p.id))
      .filter((p) => {
        const isOwn = userId != null && p.userId === userId;
        return isOwn ? f.ownPins : f.otherUserPins;
      })
      .map((p) => ({ ...p, distanceKm: dogDistanceKm(c.lat, c.lng, p.lat, p.lng) }))
      .filter((p) => (p.distanceKm ?? 0) <= f.radiusKm)
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  });

  readonly allMapSpots = computed(() => {
    const pinSpots = this.filteredUserPins().map((p) => this.userPinToSpot(p));
    return [...this.filteredSpots(), ...pinSpots].sort(
      (a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0),
    );
  });

  readonly selectedSpot = computed(() => {
    const id = this.selectedSpotId();
    if (!id) return null;
    const spot = this.spots().find((s) => s.id === id) ?? this.userPins().find((p) => p.id === id);
    if (!spot) return null;
    const c = this.center();
    if ('emoji' in spot) {
      const p = spot as DogUserPin;
      return this.userPinToSpot({ ...p, distanceKm: dogDistanceKm(c.lat, c.lng, p.lat, p.lng) });
    }
    return { ...spot, distanceKm: dogDistanceKm(c.lat, c.lng, spot.lat, spot.lng) };
  });

  readonly selectedAlert = computed(() => {
    const id = this.selectedAlertId();
    if (!id) return null;
    const alert = this.alerts().find((a) => a.id === id);
    if (!alert) return null;
    const c = this.center();
    return { ...alert, distanceKm: dogDistanceKm(c.lat, c.lng, alert.lat, alert.lng) };
  });

  readonly mapPopupTarget = computed((): DogMapPopupTarget | null => {
    if (!this.mapPopupOpen()) return null;
    const alertId = this.selectedAlertId();
    if (alertId) return { type: 'alert', id: alertId };
    const spotId = this.selectedSpotId();
    if (spotId) return { type: 'spot', id: spotId };
    return null;
  });

  readonly spotTips = computed(() => {
    const id = this.selectedSpotId();
    if (!id) return [];
    return this.tips().filter((t) => t.spotId === id);
  });

  readonly nearbyAlerts = computed(() => {
    const c = this.center();
    const radius = this.filters().radiusKm;
    return this.alerts()
      .map((a) => ({ ...a, distanceKm: dogDistanceKm(c.lat, c.lng, a.lat, a.lng) }))
      .filter((a) => (a.distanceKm ?? 0) <= radius)
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  });

  readonly visibleMapAlerts = computed(() => {
    const hidden = this.hiddenAlertIds();
    return this.nearbyAlerts().filter((a) => !hidden.has(a.id));
  });

  readonly leashStatus = computed((): LeashStatus => this.buildLeashStatus());

  constructor() {
    void this.initialLoad();
  }

  private async initialLoad(): Promise<void> {
    this.beginLoading();
    try {
      await this.refreshAroundCenter();
    } finally {
      await this.endLoading();
    }
  }

  loadFilters(): DogExploreFilters {
    const stored = this.theme.readState().filters as DogExploreFilters | undefined;
    if (!stored) return structuredClone(DOG_DEFAULT_FILTERS);
    return {
      radiusKm: stored.radiusKm ?? DOG_DEFAULT_FILTERS.radiusKm,
      kinds: { ...DOG_DEFAULT_FILTERS.kinds, ...stored.kinds },
      ownPins: stored.ownPins ?? DOG_DEFAULT_FILTERS.ownPins,
      otherUserPins: stored.otherUserPins ?? DOG_DEFAULT_FILTERS.otherUserPins,
    };
  }

  loadCenter(): { lat: number; lng: number } {
    const fromCookie = this.cookies.loadMapCenter();
    if (fromCookie) {
      return { lat: fromCookie.lat, lng: fromCookie.lng };
    }
    if (this.cookies.hasFunctionalConsent()) {
      const fromTheme = this.theme.readState().center;
      if (fromTheme && this.isValidCoord(fromTheme.lat, fromTheme.lng)) {
        return { lat: fromTheme.lat, lng: fromTheme.lng };
      }
    }
    return dogDefaultCenter();
  }

  /** Standort setzen; optional speichern (nur mit Cookie-Einwilligung). */
  setCenter(pos: { lat: number; lng: number }, persist = true): void {
    if (!this.isValidCoord(pos.lat, pos.lng)) return;
    this.center.set(pos);
    if (persist) this.schedulePersistCenter();
  }

  persistCenter(): void {
    if (!this.cookies.hasFunctionalConsent()) return;
    const c = this.center();
    if (!this.isValidCoord(c.lat, c.lng)) return;
    this.cookies.saveMapCenter(c.lat, c.lng);
    this.theme.patchState({
      filters: this.filters(),
      center: c,
      hiddenAlertIds: [...this.hiddenAlertIds()],
    });
  }

  reloadAfterConsent(): void {
    if (!this.cookies.hasFunctionalConsent()) return;
    const loaded = this.loadCenter();
    this.center.set(loaded);
    void this.reloadWithLoader();
  }

  persistFilters(): void {
    if (!this.cookies.hasFunctionalConsent()) return;
    this.theme.patchState({
      filters: this.filters(),
      hiddenAlertIds: [...this.hiddenAlertIds()],
    });
    this.persistCenter();
  }

  private loadHiddenAlertIds(): Set<string> {
    const stored = this.theme.readState().hiddenAlertIds;
    if (!Array.isArray(stored)) return new Set();
    return new Set(stored.filter((id): id is string => typeof id === 'string'));
  }

  private persistHiddenAlerts(): void {
    if (!this.cookies.hasFunctionalConsent()) return;
    this.theme.patchState({ hiddenAlertIds: [...this.hiddenAlertIds()] });
  }

  private schedulePersistCenter(): void {
    if (!this.cookies.hasFunctionalConsent()) return;
    window.clearTimeout(this.persistTimer);
    this.persistTimer = window.setTimeout(() => this.persistCenter(), 350);
  }

  private isValidCoord(lat: number, lng: number): boolean {
    return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  setRadius(km: number): void {
    this.filters.update((f) => ({ ...f, radiusKm: km }));
    this.persistFilters();
  }

  toggleKind(kind: DogSpotKind): void {
    this.filters.update((f) => ({
      ...f,
      kinds: { ...f.kinds, [kind]: !f.kinds[kind] },
    }));
    this.persistFilters();
  }

  toggleOwnPins(): void {
    this.filters.update((f) => ({ ...f, ownPins: !f.ownPins }));
    this.persistFilters();
  }

  toggleOtherUserPins(): void {
    this.filters.update((f) => ({ ...f, otherUserPins: !f.otherUserPins }));
    this.persistFilters();
  }

  setAllKinds(on: boolean): void {
    this.filters.update((f) => ({
      ...f,
      kinds: Object.fromEntries(this.kindKeys.map((k) => [k, on])) as DogExploreFilters['kinds'],
      ownPins: on,
      otherUserPins: on,
    }));
    this.persistFilters();
  }

  private userPinToSpot(p: DogUserPin & { distanceKm?: number }): DogSpot {
    return {
      id: p.id,
      kind: 'park',
      name: p.title,
      lat: p.lat,
      lng: p.lng,
      distanceKm: p.distanceKm,
      rating: 0,
      tipCount: 0,
      leash: 'frei',
      snippet: p.description,
      description: p.description,
      source: 'community',
      isUserPin: true,
      pinEmoji: p.emoji,
      pinVisibility: p.visibility,
      pinUserId: p.userId,
    };
  }

  private readonly kindKeys = Object.keys(DOG_SPOT_LABELS) as DogSpotKind[];

  selectSpot(id: string | null): void {
    this.selectedSpotId.set(id);
    this.selectedAlertId.set(null);
    this.mapPopupOpen.set(id != null);
    if (id) this.focusPanelSelection();
  }

  selectAlert(id: string | null): void {
    this.selectedAlertId.set(id);
    this.selectedSpotId.set(null);
    this.mapPopupOpen.set(id != null);
    if (id) this.focusPanelSelection();
  }

  closeMapPopup(): void {
    this.mapPopupOpen.set(false);
  }

  openTip(id: string): void {
    const article = getDogTip(id);
    if (article) this.tipArticle.set(article);
  }

  closeTip(): void {
    this.tipArticle.set(null);
  }

  focusPanelSelection(): void {
    this.panelOpen.set(true);
    this.panelScrollTick.update((n) => n + 1);
  }

  scrollPanelToDetail(): void {
    this.focusPanelSelection();
    this.panelDetailScrollTick.update((n) => n + 1);
  }

  /** Für Panel-Liste — Popup mit öffnen. */
  openSpotFromList(id: string): void {
    this.selectSpot(id);
  }

  openAlertFromList(id: string): void {
    this.selectAlert(id);
  }

  isOwnUserPin(spot: DogSpot): boolean {
    const userId = this.auth.user()?.id;
    return spot.isUserPin === true && userId != null && spot.pinUserId === userId;
  }

  userPinListLabel(spot: DogSpot): string {
    if (this.isOwnUserPin(spot)) return 'Eigener Marker';
    if (spot.pinVisibility === 'private') return 'Privater Marker';
    return 'Fremder Marker';
  }

  isAlertHidden(id: string): boolean {
    return this.hiddenAlertIds().has(id);
  }

  hideAlert(id: string): void {
    this.hiddenAlertIds.update((ids) => new Set([...ids, id]));
    this.persistHiddenAlerts();
    if (this.selectedAlertId() === id) {
      this.selectedAlertId.set(null);
      this.mapPopupOpen.set(false);
    }
  }

  showAlert(id: string): void {
    this.hiddenAlertIds.update((ids) => {
      const next = new Set(ids);
      next.delete(id);
      return next;
    });
    this.persistHiddenAlerts();
  }

  spotDetailLines(spot: DogSpot): string[] {
    const lines = [
      `${DOG_SPOT_LABELS[spot.kind]} · ${sourceLabel(spot.source)}`,
      leashLabel(spot.leash),
    ];
    if (spot.distanceKm != null) {
      lines.push(`${spot.distanceKm.toFixed(1)} km entfernt`);
    }
    return lines;
  }

  async locateUser(): Promise<void> {
    this.error.set('');
    if (!navigator.geolocation) {
      this.error.set('Standort ist in diesem Browser nicht verfügbar.');
      return;
    }
    this.beginLoading();
    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            this.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            resolve();
          },
          () => reject(new Error('geo')),
          { enableHighAccuracy: true, timeout: 12000 },
        );
      });
      await this.refreshAroundCenter();
    } catch {
      this.error.set('Standort konnte nicht ermittelt werden.');
    } finally {
      await this.endLoading();
    }
  }

  async searchAddress(): Promise<void> {
    const q = this.addressQuery().trim();
    if (!q) return;
    this.beginLoading();
    this.error.set('');
    try {
      const items = await this.geocode.suggest(q, 1);
      const first = items[0];
      if (!first) {
        this.error.set('Adresse nicht gefunden — probier Straße und Ort.');
        return;
      }
      this.addressQuery.set(first.label);
      this.setCenter({ lat: first.lat, lng: first.lng });
      await this.refreshAroundCenter();
    } catch {
      this.error.set('Adresssuche gerade nicht erreichbar.');
    } finally {
      await this.endLoading();
    }
  }

  async goToCoordinates(lat: number, lng: number): Promise<void> {
    if (!this.isValidCoord(lat, lng)) return;
    this.beginLoading();
    this.error.set('');
    try {
      this.setCenter({ lat, lng });
      await this.refreshAroundCenter();
    } finally {
      await this.endLoading();
    }
  }

  async reloadWithLoader(): Promise<void> {
    this.beginLoading();
    try {
      await this.refreshAroundCenter();
    } finally {
      await this.endLoading();
    }
  }

  async refreshAroundCenter(): Promise<void> {
    const c = this.center();
    this.error.set('');
    try {
      const radius = this.filters().radiusKm;
      const [osmSpots, realAlerts, weather] = await Promise.all([
        this.fetchOsmSpots(c.lat, c.lng, radius),
        this.fetchRealAlerts(c.lat, c.lng, radius),
        this.weatherService.loadFor(c.lat, c.lng),
      ]);
      const extras = osmSpots.length < 4 ? this.buildContextualMocks(c.lat, c.lng) : [];
      const merged = this.dedupeSpots([...osmSpots, ...extras]);
      this.spots.set(merged);
      this.alerts.set(this.withDemoGiftkoeder(realAlerts, c.lat, c.lng));
      this.weather.set(weather);
      this.weatherSlotId.set('now');
      this.tips.set(this.buildTips(merged));
      await this.loadMapExtras(c.lat, c.lng, merged.map((s) => s.id));
      if (!this.selectedSpotId() && merged.length) {
        this.selectedSpotId.set(merged[0].id);
      }
    } catch {
      const fallback = this.buildContextualMocks(c.lat, c.lng);
      this.spots.set(fallback);
      const [alerts, weather] = await Promise.all([
        this.fetchRealAlerts(c.lat, c.lng, this.filters().radiusKm),
        this.weatherService.loadFor(c.lat, c.lng),
      ]);
      this.alerts.set(this.withDemoGiftkoeder(alerts, c.lat, c.lng));
      this.weather.set(weather);
      this.weatherSlotId.set('now');
      this.tips.set(this.buildTips(fallback));
      await this.loadMapExtras(c.lat, c.lng, fallback.map((s) => s.id));
    }
  }

  async reloadPins(): Promise<void> {
    const c = this.center();
    const pins = await this.pinsService.loadNearby(c.lat, c.lng, this.filters().radiusKm);
    this.userPins.set(pins);
  }

  markSpotHasCommunity(spotId: string): void {
    this.spotsWithCommunity.update((s) => new Set([...s, spotId]));
  }

  blockSpot(spotId: string): void {
    this.blockedSpotIds.update((s) => new Set([...s, spotId]));
    if (this.selectedSpotId() === spotId) {
      this.closeMapPopup();
      this.selectedSpotId.set(null);
    }
    this.userPins.update((pins) => pins.filter((p) => p.id !== spotId));
  }

  async removeOwnPin(id: string): Promise<boolean> {
    const userId = this.auth.user()?.id;
    if (!userId) return false;
    const pin = this.userPins().find((p) => p.id === id);
    if (!pin || pin.userId !== userId) return false;

    const ok = await this.pinsService.remove(id);
    if (!ok) return false;

    this.userPins.update((pins) => pins.filter((p) => p.id !== id));
    if (this.selectedSpotId() === id) {
      this.closeMapPopup();
      this.selectedSpotId.set(null);
    }
    return true;
  }

  private async loadMapExtras(lat: number, lng: number, spotIds: string[]): Promise<void> {
    const pins = await this.pinsService.loadNearby(lat, lng, this.filters().radiusKm);
    const allIds = [...new Set([...spotIds, ...pins.map((p) => p.id)])];
    const meta = await this.spotSocial.loadSpotMetaBatch(allIds);
    this.spotsWithCommunity.set(new Set(meta.communityIds));
    this.blockedSpotIds.set(new Set(meta.blockedIds));
    this.userPins.set(pins.filter((p) => !meta.blockedIds.includes(p.id)));
  }

  private beginLoading(): void {
    if (!this.loading()) {
      this.loadingStartedAt = Date.now();
    }
    this.loading.set(true);
  }

  private async endLoading(): Promise<void> {
    const minMs = 720;
    const elapsed = Date.now() - this.loadingStartedAt;
    if (elapsed < minMs) {
      await new Promise((resolve) => setTimeout(resolve, minMs - elapsed));
    }
    this.loading.set(false);
  }

  private dedupeSpots(list: DogSpot[]): DogSpot[] {
    const seen = new Set<string>();
    return list.filter((s) => {
      const key = `${s.kind}:${s.lat.toFixed(3)}:${s.lng.toFixed(3)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async fetchOsmSpots(lat: number, lng: number, radiusKm: number): Promise<DogSpot[]> {
    const radiusM = Math.min(Math.round(radiusKm * 1000), 12000);
    const query = buildOverpassSpotQuery(lat, lng, radiusM);
    const endpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          body: `data=${encodeURIComponent(query)}`,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        if (!res.ok) continue;
        const data = (await res.json()) as {
          elements: Array<{
            id: number;
            type: string;
            lat?: number;
            lon?: number;
            center?: { lat: number; lon: number };
            tags?: Record<string, string>;
          }>;
        };
        const raw = data.elements
          .map((el) => osmElementToSpot(el))
          .filter((s): s is DogSpot => s !== null);
        return enrichSpotImages(raw);
      } catch {
        continue;
      }
    }
    return [];
  }

  private buildContextualMocks(lat: number, lng: number): DogSpot[] {
    const offsets: Array<{ dLat: number; dLng: number; kind: DogSpotKind; name: string; leash: DogSpot['leash'] }> = [
      { dLat: 0.012, dLng: 0.008, kind: 'hundewiese', name: 'Wiesenpfote Freilauf', leash: 'frei' },
      { dLat: -0.018, dLng: 0.014, kind: 'wald', name: 'Tannenschatten Runde', leash: 'teilweise' },
      { dLat: 0.022, dLng: -0.011, kind: 'wiese', name: 'Sonnenwiese am Bach', leash: 'teilweise' },
      { dLat: -0.009, dLng: -0.019, kind: 'spazierweg', name: 'Pfotenpfad Nord', leash: 'pflicht' },
      { dLat: 0.028, dLng: 0.02, kind: 'park', name: 'Stadtpark Südwest', leash: 'pflicht' },
      { dLat: -0.025, dLng: 0.006, kind: 'hundestrand', name: 'Sandbucht für Vierbeiner', leash: 'frei' },
    ];
    return offsets.map((o, i) => ({
      id: `mock-${i}-${lat.toFixed(2)}`,
      kind: o.kind,
      name: o.name,
      lat: lat + o.dLat,
      lng: lng + o.dLng,
      rating: 4.1 + (i % 5) * 0.15,
      tipCount: 3 + (i % 9),
      leash: o.leash,
      snippet: this.communitySnippet(o.kind),
      description: this.spotDescription(o.kind, o.name),
      source: 'community' as const,
    }));
  }

  private spotDescription(kind: DogSpotKind, name: string): string {
    const base: Record<DogSpotKind, string> = {
      wald: `${name} — schattige Wege, Wildbeobachtung möglich. Nach Regen gern matschig.`,
      wiese: `${name} — offene Fläche zum Toben und Apportieren. Im Frühjahr Brutzeit beachten.`,
      hundewiese: `${name} — eingezäunter Freilauf. Wasserstelle oft am Eingang.`,
      hundestrand: `${name} — Hunde willkommen. Flach abfallend, ideal zum Planschen.`,
      park: `${name} — städtische Grünfläche. An Alleen und Spielplätzen Leine empfohlen.`,
      spazierweg: `${name} — markierte Runde mit schönen Ausblicken.`,
    };
    return base[kind];
  }

  private withDemoGiftkoeder(alerts: DogAlert[], lat: number, lng: number): DogAlert[] {
    if (alerts.some((a) => a.kind === 'giftkoeder')) return alerts;
    return [
      ...alerts,
      {
        id: `demo-gift-${lat.toFixed(2)}`,
        kind: 'giftkoeder',
        title: 'Gemeldeter Giftköder',
        detail:
          'Hundehalter meldeten verdächtige Köder an einem Wegrand. Nicht anfassen — Polizei oder Ordnungsamt informieren. Hund sofort wegführen.',
        lat: lat + 0.009,
        lng: lng - 0.012,
        ago: 'vor 2 Tagen',
        severity: 'danger',
        source: 'Community-Meldung',
      },
    ];
  }

  private communitySnippet(kind: DogSpotKind): string {
    const lines: Record<DogSpotKind, string[]> = {
      hundewiese: ['Tor schließt um 20 Uhr.', 'Wasserhahn am Eingang — super im Sommer.', 'Kleinere Hunde lieben die ruhige Ecke links.'],
      wald: ['Morgens wenig los.', 'Nach Regen etwas matschig — Stiefel nicht vergessen.', 'Rehe gesehen — Leine empfohlen.'],
      wiese: ['Perfekt zum Apportieren.', 'Im Frühjahr Brutzeit beachten.', 'Schatten unter der alten Eiche.'],
      hundestrand: ['Flach abfallend — ideal für Welpen.', 'Im Winter ruhiger.', 'Parkplatz direkt am Weg.'],
      park: ['Mittags viele Jogger.', 'Hundefreundliche Bank am Teich.', 'Kurze Schleppleine an der Allee.'],
      spazierweg: ['Runde ca. 3,2 km.', 'Beliebt am Sonntag.', 'Schöne Aussicht auf die Felder.'],
    };
    const pick = lines[kind];
    return pick[Math.floor(Date.now() / 60000) % pick.length];
  }

  private async fetchRealAlerts(lat: number, lng: number, radiusKm: number): Promise<DogAlert[]> {
    const [notes, leashZones, seasonal] = await Promise.all([
      this.fetchOsmNotes(lat, lng, radiusKm),
      this.fetchLeashZones(lat, lng, radiusKm),
      Promise.resolve(this.buildSeasonalAlerts(lat, lng)),
    ]);
    return [...notes, ...leashZones, ...seasonal];
  }

  /** OSM Notes — echte Meldungen aus der OpenStreetMap-Community */
  private async fetchOsmNotes(lat: number, lng: number, radiusKm: number): Promise<DogAlert[]> {
    const d = radiusKm / 111;
    const bbox = `${lng - d * 1.3},${lat - d},${lng + d * 1.3},${lat + d}`;
    try {
      const res = await fetch(`/api/proxy/osm-notes?bbox=${encodeURIComponent(bbox)}`);
      if (!res.ok) return [];
      const xml = await res.text();
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
      const alerts: DogAlert[] = [];
      for (const note of Array.from(doc.querySelectorAll('note'))) {
        const noteLat = Number(note.getAttribute('lat'));
        const noteLng = Number(note.getAttribute('lon'));
        if (!Number.isFinite(noteLat) || !Number.isFinite(noteLng)) continue;
        const comments = Array.from(note.querySelectorAll('comment'))
          .map((c) => c.textContent?.trim() ?? '')
          .filter(Boolean);
        const text = comments.join(' ').slice(0, 280);
        if (!text || text.length < 8) continue;
        const lower = text.toLowerCase();
        const classified = this.classifyNoteText(lower);
        if (!classified) continue;
        const created = note.querySelector('date_created')?.textContent ?? '';
        alerts.push({
          id: `osm-note-${note.getAttribute('id') ?? alerts.length}`,
          kind: classified.kind,
          title: classified.title,
          detail: text,
          lat: noteLat,
          lng: noteLng,
          ago: created ? this.formatOsmDate(created) : 'OpenStreetMap',
          severity: classified.severity,
          source: 'OpenStreetMap Notes',
          sourceUrl: `https://www.openstreetmap.org/note/${note.getAttribute('id') ?? ''}`,
        });
      }
      return alerts.slice(0, 8);
    } catch {
      return [];
    }
  }

  private classifyNoteText(lower: string): {
    kind: DogAlert['kind'];
    title: string;
    severity: DogAlert['severity'];
  } | null {
    if (/gift|köder|koeder|poison|bait|vergift/.test(lower)) {
      return { kind: 'giftkoeder', title: 'Hinweis zu Giftködern', severity: 'danger' };
    }
    if (/leine|leinenpflicht|angeleint|anleinen|leash/.test(lower)) {
      return { kind: 'leine', title: 'Leinen-Hinweis', severity: 'warn' };
    }
    if (/hund|dog|biss|aggress|freilauf/.test(lower)) {
      return { kind: 'nachbar', title: 'Hinweis für Hundehalter', severity: 'warn' };
    }
    if (/gefahr|vorsicht|warn|achtung/.test(lower)) {
      return { kind: 'hinweis', title: 'Sicherheits-Hinweis', severity: 'info' };
    }
    return null;
  }

  private formatOsmDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'OpenStreetMap';
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days <= 0) return 'heute';
    if (days === 1) return 'gestern';
    if (days < 14) return `vor ${days} Tagen`;
    return d.toLocaleDateString('de-DE');
  }

  /** OSM: Wege mit dog=leashed in der Nähe */
  private async fetchLeashZones(lat: number, lng: number, radiusKm: number): Promise<DogAlert[]> {
    const radiusM = Math.min(Math.round(radiusKm * 1000), 8000);
    const query = `
      [out:json][timeout:15];
      way["dog"="leashed"](around:${radiusM},${lat},${lng});
      out center 6;
    `;
    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as {
        elements: Array<{ id: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }>;
      };
      return data.elements
        .filter((el) => el.center)
        .map((el) => ({
          id: `osm-leash-${el.id}`,
          kind: 'leine' as const,
          title: 'Leinenpflicht (OpenStreetMap)',
          detail:
            el.tags?.['name'] ||
            'In diesem Bereich ist laut OpenStreetMap „Hund an der Leine“ gemappt.',
          lat: el.center!.lat,
          lng: el.center!.lon,
          ago: 'OSM-Kartendaten',
          severity: 'info' as const,
          source: 'OpenStreetMap',
          sourceUrl: `https://www.openstreetmap.org/way/${el.id}`,
        }));
    } catch {
      return [];
    }
  }

  private buildSeasonalAlerts(lat: number, lng: number): DogAlert[] {
    const month = new Date().getMonth() + 1;
    const alerts: DogAlert[] = [];
    if (month >= 3 && month <= 7) {
      alerts.push({
        id: 'season-brut',
        kind: 'brutzeit',
        title: 'Brut- & Setzzeit',
        detail:
          'März bis Juli: In Wiesen, Feldrändern und Hecken Bodenbrüter schützen — Leine in sensiblen Bereichen.',
        lat: lat + 0.008,
        lng: lng - 0.005,
        ago: 'Saison-Hinweis',
        severity: 'warn',
        source: 'NABU / Naturschutz',
        sourceUrl: 'https://www.nabu.de/tiere-und-pflanzen/voegel/brut-und-setzzeit/',
      });
    }
    if (month >= 4 && month <= 11) {
      alerts.push({
        id: 'season-weide',
        kind: 'leine',
        title: 'Weidezeit',
        detail: 'Weidetiere auf Wiesen und Hängen — Hund an der Leine, ausreichend Abstand halten.',
        lat: lat - 0.007,
        lng: lng + 0.006,
        ago: 'Saison-Hinweis',
        severity: 'info',
        source: 'Deutscher Jagdverband',
        sourceUrl: 'https://www.jagdverband.de/',
      });
    }
    return alerts;
  }

  private buildTips(spots: DogSpot[]): DogTip[] {
    return spots.slice(0, 4).flatMap((s, i) => [
      {
        id: `tip-${s.id}-1`,
        spotId: s.id,
        author: s.source === 'osm' ? 'OpenStreetMap' : ['Luna & Tom', 'BelloFan42', 'Mila.Marie', 'WuffiWanderin'][i % 4],
        text: s.snippet,
        ago: `${1 + i} Woche${i > 0 ? 'n' : ''}`,
      },
    ]);
  }

  private buildLeashStatus(): LeashStatus {
    const month = new Date().getMonth() + 1;
    const hour = new Date().getHours();
    const tipId = tipIdForLeashMonth(month);
    if (month >= 3 && month <= 7) {
      return {
        headline: 'Die Vögel zwitschern extra laut — Brutzeit.',
        detail: 'In Wiesen und Feldrändern gilt: Leine lieber dran. Dein Hund versteht’s später.',
        mood: 'alert',
        tipId: 'brutzeit',
      };
    }
    if (month >= 4 && month <= 11) {
      return {
        headline: 'Weidezeit — Kühe mögen Abstand.',
        detail: 'An Hängen und Wiesen: Hund an der Leine. Dafür gibt’s danach extra Streicheleinheiten.',
        mood: 'warm',
        tipId: 'weidezeit',
      };
    }
    if (hour >= 6 && hour < 10) {
      return {
        headline: 'Morgenschnüffeln freigegeben.',
        detail: 'In vielen Wäldern jetzt ohne Leinenpflicht — trotzdem Rücksicht auf Wild.',
        mood: 'calm',
        tipId,
      };
    }
    return {
      headline: 'Gemütliche Pfoten-Wetterlage.',
      detail: 'Standardregeln gelten — an Straßen und in Parks meist Leine.',
      mood: 'calm',
      tipId,
    };
  }
}
