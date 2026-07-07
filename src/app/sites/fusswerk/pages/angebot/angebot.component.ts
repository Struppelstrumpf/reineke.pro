import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PREVIEW_STUDIO } from '../../../../core/preview.config';

type OfferPackage = {
  id: string;
  tier: string;
  name: string;
  tagline: string;
  price: number;
  referencePrice: number;
  monthlyRef: string;
  monthlyAfter: string;
  highlight?: boolean;
  paymentMode?: 'once' | 'installment';
  /** Erste Rate / Anzahlung (höher — Projektstart & Setup). */
  installmentDownPayment?: number;
  /** Anzahl weiterer Monatsraten nach der Anzahlung. */
  installmentCount?: number;
  /** Betrag je Folgerate. */
  installmentAmount?: number;
  /** Einmalpreis zum Vergleich (z. B. Paket B). */
  onceComparePrice?: number;
  features: string[];
};

@Component({
  selector: 'pv-fw-angebot',
  imports: [RouterLink],
  templateUrl: './angebot.component.html',
  styleUrls: ['./angebot.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwAngebotComponent {
  readonly studio = PREVIEW_STUDIO;
  readonly validUntil = '31. August 2026';
  readonly recipient = 'Fusswerk · Bad Rothenfelde';

  readonly packages: OfferPackage[] = [
    {
      id: 'landing',
      tier: 'Paket A',
      name: 'Landingpage',
      tagline: 'Ihr professioneller Webauftritt — Terminanfragen per E-Mail',
      price: 300,
      referencePrice: 990,
      monthlyRef: '19 €',
      monthlyAfter: '23 €',
      features: [
        'Individuelles Design — keine Vorlage von der Stange',
        'Farben, Schriften & Stil nach Ihrem Wunsch',
        'Seiten hinzufügen oder Inhalte jederzeit anpassbar',
        'Mobil optimiert & schnell (Core Web Vitals)',
        'Termin-Formular → direkt in Ihre E-Mail',
        'Impressum & Datenschutz',
        'Domain, Server & SSL-Einrichtung',
      ],
    },
    {
      id: 'studio',
      tier: 'Paket B',
      name: 'Komplettsystem',
      tagline: 'Wie diese Demo — Studio, Kalender, Chat & Inhalte',
      price: 750,
      referencePrice: 2490,
      monthlyRef: '29 €',
      monthlyAfter: '33 €',
      highlight: true,
      features: [
        'Alles aus Paket A — plus volles Backend',
        'Studio-Login: Termine bestätigen, verschieben, sperren',
        'Online-Buchung landet live im Kalender',
        'Inhalte selbst bearbeiten (Texte, Preise, Öffnungszeiten)',
        'Chat-Widget mit Antworten aus dem Studio',
        'Farben, Layout & neue Seiten — wir passen alles an',
        'Ihre Daten auf eigenem Server (Hetzner DE)',
      ],
    },
    {
      id: 'studio-installment',
      tier: 'Paket C',
      name: 'Komplettsystem — Ratenzahlung',
      tagline: 'Gleiche Leistung wie Paket B — bezahlt in 6 Monatsraten',
      price: 869,
      referencePrice: 2490,
      monthlyRef: '29 €',
      monthlyAfter: '33 €',
      onceComparePrice: 750,
      paymentMode: 'installment',
      installmentDownPayment: 199,
      installmentCount: 5,
      installmentAmount: 134,
      features: [
        'Identische Leistung wie Paket B (Komplettsystem)',
        'Studio-Login, Kalender, Chat & Inhalte inklusive',
        'Domain, Server & SSL-Einrichtung',
        'Ideal beim Geschäftsstart — ohne große Einmalzahlung',
        'Nach den 6 Monaten nur noch Hosting & Betreuung',
      ],
    },
  ];

  readonly freedomPoints = [
    { icon: '◆', title: 'Farben & Stil', text: 'Jede Farbe, jede Schrift — wir gestalten nach Ihrer Marke, nicht nach Baukasten-Vorgaben.' },
    { icon: '◇', title: 'Seiten & Inhalte', text: 'Neue Seiten, geänderte Texte, andere Bilder — jederzeit, ohne Limit-Vorgaben eines Templates.' },
    { icon: '○', title: 'Funktionen', text: 'Terminlogik, Formulare, Chat — maßgeschneidert statt Plugin-Puzzle.' },
  ];

  readonly builderPain = [
    'Monatliche Baukasten-Gebühr — oft 15–40 €, ohne dass Sie die Seite besitzen',
    'Gleiche Templates wie hunderte andere Betriebe',
    'Langsam durch Plugin-Wust & Werbung des Anbieters',
    'Terminbuchung nur als teures Zusatzmodul',
    'Kein echter Kalender — nur E-Mail-Weiterleitung',
    'Bei Kündigung: Website weg oder Export-Müll',
  ];

  readonly customWins = [
    'Einmalige Entwicklung — die Seite gehört Ihnen',
    'Extrem schnell: reiner Code, kein WordPress-Ballast',
    'Eigener Server — Ihre Kundendaten bleiben bei Ihnen',
    'Echter Studio-Kalender mit Bestätigung & Sperrzeiten',
    'Persönlicher Ansprechpartner statt Hotline',
    'Änderungen durch uns — fair kalkuliert, ohne Abo-Zwang',
  ];

  readonly marketRefs = [
    { label: 'Landingpage Agentur (üblich)', range: '800 – 1.500 €' },
    { label: 'Website + Buchungssystem', range: '2.000 – 4.500 €' },
    { label: 'Wix/Jimdo mit Business-Tarif', range: '25 – 45 € / Monat' },
    { label: 'Agentur-Wartung & Hosting', range: '30 – 80 € / Monat' },
  ];

  readonly infraLines = [
    { label: 'IONOS Domain (.de)', detail: 'ca. 12 €/Jahr · Jahr 1 oft Aktionspreis', net: 1.0 },
    { label: 'Hetzner Cloud CX23', detail: '2 vCPU · 4 GB RAM · 40 GB SSD', net: 5.49 },
    { label: 'IPv4-Adresse', detail: 'empfohlen für Mail & Zuverlässigkeit', net: 0.5 },
  ];

  savings(pkg: OfferPackage): number {
    return pkg.referencePrice - pkg.price;
  }

  formatEuro(n: number): string {
    return n.toLocaleString('de-DE') + ' €';
  }

  isInstallment(pkg: OfferPackage): boolean {
    return (
      pkg.paymentMode === 'installment' &&
      pkg.installmentDownPayment != null &&
      !!pkg.installmentCount &&
      !!pkg.installmentAmount
    );
  }

  installmentPremium(pkg: OfferPackage): number | null {
    if (!this.isInstallment(pkg) || pkg.onceComparePrice == null) return null;
    return pkg.price - pkg.onceComparePrice;
  }

  hostingMonthly(pkg: OfferPackage): number {
    const hosting = Number.parseFloat(pkg.monthlyRef.replace(/[^\d,]/g, '').replace(',', '.'));
    return Number.isFinite(hosting) ? hosting : 0;
  }

  installmentFirstMonthTotal(pkg: OfferPackage): number | null {
    if (!this.isInstallment(pkg)) return null;
    return (pkg.installmentDownPayment ?? 0) + this.hostingMonthly(pkg);
  }

  installmentFollowUpTotal(pkg: OfferPackage): number | null {
    if (!this.isInstallment(pkg)) return null;
    return (pkg.installmentAmount ?? 0) + this.hostingMonthly(pkg);
  }

  mailto(pkg: OfferPackage): string {
    const priceLabel = this.isInstallment(pkg)
      ? `${this.formatEuro(pkg.installmentDownPayment!)} Anzahlung + ${pkg.installmentCount} × ${this.formatEuro(pkg.installmentAmount!)} (gesamt ${this.formatEuro(pkg.price)})`
      : `${this.formatEuro(pkg.price)} einmalig`;
    const subject = encodeURIComponent(`Angebot ${pkg.name} — Fusswerk`);
    const body = encodeURIComponent(
      `Guten Tag,\n\nich möchte das Angebot „${pkg.name}“ (${priceLabel}) besprechen.\n\nMit freundlichen Grüßen`,
    );
    return `mailto:${this.studio.email}?subject=${subject}&body=${body}`;
  }
}
