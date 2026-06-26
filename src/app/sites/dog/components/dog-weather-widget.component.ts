import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DogExploreService } from '../dog-explore.service';
import type { DogWeatherMood, DogWeatherSlot } from '../dog-tips.data';

type HeatWarning = {
  tipId: string;
  label: string;
  emoji: string;
};

@Component({  selector: 'pv-dog-weather-widget',
  templateUrl: './dog-weather-widget.component.html',
  styleUrl: './dog-weather-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogWeatherWidgetComponent {
  readonly explore = inject(DogExploreService);

  readonly blockSlots = computed(() => {
    const bundle = this.explore.weather();
    if (!bundle) return [];
    return bundle.slots.filter((s) => s.kind === 'now' || s.kind === 'block');
  });

  readonly daySlots = computed(() => this.explore.weather()?.slots.filter((s) => s.kind === 'day') ?? []);

  readonly active = computed(() => this.explore.activeWeather());

  readonly heatWarnings = computed((): HeatWarning[] => {
    const w = this.active();
    if (!w || !this.isHeatMood(w.mood)) return [];
    const base: HeatWarning[] = [
      { tipId: 'heat-no-ventilator', label: 'Ventilator & Auto', emoji: '🌀' },
      { tipId: 'heat-cool-tips', label: 'Richtig kühlen', emoji: '💧' },
    ];
    if (w.mood === 'hot' || w.mood === 'scorching') {
      base.push({ tipId: 'heat-asphalt', label: 'Heiße Pfoten', emoji: '🐾' });
    }
    return base;
  });

  private isHeatMood(mood: DogWeatherMood): boolean {
    return mood === 'warm' || mood === 'hot' || mood === 'scorching';
  }

  selectSlot(id: string): void {
    this.explore.weatherSlotId.set(id);
  }

  weatherClass(w: DogWeatherSlot | null): string {
    if (!w) return 'dog-weather--loading';
    if (w.avoidNow) return 'dog-weather--alert';
    if (w.mood === 'warm' || w.mood === 'rain' || w.mood === 'cold') return 'dog-weather--warm';
    if (w.mood === 'great' || w.mood === 'ok') return 'dog-weather--calm';
    return 'dog-weather--warm';
  }

  openTip(id: string): void {
    this.explore.openTip(id);
  }
}
