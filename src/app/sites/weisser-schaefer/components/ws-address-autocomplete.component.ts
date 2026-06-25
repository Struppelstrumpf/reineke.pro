import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core';

type WsPhotonProperties = {
  osm_type?: string;
  osm_id?: number;
  type?: string;
  name?: string;
  street?: string;
  housenumber?: string;
  postcode?: string;
  city?: string;
  district?: string;
  county?: string;
  state?: string;
  country?: string;
  countrycode?: string;
};

type WsPhotonFeature = {
  type: 'Feature';
  properties?: WsPhotonProperties;
};

type WsAddressSuggestion = {
  id: string;
  formatted: string;
  subtitle: string;
  searchText: string;
  exactHouseMatch: boolean;
};

type WsParsedAddressInput = {
  street: string;
  houseNumber: string;
  city: string;
};

@Component({
  selector: 'pv-ws-address-autocomplete',
  template: `
    <div class="ws-field ws-address">
      <label [for]="inputId">{{ label }}</label>
      <input
        [id]="inputId"
        type="text"
        autocomplete="street-address"
        [placeholder]="placeholder"
        [value]="inputValue()"
        (input)="onInput($any($event.target).value)"
        (change)="onCommittedValue($any($event.target).value)"
        (keydown.enter)="pickFirstSuggestion($event)"
        (focus)="focused.set(true)"
        (blur)="onBlur()"
      />

      @if (loading()) {
        <p class="ws-address__meta ws-address__meta--state">Suche passende Adresse...</p>
      }

      @if (focused() && suggestions().length > 0) {
        <ul class="ws-address__list" role="listbox" [attr.aria-label]="'Adressvorschläge für ' + label">
          @for (entry of suggestions(); track entry.id) {
            <li>
              <button
                type="button"
                class="ws-address__option"
                (mousedown)="pickSuggestion(entry, $event)"
              >
                <strong>{{ entry.formatted }}</strong>
                <span>{{ entry.subtitle }}</span>
              </button>
            </li>
          }
        </ul>
      }

      @if (showNoResultHint()) {
        <p class="ws-address__meta ws-address__meta--state">
          Keine exakte Adresse gefunden. Bitte Straße/Hausnummer und Ort eingeben, z. B. "Elisabethstraße 2, Gütersloh".
        </p>
      }

    </div>
  `,
  styles: `
    .ws-address {
      position: relative;
    }
    .ws-address label {
      display: block;
      margin-bottom: 0.34rem;
      font-size: 0.67rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--ws-muted);
    }
    .ws-address input {
      width: 100%;
      box-sizing: border-box;
      padding: 0.66rem 0.82rem;
      border-radius: 13px;
      border: 1px solid color-mix(in srgb, var(--ws-border) 72%, transparent);
      background:
        linear-gradient(
          145deg,
          color-mix(in srgb, var(--ws-surface-2) 74%, transparent),
          color-mix(in srgb, var(--ws-surface) 84%, transparent)
        );
      color: var(--ws-text);
      font: inherit;
      font-size: 0.91rem;
      min-height: 2.78rem;
      transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
    }
    .ws-address input:hover {
      border-color: color-mix(in srgb, var(--ws-border-strong) 62%, var(--ws-border));
    }
    .ws-address input:focus {
      outline: none;
      border-color: color-mix(in srgb, var(--ws-border-strong) 85%, white 15%);
      box-shadow:
        0 0 0 3px color-mix(in srgb, var(--ws-accent) 20%, transparent),
        0 10px 24px color-mix(in srgb, var(--ws-accent) 12%, transparent);
      background:
        linear-gradient(
          145deg,
          color-mix(in srgb, var(--ws-surface-2) 88%, transparent),
          color-mix(in srgb, var(--ws-surface) 95%, transparent)
        );
    }
    .ws-address__meta {
      margin: 0.35rem 0 0;
      font-size: 0.72rem;
      color: var(--ws-muted);
    }
    .ws-address__meta--state {
      color: color-mix(in srgb, var(--ws-accent) 75%, var(--ws-muted));
    }
    .ws-address__list {
      position: absolute;
      z-index: 20;
      left: 0;
      right: 0;
      top: calc(100% + 0.28rem);
      margin: 0;
      padding: 0.3rem;
      list-style: none;
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, var(--ws-border-strong) 62%, var(--ws-border));
      background: color-mix(in srgb, var(--ws-surface-2) 96%, black 4%);
      box-shadow: 0 16px 32px color-mix(in srgb, black 32%, transparent);
      max-height: min(16rem, 42vh);
      overflow: auto;
    }
    .ws-address__option {
      width: 100%;
      text-align: left;
      border: 0;
      background: transparent;
      color: var(--ws-text);
      padding: 0.46rem 0.5rem;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.08rem;
    }
    .ws-address__option:hover {
      background: color-mix(in srgb, var(--ws-accent) 12%, transparent);
    }
    .ws-address__option strong {
      font-size: 0.81rem;
      line-height: 1.3;
      font-weight: 700;
    }
    .ws-address__option span {
      font-size: 0.72rem;
      color: var(--ws-muted);
      line-height: 1.35;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WsAddressAutocompleteComponent implements OnChanges, OnDestroy {
  @Input() label = 'Anschrift';
  @Input() inputId = 'ws-address';
  @Input() placeholder = 'Straße Nr, PLZ Ort';
  @Input() value = '';
  @Input() assumeSelected = false;
  @Output() valueChange = new EventEmitter<string>();
  @Output() validSelectionChange = new EventEmitter<boolean>();

  readonly inputValue = signal('');
  readonly suggestions = signal<WsAddressSuggestion[]>([]);
  readonly loading = signal(false);
  readonly focused = signal(false);
  readonly selected = signal(false);
  readonly noResults = signal(false);

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private currentAbort: AbortController | null = null;
  private selectedAddressValue = '';

  ngOnChanges(changes: SimpleChanges): void {
    if ('value' in changes) {
      const next = this.value ?? '';
      this.inputValue.set(next);
      if (this.assumeSelected && next.trim()) {
        this.selected.set(true);
        this.selectedAddressValue = next.trim();
      }
    }
    if ('assumeSelected' in changes && this.assumeSelected && this.inputValue().trim()) {
      this.selected.set(true);
      this.selectedAddressValue = this.inputValue().trim();
    }
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.currentAbort?.abort();
  }

  showNoResultHint(): boolean {
    return this.noResults() && this.focused() && !this.loading();
  }

  onInput(raw: string): void {
    this.inputValue.set(raw);
    this.valueChange.emit(raw);
    const value = raw.trim();
    const stillSelected = value !== '' && value === this.selectedAddressValue;
    this.selected.set(stillSelected);
    this.validSelectionChange.emit(stillSelected);
    this.noResults.set(false);

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => void this.fetchSuggestions(raw), 280);
  }

  onCommittedValue(raw: string): void {
    this.onInput(raw);
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    void this.fetchSuggestions(raw, { autoSelectBest: true });
  }

  onBlur(): void {
    window.setTimeout(() => this.focused.set(false), 140);
  }

  pickFirstSuggestion(event: Event): void {
    const first = this.suggestions()[0];
    if (!first) {
      return;
    }
    event.preventDefault();
    this.applySuggestion(first);
  }

  pickSuggestion(entry: WsAddressSuggestion, event: MouseEvent): void {
    event.preventDefault();
    this.applySuggestion(entry);
  }

  private applySuggestion(entry: WsAddressSuggestion): void {
    this.selectedAddressValue = entry.formatted;
    this.inputValue.set(entry.formatted);
    this.valueChange.emit(entry.formatted);
    this.selected.set(true);
    this.validSelectionChange.emit(true);
    this.suggestions.set([]);
    this.noResults.set(false);
    this.focused.set(false);
  }

  private async fetchSuggestions(queryRaw: string, opts?: { autoSelectBest?: boolean }): Promise<void> {
    const query = queryRaw.trim();
    if (query.length < 3) {
      this.suggestions.set([]);
      this.noResults.set(false);
      this.loading.set(false);
      this.currentAbort?.abort();
      return;
    }

    this.currentAbort?.abort();
    const abort = new AbortController();
    this.currentAbort = abort;
    this.loading.set(true);

    try {
      const parsedInput = this.parseAddressInput(query);
      const variants = this.buildQueryVariants(query);
      const allBatches = await Promise.all(
        variants.map((variant) => this.searchPhoton(variant, abort.signal)),
      );
      const raw = allBatches.flat();
      const dedupe = new Set<string>();
      const mappedWithScore: Array<{ entry: WsAddressSuggestion; score: number }> = [];
      for (const row of raw) {
        const normalized = this.normalizeSuggestion(row, parsedInput);
        if (!normalized) {
          continue;
        }
        if (dedupe.has(normalized.formatted)) {
          continue;
        }
        dedupe.add(normalized.formatted);
        mappedWithScore.push({ entry: normalized, score: this.scoreSuggestion(normalized, query, parsedInput) });
      }
      mappedWithScore.sort((a, b) => b.score - a.score || a.entry.formatted.localeCompare(b.entry.formatted));
      const topMatches = mappedWithScore.slice(0, 8).map((value) => value.entry);
      this.suggestions.set(topMatches);
      if (opts?.autoSelectBest) {
        const auto = this.pickAutomaticMatch(query, topMatches);
        if (auto) {
          this.applySuggestion(auto);
          return;
        }
      }
      this.noResults.set(topMatches.length === 0 && query.length >= 4);
    } catch {
      this.suggestions.set([]);
      this.noResults.set(query.length >= 4);
    } finally {
      this.loading.set(false);
    }
  }

  private async searchPhoton(query: string, signal: AbortSignal): Promise<WsPhotonFeature[]> {
    const url = new URL('https://photon.komoot.io/api/');
    url.searchParams.set('lang', 'de');
    url.searchParams.set('limit', '8');
    url.searchParams.set('q', query);
    const res = await fetch(url.toString(), {
      method: 'GET',
      signal,
      headers: {
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error('address lookup failed');
    }
    const payload = (await res.json()) as { features?: WsPhotonFeature[] };
    return payload.features ?? [];
  }

  private buildQueryVariants(source: string): string[] {
    const compact = source.replace(/\s+/g, ' ').trim();
    const normalized = this.normalizeForSearch(compact);
    const set = new Set<string>();
    set.add(compact);
    if (normalized && normalized !== compact.toLowerCase()) {
      set.add(normalized);
    }
    const strasseVariant = normalized.replace(/\bstr\b/g, 'strasse');
    if (strasseVariant) {
      set.add(strasseVariant);
    }
    const noCommaVariant = compact.replace(/,/g, ' ');
    if (noCommaVariant !== compact) {
      set.add(noCommaVariant);
    }
    const compactStreetVariant = compact
      .replace(/ß/g, 'ss')
      .replace(/\bstraße\b/gi, 'strasse')
      .replace(/\bstr\.\b/gi, 'strasse');
    if (compactStreetVariant) {
      set.add(compactStreetVariant);
    }
    const withoutIn = compact.replace(/\s+\bin\b\s+/gi, ' ');
    if (withoutIn !== compact) {
      set.add(withoutIn);
    }
    const parsed = compact.match(/^(.+?)\s+(\d+[a-zA-Z]?)\s+(?:in\s+)?(.+)$/i);
    if (parsed) {
      const street = parsed[1].trim();
      const number = parsed[2].trim();
      const city = parsed[3].trim();
      set.add(`${street} ${number}, ${city}`);
      set.add(`${city}, ${street} ${number}`);
      set.add(`${street}, ${city}`);
    }
    return [...set].filter((value) => value.trim().length >= 3).slice(0, 7);
  }

  private normalizeForSearch(source: string): string {
    return source
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/\bstr\.\b/g, 'strasse')
      .replace(/\bstr\b/g, 'strasse')
      .replace(/([a-z])strasse\b/g, '$1 strasse')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private scoreSuggestion(entry: WsAddressSuggestion, queryRaw: string, parsedInput: WsParsedAddressInput | null): number {
    const query = this.normalizeForSearch(queryRaw);
    const candidate = entry.searchText;
    if (!query) {
      return 0;
    }
    let score = 0;
    if (candidate.includes(query)) {
      score += 120;
    }
    const queryTokens = query.split(' ').filter((token) => token.length > 1);
    const candidateTokens = candidate.split(' ').filter(Boolean);
    for (const token of queryTokens) {
      if (candidate.includes(token)) {
        score += token.length >= 4 ? 16 : 8;
        continue;
      }
      if (token.length >= 4 && candidateTokens.some((candidateToken) => this.isSingleEditAway(token, candidateToken))) {
        score += 7;
        continue;
      }
      score -= 3;
    }
    const houseNumber = query.match(/\b\d+[a-z]?\b/)?.[0];
    if (houseNumber && candidate.includes(houseNumber)) {
      score += 22;
    }
    if (entry.exactHouseMatch) {
      score += 38;
    } else {
      score -= 16;
    }
    if (parsedInput?.city) {
      const normalizedCity = this.normalizeForSearch(parsedInput.city);
      if (normalizedCity && candidate.includes(normalizedCity)) {
        score += 12;
      }
    }
    return score;
  }

  private isSingleEditAway(a: string, b: string): boolean {
    if (a === b) {
      return true;
    }
    if (Math.abs(a.length - b.length) > 1) {
      return false;
    }
    let i = 0;
    let j = 0;
    let edits = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) {
        i += 1;
        j += 1;
        continue;
      }
      edits += 1;
      if (edits > 1) {
        return false;
      }
      if (a.length > b.length) {
        i += 1;
      } else if (a.length < b.length) {
        j += 1;
      } else {
        i += 1;
        j += 1;
      }
    }
    if (i < a.length || j < b.length) {
      edits += 1;
    }
    return edits <= 1;
  }

  private pickAutomaticMatch(queryRaw: string, matches: WsAddressSuggestion[]): WsAddressSuggestion | null {
    if (!matches.length) {
      return null;
    }
    const query = this.normalizeForSearch(queryRaw);
    if (!query) {
      return null;
    }
    const hasPostcode = /\b\d{5}\b/.test(queryRaw);
    const hasHouseNumber = /\b\d+[a-zA-Z]?\b/.test(queryRaw);

    const exact = matches.find((entry) => this.normalizeForSearch(entry.formatted) === query);
    if (exact) {
      return exact;
    }

    if (hasPostcode) {
      const prefix = matches.find((entry) => this.normalizeForSearch(entry.formatted).startsWith(query));
      if (prefix) {
        return prefix;
      }
    }

    if (matches.length === 1 && hasHouseNumber) {
      return matches[0];
    }
    return null;
  }

  private parseAddressInput(source: string): WsParsedAddressInput | null {
    const compact = source.replace(/\s+/g, ' ').trim();
    const parsed = compact.match(/^(.+?)\s+(\d+[a-zA-Z]?)\s*(?:,|\s)\s*(.+)$/);
    if (!parsed) {
      return null;
    }
    return {
      street: parsed[1].trim(),
      houseNumber: parsed[2].trim(),
      city: parsed[3].trim(),
    };
  }

  private streetLooksLike(queryStreet: string, candidateStreet: string): boolean {
    const queryTokens = this.normalizeForSearch(queryStreet).split(' ').filter((token) => token.length > 2);
    const candidateTokens = this
      .normalizeForSearch(candidateStreet)
      .split(' ')
      .filter((token) => token.length > 2);
    if (!queryTokens.length || !candidateTokens.length) {
      return false;
    }
    let hits = 0;
    for (const token of queryTokens) {
      if (candidateTokens.includes(token) || candidateTokens.some((candidate) => this.editDistanceAtMost(token, candidate, 2))) {
        hits += 1;
      }
    }
    return hits / queryTokens.length >= 0.6;
  }

  private cityLooksLike(queryCity: string, candidateCity: string): boolean {
    const query = this.normalizeForSearch(queryCity);
    const candidate = this.normalizeForSearch(candidateCity);
    if (!query || !candidate) {
      return false;
    }
    if (query === candidate || candidate.includes(query) || query.includes(candidate)) {
      return true;
    }
    return this.editDistanceAtMost(query, candidate, 2);
  }

  private editDistanceAtMost(a: string, b: string, maxDistance: number): boolean {
    if (Math.abs(a.length - b.length) > maxDistance) {
      return false;
    }
    const rows = a.length + 1;
    const cols = b.length + 1;
    const matrix: number[][] = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
    for (let i = 0; i < rows; i += 1) {
      matrix[i][0] = i;
    }
    for (let j = 0; j < cols; j += 1) {
      matrix[0][j] = j;
    }
    for (let i = 1; i < rows; i += 1) {
      let rowMin = Number.POSITIVE_INFINITY;
      for (let j = 1; j < cols; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
        rowMin = Math.min(rowMin, matrix[i][j]);
      }
      if (rowMin > maxDistance) {
        return false;
      }
    }
    return matrix[a.length][b.length] <= maxDistance;
  }

  private normalizeSuggestion(raw: WsPhotonFeature, parsedInput: WsParsedAddressInput | null): WsAddressSuggestion | null {
    const properties = raw.properties;
    if (!properties) {
      return null;
    }
    const countryCode = properties.countrycode?.trim().toUpperCase() ?? '';
    if (countryCode && countryCode !== 'DE') {
      return null;
    }
    const road = properties.street?.trim() ?? '';
    const postcode = properties.postcode?.trim() ?? '';
    const city = properties.city?.trim() ?? properties.district?.trim() ?? '';
    let houseNumber = properties.housenumber?.trim() ?? '';
    let exactHouseMatch = true;
    if (!road || !postcode || !city || !/^\d{5}$/.test(postcode)) {
      return null;
    }
    if (!houseNumber) {
      if (!parsedInput?.houseNumber || !parsedInput.street || !parsedInput.city) {
        return null;
      }
      if (!this.streetLooksLike(parsedInput.street, road) || !this.cityLooksLike(parsedInput.city, city)) {
        return null;
      }
      houseNumber = parsedInput.houseNumber;
      exactHouseMatch = false;
    }
    const formatted = `${road} ${houseNumber}, ${postcode} ${city}`;
    const subtitleParts = [
      properties.name?.trim() || null,
      properties.county?.trim() || null,
      properties.state?.trim() || null,
      properties.country?.trim() || null,
    ].filter(Boolean);
    const subtitle =
      (exactHouseMatch ? '' : 'Hausnummer aus Eingabe · ') +
      (subtitleParts.join(' · ') || `${postcode} ${city}`);
    const idSuffix =
      properties.osm_id !== undefined
        ? `${properties.osm_type ?? 'x'}-${String(properties.osm_id)}`
        : `${road}-${houseNumber}-${postcode}-${city}`;
    return {
      id: idSuffix,
      formatted,
      subtitle,
      searchText: this.normalizeForSearch(`${formatted} ${subtitle}`),
      exactHouseMatch,
    };
  }
}

