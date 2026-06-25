export type DemoThemeId =
  | 'ws-green'
  | 'ws-blue'
  | 'ws-blue-orange'
  | 'ws-light-dark'
  | 'ws-light-red'
  | 'ws-light-orange'
  | 'ws-light-gray';

export type DemoThemeOption = {
  id: DemoThemeId;
  label: string;
};

export const DEMO_THEME_OPTIONS: ReadonlyArray<DemoThemeOption> = [
  { id: 'ws-green', label: 'Grünlich (Standard)' },
  { id: 'ws-blue', label: 'Bläulich' },
  { id: 'ws-blue-orange', label: 'Blau-Orange' },
  { id: 'ws-light-dark', label: 'Weiß-Schwarz' },
  { id: 'ws-light-red', label: 'Weiß-Rot' },
  { id: 'ws-light-orange', label: 'Weiß-Orange' },
  { id: 'ws-light-gray', label: 'Weiß-Grau' },
];

export const DEMO_THEME_DEFAULT: DemoThemeId = 'ws-green';

export function normalizeDemoThemeId(raw: string | null | undefined): DemoThemeId {
  const value = String(raw ?? '').trim() as DemoThemeId;
  return DEMO_THEME_OPTIONS.some((entry) => entry.id === value) ? value : DEMO_THEME_DEFAULT;
}
