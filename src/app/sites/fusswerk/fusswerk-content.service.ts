import { Injectable, computed, signal } from '@angular/core';
import {
  FW_BOOKING_SETTINGS_DEFAULT,
  FW_BUSINESS,
  FW_PRICE_TIERS,
  FW_SERVICES,
  FW_TRUST,
  type FwPriceTier,
  type FwService,
} from './fusswerk.data';
import {
  FW_CONTENT_KEY,
  type FwBookingSettings,
  type FwBusinessContent,
  type FwContentState,
  type FwHourRow,
  type FwOpeningHoursSchedule,
  type FwPageCopy,
  type FwTheme,
  type DeepPartial,
} from './fusswerk-content.types';
import type { FwSchedulePayload } from './fusswerk-scheduling';
import { computeSlots } from './fusswerk-scheduling';
import { formatDurationShort, normalizeServiceDuration } from './fusswerk-duration.util';
import {
  defaultOpeningHours,
  formatOpeningHoursRows,
  migrateHoursRows,
  normalizeOpeningHours,
} from './fusswerk-opening-hours.util';

export { FW_CONTENT_KEY } from './fusswerk-content.types';
export type {
  FwBusinessContent,
  FwContentState,
  FwHourRow,
  FwOpeningHoursSchedule,
  FwPageCopy,
  FwTheme,
} from './fusswerk-content.types';

const FW_CONTENT_SYNC = 'fw-content-v1';

function phoneToTel(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return 'tel:';
  if (digits.startsWith('49')) return `tel:+${digits}`;
  if (digits.startsWith('0')) return `tel:+49${digits.slice(1)}`;
  return `tel:+${digits}`;
}

function defaultCopy(): FwPageCopy {
  return {
    hero: {
      titleLine1: 'Ihr Fußpflegestudio',
      titleLine2: 'in Bad Rothenfelde',
      lead: 'Zeit für Ihre Füße — ruhig, hygienisch und persönlich in der Salinenstraße.',
      ctaPrimary: 'Termin vereinbaren',
      ctaSecondary: 'Preise ansehen',
      point1: 'Klassische & medizinische Fußpflege',
      point2: 'Barrierefrei in der Fußgängerzone',
      openingLabel: 'Neueröffnung',
    },
    angebot: {
      eyebrow: 'Unser Angebot',
      title: 'Was wir für Sie tun',
      lead: 'Groß geschrieben, klar erklärt — damit Sie sofort wissen, was passt.',
    },
    preise: {
      eyebrow: 'Preise',
      title: 'Einfach nachvollziehbar',
    },
    studioSection: {
      eyebrow: 'Ihr Studio vor Ort',
      title: 'Mitten in Bad Rothenfelde',
      body: 'In der Fußgängerzone, ruhig und gut erreichbar — dort wo früher Nellys Juice Bar war. Helle Räume, bequeme Liege, Zeit nur für Sie.',
    },
    kontakt: {
      eyebrow: 'Kontakt',
      title: 'So erreichen Sie uns',
    },
  };
}

function defaultTheme(): FwTheme {
  return {
    fonts: {
      body: "'DM Sans', system-ui, sans-serif",
      display: "'Montserrat', system-ui, sans-serif",
      serif: "'Cormorant Garamond', Georgia, serif",
    },
    colors: {
      ink: '#1c2428',
      muted: '#4f5d63',
      gold: '#b8956b',
      blue: '#6a8fa8',
      blueDeep: '#4f6f86',
      bg: '#f3efe8',
      paper: '#fffdf9',
    },
    sizes: {
      heroTitle: 'clamp(2.4rem, 6.5vh, 4rem)',
      sectionTitle: 'clamp(2.2rem, 5.5vw, 3.4rem)',
      body: '1.0625rem',
      eyebrow: '0.74rem',
    },
    hero: {
      titleColor: '#ffffff',
      leadColor: 'rgba(255, 255, 255, 0.84)',
    },
  };
}

function defaultContent(): FwContentState {
  return {
    business: {
      phone: FW_BUSINESS.phone,
      email: FW_BUSINESS.email,
      instagram: FW_BUSINESS.instagram,
      facebook: FW_BUSINESS.facebook,
      googleReviews: FW_BUSINESS.googleReviews,
      googleRating: 4.9,
      googleReviewCount: 38,
      opened: FW_BUSINESS.opened,
      showOpeningNotice: true,
      street: FW_BUSINESS.street,
      zip: FW_BUSINESS.zip,
      city: FW_BUSINESS.city,
    },
    openingHours: defaultOpeningHours(),
    services: FW_SERVICES.map((s) => ({ ...s, includes: [...s.includes] })),
    priceTiers: FW_PRICE_TIERS.map((p) => ({ ...p, highlights: [...p.highlights] })),
    trust: [...FW_TRUST],
    copy: defaultCopy(),
    theme: defaultTheme(),
    bookingSettings: { ...FW_BOOKING_SETTINGS_DEFAULT },
  };
}

function resolveOpeningHours(parsed: Partial<FwContentState> & { hours?: FwHourRow[] }): FwOpeningHoursSchedule {
  if (parsed.openingHours?.length) return normalizeOpeningHours(parsed.openingHours);
  if (parsed.hours?.length) return migrateHoursRows(parsed.hours);
  return defaultOpeningHours();
}

function mergeContent(parsed: Partial<FwContentState> & { hours?: FwHourRow[] }): FwContentState {
  const base = defaultContent();
  return {
    ...base,
    ...parsed,
    business: { ...base.business, ...parsed.business },
    copy: {
      ...base.copy,
      ...parsed.copy,
      hero: { ...base.copy.hero, ...parsed.copy?.hero },
      angebot: { ...base.copy.angebot, ...parsed.copy?.angebot },
      preise: { ...base.copy.preise, ...parsed.copy?.preise },
      studioSection: { ...base.copy.studioSection, ...parsed.copy?.studioSection },
      kontakt: { ...base.copy.kontakt, ...parsed.copy?.kontakt },
    },
    theme: {
      ...base.theme,
      ...parsed.theme,
      fonts: { ...base.theme.fonts, ...parsed.theme?.fonts },
      colors: { ...base.theme.colors, ...parsed.theme?.colors },
      sizes: { ...base.theme.sizes, ...parsed.theme?.sizes },
      hero: { ...base.theme.hero, ...parsed.theme?.hero },
    },
    services: (parsed.services ?? base.services).map((s) => normalizeServiceDuration(s)),
    priceTiers: parsed.priceTiers ?? base.priceTiers,
    openingHours: resolveOpeningHours(parsed),
    trust: parsed.trust ?? base.trust,
    bookingSettings: { ...base.bookingSettings, ...parsed.bookingSettings },
  };
}

@Injectable({ providedIn: 'root' })
export class FusswerkContentService {
  private readonly sync =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(FW_CONTENT_SYNC) : null;

  private readonly state = signal<FwContentState>(this.load());

  readonly content = this.state.asReadonly();
  readonly business = computed(() => this.state().business);
  readonly openingHours = computed(() => this.state().openingHours);
  readonly hours = computed(() => formatOpeningHoursRows(this.state().openingHours));
  readonly services = computed(() => this.state().services);
  readonly priceTiers = computed(() => this.state().priceTiers);
  readonly trust = computed(() => this.state().trust);
  readonly copy = computed(() => this.state().copy);
  readonly theme = computed(() => this.state().theme);
  readonly bookingSettings = computed(() => this.state().bookingSettings);

  readonly schedulePayload = computed(
    (): FwSchedulePayload => {
      const openingHours = this.state().openingHours;
      return {
        openingHours,
        hours: formatOpeningHoursRows(openingHours),
        services: this.state().services.map((s) => ({
          id: s.id,
          duration: s.duration,
          durationMinutes: s.durationMinutes,
        })),
        settings: this.state().bookingSettings,
      };
    },
  );

  readonly businessView = computed(() => {
    const b = this.state().business;
    const ratingLabel = b.googleRating.toFixed(1).replace('.', ',');
    return {
      ...FW_BUSINESS,
      ...b,
      phoneTel: phoneToTel(b.phone),
      emailMailto: `mailto:${b.email}`,
      googleRatingValue: ratingLabel,
      googleRating: `${ratingLabel} ★★★★★ · ${b.googleReviewCount} Google-Bewertungen`,
      showOpeningNotice: b.showOpeningNotice,
    };
  });

  readonly themeStyle = computed(() => {
    const t = this.state().theme;
    return {
      '--fw-font': t.fonts.body,
      '--fw-display': t.fonts.display,
      '--fw-serif': t.fonts.serif,
      '--fw-ink': t.colors.ink,
      '--fw-muted': t.colors.muted,
      '--fw-gold': t.colors.gold,
      '--fw-blue': t.colors.blue,
      '--fw-blue-deep': t.colors.blueDeep,
      '--fw-bg': t.colors.bg,
      '--fw-paper': t.colors.paper,
      '--fw-hero-title-size': t.sizes.heroTitle,
      '--fw-section-title-size': t.sizes.sectionTitle,
      '--fw-body-size': t.sizes.body,
      '--fw-eyebrow-size': t.sizes.eyebrow,
      '--fw-hero-title-color': t.hero.titleColor,
      '--fw-hero-lead-color': t.hero.leadColor,
    } as Record<string, string>;
  });

  readonly bookingServices = computed(() =>
    this.services().map((s) => ({
      id: s.id,
      label: s.title,
      duration: formatDurationShort(s.durationMinutes),
      durationMinutes: s.durationMinutes,
      price: s.fromPrice,
      note: s.summary.split('—')[0].trim().slice(0, 42),
    })),
  );

  constructor() {
    this.sync?.addEventListener('message', () => this.state.set(this.readStorage()));
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === FW_CONTENT_KEY) this.state.set(this.readStorage());
      });
    }
  }

  update(partial: Partial<FwContentState>): void {
    this.persist({ ...this.state(), ...partial });
  }

  updateBusiness(partial: Partial<FwBusinessContent>): void {
    this.persist({
      ...this.state(),
      business: { ...this.state().business, ...partial },
    });
  }

  updateCopy(partial: DeepPartial<FwPageCopy>): void {
    const current = this.state().copy;
    this.persist({
      ...this.state(),
      copy: {
        ...current,
        ...partial,
        hero: { ...current.hero, ...partial.hero },
        angebot: { ...current.angebot, ...partial.angebot },
        preise: { ...current.preise, ...partial.preise },
        studioSection: { ...current.studioSection, ...partial.studioSection },
        kontakt: { ...current.kontakt, ...partial.kontakt },
      },
    });
  }

  updateTheme(partial: DeepPartial<FwTheme>): void {
    const current = this.state().theme;
    this.persist({
      ...this.state(),
      theme: {
        ...current,
        ...partial,
        fonts: { ...current.fonts, ...partial.fonts },
        colors: { ...current.colors, ...partial.colors },
        sizes: { ...current.sizes, ...partial.sizes },
        hero: { ...current.hero, ...partial.hero },
      },
    });
  }

  saveServices(services: FwService[]): void {
    this.persist({ ...this.state(), services: services.map((s) => normalizeServiceDuration(s)) });
  }

  savePriceTiers(priceTiers: FwPriceTier[]): void {
    this.persist({ ...this.state(), priceTiers });
  }

  saveOpeningHours(openingHours: FwOpeningHoursSchedule): void {
    this.persist({ ...this.state(), openingHours: normalizeOpeningHours(openingHours) });
  }

  saveBookingSettings(settings: FwBookingSettings): void {
    this.persist({ ...this.state(), bookingSettings: settings });
  }

  computeSlotsForDate(date: string, bookings: Parameters<typeof computeSlots>[2], serviceId?: string) {
    return computeSlots(date, this.schedulePayload(), bookings, serviceId);
  }

  saveTrust(trust: string[]): void {
    this.persist({ ...this.state(), trust });
  }

  reload(): void {
    this.state.set(this.readStorage());
  }

  private persist(next: FwContentState): void {
    this.state.set(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FW_CONTENT_KEY, JSON.stringify(next));
    }
    this.sync?.postMessage('updated');
  }

  private load(): FwContentState {
    const data = this.readStorage();
    if (typeof localStorage !== 'undefined' && !localStorage.getItem(FW_CONTENT_KEY)) {
      localStorage.setItem(FW_CONTENT_KEY, JSON.stringify(data));
    }
    return data;
  }

  private readStorage(): FwContentState {
    if (typeof localStorage === 'undefined') return defaultContent();
    try {
      const raw = localStorage.getItem(FW_CONTENT_KEY);
      if (!raw) return defaultContent();
      return mergeContent(JSON.parse(raw) as Partial<FwContentState>);
    } catch {
      return defaultContent();
    }
  }
}
