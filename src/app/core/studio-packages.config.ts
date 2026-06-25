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
    name: 'Kompakt Startseite',
    subtitle: 'Schlanker Einstieg für lokale Sichtbarkeit',
    description: 'Klare One-Pager-Website mit Kontaktmöglichkeit und sauberem Markenauftritt.',
    priceOnce: '100 €',
    pages: 1,
    revisions: 1,
    deliveryDays: 2,
    features: [
      { label: 'Funktionale Website', included: true },
      { label: 'Geschwindigkeits-Optimierung', included: false },
      { label: 'Hosting-Einrichtung', included: false },
      { label: 'Social-Media-Icons', included: true },
      { label: 'Kontaktformular', included: true },
    ],
  },
  {
    id: 'standard',
    name: 'Business Auftritt Plus',
    subtitle: 'Komplette Firmenwebsite inklusive Setup',
    description: 'Vollständige Website mit Inhalt, Formularen und technischer Grundeinrichtung.',
    priceOnce: '250 €',
    priceMonthly: '15 € / Monat',
    pages: 1,
    revisions: 2,
    deliveryDays: 3,
    features: [
      { label: 'Funktionale Website', included: true },
      { label: 'Geschwindigkeits-Optimierung', included: true },
      { label: 'Hosting-Einrichtung', included: true },
      { label: 'Social-Media-Icons', included: true },
      { label: 'Technisches Basis-SEO', included: true },
    ],
  },
  {
    id: 'premium',
    name: 'Markenauftritt Pro',
    subtitle: 'Professionelle Business-Website mit Performance-Fokus',
    description: 'Mehrseitiger Markenauftritt mit starkem Design, SEO-Basis und Conversion-Fokus.',
    priceOnce: '500 €',
    priceMonthly: '15 € / Monat',
    pages: 3,
    revisions: 3,
    deliveryDays: 4,
    features: [
      { label: 'Funktionale Website', included: true },
      { label: 'Geschwindigkeits-Optimierung', included: true },
      { label: 'Hosting-Einrichtung', included: true },
      { label: 'Social-Media-Icons', included: true },
      { label: 'Analytics & Conversion-Tracking', included: true },
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
