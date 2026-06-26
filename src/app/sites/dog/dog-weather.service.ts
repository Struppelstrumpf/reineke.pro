import { Injectable } from '@angular/core';
import {
  type DogWeatherAdvice,
  type DogWeatherBundle,
  type DogWeatherMood,
  type DogWeatherSlot,
  pickVariant,
  weatherSeed,
  WEATHER_DETAILS,
  WEATHER_HEADLINES,
} from './dog-tips.data';

type HourPoint = { time: Date; temp: number; feels: number; code: number };

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    is_day?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    apparent_temperature?: number[];
    weather_code?: number[];
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
};

@Injectable({ providedIn: 'root' })
export class DogWeatherService {
  async loadFor(lat: number, lng: number): Promise<DogWeatherBundle | null> {
    try {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', String(lat));
      url.searchParams.set('longitude', String(lng));
      url.searchParams.set('current', 'temperature_2m,apparent_temperature,weather_code,is_day');
      url.searchParams.set(
        'hourly',
        'temperature_2m,apparent_temperature,weather_code',
      );
      url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min');
      url.searchParams.set('forecast_days', '7');
      url.searchParams.set('timezone', 'auto');

      const res = await fetch(url.toString());
      if (!res.ok) return null;
      const data = (await res.json()) as OpenMeteoResponse;
      return this.buildBundle(lat, lng, data);
    } catch {
      return null;
    }
  }

  private buildBundle(lat: number, lng: number, data: OpenMeteoResponse): DogWeatherBundle | null {
    const tempC = data.current?.temperature_2m;
    if (tempC == null || !Number.isFinite(tempC)) return null;

    const now = new Date();
    const hours = this.parseHours(data);
    const slots: DogWeatherSlot[] = [];

    const currentFeels = data.current?.apparent_temperature ?? tempC;
    const currentCode = data.current?.weather_code ?? 0;
    slots.push(
      this.toSlot('now', 'Jetzt', 'Jetzt', lat, lng, now, tempC, currentFeels, currentCode),
    );

    for (const block of [
      { start: 0, end: 12, label: 'bis 12', short: '≤12' },
      { start: 12, end: 15, label: '12–15', short: '12–15' },
      { start: 15, end: 21, label: '15–21', short: '15–21' },
      { start: 21, end: 24, label: '21–0', short: '21–0' },
    ]) {
      const blockHours = hours.filter((h) => {
        const hr = h.time.getHours();
        return hr >= block.start && hr < block.end && h.time.toDateString() === now.toDateString();
      });
      const pick = blockHours[Math.floor(blockHours.length / 2)] ?? blockHours[0];
      if (!pick) continue;
      slots.push(
        this.toSlot(`b-${block.start}`, block.label, block.short, lat, lng, pick.time, pick.temp, pick.feels, pick.code),
      );
    }

    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const dailyTimes = data.daily?.time ?? [];
    for (let i = 0; i < dailyTimes.length; i++) {
      const date = new Date(dailyTimes[i]);
      if (date.toDateString() === now.toDateString()) continue;
      const max = data.daily?.temperature_2m_max?.[i];
      const min = data.daily?.temperature_2m_min?.[i];
      const code = data.daily?.weather_code?.[i] ?? 0;
      if (max == null || min == null) continue;
      const avg = (max + min) / 2;
      const short =
        i === 1 || (i === 0 && date.toDateString() !== now.toDateString())
          ? 'Morgen'
          : dayNames[date.getDay()];
      const label = `${short} · ${Math.round(min)}–${Math.round(max)}°`;
      slots.push(
        this.toSlot(`d-${i}`, label, short, lat, lng, date, avg, avg, code),
      );
    }

    return { lat, lng, slots };
  }

  private toSlot(
    id: string,
    label: string,
    shortLabel: string,
    lat: number,
    lng: number,
    at: Date,
    temp: number,
    feels: number,
    code: number,
  ): DogWeatherSlot {
    const kind = id.startsWith('d-') ? 'day' : id === 'now' ? 'now' : 'block';
    const advice = this.buildAdvice(lat, lng, temp, feels, code, at);
    return { id, kind, label, shortLabel, ...advice };
  }

  private buildAdvice(
    lat: number,
    lng: number,
    tempC: number,
    feelsLikeC: number,
    code: number,
    at: Date,
  ): DogWeatherAdvice {
    const mood = this.resolveMood(tempC, feelsLikeC, code);
    const seed = weatherSeed(lat, lng, at.getDate() + at.getHours());
    const { weatherEmoji, weatherLabel } = this.weatherLabel(code);
    const hours: HourPoint[] = [{ time: at, temp: tempC, feels: feelsLikeC, code }];
    const walkHint = this.buildWalkHint(mood, tempC, hours, at);
    const avoidNow = mood === 'hot' || mood === 'scorching' || mood === 'freezing';

    return {
      tempC: Math.round(tempC),
      feelsLikeC: Math.round(feelsLikeC),
      weatherEmoji,
      weatherLabel,
      mood,
      headline: pickVariant(WEATHER_HEADLINES[mood], seed),
      detail: pickVariant(WEATHER_DETAILS[mood], seed + 3),
      walkHint,
      avoidNow,
      tipId: this.tipIdForMood(mood),
    };
  }

  private parseHours(data: OpenMeteoResponse): HourPoint[] {
    const times = data.hourly?.time ?? [];
    const temps = data.hourly?.temperature_2m ?? [];
    const feels = data.hourly?.apparent_temperature ?? [];
    const codes = data.hourly?.weather_code ?? [];
    const out: HourPoint[] = [];
    for (let i = 0; i < times.length; i++) {
      const t = temps[i];
      if (t == null) continue;
      out.push({
        time: new Date(times[i]),
        temp: t,
        feels: feels[i] ?? t,
        code: codes[i] ?? 0,
      });
    }
    return out;
  }

  private resolveMood(temp: number, feels: number, code: number): DogWeatherMood {
    if (code >= 51 && code <= 67) return 'rain';
    if (code >= 80 && code <= 82) return 'rain';
    if (code >= 95) return 'rain';
    const effective = Math.max(temp, feels);
    if (effective >= 32) return 'scorching';
    if (effective >= 27) return 'hot';
    if (effective >= 24) return 'warm';
    if (temp <= -8) return 'freezing';
    if (temp <= 0) return 'cold';
    if (temp >= 10 && temp <= 22) return 'great';
    return 'ok';
  }

  private tipIdForMood(mood: DogWeatherMood): string {
    switch (mood) {
      case 'scorching':
        return 'weather-scorching';
      case 'hot':
        return 'weather-hot';
      case 'warm':
        return 'weather-warm';
      case 'cold':
        return 'weather-cold';
      case 'freezing':
        return 'weather-freezing';
      case 'rain':
        return 'weather-rain';
      case 'great':
        return 'weather-great';
      default:
        return 'weather-warm';
    }
  }

  private buildWalkHint(mood: DogWeatherMood, temp: number, hours: HourPoint[], now: Date): string {
    if (mood === 'great' || mood === 'ok') {
      return pickVariant(
        [
          'Problemlos Gassi gehen.',
          'Grünes Licht — die Pfoten dürfen.',
          'Gute Zeit für eine Runde.',
          'Nase frei — raus damit!',
        ],
        now.getHours() + now.getDate(),
      );
    }

    if (mood === 'warm') {
      return pickVariant(
        [
          'Kürzer raus — Schatten suchen.',
          'Geht, aber nicht in der prallen Mittagssonne.',
          'Morgens früh oder abends ist besser.',
        ],
        now.getDate(),
      );
    }

    if (mood === 'rain') {
      return 'Kurze Runde reicht — danach abtrocknen.';
    }

    if (mood === 'cold' || mood === 'freezing') {
      return pickVariant(
        [
          'Kurze Runden — Pfoten danach wärmen.',
          'Nur das Nötigste, dann wieder rein.',
          'Mini-Spaziergang, kein Marathon.',
        ],
        now.getDate() + 1,
      );
    }

    const coolEnough = (h: HourPoint) => h.temp < (mood === 'scorching' ? 24 : 25);
    const hourOk = (h: HourPoint) => {
      const hr = h.time.getHours();
      return hr >= 6 && hr <= 21;
    };

    const future = hours.filter((h) => h.time > now);
    const nextGood = future.find((h) => coolEnough(h) && hourOk(h));

    if (nextGood) {
      return `Besser ab ${this.formatClock(nextGood.time, now)} — dann unter ~${Math.round(nextGood.temp)} °C.`;
    }

    if (temp >= 28) {
      return 'Zu heiß — abends abkühlen lassen, dann kurz raus.';
    }

    return 'Lieber Schatten & kurze Ausflüge.';
  }

  private formatClock(d: Date, now: Date): string {
    const h = d.getHours();
    const m = d.getMinutes();
    const clock = m > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${h} Uhr`;
    if (this.isTomorrow(d, now)) return `${clock} morgen`;
    return clock;
  }

  private isTomorrow(d: Date, now: Date): boolean {
    const t = new Date(now);
    t.setDate(t.getDate() + 1);
    return d.toDateString() === t.toDateString();
  }

  private weatherLabel(code: number): { weatherEmoji: string; weatherLabel: string } {
    if (code === 0) return { weatherEmoji: '☀️', weatherLabel: 'Klar' };
    if (code <= 3) return { weatherEmoji: '⛅', weatherLabel: 'Teils bewölkt' };
    if (code <= 48) return { weatherEmoji: '🌫️', weatherLabel: 'Nebel' };
    if (code <= 57) return { weatherEmoji: '🌦️', weatherLabel: 'Nieselregen' };
    if (code <= 67) return { weatherEmoji: '🌧️', weatherLabel: 'Regen' };
    if (code <= 77) return { weatherEmoji: '❄️', weatherLabel: 'Schnee' };
    if (code <= 82) return { weatherEmoji: '🌧️', weatherLabel: 'Schauer' };
    if (code >= 95) return { weatherEmoji: '⛈️', weatherLabel: 'Gewitter' };
    return { weatherEmoji: '🌡️', weatherLabel: 'Vor Ort' };
  }
}
