import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { DOG_SPOT_EMOJI, type DogAlert, type DogSpot } from '../dog.data';
import { DogExploreService } from '../dog-explore.service';
import {
  alertMarkerHtml,
  dominantSpotKind,
  spotClusterHtml,
  spotMarkerHtml,
  type DogSpotMarkerOptions,
} from '../dog-map-markers';
import { dogMascotMarkerHtml } from '../dog-mascot-marker';
import {
  DogPetMapGameService,
  gameMarkerHtml,
  type MapGameEntity,
} from '../dog-pet-map-game.service';
import { DogThemeService } from '../dog-theme.service';
import { DogPinsService } from '../dog-pins.service';

const TILE_LIGHT = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

@Component({
  selector: 'pv-dog-map',
  template: `<div #mapHost class="dog-map" role="application" aria-label="Interaktive Karte"></div>`,
  styleUrl: './dog-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogMapComponent implements AfterViewInit, OnDestroy {
  private readonly explore = inject(DogExploreService);
  private readonly theme = inject(DogThemeService);
  private readonly mapGame = inject(DogPetMapGameService);
  private readonly pins = inject(DogPinsService);
  private readonly mapHost = viewChild<ElementRef<HTMLDivElement>>('mapHost');

  private map?: L.Map;
  private spotCluster?: L.MarkerClusterGroup;
  private alertLayer = L.layerGroup();
  private gameLayer = L.layerGroup();
  private pickLayer = L.layerGroup();
  private userMarker?: L.Marker;
  private tileLayer?: L.TileLayer;
  private resizeObserver?: ResizeObserver;
  private lastCenterKey = '';
  private gameMarkers = new Map<string, L.Marker>();
  private gameMarkerKeys = new Map<string, string>();
  private gameZoomActive = false;
  private zoomBeforeGame = 15;

  private readonly dogIcon = L.divIcon({
    className: 'dog-map__user-wrap',
    html: dogMascotMarkerHtml(),
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });

  constructor() {
    effect(() => {
      const c = this.explore.center();
      const spots = this.explore.allMapSpots();
      const community = this.explore.spotsWithCommunity();
      const alerts = this.explore.visibleMapAlerts();
      const selectedSpot = this.explore.selectedSpotId();
      const selectedAlert = this.explore.selectedAlertId();
      const gameOn = this.mapGame.playing();
      const pinPick = this.pins.mapPickActive();
      this.renderMarkers(c, spots, alerts, selectedSpot, selectedAlert, gameOn, community, pinPick);
    });

    effect(() => {
      const pinPick = this.pins.mapPickActive();
      const preview = this.pins.mapPickPreview();
      this.applyMapPickMode(pinPick, preview);
    });

    effect(() => {
      const target = this.explore.mapPopupTarget();
      if (!this.map || !target || this.mapGame.playing()) return;
      const item =
        target.type === 'spot'
          ? this.explore.selectedSpot()
          : this.explore.selectedAlert();
      if (item) {
        this.map.panTo([item.lat, item.lng], { animate: true, duration: 0.35 });
      }
    });

    effect(() => {
      const dark = this.theme.isDark();
      this.applyTiles(dark);
    });

    effect(() => {
      const entities = this.mapGame.entities();
      const playing = this.mapGame.playing();
      this.renderGameEntities(playing ? entities : []);
    });

    effect(() => {
      const playing = this.mapGame.playing();
      if (!this.map) return;
      const c = this.explore.center();
      if (playing && !this.gameZoomActive) {
        this.zoomBeforeGame = this.map.getZoom();
        this.map.setView([c.lat, c.lng], this.mapGame.gameZoom, { animate: true });
        this.gameZoomActive = true;
      } else if (!playing && this.gameZoomActive) {
        this.map.setView([c.lat, c.lng], this.zoomBeforeGame, { animate: true });
        this.gameZoomActive = false;
      } else if (playing && this.gameZoomActive && this.map.getZoom() < this.mapGame.gameZoom) {
        this.map.setZoom(this.mapGame.gameZoom, { animate: true });
      }
    });

    effect(() => {
      const fx = this.mapGame.dogFx();
      const moving = this.mapGame.moving();
      this.applyDogMarkerFx(fx, moving);
    });
  }

  private applyDogMarkerFx(fx: string | null, moving: boolean): void {
    const el = this.userMarker?.getElement();
    if (!el) return;
    el.classList.toggle('dog-map__user-wrap--run', moving && fx !== 'steamed' && fx !== 'shock');
    el.classList.toggle('dog-map__user-wrap--shock', fx === 'shock');
    el.classList.toggle('dog-map__user-wrap--steamed', fx === 'steamed');
    el.classList.toggle('dog-map__user-wrap--dizzy', fx === 'dizzy');
    el.classList.toggle('dog-map__user-wrap--sad', fx === 'sad');
  }

  ngAfterViewInit(): void {
    const host = this.mapHost()?.nativeElement;
    if (!host) return;

    const c = this.explore.center();
    this.map = L.map(host, {
      zoomControl: false,
      attributionControl: true,
    }).setView([c.lat, c.lng], 15);

    this.applyTiles(this.theme.isDark());
    this.spotCluster = this.createSpotCluster();
    this.spotCluster.addTo(this.map);
    this.alertLayer.addTo(this.map);
    this.gameLayer.addTo(this.map);
    this.pickLayer.addTo(this.map);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.pins.mapPickActive()) {
        this.pins.setMapPickPreview(e.latlng.lat, e.latlng.lng);
      }
    });

    requestAnimationFrame(() => {
      this.map?.invalidateSize();
      setTimeout(() => this.map?.invalidateSize(), 200);
    });
    this.resizeObserver = new ResizeObserver(() => {
      this.map?.invalidateSize();
    });
    this.resizeObserver.observe(host);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  private applyTiles(dark: boolean): void {
    if (!this.map) return;
    if (this.tileLayer) {
      this.map.removeLayer(this.tileLayer);
    }
    const url = dark ? TILE_DARK : TILE_LIGHT;
    const attribution = dark
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> · <a href="https://carto.com/">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
    this.tileLayer = L.tileLayer(url, { maxZoom: 19, attribution }).addTo(this.map);
  }

  private createSpotCluster(): L.MarkerClusterGroup {
    return L.markerClusterGroup({
      maxClusterRadius: 52,
      disableClusteringAtZoom: 16,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      animate: true,
      animateAddingMarkers: false,
      iconCreateFunction: (cluster) => {
        const markers = cluster.getAllChildMarkers();
        const kind = dominantSpotKind(markers);
        const count = cluster.getChildCount();
        const size = count >= 100 ? 48 : count >= 10 ? 44 : 40;
        return L.divIcon({
          className: 'dog-map__cluster-wrap',
          html: spotClusterHtml(kind, count),
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });
  }

  private applyMapPickMode(active: boolean, preview: { lat: number; lng: number } | null): void {
    const host = this.mapHost()?.nativeElement;
    host?.classList.toggle('dog-map--picking', active);
    host?.classList.toggle('dog-map--picking-preview', active && preview != null);

    if (!this.map) return;
    this.pickLayer.clearLayers();
    if (!active || !preview) return;

    const icon = L.divIcon({
      className: 'dog-map__pick-wrap',
      html: `<div class="dog-map__pick-preview" aria-hidden="true"><span class="dog-map__pick-ring"></span><span class="dog-map__pick-pin">📍</span></div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
    L.marker([preview.lat, preview.lng], { icon, zIndexOffset: 1200 }).addTo(this.pickLayer);
  }

  private renderMarkers(
    center: { lat: number; lng: number },
    spots: DogSpot[],
    alerts: DogAlert[],
    selectedSpotId: string | null,
    selectedAlertId: string | null,
    gameOn: boolean,
    community: Set<string>,
    pinPick: boolean,
  ): void {
    if (!this.map) return;

    this.spotCluster?.clearLayers();
    this.alertLayer.clearLayers();

    if (this.userMarker) {
      this.userMarker.setLatLng([center.lat, center.lng]);
    } else {
      this.userMarker = L.marker([center.lat, center.lng], {
        icon: this.dogIcon,
        zIndexOffset: 1000,
      })
        .addTo(this.map)
        .bindTooltip('Du bist hier — Nasebär', { direction: 'top', offset: [0, -10] });
    }

    const moving = this.mapGame.moving();
    const fx = this.mapGame.dogFx();
    this.userMarker.setTooltipContent(
      fx === 'steamed'
        ? 'Autsch … *dampf*'
        : fx === 'shock'
          ? '⚡ Zapp!'
          : moving
            ? 'Unterwegs …'
            : 'Du bist hier — Nasebär',
    );

    const el = this.userMarker.getElement();
    this.applyDogMarkerFx(fx, moving);

    if (!gameOn && !pinPick) {
      for (const alert of alerts) {
        const isSelected = alert.id === selectedAlertId;
        const icon = L.divIcon({
          className: 'dog-map__alert-wrap',
          html: alertMarkerHtml(alert, isSelected),
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
        const marker = L.marker([alert.lat, alert.lng], {
          icon,
          zIndexOffset: alert.kind === 'giftkoeder' ? 1100 : 950,
        });
        marker.bindTooltip(
          alert.kind === 'giftkoeder' ? `⚠ ${alert.title}` : alert.title,
          { direction: 'top', offset: [0, -14] },
        );
        marker.on('click', () => this.explore.selectAlert(alert.id));
        this.alertLayer.addLayer(marker);
      }

      for (const spot of spots) {
        const isSelected = spot.id === selectedSpotId;
        const icon = L.divIcon({
          className: 'dog-map__spot-wrap',
          html: spotMarkerHtml(spot, isSelected, community.has(spot.id)),
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
        const marker = L.marker([spot.lat, spot.lng], {
          icon,
          dogKind: spot.kind,
          zIndexOffset: isSelected ? 900 : 700,
        } as DogSpotMarkerOptions);
        marker.bindTooltip(`${DOG_SPOT_EMOJI[spot.kind]} ${spot.name}`, {
          direction: 'top',
          offset: [0, -12],
        });
        marker.on('click', () => this.explore.selectSpot(spot.id));
        this.spotCluster?.addLayer(marker);
      }
    }

    const centerKey = `${center.lat.toFixed(5)}:${center.lng.toFixed(5)}:${spots.length}:${gameOn}`;
    if (gameOn) {
      this.map.panTo([center.lat, center.lng], { animate: true, duration: 0.25 });
      return;
    }

    if (centerKey !== this.lastCenterKey) {
      this.lastCenterKey = centerKey;
      if (spots.length) {
        const bounds = L.latLngBounds([
          [center.lat, center.lng],
          ...spots.map((s) => [s.lat, s.lng] as [number, number]),
        ]);
        this.map.fitBounds(bounds.pad(0.15), { animate: true, maxZoom: 14 });
      } else {
        this.map.setView([center.lat, center.lng], 15, { animate: true });
      }
    }
  }

  private renderGameEntities(entities: MapGameEntity[]): void {
    if (!this.map) return;

    if (!entities.length) {
      this.gameLayer.clearLayers();
      this.gameMarkers.clear();
      this.gameMarkerKeys.clear();
      return;
    }

    const visible = entities.filter((e) => !e.collected && e.visible);
    const live = new Set(visible.map((e) => e.id));

    for (const [id, marker] of this.gameMarkers) {
      if (!live.has(id)) {
        this.gameLayer.removeLayer(marker);
        this.gameMarkers.delete(id);
        this.gameMarkerKeys.delete(id);
      }
    }

    for (const entity of visible) {
      const iconSize = entity.size === 'lg' ? 64 : 48;
      const renderKey = `${entity.kind}:${entity.size}:${entity.bubble ?? ''}:${entity.clickable}:${entity.lat.toFixed(6)}:${entity.lng.toFixed(6)}`;
      const existing = this.gameMarkers.get(entity.id);

      if (existing) {
        existing.setLatLng([entity.lat, entity.lng]);
        if (this.gameMarkerKeys.get(entity.id) !== renderKey) {
          existing.setIcon(
            L.divIcon({
              className: 'dog-map__game-wrap',
              html: gameMarkerHtml(entity),
              iconSize: [iconSize, iconSize + (entity.bubble ? 14 : 0)],
              iconAnchor: [iconSize / 2, iconSize / 2 + (entity.bubble ? 8 : 0)],
            }),
          );
          this.gameMarkerKeys.set(entity.id, renderKey);
        }
        existing.off('click');
        existing.on('click', () => void this.mapGame.collectEntity(entity.id));
        continue;
      }

      const icon = L.divIcon({
        className: 'dog-map__game-wrap dog-map__game-wrap--new',
        html: gameMarkerHtml(entity),
        iconSize: [iconSize, iconSize + (entity.bubble ? 14 : 0)],
        iconAnchor: [iconSize / 2, iconSize / 2 + (entity.bubble ? 8 : 0)],
      });

      const marker = L.marker([entity.lat, entity.lng], {
        icon,
        zIndexOffset: entity.kind === 'storm-cloud' ? 800 : 900,
      });
      marker.on('click', () => void this.mapGame.collectEntity(entity.id));
      marker.addTo(this.gameLayer);
      this.gameMarkers.set(entity.id, marker);
      this.gameMarkerKeys.set(entity.id, renderKey);
    }
  }
}
