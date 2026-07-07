export type StudioPackageId = 'basic' | 'standard' | 'premium' | 'enterprise' | 'individual';

export type StudioPackageFeature = {
  label: string;
  included: boolean;
};

export type StudioPackage = {
  id: StudioPackageId;
  name: string;
  subtitle: string;
  description: string;
  priceOnce: string;
  priceMonthly?: string;
  quoteOnly?: boolean;
  pages: number;
  revisions: number;
  deliveryDays: number;
  features: StudioPackageFeature[];
};

export const STUDIO_PACKAGES: ReadonlyArray<StudioPackage> = [
  {
    id: 'basic',
    name: 'Landingpage',
    subtitle: 'Professioneller Webauftritt — Termine per E-Mail',
    description:
      'Individuelle One-Page-Website: Design nach Ihrer Marke, mobil optimiert, Terminanfragen landen direkt in Ihrer E-Mail.',
    priceOnce: '300 €',
    priceMonthly: '19 € / Monat',
    pages: 1,
    revisions: 2,
    deliveryDays: 5,
    features: [
      { label: 'Individuelles Design (kein Baukasten)', included: true },
      { label: 'Farben, Stil & Inhalte anpassbar', included: true },
      { label: 'Termin-Formular → Ihre E-Mail', included: true },
      { label: 'Domain, Server & SSL-Einrichtung', included: true },
      { label: 'Studio-Kalender & Chat', included: false },
    ],
  },
  {
    id: 'standard',
    name: 'Website Plus',
    subtitle: 'Mehrseitiger Auftritt mit vollem Setup',
    description:
      'Mehrere Seiten, Kontaktformulare und technische Einrichtung — für Betriebe, die mehr als eine Landingpage brauchen.',
    priceOnce: '490 €',
    priceMonthly: '22 € / Monat',
    pages: 3,
    revisions: 3,
    deliveryDays: 7,
    features: [
      { label: 'Alles aus Landingpage', included: true },
      { label: 'Bis zu 3 Seiten inklusive', included: true },
      { label: 'Geschwindigkeits-Optimierung', included: true },
      { label: 'Technisches Basis-SEO', included: true },
      { label: 'Studio-Kalender & Chat', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Komplettsystem',
    subtitle: 'Website + Studio, Kalender, Chat & Inhalte',
    description:
      'Wie die Fusswerk-Demo: Online-Termine im Kalender, Inhalte selbst bearbeiten, Chat — alles auf Ihrem Server.',
    priceOnce: '750 €',
    priceMonthly: '29 € / Monat',
    pages: 5,
    revisions: 4,
    deliveryDays: 10,
    features: [
      { label: 'Alles aus Website Plus', included: true },
      { label: 'Studio mit Termin-Kalender', included: true },
      { label: 'Online-Buchung → Kalender', included: true },
      { label: 'Inhalte & Öffnungszeiten bearbeiten', included: true },
      { label: 'Chat-Widget mit Studio-Antworten', included: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Konzern Plattform Suite',
    subtitle: 'Enterprise-Ökosystem für große Unternehmen',
    description:
      'Vollintegrierte Plattformlösung für komplexe Prozesse, Standorte und internationale Teams.',
    priceOnce: '12.500 €',
    priceMonthly: 'ab 1.290 € / Monat',
    pages: 50,
    revisions: 8,
    deliveryDays: 45,
    features: [
      { label: 'SAP-Integration (ERP, Artikel, Kunden, Aufträge)', included: true },
      { label: 'Anbindung Versanddienstleister (DHL, DPD, UPS, GLS, Spedition)', included: true },
      { label: 'Warehouse-Management-Anbindung (WMS/Bestands-Sync in Echtzeit)', included: true },
      { label: 'Zebra-Scanner- und Etikettendruck-Integration (ZPL/Barcode-Workflows)', included: true },
      { label: 'Mitarbeiter-Gruppen, Rollen- und Rechteverwaltung (RBAC)', included: true },
      { label: 'Online-Zahlungen (Stripe, PayPal, Klarna, SEPA, Rechnung)', included: true },
      { label: 'EDI / API-Schnittstellen für B2B-Partner & Marktplätze', included: true },
      { label: 'Mehrmandanten- und Multi-Standort-Fähigkeit', included: true },
      { label: 'SSO (Azure AD / Okta / Google Workspace) & MFA', included: true },
      { label: 'Audit-Log, Freigabeprozesse, Vier-Augen-Prinzip', included: true },
      { label: 'Dashboards, KPI-Reporting und BI-Anbindung', included: true },
      { label: 'Staging/Live-Umgebung, Monitoring, SLA-Support', included: true },
    ],
  },
  {
    id: 'individual',
    name: 'Individuelle Anfrage',
    subtitle: 'Maßgeschneidert für dein Projekt',
    description:
      'Besondere Wünsche, mehr Seiten oder ein größeres Projekt? Wir erstellen ein individuelles Angebot.',
    priceOnce: 'auf Anfrage',
    quoteOnly: true,
    pages: 0,
    revisions: 0,
    deliveryDays: 0,
    features: [
      { label: 'Individuelles Konzept & Design', included: true },
      { label: 'Umfang nach Bedarf', included: true },
      { label: 'Persönliche Beratung', included: true },
      { label: 'Flexible Lieferzeit', included: true },
    ],
  },
];

export function packageLabel(id: StudioPackageId): string {
  return STUDIO_PACKAGES.find((p) => p.id === id)?.name ?? id;
}
